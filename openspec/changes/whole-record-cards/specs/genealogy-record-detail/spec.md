## Purpose
How a record card shows the whole of what the GEDCOM file says about a person, a family or an event: every line is shown somewhere, read as the file writes it, named in the reader's language, and long things are folded.

## ADDED Requirements

### Requirement: Nothing the record writes is left out

Every line of a person's record, of a family's record and of an event under either SHALL be shown
on the card of that record or of that event: in a section made for what it says — names, notes,
related people, identifiers and record information, the details of an event — or, where no such
section knows it, in the section *Other data*. A structure shown in a section SHALL show every
substructure of its own too, those the section knows by a row of its own and the rest as *Other
data* beneath it, to any depth. No line SHALL be dropped for being unknown, custom, from the other
dialect, or deeply nested. The only lines not shown as lines of their own are those the card shows
in another form: a `CONC` or `CONT` is joined to the line it continues, and a pointer is shown as
the name of the record it points at.

#### Scenario: A custom line
- **WHEN** a person's record states `1 _MILITARY Cavalry` with `2 _RANK Captain` beneath it
- **THEN** the card's Other data section, once opened, shows `_MILITARY` with `Cavalry` and, nested under it, `_RANK` with `Captain`

#### Scenario: A line deep inside a known structure
- **WHEN** a name states `2 NICK Manya` and `2 _SPELLING Polish` beneath `1 NAME`
- **THEN** the Names section shows the nickname in a row of its own and `_SPELLING` with `Polish` beneath that name

#### Scenario: A line of the other dialect
- **WHEN** a 5.5.1 file's person states `1 RIN 4711` and a 7.0 file's person states `1 EXID 4711` with `2 TYPE https://example.org/`
- **THEN** each card shows its line, the first named *Record number*, the second *External identifier* with its type

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

#### Scenario: A pointer to an undeclared record
- **WHEN** a person's record states `1 ASSO @I9@` and the file declares no such record
- **THEN** the card shows a pointer to a record that is not in the file, with an action that shows the line in the source

#### Scenario: Escaped at sign
- **WHEN** a note states `1 NOTE write to me@@example.org`
- **THEN** the card shows `write to me@example.org`

### Requirement: The names of a person

The names section SHALL list every `NAME` of the record in the order the record writes them. Each
SHALL be shown as the line writes it, without the slashes that mark a surname, followed by its type
where it states one — *Birth*, *Married*, *Also known as*, *Immigrant*, *Professional*, *Religious*,
*Maiden*, *Other*, or a type the file words itself as it words it — and by the parts it states, each in a
row named in the reader's language: given names, surname, prefix, suffix, nickname, surname prefix.
A name's notes and the number of sources it cites SHALL be shown with it, and a translation of a name
as a name of its own beneath it with its language. The heading of the card SHALL show the first name.

#### Scenario: The parts of a name
- **WHEN** a name states `2 GIVN Maria`, `2 SURN Skłodowska`, `2 NPFX Dr` and `2 NSFX Jr`
- **THEN** its entry shows rows named Given names, Surname, Prefix and Suffix with those values

#### Scenario: A name with a type of the file's own
- **WHEN** a name states `2 TYPE Stage name`
- **THEN** its entry shows the type as `Stage name`

#### Scenario: A translated name
- **WHEN** a name has `2 TRAN Мария Склодовская` with `3 LANG ru`
- **THEN** the entry shows that name beneath it with its language

### Requirement: Notes, folded where they are long

The notes section SHALL show, in the order the record writes them, every note of the record: the text
of an inline `NOTE`, and the text of the shared note a `NOTE` points at, whichever dialect
declares it. A note of more than five lines or three hundred characters SHALL show its first five
lines, or its first three hundred characters, and a control that shows the rest and one that folds
it again. A note's own sources and substructures SHALL be shown with it. A pointer to a shared note
the file does not declare SHALL be shown as a pointer to a record that is not in the file.

