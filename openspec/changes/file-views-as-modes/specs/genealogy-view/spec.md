## RENAMED Requirements

- FROM: `### Requirement: A GEDCOM tab has a Genealogy mode and a Source mode`
- TO: `### Requirement: A GEDCOM tab is in one of four modes`

## MODIFIED Requirements

### Requirement: A GEDCOM tab is in one of four modes

A tab showing a `.ged` or `.gedcom` file SHALL be in one of four modes. In
**Genealogy** mode it shows one record of the file as a page. In **Graph** mode it
shows the whole file as the graph of the file, and in **Timeline** mode as the
timeline of the file. In **Source** mode it shows the file in the editor the
plugin has today, with everything that editor does. While the **Genealogy
interface** setting is off, every tab SHALL be in Source mode.

While the setting is on, the view header SHALL carry the mode control, and
commands SHALL switch the active GEDCOM tab to each mode. Switching SHALL NOT
change, save or mark as changed the file, SHALL NOT discard text typed but not
yet saved in Source mode, and SHALL NOT open another tab.

Switching from Genealogy mode to Source mode SHALL put the cursor at the start of
what the page shows — the selected fact, or else the whole record — and scroll it
into view, unless the cursor is already within those lines. Switching to Source
mode from Graph or Timeline mode SHALL leave the cursor where it was.

Each tab SHALL remember its own mode, its record, and the scope, position and zoom
of its Graph and its Timeline, across closing and reopening the workspace. A file
opened anew while the interface is on SHALL open in the mode the *Open GEDCOM
files as* setting names, which SHALL offer Genealogy, Graph, Timeline and Source
and SHALL default to Genealogy. A file opened anew while the interface is off
SHALL be remembered as in Source mode, so that turning the interface on does not
change the tab. Two tabs of one file SHALL each have a mode of their own.

#### Scenario: A file opened with the default setting
- **WHEN** the reader has turned the Genealogy interface on, leaves *Open GEDCOM
  files as* unchanged and opens `curie.ged`
- **THEN** the tab is in Genealogy mode and shows a page

#### Scenario: A reader who prefers the source
- **WHEN** the Genealogy interface is on, the setting names Source and the
  reader opens `curie.ged`
- **THEN** the tab opens in Source mode, as the plugin did before this change

#### Scenario: A reader who prefers the graph
- **WHEN** the Genealogy interface is on, the setting names Graph and the reader
  opens `curie.ged`
- **THEN** the tab opens in Graph mode and shows a card for each of the 17
  people

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** the tab is in Source mode, its header has no mode control, and no mode
  command is offered

#### Scenario: Switching with unsaved text
- **WHEN** the reader types in Source mode, switches to Genealogy before the
  file is saved, and switches back
- **THEN** the typed text is still there, and the page in between reflected it

#### Scenario: Switching to the source from Marie's birth
- **WHEN** Marie's birth is selected on her page and the reader switches to
  Source mode
- **THEN** the cursor is on her `1 BIRT` line, in view

#### Scenario: Switching to the source from the graph
- **WHEN** the cursor is in Pierre Curie's record in Source mode, and the reader
  switches to Graph mode and then to Source mode
- **THEN** the cursor is where it was

#### Scenario: A tab restored with the workspace
- **WHEN** the interface is on, a tab in Source mode, a tab in Genealogy mode
  showing Pierre Curie and a tab in Graph mode on Irène's branch are open, and
  Obsidian is restarted
- **THEN** the first is in Source mode, the second shows Pierre Curie and the
  third shows Irène's branch

#### Scenario: Two tabs of one file
- **WHEN** `curie.ged` is open in two tabs, one in Graph mode and one in Source
  mode
- **THEN** switching the first to Timeline mode leaves the second in Source mode

### Requirement: The mode control

While the **Genealogy interface** setting is on, the header of a GEDCOM tab SHALL
carry one action, the mode control, in place of any action for a single mode. It
SHALL show the icon of the tab's mode, and activating it SHALL open a menu of the
four modes — Genealogy, Graph, Timeline and Source, in that order — with the
tab's mode checked; choosing a mode SHALL switch the tab to it. It SHALL be
reachable in the header on a phone as Obsidian's own view actions are.

The plugin SHALL offer a command for each mode — **Show as genealogy**, **Show as
graph**, **Show as timeline** and **Show as source** — each available while the
interface is on and a GEDCOM tab is active in another mode, and no hotkey SHALL
be assigned to any of them by default. A command **Switch between source and the
last view** SHALL switch a tab in Source mode to the mode it was in before Source
mode — Genealogy where it has none in this session — and a tab in any other mode
to Source mode. The tab's menu SHALL offer the four mode commands that are
available, and the commands SHALL be offered in the command palette as well.

