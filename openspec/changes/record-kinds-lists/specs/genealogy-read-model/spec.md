## ADDED Requirements

### Requirement: The media, notes, repositories and other records a document declares

The model SHALL list, for a document, its multimedia records, its shared notes (a 7.0 `SNOTE` record and a 5.5.1 `NOTE` record), its repositories, and its other records — the header first, then every record with an identifier that is not a person, a family, a source, a multimedia record, a shared note or a repository — each in the order the document writes them, each with what the list shows of it, and for each record with an identifier how many lines of the document point at it. A record without an identifier SHALL NOT be listed, except the header. The lists SHALL be read in the same pass as the rest of the model and SHALL be paid for once per revision of the document.

#### Scenario: Counting the lines that point at a record
- **WHEN** three lines of a document point at `@N1@`, one of them inside a citation
- **THEN** the note `@N1@` is listed with 3 lines pointing at it

#### Scenario: A note in each dialect
- **WHEN** a 7.0 document declares `0 @N1@ SNOTE Text` and a 5.5.1 document declares `0 @N1@ NOTE Text`
- **THEN** each lists one shared note reading `Text`

#### Scenario: The header
- **WHEN** a document has a header and one submitter
- **THEN** its other records are the header, then the submitter
