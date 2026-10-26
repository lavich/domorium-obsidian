## Context

`src/genealogy/dates.ts` exports `readDate(payload): DateReading` and the types
`DateReading { text; year?; precision? }` and `DatePrecision`. `buildIndex(symbols)`
calls it for every person's birth and death, every event, and every family's
marriage. Its result is read as a number on one timeline, not only shown:

- `src/desk/timeline.ts` orders entries by `year`, and keeps a relative's event
  only between the person's start and end years;
- `src/desk/labels.ts` shows `1867` or `≈1867`, and decides "born" against
  `new Date().getFullYear()`;
- `src/desk/treeLayout.ts` shows a run of siblings as `min–max` of their years;
- `src/desk/timelineView.ts` shows `String(entry.year)`;
- `searchTextOf` in `src/genealogy/index.ts` puts the years into the text the
  index list filters on.

`GedcomLanguageService.readDate(payload)` in 2.2.0 reads in the dialect of the
document the service holds, and answers `null` where the diagnostics reject the
payload, and for every payload when the document's version resolves as
`undetermined` or `unsupported`. It is a method of the service, so the index
needs the service, not the symbols it produced. Every caller already has one:
`GedcomView.genealogy()` gets the service back from
`EditorLanguageService.update(doc)`, and each test builds a
`GedcomLanguageService` and asks it for symbols.

## Goals / Non-Goals

**Goals:**
- One reading of a date, the library's, behind every year the plugin shows or
  orders by.
- A year that is a correct number on the timeline in every case the model reads
  one, including before the common era.
- One place that turns such a year into text.

**Non-Goals:**
- Calendar conversion; ordering by day or month; a dialect guessed for a
  document that declares none.

## Decisions

### `buildIndex` takes the service

`buildIndex(source: IndexSource)` where
`type IndexSource = Pick<GedcomLanguageService, "getDocumentSymbols" | "readDate">`.
`IndexCache.at(document, revision, read: () => IndexSource)`; the view passes
`() => this.language.update(this.editor.state.doc)`.

The index calls `getDocumentSymbols()` once and, in the same pass, `readDate`
once per distinct `DATE` payload directly under any line of a person's or a
family's record, into a map keyed by the payload. A person's events and a family's row are resolved
later, when a page opens, and read their dates from that map. The index does
not keep the service: `GedcomView` holds one service and updates it in place,
so a kept service would read an older index's dates against newer text. The
cache still holds the compact index it holds today, plus one reading per
distinct date.

Alternative: pass `readDate` as a second argument beside the symbols. Rejected:
two values that must come from one document invite passing symbols of one and
the reader of another. A `Pick` keeps the tests' fake surface as small as
the second argument would.

### `year` is a signed number on one timeline

`DateReading` keeps its shape and its meaning for ordering: `year` is a number
every consumer can compare and subtract. A year before the common era is stored
astronomically, `1 − written`, so 1 BCE is 0 and 1401 BCE is −1400: there is no
gap at the start of the era, and every existing comparison in `timeline.ts` and
`labels.ts` orders it correctly without change.

The reading is, from `GedcomDateValue`:

| Value | `year` | `precision` |
| --- | --- | --- |
| `null`, or `dates` empty | none | none |
| first date's calendar not `GREGORIAN` or `JULIAN` | none | none |
| first date's `epoch` present and not `BCE` | none | none |
| first date's `year` 0, with or without an epoch | none | none |
| `dualYear` present | `dualYear` | by modifier |
| `epoch` `BCE` | `1 − year` | by modifier |
| otherwise | `year` | by modifier |

Precision by modifier: `ABT`, `CAL`, `EST` → `approximate`; `BET`, `BEF`, `AFT`,
`FROM`, `TO` → `range`; `INT` or none → `exact`. A range takes its first date,
as today, so `BET HEBREW 5500 AND 1750` yields no year even though its second
end is Gregorian; reading the other end would make the year depend on which end
the plugin can place, and the reader still sees the payload. An epoch other than
`BCE` — an extension's, such as `_AUC` — yields no year, as a calendar the
plugin cannot place does. The library accepts a year 0, which neither era
numbers; storing it would show `0` as 1 BCE, and `0 BCE` as AD 1, so it yields
no year.

`DatePrecision` and `DateReading` stay exported from `src/genealogy/index.ts`,
so `src/desk/` keeps importing them from there. The reading itself becomes
`readingOf(payload: string, value: GedcomDateValue | null): DateReading`, which
is what its tests exercise without building a document. `text` is always
`payload`, never `value.text`: the value is `null` exactly where no year is
read, and the library trims the payload it reports, while the spec asks for the
payload as the file wrote it.

Alternative: keep the written year in `year` and add `era?: "BCE"`. Rejected:
every comparison would have to learn about the flag, and the one it forgets
sorts 1401 BCE beside AD 1401 — the defect #378 was filed for.

### A year becomes text in one function

`yearText(year: number): string` in `src/desk/labels.ts` shows a positive year
bare and a year ≤ 0 as `t("desk.yearBce", { year: 1 - year })` — `"{year} BCE"`
in English, `"{year} до н. э."` in Russian. `year(date)` builds on it and adds
`≈` for an inexact one, as now; `timelineView.ts` and the sibling span in
`treeLayout.ts` call it instead of `String(...)`. The span
joins two `yearText`s with an en dash, which reads correctly across the era too.

The search text is built in `src/genealogy/index.ts`, which does not import
`src/desk/`: by `searchTextOf` for a person and inline in the family row for a
marriage. Both take the written year digits — `1 − year` for one before the
era — from one helper there, without the localized mark: a reader filtering by
`1401` finds the person or family either way, and the index does not depend on
the reader's language. The `genealogy-index` delta records that the mark of the
era is not searched.

### The gap upstream

A document with no `GEDC.VERS`, an unknown version, or a PAF header loses every
year. That is the library's verdict that it does not know the rules to read the
document by, and the plugin does not overrule it.
[lavich/domorium#453](https://github.com/lavich/domorium/issues/453) asks
whether `readDate` should read in an `undetermined`
document by the schema its resolution already carries. The same issue notes two
smaller things the probes turned up: a year 0 is accepted as a date value, and
5.5.1 `1750/51 B.C.` reads without its `dualYear`.

## Risks / Trade-offs

- [Files without a declared version lose their years] → accepted; the editor
  already reports the version as undetermined, the payload is still shown as
  written, and the fix belongs upstream.
- [A date the diagnostics reject, which today shows a year, now shows none] →
  intended: the year agrees with the diagnostic beside it.
- [Julian years used as Gregorian] → the calendars differ by under a fortnight
  within the years genealogy covers, so the year is off by one at most around
  New Year; dual-year dates, the usual source of that confusion, read as the
  later year.
- [`buildIndex` changes signature across about twenty call sites] →
  mechanical; most build a `GedcomLanguageService` and drop the
  `.getDocumentSymbols()` call. `src/testing/curie.ts` and `harness/desk.ts`
  are among them; the harness is typechecked, so missing it fails the build.
- [`readDate` per payload costs a parse] → one short string per `DATE` line,
  once per revision, inside a pass that already walks every record.