#### Scenario: A short note
- **WHEN** a person's record states `1 NOTE Left Poland in 1891.`
- **THEN** the Notes section shows that text in full, with no control to show more

#### Scenario: A long note
- **WHEN** a person's record states a note of twelve lines
- **THEN** the card shows its first five lines and a control that shows the other seven, and pressing it shows them and offers to fold them again

#### Scenario: A shared note
- **WHEN** a person's record states `1 NOTE @N1@` and `0 @N1@ SNOTE The only person to have won...` follows
- **THEN** the Notes section shows that text

### Requirement: Related people and other records of the person

The related people section SHALL list each person the record names with `ASSO`, with the role the
record states — in the reader's language where the standard names it, as the file words it otherwise — and
its phrase, notes and sources, and each record it names with `ALIA` as *Same person as*. Each SHALL
select the person it names.

#### Scenario: A godparent
- **WHEN** a person's record states `1 ASSO @I2@` with `2 ROLE GODP`
- **THEN** the Related people section lists that person with the role *Godparent*

#### Scenario: A role of the file's own
- **WHEN** an association states `2 ROLE OTHER` with `3 PHRASE Landlord`
- **THEN** the entry shows `Landlord`

### Requirement: Identifiers and record information

The identifiers and record information section SHALL show, each in a row named in the reader's
language, every reference number (`REFN`) with its type, unique identifier (`UID`), external
identifier (`EXID`) with its type, ancestral file number (`AFN`), automated record id (`RIN`),
restriction (`RESN`), the creation date and time (`CREA`), the date and time of the last change
(`CHAN`) with what they state beneath them, the submitter (`SUBM`), and the interest in ancestors
and descendants (`ANCI`, `DESI`), in the order the record writes them. The section SHALL be folded
as the timeline is.

#### Scenario: Two reference numbers
- **WHEN** a person's record states `1 REFN 123` with `2 TYPE user` and `1 REFN 456`
- **THEN** the section shows two rows named Reference number, the first with its type `user`

#### Scenario: The last change
- **WHEN** a record states `1 CHAN` with `2 DATE 1 JAN 2020` and `3 TIME 10:00` beneath it
- **THEN** the section shows a row named Last changed with `1 JAN 2020` and `10:00`

### Requirement: Other data

The other data section SHALL show every line of the record that no other section shows, with its
substructures nested beneath it in the order the file writes them, each tag named in the reader's
language where the standard names it and as written otherwise, each value read as the requirement on
reading a line says. The section SHALL be folded as the timeline is and show how many lines it holds,
counting nested ones. It SHALL be left out where the record has none.

#### Scenario: A structure with children
- **WHEN** a record states `1 _TRIBE Highlander` with `2 _CLAN Sas` and `3 _SINCE 1800`
- **THEN** Other data, opened, shows the three lines nested as the file nests them, and its count reads 3

### Requirement: The headings say how many, and an empty section is left out

A section of a card that lists things SHALL show how many in its heading as `Name · n`. A section the
record holds nothing for SHALL be left out, with two exceptions that state what is missing and are
what a researcher looks for: the parents of a person, in the family, and the evidence of a record,
each of which says there is nothing recorded. No section SHALL show both a count of zero and a line
that says it is empty.

#### Scenario: A person with nothing recorded in a section
- **WHEN** a person's record states no note
- **THEN** the card has no Notes section and no line about notes

#### Scenario: A record that cites nothing
- **WHEN** a record cites no source
- **THEN** the Evidence section says the record cites no source, once, with no count beside it

### Requirement: Every label is in both languages

Every name the card gives a tag, a type, a role, a status or a sex SHALL be written in each language the plugin
ships. A tag, type or role the standard names and the plugin has no word for SHALL be shown as written.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian and a person's record states `1 NAME` with `2 TYPE MARRIED`
- **THEN** the entry's type reads in Russian, and no part of the card shows an English word the Russian locale has a translation for
