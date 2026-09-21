## Purpose

How the plugin reads people, families and events out of a GEDCOM document: what
a person is, how one is addressed across documents, which relatives and events
are reported, how a name and a date are read, and what is reported when the file
says something the model cannot make sense of.

## ADDED Requirements

### Requirement: A person is addressed by document and identifier together

A person SHALL be addressed by the document they live in together with their
cross-reference identifier. An identifier alone SHALL NOT identify a person: two
GEDCOM files in one vault may each declare `@I123@`, and they are different
people.

An address SHALL survive being written down and read back, so that a person can
be reached from a saved workspace, a link, or a view restored after a restart.

#### Scenario: Two documents declaring the same identifier
- **WHEN** a vault holds two GEDCOM files that each declare `@I123@`, and the
  reader opens `@I123@` of the first
- **THEN** the person shown is the one from the first file, and nothing about
  the second file is read

#### Scenario: An address written down and read back
- **WHEN** a person's address is stored and later read back
- **THEN** it names the same person, in the same document, as when it was stored

### Requirement: The people in a document

The model SHALL report every `INDI` record in the document as a person, in the
order the file declares them, with the identifier the record carries. A record
with no identifier SHALL NOT be reported, having no way to be addressed or
referred to.

Each person SHALL carry what a reader needs to tell them apart without opening
them: the name as read below, the year of birth and the year of death where a
year can be read, and one place taken from birth, or from death where there is
no birth place.

#### Scenario: A document of people and families
- **WHEN** the model reads a document holding 17 `INDI` records and 5 `FAM`
  records
- **THEN** it reports 17 people, in the order the file declares them

#### Scenario: A record with no identifier
- **WHEN** the document holds a line `0 INDI` with no cross-reference
- **THEN** no person is reported for it, and the rest of the document is read

### Requirement: A name is read from the record, not invented

A person's name SHALL be read from their first `NAME` line. The GEDCOM
convention of marking the surname with slashes SHALL be resolved: the slashes
are removed and the parts joined in the order the line writes them, so
`Marie /Skłodowska-Curie/` reads as `Marie Skłodowska-Curie`.

A person with no `NAME` line, or a `NAME` line with no payload, SHALL still be
reported, named by a stated placeholder rather than by an empty string, so that
they can be seen and opened.

#### Scenario: A name with a surname in slashes
- **WHEN** a record's first name line reads `1 NAME Marie /Skłodowska-Curie/`
- **THEN** the person's name reads `Marie Skłodowska-Curie`

#### Scenario: A surname only
- **WHEN** a record's name line reads `1 NAME /Curie/`
- **THEN** the person's name reads `Curie`

#### Scenario: More than one name line
- **WHEN** a record carries both `1 NAME Marie /Skłodowska-Curie/` and
  `1 NAME Maria Salomea /Skłodowska/`
- **THEN** the first is the person's name, and the second is still reported as
  another name they are known by

#### Scenario: No name at all
- **WHEN** a record carries no name line
- **THEN** the person is reported, named by a placeholder, and can be opened

### Requirement: A year is read where the date says one plainly

Where a list or a heading needs a year, the model SHALL read one from a `DATE`
payload that states a four-digit year in the Gregorian calendar, including one
qualified by an approximation or a range, in which case the first year stated is
taken. A payload that states its year in another calendar, states two years for
one date, or states none SHALL yield no year rather than a guessed one.

The payload SHALL also be reported as the file wrote it, so that a view can show
the full date whether or not a year could be read from it.

#### Scenario: A plain date
- **WHEN** the payload reads `7 NOV 1867`
- **THEN** the year is 1867, and the payload is reported unchanged

#### Scenario: An approximate date and a range
- **WHEN** the payload reads `ABT 1867`, and in another record `BET 1867 AND 1870`
- **THEN** the year is 1867 in both

#### Scenario: A date in another calendar
- **WHEN** the payload reads `@#DHEBREW@ 5628`
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A dual year
- **WHEN** the payload reads `12 FEB 1867/68`
- **THEN** no year is reported, and the payload is reported unchanged

### Requirement: Relatives are resolved through families

Parents, partners and children SHALL be resolved through the family records the
person points at, never guessed from names or dates.

