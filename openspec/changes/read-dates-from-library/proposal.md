## Why

The plugin reads a year out of a `DATE` payload with regular expressions in
`src/genealogy/dates.ts`, against a grammar the language service already
applies and, until now, did not share. The regexes guess: they demand four
digits, so `ABT 950` yields no year; they cannot tell `32 FEB 2020` from a
date; and every year that is not a plain Gregorian one of the common era is
refused outright, so `1401 BCE` and `12 FEB 1750/51` drop out of the timeline
even though their years are certain.

`@domorium/language-service` 2.2.0 closes lavich/domorium#378 with
`readDate(payload)`, which answers with the parse the diagnostics apply —
modifier, one date or both ends of a range, each with its calendar, year,
epoch and dual year — or `null` where the diagnostics reject the payload. The
plugin can now ask for the year instead of guessing it.

## What Changes

- Raise `@domorium/language-service` to `^2.2.0`. `@domorium/codemirror` stays
  at `^2.1.0`, the newest published, which already accepts language-service
  2.2.0.
- Read every `DATE` the genealogy model reports through the document's own
  `readDate`. The regular expressions in `src/genealogy/dates.ts` go; what
  remains there turns the library's value into the year the views order by.
- **BREAKING** (internal API): `buildIndex` takes the service that parsed the
  document rather than its symbols, because a date is read in that document's
  dialect and with its `SCHMA` aliases. `IndexCache.at` changes with it.
- A year is read from every date the library reads in the Gregorian or Julian
  calendar, of any number of digits. A dual year `1750/51` reads as 1751. A
  year before the common era is read too, ordered before every year of the
  common era, and shown marked as such — "1401 BCE", «1401 до н. э.».
- A date the library rejects as a date value, one in the Hebrew or French
  republican calendar, one in a calendar an extension defines, and a phrase
  with no date yield no year. The payload is reported as written, as before.
- In a document whose GEDCOM version is undetermined or unsupported the
  library reads no date at all, so no year is shown there. That is accepted
  rather than worked around; the gap is filed upstream.

This change belongs in **this repository**: it adapts what the language
service already reports. The one gap it exposes — `readDate` answering `null`
for every payload of a document whose version is undetermined — is the
library's, and goes to lavich/domorium as an issue rather than a workaround
here.

## Non-goals

- Converting a year between calendars. A Hebrew or French republican year is
  not placed on the Gregorian timeline at all; a Julian year is used as
  written, because the two calendars differ by days, not by years.
- Comparing two dates by day or month. The model still reads a year for
  display and ordering, with how exactly the date stated it.
- Guessing a dialect for a document that does not declare one.
- Changing how a date is shown as text: every view that shows the payload
  shows it as written.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-read-model`: the requirement on reading a year from a date now
  defers to the language service's reading, reads years before the common era,
  in the Julian calendar and from a dual year, and yields none for a date the
  service does not read.
- `genealogy-view`: a year before the common era is shown marked as one,
  wherever a year is shown.
- `genealogy-index`: search matches the digits of a year before the common era
  as the file writes them, and not the mark of the era.

## Impact

- `package.json`, `package-lock.json` — `@domorium/language-service` `^2.2.0`.
- `src/genealogy/dates.ts`, `src/genealogy/dates.test.ts` — replaced by a
  small reading over `GedcomDateValue`.
- `src/genealogy/index.ts`, `src/genealogy/cache.ts`, `src/GedcomView.ts` —
  the index is built from the service, not from bare symbols.
- `src/desk/labels.ts`, `src/desk/timelineView.ts`, `src/desk/treeLayout.ts`
  — a year is formatted in one place, so a year before the common era is shown
  as one everywhere.
- `src/i18n/en.json`, `src/i18n/ru.json` — the label for a year before the
  common era.
- Every test that calls `buildIndex`, `src/testing/curie.ts`, and
  `harness/desk.ts`.
