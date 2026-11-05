## ADDED Requirements

### Requirement: A GEDCOM tab is in one of four modes

A tab showing a `.ged` or `.gedcom` file SHALL be in one of four modes. In **Graph**
mode it shows the whole file as the graph of the file, in **Timeline** mode as
the timeline of the file, and in **List** mode as a table of its people, families or
sources. In **Source** mode it shows the file in the editor the
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

### Requirement: The graph, the timeline and the list draw the tab's own reading of the file

The Graph, Timeline and List modes SHALL draw the file from the same reading of the
tab's text that the record card uses, and SHALL NOT
read the file from the vault themselves. A mode not in view SHALL NOT be drawn: a
tab whose file changes while it is behind another, or while it is in another mode,
SHALL draw it when it is next in view. Switching between modes SHALL NOT lay the
graph or the timeline out again where the text and the scope are the same, and
SHALL leave each at the scope, position, zoom and scroll position it was left at,
and the list at its kind, sort, filter and scroll position. Graph and
Timeline SHALL each keep a scope of their own: choosing a branch in one SHALL NOT
change the other. A tab SHALL NOT draw any of them before it has read its file. A change of the
tab's size SHALL NOT disturb any of them: a tab that is not displayed, or whose
size is momentarily nothing, SHALL keep the position and zoom it had. Where the
text changes by any route — typed, changed on disk, or rewritten by the plugin
as a renamed file is followed — the mode shown SHALL show it. A tab that is
navigated to another file SHALL NOT carry the scope, position, zoom, selection or
drawn views of the first into the second.

#### Scenario: A restored tab
- **WHEN** a tab of `curie.ged` in Graph mode, zoomed in and moved, is restored
  with the workspace
- **THEN** the graph is shown at that zoom and position, not at the position of
  an empty graph

#### Scenario: Each view keeps its own branch
- **WHEN** the reader chooses Irène's branch in Graph mode and switches to
  Timeline mode
- **THEN** the timeline shows all 17 people

#### Scenario: A tab resized while it is hidden
- **WHEN** a tab in Graph mode, zoomed in and moved, is behind another tab, the
  window is resized, and the reader brings the tab to the front
- **THEN** the graph is at the same position and zoom as before

#### Scenario: Rewritten by the plugin
- **WHEN** the tab is in Graph mode and the plugin rewrites a `FILE` path in the
  text because the media file was renamed
- **THEN** the graph is drawn from the new text, and a card whose portrait it
  names shows the portrait at the new path

#### Scenario: Navigated to another file
- **WHEN** a tab of `curie.ged` is in Graph mode on Irène's branch, zoomed in, and
  the same tab is navigated to another GEDCOM file
- **THEN** the tab shows the other file's graph, opened by the rule for a view
  never shown, and not Irène's branch or zoom

#### Scenario: A tab that is not in view
- **WHEN** a tab of `curie.ged` in Timeline mode is behind another tab, and
  Marie's year of death is changed on disk
- **THEN** the timeline is not drawn again until the reader brings the tab to the
  front, and then her lifeline ends at the new year

### Requirement: Nothing a reader does in a tab or the card writes to the file

Nothing a reader does in a GEDCOM tab outside Source mode, or in the record card,
SHALL change the file, save it, or mark it as changed.

#### Scenario: Browsing a file
- **WHEN** the reader selects ten records, selects facts and follows links
- **THEN** the file on disk is byte for byte what it was

#### Scenario: Browsing the list
- **WHEN** the reader sorts and filters the people, chooses Families and Sources, and
  selects ten rows
- **THEN** the file on disk is byte for byte what it was

#### Scenario: Browsing the graph and the timeline
- **WHEN** the reader moves and zooms the graph, chooses a branch, searches in the
  timeline, and selects three cards and opens two marks
- **THEN** the file on disk is byte for byte what it was

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
being restored, or by Back, Forward or a link inside the card SHALL NOT open a sidebar.
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

### Requirement: A workspace saved with the Index in the left sidebar opens without it

Versions of the plugin before this change had an Index view, **Domorium**, in the left
sidebar. A workspace that still holds one SHALL, once loaded, have it closed, without a
notice and without leaving a pane that Obsidian calls unknown, whether the interface is
on or off. The other views of the left sidebar, and whether it is collapsed, SHALL be
left as they were, and every GEDCOM tab SHALL keep its mode.

