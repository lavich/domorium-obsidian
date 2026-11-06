## MODIFIED Requirements

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
