## ADDED Requirements

### Requirement: The card of a shared note, a repository and another record

Selecting a shared note, a repository, the header of the file, a submitter or a record of the file's own SHALL show its card, as selecting a person shows theirs: in the same sidebar view, following the same tab, with the same rules for focus, redraw and a narrow panel. The card SHALL show the record's name as its heading — the first line of a note's text, a repository's name, *File header* for the header, a submitter's name, the name, title or first value of a record of the file's own, or its kind where it states none — and below it every line of the record, as the record detail requirements read a line, a pointer as the name of the record it points at. A pointer to such a record anywhere on a card SHALL select it, as a pointer to a person does.

#### Scenario: A shared note
- **WHEN** the reader chooses a note in the Notes of the list
- **THEN** the card shows the note's first line as its heading and its whole text and its lines below

#### Scenario: From a source to its repository
- **WHEN** a source's card shows the repository it names and the reader presses it
- **THEN** the card shows that repository's card

#### Scenario: The file header
- **WHEN** the reader chooses *File header* in the Other kind of the list
- **THEN** the card shows *File header* and the header's lines, the GEDCOM version among them

#### Scenario: A record of the file's own
- **WHEN** the reader chooses `_PLAN` in the Other kind
- **THEN** the card shows `Research plan` as its heading and the record's lines, its custom tags as written
