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
