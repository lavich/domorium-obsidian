## MODIFIED Requirements

### Requirement: The card lives in the right sidebar and follows the GEDCOM tab

While the **Genealogy interface** setting is on, the plugin SHALL offer a view
named **Record**, the record card, in the right sidebar. It SHALL be placed there, without taking the focus, the first time in a session a record is selected in a
GEDCOM tab by a gesture of the reader — a click, a tap, a key on a card or a row, a row of the list, a link, *Go to record* — and no card is open; a reader who then closes it SHALL not have it put back until the plugin loads again, unless the setting **Open the record card when selecting** is on, as below. It SHALL open from the command **Show the record card**, which SHALL expand the sidebar if it is collapsed, bring the card into view and give it the focus. Where the right sidebar is a drawer, as on a phone, the card SHALL be reached from that drawer, and selecting a record by a second touch on a card, a node or a row of Graph or Timeline, and by a tap on a row of the list, SHALL open the drawer on the card, putting the card there if it is not open (even if the reader closed it earlier). Where the sidebar is not a drawer and the setting **Open the record card when selecting** is on, selecting a record by a click, a tap or a key on a card, a node or a row of Graph, Timeline or List, or by a link or *Go to record*, SHALL put the card in the right sidebar if no card is open, even if the reader closed it earlier, and SHALL expand the right sidebar if it is collapsed, without moving the focus from where the reader is, and SHALL NOT open or expand the left sidebar; a card that is open in an expanded sidebar SHALL be left as it is, also when another tab of the sidebar is in front. Selecting by the cursor resting in Source, or by a pointer, a citation, a place or the control that opens a shared note in the card SHALL NOT expand or switch the sidebar. Where the sidebar is not a drawer and the setting is off, a selection by the reader SHALL NOT move, switch or expand it, once the card has been placed or not. While the genealogy interface is off, the plugin
SHALL NOT place the card, SHALL NOT offer the command, and SHALL close a card that
is open.

The card SHALL show the selected record of the GEDCOM tab most recently active,
and SHALL follow that tab as the reader moves between tabs, whatever the mode of
the tab. Where no GEDCOM tab is open it SHALL say so. Where the tab has nothing
selected it SHALL say to select a record in the graph, the timeline or the list;
where the file declares no record with an identifier — no person, family, source,
multimedia record, shared note, repository, submitter or record of its own, nothing but its
header and its trailer — it SHALL say that the file holds nothing to show, and a file that
declares any of them SHALL instead say to select a record. When the record it shows changes,
the card SHALL announce the record's name in a polite live region, in the reader's language,
named as the list, the pointers and the root of the tree name it.

#### Scenario: The first selection
- **WHEN** the Genealogy interface is on, no card is open, and the reader opens
  `curie.ged` in Graph mode and activates Marie's card
- **THEN** the right sidebar gains the Record view as one of its tabs showing
  Marie Skłodowska-Curie, and the graph keeps the focus

#### Scenario: Closed by the reader
- **WHEN** the setting **Open the record card when selecting** is off, the card was placed, the reader closed it, and selects Pierre Curie
- **THEN** the card is not put back during that session

#### Scenario: Closed by the reader, with the setting on
- **WHEN** the setting is on, the card was placed, the reader closed it, and clicks Pierre Curie's card in the graph
- **THEN** the card is put back in the right sidebar showing Pierre Curie, and the graph keeps the focus

#### Scenario: The command
- **WHEN** the card is open behind another tab of the right sidebar, or the
  sidebar is collapsed, and the reader runs **Show the record card**
- **THEN** the right sidebar is open on the card

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** no card is placed and the palette does not offer **Show the record
  card**

#### Scenario: Turning it off with the card open
- **WHEN** the card is open and the reader turns the interface off
- **THEN** the card is closed

#### Scenario: No GEDCOM tab
- **WHEN** the card is open and no GEDCOM tab is
- **THEN** the card says no GEDCOM file is open

#### Scenario: Nothing selected
- **WHEN** the active GEDCOM tab is in Graph mode with nothing selected
- **THEN** the card says to select a record in the graph, the timeline or the
  list

