# genealogy-read-model Specification

## Purpose

How the plugin reads people, families, sources and citations out of a GEDCOM
document: how a record is addressed across documents, which relatives, events
and citations are reported, where in the file each is stated, and what is
reported when the file says something the model cannot make sense of.

## Requirements

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
invalidate addresses that named it. A tab showing a record keeps showing it
across a rename, because the tab holds the file and only the identifier of the
record within it.

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

### Requirement: The families a document declares

The model SHALL report every `FAM` record in the document as a family, in the
order the file declares them, with the identifier the record carries. A record
declaring no identifier SHALL be reported and marked unaddressable, as a person
so declared is.

Each family SHALL carry what a reader needs to tell it from another without
opening it: the people it joins as spouses, a year and a place read from the
marriage the record states, and how many children it records.

#### Scenario: A document of people and families
- **WHEN** the model reads a document holding 5 `FAM` records
- **THEN** it reports 5 families, in the order the file declares them

#### Scenario: What a family carries for a list
- **WHEN** a family record names two spouses, a marriage in 1895 at Sceaux and
  two children
- **THEN** the family carries both spouses, the year 1895, the place, and a
  count of two children

#### Scenario: A family record with no identifier
- **WHEN** the document holds a line `0 FAM` with no cross-reference
- **THEN** a family is reported for it, marked unaddressable, and the rest of
  the document is read normally

### Requirement: A family is named by the people in it

A family record carries no name of its own. The model SHALL name a family by
the people it joins as spouses, in the order the record names them, joined so
that a reader can tell one family from another in a list.

Where a family names one spouse, that one names it. Where it names none, the
model SHALL report no name rather than an invented one, and a caller SHALL
show the identifier instead.

A spouse the document does not declare SHALL NOT contribute a name, and SHALL
NOT prevent the other spouse from naming the family.

#### Scenario: A family joining two people
- **WHEN** a family names `@I2@` as Pierre Curie and `@I1@` as Marie
  Skłodowska-Curie, in that order
- **THEN** the family is named by both, in that order

#### Scenario: A family naming one spouse
- **WHEN** a family names one spouse and no other
- **THEN** that spouse names the family

#### Scenario: A family naming nobody
- **WHEN** a family names no spouse at all
- **THEN** the family has no name, and the caller is left to show its
  identifier

#### Scenario: A spouse the document does not declare
- **WHEN** a family names two spouses and the document declares only one
- **THEN** the family is named by the one it declares, and the other is
  reported as an unresolved reference

### Requirement: A family read in full

Reading one family SHALL report its spouses and its children as people,
resolved and in the order the record names them, each carrying what a person
row carries so a caller can show them as it shows anybody.

Which role named each person SHALL be reported with them, because a family is
read differently from either side, and a caller showing one cannot infer the
role from position.

A pointer the document does not declare SHALL be reported as unresolved,
carrying the identifier it named, as it is for a person.

#### Scenario: A family with spouses and children
- **WHEN** a family names two spouses and two children, all declared
- **THEN** all four are reported as people, in the order the record names
  them, each with the role that named them

#### Scenario: A child the document does not hold
- **WHEN** a family names a child the document does not declare
- **THEN** the remaining children are reported, and the identifier is reported
  as a missing child together with the line of the family record that names it

### Requirement: The events a family record carries

The model SHALL report the events a family record carries, in the order the
record writes them, from a named set of the event structures GEDCOM defines
for a family record — marriage, divorce, engagement, annulment and the rest of
that set.

The set SHALL be named rather than inferred, for the reason a person's is:
nothing in the document data distinguishes an event from another structure.
A structure outside the set — a pointer to a spouse, a child, a note, a source
— SHALL NOT be reported as an event.

Each event SHALL carry the tag it was written with, its date and place where
it has them, and its own payload where it carries one, as a person's event
does.

#### Scenario: A marriage with a date and a place
- **WHEN** a family record carries `1 MARR` with `2 DATE 26 JUL 1895` and
  `2 PLAC Sceaux, France`
- **THEN** one event is reported, tagged `MARR`, carrying that date and place

#### Scenario: A family that records only that a marriage happened
- **WHEN** a family record carries `1 MARR` with nothing beneath it
- **THEN** one event is reported, tagged `MARR`, with no date and no place

#### Scenario: A structure that is not an event
- **WHEN** a family record carries `1 HUSB @I1@`, `1 CHIL @I2@` and
  `1 SOUR @S1@`
- **THEN** none of the three is reported as an event

### Requirement: The families a person belongs to

Reading a person SHALL report the families they belong to: the ones their
record points at as a child, and the ones it points at as a spouse, each
distinguished from the other, in the order the record points at them.