#### Scenario: A workspace saved by 1.15
- **WHEN** the workspace was saved with the Index open in the left sidebar beside the
  file explorer, and the plugin is updated and Obsidian restarted
- **THEN** the left sidebar holds the file explorer and no Index, and no pane says that
  it does not look like anything

#### Scenario: The interface is off
- **WHEN** the workspace was saved with the Index open and the interface is off
- **THEN** the Index is closed as well

#### Scenario: The tabs are as they were
- **WHEN** the same workspace holds a tab of `curie.ged` in Graph mode
- **THEN** the tab is still in Graph mode

## MODIFIED Requirements

### Requirement: Links into a record

Following a link that names a record of a GEDCOM file — a wikilink with a
`#@I1@` subpath, or an `obsidian://` link to the file and record — SHALL, in a tab
in Graph, Timeline, List or Source mode, select that person, family, source or
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

#### Scenario: A link to a person in a tab in List mode
- **WHEN** the tab of `curie.ged` is in List mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab stays in List mode, Marie Skłodowska-Curie's row is marked selected and
  in view, and the card shows her

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
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no card or mode command, and no mode
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

### Requirement: The mode control

While the **Genealogy interface** setting is on, the header of a GEDCOM tab SHALL
carry the mode control: one icon button for each mode — Graph, Timeline, List and
Source, in that order from left to right on the screen, so that the Source button is
the rightmost of them, whatever order Obsidian places header actions in — each a header action of the tab, labelled with the name of its
mode. The button of the tab's mode SHALL be marked as the active one, in the accent
colour and as pressed to assistive technology, and the mark SHALL follow every
change of the tab's mode, however it came about. Pressing a button SHALL switch the
tab to that mode, and pressing the active one SHALL do nothing. While the setting is
off none of the buttons SHALL be shown. The buttons SHALL be reachable in the header
on a phone as Obsidian's own view actions are.

The plugin SHALL offer a command for each mode — **Show as graph**, **Show as
timeline**, **Show as list** and **Show as source** — each available while the interface is on and a
GEDCOM tab is active in another mode, and no hotkey SHALL be assigned to any of them
by default. A command **Switch between source and the last view** SHALL switch a
tab in Source mode to the mode it was in before Source mode — Graph where it has
none in this session — and a tab in any other mode to Source mode. The tab's menu
SHALL offer the mode commands that are available, and the commands SHALL be offered
in the command palette as well. No command SHALL show a record as a page in the tab.

#### Scenario: A button for each mode
- **WHEN** `curie.ged` is open in Graph mode with the interface on
- **THEN** the header shows buttons for Graph, Timeline, List and Source from left to
  right, and the Graph button is marked as active and no other

#### Scenario: Source is the rightmost
- **WHEN** `curie.ged` is open with the interface on
- **THEN** the Source button is to the right of the List button, which is to the right
  of the Timeline button, which is to the right of the Graph button, on a desktop and
  on a phone, and the order does not change when the mode does

#### Scenario: Pressing a button
- **WHEN** the tab is in Graph mode and the reader presses the Timeline button
- **THEN** the tab shows the timeline, and the Timeline button is the one marked
  active

#### Scenario: Pressing the active button
- **WHEN** the tab is in Graph mode and the reader presses the Graph button
- **THEN** nothing changes

#### Scenario: The mark follows the mode
- **WHEN** the reader switches the tab by a command, or restarts Obsidian
- **THEN** the button of the mode the tab is then in is the one marked active

#### Scenario: The interface is off
- **WHEN** the interface setting is off
- **THEN** none of the four buttons is in the tab's header

#### Scenario: A command
- **WHEN** a tab is in Source mode and the reader runs **Show as timeline** from
  the command palette
- **THEN** the tab is in Timeline mode

#### Scenario: The current mode is not offered
- **WHEN** a tab is in Graph mode and the reader opens the command palette
- **THEN** **Show as graph** is not offered and **Show as timeline**, **Show as
  list** and **Show as source** are, and no command shows a page

#### Scenario: A command for the list
- **WHEN** a tab is in Graph mode and the reader runs **Show as list** from the
  command palette
- **THEN** the tab is in List mode and the List button is the one marked active

#### Scenario: Back to the last view
- **WHEN** a tab is in Timeline mode and the reader runs **Switch between source
  and the last view** twice
