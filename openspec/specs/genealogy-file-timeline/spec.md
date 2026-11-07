# genealogy-file-timeline Specification

## Purpose
TBD - created by archiving change add-file-timeline. Update Purpose after archive.

## Requirements

### Requirement: A person's events are drawn on their lifeline

The timeline SHALL mark on a person's bar each of their dated events, and each dated
event of a family they are a spouse in. A birth, a marriage and a death SHALL each be
marked in a colour of its own, a christening or baptism as a birth and a burial or
cremation as a death; every other event SHALL be marked in one colour with a sign for
its kind. An event dated as a period SHALL be drawn as a span from its first year to
its second, whichever is the earlier; a period with one end, `FROM 1891` or `TO
1894`, SHALL be marked at the year it names. An event dated as approximate or as an
uncertain moment — `ABT`, `CAL`, `EST`, `BEF`, `AFT`, `BET` — SHALL be marked so that
it cannot be taken for an exact date; a date stating only a year SHALL be marked as an
exact one. A marriage SHALL be drawn as a line between the two spouses only as `A
click on a person lights their family` says, and SHALL otherwise be marked on each
spouse's bar alone.

Pointing at a mark SHALL show the event's name, the date as the file writes it, and
its place. Every dated event SHALL be shown; the timeline SHALL have no switch for any
kind of event and no toolbar above the board.

Facts without a date — an occupation, for example — SHALL NOT be written on the
timeline.

#### Scenario: Marie's marriage
- **WHEN** the timeline of `curie.ged` is shown and nobody is selected
- **THEN** the marriage of Pierre and Marie is marked in 1895 on both their bars, and
  no line joins the two bars

#### Scenario: A period
- **WHEN** a person's residence is dated `FROM 1895 TO 1906`
- **THEN** a span from 1895 to 1906 is drawn on their bar

#### Scenario: An approximate birth
- **WHEN** a birth is dated `ABT 1860`
- **THEN** its mark is drawn as uncertain, while a birth dated `1860` is drawn as
  exact

#### Scenario: An occupation
- **WHEN** the pointer is on Marie's bar
- **THEN** `Physicist and chemist` is written nowhere on the timeline

### Requirement: Rows are ordered by generation and family

Rows SHALL be ordered by generation, the oldest first: a person with no parents in the file is of the first generation unless they have children in it, when they are of the generation one above the highest-standing of their children, and a child is one generation below
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

#### Scenario: The Curie file keeps its order
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** every row stands where it stood before, the people of the first generation first

#### Scenario: A man with no parents whose daughter marries down
- **WHEN** a man with no parents in the file has a daughter who marries a man whose father and grandfather are in the file
- **THEN** his row stands among the generation of the husband's father, not among the first

### Requirement: A year cursor follows the pointer

While the pointer is over the bars, the timeline SHALL draw a line at the year under
it and name that year on the axis. On the bar of each person alive that year it SHALL
show the age they reached during it: the year less the year of birth, or of
christening or baptism where no birth is dated, which does not depend on the day or
the month. A person whose death is not recorded SHALL count as alive only up to the
end of their bar, faded or cut. A person whose bar begins at another event SHALL be shown no
age. The age SHALL be marked as approximate where the birth is dated as approximate or
uncertain — `ABT`, `CAL`, `EST`, `BEF`, `AFT`, `BET`. No age SHALL be shown anywhere
else in the timeline, and the timeline SHALL NOT write how many people were alive.

While a person is selected, the cursor's label on the axis SHALL also give that
person's age at the year under the pointer, in the same form, and SHALL give none for
a year before their birth or after their death, or where the person's bar begins at
another event. The label SHALL name no one but the selected person.

#### Scenario: 1906
- **WHEN** the cursor is on 1906 in the timeline of `curie.ged`
- **THEN** Marie's bar shows 39 and Irène's shows 9, and no count of the people alive
  is written anywhere

#### Scenario: A birth known only by its year
- **WHEN** a person was born in `1832` and the cursor is on 1900
- **THEN** their age is shown as 68

#### Scenario: An approximate birth
- **WHEN** a person was born `ABT 1832` and the cursor is on 1900
- **THEN** their age is shown as approximately 68