Each SHALL carry what a family row carries, so a caller can show a family
beside a person without reading it in full.

A person whose record points at no family SHALL report none, and a pointer the
document does not declare SHALL be reported as unresolved, as it already is.

#### Scenario: A person who is a child and a spouse
- **WHEN** a person's record carries `1 FAMC @F1@` and `1 FAMS @F3@`, both
  declared
- **THEN** `@F1@` is reported as a family they were a child in and `@F3@` as
  one they were a spouse of

#### Scenario: A person in more than one spouse-family
- **WHEN** a person's record points at two families as a spouse
- **THEN** both are reported, in the order the record points at them

#### Scenario: A person pointing at no family
- **WHEN** a person's record points at no family
- **THEN** no families are reported for them

### Requirement: The sources a document declares

The model SHALL report every `SOUR` record in the document as a source, in the
order the file declares them, with the identifier the record carries. A record
declaring no identifier SHALL be reported and marked unaddressable, as a person
and a family so declared are.

Each source SHALL carry what a reader needs to tell it from another without
opening it: its title, who the record says wrote it, and the name of the
repository it points at where the document declares one.

A source with no title SHALL be reported, titled by a stated placeholder rather
than by an empty string, as a person with no name is.

#### Scenario: A document of sources
- **WHEN** the model reads a document holding three `SOUR` records
- **THEN** it reports three sources, in the order the file declares them

#### Scenario: What a source carries for a list
- **WHEN** a source record carries `1 TITL The Nobel Prize in Physics 1903`,
  `1 AUTH Nobel Prize Outreach` and `1 REPO @R1@`, and `@R1@` is named
  `Nobel Prize Outreach`
- **THEN** the source carries that title, that author and that repository name

#### Scenario: A source naming a repository the document does not declare
- **WHEN** a source points at `@R9@` and no such record is declared
- **THEN** the source carries no repository name and the identifier is reported
  as unresolved

#### Scenario: A source with no title
- **WHEN** a source record carries no `TITL`
- **THEN** it is reported, titled by a placeholder

### Requirement: A source read in full

Reading one source SHALL report what the record states about it — its title,
author, publisher and any other payload the record carries at its first level —
together with the repository it names, read as a record of its own so that the
repository's name, address and web address are available.

The pictures the source points at SHALL be reported as a person's are, so a
caller can show a scan of the document the source is.

#### Scenario: A source and its repository
- **WHEN** a source points at a repository named `State Archive in Warsaw` with
  an address
- **THEN** reading the source reports that name and that address

#### Scenario: A source carrying a picture
- **WHEN** a source points at a multimedia record naming an image
- **THEN** that picture is reported, as it is for a person

### Requirement: Citations, read both ways

The model SHALL report citations: a `SOUR` pointer from within a record to a
source record. A citation SHALL be reported to both sides — as something a
record makes, and as something a source receives — from one reading of the
document.

A citation SHALL carry the page or entry the citing record states beneath it
where it states one, since that is what tells one citation of a register from
another.

A citation SHALL carry what it was made from: the record that makes it, and,
where the pointer sits beneath a structure of that record rather than on the
record itself, the tag of that structure. A citation on a birth is not the same
claim as a citation on the person, and a reader looking at a source must be
able to tell them apart.

A citation SHALL carry the quality of evidence the citing record states for
it (`QUAY`, from 0 to 3) where it states one, and nothing where it does not.

A citation naming a source the document does not declare SHALL be reported as
unresolved from the citing side, and SHALL of course reach no source.

A source the citing record describes on the spot, as 5.5.1 allows with a `SOUR`
line carrying text instead of a pointer, SHALL be reported as a citation too,
carrying the text its own line states and marked as reaching no source record.
It SHALL NOT be read as a structure the citations beneath it hang from.

#### Scenario: A person citing a source
- **WHEN** a person's record carries `1 SOUR @S1@` with
  `2 PAGE Nobel Prize in Physics 1903`
- **THEN** the person is reported as citing `@S1@` with that page, and `@S1@`
  is reported as cited by that person

#### Scenario: A citation beneath an event
- **WHEN** a person's record carries `1 BIRT` with `2 SOUR @S2@` beneath it
- **THEN** the citation is reported carrying the tag `BIRT`, so that a reader
  can tell it from one made by the person's record itself

#### Scenario: A source cited by several records
- **WHEN** three records cite one source
- **THEN** the source is reported as cited by all three, in the order the file
  declares the citing records

#### Scenario: A source nothing cites
- **WHEN** a source record is declared and no record cites it
- **THEN** it is reported as cited by nobody, which is not an error

#### Scenario: A citation of a source that is not there
- **WHEN** a record cites `@S9@` and no such record is declared
- **THEN** the identifier is reported as unresolved for that record

