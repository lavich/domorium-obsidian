## REMOVED Requirements
### Requirement: The graph leads to the pages

**Reason**: Activating a card or a node no longer opens a page in the tab: the record is shown in the card of the right sidebar. Two of its scenarios (Back to the graph, and the family page) have no counterpart.

**Migration**: "A card or a node selects a record" below, and `genealogy-record-card`, "A tab has one selected record".

## MODIFIED Requirements
### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's card, to show only that
person's branch: the same people the timeline of the file shows for that person
and those numbers — their ancestors up to a number of generations, their
descendants down to a number, and the spouses of everyone so shown. Both numbers
SHALL start at two and be changed in steps of one, from zero to nine. The graph
SHALL say whose branch it shows and how many of the file's people that is,
SHALL return to the whole file on request, and SHALL show the rows of a branch
without empty rows between them. Choosing Branch again on the person whose
branch is shown SHALL return to the whole file, and that person's Branch SHALL
read as pressed while their branch is shown. While the whole file is shown, no
line about the scope SHALL be shown.

A file of more than 500 people SHALL show its graph, the first time the tab does,
on the branch of the person the tab had selected when it was brought to the graph
— in Source mode, the person of the record at the cursor — or of the first person
the file declares where neither names one. A smaller file
SHALL open on all of it. Once the tab has shown the graph, the scope the reader
leaves it on SHALL be kept, the whole file included.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the graph of `curie.ged`
- **THEN** four rows show Eugène, Sophie-Claire, Władysław and Bronisława
  Boguska; Pierre Curie and Marie; Frédéric and Irène; Hélène and Pierre Joliot
  — and the graph says this is 10 of 17 people

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's card
- **THEN** the whole file is shown, centred on Irène's card, and no line about
  the scope is shown

#### Scenario: No ancestors and no descendants
- **WHEN** the reader shows Marie's branch with zero generations of ancestors
  and zero of descendants
- **THEN** one row shows Pierre Curie and Marie

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open in Source mode with the cursor inside one
  person's record and the reader switches the tab to Graph mode
- **THEN** the graph shows that person's branch, with the way back to the whole
  file

#### Scenario: A large file opened as a graph
- **WHEN** *Open GEDCOM files as* names Graph and the reader opens a file of
  2 000 people
- **THEN** the graph shows the branch of the first person the file declares

#### Scenario: The whole file, chosen, stays
- **WHEN** the reader returns a large file's graph to the whole file, switches to
  Source mode and back to Graph mode
- **THEN** the whole file is shown

### Requirement: Moving about the graph

The reader SHALL be able to move the graph by dragging it from anywhere, a card
included; a press that moves before it is released SHALL NOT activate what it
began on. A mouse wheel SHALL zoom around the pointer; a trackpad's two-finger
scroll SHALL move the graph and its pinch SHALL zoom; buttons floating over a
corner of the graph, which stay where they are as it moves, SHALL zoom in and
out. **Fit** SHALL show the whole scope where the zoom range allows, and
otherwise as much of it as the farthest zoom shows, centred on it. Zoomed out
beyond the point where names can be read, cards SHALL be drawn without text.

A graph restored with the workspace, or shown again after the tab was in another
mode, SHALL be shown as it was left. Any other graph SHALL first be shown fitted
to its view where it can then be read, and otherwise at a readable size around
the first of these that is shown: the person the tab had selected when it was brought to the graph, the person whose branch it shows, the first card of the top
row. An edit of the file SHALL leave the view where it is. Changing the scope
SHALL show the new scope at a readable size around the person whose branch it now
shows, or, on returning to the whole file, around the person whose branch it
showed.

#### Scenario: Opening on a small file
- **WHEN** the graph of `curie.ged` is shown in a tab 1 400 pixels wide
- **THEN** every card of the file is in view, with its name

#### Scenario: Far out
- **WHEN** the reader zooms out until names could not be read
- **THEN** the cards are drawn as coloured boxes without names or years

#### Scenario: A drag that begins on a card
- **WHEN** the reader presses on Marie's card, moves the pointer and releases it
- **THEN** the graph has moved, and Marie is not selected