#### Scenario: A file with no people
- **WHEN** the active GEDCOM tab holds a file declaring only `0 HEAD` and `0 TRLR`
- **THEN** the card says the file holds nothing to show

#### Scenario: A file of notes alone
- **WHEN** the active GEDCOM tab holds a file declaring shared notes and no person, family
  or source, and nothing is selected
- **THEN** the card says to select a record in the graph, the timeline or the list

#### Scenario: Following the tab
- **WHEN** Marie is selected in the tab of `curie.ged` and the reader moves to
  another GEDCOM tab with Pierre Curie selected
- **THEN** the card shows Pierre Curie, and shows Marie again when the reader
  returns to the first tab

#### Scenario: Moving to a Markdown note
- **WHEN** the reader moves from the GEDCOM tab to a Markdown note
- **THEN** the card still shows the record of that GEDCOM tab

#### Scenario: On a phone
- **WHEN** the reader touches Marie's card in the graph on a phone, and then
  touches it again
- **THEN** the right drawer opens on Marie's card

#### Scenario: On a phone after the card was closed
- **WHEN** the card was placed and closed in this session, and the reader touches
  Marie's card in the graph on a phone twice
- **THEN** the right drawer opens on Marie's card

#### Scenario: A collapsed sidebar on a desktop
- **WHEN** the setting is off, the card is open, the right sidebar is collapsed, and the reader activates
  Marie's card in the graph
- **THEN** the sidebar stays collapsed, and the card shows Marie when it is opened

#### Scenario: Both sidebars collapsed
- **WHEN** the setting is on, both sidebars are collapsed, and the reader clicks Marie's card in the graph on a desktop
- **THEN** the right sidebar expands on the card showing Marie, the left sidebar stays collapsed, and the graph keeps the focus

#### Scenario: The setting is off
- **WHEN** the setting is off, both sidebars are collapsed, and the reader clicks Marie's card in the graph
- **THEN** both sidebars stay collapsed

#### Scenario: A card already visible
- **WHEN** the setting is on, the card is open in the expanded right sidebar and the reader clicks Pierre's card in the graph
- **THEN** the sidebar is not expanded, switched or moved, and the card shows Pierre

#### Scenario: Collapsed again by the reader
- **WHEN** the setting is on and the reader collapsed the right sidebar after the card opened, then clicks Marie's card in the graph
- **THEN** the right sidebar expands again on the card

#### Scenario: Following the cursor in Source
- **WHEN** the setting is on, both sidebars are collapsed, the tab is in Source mode, and the cursor rests in Pierre's record
- **THEN** no sidebar opens

#### Scenario: Back in the card
- **WHEN** the setting is on, the card is open in the expanded right sidebar, the reader collapsed the left sidebar, and activates a pointer in the card
- **THEN** neither sidebar is expanded, switched or moved

#### Scenario: A row of the list
- **WHEN** the setting is on, the right sidebar is collapsed and the tab is in List mode, and the reader clicks Marie's row
- **THEN** the right sidebar expands on the card showing Marie, and the list keeps the focus

#### Scenario: On a phone, a row of the list
- **WHEN** the reader taps Marie's row in the list on a phone
- **THEN** the right drawer opens on Marie's card

#### Scenario: The announcement
- **WHEN** the reader selects Pierre Curie
- **THEN** a polite live region of the card reads `Pierre Curie`

#### Scenario: The announcement of a note
- **WHEN** the reader selects the note `@N1@` in the list
- **THEN** the live region reads `The only person to have won a Nobel Prize in two different
  sciences:`, the text of its row in the list

### Requirement: In Source mode the cursor and the selection go together

In Source mode, selecting a record from a link, *Go to record* or by activating something in the card SHALL put the cursor at the record's first line and scroll it into view; the editor SHALL take the focus when the selection came from a link or *Go to record*, and SHALL NOT when it came from the card. A selection that came from the cursor itself SHALL NOT move the cursor or take the focus. While the Genealogy interface is off, following a link or choosing *Go to record* in Source mode SHALL still put the cursor at the record, and nothing SHALL be selected. Moving the cursor into a
person, a family, a source or a multimedia record SHALL, once the cursor has rested, select that record
without moving the cursor; a cursor in any other record — a shared note, a repository, a
submitter, a record of the file's own, the header, the trailer, though the first five have
cards — or between records, SHALL leave the selection as it is.

