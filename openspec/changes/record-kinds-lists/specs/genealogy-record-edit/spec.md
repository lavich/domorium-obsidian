## ADDED Requirements

### Requirement: The header of the file is read only on its card

The card of the file's header SHALL draw the header's tree with no field to type in, no
menu that adds a line, no list that points a pointer elsewhere and no control that removes a
line, whatever the language service would allow, because a change to the GEDCOM version, the
character set or the dialect the header states changes how the whole file is read. It SHALL
say nothing about it beyond what a read-only tree shows: the values read as text, the
pointers as links. The header SHALL still be changed in Source. Every other card that draws
a tree — a person, a family, a source, a shared note, a repository, a submitter, a 5.5.1
submission record, a record of the file's own — SHALL edit as the requirements of this
capability say, within what the language service describes. The value a record's own
opening line carries — the text of a shared note, 7.0 `SNOTE` or 5.5.1 `NOTE` with its
`CONC` and `CONT` lines, the value of a record of the file's own — SHALL be a field of the
root of its tree, written on the opening line as any value is, its continuation lines
written by the language service and the lines beneath it kept. A record that holds no value
by the standard on its opening line — a person, a family, a source, a repository, a
submitter, the header — SHALL show no value field on its root.

#### Scenario: The header's card
- **WHEN** the card shows the header of `curie.ged`
- **THEN** no row of it has a field, a menu or a removal control, and its pointer to the
  submitter is a link that selects the submitter

#### Scenario: A repository's card
- **WHEN** the card shows `State Archive in Warsaw` and the reader adds a phone number from
  the menu of its root
- **THEN** the file states the phone number beneath `0 @R2@ REPO`

#### Scenario: No value on a record that holds none
- **WHEN** the card shows the repository `@R2@` or Marie
- **THEN** the root of the tree has no value field

#### Scenario: A note record of 5.5.1 continued
- **WHEN** a 5.5.1 file declares `0 @N1@ NOTE` with `1 CONC` and `1 CONT` lines and a `1 SOUR @S1@`, and the reader replaces its text in the root's field
- **THEN** the file states the new text on `0 @N1@ NOTE` with the continuation lines the language service writes, and `1 SOUR @S1@` is still beneath it

#### Scenario: A shared note's card
- **WHEN** the card shows the note `@N2@` and the reader changes its text in the root's field
- **THEN** the file states the new text on `0 @N2@ SNOTE`, its second line as a `CONT`
