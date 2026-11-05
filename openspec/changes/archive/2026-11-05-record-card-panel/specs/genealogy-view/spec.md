## RENAMED Requirements
- FROM: `### Requirement: Nothing in Genealogy mode writes to the file`
- TO: `### Requirement: Nothing a reader does in a tab, the card or the index writes to the file`

## REMOVED Requirements
### Requirement: Which record Genealogy mode shows

**Reason**: Genealogy mode is removed. A tab no longer has a page to choose a record for; it holds the record the reader selected.

**Migration**: `genealogy-record-card`, "A tab has one selected record" says what is selected and when, and "The card lives in the right sidebar and follows the GEDCOM tab" says what the card shows with nothing selected and for a file with no people. The scenario through the graph is in "In Source mode the cursor and the selection go together".

### Requirement: The person page

**Reason**: The person's page in the centre of a tab is replaced by a card in the right sidebar, with the Tree tab gone and the Timeline and Places tabs turned into sections.

**Migration**: `genealogy-record-card`, "The person card"; the facts, other names and family keep their text and scenarios there.

### Requirement: The family page

**Reason**: The family's page in the centre of a tab is replaced by a card in the right sidebar.

**Migration**: `genealogy-record-card`, "The family card".

### Requirement: The source page

**Reason**: The source's page in the centre of a tab is replaced by a card in the right sidebar.

**Migration**: `genealogy-record-card`, "The source card".

### Requirement: Moving between records

**Reason**: A record is no longer a page the tab navigates to, so it is not a step of the tab's history and the tab does not leave Graph or Timeline mode for it.

**Migration**: `genealogy-record-card`, "Moving between records in the card" gives the card its own Back and Forward; "A tab has one selected record" says the tab keeps its mode.

### Requirement: Show in source

**Reason**: The requirement is about what a page offers; the page is now the card.

**Migration**: `genealogy-record-card`, "Show in source", with the same scenarios.

### Requirement: A page follows the file

**Reason**: The page is now the card.

**Migration**: `genealogy-record-card`, "A card follows the file". A record removed from the file ends the selection instead of showing a page that says so.

### Requirement: The pages fit a phone

**Reason**: The page is now the card, which is a narrow column in a sidebar on a desktop and in the right drawer on a phone, and its layout is the one the phone page had.

**Migration**: `genealogy-record-card`, "The card fits a narrow panel and a phone". The mode buttons in the header are covered by "The mode control" here.

### Requirement: Portrait and media on a page

**Reason**: The page is now the card.

**Migration**: `genealogy-record-card`, "Portrait and media on a card".

### Requirement: The media page

**Reason**: The page is now the card.

**Migration**: `genealogy-record-card`, "The media card".

### Requirement: The views of a person page

**Reason**: The person card has no tabs: Card is the card itself, Tree is removed, and Timeline and Places are sections one under another.

**Migration**: `genealogy-record-card`, "The person card" lists the sections in order; "The timeline of a person" and "The places of a person" describe the two sections. The sticky heading and tabs of a desktop page are replaced by the card's own header, as "The card fits a narrow panel and a phone" says.

### Requirement: The timeline

**Reason**: The person page's Timeline tab becomes a section of the card (and is not the Timeline mode of the tab, which `genealogy-file-timeline` describes).

**Migration**: `genealogy-record-card`, "The timeline of a person".

### Requirement: The places

**Reason**: The person page's Places tab becomes a section of the card.

**Migration**: `genealogy-record-card`, "The places of a person".

### Requirement: The tree

**Reason**: The user: the card no longer needs a graph of the family. The family is listed in the person card, and the graph of the file shows a person's neighbours with its Branch scope.

**Migration**: "The person card" lists parents, siblings, spouses and children in `genealogy-record-card`; the Branch of a card in `genealogy-file-graph` shows a person's ancestors and descendants. The drawing of the tree, its search and its scenarios are deleted.

### Requirement: An index row selects a person in Graph and Timeline

**Reason**: Selecting is no longer special to Graph and Timeline or to a person, and a click in a view does it too.

**Migration**: `genealogy-record-card`, "A tab has one selected record", which keeps the scenarios (leaving the mode no longer ends the selection) and adds the click; "Opening a record from the index" in `genealogy-index`; "A selected card" and "A selected row" in the two views.


### Requirement: A GEDCOM tab is in one of four modes

