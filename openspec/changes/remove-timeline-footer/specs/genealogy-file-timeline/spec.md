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

The timeline SHALL offer a search by name that fades the rows that do not match,
and a zoom that widens or narrows the axis of years. The zoom SHALL be a group
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

#### Scenario: Zooming with the buttons
- **WHEN** the reader presses zoom in, and then zoom out twice
- **THEN** the axis of years is wider after the first press and narrower than it
  began after the last two, and the buttons stay in the corner of the board while
  the rows scroll

#### Scenario: Fit
- **WHEN** the reader presses Fit
- **THEN** the whole span of years, from the first to the last, is as wide as the
  board beside the column of names, unless the zoom range stops it
