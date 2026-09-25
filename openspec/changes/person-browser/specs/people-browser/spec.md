## Purpose

The list of people in the left sidebar: which document it shows, what a row
tells the reader, what typing into it matches, and what it says when there is
nothing to list.

## ADDED Requirements

### Requirement: The list shows the people of the GEDCOM the reader is looking at

The sidebar SHALL list the people of one GEDCOM document: the one the reader has
in front of them. When the reader moves to another GEDCOM file, the list follows
to that file's people.

Moving to something that is not a GEDCOM file — a note, a setting, a canvas —
SHALL leave the list as it was rather than empty it, so that a reader who steps
into a note to read something comes back to the list they left.

The list SHALL say how many people it is showing.

A person the model reports as unaddressable — a record declaring no
cross-reference — SHALL be left out of the list, having no identifier to open
and no way to be linked to. The model still reports such a record; leaving it
out is this view's decision, not the model's.

#### Scenario: Opening a GEDCOM file
- **WHEN** the reader opens a GEDCOM file holding 17 people and the sidebar view
  is showing
- **THEN** the list shows those 17 people and says there are 17

#### Scenario: Moving to a second GEDCOM file
- **WHEN** the reader moves from one GEDCOM file to another
- **THEN** the list shows the second file's people

#### Scenario: Moving to a note
- **WHEN** the reader moves from a GEDCOM file to a markdown note
- **THEN** the list still shows the GEDCOM file's people

#### Scenario: A record that cannot be addressed
- **WHEN** the document holds an `INDI` record declaring no cross-reference
- **THEN** it is not listed, and the count does not include it

#### Scenario: No GEDCOM has been opened
- **WHEN** the sidebar view is showing, no GEDCOM file has been opened in this
  session, and the vault holds at least one
- **THEN** the first of them is listed, so the view opens on something rather
  than on an instruction

#### Scenario: A vault holding no GEDCOM at all
- **WHEN** the sidebar view is showing and the vault holds no GEDCOM file
- **THEN** it says that opening a GEDCOM file will list its people, and shows
  no list

### Requirement: The reader can see and choose which document, and what of it

The view SHALL carry a bar above the search field naming two things: the
document being listed, and what of that document is being listed.

Each SHALL be a control rather than a label. Choosing another document from the
first SHALL list that document's people without the reader having to open the
file. A vault may hold more than one GEDCOM, and a list of names says nothing
about which tree they belong to.

The first SHALL offer every GEDCOM file in the vault, and SHALL show whichever
document is being listed, however the reader arrived at it — by choosing it
here, or by opening the file.

The second SHALL show what is being listed. Only people are listed in this
change; it exists because families and the rest are the same list with a
different subject, and a reader should be able to see that this is one of
several before there are several.

#### Scenario: Naming the document being listed
- **WHEN** the list is showing the people of `curie.ged`
- **THEN** the bar names `curie.ged`, and names people beside it

#### Scenario: Choosing another document
- **WHEN** the vault holds `curie.ged` and `joliot.ged`, and the reader chooses
  `joliot.ged` from the bar
- **THEN** the list shows that document's people, and the bar names it

#### Scenario: Arriving by opening the file instead
- **WHEN** the reader opens `joliot.ged` in the editor
- **THEN** the bar names `joliot.ged`, as though it had been chosen there

#### Scenario: A vault with one GEDCOM
- **WHEN** the vault holds one GEDCOM file
- **THEN** the bar still names it, and offers nothing else to choose

#### Scenario: Before any GEDCOM has been opened
- **WHEN** the view is opened and no GEDCOM has been opened in this session
- **THEN** the bar names the first of the vault's GEDCOM files, and that
  document is the one listed

### Requirement: A row tells one person from another

Each row SHALL show the person's name, the years they lived where those can be
read, and one place where the record gives one.

The years SHALL be shown as a span, with the missing end left open rather than
guessed: someone born in 1931 whose record states no death reads `1931–`.
Neither year read SHALL leave the years out rather than show an empty span.

A row SHALL NOT lead with the cross-reference identifier. The identifier
addresses the person; it does not name them.

#### Scenario: A person with both years and a place
- **WHEN** a person was born in 1901 in London and died in 1975
- **THEN** their row reads their name, `1901–1975`, and `London`

#### Scenario: A person still living, or whose death is unrecorded
- **WHEN** a person's record states a birth in 1931 and no death
- **THEN** their row reads their name and `1931–`

