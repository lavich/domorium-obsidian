## MODIFIED Requirements

### Requirement: Opening a record from the index

Activating a row SHALL take the GEDCOM tab the index follows to that record: in
Genealogy mode it SHALL show the record's page; in Graph or Timeline mode it SHALL
show the record's page too, leaving that mode for Genealogy mode, as activating
the record in the graph or the timeline does; and in Source mode it SHALL leave
the tab in Source mode with the cursor at the record's first line, scrolled into
view. On a phone it SHALL close the drawer. The row of the record a tab in
Genealogy mode shows SHALL be marked as the current one; a tab in Graph or
Timeline mode shows no record, and the index SHALL mark no row as current.

#### Scenario: Opening Pierre as genealogy
- **WHEN** the GEDCOM tab is in Genealogy mode and the reader activates Pierre
  Curie's row
- **THEN** the tab shows Pierre Curie's page, and his row is the current one

#### Scenario: Opening Pierre from the graph
- **WHEN** the GEDCOM tab is in Graph mode and the reader activates Pierre Curie's
  row
- **THEN** the tab is in Genealogy mode showing Pierre Curie's page, and his row
  is the current one

#### Scenario: No current row in the graph
- **WHEN** the GEDCOM tab is in Graph mode
- **THEN** no row of the index is marked as the current one

#### Scenario: Opening Pierre in the source
- **WHEN** the GEDCOM tab is in Source mode and the reader activates Pierre
  Curie's row
- **THEN** the tab stays in Source mode with the cursor on `0 @I2@ INDI`

#### Scenario: Opening a family in the source
- **WHEN** the GEDCOM tab is in Source mode and the reader activates the Curies'
  row among the families
- **THEN** the tab stays in Source mode with the cursor on `0 @F3@ FAM`
