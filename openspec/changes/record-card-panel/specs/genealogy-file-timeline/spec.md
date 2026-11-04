## REMOVED Requirements
### Requirement: The timeline leads to the page and to the source

**Reason**: Activating a name or a lifeline no longer opens a page in the tab: the record is shown in the card of the right sidebar. Back to the timeline has no counterpart.

**Migration**: "A name or a lifeline selects a record, and a mark leads to the source" below, and `genealogy-record-card`, "A tab has one selected record".

## MODIFIED Requirements
### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's row, to show only that
person's branch: their ancestors up to a number of generations, their
descendants down to a number of generations, and the spouses of everyone so
shown. Both numbers SHALL start at two and be changed in steps of one, from zero
to nine. The timeline SHALL say whose branch it shows and how many of the file's
people that is, and SHALL return to the whole file on request. Choosing Branch
again on the person whose branch is shown SHALL return to the whole file, and
that person's Branch SHALL read as pressed while their branch is shown. While
the whole file is shown, no line about the scope SHALL be shown.

A file of more than 500 people SHALL show its timeline, the first time the tab
does, on the branch of the person the tab had selected when it was brought to the
timeline — in Source mode, the person of the record at the cursor — or of the first
person the file declares where neither names one. A
smaller file SHALL open on all of it. Once the tab has shown the timeline, the
scope the reader leaves it on SHALL be kept, the whole file included.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the timeline of `curie.ged`
- **THEN** her parents and grandparents, Frédéric, and their two children are
  shown, and the timeline says this is 10 of 17 people

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's row
- **THEN** the whole file is shown with Irène's row in view, and no line about
  the scope is shown

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open in Source mode with the cursor inside one
  person's record and the reader switches the tab to Timeline mode
- **THEN** the timeline shows that person's branch, with the way back to the
  whole file

#### Scenario: A large file opened as a timeline
- **WHEN** *Open GEDCOM files as* names Timeline and the reader opens a file of
  2 000 people
- **THEN** the timeline shows the branch of the first person the file declares

#### Scenario: The whole file, chosen, stays
- **WHEN** the reader returns a large file's timeline to the whole file, switches
  to Source mode and back to Timeline mode
- **THEN** the whole file is shown

### Requirement: The timeline on a phone

On a phone the timeline SHALL fit the screen's width, with a narrower column of
names and the years scrolling sideways. Touching a lifeline SHALL highlight that
person and their family and place the year cursor where it was touched; touching
it again SHALL select the person as activating it does on a desktop, and open the
right drawer on their card. Touching a
mark SHALL show its event, with the way to its lines in the source.

#### Scenario: Touching Marie's lifeline
- **WHEN** the reader touches Marie's lifeline on a phone, and then touches it
  again
- **THEN** her family stands out with the cursor at the touched year, and then
  Marie is selected and the right drawer shows her card

### Requirement: The timeline is a mode of the file's tab

A GEDCOM tab SHALL offer a **Timeline** mode that shows the whole of its file as
the timeline of the file, in the tab itself, with no tab of its own. The tab
SHALL enter it from the mode control in its header, from a command, and from the
tab's menu, as the requirement on the mode control of a GEDCOM tab says.
Entering it SHALL NOT open another tab.

The timeline SHALL show the file as the tab holds it, including text typed in the
tab and not yet saved, and SHALL show every later change to it: at once while the
tab is in view, and the next time it is brought into view otherwise. It SHALL keep
its scope, zoom and scroll position across leaving the mode and coming back and
across closing and reopening the workspace, and SHALL stay on the file when it is renamed or moved,
as the tab does.

Like the rest of the plugin's genealogy modes, nothing in the timeline SHALL
write to the file.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Source mode and the reader chooses Timeline
  from the mode control in its header
- **THEN** the same tab shows the timeline of `curie.ged`, with a row for each of
  its 17 people, and no new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death in Source mode, the file is not
  yet saved, and the reader switches to Timeline mode
- **THEN** her lifeline in the timeline ends at the new year

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in Timeline mode, zoomed in, on Irène's branch, scrolled
  down and to the right, and the reader switches to Source mode and then to
  Timeline mode again
- **THEN** the timeline shows Irène's branch at the same zoom, scrolled to the
  same place

#### Scenario: The file is renamed
- **WHEN** the tab of `curie.ged` is in Timeline mode and the file is renamed to
  `family.ged`
