## REMOVED Requirements
### Requirement: Opening a record from the index

**Reason**: A row no longer opens a page in Genealogy mode, which is removed; it selects the record in every mode. Two of its scenarios have no counterpart.

**Migration**: "Selecting a record from the index" below, and `genealogy-record-card`, "A tab has one selected record".

## MODIFIED Requirements

### Requirement: People, families and sources

The index SHALL list the file's people, its families or its sources, switched
at its top. The list chosen SHALL be kept when the workspace is restored. People SHALL be listed in the order the file declares them, each with their
name, their years as the person card shows them, and the place of birth, or of
death where no birth place is stated. Families SHALL be listed in the order the
file declares them, each named by its spouses as the family card names it, with
the year and place of the marriage where the record states them. Sources SHALL be listed in the order the
file declares them, each with its title, its author where stated, and how many
records cite it.

A record the file declares without an identifier SHALL NOT be listed, since it
cannot be opened.

#### Scenario: A person row
- **WHEN** the index lists the people of `curie.ged`
- **THEN** Marie's row reads her name, `1867–1934` and
  `Warsaw, Congress Poland`

#### Scenario: A family row
- **WHEN** the index lists the families of `curie.ged`
- **THEN** the Curies' row reads Pierre Curie and Marie Skłodowska-Curie,
  `1895` and `Sceaux, France`

#### Scenario: A source row
- **WHEN** the index lists the sources of `curie.ged`
- **THEN** `Parish registers of Warsaw` shows that two records cite it

## ADDED Requirements
### Requirement: Selecting a record from the index

Activating a row SHALL select that record in the GEDCOM tab the index follows, as
the requirement on the selected record says: the record card shows it, whatever the
mode of the tab, and the tab stays in its mode and opens no page. In Graph or
Timeline mode a person SHALL be marked in the view, which SHALL glide to them; in
Source mode the cursor SHALL go to the record's first line, scrolled into view. On
a phone the row SHALL close the left drawer and open the right drawer on the card.
The row of the selected record SHALL be marked as the current one, in every mode;
with nothing selected no row is.

#### Scenario: Selecting Pierre in the graph
- **WHEN** the GEDCOM tab is in Graph mode and the reader activates Pierre Curie's
  row
- **THEN** the tab stays in Graph mode with Pierre Curie's card selected and
  centred, no page is opened, the record card shows him, and his row is the
  current one

#### Scenario: A family row in the graph
- **WHEN** the GEDCOM tab is in Graph mode and the reader activates the Curies'
  row among the families
- **THEN** the tab stays in Graph mode, the record card shows the Curies' family,
  and that row is the current one

#### Scenario: Selecting Marie in the timeline
- **WHEN** the GEDCOM tab is in Timeline mode and the reader activates Marie's row
- **THEN** her row in the timeline is selected and scrolled to, and her row in the
  index is the current one

#### Scenario: Nothing selected
- **WHEN** the GEDCOM tab is in Graph mode and nothing is selected
- **THEN** no row of the index is marked as the current one

#### Scenario: Opening Pierre in the source
- **WHEN** the GEDCOM tab is in Source mode and the reader activates Pierre
  Curie's row
- **THEN** the tab stays in Source mode with the cursor on `0 @I2@ INDI`, and the
  record card shows him

#### Scenario: Opening a family in the source
- **WHEN** the GEDCOM tab is in Source mode and the reader activates the Curies'
  row among the families
- **THEN** the tab stays in Source mode with the cursor on `0 @F3@ FAM`

#### Scenario: A row on a phone
- **WHEN** the reader activates Marie's row in the index on a phone
- **THEN** the left drawer closes and the right drawer opens on Marie's card
