## RENAMED Requirements
- FROM: `### Requirement: The person under the pointer and their family stand out`
- TO: `### Requirement: A click on a person lights their family`

## MODIFIED Requirements
### Requirement: A click on a person lights their family

Pointing at a person SHALL NOT light anyone or fade anyone: the pointer resting on
a name or a lifeline, moving over the rows, or the keyboard's focus arriving on a
name SHALL leave every row as it is. The row under the pointer MAY take the
background a row takes under the pointer, and a mark its tooltip, and the year
cursor and the ages SHALL follow the pointer as before; none of these fades
anyone.

A click on a person's name or lifeline with a mouse or a pen, and Enter or Space on
a name, SHALL select that person, as `A name or a lifeline selects a record` says,
and light them: highlight their row and lifeline, their parents, spouses and
children, and fade everyone else, and draw an arrow from each parent's row to that
person's birth and from that person's row to each child's birth. No arrows SHALL be
drawn for anyone else. The light SHALL be put on at once, with no wait for the
pointer to rest, and SHALL stay until the reader clicks anywhere on the board that
is not a person or a mark, presses Escape with the focus in the timeline, clicks
another person, whom the light then moves to, changes the scope or the mode, selects
another record by any other way (an index row, the record card, a link, the cursor
in Source) or ends the selection. Clicking on empty space, or Escape, SHALL put the light out and SHALL leave the
selection as it is. At most one person SHALL be lit. Lighting and fading SHALL be
eased in over a moment, except where the reader's system asks for reduced motion.

#### Scenario: Pointing at Marie
- **WHEN** the pointer is moved onto Marie's name and rests there, and then moves
  over several other rows
- **THEN** no row is faded or lit, no arrow is drawn and the year cursor follows
  the pointer

#### Scenario: A sweep across the rows
- **WHEN** the pointer passes over several names and the reader clicks Irène's
- **THEN** only Irène and her family stand out, and they stood out only from the click

#### Scenario: Clicking Marie
- **WHEN** the reader clicks Marie's name
- **THEN** Marie is selected, her parents, Pierre, Irène and Ève stand out, the
  others fade, and arrows join each of her parents' rows to Marie's birth and
  Marie's row to each daughter's birth, and no arrow leaves Pierre's row

#### Scenario: Clicking another person
- **WHEN** Marie is lit and the reader clicks Irène's lifeline
- **THEN** only Irène and her family stand out, and Irène is selected

#### Scenario: Clicking empty space
- **WHEN** Marie is lit and the reader clicks the board where there is no person
  and no mark
- **THEN** no row is faded and no arrow is drawn, and Marie is still selected

#### Scenario: Escape
- **WHEN** Marie is lit and the reader presses Escape with the focus in the timeline
- **THEN** no row is faded, and Marie is still selected

#### Scenario: From the keyboard
- **WHEN** the focus is on Irène's name and the reader presses Enter
- **THEN** Irène is selected and her family stands out; moving the focus to Marie's
  name with Tab lights no one and puts no light out

#### Scenario: A selection made elsewhere
- **WHEN** Marie is lit and the reader selects Pierre in the index
- **THEN** no row is faded, and Pierre is selected

#### Scenario: Changing the scope
- **WHEN** Marie is lit and the reader shows Irène's branch
- **THEN** no row is faded and no arrow is drawn

#### Scenario: Eased, or at once
- **WHEN** Marie is clicked, and then the reader's system asks for reduced motion
  and Irène is clicked
- **THEN** the first light fades in over a moment and the second at once

### Requirement: The timeline holds up at size

The timeline SHALL keep up with the pointer and with scrolling for a file of
10 000 people: the parts it draws SHALL be those in view and near it, and lighting
a person SHALL not redraw the rows.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole, and the reader scrolls, points
  at people and clicks one
- **THEN** the light appears without a visible delay, and the timeline holds no
  more than a few hundred drawn rows at a time

### Requirement: The timeline on a phone

On a phone the timeline SHALL fit the screen's width, with a narrower column of
names and the years scrolling sideways. Touching a lifeline SHALL light that
person and their family, as a click does, and place the year cursor where it was
touched, without selecting them; touching it again SHALL select the person as
activating it does on a desktop, and open the right drawer on their card, the
light staying. Touching empty space SHALL put the light out. Touching a
mark SHALL show its event, with the way to its lines in the source.

#### Scenario: Touching Marie's lifeline
- **WHEN** the reader touches Marie's lifeline on a phone, and then touches it
  again
- **THEN** her family stands out with the cursor at the touched year, and then
  Marie is selected, her family still stands out and the right drawer shows her card

#### Scenario: Touching empty space
- **WHEN** Marie's family stands out after a touch and the reader touches the
  board where there is no person and no mark
- **THEN** no row is faded

### Requirement: A selected row

The timeline SHALL mark one person's row as **selected** when the person is the
tab's selected record, however it was selected: by activating a name or a lifeline,
from an index row, from the record card, by a link or by the cursor in Source mode.
Where the selection came from outside the timeline, the row SHALL be brought to the
middle of the board's height, and its lifeline into view sideways where it is out of
it, smoothly unless the reader has asked for reduced motion or the row is further
away than a smooth scroll can show without leaving rows blank, as stepping to a
match does; where it came from activating a name or a lifeline of the timeline, the
timeline SHALL NOT move. A selection made from outside the timeline while the tab was behind another tab, in another mode or not yet drawn SHALL, when the timeline is shown, scroll to the row; one that the reader switched into the view with SHALL also scroll to the row, as the reader has just chosen this view; one restored with the workspace SHALL mark the row without moving a view that has a position. The mark SHALL be unlike the light of a click and unlike the ring
of the search's current match, SHALL stay while the light is on another person,
which only a phone's first touch can cause, and while the reader searches, and SHALL stay until another record is selected or the
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
- **WHEN** Irène is selected, the reader touches Marie's lifeline on a phone and
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

### Requirement: A name or a lifeline selects a record, and a mark leads to the source

Activating a person's name or lifeline SHALL select that person and light their
family as `A click on a person lights their family` says: the tab SHALL stay
in Timeline mode, SHALL open no page and no other tab, and the row SHALL be marked
as selected and shown in the record card of the right sidebar. The timeline SHALL
NOT move when it is a row of the timeline that was activated. Activating a mark
SHALL show the lines of its event in the source: the tab leaves Timeline mode for
Source mode with those lines selected and in view.

#### Scenario: From the timeline to Irène's card
- **WHEN** the tab of `curie.ged` is in Timeline mode and the reader activates
  Irène's lifeline
- **THEN** the tab is still in Timeline mode with Irène's row marked selected, the
  record card shows Irène Joliot-Curie, her family stands out, and no other tab
  has opened

#### Scenario: The timeline stays where it is
- **WHEN** the reader has scrolled the timeline until Marie's row is at its edge,
  and activates her name
- **THEN** her row is marked selected and the timeline has not scrolled

#### Scenario: From a mark to the source
- **WHEN** the reader activates the mark of Marie's birth
- **THEN** the tab is in Source mode with her `1 BIRT` lines selected — `1 BIRT`,
  `2 DATE 7 NOV 1867` and `2 PLAC Warsaw, Congress Poland` — and in view