#### Scenario: A citation with a quality of evidence
- **WHEN** a person's record carries `1 SOUR @S2@` with `2 QUAY 3`
- **THEN** the citation carries quality 3

#### Scenario: A source described on the spot
- **WHEN** a 5.5.1 record carries `1 BIRT` with
  `2 SOUR Family Bible of the Skłodowski family` beneath it
- **THEN** a citation of the birth is reported, carrying that text and reaching
  no source record, and nothing is reported as cited by a structure called
  `SOUR`

### Requirement: Reading both ways costs one pass

Building the citation index SHALL happen in the pass that already reads the
document, and SHALL NOT re-traverse it per source or per record. Asking a
source what cites it, and asking a record what it cites, SHALL both be lookups.

#### Scenario: A document read once
- **WHEN** the model is built and then asked what cites each of three sources
- **THEN** the document is read once

### Requirement: A citation belongs to the event it sits under

A citation that sits beneath an event SHALL be reported with that event, so
that a caller showing the event can show what it rests on without matching tags.
Where a record states the same kind of event twice — two residences, two
marriages of one family — each citation SHALL be reported with the one it sits
under, never with both and never with the first by default.

A citation on the record itself SHALL be reported with the record and with no
event. A citation beneath a structure that is not an event — a name, a picture —
SHALL be reported with the record, carrying the tag of that structure as it
already does, and with no event.

#### Scenario: Two events of one kind
- **WHEN** a person's record carries two `1 RESI` structures, and only the
  second has `2 SOUR @S1@` beneath it
- **THEN** the second residence reports one citation of `@S1@` and the first
  reports none

#### Scenario: A citation on the record and one on its birth
- **WHEN** a person's record carries `1 SOUR @S1@` and `1 BIRT` with
  `2 SOUR @S2@` beneath it
- **THEN** the person reports `@S1@` as a citation of the record and the birth
  reports `@S2@` as its own; neither appears in the other's place

#### Scenario: A family event's citation
- **WHEN** a family record carries `1 MARR` with `2 SOUR @S3@` beneath it
- **THEN** the marriage reports `@S3@` as its own citation

### Requirement: Where each thing is stated in the file

Every record, every event and every citation the model reports SHALL carry the
lines of the document that state it: from the line that opens it to the last
line beneath it, as the document numbers them for the revision the model was
read from. A caller SHALL be able to take a reader to exactly those lines.

#### Scenario: The lines of a birth
- **WHEN** a person's birth is stated by a `1 BIRT` line followed by its
  `2 DATE` and `2 PLAC` lines on the three lines that follow the person's
  `1 NAME` line
- **THEN** the birth reports exactly those three lines

#### Scenario: The lines of a record
- **WHEN** a person's record runs from its `0 @I1@ INDI` line to the line before
  the next record
- **THEN** the person reports those lines

### Requirement: A person's siblings and the families they made

Reading a person SHALL report their siblings: the other children of every
family the person is a child of, each once, in the order those families name
them. A sibling shared by two such families SHALL be reported once.

Reading a person SHALL report, for each family the person is a spouse of and in
the order the record points at them, the other spouse where the family names
one, the family's events, and its children, so that a caller can show each
marriage with the children of that marriage rather than all children together.

#### Scenario: Siblings through a child-family
- **WHEN** a person is a child of `@F1@`, which names that person and four
  other children
- **THEN** the four others are reported as siblings, in the order `@F1@` names
  them, and the person is not their own sibling

#### Scenario: Two marriages
- **WHEN** a person is a spouse of `@F2@`, with a spouse and one child, and of
  `@F5@`, with another spouse and two children
- **THEN** two families are reported in that order, the first with its spouse
  and one child and the second with its spouse and two children

#### Scenario: A family naming no other spouse
- **WHEN** a person is the only spouse a family names
- **THEN** that family is reported with no other spouse and with its events and
  children


### Requirement: Multimedia records and the records that link them

The model SHALL report every multimedia record the document declares, with the
file it names, the caption it gives and the lines it occupies. Reading one SHALL
report every record that links it, in the order the file declares those
records, each with the caption and the rectangle that link states.

Every picture the model reports for a record SHALL carry the position in the
file of the link that names it, so that a caller can ask the language service
what that link refers to.

#### Scenario: A photograph linked by two people
- **WHEN** `@O5@` names `Media/curie-family-1908.svg`, and Marie's and Pierre's
  records each link it with a rectangle and a caption
- **THEN** reading `@O5@` reports both, Marie first, each with their own
  rectangle and caption

#### Scenario: A multimedia record nobody links
- **WHEN** `@O7@` is declared and no record links it
- **THEN** reading it reports no record, which is not an error
