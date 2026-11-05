## ADDED Requirements

### Requirement: A person's card is marked as selected

The graph SHALL mark one person's card as **selected** when the person is the
tab's selected record, however it was selected: by activating a card, from a
row of the list, from the record card, by a link or by the cursor in Source mode. Where
the selection came from outside the graph, the view SHALL centre on the card at a
readable zoom, gliding there rather than jumping unless the reader has asked for
reduced motion or the card is further away than a glide can show without a streak,
as stepping to a match does; where it came from activating a card of the graph, the
view SHALL NOT move. A selection made from outside the graph while the tab was behind another tab, in another mode or not yet drawn SHALL, when the graph is shown, centre on the card; one that the reader switched into the view with, SHALL also centre on the card, as the reader has just chosen this view; one restored with the workspace SHALL mark the card without moving a view that has a position. The mark SHALL be unlike the light of pointing and unlike the ring of the
search's current match, SHALL stay while the pointer lights other people and while
the reader searches, and SHALL stay until another record is selected or the
selection ends. Where the person is not in the branch shown and the view is asked
to move to them, the graph SHALL show their branch, with the way back to the whole
file. The selection SHALL belong to the person, not to what is drawn: a card out of
view, outside a scope the reader has narrowed, or absent from a text that has
changed SHALL show the mark again when it is drawn, and every card of a person drawn
more than once SHALL carry it. Searching, and changing the scope, SHALL NOT end it.
Selecting SHALL NOT open a page, change the mode or write to the file.

#### Scenario: Selecting Pierre from the list
- **WHEN** the tab is in List mode, the reader activates Pierre Curie's row, and then
  switches to Graph mode
- **THEN** his card is marked selected and centred, and the record card shows him

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
- **WHEN** Pierre Curie is selected and the reader activates Irène's card
- **THEN** only Irène's card is marked selected

#### Scenario: A person outside the branch
- **WHEN** the graph shows Marie's branch with zero generations of ancestors and
  zero of descendants and the reader follows `[[curie.ged#@I16@]]`
- **THEN** the graph shows Hélène's branch, with her card selected

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in Graph mode is behind another tab and the reader follows
  `[[curie.ged#@I2@]]`, and then brings the tab to the front
- **THEN** the graph shows his card selected and centred, and no page was opened

#### Scenario: Selected in Source and then shown
- **WHEN** the reader follows `[[curie.ged#@I2@]]` while the tab is in Source mode,
  and then switches to Graph mode
- **THEN** his card is marked selected and the graph is centred on it

#### Scenario: Switching to Graph mode with a selection
- **WHEN** Marie is selected, the graph was zoomed in and moved, the reader
  switched to Timeline mode and then back to Graph mode
- **THEN** Marie's card is marked selected and the graph is centred on it

#### Scenario: Restored with the workspace
- **WHEN** Marie is selected in a tab in Graph mode, zoomed in and moved, and
  Obsidian is restarted
- **THEN** the graph is at that zoom and position, with Marie's card marked

## REMOVED Requirements

### Requirement: A selected card

**Reason**: Its scenarios named the Index's row, which is gone, and a scenario cannot be renamed in place; the requirement is restated under a new name, with a row of the list and the links the Index's scenarios stood for.

**Migration**: "A person's card is marked as selected".