- **THEN** the tab is named `family.ged` and still shows the timeline

#### Scenario: Restored with the workspace
- **WHEN** a tab of `curie.ged` is in Timeline mode, zoomed in, on Irène's branch,
  and Obsidian is restarted
- **THEN** the tab shows the timeline of Irène's branch at the same zoom

### Requirement: A selected row

The timeline SHALL mark one person's row as **selected** when the person is the
tab's selected record, however it was selected: by activating a name or a lifeline,
from an index row, from the record card, by a link or by the cursor in Source mode.
Where the selection came from outside the timeline, the row SHALL be brought to the
middle of the board's height, and its lifeline into view sideways where it is out of
it, smoothly unless the reader has asked for reduced motion or the row is further
away than a smooth scroll can show without leaving rows blank, as stepping to a
match does; where it came from activating a name or a lifeline of the timeline, the
timeline SHALL NOT move. Switching to Timeline mode with a person selected, and a
timeline restored with the workspace, SHALL mark the row without moving a view that
has a position. The mark SHALL be unlike the light of pointing and unlike the ring
of the search's current match, SHALL stay while the pointer lights other people and
while the reader searches, and SHALL stay until another record is selected or the
selection ends. Where the person is not in the branch shown and the view is asked
to move to them, the timeline SHALL show their branch, with the way back to the
whole file. The selection SHALL belong to the person, not to what is drawn: a row
out of view, outside a branch the reader has narrowed, or absent from a text that
has changed SHALL show the mark again when it is drawn. Searching, and changing the
scope, SHALL NOT end it. Selecting SHALL NOT open a page, change the mode or write
to the file.

#### Scenario: Selecting Irène from the index
- **WHEN** the tab is in Timeline mode and the reader activates Irène's row in the
  index
- **THEN** Irène's row is marked selected and scrolled to the middle, the tab is
  still in Timeline mode, and the record card shows her

#### Scenario: Selecting from the record card
- **WHEN** the tab is in Timeline mode and the reader activates Irène among Marie's
  children in the record card
- **THEN** Irène's row is marked selected and scrolled to the middle

#### Scenario: The mark outlasts hover and search
- **WHEN** Irène is selected, the pointer rests on Marie's name and the reader
  types `joliot` and steps to the first match
- **THEN** Irène's row still carries the selected mark, apart from Marie's light
  and from the ring of the current match

#### Scenario: A row out of view and back
- **WHEN** Irène is selected and the reader scrolls until her row is out of the
  drawn rows, and then back
- **THEN** her row carries the selected mark again

#### Scenario: A person outside the branch
- **WHEN** the timeline shows Marie's branch with zero generations of ancestors
  and zero of descendants and the reader activates Hélène's row in the index
- **THEN** the timeline shows Hélène's branch, with her row selected

#### Scenario: Switching to Timeline mode with a selection
- **WHEN** Irène is selected, the timeline was scrolled, the reader switched to
  Graph mode and then back to Timeline mode
- **THEN** Irène's row is marked selected and the timeline is scrolled to the same
  place

## ADDED Requirements
### Requirement: A name or a lifeline selects a record, and a mark leads to the source

Activating a person's name or lifeline SHALL select that person: the tab SHALL stay
in Timeline mode, SHALL open no page and no other tab, and the row SHALL be marked
as selected and shown in the record card of the right sidebar. The timeline SHALL
NOT move when it is a row of the timeline that was activated. Activating a mark
SHALL show the lines of its event in the source: the tab leaves Timeline mode for
Source mode with those lines selected and in view.

#### Scenario: From the timeline to Irène's card
- **WHEN** the tab of `curie.ged` is in Timeline mode and the reader activates
  Irène's lifeline
- **THEN** the tab is still in Timeline mode with Irène's row marked selected, the
  record card shows Irène Joliot-Curie, and no other tab has opened

#### Scenario: The timeline stays where it is
- **WHEN** the reader has scrolled the timeline until Marie's row is at its edge,
  and activates her name
- **THEN** her row is marked selected and the timeline has not scrolled

#### Scenario: From a mark to the source
- **WHEN** the reader activates the mark of Marie's birth
- **THEN** the tab is in Source mode with her `1 BIRT` lines selected — `1 BIRT`,
  `2 DATE 7 NOV 1867` and `2 PLAC Warsaw, Congress Poland` — and in view
