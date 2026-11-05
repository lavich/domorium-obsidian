## MODIFIED Requirements

### Requirement: Links into a record

Following a link that names a record of a GEDCOM file — a wikilink with a
`#@I1@` subpath, or an `obsidian://` link to the file and record — SHALL, in a tab
in Graph, Timeline or Source mode, select that person, family, source or
multimedia record and show it in the card, as the requirement on the selected
record says; in Source mode it SHALL also put the cursor at the record. A link
naming a record of another kind — a note, a repository, a submitter — SHALL switch
that tab to Source mode at the record, as following such a link does today. A link
naming a record the file does not declare SHALL leave the selection as it was and
give the notice it gives today. The same SHALL hold for choosing a record in the
command **Go to record**: a record that has a card is selected, in whatever mode
the tab is in, and any other record, the header for one, switches the tab to
Source mode at it, never moving a cursor in an editor that is not shown.

#### Scenario: A link to a person
- **WHEN** the reader follows `[[curie.ged#@I1@]]` and the file opens in Graph mode
- **THEN** the tab is in Graph mode with Marie Skłodowska-Curie's card marked
  selected, and the card shows her

#### Scenario: A link to a family
- **WHEN** the reader follows `[[curie.ged#@F3@]]` and the file opens in Graph mode
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie

#### Scenario: A link to a media record
- **WHEN** the reader follows `[[curie.ged#@O5@]]`
- **THEN** the card shows the media card of the family photograph

#### Scenario: A link to a shared note
- **WHEN** the reader follows `[[curie.ged#@N1@]]` and the file opens in Graph mode
- **THEN** the tab switches to Source mode with the cursor at that note's record

#### Scenario: A link to a person in a tab in Graph mode
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab stays in Graph mode, Marie Skłodowska-Curie's card is marked
  selected and the graph glides to it, and the card shows her

#### Scenario: A link to a person in a tab in Timeline mode
- **WHEN** the tab of `curie.ged` is in Timeline mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab stays in Timeline mode, Marie Skłodowska-Curie's row is marked
  selected and scrolled to, and the card shows her

#### Scenario: A link into a file that opens as a graph
- **WHEN** Graph is the mode the reader last chose and the reader follows
  `[[curie.ged#@I1@]]` to a file not open
- **THEN** the tab is in Graph mode with Marie Skłodowska-Curie selected

#### Scenario: A link in Source mode
- **WHEN** the tab is in Source mode and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the cursor is on `0 @I1@ INDI`, in view, and the card shows Marie
  Skłodowska-Curie

#### Scenario: Go to record in the graph
- **WHEN** the tab is in Graph mode and the reader runs **Go to record** and
  chooses the header record
- **THEN** the tab is in Source mode with the cursor on `0 HEAD`

### Requirement: The genealogy interface is off until the reader turns it on

The plugin SHALL have a setting, **Genealogy interface (beta)**, that SHALL be
off by default for every reader, including one whose settings were saved before
the setting existed, and whose description SHALL say that the interface is still
in beta and may change. It SHALL be changed only in the plugin settings. While it is
off, the plugin SHALL NOT offer Graph or Timeline mode, the Index, the record card,
the ribbon icon, the mode control in a tab header, or the commands
that show a mode or open a panel; every GEDCOM tab SHALL show the source.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A mode a tab was last in, the scope and zoom of its
Graph and Timeline, and the last mode the reader chose, SHALL be kept while the
setting is off and honoured again when it is turned on. A mode chosen on purpose
SHALL be remembered only while the interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index, card or mode command, and no mode
  control in a tab header is offered

#### Scenario: The setting says it is a beta
- **WHEN** the reader opens the plugin settings
- **THEN** the setting is named **Genealogy interface (beta)**, and its
  description says that the interface is still in beta and may change

#### Scenario: A reader who used Genealogy mode before
- **WHEN** the plugin updates, their saved settings hold a value of the retired
  *Open GEDCOM files as* setting, and the interface is off
- **THEN** `curie.ged` opens in Source mode until they turn the setting on, and a
  file opened anew after that opens in Graph mode

#### Scenario: Turning it on with a tab open
- **WHEN** `curie.ged` is open in Source mode and the reader turns the setting
  on
- **THEN** the mode control appears in the tab header, the ribbon icon appears,
  and the tab stays in Source mode

#### Scenario: Turning it off with panels open
- **WHEN** a tab is in Graph mode, the Index and the card are open, and the
  reader turns the setting off
- **THEN** the panels close, the tab shows the source, and the mode control and
  the ribbon icon are gone

#### Scenario: Turning it on again
- **WHEN** a tab was in Graph mode on Irène's branch, zoomed in, the setting was
  turned off and then on
- **THEN** the tab is in Graph mode again, on Irène's branch at the same zoom

#### Scenario: A tab opened while it is off
- **WHEN** the interface is off, `curie.ged` is opened and the reader then
  turns the interface on
- **THEN** the tab is still in Source mode

### Requirement: A GEDCOM tab is in one of three modes

