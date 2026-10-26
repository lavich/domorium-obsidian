# readDate: no reading in an undetermined document; year 0; 5.5.1 dual year before the era

## Summary

`GedcomLanguageService.readDate(payload)` (2.2.0, #378) answers `null` for
every payload when the document's version resolves as `undetermined` or
`unsupported`. An `undetermined` resolution (no `GEDC.VERS`, a PAF header)
already carries the scheme the document is otherwise checked by; an
`unsupported` one (`VERS 8.0`, `4.0`, `5.3`) carries none. Should `readDate`
read an `undetermined` document by its scheme instead?

domorium-obsidian now reads every year it shows through `readDate`, so a file
with no `GEDC.VERS`, an unknown version, or a PAF header shows no year at all.
The plugin will not guess a dialect on its own; the question is whether the
library should.

## Reproduction

```ts
import { GedcomLanguageService } from "@domorium/language-service";

const service = new GedcomLanguageService(
  "0 HEAD\n0 @I1@ INDI\n1 BIRT\n2 DATE 7 NOV 1867\n0 TRLR\n",
);

service.getVersionResolution()?.kind; // "undetermined", with a scheme
service.readDate("7 NOV 1867");       // null
```

The same payload in a document declaring `2 VERS 7.0` or `2 VERS 5.5.1` reads
as `{ dates: [{ calendar: "GREGORIAN", year: 1867, month: "NOV", day: 7 }] }`.

## Two smaller things the same probes turned up

1. **A year 0 is accepted.** In 7.0, `0` and `0 BCE` read as
   `{ calendar: "GREGORIAN", year: 0 }` (with `epoch: "BCE"` for the second);
   in 5.5.1, `0` reads the same. Neither era numbers a year 0. Is that
   intended by the grammar, and should the diagnostics flag it?
2. **5.5.1 `1750/51 B.C.` loses its dual year.** It reads as
   `{ calendar: "GREGORIAN", year: 1750, epoch: "BCE" }` with no `dualYear`,
   while `12 FEB 1750/51` reads with `dualYear: 1751`. Either the dual year
   should be kept, or the payload should be rejected if 5.5.1 does not allow a
   dual year before the era. If it is kept, which year does `dualYear` name
   before the era? Counting back, 1751 BCE is the earlier of the two, and a
   consumer reading "the later year" needs to know which one it gets.

## Expected

- A documented answer on whether `readDate` reads in an `undetermined`
  document by the scheme its resolution carries.
- Year 0 either rejected or documented as accepted.
- `1750/51 B.C.` either read with its `dualYear`, documented as naming the
  earlier or the later year, or rejected.
