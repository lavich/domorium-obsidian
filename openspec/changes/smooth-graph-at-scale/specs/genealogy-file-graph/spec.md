## MODIFIED Requirements

### Requirement: Pointing at a person lights their family

Pointing at a person's card, or giving it the keyboard focus, SHALL light that
card and the cards of every person of their branch — their ancestors, their
descendants and the spouses of everyone so shown — until the pointer or the focus
leaves. While no more than 3 000 cards are drawn, the light SHALL also fade every
other card. Where more than 3 000 cards are drawn, the light SHALL fade no card:
every lit card SHALL carry an outline in the accent colour, as wide on the screen
at every zoom, and the other cards SHALL stand as they are. A view in which the light
has outlined SHALL go back to the fade only once 2 500 cards or fewer are drawn, so
that a view near the limit does not change with each redraw. In a view where
the light outlines, the card under the pointer, the selected card and the current
match of a search SHALL each stay distinguishable from the outline and from one
another. The lines and the family nodes SHALL be neither lit nor faded: they stay
as they are. The pointer SHALL light a
person only once it has rested on them a moment, and put the light out only once
it has rested off them as long, so that a sweep across cards does not flicker;
the keyboard's focus and a touch SHALL light at once. Lighting, fading and
outlining SHALL be eased in over a moment, except where the reader's system asks
for reduced motion. Lighting SHALL NOT lay the graph out or draw it again.

Pointing at a family node, or giving it the keyboard focus, SHALL show its
spouses, the date of the marriage as the file writes it and its place, or that
it has no date, and how many children the family has.

#### Scenario: Pointing at Marie
- **WHEN** the reader points at Marie's card in the graph of `curie.ged`
- **THEN** the cards of Marie, Władysław, Bronisława Boguska, Pierre Curie, Irène,
  Ève, Frédéric Joliot, Henry Richardson Labouisse, Hélène and Pierre Joliot are
  lit, and the cards of her sisters and brothers, of Eugène Curie and of
  Sophie-Claire fade, while no line and no family node changes

#### Scenario: Pointing at Hélène
- **WHEN** the reader points at Hélène's card
- **THEN** the cards of Hélène, Frédéric and Irène, Pierre Curie and Marie, and
  Eugène, Sophie-Claire, Władysław and Bronisława Boguska are lit, and Ève fades

#### Scenario: Pointing at the Curies' family node
- **WHEN** the reader points at the node between Pierre Curie and Marie
- **THEN** it shows Pierre Curie ⚭ Marie Skłodowska-Curie, married
  `26 JUL 1895` in Sceaux, France, and 2 children

#### Scenario: Pointing in a crowded view
- **WHEN** more than 3 000 cards are drawn and the reader points at a card
- **THEN** the cards of its branch that are drawn are outlined in the accent
  colour, no card fades, and the outline is as wide on the screen at a zoom of
  0.05 as at 0.6

#### Scenario: The same card in a thinner view
- **WHEN** the reader points at a card while 3 000 cards or fewer are drawn
- **THEN** the cards of its branch are lit, the other cards fade, and no card
  carries the outline of a crowded view

#### Scenario: A view that crosses the limit
- **WHEN** a card is lit with more than 3 000 cards drawn and the reader zooms in
  until 2 500 or fewer are drawn
- **THEN** the outlines go and the cards outside the branch fade, with the same
  cards lit

#### Scenario: A view near the limit
- **WHEN** a card is lit with more than 3 000 cards drawn and the reader moves the
  view so that 2 800 are drawn, and then 3 100
- **THEN** the light outlines the branch at both, and no card fades at either

#### Scenario: The selected card and the current match in a crowded view
- **WHEN** more than 3 000 cards are drawn, a card in the lit branch is selected and
  the reader has stepped to a match of a search in the same branch
- **THEN** the selected card and the current match each carry a mark that is as wide
  on the screen as the outline or wider, unlike it and unlike each other, and the card
  under the pointer carries a line wider than the outline

### Requirement: The graph holds up at size

The graph of a file of any size shown whole SHALL be laid out within a time
budget — the ordering of the cards stops improving after a quarter of a second
and the whole optimisation of the layout after half a second, keeping the best found — and SHALL always
finish, however tangled the file, including a file in which one person is their own
ancestor or the same ancestor is reached by many paths, once for each reading of the file and scope:
pointing, dragging, zooming and searching SHALL NOT lay it out again. The graph SHALL draw
only the shapes in view and near it, however the view came there: once a glide has come to
rest, or the view has come in from a wider one, the shapes that lie far from the view SHALL be
taken away, so that a view holds what a view of its size holds. The graph SHALL keep up with
the pointer: while the view is dragged, wheeled, pinched or gliding, the drawn shapes SHALL
be moved as they are, not painted again at each step, and a view that has rested a moment
SHALL be painted sharp at the scale it stands.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole in a view of 1 400 by 900
  pixels, and the reader drags, zooms and points at people
- **THEN** its layout stopped improving within its time budget and finished, the
  highlight follows the pointer
  without a visible delay, the graph holds no more than a few hundred cards at
  its opening size, and no more than a few thousand shapes after **Fit**

#### Scenario: Coming in from Fit
- **WHEN** a file of 10 000 people is shown whole, the reader presses **Fit**, waits
  for the glide to end, and then zooms in to a zoom of 0.6 around a card
- **THEN** no more than a few hundred cards are drawn, as at its opening size, and no
  card far from the view is left drawn

#### Scenario: A glide keeps its path while it runs
- **WHEN** the reader steps to a match whose card is within reach of a glide, in a
  file of 10 000 people shown whole
- **THEN** the cards between where the view was and where it goes are drawn while the
  view glides, and the shapes far from where it comes to rest are taken away once it has

#### Scenario: A move too long to glide
- **WHEN** the reader steps to a match, or presses **Fit**, so far from where the view stands
  that a glide could not show it without a streak
- **THEN** the view jumps and only the shapes in view and near it are drawn

#### Scenario: Moving the view without painting it again
- **WHEN** the reader drags, wheels or pinches the view of a file of 10 000 people
- **THEN** the drawn shapes are moved as a layer and are not painted again at each step

#### Scenario: Sharp once at rest
- **WHEN** the reader zooms in and lets go
- **THEN** within half a second the cards and their names are painted at the scale
  the view stands, not stretched from the scale the zoom began at
