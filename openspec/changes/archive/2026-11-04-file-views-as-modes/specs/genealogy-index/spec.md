## MODIFIED Requirements

### Requirement: Opening a record from the index

Activating a row SHALL take the GEDCOM tab the index follows to that record. In
Genealogy mode it SHALL show the record's page. In Source mode it SHALL leave the
tab in Source mode with the cursor at the record's first line, scrolled into
view. In Graph or Timeline mode, for a person, it SHALL select that person in the
view, as the requirement on selecting in those modes says, leaving the tab in its
mode and opening no page; for any other record it SHALL show the record's page,
leaving that mode for Genealogy mode. On a phone it SHALL close the drawer. The
row of the record a tab shows or has selected SHALL be marked as the current one:
the page's record in Genealogy mode, the selected person in Graph or Timeline
mode.

#### Scenario: Opening Pierre as genealogy
- **WHEN** the GEDCOM tab is in Genealogy mode and the reader activates Pierre
  Curie's row
- **THEN** the tab shows Pierre Curie's page, and his row is the current one

#### Scenario: Selecting Pierre in the graph
- **WHEN** the GEDCOM tab is in Graph mode and the reader activates Pierre Curie's
  row
- **THEN** the tab stays in Graph mode with Pierre Curie's card selected and
  centred, no page is opened, and his row is the current one

#### Scenario: A family row in the graph
- **WHEN** the GEDCOM tab is in Graph mode and the reader activates the Curies'
  row among the families
- **THEN** the tab is in Genealogy mode showing the Curies' family page

#### Scenario: Nothing selected in the graph
- **WHEN** the GEDCOM tab is in Graph mode and nothing is selected
- **THEN** no row of the index is marked as the current one

#### Scenario: Opening Pierre in the source
- **WHEN** the GEDCOM tab is in Source mode and the reader activates Pierre
  Curie's row
- **THEN** the tab stays in Source mode with the cursor on `0 @I2@ INDI`

#### Scenario: Opening a family in the source
- **WHEN** the GEDCOM tab is in Source mode and the reader activates the Curies'
  row among the families
- **THEN** the tab stays in Source mode with the cursor on `0 @F3@ FAM`
