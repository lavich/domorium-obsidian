## ADDED Requirements

### Requirement: The timeline of a file is a tab of its own

The plugin SHALL offer a view, **Timeline of the file**, that shows one GEDCOM
file and opens in a tab of the main area, as Obsidian's graph view does. It SHALL
open from an action in the header of a GEDCOM tab, in either mode, from a command
available while a GEDCOM tab is active, and from that tab's menu. Opening it for a
file that already has a timeline open SHALL reveal that one rather than open a
second.

The timeline SHALL show the file as the plugin reads it, including text typed in
a tab of that file and not yet saved, and SHALL follow every later change to it.
Where no tab of the file is open, it SHALL read the file from the vault. It SHALL
keep its file, scope and zoom across closing and reopening the workspace.

Like the rest of Genealogy mode, nothing in the timeline SHALL write to the file.

#### Scenario: Opening it from the header
- **WHEN** `curie.ged` is open and the reader chooses the timeline action in its
  header
- **THEN** a new tab shows the timeline of `curie.ged`, with a row for each of
  its 17 people

#### Scenario: Opening it twice
- **WHEN** the timeline of `curie.ged` is open in a tab and the reader chooses the
  action again
- **THEN** that tab is shown, and no second timeline opens

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death in the source and the file is
  not yet saved
- **THEN** her lifeline in the timeline ends at the new year

#### Scenario: Restored with the workspace
- **WHEN** the timeline of `curie.ged` is open, zoomed in, on Irène's branch, and
  Obsidian is restarted
- **THEN** the timeline shows Irène's branch at the same zoom

### Requirement: A row is a person, and their lifeline is coloured by sex

Each person the timeline shows SHALL have a row: their name and years of life
beside a horizontal axis of years, and a lifeline from their birth to their
death. A lifeline SHALL be pink for a woman, blue for a man, and grey where the
record states no sex. Where no birth is dated, the lifeline SHALL begin at the
person's earliest dated event; where no death is dated, it SHALL fade out rather
than end, no later than a hundred years after it begins and never after the
present. A person with no dated event at all SHALL have no lifeline, and the
timeline SHALL say how many such people there are.

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
death SHALL each be marked in a colour of its own; every other event SHALL be
marked in one colour with a sign for its kind. A marriage SHALL also join the
rows of the two spouses. An event dated as a period SHALL be drawn as a span from
its first year to its second. An event dated as approximate or as an uncertain
moment — `ABT`, `CAL`, `EST`, `BEF`, `AFT`, `BET` — SHALL be marked so that it
cannot be taken for an exact date; a date stating only a year SHALL be marked as
an exact one.

Pointing at a mark SHALL show the event's name, the date as the file writes it,
and its place. Events other than births, marriages and deaths SHALL be shown or
hidden together by one switch, on by default.

Facts without a date — an occupation, for example — SHALL be written inside the
person's lifeline, cut short where it is too narrow, when the timeline is zoomed
in far enough for them to fit or while the pointer is on that person.

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
- **THEN** `Physicist and chemist` is written inside her lifeline

### Requirement: Rows are ordered by generation and family

Rows SHALL be ordered by generation, the oldest first: a person with no parents
in the file is of the first generation, a child is one below the lower of their
parents, and a spouse whose parents are not in the file shares the generation of
the one they married. Within a generation, children of one family SHALL stand
together, in the order their parents stand above; a spouse whose parents are not
in the file SHALL stand beside the one they married; a person married to someone
of a neighbouring family SHALL stand on the side facing that family; the rest
SHALL follow their years of birth. Generations SHALL NOT be labelled.

#### Scenario: Pierre and Marie side by side
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** the Curie children stand together with Pierre last, the Skłodowski
  children stand together with Marie first, and so Pierre and Marie are
  neighbours

#### Scenario: A spouse from outside the file
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** Frédéric Joliot stands directly beside Irène

### Requirement: The person under the pointer and their family stand out

While the pointer is on a person's name or lifeline, the timeline SHALL
highlight that person's row and lifeline, their parents, spouses and children,
and fade everyone else, and SHALL draw an arrow from each parent's row to that
person's birth and from that person's row to each child's birth. No arrows SHALL
be drawn for anyone else.