Switching to Source mode with a record selected SHALL put the cursor at the start
of the selected record's lines — for the header, of the header's lines — and scroll it
into view, unless the cursor is already within those lines.
Leaving Source mode SHALL select the record under the cursor where it is a person, a family,
a source or a multimedia record, and SHALL leave the selection as it is otherwise.

#### Scenario: Opening Pierre in the source
- **WHEN** the tab is in Source mode and the reader follows `[[curie.ged#@I2@]]`
- **THEN** the tab stays in Source mode with the cursor on `0 @I2@ INDI`, and the
  card shows Pierre Curie

#### Scenario: Opening a family in the source
- **WHEN** the tab is in Source mode and the reader follows `[[curie.ged#@F3@]]`
- **THEN** the tab stays in Source mode with the cursor on `0 @F3@ FAM`, and the
  card shows the Curies' family

#### Scenario: A relative in the card
- **WHEN** the tab is in Source mode and the reader activates the pointer to Pierre Curie in
  the tree of the Curies' family
- **THEN** the cursor is on `0 @I2@ INDI`, in view, the card shows Pierre Curie,
  and the focus is still in the card

#### Scenario: Back in the source
- **WHEN** the tab is in Source mode, the reader selected Marie and then Pierre by
  links, the cursor is on `0 @I2@ INDI`, and the reader activates the pointer to Marie in the tree of the Curies' family
- **THEN** the card shows Marie, the cursor is on `0 @I1@ INDI`, in view, and the focus is still in the card

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the tab is in Source mode with the cursor on `0 @I1@ INDI`, and nothing is
  selected

#### Scenario: The cursor moves into a record
- **WHEN** the tab is in Source mode and the reader moves the cursor into Marie's
  record and rests there
- **THEN** the card shows Marie Skłodowska-Curie

#### Scenario: A note at the cursor
- **WHEN** Marie is selected and the reader moves the cursor into the shared note
  record `@N1@`
- **THEN** the card still shows Marie

#### Scenario: Leaving the source from a repository
- **WHEN** Marie is selected, the cursor rests in the repository record `@R1@`, and the
  reader switches to List mode
- **THEN** Marie is still selected and the card shows her

#### Scenario: Switching to the source with a note selected
- **WHEN** the note `@N2@` is selected in the list and the reader switches to Source mode
- **THEN** the cursor is on `0 @N2@ SNOTE`, in view, and the card still shows the note

#### Scenario: Switching to the source with the header selected
- **WHEN** *File header* is selected in the list and the reader switches to Source mode
- **THEN** the cursor is on `0 HEAD`, in view, and the card still shows the header

#### Scenario: Switching to the source from Marie's birth
- **WHEN** Marie is selected in Graph mode, the cursor in Source was left in Pierre Curie's
  record, and the reader switches to Source mode
- **THEN** the cursor is on her `0 @I1@ INDI` line, in view

#### Scenario: Switching to the source from the graph
- **WHEN** the cursor is in Pierre Curie's record in Source mode, and the reader
  switches to Graph mode and then to Source mode
- **THEN** the cursor is where it was

#### Scenario: Through the graph
- **WHEN** the cursor is on a line inside Pierre Curie's record, and the reader
  switches to Graph mode
- **THEN** Pierre Curie is selected, and the card shows Pierre Curie

### Requirement: A tab holds at most one selected record

A GEDCOM tab SHALL hold at most one **selected record**: a person, a family, a
source, a multimedia record, a shared note, a repository, a submitter, a 5.5.1 submission
record or a record of the file's own, each with an identifier, the header of the file,
which has none and is selected under the id `header:`, or a place that the file names. It SHALL be selected by activating a
person's card, a family node, a name or a lifeline in Graph or Timeline; by
activating a row of the list; by activating a pointer, a citation, a place or the control
that opens a shared note in the card; by following a link into the file
and by choosing a record with **Go to record**, where the record is of one of those
kinds, the header included; and in Source mode by the cursor, where the record is a person,
a family, a source or a multimedia record, as the requirement on Source says.
Selecting another record SHALL replace the first. Selecting SHALL show the record in
the card, SHALL NOT change the tab's mode, SHALL NOT open another tab and SHALL NOT
write to the file.