- **THEN** the tab is in Source mode after the first and in Timeline mode after the
  second

#### Scenario: A tab that has had only Source
- **WHEN** a tab opened in Source mode and the reader runs **Switch between source
  and the last view**
- **THEN** the tab is in Graph mode

#### Scenario: The tab's menu
- **WHEN** a tab is in Timeline mode and the reader opens the tab's menu
- **THEN** it offers to show the tab as graph, as list and as source, and not as
  timeline

#### Scenario: The mode control on a phone
- **WHEN** the reader opens a tab on a phone
- **THEN** the four buttons are in the tab's header, and tapping one switches the
  tab to its mode

### Requirement: Commands follow the mode and the selection

Commands that act on the editor — go to definition, find references, rename, the
problems commands, and replace — SHALL be offered only when the active GEDCOM tab
is in Source mode. The command **Find**, and the key Obsidian dispatches to the tab
for it, SHALL be offered in every mode: in Source it opens the editor's search, in
Graph and Timeline the search of the view, and in List it focuses the filter field,
as the requirements of those views say. Copying a link to a record SHALL be offered
in Source mode, for the record under the cursor, and in Graph, Timeline and List
modes while a record is selected, for the selected record, whether it is a person, a family, a source or a multimedia
record.

#### Scenario: The palette in Graph mode
- **WHEN** the active tab is in Graph mode with nobody selected and the reader
  opens the palette
- **THEN** find is offered, and replace and copying a link to a record are not

#### Scenario: A person selected in the graph
- **WHEN** Pierre Curie is selected in Graph mode and the reader opens the palette
- **THEN** copying a link to the record is offered, and copies the link to `@I2@`

#### Scenario: A family selected in the timeline
- **WHEN** the Curies' family is selected in Timeline mode and the reader copies a
  link to the record
- **THEN** the link copied is to `@F3@`

#### Scenario: A person selected in the list
- **WHEN** Pierre Curie is selected in List mode and the reader opens the palette
- **THEN** copying a link to the record is offered, and copies the link to `@I2@`

#### Scenario: The find key in List mode
- **WHEN** the tab is in List mode and the reader presses the find key
- **THEN** the filter field of the list has the focus, and the editor's search panel is
  not opened

#### Scenario: The find key in Source mode
- **WHEN** the tab is in Source mode and the reader presses the find key
- **THEN** the editor's search panel opens

#### Scenario: Replace outside the source
- **WHEN** the tab is in Timeline or List mode and the reader opens the palette
- **THEN** replace and the editor commands are not offered

### Requirement: A tab navigated to another file starts afresh

When a tab that was showing one GEDCOM file is navigated to another, the Graph,
Timeline and List of the first — the scope, position, zoom and scroll position, the
kind, sort, filter and scroll position, the drawn boards and the selection — SHALL NOT be shown for
the second. The second file's
views SHALL be opened as for a view never shown, or from the state saved for the
second file where the navigation brings it.

#### Scenario: From one file to another
- **WHEN** a tab in Graph mode on a branch of one file is navigated to another
  file
- **THEN** the graph of the other file is opened by the rule for a first opening,
  with that file's own people

#### Scenario: A list navigated to another file
- **WHEN** a tab in List mode on the families of one file, filtered and sorted, is
  navigated to another file
- **THEN** the list shows the people of the other file, unfiltered and in the order of
  that file

## REMOVED Requirements

### Requirement: A GEDCOM tab is in one of three modes

**Reason**: The tab has a fourth mode, List, so the name of the requirement and its text change; the requirement is restated under its new name.

**Migration**: "A GEDCOM tab is in one of four modes".

### Requirement: Graph and Timeline draw the tab's own reading of the file

**Reason**: The List draws from the same reading, so the requirement names all three and the Index is no longer one of its readers.

**Migration**: "The graph, the timeline and the list draw the tab's own reading of the file".

### Requirement: Nothing a reader does in a tab, the card or the index writes to the file

**Reason**: There is no index to name; the list is a mode of the tab.

**Migration**: "Nothing a reader does in a tab or the card writes to the file".

### Requirement: Selecting a record opens the side panels, unless the reader turned it off

**Reason**: With the Index gone the setting opens only the record card, and is renamed for what it does.

**Migration**: "Selecting a record opens the record card, unless the reader turned it off". The saved key is unchanged.
