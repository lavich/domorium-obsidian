## ADDED Requirements

### Requirement: Selecting a record opens the side panels, unless the reader turned it off

The plugin SHALL have a setting, **Open the side panels when selecting**, that SHALL
be on by default for every reader, including one whose settings were saved before the
setting existed, and that applies while the **Genealogy interface** setting is on. The
setting row SHALL stay in the settings while the interface is off and its description
SHALL say that it applies while the interface is on. While both are on, on a desktop,
a selection by the reader in a GEDCOM tab through a click, a tap or a key on a card, a
node, a row or a name, a row of the index, a link into a record or *Go to record*
SHALL open the index in the left sidebar and the record card in the right one, as
`genealogy-index` and `genealogy-record-card` say, and SHALL NOT take the focus from
the view the reader selected in. A selection by the cursor resting in Source, by a
saved state being restored, or by Back, Forward or a link inside the card SHALL NOT
open a sidebar. With the setting off the plugin SHALL behave as it did before the
setting existed. On a phone the setting SHALL change nothing: the drawers open as the
card and the index specify, and the left drawer is not opened by a selection.

#### Scenario: A reader who updates
- **WHEN** the plugin updates and the saved settings do not mention the setting
- **THEN** the setting is on

#### Scenario: The setting row
- **WHEN** the reader opens the plugin settings
- **THEN** a toggle named **Open the side panels when selecting** follows *Open GEDCOM files as*, and its description says it applies while the genealogy interface is on

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off
- **THEN** no selection opens any panel and the setting row is still in the settings

#### Scenario: A click in the graph
- **WHEN** both settings are on, both sidebars are collapsed and the reader clicks Marie's card in the graph
- **THEN** both sidebars expand, the index and the card are open, and the graph keeps the focus

#### Scenario: The setting is turned off
- **WHEN** the setting is off, both sidebars are collapsed and the reader clicks Marie's card in the graph
- **THEN** both sidebars stay collapsed