A person's parents are the spouses of each family their `FAMC` lines point at.
A person's partners are the other spouses of each family their `FAMS` lines
point at. A person's children are the children of those same families.

A spouse SHALL be any person a family names as one, whatever tag names them, and
the model SHALL NOT require that a family have exactly one of each, nor that a
spouse's sex agree with the tag. A family with two spouses of the same sex, one
spouse, or none SHALL be read as the file wrote it.

The same person SHALL NOT be reported twice in one relationship, however many
families connect them.

#### Scenario: Parents through a child-family
- **WHEN** a person's record carries `1 FAMC @F1@`, and `@F1@` names `@I3@` and
  `@I4@` as its spouses
- **THEN** the person's parents are `@I3@` and `@I4@`

#### Scenario: Partners and children through a spouse-family
- **WHEN** a person's record carries `1 FAMS @F3@`, and `@F3@` names that person
  and `@I2@` as spouses and `@I5@` and `@I6@` as children
- **THEN** the person's partner is `@I2@` and their children are `@I5@` and
  `@I6@`, and the person is not reported as their own partner

#### Scenario: A family with two spouses named by the same tag
- **WHEN** a family names two people as spouses using the same tag for both
- **THEN** both are reported as spouses of that family

#### Scenario: A person in more than one family
- **WHEN** a person is a child of two families that share a parent
- **THEN** that shared parent is reported once

### Requirement: Events are reported as the record carries them

The model SHALL report the events a person's record carries, in the order the
record writes them, for at least birth, death, burial, residence, occupation,
immigration and emigration.

Each event SHALL carry the tag it was written with, so a caller can name it in
the reader's language; the date payload and the place payload where the event
has them; and the event's own payload where it carries one, as an occupation
does. An event with none of these SHALL still be reported: that the record
states a death at all is worth showing.

#### Scenario: A birth with a date and a place
- **WHEN** a record carries `1 BIRT` with `2 DATE 7 NOV 1867` and
  `2 PLAC Warsaw, Congress Poland`
- **THEN** one event is reported, tagged `BIRT`, carrying that date and that
  place

#### Scenario: An event carrying its own payload
- **WHEN** a record carries `1 OCCU Physicist and chemist`
- **THEN** one event is reported, tagged `OCCU`, carrying that text

#### Scenario: A bare event
- **WHEN** a record carries `1 DEAT` with nothing under it
- **THEN** one event is reported, tagged `DEAT`, with no date and no place

### Requirement: A pointer that leads nowhere is reported, not followed

Where a `FAMC`, `FAMS`, `HUSB`, `WIFE` or `CHIL` pointer names a record the
document does not declare, the model SHALL report the reference as unresolved,
carrying the identifier it named, rather than omitting it or failing. A caller
SHALL be able to tell an unresolved reference from a resolved one.

A pointer that names a record of the wrong kind — a family where a person is
expected — SHALL be treated the same way.

#### Scenario: A family pointing at a person who is not there
- **WHEN** a family names `@I99@` as a child and the document declares no
  `@I99@`
- **THEN** that child is reported as an unresolved reference naming `@I99@`,
  and the family's other children are reported normally

#### Scenario: A person pointing at a family that is not there
- **WHEN** a person's record carries `1 FAMC @F99@` and no such family is
  declared
- **THEN** no parents are reported from it, and reading the person otherwise
  succeeds

### Requirement: The model knows nothing about its host

The read model SHALL depend only on the GEDCOM document and the language service
that parses it. It SHALL NOT reference the editor, the vault, the file system,
or any interface of the application that hosts it, so that the same reading
serves any client.

#### Scenario: The model built outside the application
- **WHEN** the model is constructed from a document's text alone, with no
  application present
- **THEN** it reports the same people, relatives and events it reports inside
  the application

### Requirement: Reading is paid for once per document version

The model SHALL be built once for a version of a document and reused until that
document changes, rather than re-read for each person shown. Reporting a
person's relatives or events SHALL NOT re-traverse the whole document.

When the document changes, the next reading SHALL reflect the change.

#### Scenario: Many people read from one document
- **WHEN** a reader opens twenty people in turn from one unchanged document
- **THEN** the document is read once

#### Scenario: The document changes under the model
- **WHEN** a person's birth year is edited in the document and the model is
  asked for that person again
- **THEN** the new year is reported
