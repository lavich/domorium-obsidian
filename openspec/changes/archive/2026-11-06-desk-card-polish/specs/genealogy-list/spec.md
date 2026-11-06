## MODIFIED Requirements

### Requirement: The selected row is brought into view

The list SHALL bring the row of the selected record into view when the selection is
one it has not yet marked: a selection made from outside the list — from the record
card, by a link, *Go to record*, or Back and Forward in the card — whether the list is
in view or out of it, and a selection the list meets when it is first drawn, which
includes a tab restored with the workspace, since the list's scroll position is not
saved. Bringing into view SHALL, in this order: switch to the record's kind where the
list shows another; clear the typed filter where it hides
the row; and, where the row is not wholly within the visible rows, scroll it to the
middle of the list's height, without animation.

When the reader returns to the list with the selection unchanged, the list SHALL first
put back the scroll position it left; then, where the row of the selected record is
shown but is not wholly within the visible rows, it SHALL be scrolled to the middle as
above, because the reader has just chosen this view. A filter the reader typed
SHALL NOT be cleared by returning to the list with the selection
unchanged. A selection made by activating a row of the list SHALL change neither the
scroll position, the kind nor the filter. Where the record has no row, the list SHALL
be left as it is, and so it SHALL be on the Places and the Events, where no record has a row of its own: the selection of a
record or a source from a link, the graph, the timeline or the cursor SHALL NOT switch the list away from them, while the selection of a place or of an event SHALL switch the list to the Places or the Events, and bring its row into view. A record or a source that the reader selects in the record card, a person on the card of a place or of an event, for one, SHALL switch the list to the kind of that record and bring its row into view.

#### Scenario: Entering the list with a selection
- **WHEN** a file of 500 people has its 400th person selected in Graph mode and the
  reader switches to List mode
- **THEN** that person's row is drawn, marked selected, and inside the middle half of the
  list's visible height

#### Scenario: A tab restored with a selection
- **WHEN** a file of 500 people has its 400th person selected in a tab in List mode, and
  Obsidian is restarted
- **THEN** that person's row is drawn, marked selected, and inside the middle half of the
  list's visible height

#### Scenario: Returning with the place kept
- **WHEN** nobody is selected, the reader scrolls the list, switches to Graph mode and back
- **THEN** the list is scrolled to the same place

#### Scenario: Returning to a selected row that is out of sight
- **WHEN** the 400th of 500 people is selected, the reader scrolls the list to the top,
  switches to Graph mode and back
- **THEN** the row of the 400th person is inside the middle half of the list's height

#### Scenario: Returning with the row in sight
- **WHEN** Marie is selected, the reader scrolls the 17 people a little, switches to Graph
  mode and back
- **THEN** the list is scrolled to the same place

#### Scenario: A filter kept on returning
- **WHEN** Marie is selected, the filter holds `joliot`, and the reader switches to Graph
  mode and back
- **THEN** the filter still holds `joliot`

#### Scenario: The kind follows the record
- **WHEN** the list shows the people and the reader activates the Curies' family in the
  record card
- **THEN** the list shows the families, with the Curies' row marked selected

#### Scenario: A filter that hides the row
- **WHEN** the filter holds `joliot` and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the filter is empty and Marie's row is marked selected

#### Scenario: The filter stays after a click in the list
- **WHEN** the filter holds `joliot` and the reader clicks Pierre Joliot's row
- **THEN** the filter still holds `joliot`

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in List mode is behind another tab, the reader follows
  `[[curie.ged#@I2@]]` into it, and then brings the tab to the front
- **THEN** Pierre Curie's row is marked selected and in view

#### Scenario: Selected in Source and then shown
- **WHEN** the reader moves the cursor into Marie's record in Source mode, so that she is
  selected, and then switches to List mode
- **THEN** Marie's row is marked selected

#### Scenario: The places stay
- **WHEN** the list shows the places and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the list still shows the places and no row of them is marked, and Marie's row is
  marked once the reader chooses People

#### Scenario: An event selected from outside, out of view
- **WHEN** the list shows the events of a file of 500 people, scrolled to the top, the reader having selected the birth of the 400th person and then another record, and steps Back in the history to that birth
- **THEN** the row of that birth is marked and in view

#### Scenario: An event selected from outside, hidden by the filter
- **WHEN** the reader selected an event, then another record, typed a filter that hides that event's row, and steps Back to the event
- **THEN** the filter is cleared and the row is marked and in view

#### Scenario: The events stay
- **WHEN** the list shows the events and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the list still shows the events and no row of them is marked

#### Scenario: A place selected among the events
- **WHEN** the list shows the events and the reader presses `Paris, France` in the Places section of Marie's card
- **THEN** the list shows the places with the row of `Paris, France` marked and in view

#### Scenario: A person pressed in the card of a place
- **WHEN** the list shows the places, `Paris, France` is selected, and the reader presses Pierre Curie in the card of that place
- **THEN** the list shows the people with the row of Pierre Curie marked and in view

#### Scenario: A family pressed in the card of a place
- **WHEN** the list shows the places, `Sceaux, France` is selected, and the reader presses the Curies in the row of their marriage in the card of that place
- **THEN** the list shows the families with the row of the Curies' family marked and in view

#### Scenario: The record pressed in the card of an event
- **WHEN** the list shows the events, Marie's birth is selected, and the reader presses her name in its card
- **THEN** the list shows the people with the row of Marie marked and in view

#### Scenario: An event selected among the places
- **WHEN** the reader selected Marie's birth, then `Paris, France` in the card, so that the list shows the places, and steps Back in the history
- **THEN** the list shows the events with the row of Marie's birth marked and in view
