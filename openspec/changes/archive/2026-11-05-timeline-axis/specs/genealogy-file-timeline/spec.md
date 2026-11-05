## ADDED Requirements

### Requirement: The axis of years is set apart from the names and carries ticks

The band of years SHALL be set apart from the corner above the column of names by
a line between them, which continues the line between the names and the rows, and
the header row, the corner and the band together, SHALL have a line under it
separating it from the rows. The corner and the band SHALL use the theme's
colours only.

The axis SHALL carry ticks rising from its bottom edge: a short one for every
year, a medium one for every fifth year and a long one for every tenth year. Short
ticks SHALL be drawn only where a year is at least 4.5 pixels wide. Ticks SHALL NOT
depend on the labels: every labelled year SHALL have a long tick, the labels SHALL
sit above the ticks without touching them, and the year cursor's label SHALL be
drawn over the ticks. A long tick SHALL be in line with the plot's gridline for its
year. Ticks SHALL be drawn only for the years in and near the part of the board in
view, in a handful of shapes and not one element for each, and SHALL NOT be drawn
for a kind of tick of which there are more than a thousand there.

#### Scenario: The header is not one smear
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** a line runs between the corner above the names and the axis, in the
  same place as the line between the names and the rows, and another runs under
  both

#### Scenario: Ticks at the initial zoom
- **WHEN** the axis is at the initial zoom and shows 1900 to 1920
- **THEN** it has a long tick on 1900, 1910 and 1920, a medium one on 1905 and 1915,
  and a short one on each of the other sixteen years

#### Scenario: Ticks at a narrow zoom
- **WHEN** a year is narrower than 4.5 pixels
- **THEN** the axis has the medium and long ticks and no short ones

#### Scenario: Ticks follow the window
- **WHEN** the reader scrolls the board sideways by several screens
- **THEN** the axis has ticks under the part in view, and the number of shapes
  that hold them does not grow with the span of the file

#### Scenario: The cursor over the ticks
- **WHEN** the pointer is over the lifelines
- **THEN** the year's label on the axis is drawn over the ticks, which it hides
  where it is
