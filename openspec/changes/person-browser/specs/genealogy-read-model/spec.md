## Purpose

How the plugin reads people, families and events out of a GEDCOM document: what
a person is, how one is addressed across documents, which relatives and events
are reported, how a name and a date are read, and what is reported when the file
says something the model cannot make sense of.

## ADDED Requirements

### Requirement: A person is addressed by a document reference and an identifier

A person SHALL be addressed by a reference to the document they live in together
with their cross-reference identifier. An identifier alone SHALL NOT identify a
person: two GEDCOM files in one vault may each declare `@I123@`, and they are
different people.

The document half of the address SHALL be a reference in its own right rather
than a bare string, so that what identifies a document can later become more
than the path it currently is, without every holder of an address changing.

An address SHALL survive being written down and read back **while the document
it names stays where it is**. A document that is renamed or moved SHALL
invalidate addresses that named it; this change does not follow a rename, and a
reader who renames a GEDCOM file with a person open is shown the same
unresolved-document state as for a file that is gone. Following a rename is a
later change, for which the plugin already listens to the vault's rename event.

#### Scenario: Two documents declaring the same identifier
- **WHEN** a vault holds two GEDCOM files that each declare `@I123@`, and the
  reader opens `@I123@` of the first
- **THEN** the person shown is the one from the first file, and nothing about
  the second file is read

#### Scenario: An address written down and read back
- **WHEN** a person's address is stored, and read back while the document it
  names is still at the same path
- **THEN** it names the same person, in the same document, as when it was stored

#### Scenario: The document has been renamed since the address was stored
- **WHEN** an address is read back after the document it names was renamed
- **THEN** the document cannot be resolved, and the caller is told that rather
  than being given a person from another document or none at all

### Requirement: The people in a document

The model SHALL report every `INDI` record in the document as a person, in the
order the file declares them.

A record that declares no cross-reference identifier SHALL still be reported,
marked as unaddressable. The model SHALL NOT discard it: a record the file
states is a person is information, and a later reader of this model — a check
for malformed records, for instance — needs it. An unaddressable person cannot
be addressed, linked to, or opened, and it is for each caller to decide whether
to show one.

Each person SHALL carry what a reader needs to tell them apart without opening
them: the name as read below, a year for birth and for death as read below, and
one place taken from birth, or from death where there is no birth place.

#### Scenario: A document of people and families
- **WHEN** the model reads a document holding 17 identified `INDI` records and
  5 `FAM` records
- **THEN** it reports 17 people, in the order the file declares them

#### Scenario: A record with no identifier
- **WHEN** the document holds a line `0 INDI` with no cross-reference
- **THEN** a person is reported for it, marked unaddressable, and the rest of
  the document is read normally

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

### Requirement: A year read from a date says how exactly the date stated it

Where a list or a heading needs a year, the model SHALL read one from a `DATE`
payload that states a four-digit year in the Gregorian calendar, and SHALL
report alongside it how exactly the payload stated that year: exactly, as an
approximation, or as one end of a range.

A year so read is a reading for display. It SHALL NOT be presented as the year
an event happened, because for a range or an approximation it is not one. A
caller that needs to know whether two people share a date — comparing records,
looking for duplicates — SHALL be able to tell an exact year from an inexact one
without parsing the payload again.

A payload that states its year in another calendar, states two years for one
date, or states none SHALL yield no year rather than a guessed one. The payload
SHALL always be reported as the file wrote it, so a view can show the full date
whether or not a year could be read from it.

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

#### Scenario: A date in another calendar
- **WHEN** the payload reads `@#DHEBREW@ 5628`
- **THEN** no year is reported, and the payload is reported unchanged

#### Scenario: A dual year
- **WHEN** the payload reads `12 FEB 1867/68`
- **THEN** no year is reported, and the payload is reported unchanged

### Requirement: Relatives are resolved through families, by the roles GEDCOM defines

Parents, partners and children SHALL be resolved through the family records the
person points at, never guessed from names, dates, or from any pointer a family
happens to carry.

A person's parents are the spouses of each family their `FAMC` lines point at.
A person's partners are the other spouses of each family their `FAMS` lines
point at. A person's children are the children of those same families.

A spouse SHALL be read only from the spouse roles the GEDCOM specification
defines for a family record, and a child only from the child role. A pointer to
a person in some other role — a witness, an associate, a submitter — SHALL NOT
be read as a spouse or a child.

Within those roles the model SHALL NOT constrain what the file may say: a family
may name two spouses in the same role, one spouse, or none, and a spouse's
recorded sex need not agree with the role that names them. The model SHALL read
what the file states rather than what a family is expected to look like.

The same person SHALL NOT be reported twice in one relationship, however many
families connect them.

#### Scenario: Parents through a child-family
- **WHEN** a person's record carries `1 FAMC @F1@`, and `@F1@` names `@I3@` and
  `@I4@` in its spouse roles
- **THEN** the person's parents are `@I3@` and `@I4@`

#### Scenario: Partners and children through a spouse-family
- **WHEN** a person's record carries `1 FAMS @F3@`, and `@F3@` names that person
  and `@I2@` in spouse roles and `@I5@` and `@I6@` in child roles
- **THEN** the person's partner is `@I2@` and their children are `@I5@` and
  `@I6@`, and the person is not reported as their own partner

#### Scenario: Two spouses in the same role
- **WHEN** a family names two people in the same spouse role
- **THEN** both are reported as spouses of that family

#### Scenario: A spouse whose sex does not match the role
- **WHEN** a family names a person recorded as female in the role GEDCOM names
  for a husband
- **THEN** that person is reported as a spouse, and their sex is reported as the
  record states it

#### Scenario: A pointer in a role that is not a family role
- **WHEN** a family carries a pointer to a person in a role that is neither a
  spouse role nor the child role
