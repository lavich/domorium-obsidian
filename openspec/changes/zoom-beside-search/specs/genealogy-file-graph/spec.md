## MODIFIED Requirements

### Requirement: Finding a person

The graph SHALL offer a search by name that fades the cards that do not match.
The search SHALL be an icon floating over the canvas, in the top corner
beside the zoom buttons, that is replaced by a field when it is pressed, the icon fading away as the
field grows and taking no place beside it, and the field SHALL take the focus; the
graph SHALL NOT have a toolbar for it. The open field SHALL grow away from the
zoom buttons and SHALL NOT cover them. The field SHALL have a cross that
erases the text and leaves the field open. Escape, and the cross of an empty
field, SHALL close the field back to the icon, as SHALL leaving it empty; a
field with text SHALL stay open and keep its matches faded.

The open field SHALL show how many cards match — «4 matches», or «No results»
where none does — and, once the reader has stepped, which match the view is on,
as «3 / 4». Two buttons beside it, previous and next, and Enter and Shift+Enter
in the field, SHALL move the view to the previous and the next match, in the
order of the rows from top to bottom and of the cards from left to right: the
first step forward goes to the first match and the first step back to the last,
and each step past either end comes round to the other. The view SHALL centre on
the card at a readable zoom, and the card SHALL carry a ring of its own, unlike
that of the light of pointing, while the other matches stay lit and the rest
faded. The view SHALL glide there rather than jump, unless the reader has asked
for reduced motion or the card is further away than a glide can show without a
streak, when it SHALL jump; a drag, the wheel or a key SHALL take over from a
glide at the place it has reached. The buttons SHALL be disabled where nothing matches, and pressing one
with a mouse or a key SHALL leave the focus in the field.

#### Scenario: Searching
- **WHEN** the reader types `joliot` in the graph of `curie.ged`
- **THEN** the cards of Frédéric, Irène, Hélène and Pierre Joliot stand out and
  the others fade

#### Scenario: Going from match to match
- **WHEN** the reader has typed `joliot` and presses Enter three times
- **THEN** the view moves to Frédéric's card, then to Irène's, then to Hélène's

#### Scenario: Gliding to a match
- **WHEN** the reader presses the next button with `joliot` typed
- **THEN** the view passes through intermediate positions to Frédéric's card with
  the cards of the whole path already drawn, and a drag begun on the way stops it
  where it is; where reduced motion is asked for the view jumps

#### Scenario: Counting the matches
- **WHEN** the reader types `joliot`, and then presses the next button
- **THEN** the counter reads `4 matches`, and then `1 / 4` with Frédéric's card
  centred and ringed

#### Scenario: Going back past the first match
- **WHEN** the view is on the first of the four matches and the reader presses
  the previous button
- **THEN** the view is on Pierre Joliot's card and the counter reads `4 / 4`

#### Scenario: Coming round after the last match
- **WHEN** the view is on the last of the four matches and the reader presses
  Enter
- **THEN** the view is on Frédéric's card and the counter reads `1 / 4`

#### Scenario: No results
- **WHEN** the reader types `zzz`
- **THEN** the counter reads `No results`, both buttons are disabled and no
  card is ringed

#### Scenario: Opening the search
- **WHEN** the reader presses the search icon in the graph of `curie.ged`
- **THEN** the icon is replaced by a field that has the focus, no search icon
  is left beside it, and the toolbar band above the canvas does not exist

#### Scenario: Clearing the search
- **WHEN** the reader has typed `joliot` and presses the cross
- **THEN** the field is empty and stays open, and no card is faded

#### Scenario: Closing the search
- **WHEN** the field is empty and the reader presses Escape
- **THEN** the field closes back to the icon, which has the focus

#### Scenario: Opening the search beside the zoom
- **WHEN** the reader presses the search icon
- **THEN** the field grows away from the zoom buttons, which stay where
  they were and uncovered

### Requirement: Moving about the graph

The reader SHALL be able to move the graph by dragging it from anywhere, a card
included; a press that moves before it is released SHALL NOT activate what it
began on. A mouse wheel SHALL zoom around the pointer; a trackpad's two-finger
scroll SHALL move the graph and its pinch SHALL zoom; buttons floating over the top
corner of the graph, in the same row as the search icon and right after it, which
stay where they are as it moves, SHALL zoom in and out. **Fit** SHALL show the whole scope where the zoom range allows, and
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

#### Scenario: The search and the zoom side by side
- **WHEN** the graph of `curie.ged` is shown
- **THEN** the search icon and the zoom out, zoom in and Fit buttons are in one row
  in the top corner of the canvas, the buttons to the right of the icon, and none is
  at the bottom of the canvas