The selection SHALL belong to the tab and to the record, not to what is drawn. It
SHALL be kept when the tab changes mode, and when the workspace is closed and
reopened. It SHALL end when the record no longer exists in the file and when the tab is navigated to another file, and SHALL NOT be shown while the Genealogy interface is off.
A record that has no card — the trailer, a record the file writes with no identifier other than the header — SHALL NOT be selected, and SHALL leave the selection as it was. While the Genealogy interface is off nothing SHALL be selected or shown, and a saved selection SHALL be kept in the tab's state unused, to come back when the interface is turned on. A state handed to a tab for the same file that names no selection SHALL leave the selection as it is. A record saved as selected that the file does not declare, when the file is loaded, SHALL be dropped, and until then the card SHALL show the empty state.

While a record is selected the list SHALL mark its row as selected in List mode. A
fact of a person or a family SHALL NOT be selectable on its card: its lines are rows of the tree.

In Graph and Timeline mode a selected person SHALL be marked in the view, as the
requirements of those views say. In List mode the row of the selected record SHALL be
marked, whatever its kind, as the requirements of the list say. A selected family, source,
multimedia record, shared note, repository, submitter, record of the file's own, header or
place has no card or row to mark in Graph or Timeline, and while one is selected nobody is
marked there, the graph and the timeline staying where they are.

#### Scenario: From a card in the graph
- **WHEN** the tab is in Graph mode and the reader activates Irène's card
- **THEN** the tab stays in Graph mode, Irène's card is marked selected, the card
  shows Irène Joliot-Curie, and no other tab is open

#### Scenario: From a row in the timeline
- **WHEN** the tab is in Timeline mode and the reader activates Marie's lifeline
- **THEN** the tab stays in Timeline mode, her row is marked selected, and the
  card shows Marie Skłodowska-Curie

#### Scenario: From a family node
- **WHEN** the tab is in Graph mode and the reader activates the node between
  Pierre Curie and Marie
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie,
  and no card of the graph is marked selected

#### Scenario: From the list
- **WHEN** the tab is in List mode and the reader activates Marie's row
- **THEN** the tab stays in List mode, her row is marked selected, and the card shows
  her

#### Scenario: A family row in the list
- **WHEN** the tab is in List mode and the reader activates the Curies' row among
  the families
- **THEN** the tab stays in List mode, the card shows the Curies' family, and
  that row is marked selected

#### Scenario: Kept across the modes
- **WHEN** Marie is selected in Graph mode and the reader switches to Timeline
  mode
- **THEN** her row is marked selected, the card still shows her, and the list,
  when shown, marks her row

#### Scenario: Kept by the workspace
- **WHEN** Marie is selected in a tab in Graph mode, zoomed in and moved, and
  Obsidian is restarted
- **THEN** the tab is in Graph mode at that zoom and position with Marie's card
  marked selected, and the card shows Marie

#### Scenario: A record with no card
- **WHEN** Marie is selected and the reader runs **Go to record** and chooses the trailer
- **THEN** the tab switches to Source mode at `0 TRLR`, and the card still shows Marie

#### Scenario: A note selected from a link
- **WHEN** the tab is in Graph mode with Marie selected and the reader follows
  `[[curie.ged#@N1@]]`
- **THEN** the tab stays in Graph mode, the card shows the note's card, and no card of the
  graph is marked selected

#### Scenario: The header from Go to record
- **WHEN** the tab is in Timeline mode and the reader runs **Go to record** and chooses the
  header record
- **THEN** the tab stays in Timeline mode, the card shows the header's card, and no row of
  the timeline is marked selected

#### Scenario: The header kept by the workspace
- **WHEN** the header is selected in a tab in List mode and Obsidian is restarted
- **THEN** the card shows the header's card and the row of *File header* is marked

#### Scenario: The record goes
- **WHEN** Marie is selected in Graph mode and her record is removed from the file
  on disk
