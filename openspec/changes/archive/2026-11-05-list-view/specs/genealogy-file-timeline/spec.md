## ADDED Requirements

### Requirement: A person's row is marked as selected

The timeline SHALL mark one person's row as **selected** when the person is the
tab's selected record, however it was selected: by activating a name or a lifeline,
from a row of the list, from the record card, by a link or by the cursor in Source mode.
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

#### Scenario: Selecting Irène from the list
- **WHEN** the tab is in List mode, the reader activates Irène's row, and then switches
  to Timeline mode
- **THEN** Irène's row is marked selected and scrolled to the middle, and the record
  card shows her

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
  and zero of descendants and the reader follows `[[curie.ged#@I16@]]`
- **THEN** the timeline shows Hélène's branch, with her row selected

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in Timeline mode is behind another tab and the reader follows
  `[[curie.ged#@I12@]]`, and then brings the tab to the front
- **THEN** Irène's row is marked selected and scrolled to the middle, and no page was
  opened

#### Scenario: Selected in Source and then shown
- **WHEN** the reader follows `[[curie.ged#@I12@]]` while the tab is in Source mode,
  and then switches to Timeline mode
- **THEN** her row is marked selected and the timeline is scrolled to it

#### Scenario: Switching to Timeline mode with a selection
- **WHEN** Irène is selected, the timeline was scrolled, the reader switched to
  Graph mode and then back to Timeline mode
- **THEN** Irène's row is marked selected and the timeline is scrolled to it

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
another record by any other way (the record card, a link, the cursor
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
- **WHEN** Marie is lit and the reader selects Pierre among her relatives in the record
  card
- **THEN** no row is faded, and Pierre is selected

#### Scenario: Changing the scope
- **WHEN** Marie is lit and the reader shows Irène's branch
- **THEN** no row is faded and no arrow is drawn

#### Scenario: Eased, or at once
- **WHEN** Marie is clicked, and then the reader's system asks for reduced motion
  and Irène is clicked
- **THEN** the first light fades in over a moment and the second at once

## REMOVED Requirements

### Requirement: A selected row

**Reason**: Its scenarios named the Index's row, which is gone, and a scenario cannot be renamed in place; the requirement is restated under a new name, with a row of the list and the links the Index's scenarios stood for.

**Migration**: "A person's row is marked as selected".
