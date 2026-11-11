## MODIFIED Requirements

### Requirement: Links into a record

Following a link that names a record of a GEDCOM file — a wikilink with a
`#@I1@` subpath, or an `obsidian://` link to the file and record — SHALL, in a tab
in Graph, Timeline, List or Source mode, select that person, family, source,
multimedia record, shared note, repository, submitter, 5.5.1 submission record or record of
the file's own and show it in the card, as the requirement on the selected
record says, without changing the tab's mode; in Source mode it SHALL also put the cursor at
the record. A link naming a record that has no card SHALL switch that tab to Source mode at
the record, as following such a link does today. A link
naming a record the file does not declare SHALL leave the selection as it was and
give the notice it gives today. The same SHALL hold for choosing a record in the
command **Go to record**: a record that has a card is selected, in whatever mode
the tab is in — the header among them, whose card it opens — and any other record, the
trailer for one, switches the tab to Source mode at it, never moving a cursor in an editor
that is not shown.

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
- **THEN** the tab stays in Graph mode and the card shows the card of that note

#### Scenario: A URL to a repository
- **WHEN** the reader follows an `obsidian://` link to `curie.ged` and `@R2@` with the tab in
  List mode
- **THEN** the tab stays in List mode, the row of `State Archive in Warsaw` is marked among
  the repositories, and the card shows the repository

#### Scenario: Go to record on the trailer
- **WHEN** the tab is in Graph mode and the reader runs **Go to record** and chooses the
  trailer
- **THEN** the tab is in Source mode with the cursor on `0 TRLR`

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
- **THEN** the tab stays in Graph mode and the card shows the header's card

### Requirement: Commands follow the mode and the selection

Commands that act on the editor — go to definition, find references, rename, the
problems commands, and replace — SHALL be offered only when the active GEDCOM tab
is in Source mode. The command **Find**, and the key Obsidian dispatches to the tab
for it, SHALL be offered in every mode: in Source it opens the editor's search, in
Graph and Timeline the search of the view, and in List it opens the search of the list and focuses its field,
as the requirements of those views say. Copying a link to a record SHALL be offered
in Source mode, for the record under the cursor, and in Graph, Timeline and List
modes while a record with an identifier is selected, for the selected record, whatever its
kind; the header, which has no identifier, and a place offer no link.

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
- **THEN** the search of the list is open and its field has the focus, and the editor's search panel is
  not opened

#### Scenario: The find key in Source mode
- **WHEN** the tab is in Source mode and the reader presses the find key
- **THEN** the editor's search panel opens

#### Scenario: Replace outside the source
- **WHEN** the tab is in Timeline or List mode and the reader opens the palette
- **THEN** replace and the editor commands are not offered

#### Scenario: A note selected in the list
- **WHEN** the note `@N1@` is selected in List mode and the reader copies a link to the record
- **THEN** the link copied is to `@N1@`

#### Scenario: The header selected
- **WHEN** the header is selected in List mode and the reader opens the palette
- **THEN** copying a link to the record is not offered

### Requirement: A GEDCOM tab is in one of four modes

A tab showing a `.ged` or `.gedcom` file SHALL be in one of four modes. In **Graph**
mode it shows the whole file as the graph of the file, in **Timeline** mode as
the timeline of the file, and in **List** mode as a table of its people, families,
sources, places, media, shared notes, repositories or other records. In **Source** mode it shows the file in the editor the
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