- **THEN** nobody is selected, the card says to select a record, and no row of
  the list is marked

#### Scenario: The interface is turned off
- **WHEN** Marie is selected in Graph mode and the reader turns the Genealogy
  interface off
- **THEN** the tab shows the source, the card is closed, and no row of the list is
  marked; turning the interface on again shows Marie selected

#### Scenario: Another file
- **WHEN** Marie is selected in a tab and the same tab is navigated to another
  GEDCOM file
- **THEN** nothing is selected in the tab

#### Scenario: A saved record the file no longer has
- **WHEN** a tab was saved with `@I99@` selected, which the file does not declare,
  and Obsidian is restarted
- **THEN** nothing is selected, the card says to select a record, and no row of the
  list is marked

### Requirement: The media card

Selecting a multimedia record SHALL show its **media card**, which SHALL be the tree of the
record's lines and nothing else, as the card of a person is and as the requirements of the
tree say: its root is the record's opening line, labelled *Media* in the reader's language,
and every line of the record is beneath it in the order the file writes them, its file shown
as its picture where it is an image the card can draw and as its path otherwise. The card
SHALL have no heading of its own and no list of the records that link it; how many records
point at it is the list's to say. It SHALL be edited as the card of a person is, its file
chosen as the requirements on editing say. A multimedia record is selected by following a
link to it, from a pointer to it in the tree of another card, and from its row among the
media of the list.

#### Scenario: The family photograph
- **WHEN** the reader follows `[[curie.ged#@O5@]]`
- **THEN** the card is the tree of `@O5@`: its root *Media*, the family photograph drawn in
  the row of its file, its format and its title beneath it once that row is opened, and no
  heading and no list of records above or below the tree

#### Scenario: From a tile to its media card
- **WHEN** the reader activates the pointer to the family photograph in Marie's tree
- **THEN** the card shows the media card of `@O5@`

#### Scenario: From the list
- **WHEN** the reader chooses Media in the list and clicks the row of the family photograph
- **THEN** the card shows the media card of `@O5@`, the tree of its lines with the picture in
  the row of its file, and the row of `@O5@` in the list reads `2` under Linked from

### Requirement: The controls of a card are easy to see and to hit

Every control of a card — the pointers that select a record, the place links, the
links *Show in source* of a missing pointer, the notes' lines, and the file of a medium in its row — SHALL
show a focus ring in the accent colour when it is reached by the keyboard, and SHALL NOT show it
when it is pressed with a pointer. On a device whose pointer is coarse and in the mobile app, each of
them SHALL have an activation area at least 32 pixels tall without changing the size of its text,
and a control that is a block of its own — a pointer, a note's line, the file of a medium — 44 pixels; where two controls stand closer together than that,
the space between them is shared. The control of a node of the tree, its arrow, SHALL stay shown, like any control that opens or closes a part of the card; the one control that opens or closes every node of a tree SHALL always be shown, in a header above the tree. The headings of the sections of a card and the secondary lines under
them SHALL be set in the muted text colour of the theme, not the faint one. A date at the left of an event SHALL be set
in the muted text colour; a notice that a source is missing keeps its warning colour. Nothing SHALL set a colour that is not one of the theme's.

#### Scenario: Keyboard focus
- **WHEN** the reader reaches a pointer to a family in Marie's tree with the Tab key
- **THEN** a ring in the accent colour surrounds it

#### Scenario: A press with the pointer
- **WHEN** the reader presses a pointer to a family in Marie's tree with a pointer device
- **THEN** no ring is drawn around it

#### Scenario: A phone
- **WHEN** Marie's card is shown 390 pixels wide on a phone
- **THEN** the area that activates a place link in her birth is at least 32 pixels tall, and the area that activates a pointer to a family at least 44

#### Scenario: A fact without a source
- **WHEN** Marie's card is shown
- **THEN** the dates of her events are in the muted text colour, on a card with no orange mark

#### Scenario: A picture on a media card
- **WHEN** the card of a photograph in the vault is shown
- **THEN** its picture, in the row of its file, is a control reached with the keyboard and
  pressed with Enter or Space, at least 44 pixels in each direction on a phone

