## ADDED Requirements

### Requirement: The media, notes, repositories and other records a document declares

The model SHALL list, for a document, its multimedia records, its shared notes (a 7.0
`SNOTE` record and a 5.5.1 `NOTE` record), its repositories, and its other records — the
header first, under the id `header:`, then every record with an identifier that is not a
person, a family, a source, a multimedia record, a shared note or a repository — each in the
order the document writes them. A record without an identifier SHALL NOT be listed, except
the header; the trailer SHALL NOT be listed. The model SHALL answer, for the id `header:`, the
header's lines whole, as it answers the lines of a record by its identifier. The lines of a
record of the file's own SHALL carry the value its opening line writes after its tag, read
during the same pass from the language service's description of that line, since the
document symbols do not carry it; where the service describes no line, for a file with no
dialect it checked, the value is left out. Which records
each list holds SHALL be read in the pass the model already makes over the top-level records;
what a row shows of a record, and the counts, SHALL be read when they are first asked for,
once per revision of the document, and not again for each row.

The model SHALL count, for every record, how many distinct records point at it: a record —
the header among them — counts once however many of its lines, at any depth, hold a pointer
to it; a record pointing at itself, `@VOID@`, and a `CONC` or `CONT` line SHALL NOT count. It
SHALL also count, for a repository, the source records among them. The count SHALL be one
walk of every line of the document, made the first time any count is asked for and kept for
that revision.

#### Scenario: Counting the records that point at a record
- **WHEN** a person points at `@N1@` from two of its lines, one of them inside a citation,
  and a family points at it once
- **THEN** the note `@N1@` is counted as pointed at by 2 records

#### Scenario: A note in each dialect
- **WHEN** a 7.0 document declares `0 @N1@ SNOTE Text` and a 5.5.1 document declares
  `0 @N1@ NOTE Te` with `1 CONC xt`
- **THEN** each lists one shared note reading `Text`

#### Scenario: The header
- **WHEN** a document has a header, one submitter and a trailer
- **THEN** its other records are the header, then the submitter, and the lines of `header:`
  are the header's

#### Scenario: The value of a record of the file's own
- **WHEN** a 7.0 document declares `0 @P1@ _PLAN Custom value`
- **THEN** the lines of `@P1@` carry `Custom value` as the value of their opening line

#### Scenario: Paid once
- **WHEN** the list asks for the counts of 1478 notes of one revision
- **THEN** the document's lines are walked once for all of them

## MODIFIED Requirements

### Requirement: Multimedia records and the records that link them

The model SHALL report every multimedia record the document declares, with the
file it names, the format it states for that file, the caption it gives and the lines it
occupies. How many records link it SHALL be the count the model keeps for every record, as
the requirement on the media, notes, repositories and other records says; reading a
multimedia record SHALL NOT list those records, since the media card is the tree of the
record's own lines.

Every picture the model reports for a record SHALL carry the position in the
file of the link that names it, so that a caller can ask the language service
what that link refers to. Every line of a record's lines that carries a value SHALL carry the
position of that value, so that a caller can ask the language service what a file line
refers to.

#### Scenario: A photograph linked by two people
- **WHEN** `@O5@` names `Media/curie-family-1908.svg`, and Marie's and Pierre's
  records each link it with a rectangle and a caption
- **THEN** reading `@O5@` reports its file, its format `image/svg+xml` and its title, and the
  model counts two records linking it

#### Scenario: A multimedia record nobody links
- **WHEN** `@O7@` is declared and no record links it
- **THEN** the model counts no record linking it, which is not an error