#### Scenario: Choosing Graph from the mode control
- **WHEN** `curie.ged` is open in Genealogy mode and the reader activates the mode
  control and chooses Graph
- **THEN** the menu listed Genealogy, Graph, Timeline and Source with Genealogy
  checked, and the tab shows the graph with the mode control showing the graph's
  icon

#### Scenario: A command
- **WHEN** a tab is in Source mode and the reader runs **Show as timeline** from
  the command palette
- **THEN** the tab is in Timeline mode

#### Scenario: The current mode is not offered
- **WHEN** a tab is in Graph mode and the reader opens the command palette
- **THEN** **Show as graph** is not offered and **Show as genealogy**, **Show as
  timeline** and **Show as source** are

#### Scenario: Back to the last view
- **WHEN** a tab is in Graph mode and the reader runs **Switch between source and
  the last view** twice
- **THEN** the tab is in Source mode after the first and in Graph mode after the
  second

#### Scenario: A tab that has had only Source
- **WHEN** a tab opened in Source mode and the reader runs **Switch between source
  and the last view**
- **THEN** the tab is in Genealogy mode

#### Scenario: The tab's menu
- **WHEN** a tab is in Timeline mode and the reader opens the tab's menu
- **THEN** it offers to show the tab as genealogy, as graph and as source, and
  not as timeline

#### Scenario: The mode control on a phone
- **WHEN** the reader taps the mode control in the header of a tab on a phone
- **THEN** a menu lists the four modes with the tab's mode checked

### Requirement: Graph and Timeline draw the tab's own reading of the file

The Graph and Timeline modes SHALL draw the file from the same reading of the
tab's text that the pages, the Index and the Evidence panel use, and SHALL NOT
read the file from the vault themselves. A mode not in view SHALL NOT be drawn: a
tab whose file changes while it is behind another, or while it is in another mode,
SHALL draw it when it is next in view. Switching between modes SHALL NOT lay the
graph or the timeline out again where the text and the scope are the same, and
SHALL leave each at the scope, position, zoom and scroll position it was left at. Graph and
Timeline SHALL each keep a scope of their own: choosing a branch in one SHALL NOT
change the other. A tab SHALL NOT draw either mode before it has read its file. A change of the
tab's size SHALL NOT disturb either mode: a tab that is not displayed, or whose
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

### Requirement: Which record Genealogy mode shows

When a tab enters Genealogy mode it SHALL show, in order of preference: the
record a followed link names, where that record is a person, a family or a
source; the record the tab most recently showed or had under the editor's cursor
on leaving Source mode, whichever was later, where that record is a person, a
family or a source; the first person the file declares.

A file that declares no person and no source SHALL show a page saying so, with
an action that switches the tab to Source mode.

#### Scenario: Switching from the source at a person's record
- **WHEN** the cursor is on a line inside Pierre Curie's record and the reader
  switches to Genealogy
- **THEN** Pierre Curie's page is shown

#### Scenario: Switching from the source at a note record
- **WHEN** the cursor is inside a shared note record and the tab last showed
  Marie Skłodowska-Curie
- **THEN** Marie Skłodowska-Curie's page is shown

#### Scenario: Through the graph
- **WHEN** the cursor is on a line inside Pierre Curie's record, and the reader
  switches to Graph mode and then to Genealogy mode
- **THEN** Pierre Curie's page is shown

#### Scenario: A file with no people
- **WHEN** a file declaring no `INDI` and no `SOUR` record is opened in Genealogy
  mode
- **THEN** the page says the file holds no people, and offers to open the source

### Requirement: Moving between records

Opening a record from a page, the index in Genealogy mode, the evidence panel, a
link, or a person or family of the graph or the timeline SHALL show it in the same tab, and SHALL
be a step the reader can go back from and forward to again with Obsidian's own
back and forward, on desktop and on a phone. Opening a record from Graph or
Timeline mode SHALL leave that mode for Genealogy mode, and going back from it
SHALL return the tab to that mode as it was. Switching mode with the mode control
or a command SHALL NOT be such a step.

#### Scenario: Back to the previous person
- **WHEN** the reader goes from Marie's page to Pierre's and presses back
- **THEN** Marie's page is shown, and forward shows Pierre's again

#### Scenario: Back to the graph
- **WHEN** the tab is in Graph mode, the reader activates Pierre Curie's card, and
  presses back
- **THEN** the tab is in Graph mode again, and forward shows Pierre Curie's page