#### Scenario: Pointing at Marie
- **WHEN** the pointer is on Marie's name
- **THEN** her parents, Pierre, Irène and Ève stand out, the others fade, and
  arrows join her mother's row to Marie's birth and Marie's row to each
  daughter's birth

### Requirement: A year cursor follows the pointer

While the pointer is over the lifelines, the timeline SHALL draw a line at the
year under it, name that year on the axis, and say how many of the people shown
were alive in it. On the lifeline of each person alive that year it SHALL show
their age in it: the year less the year of birth, marked as approximate where the
birth date does not state both day and month or is itself approximate. No age
SHALL be shown anywhere else in the timeline.

#### Scenario: 1906
- **WHEN** the cursor is on 1906 in the timeline of `curie.ged`
- **THEN** Marie's lifeline shows 39 and Irène's shows 9, and the timeline says
  how many people were alive in 1906

#### Scenario: A birth known only by its year
- **WHEN** a person was born in `1832` and the cursor is on 1900
- **THEN** their age is shown as approximately 68

### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's row, to show only that
person's branch: their ancestors up to a number of generations, their
descendants down to a number of generations, and the spouses of everyone so
shown. Both numbers SHALL start at two and be changed in steps of one, from zero
up. The timeline SHALL say whose branch it shows and how many of the file's
people that is, and SHALL return to the whole file on request.

A file of more than 500 people SHALL open on the branch of the person shown by
the GEDCOM tab the timeline was opened from — the page's person in Genealogy
mode, the person at the cursor in Source mode — or of the first person the file
declares where neither names one. A smaller file SHALL open on all of it.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the timeline of `curie.ged`
- **THEN** her parents and grandparents, Frédéric, and their two children are
  shown, and the timeline says this is 10 of 17 people

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open on a person's page and the reader opens
  its timeline
- **THEN** the timeline shows that person's branch, with the way back to the
  whole file

### Requirement: The timeline leads to the page and to the source

Activating a person's name or lifeline SHALL show that person in the GEDCOM tab
of the file, as a row of the index does: their page in Genealogy mode, the
cursor on their record in Source mode. Activating a mark SHALL show the lines of
its event in the source. Where no tab of the file is open, one SHALL be opened.
The timeline tab SHALL stay open.

#### Scenario: From the timeline to Irène's page
- **WHEN** the GEDCOM tab of `curie.ged` is in Genealogy mode and the reader
  activates Irène's lifeline
- **THEN** that tab shows Irène's page, and the timeline stays open in its own
  tab

#### Scenario: From a mark to the source
- **WHEN** the reader activates the mark of Marie's birth
- **THEN** the GEDCOM tab shows the source with her `1 BIRT` lines selected

### Requirement: Finding a person and zooming

The timeline SHALL offer a search by name that fades the rows that do not match,
and a zoom that widens or narrows the axis of years. The column of names and the
axis of years SHALL stay in place while the rows and years scroll beneath and
beside them.

#### Scenario: Searching
- **WHEN** the reader types `joliot`
- **THEN** the rows of Frédéric, Irène, Hélène and Pierre Joliot stand out and the
  others fade

### Requirement: The timeline holds up at size

The timeline SHALL keep up with the pointer and with scrolling for a file of
10 000 people: the parts it draws SHALL be those in view and near it, and pointing
at a person SHALL not redraw the rows.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole, and the reader scrolls and
  points at people
- **THEN** the highlight follows the pointer without a visible delay, and the
  timeline holds no more than a few hundred drawn rows at a time

### Requirement: The timeline on a phone

On a phone the timeline SHALL fit the screen's width, with a narrower column of
names and the years scrolling sideways. Touching a lifeline SHALL highlight that
person and their family and place the year cursor where it was touched; touching
it again SHALL show the person as activating it does on a desktop. Touching a
mark SHALL show its event, with the way to its lines in the source.

#### Scenario: Touching Marie's lifeline
- **WHEN** the reader touches Marie's lifeline on a phone, and then touches it
  again
- **THEN** her family stands out with the cursor at the touched year, and then
  her page is shown
