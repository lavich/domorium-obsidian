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

The second SHALL offer people and families, and choosing one SHALL list that
subject of the document named beside it. The two selections are independent: a
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

### Requirement: A family row tells one family from another

Where families are being listed, each row SHALL show the people the family
joins, the year of the marriage where one could be read, the place where the
record states one, and how many children the family records.

A family the record names nobody for SHALL be shown by its identifier, which is
the only thing that tells it apart.

A family that records no marriage SHALL be shown without a year and without a
place, rather than with an empty span where one would go. A family that records
no children SHALL be shown without a count rather than with a zero.

#### Scenario: A family with a marriage and children
- **WHEN** a family joins Pierre Curie and Marie Skłodowska-Curie, married in
  1895 at Sceaux, with two children
- **THEN** its row names both people, `1895`, `Sceaux, France`, and that there
  are two children

#### Scenario: A family recording only the people in it
- **WHEN** a family names two spouses, no marriage and no child
- **THEN** its row names the two people and shows nothing else

#### Scenario: A family naming nobody
- **WHEN** a family record names no spouse
- **THEN** its row shows the family's identifier

### Requirement: Typing filters families too

Where families are being listed, a family SHALL match when the typed text
appears in the name of anybody it joins, in its identifier, in the year of its
marriage, or in the place the marriage states. Matching SHALL ignore case, and
the identifier SHALL match whether or not the reader types the surrounding `@`.

Clearing the field SHALL restore the whole list, and nothing matching SHALL be
said the same way it is for people.

#### Scenario: Matching a spouse's name
- **WHEN** families are listed and the reader types `curie`
- **THEN** every family joining somebody of that name is shown

#### Scenario: Matching a place of marriage
- **WHEN** the reader types `sceaux`
- **THEN** the families married there are shown

#### Scenario: Nothing matches
- **WHEN** the reader types text no family matches
- **THEN** the list says that nothing was found

### Requirement: The list marks the family the reader is looking at

Where families are being listed and a Family view is showing one from the same
document, that family's row SHALL be marked, as a person's row is marked when
their page is open.

At most one row SHALL be marked, and none SHALL be marked where the family
shown belongs to another document or where people are being listed.

#### Scenario: Choosing a family from the list
- **WHEN** the reader chooses a family row
- **THEN** that row is marked, and no other row is

#### Scenario: A person's page open while families are listed
- **WHEN** a Person view is showing somebody and the list is showing families
- **THEN** no family row is marked
