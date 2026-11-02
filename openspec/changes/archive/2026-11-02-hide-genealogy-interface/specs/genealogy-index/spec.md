## MODIFIED Requirements

### Requirement: The index lives in the left sidebar and follows the GEDCOM tab

While the **Genealogy interface** setting is on, the plugin SHALL offer an index
view, named **Domorium**, that opens in the left sidebar from the plugin's
ribbon icon and from a command. While it is off, the plugin SHALL show no ribbon
icon, SHALL NOT offer the command, and SHALL close an index view that is open.
On a phone it SHALL be reached as Obsidian's other sidebar views are, from the
left drawer.

The index SHALL show the file of the GEDCOM tab most recently active. With no
GEDCOM tab open it SHALL say so.

#### Scenario: Opening the index
- **WHEN** the interface is on, `curie.ged` is open and the reader clicks the
  ribbon icon
- **THEN** the left sidebar shows the people of `curie.ged`, all 17 of them

#### Scenario: Moving to a Markdown note
- **WHEN** the reader moves from the GEDCOM tab to a Markdown note
- **THEN** the index still shows `curie.ged`

#### Scenario: No GEDCOM file open
- **WHEN** the index is open and no GEDCOM tab is
- **THEN** the index says no GEDCOM file is open

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off
- **THEN** there is no ribbon icon and the palette does not offer to open the
  index

#### Scenario: Workspace restored with the interface off
- **WHEN** the workspace was saved with the index open and the interface is off
- **THEN** the index view is closed once the workspace has loaded