- **THEN** that person is reported as neither a spouse nor a child

#### Scenario: A person in more than one family
- **WHEN** a person is a child of two families that share a parent
- **THEN** that shared parent is reported once

### Requirement: Events are reported from a named set of structures

The model SHALL report a person's events and recorded attributes from a set of
structures it names, being those the GEDCOM specification defines for an
individual record — births, deaths, burials, christenings, censuses, education,
occupation, residence, immigration, emigration, naturalisation and the rest of
that set, in both supported dialects.

The set SHALL be named rather than inferred. Nothing in the document data the
model reads distinguishes an event from another structure: a bare `1 DEAT` is
indistinguishable from `1 SEX M` or `1 FAMC @F1@`, all three being childless
structures of the same reported kind. A structure outside the named set SHALL
NOT be reported as an event, and the model SHALL NOT guess.

Each event SHALL carry the tag it was written with, so a caller can name it in
the reader's language; the date payload and the place payload where the event
has them; and the event's own payload where it carries one, as an occupation
does. Events SHALL be reported in the order the record writes them.

An event with no date, no place and no payload SHALL still be reported: that the
record states a death at all is worth showing.

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

#### Scenario: A structure that is not an event
- **WHEN** a record carries `1 SEX M`, `1 FAMC @F1@` and `1 SOUR @S1@`
- **THEN** none of the three is reported as an event

### Requirement: The pictures a person's record points at

The model SHALL report the multimedia a person's record points at, in the order
the record writes them, whether the record names a file directly or points at a
multimedia record that names it.

Each SHALL carry the file the document names, the caption the record gives it
where there is one, and the rectangle the record names within that file where
it names one. The rectangle is how a GEDCOM says "this person is the second
face from the left", and is already understood elsewhere in the plugin.

The model SHALL NOT fetch, read, decode or measure a file. It reports what the
document says and nothing about what is on disk.

One of those pictures SHALL be marked as the person's portrait: the first the
document names that it says is an image. Where the document says what a file is
the model SHALL believe it; where it says nothing the model MAY judge by the
name the file carries. A person whose record points at no picture the document
calls an image SHALL have no portrait, and a caller SHALL NOT guess one.

#### Scenario: A person pointing at a multimedia record
- **WHEN** a person's record carries `1 OBJE @O1@`, and `@O1@` carries
  `1 FILE Media/marie.svg` and `2 FORM image/svg+xml`
- **THEN** one picture is reported, naming that file, and it is the person's
  portrait

#### Scenario: A rectangle within the picture
- **WHEN** that `1 OBJE @O1@` line carries `2 CROP` with `3 TOP 10`,
  `3 LEFT 20`, `3 HEIGHT 30` and `3 WIDTH 40`
- **THEN** the picture carries that rectangle

#### Scenario: A caption
- **WHEN** that line carries `2 TITL Marie, second from the left`
- **THEN** the picture carries that caption

#### Scenario: A record naming its file directly
- **WHEN** a person's record carries `1 OBJE` with `2 FILE Media/marie.jpg`
  beneath it
- **THEN** one picture is reported, naming that file

#### Scenario: A picture the document does not call an image
- **WHEN** a person points at a multimedia record whose form says it is a sound
  recording
- **THEN** the picture is reported and it is not the portrait

#### Scenario: A multimedia record that is not there
- **WHEN** a person's record carries `1 OBJE @O9@` and no such record is
  declared
- **THEN** no picture is reported for it, the identifier is reported as
  unresolved, and the person's other pictures are reported

### Requirement: A pointer that leads nowhere is reported, not followed

Where a pointer from a person to a family, or from a family to a person, names a
record the document does not declare, the model SHALL report the reference as
unresolved, carrying the identifier it named, rather than omitting it or
failing. A caller SHALL be able to tell an unresolved reference from a resolved
one.

A pointer that names a record of the wrong kind — a family where a person is
expected — SHALL be treated the same way.

#### Scenario: A family pointing at a person who is not there
- **WHEN** a family names `@I99@` in a child role and the document declares no
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
the plugin's own settings, or the mechanism by which text is shown to a reader,
so that the same reading serves any client.

In particular the model SHALL NOT name anything in a reader's language. It
reports the tag an event was written with; naming that tag is the caller's, in
whatever language the caller speaks.

#### Scenario: The model built outside the application
- **WHEN** the model is constructed from a document's text alone, with no
  application present
- **THEN** it reports the same people, relatives and events it reports inside
  the application

#### Scenario: No reader-facing text in the model
- **WHEN** an event is reported
- **THEN** it carries the tag as written and no name for that tag

### Requirement: Reading is paid for once per revision of a document

The model SHALL be built once for a revision of a document and reused until that
revision changes, rather than re-read for each person shown. Reporting a
person's relatives or events SHALL NOT re-traverse the whole document.

A revision SHALL follow the text the model was built from, not the file on disk.
For a document open in an editor, the text a reader has typed but not saved is
the text the model reads, and an edit SHALL yield a new revision even though the
file on disk has not changed. For a document that is not open, the file on disk
is the text, and a revision of it SHALL change when the file does.

A revision SHALL NOT be derived from the file's modification time or size alone,
which an unsaved edit leaves untouched.

#### Scenario: Many people read from one document
- **WHEN** a reader opens twenty people in turn from one unchanged document
- **THEN** the document is read once

#### Scenario: An unsaved edit
- **WHEN** a reader changes a person's birth year in an open GEDCOM file without
  saving, and the model is asked for that person
- **THEN** the new year is reported

#### Scenario: A file changed on disk
- **WHEN** a GEDCOM file that is not open is replaced on disk and a person is
  read from it
- **THEN** the new content is reported