#### Scenario: The ruler of the selected person
- **WHEN** Marie is selected and the cursor is on 1906 in the timeline of `curie.ged`
- **THEN** the cursor's label on the axis reads 1906 with her age 39

#### Scenario: Before the birth
- **WHEN** Marie is selected and the cursor is on 1850
- **THEN** the cursor's label gives no age

### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from the bar of the selected person, to show only
that person's branch: all their ancestors, all their descendants, and the spouses of
everyone so shown. No number of generations SHALL limit a branch and none SHALL be
offered. The choice
SHALL be a button, Branch, attached to the selected person's bar and not dependent on
pointing, and SHALL be offered for no other bar; the command **Branch of the selected
person** SHALL do what pressing it does, and SHALL be available from the keyboard
whether or not the bar is in the part drawn. The timeline SHALL say whose branch it shows and how many of the file's people with a bar that is, and SHALL return to the whole file on
request. Choosing Branch again on the person whose branch is shown SHALL return to the
whole file, and that person's Branch SHALL read as pressed while their branch is
shown. While the whole file is shown, no line about the scope SHALL be shown. A scope saved with
numbers of generations SHALL be read as the branch of its person.

A file of more than 500 people SHALL show its timeline, the first time the tab does, on
the branch of the person the tab had selected when it was brought to the timeline — in
Source mode, the person of the record at the cursor — or of the first person with a bar the file declares where neither names one. A smaller file SHALL open on all of it. Once the tab
has shown the timeline, the scope the reader leaves it on SHALL be kept, the whole file
included.

#### Scenario: Irène's branch
- **WHEN** Irène is selected in the timeline of `curie.ged` and the reader chooses
  Branch on her bar
- **THEN** her parents and grandparents, Frédéric, and their two children are shown,
  and the timeline says this is 10 of 17 people

#### Scenario: Marie's branch
- **WHEN** Marie is selected and the reader chooses Branch on her bar
- **THEN** her parents, her husband, her daughters, their spouses and their children
  are shown, and the timeline says this is 10 of 17 people, with no control for a
  number of generations

#### Scenario: A saved scope with numbers
- **WHEN** a tab is restored whose saved timeline scope names Marie with `up` 0 and
  `down` 0
- **THEN** the timeline shows Marie's whole branch

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's bar
- **THEN** the whole file is shown with Irène's bar in view, and no line about the
  scope is shown

#### Scenario: Branch on a bar that is not selected
- **WHEN** Marie is selected and the reader looks at Pierre's bar
- **THEN** no Branch button is offered on Pierre's bar

#### Scenario: The command
- **WHEN** Irène is selected and her bar is scrolled out of the part drawn, and the reader
  runs **Branch of the selected person**
- **THEN** her branch is shown, as if Branch had been pressed on her bar

#### Scenario: A large file

- **WHEN** a file of 2 000 people is open in Source mode with the cursor inside one
  person's record and the reader switches the tab to Timeline mode
- **THEN** the timeline shows that person's branch, with the way back to the whole file

#### Scenario: A large file opened as a timeline
- **WHEN** Timeline is the mode the reader last chose and the reader opens a file of
  2 000 people
- **THEN** the timeline shows the branch of the first person the file declares

#### Scenario: The whole file, chosen, stays
- **WHEN** the reader returns a large file's timeline to the whole file, switches to
  Source mode and back to Timeline mode
- **THEN** the whole file is shown

### Requirement: Finding a person and zooming

The timeline SHALL offer a search by name that fades the bars that do not match. The
search SHALL be an icon floating over the board, under the axis and beside the zoom
buttons, that is replaced by a field when it is pressed, the icon fading away as the
field grows and taking no place beside it, and the field SHALL take the focus. The
field SHALL have a cross that erases the text and leaves the field open; Escape, and
the cross of an empty field, SHALL close it back to the icon, as SHALL leaving it
empty, while a field with text SHALL stay open and keep its matches lit and the other
bars faded.