#### Scenario: The arrows of a node
- **WHEN** the card is shown and the pointer is not over the tree
- **THEN** the arrows of the nodes are visible, and so is the control that opens or closes every node, in the header above the tree

### Requirement: The card fits a narrow panel and a phone, with no header

The card SHALL be readable and usable in one column at the width a sidebar has,
from 320 pixels up, and at a phone's width, without horizontal scrolling of the
card. The card SHALL have no header and no Back or Forward control: its body is the whole of it and scrolls. A place named in a fact SHALL open the card of that place. Redrawing the card for the same record — the file changing —
SHALL NOT scroll it back to the top, and, where the focus was in the card, SHALL keep it on the same fact; selecting another record or a place SHALL scroll the card to
the top, except a record selected from a row of the card of a place, which SHALL show the line of that event, as the requirement on the card of a place says.

#### Scenario: A person card at a sidebar's width
- **WHEN** Marie's card is shown 320 pixels wide
- **THEN** every line of her record is visible without scrolling sideways

#### Scenario: A person card on a phone
- **WHEN** Marie's card is shown 390 pixels wide
- **THEN** every line of her record is visible without scrolling sideways

#### Scenario: Tapping a place in a fact
- **WHEN** the reader taps `Warsaw, Congress Poland` in Marie's birth
- **THEN** the card of that place is shown

#### Scenario: Another record
- **WHEN** the card is scrolled to the end of Marie's card and the reader activates
  a pointer to a family in her tree
- **THEN** that family's card is shown from its top

#### Scenario: The header stays
- **WHEN** the reader scrolls to the end of Marie's card
- **THEN** the card has no header: no bar, no Back or Forward control, and its body began at the top of the card

### Requirement: An event is one row at a place

The card of a place SHALL have no heading. At its top SHALL be a field labelled with the
word for a place in the reader's language, holding the place's name as the Places list names
it — the spelling of its first occurrence in the file. Where the card writes, the field SHALL
rename the place everywhere, as the requirement on renaming a place in
`genealogy-record-edit` says, and SHALL behave as a field of the tree: written on Enter and
on leaving it, put back by Escape. Where the card does not write — a file with no dialect, or
a line of the place the language service does not describe — the name SHALL be read-only and
the card SHALL say once, in the reader's language, why it cannot be edited.

Below the field, every line that names the place — each `PLAC` of an event of a person or a
family that the Places list groups into it — SHALL be drawn as one **event row**, in the
order the file writes them: its date as the file writes it on the left, a dash where it has
none; its name in the reader's language, which is not a control of its own; where the event
cites any source, a quiet dot after the name, which says how many in its accessible name and
title, and none where it cites none; and, under the name, the person or the family the event
belongs to, as a link. Activating the link, or pressing the row, SHALL select that record and
show its card with the node of that event opened and brought into view, the focus on it
where the focus was in the card. On a coarse pointer and on a phone each row SHALL be at least
44 pixels tall. The card SHALL NOT offer to edit the lines a `PLAC` holds (`MAP`, `FORM`,
`TRAN`, `NOTE`); they are edited in the tree of the event.

#### Scenario: An event at a place
- **WHEN** the card of `Warsaw, Congress Poland` lists Marie's birth
- **THEN** the row shows `7 NOV 1867`, names `Birth`, and links `Marie Skłodowska-Curie` under the name

#### Scenario: A fact that cites a source
- **WHEN** an event at a place carries `2 SOUR @S2@`
- **THEN** its row shows a dot after the name, which says it cites one source

#### Scenario: The record from a place
- **WHEN** the reader presses `Marie Skłodowska-Curie` in that row
- **THEN** Marie's card is shown with her birth opened and in view, and the list, where it is in view, shows the people with her marked

#### Scenario: The name at the top
- **WHEN** the card of `Warsaw, Congress Poland` is shown in `curie.ged`
- **THEN** it has no heading, its first control is a field labelled Place holding
  `Warsaw, Congress Poland`, and eleven rows follow in the order of the file, the first
  Marie's birth