**Reason**: Genealogy mode is removed, so the tab has three modes, not four; the requirement is restated whole because three of its scenarios (the preference for the graph and the two switches to the source) belong to the new wording or have moved.

**Migration**: "A GEDCOM tab is in one of three modes" below. The two switches to Source mode are in `genealogy-record-card`, "In Source mode the cursor and the selection go together".


### Requirement: Commands follow the mode

**Reason**: Genealogy mode is removed, and two of its scenarios (the palette and the find key in Genealogy mode) have nothing to say; Find is now offered in every mode and copying a link follows the selection.

**Migration**: "Commands follow the mode and the selection" below.

## MODIFIED Requirements
### Requirement: Nothing a reader does in a tab, the card or the index writes to the file

Nothing a reader does in a GEDCOM tab outside Source mode, in the record card or
in the index SHALL change the file, save it, or mark it as changed.

#### Scenario: Browsing a file
- **WHEN** the reader selects ten records, selects facts and follows links
- **THEN** the file on disk is byte for byte what it was

#### Scenario: Browsing the graph and the timeline
- **WHEN** the reader moves and zooms the graph, chooses a branch, searches in the
  timeline, and selects three cards and opens two marks
- **THEN** the file on disk is byte for byte what it was

### Requirement: A year before the common era is shown as one

Wherever the plugin shows a year read from a date — a person's heading on the
card, a row of a list, an entry of the timeline section, a card or a row of the
graph and the timeline — a year before the common era SHALL be shown as the year the
file writes, marked in the reader's language as before the common era. It SHALL
NOT be shown as a negative number, nor bare as though it were of the common era.
A year of the common era SHALL be shown bare, as before.

#### Scenario: A heading in English
- **WHEN** the reader's language is English and a person's birth reads
  `1401 BCE` in a 7.0 document
- **THEN** the heading shows the year of birth as `1401 BCE`

#### Scenario: A heading in Russian
- **WHEN** the reader's language is Russian and a person's birth reads
  `ABT 1401 BCE` in a 7.0 document
- **THEN** the heading shows the year of birth as approximate and before the
  common era, `≈1401 до н. э.`

#### Scenario: A timeline across the start of the era
- **WHEN** a person's own events are dated `10 BCE`, `5 BCE` and `20` in a 7.0
  document
- **THEN** the timeline section of their card lists them in that order, showing `10 BCE`, `5 BCE` and
  `20`

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
Graph and Timeline, and the *Open GEDCOM files as* value, SHALL be kept while the
setting is off and honoured again when it is turned on; the *Open GEDCOM files as*
setting SHALL stay in the settings and say that it applies only while the
interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index, card or mode command, and no mode
  control in a tab header is offered

#### Scenario: The setting says it is a beta
- **WHEN** the reader opens the plugin settings
- **THEN** the setting is named **Genealogy interface (beta)**, and its
  description says that the interface is still in beta and may change

#### Scenario: A reader who used Genealogy mode before
- **WHEN** the plugin updates, their saved settings name Genealogy in *Open GEDCOM
  files as*, and the interface is off
- **THEN** `curie.ged` opens in Source mode until they turn the setting on, and in
  Graph mode after

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

### Requirement: The mode control

While the **Genealogy interface** setting is on, the header of a GEDCOM tab SHALL
carry the mode control: one icon button for each mode — Graph, Timeline and Source,
in that order — each a header action of the tab, labelled with the name of its
mode. The button of the tab's mode SHALL be marked as the active one, in the accent
colour and as pressed to assistive technology, and the mark SHALL follow every
change of the tab's mode, however it came about. Pressing a button SHALL switch the
tab to that mode, and pressing the active one SHALL do nothing. While the setting is
off none of the buttons SHALL be shown. The buttons SHALL be reachable in the header
on a phone as Obsidian's own view actions are.

The plugin SHALL offer a command for each mode — **Show as graph**, **Show as
timeline** and **Show as source** — each available while the interface is on and a
GEDCOM tab is active in another mode, and no hotkey SHALL be assigned to any of them
by default. A command **Switch between source and the last view** SHALL switch a
tab in Source mode to the mode it was in before Source mode — Graph where it has
none in this session — and a tab in any other mode to Source mode. The tab's menu
SHALL offer the mode commands that are available, and the commands SHALL be offered
in the command palette as well. No command SHALL show a record as a page in the tab.