#### Scenario: A mode switch is not a step
- **WHEN** the reader opens Marie's page, switches to Graph mode with the mode
  control, and presses back
- **THEN** the tab shows the page it showed before Marie's

### Requirement: Links into a record

Following a link that names a record of a GEDCOM file — a wikilink with a
`#@I1@` subpath, or an `obsidian://` link to the file and record — SHALL, in a
tab in Genealogy, Graph or Timeline mode, show that person's, family's or
source's page, leaving Graph or Timeline mode for Genealogy mode. A link naming a
record of another kind — a note, a multimedia record, a repository — SHALL switch
that tab to Source mode at the record, as following such a link does today. A
link naming a record the file does not declare SHALL leave the page as it was and
give the notice it gives today. The same SHALL hold for choosing a record in the
command **Go to record**: a record with an identifier that has a page shows the
page, in Genealogy mode, and any other record, the header for one, switches the
tab to Source mode at it, never moving a cursor in an editor that is not shown.

In Source mode a link SHALL behave as it does today.

#### Scenario: A link to a person
- **WHEN** the reader follows `[[curie.ged#@I1@]]` and the file opens in
  Genealogy mode
- **THEN** Marie Skłodowska-Curie's page is shown

#### Scenario: A link to a family
- **WHEN** the reader follows `[[curie.ged#@F3@]]` and the file opens in
  Genealogy mode
- **THEN** the family page of Pierre Curie and Marie Skłodowska-Curie is shown

#### Scenario: A link to a shared note
- **WHEN** the reader follows `[[curie.ged#@N1@]]` and the file opens in
  Genealogy mode
- **THEN** the tab switches to Source mode with the cursor at that note's record

#### Scenario: A link to a person in a tab in Graph mode
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab is in Genealogy mode showing Marie Skłodowska-Curie's page, and
  back returns it to Graph mode

#### Scenario: A link into a file that opens as a graph
- **WHEN** *Open GEDCOM files as* names Graph and the reader follows
  `[[curie.ged#@I1@]]` to a file not open
- **THEN** the tab is in Genealogy mode showing Marie Skłodowska-Curie's page

#### Scenario: Go to record in the graph
- **WHEN** the tab is in Graph mode and the reader runs **Go to record** and
  chooses the header record
- **THEN** the tab is in Source mode with the cursor on `0 HEAD`

### Requirement: Commands follow the mode

Commands that act on the editor — go to definition, find references, rename,
the problems commands, search and replace — SHALL be offered only when the
active GEDCOM tab is in Source mode, and the editor's find, which Obsidian
dispatches to the tab, SHALL do nothing in any other mode. Copying a link to a
record SHALL be offered in Source and Genealogy modes; in Genealogy mode it SHALL
copy the link to the record the page shows. In Graph and Timeline modes it SHALL
be offered while a person is selected, and copy the link to them.

#### Scenario: The palette in Genealogy mode
- **WHEN** the active tab is in Genealogy mode and the reader opens the palette
- **THEN** search in the file is not offered, and copying a link to the record
  is

#### Scenario: The palette in Graph mode
- **WHEN** the active tab is in Graph mode with nobody selected and the reader
  opens the palette
- **THEN** neither search in the file nor copying a link to a record is offered

#### Scenario: A person selected in the graph
- **WHEN** Pierre Curie is selected in Graph mode and the reader opens the palette
- **THEN** copying a link to the record is offered, and copies the link to
  `@I2@`

#### Scenario: Find in the graph
- **WHEN** the tab is in Graph mode and the reader presses the editor's find key
- **THEN** nothing opens and the tab stays in Graph mode

### Requirement: Nothing in Genealogy mode writes to the file

Nothing a reader does in Genealogy, Graph or Timeline mode, in the index or in the
evidence panel SHALL change the file, save it, or mark it as changed.

#### Scenario: Browsing a file
- **WHEN** the reader opens ten pages, selects facts and follows links
- **THEN** the file on disk is byte for byte what it was

#### Scenario: Browsing the graph and the timeline
- **WHEN** the reader moves and zooms the graph, chooses a branch, searches in the
  timeline, and opens three cards and two marks
- **THEN** the file on disk is byte for byte what it was

### Requirement: The pages fit a phone

The person and source pages SHALL be readable and usable at a phone's width
without horizontal scrolling of the page, with the mode control reachable from
the view header as Obsidian's own view actions are.

On a phone, selecting a fact SHALL unfold beneath it the titles of the sources
the fact cites, or that it cites none, with an action that opens the evidence
panel.