#### Scenario: A person with nothing but a name
- **WHEN** a person's record carries only a name
- **THEN** their row reads that name alone, with no empty years and no empty
  place

### Requirement: Typing filters the list

The sidebar SHALL carry a search field that filters the list as the reader
types. A person SHALL match when the typed text appears in their name, in any
other name their record carries, in their cross-reference identifier, in either
year, or in a place their record states.

Matching SHALL ignore case. The identifier SHALL match whether or not the reader
types the surrounding `@`.

Clearing the field SHALL restore the whole list.

#### Scenario: Matching a name
- **WHEN** the reader types `curie`
- **THEN** the list shows every person whose name contains that text, whatever
  its case

#### Scenario: Matching an identifier
- **WHEN** the reader types `I1` or `@I1@`
- **THEN** the person declared as `@I1@` is among the matches

#### Scenario: Matching a year or a place
- **WHEN** the reader types `1867`, and then `Warsaw`
- **THEN** the list shows the people whose record states that year, and then
  those whose record states that place

#### Scenario: An identifier that is the start of others
- **WHEN** the reader types `I1` in a document declaring `@I1@`, `@I10@` and
  `@I100@`
- **THEN** all three are among the matches, in document order; ordering an exact
  identifier first is not part of this change

#### Scenario: Nothing matches
- **WHEN** the reader types text no person matches
- **THEN** the list says that no people were found

### Requirement: Choosing a person opens their page

Choosing a row SHALL open that person's Person view. Choosing another row SHALL
show that person, without leaving a second Person view behind.

#### Scenario: Choosing a person
- **WHEN** the reader chooses a row
- **THEN** that person's Person view opens

#### Scenario: Choosing a second person
- **WHEN** the reader chooses another row while a Person view is open
- **THEN** that view shows the second person, and only one Person view is open

### Requirement: The list marks the person the reader is looking at

Where a Person view is showing somebody from the document the list is showing,
that person's row SHALL be marked, so that a reader who has followed a father
and a grandfather can see where in the list they now are.

The mark SHALL follow the reader wherever they moved from: choosing a relative
on the page, or going back, marks the row of whoever is now shown, not the row
last chosen in the list.

At most one row SHALL be marked. A row filtered out of view SHALL not be shown
in order to mark it, and no row SHALL be marked where the person shown belongs
to another document.

#### Scenario: Choosing a person from the list
- **WHEN** the reader chooses a row
- **THEN** that row is marked, and no other row is

#### Scenario: Following a relative on the page
- **WHEN** the reader then opens that person's father from the Person view
- **THEN** the father's row is marked and the first row is not

#### Scenario: Going back
- **WHEN** the reader then goes back
- **THEN** the row of the person now shown is marked again

#### Scenario: A person from another document
- **WHEN** the Person view is showing somebody from a different GEDCOM than the
  list is showing
- **THEN** no row is marked

#### Scenario: The marked person filtered out
- **WHEN** the reader types a filter the marked person does not match
- **THEN** that person is not listed, and no row is marked

### Requirement: The list stays usable on a document of at least twenty thousand people

The sidebar SHALL remain responsive to typing and scrolling on a document
holding at least 20,000 people, which is the size this change is measured
against. Opening such a document SHALL NOT block the application for longer than
reading the document itself already costs.

Nothing is claimed for a document larger than that. A document an order of
magnitude bigger may need work this change does not do.

#### Scenario: A document of twenty thousand people
- **WHEN** the reader opens a GEDCOM file holding 20,000 people
- **THEN** the list appears, scrolls and filters without the interface ceasing
  to answer

### Requirement: The sidebar is reached and restored like any other view

The reader SHALL be able to open the view from the command palette, and the view
SHALL return to where it was when Obsidian restarts. Opening it when it is
already open SHALL reveal the one that exists rather than add a second.

#### Scenario: Opening from the palette
- **WHEN** the reader runs the command that opens the people list
- **THEN** the view appears in the left sidebar and takes the focus

#### Scenario: Running the command with the view already open
- **WHEN** the reader runs that command while the view is open, perhaps in a
  collapsed sidebar
- **THEN** the existing view is revealed, and no second one is created

#### Scenario: Restarting with the view open
- **WHEN** Obsidian restarts with the view open
- **THEN** the view is there, in the place it was
