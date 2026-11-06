## MODIFIED Requirements

### Requirement: A row selects a record, and the selected row is marked

Activating a row of the list, by a click, a tap, or Enter or Space on a row with the
focus, SHALL select that record in the tab, as the requirement on the selected record
says: the record card shows it, the tab stays in List mode, and no page or other tab is
opened. The row of the selected record SHALL be marked as selected, and as selected to
assistive technology, whichever kind is shown; with nothing selected, or a record that
has no row — a multimedia record — no row SHALL be marked. The mark SHALL follow the
selection however it was made: from the list, from the record card, by a link or by *Go
to record*; and SHALL stay across sorting, filtering and switching the kind, and be
marked again when its row is drawn. A selection made from the list SHALL NOT move the
list. A row of the Places SHALL select its place, which has no xref and is selected under the id
`place:` and its key: the record card shows the place, with its events, each linking to the person
or family it belongs to. A row of the Events SHALL select its event, which has no xref and is selected under the id `event:`, the identifier of its record, the tag of the event, and the number of events of that tag before it on the record: the record card shows the event, with its name and the text it carries, its date, its place, and the sources it cites, the record linking to that record, the place to the place and each source to the source, and with *Show in source*. Only the row of the selected event SHALL be marked, though other events belong to the same record. An edit that leaves no event with that tag and that number SHALL drop the selection: the removal of the only event of its tag on the record, or of the last of them, or of its record. Selecting SHALL NOT write to the file. On a phone, a tap on a row SHALL select the
record and open the right drawer on the card at once: the rule of the graph and the
timeline, that the first touch lights and the second selects, does not apply to rows.

The rows SHALL be drawn as the rows of Obsidian's own file explorer are: inset
from the edges of the list, with the explorer's radius on the hover, the selected
background and the focus ring alike, in the explorer's text size, line height and
vertical padding, one directly below the next with no gap, the first cell at the
size of the explorer's text and the others smaller. The hover and the selected row SHALL
take their colours and weight from the navigation variables Obsidian's themes set, and
the keyboard focus SHALL be drawn as the explorer draws its focused row: a ring in the
focus border colour, in the active tab of a desktop only, and never in the accent
colour. A row SHALL be selected to assistive technology, whatever the theme makes of its
colour, and SHALL NOT have stripes or lines between rows. The height of a row SHALL be
derived from that text size, so that it follows the reader's font size.

#### Scenario: Styled as the explorer's rows
- **WHEN** the list shows the people of `curie.ged` with Pierre Curie selected and the
  pointer over Marie's row
- **THEN** both rows have the explorer's radius, Pierre's has the explorer's active
  background and Marie's its hover background, and no other row is tinted

#### Scenario: The explorer's metrics
- **WHEN** the list shows the people of `curie.ged`
- **THEN** the name in a row is in the explorer's text size, a row is as tall as that
  size times the explorer's line height plus twice its vertical padding, and the next
  row begins where the one above ends

#### Scenario: The keyboard focus
- **WHEN** the reader moves the focus to a row with the arrow keys in the active tab of
  a desktop
- **THEN** the row has a ring in the focus border colour, not in the accent colour, and
  its background is unchanged

#### Scenario: Selecting Pierre in the list
- **WHEN** the tab is in List mode and the reader clicks Pierre Curie's row
- **THEN** the tab is still in List mode, his row is marked selected, the record card
  shows Pierre Curie, and no other tab is open

#### Scenario: A family row
- **WHEN** the reader chooses Families and clicks the Curies' row
- **THEN** the record card shows the Curies' family and that row is marked selected

#### Scenario: A source row
- **WHEN** the reader chooses Sources and clicks `Parish registers of Warsaw`
- **THEN** the record card shows that source and the row is marked selected

#### Scenario: Nothing selected
- **WHEN** the tab is in List mode and nothing is selected
- **THEN** no row is marked

#### Scenario: Selected from the record card
- **WHEN** Marie is selected in List mode and the reader activates Pierre Curie among her
  relatives in the record card
- **THEN** Pierre Curie's row is marked and Marie's is not

#### Scenario: A record with no row
- **WHEN** the reader follows `[[curie.ged#@O5@]]` with the tab in List mode
- **THEN** the card shows the family photograph and no row is marked

#### Scenario: Kept across the modes
- **WHEN** Marie is selected in List mode, and the reader switches to Graph mode and
  back
- **THEN** her card in the graph was marked selected, and her row is marked selected
  again

#### Scenario: The list does not move
- **WHEN** the list is scrolled so that Marie's row is at its edge and the reader clicks
  it
- **THEN** her row is marked selected and the list has not scrolled

#### Scenario: A row on a phone
- **WHEN** the reader taps Marie's row on a phone
- **THEN** the right drawer opens on Marie's card

#### Scenario: A place row
- **WHEN** the reader chooses Places, and clicks `Paris, France`, with Marie selected
- **THEN** the row of `Paris, France` is marked selected, the record card shows `Paris, France`
  with its events, and the tab is still in List mode

#### Scenario: Another place row
- **WHEN** `Paris, France` is marked and the reader clicks `Warsaw, Congress Poland`
- **THEN** only the row of `Warsaw, Congress Poland` is marked

#### Scenario: The place is kept across the modes
- **WHEN** `Paris, France` is marked, and the reader switches to Graph mode and back
- **THEN** the row of `Paris, France` is marked again

#### Scenario: A place in a person's card
- **WHEN** the reader presses `Paris, France` in an entry of the opened timeline of Marie's card
- **THEN** the list shows the places with the row of `Paris, France` marked and in view, and the
  card shows `Paris, France`

#### Scenario: An event row
- **WHEN** the reader chooses Events, and clicks the row of Marie's birth, with Pierre selected
- **THEN** only that row is marked selected, the record card shows the birth with its date,
  `Warsaw, Congress Poland` and the record `Marie Skłodowska-Curie`, and the tab is still in List mode

#### Scenario: Two events of one record
- **WHEN** the row of Marie's birth is marked and the reader clicks the row of her death
- **THEN** only the row of her death is marked, and the card shows her death

#### Scenario: The event is kept across the modes
- **WHEN** the row of Marie's birth is marked, and the reader switches to Graph mode and back
- **THEN** the row of Marie's birth is marked again

#### Scenario: A record selected elsewhere
- **WHEN** the list shows the events and Marie is selected in the graph
- **THEN** no row of the events is marked

#### Scenario: A link in the card of an event
- **WHEN** the reader presses the record in the card of Marie's birth
- **THEN** the card shows Marie, and no row of the events is marked

#### Scenario: An event that an edit removes
- **WHEN** the row of Marie's birth is marked, her record states one birth, and the reader deletes that event in Source mode
- **THEN** no row is marked and the card shows nothing selected

#### Scenario: An earlier event of the same tag removed
- **WHEN** the row of a person's second residence is marked and the reader deletes the first residence in Source mode
- **THEN** the id of the second residence now names no event, and the selection is dropped

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
- **WHEN** the list shows the events and the reader presses `Paris, France` in an entry of the opened timeline of Marie's card
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
