## MODIFIED Requirements

### Requirement: The reader can see and choose which document, and what of it

The view SHALL carry a bar above the search field naming two things: the
document being listed, and what of that document is being listed.

Each SHALL be a control rather than a label. Choosing another document from the
first SHALL list that document's people without the reader having to open the
file. A vault may hold more than one GEDCOM, and a list of names says nothing
about which tree they belong to.

The first SHALL offer every GEDCOM file in the vault, and SHALL show whichever
document is being listed, however the reader arrived at it — by choosing it
here, or by opening the file.

The second SHALL offer people, families and sources, and choosing one SHALL
list that subject of the document named beside it. The two selections are independent: a
change of document SHALL keep the subject, and a change of subject SHALL keep
the document.

#### Scenario: Naming the document being listed
- **WHEN** the list is showing the people of `curie.ged`
- **THEN** the bar names `curie.ged`, and names people beside it

#### Scenario: Choosing another document
- **WHEN** the vault holds `curie.ged` and `joliot.ged`, and the reader chooses
  `joliot.ged` from the bar
- **THEN** the list shows that document's people, and the bar names it

#### Scenario: Arriving by opening the file instead
- **WHEN** the reader opens `joliot.ged` in the editor
- **THEN** the bar names `joliot.ged`, as though it had been chosen there

#### Scenario: Choosing families
- **WHEN** the reader chooses families from the second control
- **THEN** the list shows that document's families

#### Scenario: Choosing sources
- **WHEN** the reader chooses sources from the second control
- **THEN** the list shows that document's sources

#### Scenario: Changing document with families chosen
- **WHEN** families are being listed and the reader chooses another document
- **THEN** that document's families are listed, families still being the
  subject

#### Scenario: A vault with one GEDCOM
- **WHEN** the vault holds one GEDCOM file
- **THEN** the bar still names it, and offers nothing else to choose

#### Scenario: Before any GEDCOM has been opened
- **WHEN** the view is opened and no GEDCOM has been opened in this session
- **THEN** the bar names the first of the vault's GEDCOM files, and that
  document is the one listed

## ADDED Requirements

### Requirement: A source row tells one source from another

Where sources are being listed, each row SHALL show the source's title, or its
identifier where the record states no title, and beneath it who the record says
wrote it and the name of the repository holding it, where the record states
them.

A source stating neither SHALL be shown by its title alone, with nothing empty
beneath it.

#### Scenario: A source with an author and a repository
- **WHEN** a source is titled `The Nobel Prize in Physics 1903`, written by
  `Nobel Prize Outreach` and held by a repository of that name
- **THEN** its row shows the title, and the author and the repository beneath

#### Scenario: A source stating only a title
- **WHEN** a source record carries a title and nothing else
- **THEN** its row shows the title and nothing beneath it

#### Scenario: A source with no title
- **WHEN** a source record carries no title
- **THEN** its row shows the source's identifier

### Requirement: Typing filters sources too

Where sources are being listed, a source SHALL match when the typed text
appears in its title, in its author, in the name of its repository, or in its
identifier. Matching SHALL ignore case, and the identifier SHALL match whether
or not the reader types the surrounding `@`.

Everything the list says while sources are shown SHALL name sources, as it
names families while families are shown.

#### Scenario: Matching a title
- **WHEN** sources are listed and the reader types `parish`
- **THEN** every source whose title contains that text is shown

#### Scenario: Matching a repository
- **WHEN** the reader types `warsaw`
- **THEN** the sources held there are shown

#### Scenario: Counting sources
- **WHEN** sources are being listed and there are three
- **THEN** the count says there are three sources

### Requirement: The list marks the source the reader is looking at

Where sources are being listed and a Source view is showing one from the same
document, that source's row SHALL be marked, as a person's and a family's rows
are.

#### Scenario: Choosing a source from the list
- **WHEN** the reader chooses a source row
- **THEN** that row is marked, and no other row is
