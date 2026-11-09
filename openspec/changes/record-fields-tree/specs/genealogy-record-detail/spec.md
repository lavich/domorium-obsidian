## MODIFIED Requirements

### Requirement: Nothing the record writes is left out

Every line of a person's record, of a family's record and of a source's record SHALL be shown on the card of that record, in the tree of its lines — the heading of the card showing the first `NAME` — and every line of an event under a person or a family on the card of that event, in the section made for what it says — the details of an event — or, where no such section knows it, in the section *Other data*. A structure shown in the tree SHALL show every
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

### Requirement: The headings say how many, and an empty section is left out

A section of a card that lists things of one kind SHALL show how many in its heading, in the same way on every
card; the family, the lines of a record and the evidence, which are made of several kinds, show no count. A section the
record holds nothing for SHALL be left out, with two exceptions that state what is missing and are
what a researcher looks for: the parents of a person, in the family, and the evidence of a record,
each of which says there is nothing recorded. No section SHALL show both a count of zero and a line
that says it is empty.

#### Scenario: A person with nothing recorded in a section
- **WHEN** a person's record states no media
- **THEN** the card has no Media section and no line about media

#### Scenario: A record that cites nothing
- **WHEN** a record cites no source
- **THEN** the Evidence section says the record cites no source, once, with no count beside it

### Requirement: Notes, folded where they are long

Every note of a person, a family or a source SHALL be shown in the tree of its record's lines, at the place the record writes it, and every note of an event in the notes section of its card, in the order the event writes them: the text
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

### Requirement: A value is a field that cannot be changed yet

The value of a row of a card — a part of a name, a type, a sex, an age, a cause, an address, an identifier, the text of a note, the
text of a line no section knows — SHALL be drawn as a **field**: a text area that holds the value, grows with it so that all of it is
shown, can be selected and copied, shows a frame only while the pointer or the focus is on it, is not in the tab order, says in its
accessible name what it is the value of, and cannot be changed. A value the standard limits to a list of values — a sex, the type of a
name, a role, a status, a restriction — SHALL be a field of the kind *choice*, which shows the value's name as text and is the one that will
become a dropdown when a card can be edited. A link — a relative, a source, a person a line names, a fact that selects its event card — stays a link and is not
a field. Pressing, focusing or selecting a field SHALL NOT write to the file.

#### Scenario: A value as a field
- **WHEN** an event states `2 CAUS Natural causes`
- **THEN** the row named Cause holds a field with `Natural causes` that cannot be changed, can be selected, and has no frame until the pointer is on it

#### Scenario: A sex as a choice
- **WHEN** a person's record states `1 SEX F`
- **THEN** the field of its row reads `Female` and is of the kind choice

#### Scenario: A long value
- **WHEN** a value is longer than the width of the card
- **THEN** the field shows all of it on as many lines as it needs, with nothing cut

#### Scenario: A name as a form
- **WHEN** a person's record states `1 NAME Maria /Curie/` with `2 TYPE BIRTH` and `2 GIVN Maria`
- **THEN** the tree shows a node named Name whose summary reads `Maria Curie`, and once it is opened rows named Type and Given names with fields `Birth` and `Maria`, the first a choice

#### Scenario: Tab skips the fields
- **WHEN** the reader moves through a card with the Tab key
- **THEN** the focus goes through its buttons and links and does not stop on a field

### Requirement: Related people and other records of the person

On the card of an event, the related people section SHALL list each person the event names with `ASSO`, with the role the
event states — `ROLE` in 7.0, `RELA` in 5.5.1, in the reader's language where the standard names it,
as the file words it otherwise — and its phrase, notes and sources. Each SHALL
select the person it names. On the card of a person or a family, an `ASSO` or an `ALIA` line is a row of the tree of the record, with the person it names as a link.

#### Scenario: A godparent
- **WHEN** an event states `2 ASSO @I2@` with `3 ROLE GODP`
- **THEN** the Related people section of the event card lists that person with the role *Godparent*

#### Scenario: A relationship in 5.5.1
- **WHEN** a 5.5.1 event states `2 ASSO @I2@` with `3 RELA godp`
- **THEN** the entry shows the relationship as *Godparent*

#### Scenario: A role of the file's own
- **WHEN** an association states `3 ROLE OTHER` with `4 PHRASE Landlord`
- **THEN** the entry shows `Landlord`

### Requirement: Other data

On the card of an event, the other data section SHALL show every line of the event that no other section shows, with its
substructures nested beneath it in the order the file writes them, each tag named in the reader's
language where the standard names it and as written otherwise, each value read as the requirement on
reading a line says. The section SHALL be folded as the timeline is and show how many lines it holds,
counting nested ones. It SHALL be left out where the record has none.

#### Scenario: A structure with children
- **WHEN** an event states `2 _TRIBE Highlander` with `3 _CLAN Sas` and `4 _SINCE 1800`
- **THEN** Other data on the event card, opened, shows the three lines nested as the file nests them, and its count reads 3

## REMOVED Requirements

### Requirement: The names of a person
**Reason**: Names are lines of the record and are shown in the tree of its lines, in the order the file writes them, with the type and the parts beneath the line that states them.
**Migration**: The tree of a record shows every `NAME` and what it states.

### Requirement: Identifiers and record information
**Reason**: Reference numbers, unique identifiers, the restriction and the dates of creation and change are lines of the record and are shown in the tree.
**Migration**: The tree shows these lines, named in the reader's language.

### Requirement: Events are told from details
**Reason**: A person's events and details are lines of the record and are shown in the tree in the order the file writes them, not in two sections. The events of a family a person is a spouse of stay in the person's family section, under that family's spouse, as the person card says.
**Migration**: The tree shows each event and each attribute as a line of the record; the event card of an event is opened from its name.
