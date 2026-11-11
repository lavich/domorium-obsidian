## MODIFIED Requirements

### Requirement: Notes, folded where they are long

Every note of a record that has a tree on its card — a person, a family, a source, a shared note, a repository, a submitter, a 5.5.1 submission record, a record of the file's own or the header — SHALL be shown in the tree of its record's lines, at the place the record writes it: the text
of an inline `NOTE`, and the text of the shared note a `NOTE` points at, whichever dialect
declares it. A note of more than five lines or three hundred characters SHALL show its first five
lines, or its first three hundred characters, and a control that shows the rest and one that folds
it again. A note's own sources and substructures SHALL be shown with it, as rows beneath it. A pointer to a shared note
the file does not declare SHALL be shown as a pointer to a record that is not in the file.

#### Scenario: A short note
- **WHEN** a person's record states `1 NOTE Left Poland in 1891.`
- **THEN** the tree shows that text in full, with no control to show more

#### Scenario: A long note
- **WHEN** a person's record states a note of twelve lines
- **THEN** the tree shows its first five lines and a control that shows the other seven, and pressing it shows them and offers to fold them again

#### Scenario: A shared note in 7.0
- **WHEN** a 7.0 person's record states `1 SNOTE @N1@` and the file declares `0 @N1@ SNOTE The only person to have won...`
- **THEN** the tree shows that text

#### Scenario: A shared note in 5.5.1
- **WHEN** a 5.5.1 person's record states `1 NOTE @N1@` and the file declares `0 @N1@ NOTE The only person to have won...`
- **THEN** the tree shows that text

#### Scenario: A note on a repository
- **WHEN** a repository's record states `1 NOTE Closed on Mondays.`
- **THEN** the repository's tree shows that text where the record writes it
