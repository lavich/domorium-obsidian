## RENAMED Requirements
- FROM: `### Requirement: The genealogy interface is off until the reader turns it on`
- TO: `### Requirement: The genealogy interface is on until the reader turns it off`

## MODIFIED Requirements

### Requirement: The genealogy interface is on until the reader turns it off

The plugin SHALL have a setting, **Genealogy interface (beta)**, that SHALL be on by
default: for a reader with no saved settings, and for one whose saved settings do
not hold a value for it, including settings saved before the setting existed. A
value the saved settings hold, on or off, SHALL be kept as it is and SHALL NOT be
changed by an update. Its description SHALL say that the interface is still in
beta and may change, what the interface shows, and that GEDCOM files open in the
source editor while it is off. It SHALL be changed only
in the plugin settings. While it is
off, the plugin SHALL NOT offer Graph, Timeline or List mode, the record card,
the mode control in a tab header, or the commands
that show a mode or open a panel; every GEDCOM tab SHALL show the source.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A mode a tab was last in, the scope and zoom of its
Graph and Timeline, the kind and sort of its List, and the last
mode the reader chose, SHALL be kept while the
setting is off and honoured again when it is turned on. A mode chosen on purpose
SHALL be remembered only while the interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed, or updated with saved settings that do not
  hold the setting, and the setting is not changed
- **THEN** the interface is on: the card and the mode commands are offered, and
  the mode control is in the header of a GEDCOM tab

#### Scenario: A reader who turned the setting off
- **WHEN** the plugin updates and the saved settings hold the setting as off
- **THEN** the interface stays off: no card or mode command, and no mode control
  in a tab header is offered

#### Scenario: A reader who changed another setting before
- **WHEN** the plugin updates, and the saved settings hold the setting as off
  because the reader changed another setting on an earlier version, without
  touching this one
- **THEN** the interface stays off until the reader turns it on

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
- **THEN** the mode control appears in the tab header and the commands appear,
  and the tab stays in Source mode

#### Scenario: Turning it off with panels open
- **WHEN** a tab is in List mode, the card is open, and the reader turns the
  setting off
- **THEN** the card closes, the tab shows the source, and the mode control and
  the commands are gone

#### Scenario: Turning it on again
- **WHEN** a tab was in Graph mode on Irène's branch, zoomed in, the setting was
  turned off and then on
- **THEN** the tab is in Graph mode again, on Irène's branch at the same zoom

#### Scenario: A tab opened while it is off
- **WHEN** the interface is off, `curie.ged` is opened and the reader then
  turns the interface on
- **THEN** the tab is still in Source mode

### Requirement: A GEDCOM tab is in one of four modes

A tab showing a `.ged` or `.gedcom` file SHALL be in one of four modes. In **Graph**
mode it shows the whole file as the graph of the file, in **Timeline** mode as
the timeline of the file, and in **List** mode as a table of its people, families,
sources, media, shared notes, repositories or other records. In **Source** mode it shows the file in the editor the
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

Each tab SHALL remember its own mode, its selected record, the scope, position
and zoom of its Graph and its Timeline, and the kind and sort of its
List, across closing and reopening the workspace.
A tab with no mode of its own — a file opened in a new tab, or a tab navigated to
another file — while the interface is on SHALL open in the mode the reader last
chose in any GEDCOM tab, and in Graph mode while the reader has chosen none; List is
a mode the reader can choose, so a file can open as a list. There
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
- **WHEN** the Genealogy interface is on, as it is by default, the reader has not
  yet chosen a mode and opens `curie.ged`
- **THEN** the tab is in Graph mode and shows a card for each of the 17 people

#### Scenario: A reader who prefers the source
- **WHEN** the Genealogy interface is on, the reader chose Source in a tab and opens
  `curie.ged` in a new tab
- **THEN** the tab opens in Source mode

#### Scenario: A reader who prefers the timeline
- **WHEN** the Genealogy interface is on, the reader chose Timeline in a tab and
  opens `curie.ged`
- **THEN** the tab opens in Timeline mode and shows a row for each of the 17 people

#### Scenario: A reader who prefers the list
- **WHEN** the Genealogy interface is on, the reader chose List in a tab and opens
  `curie.ged` in a new tab
- **THEN** the tab opens in List mode and shows a row for each of the 17 people

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

#### Scenario: A tab in List mode opens as a list
- **WHEN** a tab of `curie.ged` was saved in List mode and the workspace is restored with
  the interface on
- **THEN** the tab is in List mode and shows a row for each of the 17 people

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** the tab is in Source mode, its header has no mode control, and no mode
  command is offered

#### Scenario: Switching with unsaved text
- **WHEN** the reader types in Source mode, switches to Graph before the file is
  saved, and switches back
- **THEN** the typed text is still there, and the graph in between reflected it

#### Scenario: A tab restored with the workspace
- **WHEN** the interface is on, a tab in Source mode, a tab in Timeline mode, a tab
  in List mode on the families sorted by children, and a tab in Graph mode on Irène's
  branch with Pierre Curie selected are open, and Obsidian is restarted
- **THEN** the first is in Source mode, the second in Timeline mode, the third shows
  the families in that order, and the fourth shows Irène's branch with Pierre Curie's
  card marked selected

#### Scenario: A tab saved in Genealogy mode
- **WHEN** the workspace was saved by an earlier version with a tab of `curie.ged`
  in Genealogy mode showing Pierre Curie, and the interface is on
- **THEN** the tab is in Graph mode with nothing selected

#### Scenario: Two tabs of one file
- **WHEN** `curie.ged` is open in two tabs, one in Graph mode and one in Source
  mode
- **THEN** switching the first to Timeline mode leaves the second in Source mode
