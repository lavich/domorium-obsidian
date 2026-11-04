## MODIFIED Requirements

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
and its place. Events other than births, marriages and deaths SHALL be shown or
hidden together by one switch, on by default.

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
the current match. The buttons SHALL be disabled where nothing matches, and
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
