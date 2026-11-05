# genealogy-file-timeline Specification

## Purpose
TBD - created by archiving change add-file-timeline. Update Purpose after archive.

## Requirements

### Requirement: A row is a person, and their lifeline is coloured by sex

Each person the file declares with an identifier SHALL have a row: their name
and years of life beside a horizontal axis of years, and a lifeline from their
birth to their death. A lifeline SHALL be pink for a woman, blue for a man, and
grey where the record states no sex. Where no birth is dated, the lifeline SHALL
begin at a dated christening or baptism, else at the person's earliest dated
event; where no death is dated, it SHALL end at a dated burial or cremation, else
fade out rather than end, no later than a hundred years after it begins and never
after the present. A person with no dated event at all SHALL have a row and no
lifeline.

#### Scenario: Marie's row
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** Marie's row names her with `1867–1934`, and a pink lifeline runs from
  1867 to 1934

#### Scenario: A death not recorded
- **WHEN** a person's birth is dated 1927 and no death is recorded
- **THEN** their lifeline begins in 1927 and fades out instead of ending

### Requirement: A person's events are drawn on their lifeline

The timeline SHALL mark on a person's lifeline each of their dated events, and
each dated event of a family they are a spouse in. A birth, a marriage and a
death SHALL each be marked in a colour of its own, a christening or baptism as a
birth and a burial or cremation as a death; every other event SHALL be
marked in one colour with a sign for its kind. A marriage SHALL also join the
rows of the two spouses. An event dated as a period SHALL be drawn as a span from
its first year to its second, whichever is the earlier; a period with one end,
`FROM 1891` or `TO 1894`, SHALL be marked at the year it names. An event dated as approximate or as an uncertain
moment — `ABT`, `CAL`, `EST`, `BEF`, `AFT`, `BET` — SHALL be marked so that it
cannot be taken for an exact date; a date stating only a year SHALL be marked as
an exact one.

Pointing at a mark SHALL show the event's name, the date as the file writes it,
and its place. Every dated event SHALL be shown; the timeline SHALL have no
switch for any kind of event and no toolbar above the board.

Facts without a date — an occupation, for example — SHALL NOT be written on the
timeline.

#### Scenario: Marie's marriage
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** the marriage of Pierre and Marie is marked in 1895 on both their
  lifelines, and a line joins their two rows there

#### Scenario: A period
- **WHEN** a person's residence is dated `FROM 1895 TO 1906`
- **THEN** a span from 1895 to 1906 is drawn on their lifeline

#### Scenario: An approximate birth
- **WHEN** a birth is dated `ABT 1860`
- **THEN** its mark is drawn as uncertain, while a birth dated `1860` is drawn as
  exact

#### Scenario: An occupation
- **WHEN** the pointer is on Marie's row
- **THEN** `Physicist and chemist` is written nowhere on the timeline

### Requirement: Rows are ordered by generation and family

Rows SHALL be ordered by generation, the oldest first: a person with no parents
in the file is of the first generation, and a child is one generation below
whichever of their parents stands lower. A spouse whose parents are not in the
file shares the generation of the one they married; two spouses whose parents
are both in the file both take the lower of their two generations. Within a generation, children of one family SHALL stand
together, in the order their parents stand above; a spouse whose parents are not
in the file SHALL stand beside the one they married; a person married to someone
of a neighbouring family SHALL stand on the side facing that family; the rest
SHALL follow their years of birth. Generations SHALL NOT be labelled.

#### Scenario: Pierre and Marie side by side
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** the Curie children stand together with Pierre last, the Skłodowski
  children stand together with Marie first, and so Pierre and Marie are
  neighbours

#### Scenario: A spouse from outside the file
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** Frédéric Joliot stands directly beside Irène

### Requirement: The person under the pointer and their family stand out

While the pointer is on a person's name or lifeline, the timeline SHALL
highlight that person's row and lifeline, their parents, spouses and children,
and fade everyone else, and SHALL draw an arrow from each parent's row to that
person's birth and from that person's row to each child's birth. No arrows SHALL
be drawn for anyone else. The pointer SHALL light a person only once it has
rested on them a moment, and put the light out only once it has left the
timeline as long, so that a sweep across rows does not flicker; the keyboard's
focus and a touch SHALL light at once. Lighting and fading SHALL be eased in
over a moment, except where the reader's system asks for reduced motion.

