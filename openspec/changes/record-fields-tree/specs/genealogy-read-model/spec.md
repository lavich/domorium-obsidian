## MODIFIED Requirements

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
- **THEN** the source carries no repository name

#### Scenario: A source with no title
- **WHEN** a source record carries no `TITL`
- **THEN** it is reported, titled by a placeholder

### Requirement: A source read in full

Reading one source SHALL report what the record states about it — its title,
author, publisher and any other payload the record carries at its first level.

The pictures the source points at SHALL be reported as a person's are, so a
caller can show a scan of the document the source is.

#### Scenario: A source carrying a picture
- **WHEN** a source points at a multimedia record naming an image
- **THEN** that picture is reported, as it is for a person

#### Scenario: A source and its repository
- **WHEN** a source points at a repository named `State Archive in Warsaw` with an address
- **THEN** reading the source reports the title, author and payload of the source and no repository name or address of its own; the pointer is among the lines of its record, which the model gives as the file writes them

