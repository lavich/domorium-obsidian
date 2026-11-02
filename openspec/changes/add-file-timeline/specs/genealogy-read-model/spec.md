## MODIFIED Requirements

### Requirement: A year read from a date says how exactly the date stated it

Where a list or a heading needs a year, the model SHALL read one from a `DATE`
payload as the language service reads that payload, in the dialect of the
document holding it, and SHALL report alongside it how exactly the payload
stated that year: exactly, as an approximation, or as one end of a range. A
payload the language service does not read as a date value SHALL yield no year,
so the model never reads a year the editor's diagnostics reject. A document
whose GEDCOM version cannot be determined or is not supported is read as the
language service reads it, which is by more than one dialect's grammar.

A year so read is a reading for display. It SHALL NOT be presented as the year
an event happened, because for a range or an approximation it is not one. A
caller that needs to know whether two people share a date — comparing records,
looking for duplicates — SHALL be able to tell an exact year from an inexact one
without parsing the payload again.

A year SHALL be read from a date in the Gregorian or the Julian calendar, of any
number of digits. A Julian year SHALL be read as written, not converted. A date
stating two years, as 5.5.1 writes `1750/51`, SHALL yield the later. A year
before the common era SHALL be read, reported as before the common era, and SHALL
order before every year of the common era and after every earlier year before
it.

A date in any other calendar — Hebrew, French republican, or one an extension
defines — a date in an era an extension defines, a year 0, which neither era
numbers, and a payload stating no date, as a phrase alone does, SHALL yield no
year rather than a guessed one. The payload SHALL always be reported as the file
wrote it, so a view can show the full date whether or not a year could be read
from it.

A date stating two dates — `BET … AND …`, `FROM … TO …` — SHALL also report the
year of the second, read by the same rules; where the second yields no year, as
one in another calendar does, none SHALL be reported for it, and the first is
read as before. The two years SHALL be reported in the order the file writes
them, even where the second is the earlier. The model SHALL tell a date that
states a stretch of time, `FROM` and `TO` with or without the other, from one
that states an uncertain moment, `BET`, `BEF` and `AFT`, so that a view can draw
the first as a period and the second as a guess.

#### Scenario: A plain date
- **WHEN** the payload reads `7 NOV 1867`
- **THEN** the year is 1867, reported as exact, and the payload is reported
  unchanged

#### Scenario: An approximate date
- **WHEN** the payload reads `ABT 1867`
- **THEN** the year is 1867, reported as approximate

#### Scenario: A range
- **WHEN** the payload reads `BET 1867 AND 1870`
- **THEN** the year is 1867, reported as one end of a range, and not as the year
  the event happened

#### Scenario: A year of fewer than four digits
- **WHEN** the payload reads `ABT 950`
- **THEN** the year is 950, reported as approximate

#### Scenario: A date the diagnostics reject
- **WHEN** the payload reads `32 FEB 2020`
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A date before the common era
- **WHEN** the payload reads `1401 BCE` in a 7.0 document, or `1401 B.C.` in a
  5.5.1 document
- **THEN** the year 1401 is reported as before the common era, and orders before
  the year 1 of the common era and after 1402 before it

#### Scenario: A Julian date
- **WHEN** the payload reads `JULIAN 3 MAR 1721` in a 7.0 document, or
  `@#DJULIAN@ 3 MAR 1721` in a 5.5.1 document
- **THEN** the year is 1721, reported as exact

#### Scenario: A dual year
- **WHEN** the payload reads `12 FEB 1750/51` in a 5.5.1 document
- **THEN** the year is 1751, reported as exact

#### Scenario: A date in another calendar
- **WHEN** the payload reads `@#DHEBREW@ 5628` in a 5.5.1 document
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A 7.0 date in another calendar
- **WHEN** the payload reads `ABT HEBREW 5761` in a 7.0 document
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: An era an extension defines
- **WHEN** the payload reads `1867 _AUC` in a 7.0 document
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A year zero
- **WHEN** the payload reads `0` or `0 BCE` in a 7.0 document, or `0` in a
  document whose version cannot be determined
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A phrase standing for a date
- **WHEN** the payload reads `(unknown)` in a 5.5.1 document
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A document whose version cannot be determined
- **WHEN** a document carries no `GEDC.VERS`, and a person's birth reads
  `7 NOV 1867`
- **THEN** the year 1867 is reported for the birth, as exact, and the payload is
  reported unchanged

#### Scenario: A document of a version no schema describes
- **WHEN** a document declares `2 VERS 4.0`, and a person's birth reads
  `7 NOV 1867`
- **THEN** the year 1867 is reported for the birth, as exact

#### Scenario: A period
- **WHEN** the payload reads `FROM 1891 TO 1894`
- **THEN** the year is 1891, the second year is 1894, and the date is reported
  as a period

#### Scenario: An uncertain moment between two years
- **WHEN** the payload reads `BET 1867 AND 1870`
- **THEN** the second year is 1870, and the date is reported as uncertain, not as
  a period

#### Scenario: A period with one end
- **WHEN** the payload reads `FROM 1891`
- **THEN** the year is 1891, no second year is reported, and the date is reported
  as a period

#### Scenario: A second date in another calendar
- **WHEN** the payload reads `BET 1867 AND HEBREW 5628` in a 7.0 document
- **THEN** the year is 1867 and no second year is reported

#### Scenario: A second date before the first
- **WHEN** the payload reads `FROM 1894 TO 1891`
- **THEN** the year is 1894 and the second year 1891