#### Scenario: A person page on a phone
- **WHEN** Marie's page is shown 390 pixels wide
- **THEN** every fact, name and relative is visible without scrolling sideways

#### Scenario: Tapping a fact on a phone
- **WHEN** the reader taps Marie's birth on a phone
- **THEN** beneath it the page says it cites no source of its own, and offers
  the evidence panel

### Requirement: The genealogy interface is off until the reader turns it on

The plugin SHALL have a setting, **Genealogy interface (beta)**, that SHALL be
off by default for every reader, including one whose settings were saved before
the setting existed, and whose description SHALL say that the interface is still
in beta and may change. It SHALL be changed only in the plugin settings. While it is
off, the plugin SHALL NOT offer Genealogy, Graph or Timeline mode, the Index, the
Evidence panel, the ribbon icon, the mode control in a tab header, or the commands
that show a mode or open a panel; every GEDCOM tab SHALL show the source.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A mode a tab was last in, the scope and zoom of its
Graph and Timeline, and the *Open GEDCOM files as* value, SHALL be kept while the
setting is off and honoured again when it is turned on; the *Open GEDCOM files as*
setting SHALL stay in the settings and say that it applies only while the
interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index, Evidence or mode command, and no mode control
  in a tab header is offered

#### Scenario: The setting says it is a beta
- **WHEN** the reader opens the plugin settings
- **THEN** the setting is named **Genealogy interface (beta)**, and its
  description says that the interface is still in beta and may change

#### Scenario: A reader who used Genealogy mode before
- **WHEN** the plugin updates and their saved settings name Genealogy in *Open
  GEDCOM files as*
- **THEN** `curie.ged` opens in Source mode until they turn the setting on

#### Scenario: Turning it on with a tab open
- **WHEN** `curie.ged` is open in Source mode and the reader turns the setting
  on
- **THEN** the mode control appears in the tab header, the ribbon icon appears,
  and the tab stays in Source mode

#### Scenario: Turning it off with panels open
- **WHEN** a tab is in Graph mode, the Index and Evidence panels are open, and the
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

## ADDED Requirements

### Requirement: An index row selects a person in Graph and Timeline

While a tab is in Graph or Timeline mode, activating a person's row in the index
SHALL select that person in the view, without opening their page and without
changing the mode. The tab SHALL keep at most one selected person; selecting
another replaces them. The selection SHALL end when the tab leaves the mode,
including for the other of the two views, and SHALL NOT be saved with the
workspace. While a person is selected, the index SHALL mark their row as the
current one, the Evidence panel SHALL show their whole record, and the command
that copies a link to a record SHALL copy a link to them. Activating the row of a
family, a source or a media record in these modes SHALL show its page, as it does
in Genealogy mode. Activating a card or a row in the view itself SHALL show the
person's page, as the requirements of the two views say.

#### Scenario: Selecting from the index
- **WHEN** the tab is in Timeline mode and the reader activates Marie's row in the
  index
- **THEN** the tab stays in Timeline mode with her row selected, the index marks
  her row, and the Evidence panel shows her whole record

#### Scenario: Leaving the mode ends the selection
- **WHEN** Marie is selected in Graph mode and the reader switches to Timeline mode
- **THEN** nobody is selected, and no row of the index is marked

#### Scenario: Not kept by the workspace
- **WHEN** Marie is selected in Graph mode and Obsidian is restarted
- **THEN** the tab is in Graph mode with nobody selected

### Requirement: A tab navigated to another file starts afresh

When a tab that was showing one GEDCOM file is navigated to another, the Graph and
Timeline of the first — the scope, position, zoom and scroll position, the drawn
boards and the selection — SHALL NOT be shown for the second. The second file's
views SHALL be opened as for a view never shown, or from the state saved for the
second file where the navigation brings it.

#### Scenario: From one file to another
- **WHEN** a tab in Graph mode on a branch of one file is navigated to another
  file
- **THEN** the graph of the other file is opened by the rule for a first opening,
  with that file's own people

### Requirement: A workspace saved with the file's overview in a tab of its own opens without it

Versions of the plugin before this change opened the timeline and the graph of a
file in tabs of their own. A workspace that still holds such a tab
SHALL, once loaded, have it closed, without a notice and without leaving a pane
that Obsidian calls unknown; the GEDCOM tabs of the same files SHALL be left as
they were.

#### Scenario: A workspace saved by 1.14
- **WHEN** the workspace was saved with a tab of `curie.ged`, a graph of the file
  and a timeline of the file, and the plugin is updated and Obsidian restarted
- **THEN** only the tab of `curie.ged` is open, and no pane says that it does not
  look like anything
