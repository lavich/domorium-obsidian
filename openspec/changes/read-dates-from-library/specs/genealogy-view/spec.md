## ADDED Requirements

### Requirement: A year before the common era is shown as one

Wherever a page shows a year read from a date — a person's heading, a row of a
list, an entry of the timeline, a box of the tree, the span of years a run of
siblings covers — a year before the common era SHALL be shown as the year the
file writes, marked in the reader's language as before the common era. It SHALL
NOT be shown as a negative number, nor bare as though it were of the common era.
A year of the common era SHALL be shown bare, as before.

#### Scenario: A heading in English
- **WHEN** the reader's language is English and a person's birth reads
  `1401 BCE` in a 7.0 document
- **THEN** the heading shows the year of birth as `1401 BCE`

#### Scenario: A heading in Russian
- **WHEN** the reader's language is Russian and a person's birth reads
  `ABT 1401 BCE` in a 7.0 document
- **THEN** the heading shows the year of birth as approximate and before the
  common era, `≈1401 до н. э.`

#### Scenario: A timeline across the start of the era
- **WHEN** a person's own events are dated `10 BCE`, `5 BCE` and `20` in a 7.0
  document
- **THEN** the timeline lists them in that order, showing `10 BCE`, `5 BCE` and
  `20`
