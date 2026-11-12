# genealogy-record-detail Specification

## Purpose
How a record card shows the whole of what the GEDCOM file says about a person, a family or an event: every line is shown somewhere, read as the file writes it, named in the reader's language, and long things are folded.

## Requirements

### Requirement: Nothing the record writes is left out

Every line of a person's record, of a family's record and of a source's record SHALL be shown on the card of that record, in the tree of its lines, the card having no heading. A structure shown in the tree SHALL show every
substructure of its own too, to any depth. No line SHALL be dropped for being unknown, custom, from the other
dialect, or deeply nested. The only lines not shown as lines of their own are those the card shows
in another form: a `CONC` or `CONT` is joined to the line it continues, and a pointer is shown as
the name of the record it points at.

#### Scenario: A custom line
- **WHEN** a person's record states `1 _MILITARY Cavalry` with `2 _RANK Captain` beneath it
- **THEN** the tree shows `_MILITARY` with `Cavalry` and, once the node is opened, nested under it, `_RANK` with `Captain`

#### Scenario: A line deep inside a known structure
- **WHEN** a name states `2 NICK Manya` and `2 _SPELLING Polish` beneath `1 NAME`
- **THEN** once the name is opened the tree shows the nickname and `_SPELLING` with `Polish` beneath it

#### Scenario: A line of the other dialect
- **WHEN** a 5.5.1 file's person states `1 RIN 4711` and a 7.0 file's person states `1 EXID 4711` with `2 TYPE https://example.org/`
- **THEN** each card shows its line, the first named *Record number*, the second *External identifier* with its type once it is opened

#### Scenario: Continued lines
- **WHEN** a note states `1 NOTE first` with `2 CONT second` and `2 CONC  more` beneath it
- **THEN** the card shows `first` on one line and `second more` on the next

### Requirement: A line is read as the file writes it

The card SHALL tell a pointer from a value by what the file writes: a payload of the form `@X@` is a
pointer, anything else is a value. A pointer to a record the file declares SHALL be shown as that
record's name and select it; a pointer to a record the file does not declare SHALL be shown as a pointer
to a record that is not in the file, with an action that shows it in the source. A value SHALL be
shown as written, in the order the lines write it, with `@@` shown as `@`. A tag the standard
names SHALL be named in the reader's language, and any other tag, a custom one beginning with an
underscore among them, SHALL be shown as written. No cross-reference identifier, level number or
bare tag SHALL be shown for a tag the standard names.

#### Scenario: A pointer to a declared record
- **WHEN** a person's record states `1 ASSO @I2@` and the file declares `@I2@`
- **THEN** the card shows that person's name as a link that selects them, and no `@I2@`

#### Scenario: A void pointer
- **WHEN** a 7.0 record states `1 ASSO @VOID@`
- **THEN** the card shows that the line names no record, with no pointer to a missing record and no action to show it in the source

#### Scenario: A pointer to an undeclared record
- **WHEN** a person's record states `1 ASSO @I9@` and the file declares no such record
- **THEN** the card shows a pointer to a record that is not in the file, with an action that shows the line in the source

#### Scenario: Escaped at sign
- **WHEN** a note states `1 NOTE write to me@@example.org`
- **THEN** the card shows `write to me@example.org`

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

### Requirement: The headings say how many, and an empty section is left out

A section of a card that lists things of one kind SHALL show how many in its heading, in the same way on every
card; the family and the lines of a record, which are made of several kinds, show no count. A section the
record holds nothing for SHALL be left out, with one exception that states what is missing and is
what a researcher looks for: the parents of a person, in the family, which says there is nothing recorded. No section SHALL show both a count of zero and a line
that says it is empty.

#### Scenario: A person with nothing recorded in a section
- **WHEN** a person's record states no media
- **THEN** the card has no Media section and no line about media

#### Scenario: A record that cites nothing
- **WHEN** a record cites no source
- **THEN** the card has no section about sources and no line that says the record cites none

### Requirement: Every label is in both languages

Every name the card gives a tag, a type, a role, a status or a sex SHALL be written in each language the plugin
ships. A tag, type or role the standard names and the plugin has no word for SHALL be shown as written.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian and a person's record states `1 NAME` with `2 TYPE MARRIED`
- **THEN** the entry's type reads in Russian, and every label key the cards use exists in the Russian catalogue as it does in the English one

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
