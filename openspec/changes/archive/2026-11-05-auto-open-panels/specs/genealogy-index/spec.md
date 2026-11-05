## MODIFIED Requirements

### Requirement: The index lives in the left sidebar and follows the GEDCOM tab

While the **Genealogy interface** setting is on, the plugin SHALL offer an index
view, named **Domorium**, that opens in the left sidebar from the plugin's
ribbon icon and from a command. While it is off, the plugin SHALL show no ribbon
icon, SHALL NOT offer the command, and SHALL close an index view that is open.
On a phone it SHALL be reached as Obsidian's other sidebar views are, from the
left drawer.

Where the sidebar is not a drawer and the setting **Open the side panels when
selecting** is on, a record selected by a click, a tap or a key on a card, a node
or a row of Graph or Timeline, by a link or *Go to record*, SHALL put the index in
the left sidebar if it is not open, and expand the left sidebar if it is collapsed,
without moving the focus; an index open in an expanded sidebar SHALL be left as it
is, also when another tab is in front. A selection by the cursor in Source, or
inside the card, SHALL NOT open it, and nothing opens it by a selection on a phone
or while the genealogy interface is off.

The index SHALL show the file of the GEDCOM tab most recently active. With no
GEDCOM tab open it SHALL say so.

#### Scenario: Opening the index
- **WHEN** the interface is on, `curie.ged` is open and the reader clicks the
  ribbon icon
- **THEN** the left sidebar shows the people of `curie.ged`, all 17 of them

#### Scenario: Opened by a selection
- **WHEN** the setting is on, the left sidebar is collapsed and the reader clicks Marie's card in the graph on a desktop
- **THEN** the left sidebar expands on the index of `curie.ged`, and the graph keeps the focus

#### Scenario: Closed by the reader and selecting again
- **WHEN** the setting is on, the reader closed the index and clicks Pierre's card in the graph
- **THEN** the index is placed in the left sidebar again

#### Scenario: An index already open
- **WHEN** the setting is on, the index is open in the expanded left sidebar behind another tab and the reader clicks a card in the graph
- **THEN** the left sidebar is left as it is

#### Scenario: The setting is off
- **WHEN** the setting is off and the reader clicks a card in the graph
- **THEN** the left sidebar is not opened

#### Scenario: On a phone
- **WHEN** the reader touches a card in the graph on a phone
- **THEN** the left drawer does not open

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