A tab showing a `.ged` or `.gedcom` file SHALL be in one of three modes. In **Graph**
mode it shows the whole file as the graph of the file, and in **Timeline** mode as
the timeline of the file. In **Source** mode it shows the file in the editor the
plugin has today, with everything that editor does. A record of the file is read in
the record card of the right sidebar, whatever the mode, and there SHALL be no mode
that shows a record as a page in the tab. While the **Genealogy interface** setting
is off, every tab SHALL be in Source mode.

While the setting is on, the view header SHALL carry the mode control, and commands
SHALL switch the active GEDCOM tab to each mode. Switching SHALL NOT change, save or
mark as changed the file, SHALL NOT discard text typed but not yet saved in Source
mode, SHALL NOT open another tab and SHALL NOT end the selection. Where the
selection puts the cursor, on switching to Source mode, is said by the requirement
on Source mode and the selection.

Each tab SHALL remember its own mode, its selected record, and the scope, position
and zoom of its Graph and its Timeline, across closing and reopening the workspace.
A tab with no mode of its own — a file opened in a new tab, or a tab navigated to
another file — while the interface is on SHALL open in the mode the reader last
chose in any GEDCOM tab, and in Graph mode while the reader has chosen none. There
SHALL be no setting that names the mode instead. The reader chooses a mode only
with a button of the mode control, a **Show as** command or the command that
switches between source and the last view; a mode a tab takes in any other way —
opening a file, the interface being turned off, a workspace being restored, Back or
Forward, a link that takes a tab to Source mode at a record that has no card —
SHALL NOT change the mode the next file opens in. The last mode SHALL be kept across
closing and reopening Obsidian. A value saved by an earlier version for the retired
*Open GEDCOM files as* setting SHALL be ignored and not written again. A file
opened anew while the interface is off SHALL be remembered as in Source mode, so
that turning the interface on does not change the tab. Two tabs of one file SHALL
each have a mode of their own. A tab saved by an earlier version as **Genealogy**
SHALL be read as Graph.

#### Scenario: A file opened with the default setting
- **WHEN** the reader has turned the Genealogy interface on, has not yet chosen a
  mode and opens `curie.ged`
- **THEN** the tab is in Graph mode and shows a card for each of the 17 people

#### Scenario: A reader who prefers the source
- **WHEN** the Genealogy interface is on, the reader chose Source in a tab and opens
  `curie.ged` in a new tab
- **THEN** the tab opens in Source mode

#### Scenario: A reader who prefers the timeline
- **WHEN** the Genealogy interface is on, the reader chose Timeline in a tab and
  opens `curie.ged`
- **THEN** the tab opens in Timeline mode and shows a row for each of the 17 people

#### Scenario: A tab navigated to another file
- **WHEN** the reader chose Timeline in a tab and navigates that tab to another
  GEDCOM file
- **THEN** the other file opens in Timeline mode

#### Scenario: A mode chosen with a command
- **WHEN** the reader runs **Show as source** in one tab and then opens another file
- **THEN** the other file opens in Source mode

#### Scenario: A change the reader did not make
- **WHEN** the reader chose Timeline, a link takes a tab to Source mode at a note
  record, and the reader then opens another file
- **THEN** the other file opens in Timeline mode

#### Scenario: A restored workspace
- **WHEN** the reader chose Source last and Obsidian restarts with a tab in Graph
  mode
- **THEN** the tab is in Graph mode, and a file opened anew opens in Source mode

#### Scenario: A reader who set Open GEDCOM files as before
- **WHEN** the saved data holds a value of the retired setting
- **THEN** it has no effect on the mode a file opens in and is gone from the saved
  data after the next save

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** the tab is in Source mode, its header has no mode control, and no mode
  command is offered

#### Scenario: Switching with unsaved text
- **WHEN** the reader types in Source mode, switches to Graph before the file is
  saved, and switches back
- **THEN** the typed text is still there, and the graph in between reflected it

#### Scenario: A tab restored with the workspace
- **WHEN** the interface is on, a tab in Source mode, a tab in Timeline mode and a
  tab in Graph mode on Irène's branch with Pierre Curie selected are open, and
  Obsidian is restarted
- **THEN** the first is in Source mode, the second in Timeline mode, and the third
  shows Irène's branch with Pierre Curie's card marked selected

#### Scenario: A tab saved in Genealogy mode
- **WHEN** the workspace was saved by an earlier version with a tab of `curie.ged`
  in Genealogy mode showing Pierre Curie, and the interface is on
- **THEN** the tab is in Graph mode with nothing selected

#### Scenario: Two tabs of one file
- **WHEN** `curie.ged` is open in two tabs, one in Graph mode and one in Source
  mode
- **THEN** switching the first to Timeline mode leaves the second in Source mode

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
- **THEN** a toggle named **Open the side panels when selecting** follows **Genealogy interface (beta)**, and its description says it applies while the genealogy interface is on

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off
- **THEN** no selection opens any panel and the setting row is still in the settings

#### Scenario: A click in the graph
- **WHEN** both settings are on, both sidebars are collapsed and the reader clicks Marie's card in the graph
- **THEN** both sidebars expand, the index and the card are open, and the graph keeps the focus

#### Scenario: The setting is turned off
- **WHEN** the setting is off, both sidebars are collapsed and the reader clicks Marie's card in the graph
- **THEN** both sidebars stay collapsed