#### Scenario: Choosing a branch
- **WHEN** the tab of `curie.ged` had Marie selected when it was switched to Graph
  mode and the reader chooses Irène's branch, and then returns to the whole
  file
- **THEN** the view is centred on Irène's card both times, at a readable size

#### Scenario: An edit keeps the view
- **WHEN** the reader has moved and zoomed the graph and then corrects a date in
  the source and returns to Graph mode
- **THEN** the graph shows the correction at the same position and zoom

#### Scenario: Another mode and back
- **WHEN** the reader has moved and zoomed the graph, switches to Timeline mode
  and then back to Graph mode
- **THEN** the graph is at the same position and zoom, and was not laid out again

### Requirement: The graph on a phone

On a phone the graph SHALL fill the screen's width, with no title or summary above the
canvas, as the timeline of the file has none; the search icon SHALL be at least 44
pixels square. The graph SHALL show no legend. Dragging with
one finger SHALL move it and pinching with two SHALL zoom it; neither SHALL
activate what it began on. Touching a card SHALL light that person and their
family as pointing does and offer their **Branch**; touching it again SHALL select the person as activating does on a desktop, and
open the right drawer on their card. Touching a family node SHALL show
its details, with the way to the family's card. Touching empty space SHALL put
the light out.

#### Scenario: Touching Marie's card
- **WHEN** the reader touches Marie's card on a phone, and then touches it again
- **THEN** her family is lit, and then Marie is selected and the right drawer
  shows her card

#### Scenario: Pinching
- **WHEN** the reader pinches the graph on a phone, beginning with a finger on a
  card
- **THEN** it zooms around the point between the two fingers, the card's person
  is not selected, and no page of the app scrolls or zooms with it

### Requirement: The graph is a mode of the file's tab

A GEDCOM tab SHALL offer a **Graph** mode that shows the whole of its file as
the graph of the file, in the tab itself, with no tab of its own. The tab SHALL
enter it from the mode control in its header, from a command, and from the tab's
menu, as the requirement on the mode control of a GEDCOM tab says. Entering it
SHALL NOT open another tab.

The graph SHALL show the file as the tab holds it, including text typed in the
tab and not yet saved, and SHALL show every later change to it: at once while the
tab is in view, and the next time it is brought into view otherwise. It SHALL
keep its scope, position and zoom across leaving the mode and coming back and
across closing and reopening the workspace, and SHALL stay on the file when it is
renamed or moved, as the tab does.

Nothing in the graph SHALL write to the file.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Source mode and the reader chooses Graph from
  the mode control in its header
- **THEN** the same tab shows the graph of `curie.ged`, with a card for each of
  its 17 people in four generations, and no new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death to 1935 in Source mode, the
  file is not yet saved, and the reader switches to Graph mode
- **THEN** her card in the graph reads `1867–1935`

#### Scenario: Changed on disk while out of view
- **WHEN** a tab in Graph mode is behind another tab and the file is changed on
  disk so that Marie's year of death is 1935, and the reader brings the tab to the
  front
- **THEN** her card reads `1867–1935`

#### Scenario: The file is renamed
- **WHEN** the tab of `curie.ged` is in Graph mode and the file is renamed to
  `family.ged`
- **THEN** the tab is named `family.ged` and still shows the graph

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in Graph mode on Irène's branch, zoomed in and moved, and
  the reader switches to Timeline mode and then back to Graph mode
- **THEN** the graph shows Irène's branch at the same zoom and position

#### Scenario: Restored with the workspace
- **WHEN** a tab of `curie.ged` is in Graph mode on Irène's branch, zoomed in and
  moved, and Obsidian is restarted
- **THEN** the tab shows the graph of Irène's branch at the same zoom and position

### Requirement: A selected card

