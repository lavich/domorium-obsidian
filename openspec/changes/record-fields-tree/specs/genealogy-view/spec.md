## MODIFIED Requirements

### Requirement: Selecting a record opens the record card, unless the reader turned it off

The plugin SHALL have a setting, **Open the record card when selecting**, that SHALL
be on by default for every reader, including one whose settings were saved before the
setting existed, and that applies while the **Genealogy interface** setting is on. It
SHALL be saved under the key the setting had when it was called *Open the side panels
when selecting*, `openPanelsOnSelect`, so that a reader who turned that off has this
off. The setting row SHALL stay in the settings while the interface is off and its
description SHALL say that it applies while the interface is on. While both are on, on a
desktop, a selection by the reader in a GEDCOM tab through a click, a tap or a key on a
card, a node, a row or a name, a row of the list, a link into a record or *Go to record*
SHALL open the record card in the right sidebar, as `genealogy-record-card` says, and
SHALL NOT take the focus from the view the reader selected in; it SHALL NOT open or
expand the left sidebar. A selection by the cursor resting in Source, by a saved state
being restored, or by a pointer, a citation or a place inside the card SHALL NOT open a sidebar.
With the setting off the plugin SHALL behave as it did before the setting existed. On a
phone the setting SHALL change nothing: the right drawer opens as the card specifies.

#### Scenario: A reader who updates
- **WHEN** the plugin updates and the saved settings do not mention the setting
- **THEN** the setting is on

#### Scenario: A reader who turned the earlier setting off
- **WHEN** the plugin updates and the saved settings hold `openPanelsOnSelect` as false
- **THEN** the setting is off

#### Scenario: The setting row
- **WHEN** the reader opens the plugin settings
- **THEN** a toggle named **Open the record card when selecting** is in the settings, and its description says it applies while the genealogy interface is on

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off
- **THEN** no selection opens any panel and the setting row is still in the settings

#### Scenario: A click in the graph
- **WHEN** both settings are on, the right sidebar is collapsed and the reader clicks Marie's card in the graph
- **THEN** the right sidebar expands on the card, and the graph keeps the focus

#### Scenario: A row of the list
- **WHEN** both settings are on, the right sidebar is collapsed and the reader clicks Marie's row in the list
- **THEN** the right sidebar expands on the card showing Marie, and the list keeps the focus

#### Scenario: The left sidebar is left alone
- **WHEN** both settings are on, the left sidebar is collapsed and the reader clicks Marie's card in the graph
- **THEN** the left sidebar stays collapsed

#### Scenario: The setting is turned off
- **WHEN** the setting is off, the right sidebar is collapsed and the reader clicks Marie's card in the graph
- **THEN** the right sidebar stays collapsed