The open field SHALL show how many bars match — «4 matches», or «No results» where none
does — and, once the reader has stepped, which match the view is on, as «3 / 4». Two
buttons beside it, previous and next, and Enter and Shift+Enter in the field, SHALL
move to the previous and the next match, in the order of the rows: the first step forward goes to the first match and the first step back
to the last, and each step past either end comes round to the other. The board SHALL
scroll to bring that bar's row to the middle of its height, and to bring the bar into
view sideways where it is out of it, and the bar SHALL be marked as the current match.
The board SHALL scroll to it smoothly rather than jump, unless the reader has asked for
reduced motion or the row is further away than a smooth scroll can show without leaving
rows blank, when it SHALL jump; the reader's own scrolling SHALL stay as the platform
has it. A person with no bar SHALL NOT match. The buttons SHALL be disabled where nothing matches, and pressing one with a
mouse or a key SHALL leave the focus in the field.

The timeline SHALL also offer a zoom that widens or narrows the axis of years. The zoom
SHALL be a group of buttons — zoom out, zoom in and Fit — floating over the top corner of
the board, inside the same bordered box as the search icon, right after it, and staying there while
the rows and years scroll beneath it, not a slider in the toolbar; each press of zoom in or zoom out SHALL change the width of a year by a fifth,
within a fixed range, and Fit SHALL narrow or widen the years to the width the board
has. The axis of years SHALL stay in place while the rows scroll beneath it and the
years scroll along it.

#### Scenario: Searching
- **WHEN** the reader types `joliot`
- **THEN** the bars of Frédéric, Irène, Hélène and Pierre Joliot stand out and the others
  fade

#### Scenario: Opening, clearing and closing the search
- **WHEN** the reader presses the search icon, types `joliot`, presses the cross, and
  then presses Escape
- **THEN** the icon is replaced by a field with the focus and no icon beside it, the text
  is erased with the field still open and no bar faded, and the field closes back to the
  icon, which has the focus

#### Scenario: Stepping through the matches
- **WHEN** the reader types `joliot` and presses the next button four times
- **THEN** the counter reads `4 matches`, and then `1 / 4` to `4 / 4` as the current bar
  moves from Irène's to Frédéric's, Hélène's and Pierre's, each
  scrolled into view

#### Scenario: Gliding to a match
- **WHEN** the reader presses the previous button with `joliot` typed
- **THEN** the board scrolls to the last match through intermediate positions, with no
  blank frame on the way, and jumps there where reduced motion is asked for

#### Scenario: Coming round
- **WHEN** the view is on the last of the four matches and the reader presses Enter
- **THEN** the current bar is the first match's and the counter reads `1 / 4`

#### Scenario: Going back from the first
- **WHEN** the reader has typed `joliot` and presses Shift+Enter
- **THEN** the current bar is the last match's and the counter reads `4 / 4`

#### Scenario: No results
- **WHEN** the reader types `zzz`
- **THEN** the counter reads `No results`, both buttons are disabled and no bar is marked

#### Scenario: Zooming with the buttons
- **WHEN** the reader presses zoom in, and then zoom out twice
- **THEN** the axis of years is wider after the first press and narrower than it began
  after the last two, and the buttons stay in the corner of the board while the rows
  scroll

#### Scenario: Fit
- **WHEN** the reader presses Fit
- **THEN** the whole span of years, from the first to the last, is as wide as the board,
  unless the zoom range stops it

#### Scenario: The search and the zoom side by side
- **WHEN** the timeline is shown
- **THEN** the search icon and the zoom out, zoom in and Fit buttons are in one bordered box under
  the axis, the buttons to the right of the icon, and none is at the bottom of the board

#### Scenario: Opening the search beside the zoom
- **WHEN** the reader presses the search icon
- **THEN** the field grows away from the zoom buttons, which stay where they
  were and uncovered

#### Scenario: The buttons of the box are one size
- **WHEN** the search and the zoom buttons are shown
- **THEN** the search icon and the zoom out, zoom in and Fit buttons are squares of one size, at least 44
  pixels on a phone

#### Scenario: The zoom on a phone while the search is open
- **WHEN** the reader opens the search on a phone
- **THEN** the zoom buttons are hidden while the field is open, so it has the room to be used, and are
  shown again when it closes

### Requirement: The timeline holds up at size

The timeline SHALL keep up with the pointer and with scrolling for a file of 10 000
people: the parts it draws SHALL be the rows and the years in view and near them, a
bar wholly outside them SHALL NOT be drawn, and lighting a person SHALL not redraw the
rows.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole, and the reader scrolls, points at
  people and clicks one
