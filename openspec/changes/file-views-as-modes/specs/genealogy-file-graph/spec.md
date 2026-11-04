## REMOVED Requirements

### Requirement: The graph of a file is a tab of its own

**Reason**: The graph of a file is no longer a tab of its own; it is a mode of the file's tab.

**Migration**: "The graph is a mode of the file's tab" says what the graph does in the tab. A tab of the graph saved by an earlier version is closed when the workspace loads, as "A workspace saved with the file's overview in a tab of its own opens without it" in `genealogy-view` says.

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
on the branch of the person the tab had in view when it was brought to the graph
— the page's person in Genealogy mode, the person at the cursor in Source mode —
or of the first person the file declares where neither names one. A smaller file
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
- **WHEN** a file of 2 000 people is open on a person's page and the reader
  switches the tab to Graph mode
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
the first of these that is shown: the person the tab had in view when it was
brought to the graph, the person whose branch it shows, the first card of the top
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
- **THEN** the graph has moved, and Marie's page is not opened

#### Scenario: Choosing a branch
- **WHEN** the tab of `curie.ged` was on Marie's page when it was switched to
  Graph mode and the reader chooses Irène's branch, and then returns to the whole
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

### Requirement: The graph leads to the pages

Activating a person's card SHALL show that person's page in the same tab, as a
row of the index does: the tab leaves Graph mode for Genealogy mode, and Back
SHALL return it to the graph, at the scope, position and zoom it had. Activating
a family node SHALL show that family's page the same way. Activating either SHALL
open no other tab.

Every card and family node drawn SHALL be reachable with the keyboard, in the
order of the rows and, within a row, from left to right; SHALL say whom it
shows to assistive technology; and SHALL be activated with Enter or Space. A
card's **Branch** choice SHALL be reachable with the keyboard too. A card or node
given the focus SHALL be brought into view.

#### Scenario: From the graph to Irène's page
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader activates
  Irène's card
- **THEN** the same tab is in Genealogy mode showing Irène's page, and no other
  tab has opened

#### Scenario: Back to the graph
- **WHEN** Irène's page was opened from the graph of Irène's branch, zoomed in,
  and the reader presses back
- **THEN** the tab is in Graph mode again, showing Irène's branch at the same
  position and zoom

#### Scenario: From a family node to the family page
- **WHEN** the reader activates the node between Pierre Curie and Marie
- **THEN** the tab is in Genealogy mode showing the Curies' family page

#### Scenario: From the keyboard
- **WHEN** the reader moves the focus to Marie's card and presses Enter
- **THEN** Marie's page is shown in the tab

## ADDED Requirements

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
- **WHEN** `curie.ged` is open in Genealogy mode and the reader chooses Graph from
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