#### Scenario: A button for each mode
- **WHEN** `curie.ged` is open in Graph mode with the interface on
- **THEN** the header shows buttons for Graph, Timeline and Source in that order,
  and the Graph button is marked as active and no other

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
- **THEN** none of the three buttons is in the tab's header

#### Scenario: A command
- **WHEN** a tab is in Source mode and the reader runs **Show as timeline** from
  the command palette
- **THEN** the tab is in Timeline mode

#### Scenario: The current mode is not offered
- **WHEN** a tab is in Graph mode and the reader opens the command palette
- **THEN** **Show as graph** is not offered and **Show as timeline** and **Show as
  source** are, and no command shows a page

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
- **THEN** it offers to show the tab as graph and as source, and not as timeline

#### Scenario: The mode control on a phone
- **WHEN** the reader opens a tab on a phone
- **THEN** the three buttons are in the tab's header, and tapping one switches the
  tab to its mode

### Requirement: Graph and Timeline draw the tab's own reading of the file

The Graph and Timeline modes SHALL draw the file from the same reading of the
tab's text that the record card and the Index use, and SHALL NOT
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
- **WHEN** *Open GEDCOM files as* names Graph and the reader follows
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

## ADDED Requirements
### Requirement: A workspace saved with Genealogy mode or the Evidence panel opens cleanly

Versions of the plugin before this change had a Genealogy mode, with a page of a
record in the tab, and an **Evidence** view in the right sidebar. A workspace that
still holds an Evidence view SHALL, once loaded, have it closed, without a notice
and without leaving a pane that Obsidian calls unknown, whether the interface is on
or off. A tab saved in Genealogy mode SHALL open in Graph mode, and keep its file,
and a saved record of its page and the view chosen on it SHALL be ignored.

#### Scenario: A workspace saved with the Evidence view
- **WHEN** the workspace was saved with the Evidence view open in the right
  sidebar, and the plugin is updated and Obsidian restarted
- **THEN** no Evidence view is open and no pane says that it does not look like
  anything, and the GEDCOM tabs are as they were

#### Scenario: A saved page's record
- **WHEN** a tab was saved in Genealogy mode on Pierre Curie's page with its
  Timeline view chosen
- **THEN** the tab opens in Graph mode with nothing selected

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
A file opened anew while the interface is on SHALL open in the mode the *Open GEDCOM
files as* setting names, which SHALL offer Graph, Timeline and Source and SHALL
default to Graph. A file opened anew while the interface is off SHALL be remembered
as in Source mode, so that turning the interface on does not change the tab. Two
tabs of one file SHALL each have a mode of their own. A tab, or a setting, saved
by an earlier version as **Genealogy** SHALL be read as Graph.

#### Scenario: A file opened with the default setting
- **WHEN** the reader has turned the Genealogy interface on, leaves *Open GEDCOM
  files as* unchanged and opens `curie.ged`
- **THEN** the tab is in Graph mode and shows a card for each of the 17 people

#### Scenario: A reader who prefers the source
- **WHEN** the Genealogy interface is on, the setting names Source and the reader
  opens `curie.ged`
- **THEN** the tab opens in Source mode, as the plugin did before it had a
  genealogy interface

#### Scenario: A reader who prefers the timeline
- **WHEN** the Genealogy interface is on, the setting names Timeline and the reader
  opens `curie.ged`
- **THEN** the tab opens in Timeline mode and shows a row for each of the 17 people

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


### Requirement: Commands follow the mode and the selection

Commands that act on the editor — go to definition, find references, rename, the
problems commands, and replace — SHALL be offered only when the active GEDCOM tab
is in Source mode. The command **Find**, and the key Obsidian dispatches to the tab
for it, SHALL be offered in every mode: in Source it opens the editor's search, and
in Graph and Timeline the search of the view, as the requirements of those views
say. Copying a link to a record SHALL be offered in Source mode, for the record
under the cursor, and in Graph and Timeline modes while a record is selected, for
the selected record, whether it is a person, a family, a source or a multimedia
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

#### Scenario: The find key in Source mode
- **WHEN** the tab is in Source mode and the reader presses the find key
- **THEN** the editor's search panel opens

#### Scenario: Replace outside the source
- **WHEN** the tab is in Timeline mode and the reader opens the palette
- **THEN** replace and the editor commands are not offered