- **THEN** the light appears without a visible delay, and the timeline holds no more than
  a few hundred drawn bars at a time

#### Scenario: Scrolling along the axis
- **WHEN** the reader scrolls the board sideways by several screens
- **THEN** the bars and names drawn are those under the part in view, and their number
  does not grow with the span of the file

### Requirement: The timeline on a phone

On a phone the timeline SHALL fit the screen's width, with the years scrolling sideways
and the names written inside the bars, and SHALL NOT depend on pointing. A pinch with two
fingers SHALL widen or narrow the axis of years about the point between them, within the
range of the zoom buttons, without zooming the page; the axis SHALL follow the fingers while they move, and settle where they lift. Touching a bar SHALL light that
person and their family, as a click does, show the tooltip of the bar, and place the year
cursor where it was touched, without selecting them; touching it again SHALL select the
person as activating it does on a desktop, and open the right drawer on their card, the
light staying. Touching empty space SHALL put the light out and close the tooltip.
Touching a mark SHALL show its event, with the way to its lines in the source.

#### Scenario: Touching Marie's lifeline
- **WHEN** the reader touches Marie's bar on a phone, and then touches it again
- **THEN** her family stands out with the cursor at the touched year and her tooltip
  shown, and then Marie is selected, her family still stands out and the right drawer
  shows her card

#### Scenario: Touching empty space
- **WHEN** Marie's family stands out after a touch and the reader touches the board where
  there is no person and no mark
- **THEN** no bar is faded and the tooltip is closed

#### Scenario: A pinch
- **WHEN** the reader spreads two fingers on the board
- **THEN** the axis of years is wider about the point between the fingers, the page has
  not zoomed, and the zoom stops where the zoom buttons would

### Requirement: The timeline is a mode of the file's tab

A GEDCOM tab SHALL offer a **Timeline** mode that shows the whole of its file as the
timeline of the file, in the tab itself, with no tab of its own. The tab SHALL enter it
from the mode control in its header, from a command, and from the tab's menu, as the
requirement on the mode control of a GEDCOM tab says. Entering it SHALL NOT open another
tab.

The timeline SHALL show the file as the tab holds it, including text typed in the tab and
not yet saved, and SHALL show every later change to it: at once while the tab is in view,
and the next time it is brought into view otherwise. It SHALL keep its scope, zoom and
scroll position across leaving the mode and coming back and across closing and reopening
the workspace, and SHALL stay on the file when it is renamed or moved, as the tab does.

Like the rest of the plugin's genealogy modes, nothing in the timeline SHALL write to the
file.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Source mode and the reader chooses Timeline from the
  mode control in its header
- **THEN** the same tab shows the timeline of `curie.ged`, with a bar for each of its 17
  people, and no new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death in Source mode, the file is not yet
  saved, and the reader switches to Timeline mode
- **THEN** her bar in the timeline ends at the new year

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in Timeline mode, zoomed in, on Irène's branch, scrolled down and to
  the right, and the reader switches to Source mode and then to Timeline mode again
- **THEN** the timeline shows Irène's branch at the same zoom, scrolled to the same place

#### Scenario: The file is renamed
- **WHEN** the tab of `curie.ged` is in Timeline mode and the file is renamed to
  `family.ged`
- **THEN** the tab is named `family.ged` and still shows the timeline

#### Scenario: Restored with the workspace
- **WHEN** a tab of `curie.ged` is in Timeline mode, zoomed in, on Irène's branch, and
  Obsidian is restarted
- **THEN** the tab shows the timeline of Irène's branch at the same zoom

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

### Requirement: A bar selects a record, and a mark leads to the source

