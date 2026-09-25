## ADDED Requirements

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

A citation naming a source the document does not declare SHALL be reported as
unresolved from the citing side, and SHALL of course reach no source.

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

### Requirement: Reading both ways costs one pass

Building the citation index SHALL happen in the pass that already reads the
document, and SHALL NOT re-traverse it per source or per record. Asking a
source what cites it, and asking a record what it cites, SHALL both be lookups.

#### Scenario: A document read once
- **WHEN** the model is built and then asked what cites each of three sources
- **THEN** the document is read once
