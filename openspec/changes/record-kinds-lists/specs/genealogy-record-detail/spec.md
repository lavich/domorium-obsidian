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

### Requirement: A value is a field

The value of a row of a card — a part of a name, a type, a sex, an age, a cause, an address, an identifier, the text of a note, the
text of a line no section knows — SHALL be drawn as a **field**: a text area that holds the value, grows with it so that all of it is
shown, can be selected and copied, shows a frame only while the pointer or the focus is on it, and says in its
accessible name what it is the value of. In the tree of a record a field SHALL be in the tab order and SHALL take what the reader types, as the requirements on editing a record say; anywhere else it SHALL NOT be in the tab order and SHALL NOT be changed. A value the standard limits to a list of values — a sex, the type of a
name, a role, a status, a restriction — SHALL be a field of the kind *choice*, which shows the value's name as text and, in the tree of a record, is a dropdown of the values the language service lists. A link — a relative, a source, a person a line names — stays a link and is not
a field; a place is a field, since it has no card to link to. Pressing, focusing or selecting a field SHALL NOT write to the file; only a value the reader has changed and committed is written.

#### Scenario: A value as a field
- **WHEN** an event states `2 CAUS Natural causes`
- **THEN** the row named Cause holds a field with `Natural causes` that can be selected, has no frame until the pointer or the focus is on it, and takes what the reader types

#### Scenario: A sex as a choice
- **WHEN** a person's record states `1 SEX F`
- **THEN** the field of its row reads `Female`, is of the kind choice, and is a dropdown of the sexes the dialect lists

#### Scenario: A long value
- **WHEN** a value is longer than the width of the card
- **THEN** the field shows all of it on as many lines as it needs, with nothing cut

#### Scenario: A name as a form
- **WHEN** a person's record states `1 NAME Maria /Curie/` with `2 TYPE BIRTH` and `2 GIVN Maria`
- **THEN** the tree shows a node named Name whose summary reads `Maria Curie`, and once it is opened rows named Type and Given names with fields `Birth` and `Maria`, the first a choice

#### Scenario: Tab skips the fields
- **WHEN** the reader moves through the tree of a card with the Tab key
- **THEN** the focus goes through its controls, links and fields in the order they are drawn