Activating a person's bar SHALL select that person and light their family as `A click on
a person lights their family` says: the tab SHALL stay in Timeline mode, SHALL open no
page and no other tab, and the bar SHALL be marked as selected and shown in the record
card of the right sidebar. The timeline SHALL NOT move when it is a bar of the timeline
that was activated. Activating a mark SHALL show the lines of its event in the source: the
tab leaves Timeline mode for Source mode with those lines selected and in view.

#### Scenario: From the timeline to Irène's card
- **WHEN** the tab of `curie.ged` is in Timeline mode and the reader activates Irène's bar
- **THEN** the tab is still in Timeline mode with Irène's bar marked selected, the record
  card shows Irène Joliot-Curie, her family stands out, and no other tab has opened

#### Scenario: The timeline stays where it is
- **WHEN** the reader has scrolled the timeline until Marie's bar is at its edge, and
  activates it
- **THEN** her bar is marked selected and the timeline has not scrolled

#### Scenario: From a mark to the source
- **WHEN** the reader activates the mark of Marie's birth
- **THEN** the tab is in Source mode with her `1 BIRT` lines selected — `1 BIRT`, `2 DATE 7
  NOV 1867` and `2 PLAC Warsaw, Congress Poland` — and in view

### Requirement: A click on a person lights their family

Pointing at a person SHALL NOT light anyone or fade anyone: the pointer resting on a bar,
moving over the rows, or the keyboard's focus arriving on a bar SHALL leave every bar as
it is. The bar under the pointer MAY take the emphasis a bar takes under the pointer, and a
mark its tooltip, and the year cursor and the ages SHALL follow the pointer as before; none
of these fades anyone.

A click on a person's bar with a mouse or a pen, and Enter or Space on a focused bar, SHALL
select that person, as `A bar selects a record` says, and light them:
highlight the bars of their whole branch — their ancestors, their descendants and the
spouses of everyone so shown — and fade everyone else, and draw the links of that branch.
Those SHALL be, for each parent and child within the branch, a vertical line from the
parent's bar to the child's bar at the year of the child's birth, ending in an arrowhead
on the child's bar; and, for each marriage within the branch, a dashed vertical line
between the two bars at the year of the marriage — where the marriage is undated, at the year of the first child the two share
— with a dot at each end and no arrowhead. A link whose two bars are not both drawn SHALL
be drawn as far as the edge of the part shown. The two parents' lines to one child SHALL
not lie on one another. The three kinds of line SHALL differ in more than colour: a line to
a parent or a child SHALL be solid with an arrowhead, a marriage dashed with dots. No link
SHALL be drawn for anyone outside the branch. The light SHALL be put on at once, with no wait for the
pointer to rest, and SHALL stay until the reader clicks anywhere on the board that is not a
person or a mark, presses Escape with the focus in the timeline, clicks another person,
whom the light then moves to, changes the scope or the mode, selects another record by any
other way (the record card, a link, the cursor in Source) or ends the selection. Clicking on
empty space, or Escape, SHALL put the light out and SHALL leave the selection as it is. At
most one person SHALL be lit. Lighting and fading SHALL be eased in over a moment, except
where the reader's system asks for reduced motion.

#### Scenario: Pointing at Marie
- **WHEN** the pointer is moved onto Marie's bar and rests there, and then moves over
  several other bars
- **THEN** no bar is faded or lit, no link is drawn and the year cursor follows the pointer

#### Scenario: A sweep across the rows
- **WHEN** the pointer passes over several bars and the reader clicks Irène's
- **THEN** only Irène's branch stands out, and it stood out only from the click

#### Scenario: Clicking Marie
- **WHEN** the reader clicks Marie's bar
- **THEN** Marie is selected, her parents, Pierre, Irène, Ève, their spouses and Hélène
  and Pierre Joliot stand out, the others fade, a solid line with an arrowhead falls
  from each of her parents' bars to her bar at 1867, from her bar and Pierre's to each
  daughter's bar, and from each of Irène's and Frédéric's bars to each of their
  children's, a dashed line joins her bar to Pierre's in 1895, and nothing is drawn
  from Eugène's bar

#### Scenario: A marriage with no date
- **WHEN** two spouses' marriage is undated and their first child was born in 1900
- **THEN** the dashed line joining their bars stands at 1900 when either is selected

#### Scenario: Clicking another person
- **WHEN** Marie is lit and the reader clicks Irène's bar
- **THEN** only Irène's branch stands out, and Irène is selected

#### Scenario: Clicking empty space
- **WHEN** Marie is lit and the reader clicks the board where there is no person and no mark
- **THEN** no bar is faded and no link is drawn, and Marie is still selected

#### Scenario: Escape
- **WHEN** Marie is lit and the reader presses Escape with the focus in the timeline
- **THEN** no bar is faded and no link is drawn, and Marie is still selected, with her Branch button and her age on the cursor's label

#### Scenario: From the keyboard
- **WHEN** the focus is on Irène's bar and the reader presses Enter
- **THEN** Irène is selected and her branch stands out; moving the focus to Marie's bar with
  Tab lights no one and puts no light out

#### Scenario: A selection made elsewhere
- **WHEN** Marie is lit and the reader selects Pierre among her relatives in the record card
- **THEN** no bar is faded, and Pierre is selected

#### Scenario: Changing the scope
- **WHEN** Marie is lit and the reader shows Irène's branch
- **THEN** no bar is faded and no link is drawn

#### Scenario: Eased, or at once
- **WHEN** Marie is clicked, and then the reader's system asks for reduced motion and Irène
  is clicked
- **THEN** the first light fades in over a moment and the second at once

### Requirement: The axis of years is set apart from the board and carries ticks

The band of years SHALL have a line under it separating it from the rows, and SHALL use
the theme's colours only. There SHALL be no corner at its left, since no column of names
stands there.

The axis SHALL carry ticks rising from its bottom edge: a short one for every year, a medium
one for every fifth year and a long one for every tenth year. Short ticks SHALL be drawn only
where a year is at least 4.5 pixels wide. Ticks SHALL NOT depend on the labels: every labelled
year SHALL have a long tick, the labels SHALL sit above the ticks without touching them, and
the year cursor's label SHALL be drawn over the ticks. A long tick SHALL be in line with the
plot's gridline for its year. Ticks SHALL be drawn only for the years in and near the part of
the board in view, in a handful of shapes and not one element for each, and SHALL NOT be drawn
for a kind of tick of which there are more than a thousand there.

#### Scenario: The header is not one smear
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** a line runs under the axis, separating it from the rows, and the axis begins at
  the board's left edge

#### Scenario: Ticks at the initial zoom
- **WHEN** the axis is at the initial zoom and shows 1900 to 1920
- **THEN** it has a long tick on 1900, 1910 and 1920, a medium one on 1905 and 1915, and a
  short one on each of the other sixteen years

#### Scenario: Ticks at a narrow zoom
- **WHEN** a year is narrower than 4.5 pixels
- **THEN** the axis has the medium and long ticks and no short ones

#### Scenario: Ticks follow the window
- **WHEN** the reader scrolls the board sideways by several screens
- **THEN** the axis has ticks under the part in view, and the number of shapes that hold them
  does not grow with the span of the file

#### Scenario: The cursor over the ticks
- **WHEN** the pointer is over the bars
- **THEN** the year's label on the axis is drawn over the ticks, which it hides where it is

### Requirement: A person's bar is marked as selected

The timeline SHALL mark one person's bar as **selected** when the person is the tab's selected
record, however it was selected: by activating a bar, from a row of the list, from the record
card, by a link or by the cursor in Source mode. Where the selection came from outside the
timeline, the bar's row SHALL be brought to the middle of the board's height, and the bar into
view sideways where it is out of it, smoothly unless the reader has asked for reduced motion or
the row is further away than a smooth scroll can show without leaving rows blank, as stepping
to a match does; where it came from activating a bar of the timeline, the timeline SHALL NOT
move. A selection made from outside the timeline while the tab was behind another tab, in
another mode or not yet drawn SHALL, when the timeline is shown, scroll to the bar; one that the
reader switched into the view with SHALL also scroll to the bar, as the reader has just chosen
this view; one restored with the workspace SHALL mark the bar without moving a view that has a
position. The mark SHALL be on the bar and not a band across its row; it SHALL be unlike the light of a click and unlike the ring of the search's current match, SHALL stay while the light is on another person, which only a phone's first touch
can cause, and while the reader searches, and SHALL stay until another record is selected or the
selection ends. Where the person is not in the branch shown and the view is asked to move to
them, the timeline SHALL show their branch, with the way back to the whole file. The selection
SHALL belong to the person, not to what is drawn: a bar out of view, outside a branch the reader
has narrowed, or absent from a text that has changed SHALL show the mark again when it is drawn.
Searching, and changing the scope, SHALL NOT end it. Selecting SHALL NOT open a page, change the
mode or write to the file.

#### Scenario: Selecting Irène from the list
- **WHEN** the tab is in List mode, the reader activates Irène's row, and then switches to
  Timeline mode
- **THEN** Irène's bar is marked selected and its row scrolled to the middle, and the record
  card shows her

#### Scenario: Selecting from the record card
- **WHEN** the tab is in Timeline mode and the reader activates Irène among Marie's children in
  the record card
- **THEN** Irène's bar is marked selected and its row scrolled to the middle

#### Scenario: The mark outlasts hover and search
- **WHEN** Irène is selected, the reader touches Marie's bar on a phone and types `joliot` and
  steps to the first match
- **THEN** Irène's bar still carries the selected mark, apart from Marie's light and from the
  ring of the current match

#### Scenario: A row out of view and back
- **WHEN** Irène is selected and the reader scrolls until her bar is out of the drawn bars, and
  then back
- **THEN** her bar carries the selected mark again

#### Scenario: A person with no bar
- **WHEN** the reader selects, in the record card, a person who has no dated event
- **THEN** no bar is marked and the timeline does not scroll

#### Scenario: A person outside the branch
- **WHEN** the timeline shows Marie's branch and the reader follows
  `[[curie.ged#@I5@]]`
- **THEN** the timeline shows Zofia's branch, with her bar selected

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in Timeline mode is behind another tab and the reader follows
  `[[curie.ged#@I12@]]`, and then brings the tab to the front
- **THEN** Irène's bar is marked selected and its row scrolled to the middle, and no page was
  opened

#### Scenario: Selected in Source and then shown
- **WHEN** the reader follows `[[curie.ged#@I12@]]` while the tab is in Source mode, and then
  switches to Timeline mode
- **THEN** her bar is marked selected and the timeline is scrolled to it

#### Scenario: Switching to Timeline mode with a selection
- **WHEN** Irène is selected, the timeline was scrolled, the reader switched to Graph mode and
  then back to Timeline mode
- **THEN** Irène's bar is marked selected and the timeline is scrolled to it

### Requirement: A person is a bar with their name inside it

Each person the file declares with an identifier and a dated event SHALL have a row
of their own, in which they are drawn as one **bar** on a horizontal axis of years, from their birth to their death, with
their name written inside it. The years of life SHALL NOT be written on the bar.
Where no birth is dated, the bar SHALL begin at a dated christening or baptism,
else at the person's earliest dated event; where no death is dated, it SHALL end at
a dated burial or cremation, else — where it begins less than a hundred years before
the present and at a dated birth, christening or baptism — run to the current year
and end there in a straight cut edge, as the bar of a person who may be alive, and
else fade out rather than end, a hundred years after it begins. A start or an end dated as
approximate or uncertain — `ABT`, `CAL`, `EST`, `BEF`, `AFT`, `BET` — SHALL be drawn
soft, so that it cannot be taken for an exact date, while a date stating only a year
SHALL be drawn as an exact one.

A name wider than the part of its bar that is not faded SHALL be cut, with an ellipsis,
so that it ends inside that part, and SHALL never be written beyond the bar; where not
even an ellipsis fits, no name SHALL be written on the bar. The whole name SHALL be in the
tooltip of the bar. Marks
and spans of events SHALL be drawn along the bar's lower edge and SHALL NOT cover the
name. The timeline SHALL NOT draw a column of names.

A person with no dated event at all SHALL have no row and no bar, and the timeline SHALL NOT mention them.

#### Scenario: Marie's bar
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** a bar runs from 1867 to 1934 with `Marie Skłodowska-Curie` written inside
  it and no years written on it, and no column of names stands beside the board

#### Scenario: A person who may be alive
- **WHEN** a person's birth is dated 1990, no death is recorded and the year is 2026
- **THEN** their bar runs from 1990 to 2026 and ends in a straight cut edge, without a
  fade

#### Scenario: A death not recorded long ago
- **WHEN** a person's birth is dated 1850 and no death, burial or cremation is recorded
- **THEN** their bar begins in 1850 and fades out in 1950 instead of ending

#### Scenario: An approximate birth
- **WHEN** a birth is dated `ABT 1860`
- **THEN** the bar's start is drawn soft, while a birth dated `1860` starts it sharp

#### Scenario: A name longer than its bar
- **WHEN** a person lived twenty years and their name is wider than twenty years of the axis
- **THEN** the name ends in an ellipsis inside the bar, and nothing is written beyond the bar

#### Scenario: A bar too short for any name
- **WHEN** a person lived two years and not even an ellipsis fits in two years of the axis
- **THEN** their bar has no name written on it, and its tooltip gives the whole name

#### Scenario: Marks beside the name
- **WHEN** Marie's bar carries the marks of her births, marriage and Nobel prizes
- **THEN** her name is readable in full, with no mark across it

#### Scenario: A person with no dated event
- **WHEN** a file declares 17 people, 3 of whom have no dated event
- **THEN** 14 bars are drawn, the timeline says nothing about the other 3, and a search
  for the name of one of them reads `No results`

### Requirement: A bar is coloured by its person's surname

A bar SHALL be coloured by the person's surname, and the colour SHALL depend on the
surname alone: the same surname gives the same colour in every file and every
session. The difference between two colours SHALL grow with the difference between
the two surnames as a reader judges it: surnames that differ only in a gendered
ending — `Лобанов` and `Лобанова`, `Petrov` and `Petrova` — SHALL be coloured almost
alike, a surname written in Cyrillic and in Latin letters — `Жуков` and `Zhukov` —
SHALL be coloured almost alike, and surnames with little in common — `Лобанов` and
`Сидорова` — SHALL be coloured far apart. A surname written with a hyphen is one
surname: `Skłodowska-Curie` and `Joliot-Curie` are two surnames. Case and marks on
letters SHALL NOT change the colour. Two surnames that fall on almost one hue by chance — `Кобзаренко` and
`Лобанов` — SHALL still be told apart by the lightness and the saturation of the colour, which SHALL depend on the first letters of the surname's stem, as the hue does, so that the forms of a surname that begin alike — its two genders, its spelling in two scripts, its endings in a language the plugin has no table for — are the same in every respect. A person with no surname SHALL
be grey. The colour SHALL be drawn in the theme's light and dark
schemes alike, with the name inside the bar readable on it in both.

Colour SHALL never be the only carrier of a fact: the person's name, the surname
included, is written in the bar or beside it.

#### Scenario: One family, one colour
- **WHEN** a file has `Лобанов` and `Лобанова`
- **THEN** their bars are drawn in hues that are almost the same

#### Scenario: Two families
- **WHEN** a file has `Лобанов` and `Сидорова`
- **THEN** their bars are drawn in hues far apart

#### Scenario: Two surnames on one hue
- **WHEN** a file has `Кобзаренко` and `Лобанов`, whose hues differ by less than three degrees
- **THEN** their bars are drawn in colours that differ in lightness or saturation

#### Scenario: Two spellings
- **WHEN** a file has `Жуков` and `Zhukov`
- **THEN** their bars are drawn in hues that are almost the same

#### Scenario: The same everywhere
- **WHEN** two different files hold a person named `Curie`
- **THEN** both bars have the same colour

#### Scenario: Without a surname
- **WHEN** a person's name states no surname
- **THEN** their bar is grey

### Requirement: Pointing at a bar shows the person's name

Pointing at a bar, or at the name on it, with a mouse or a pen SHALL show a
tooltip with the person's full name — given names and surname as the record writes
them — and nothing else. A first touch on a phone SHALL show the same, as `The timeline
on a phone` says, and nothing in the timeline SHALL depend on pointing: a name is
written in the bar or beside it. Where the pointer is on a mark, the tooltip of the mark
SHALL be shown and not the bar's.

#### Scenario: Marie's tooltip
- **WHEN** the pointer rests on Marie's bar in the timeline of `curie.ged`
- **THEN** the tooltip reads `Marie Skłodowska-Curie` and nothing else

#### Scenario: A name cut short
- **WHEN** a person's name is cut with an ellipsis on their bar and the pointer rests on the bar
- **THEN** the tooltip reads the whole name

#### Scenario: On a mark
- **WHEN** the pointer rests on the mark of Marie's birth
- **THEN** the tooltip shows the event, its date and place, and not her name