The graph SHALL mark one person's card as **selected** when the person is the
tab's selected record, however it was selected: by activating a card, from an
index row, from the record card, by a link or by the cursor in Source mode. Where
the selection came from outside the graph, the view SHALL centre on the card at a
readable zoom, gliding there rather than jumping unless the reader has asked for
reduced motion or the card is further away than a glide can show without a streak,
as stepping to a match does; where it came from activating a card of the graph, the
view SHALL NOT move. Switching to Graph mode with a person selected, and a graph
restored with the workspace, SHALL mark the card without moving a view that has a
position. The mark SHALL be unlike the light of pointing and unlike the ring of the
search's current match, SHALL stay while the pointer lights other people and while
the reader searches, and SHALL stay until another record is selected or the
selection ends. Where the person is not in the branch shown and the view is asked
to move to them, the graph SHALL show their branch, with the way back to the whole
file. The selection SHALL belong to the person, not to what is drawn: a card out of
view, outside a scope the reader has narrowed, or absent from a text that has
changed SHALL show the mark again when it is drawn, and every card of a person drawn
more than once SHALL carry it. Searching, and changing the scope, SHALL NOT end it.
Selecting SHALL NOT open a page, change the mode or write to the file.

#### Scenario: Selecting Pierre from the index
- **WHEN** the tab is in Graph mode and the reader activates Pierre Curie's row in
  the index
- **THEN** his card is marked selected and centred, the tab is still in Graph
  mode, and the record card shows him

#### Scenario: Selecting Pierre from the record card
- **WHEN** the tab is in Graph mode and the reader activates Pierre Curie among
  Marie's relatives in the record card
- **THEN** his card is marked selected and the graph glides to it

#### Scenario: The mark outlasts hover and search
- **WHEN** Pierre Curie is selected, the pointer rests on Marie's card and the
  reader types `joliot` and presses Enter
- **THEN** Pierre Curie's card still carries the selected mark, apart from the
  light on Marie's and the ring on Frédéric's

#### Scenario: A card out of view and back
- **WHEN** Pierre Curie is selected and the reader moves the graph until his card
  is out of the drawn window, and then back
- **THEN** his card carries the selected mark again

#### Scenario: Another selection
- **WHEN** Pierre Curie is selected and the reader activates Irène's row
- **THEN** only Irène's card is marked selected

#### Scenario: A person outside the branch
- **WHEN** the graph shows Marie's branch with zero generations of ancestors and
  zero of descendants and the reader activates Hélène's row in the index
- **THEN** the graph shows Hélène's branch, with her card selected

#### Scenario: Switching to Graph mode with a selection
- **WHEN** Marie is selected, the graph was zoomed in and moved, the reader
  switched to Timeline mode and then back to Graph mode
- **THEN** Marie's card is marked selected and the graph is at the same zoom and
  position

#### Scenario: Restored with the workspace
- **WHEN** Marie is selected in a tab in Graph mode, zoomed in and moved, and
  Obsidian is restarted
- **THEN** the graph is at that zoom and position, with Marie's card marked

## ADDED Requirements
### Requirement: A card or a node selects a record

Activating a person's card SHALL select that person: the tab SHALL stay in Graph
mode, SHALL open no page and no other tab, and the card SHALL be marked as selected
and shown in the record card of the right sidebar. The graph SHALL NOT move when it
is a card of the graph that was activated: the reader is looking at it. Activating
a family node SHALL select that family the same way, and show it in the record
card; no card is marked while a family is selected.

Every card and family node drawn SHALL be reachable with the keyboard, in the
order of the rows and, within a row, from left to right; SHALL say whom it
shows to assistive technology; and SHALL be activated with Enter or Space. A
card's **Branch** choice SHALL be reachable with the keyboard too. A card or node
given the focus SHALL be brought into view.

#### Scenario: From the graph to Irène's card
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader activates Irène's
  card
- **THEN** the tab is still in Graph mode with Irène's card marked selected, the
  record card shows Irène Joliot-Curie, and no other tab has opened

#### Scenario: The graph stays where it is
- **WHEN** the reader has zoomed the graph until Marie's card is at its edge, and
  activates her card
- **THEN** her card is marked selected and the graph has not moved

#### Scenario: From a family node
- **WHEN** the reader activates the node between Pierre Curie and Marie
- **THEN** the tab is in Graph mode, the record card shows the Curies' family, and
  no card is marked selected

#### Scenario: From the keyboard
- **WHEN** the reader moves the focus to Marie's card and presses Enter
- **THEN** Marie is selected and the record card shows her