#### Scenario: The rows in the order of the file
- **WHEN** a file names `Kyiv` first in a death of 1900 and then in a birth of 1850
- **THEN** the card of `Kyiv` lists the death first

#### Scenario: The name of a place in a file with no dialect
- **WHEN** the card shows a place of a file that names no GEDCOM version
- **THEN** its name is a read-only field, the card says once why it cannot be edited, and
  its rows still select their records

## ADDED Requirements

### Requirement: The card of a shared note, a repository and the other records

Selecting a shared note, a repository, a submitter, a 5.5.1 submission record, a record of
the file's own or the header of the file SHALL show its card, as selecting a person shows
theirs: in the same sidebar view, following the same tab, with the same rules for focus,
redraw, the live region and a narrow panel. The card SHALL be the tree of the record's lines
and nothing else, as the card of a person is, and as the requirements of the tree say: its
root is the record's opening line, labelled with the record's kind in the reader's language
— *Shared note*, *Note* for a 5.5.1 note record, *Repository*, *Submitter*, *Submission*,
*Header*, or the tag as written for a record of the file's own — and every line of the record
is beneath it in the order the file writes them. The card SHALL be edited as the card of a
person is, the card of the header included, within what the language service allows.

#### Scenario: A shared note
- **WHEN** the reader chooses the note `@N1@` in the Notes of the list
- **THEN** the card is the tree of `@N1@`: its root *Shared note* holds the note's whole text,
  its two lines joined, and no heading stands above it

#### Scenario: From a source to its repository
- **WHEN** the card shows `Parish registers of Warsaw` and the reader presses
  `State Archive in Warsaw` in its tree
- **THEN** the card shows the repository's tree, its name and its address with the city and
  the country beneath it

#### Scenario: The file header
- **WHEN** the reader chooses *File header* in the Other kind of the list
- **THEN** the card is the tree of the header, the GEDCOM version among its lines, with the
  menu of its root and fields for the values the language service lets be changed

#### Scenario: A submitter
- **WHEN** the reader chooses `Domorium` in the Other kind and changes its web address in the tree
- **THEN** the file states the new address beneath `0 @U1@ SUBM`

#### Scenario: A record of the file's own
- **WHEN** the reader chooses the `_PLAN` record named `Research plan` in the Other kind
- **THEN** the root of its tree is labelled `_PLAN`, its closed summary reads `Research plan`,
  and its lines are shown with their custom tags as written

### Requirement: Every record is named the same way everywhere

The plugin SHALL name a record by one rule wherever it names it: in the first text column
of its row in the list, in the announcement of the card, as the text of a pointer to it in
the tree — a shared note excepted, below — and as the summary of the closed root of its tree. A person SHALL be named as the
person card names them, a family by its spouses, a source by its title, a place as the
Places list names it; a multimedia record by its title, or by the name of its first file
where it states none; a shared note by the first line of its text that is not empty, read
with its `CONC` and `CONT` lines joined; a repository and a submitter by their `NAME`; a
record of the file's own, and any other record, by its `NAME`, else its `TITL`, else the value
its own opening line writes after its tag, else the value of the first line beneath it that
has one, else its kind as the tree labels it; and the header of the file as *File header*.
A pointer to a shared note is the one exception to the pointer's text: it shows the note's
whole text where it stands, as the tree says, and not only its name.

#### Scenario: A note in the list and on a card
- **WHEN** Marie's tree points at the note `@N1@` and the reader opens that note's card
- **THEN** the row of `@N1@` in the list, the announcement of its card and the summary of its
  closed root read the same first line

#### Scenario: A repository in the tree of a source
- **WHEN** the card shows `The Nobel Prize in Physics 1903`
- **THEN** its repository line reads `Nobel Prize Outreach`, as the row of `@R1@` does in the list

#### Scenario: A record with no name
- **WHEN** a file declares `0 @X2@ _LOG` with nothing beneath it
- **THEN** its row's Name, the announcement of its card and its pointers read `_LOG`

#### Scenario: A record named by its own value
- **WHEN** a file declares `0 @P1@ _PLAN Custom value` with no `NAME` or `TITL` beneath it
- **THEN** its row's Name and the summary of its closed root read `Custom value`