#### Scenario: Pointing at Marie
- **WHEN** the pointer is on Marie's name
- **THEN** her parents, Pierre, Irène and Ève stand out, the others fade, and
  arrows join each of her parents' rows to Marie's birth and Marie's row to each
  daughter's birth, and no arrow leaves Pierre's row

#### Scenario: A sweep across the rows
- **WHEN** the pointer passes quickly over several names and comes to rest on
  Irène's
- **THEN** only Irène and her family stand out, once the pointer has rested

### Requirement: A year cursor follows the pointer

While the pointer is over the lifelines, the timeline SHALL draw a line at the
year under it and name that year on the axis. On the lifeline of each person
alive that year it SHALL show the age they reached during it: the year less the
year of birth, or of christening or baptism where no birth is dated, which does
not depend on the day or the month. A person whose death is not recorded SHALL
count as alive only up to the end of their faded lifeline. A person whose
lifeline begins at another event SHALL be shown no age. The age SHALL be marked as
approximate where the birth is dated as approximate or uncertain — `ABT`, `CAL`,
`EST`, `BEF`, `AFT`, `BET`. No age SHALL be shown anywhere else in the timeline,
and the timeline SHALL NOT write how many people were alive.

#### Scenario: 1906
- **WHEN** the cursor is on 1906 in the timeline of `curie.ged`
- **THEN** Marie's lifeline shows 39 and Irène's shows 9, and no count of the
  people alive is written anywhere

#### Scenario: A birth known only by its year
- **WHEN** a person was born in `1832` and the cursor is on 1900
- **THEN** their age is shown as 68

#### Scenario: An approximate birth
- **WHEN** a person was born `ABT 1832` and the cursor is on 1900
- **THEN** their age is shown as approximately 68

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

### Requirement: Finding a person and zooming

The timeline SHALL offer a search by name that fades the rows that do not match.
The search SHALL be an icon floating over the board, under the axis and away from
the zoom buttons, that is replaced by a field when it is pressed, the icon fading away as the
field grows and taking no place beside it, and the field SHALL take the focus.
The field SHALL have a cross that erases the text and leaves the field open;
Escape, and the cross of an empty field, SHALL close it back to the icon, as SHALL
leaving it empty, while a field with text SHALL stay open and keep its matches
lit and the other rows faded.

The open field SHALL show how many rows match — «4 matches», or «No results»
where none does — and, once the reader has stepped, which match the view is on,
as «3 / 4». Two buttons beside it, previous and next, and Enter and Shift+Enter
in the field, SHALL move to the previous and the next match, in the order of the
rows: the first step forward goes to the first match and the first step back to
the last, and each step past either end comes round to the other. The board
SHALL scroll to bring that row to the middle of its height, and to bring its
lifeline into view sideways where it is out of it, and the row SHALL be marked as
the current match. The board SHALL scroll to it smoothly rather than jump, unless
the reader has asked for reduced motion or the row is further away than a smooth
scroll can show without leaving rows blank, when it SHALL jump; the reader's own
scrolling SHALL stay as the platform has it. The buttons SHALL be disabled where nothing matches, and
pressing one with a mouse or a key SHALL leave the focus in the field.

The timeline SHALL also offer a zoom that widens or narrows the axis of
years. The zoom SHALL be a group
of buttons — zoom out, zoom in and Fit — floating over a corner of the board and
staying there while the rows and years scroll beneath it, not a slider in the
toolbar; each press of zoom in or zoom out SHALL change the width of a year by a
fifth, within a fixed range, and Fit SHALL narrow or widen the years to the width
the board has. The column of names and the axis of years SHALL stay in place
while the rows and years scroll beneath and beside them.

#### Scenario: Searching
- **WHEN** the reader types `joliot`
- **THEN** the rows of Frédéric, Irène, Hélène and Pierre Joliot stand out and the
  others fade

