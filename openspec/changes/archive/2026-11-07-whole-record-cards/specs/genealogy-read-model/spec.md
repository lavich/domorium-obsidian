## ADDED Requirements

### Requirement: A record's lines are reachable whole

For any record of the document that has an identifier — a person, a family, a source, a media record,
a repository, a submitter, a shared note — the model SHALL give the lines of that record as the file writes
them, to any depth, on request for that one record: each with its tag, its value or its pointer,
its substructures in the order written, and the range it occupies. A `CONC` or `CONT` SHALL be
joined to the line it continues, as text broken at a `CONT` and unbroken at a `CONC`, and SHALL NOT be a
line of its own. A payload of the form `@X@` SHALL be the pointer of the line, any other payload its value,
with `@@` read as `@`, a payload beginning `@@` being a value; the payload `@VOID@` SHALL be marked as the 7.0 "no record" pointer and not as a pointer to a record. The text of a shared note SHALL be given whichever dialect declares it, as the payload of
the record line continued as above. Giving the lines of one record SHALL cost no more than a walk of that
record, and SHALL NOT be done for the records nobody asked for.

#### Scenario: The lines of Marie's record
- **WHEN** the lines of a person's record are asked for, in which `1 NAME` has `2 TYPE BIRTH` and `2 NICK Manya`
- **THEN** the lines are a `NAME` with the children `TYPE` and `NICK`, with their values, in that order

#### Scenario: A continued note
- **WHEN** a line is `1 NOTE first` with `2 CONT second` and `2 CONC  more`
- **THEN** its text is `first`, a line break and `second more`, and it has no children

#### Scenario: A pointer and a value
- **WHEN** a record has `1 FAMC @F1@` and `1 SEX F`
- **THEN** the first line has the pointer `@F1@` and no value, the second the value `F` and no pointer

#### Scenario: A shared note of either dialect
- **WHEN** the document declares `0 @N1@ SNOTE text` in 7.0, or `0 @N1@ NOTE text` in 5.5.1
- **THEN** the lines of `@N1@` give the text `text`

#### Scenario: A note with an empty first line
- **WHEN** a shared note's record line has no text and its first `CONT` carries it
- **THEN** its text is an empty line and then that continuation

#### Scenario: A void pointer
- **WHEN** a record has `1 ASSO @VOID@`
- **THEN** the line is marked void, has no pointer to look up and has no value

#### Scenario: A record that is not declared
- **WHEN** the lines of `@I9@` are asked for and the document declares no such record
- **THEN** the model answers that there is no such record