#### Scenario: Opening, clearing and closing the search
- **WHEN** the reader presses the search icon, types `joliot`, presses the cross,
  and then presses Escape
- **THEN** the icon is replaced by a field with the focus and no icon beside it,
  the text is erased with the field still open and no row faded, and the field
  closes back to the icon, which has the focus

#### Scenario: Stepping through the matches
- **WHEN** the reader types `joliot` and presses the next button four times
- **THEN** the counter reads `4 matches`, and then `1 / 4` to `4 / 4` as the
  current row moves from Irène's to Frédéric's, Hélène's and Pierre's, each
  scrolled into view

#### Scenario: Gliding to a match
- **WHEN** the reader presses the previous button with `joliot` typed
- **THEN** the board scrolls to Pierre's row through intermediate positions, with
  no blank frame on the way, and jumps there where reduced motion is asked for

#### Scenario: Coming round
- **WHEN** the view is on the last of the four matches and the reader presses
  Enter
- **THEN** the current row is Irène's and the counter reads `1 / 4`

#### Scenario: Going back from the first
- **WHEN** the reader has typed `joliot` and presses Shift+Enter
- **THEN** the current row is Pierre's and the counter reads `4 / 4`

#### Scenario: No results
- **WHEN** the reader types `zzz`
- **THEN** the counter reads `No results`, both buttons are disabled and no row is
  marked

#### Scenario: Zooming with the buttons
- **WHEN** the reader presses zoom in, and then zoom out twice
- **THEN** the axis of years is wider after the first press and narrower than it
  began after the last two, and the buttons stay in the corner of the board while
  the rows scroll

#### Scenario: Fit
- **WHEN** the reader presses Fit
- **THEN** the whole span of years, from the first to the last, is as wide as the
  board beside the column of names, unless the zoom range stops it

### Requirement: The timeline holds up at size

The timeline SHALL keep up with the pointer and with scrolling for a file of
10 000 people: the parts it draws SHALL be those in view and near it, and pointing
at a person SHALL not redraw the rows.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole, and the reader scrolls and
  points at people
- **THEN** the highlight follows the pointer without a visible delay, and the
  timeline holds no more than a few hundred drawn rows at a time

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
timeline SHALL NOT move. A selection made from outside the timeline while the tab was behind another tab, in another mode or not yet drawn SHALL, when the timeline is shown, scroll to the row; one that the reader switched into the view with SHALL also scroll to the row, as the reader has just chosen this view; one restored with the workspace SHALL mark the row without moving a view that has a position. The mark SHALL be unlike the light of pointing and unlike the ring
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

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in Timeline mode is behind another tab and the reader activates
  Irène's row in the index, and then brings the tab to the front
- **THEN** Irène's row is marked selected and scrolled to the middle, and no page was
  opened

#### Scenario: Selected in Source and then shown
- **WHEN** the reader activates Irène's row while the tab is in Source mode, and then
  switches to Timeline mode
- **THEN** her row is marked selected and the timeline is scrolled to it

#### Scenario: Switching to Timeline mode with a selection
- **WHEN** Irène is selected, the timeline was scrolled, the reader switched to
  Graph mode and then back to Timeline mode
- **THEN** Irène's row is marked selected and the timeline is scrolled to it

### Requirement: The find key opens the timeline's search

In Timeline mode the editor's find — the command **Find**, and the key Obsidian
dispatches to the tab for it — SHALL open the search of the timeline: the icon
floating over the board expands into the field, which takes the focus. Where
the field is already open it SHALL only take the focus. It SHALL NOT open the
editor's search panel or change the mode. Replace SHALL NOT be offered.

#### Scenario: Find with the search closed
- **WHEN** the tab of `curie.ged` is in Timeline mode with the search closed and the
  reader presses the find key
- **THEN** the icon is replaced by the field, and the field has the focus

#### Scenario: Find with the search open
- **WHEN** the search is open with `joliot` typed and the focus is elsewhere in
  the timeline, and the reader runs **Find**
- **THEN** the field keeps its text and takes the focus

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
