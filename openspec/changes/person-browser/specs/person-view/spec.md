## Purpose

The page for one person: what it shows of who they were, how it links to the
people around them, how moving between people behaves, and how it returns the
reader to the record in the file.

## ADDED Requirements

### Requirement: The page is a reading of a record, not a copy of it

Person view SHALL be a workspace tab, opened and closed like any other, showing
one person as the GEDCOM document currently states them. It SHALL NOT write to
the document, generate a note, or hold a copy of the person that outlives the
document it was read from.

When the underlying document changes, an open Person view SHALL come to show the
changed record rather than the reading it opened with.

#### Scenario: A person shown as a tab
- **WHEN** the reader opens a person
- **THEN** a workspace tab shows that person, titled with their name

#### Scenario: The record is edited while the page is open
- **WHEN** the reader edits that person's birth year in the GEDCOM file with the
  Person view open
- **THEN** the Person view comes to show the new year

#### Scenario: Nothing is written
- **WHEN** the reader opens a person, follows relatives, and closes the view
- **THEN** the GEDCOM file is unchanged and no note has been created

### Requirement: The page says who the person was

The page SHALL show the person's name as its heading, and below it the span of
years they lived, the dates of birth and death as the record writes them, the
places of birth and death where stated, and their sex where the record states
it.

A field the record does not state SHALL be left out. The page SHALL NOT show an
empty row, a dash, or the word "unknown" to keep its shape.

#### Scenario: A person with a full record
- **WHEN** the record states a birth on 12 Mar 1901 in London and a death on
  7 May 1975 in New York
- **THEN** the page heads with the name and shows both dates and both places

#### Scenario: A person with only a name
- **WHEN** the record carries nothing but `1 NAME John /Smith/`
- **THEN** the page shows `John Smith` and nothing else in that section, and
  does not fail

#### Scenario: Another name the person is known by
- **WHEN** the record carries a second name line
- **THEN** that name is shown as well, marked as another name rather than
  replacing the heading

### Requirement: The page shows the family around the person

The page SHALL show the person's parents, partners and children, each group
named, and each group left out entirely when the record yields nobody for it.

Each person shown in those groups SHALL be shown the way a row in the people
list is: their name and the years they lived.

#### Scenario: A person with parents, a partner and children
- **WHEN** the record resolves to two parents, one partner and two children
- **THEN** the page shows three named groups holding those five people

#### Scenario: A person with no family recorded
- **WHEN** the record points at no family
- **THEN** the page shows no family groups at all, and shows the rest of the
  person normally

#### Scenario: A family the document does not hold
- **WHEN** a family names a child the document does not declare
- **THEN** the page shows the remaining children, states that one reference
  could not be resolved, names the identifier it could not resolve, and does not
  fail

### Requirement: Relatives are the way the reader moves between people

Every person shown in a family group SHALL be openable, and opening one SHALL
show that person in the same Person view rather than in a new tab.

#### Scenario: Following a father
- **WHEN** the reader opens the person shown as a parent
- **THEN** the view shows that parent, and no second Person view is opened

#### Scenario: An unresolved relative
- **WHEN** the reader attempts to open a relative the document does not declare
- **THEN** nothing opens, the view is unchanged, and the reader is told the
  record is not in this file

### Requirement: The reader can retrace the people they visited

Moving from one person to another SHALL be retraceable: a reader who follows a
father and then a grandmother SHALL be able to go back the way they came, and
forward again, without retyping a search or reopening the sidebar.

Going back from the first person a view showed SHALL NOT leave the view showing
nothing.

Which control does this — the application's own Back and Forward, or a control
the page carries — is a design decision, settled by measuring what the
application's own history does with a view of this kind. The application's own
is preferred, so that the reader uses the control they already know, and the
requirement is met either way.

#### Scenario: Walking back up a line
- **WHEN** the reader opens John, then his father William, then William's mother
  Elizabeth, and then goes back twice
- **THEN** the view shows William, and then John

#### Scenario: Forward after going back
- **WHEN** the reader then goes forward
- **THEN** the view shows William again

#### Scenario: Back from where the trail began
- **WHEN** the reader opens one person and goes back
- **THEN** the view does not end up showing nothing

#### Scenario: A person shown after a restart
- **WHEN** Obsidian restarts with a Person view open
- **THEN** the view shows the same person, read afresh from the document

### Requirement: The page shows the events the record carries

The page SHALL show the events the model reports for the person, each named in
the language the plugin speaks, with its date and place as the record writes them
and its own text where it carries one. Events SHALL appear in the order the
record writes them.

The set of structures the model reads as events is named there, not here. A
structure the model does not report as an event SHALL NOT appear in this
section.

An event whose date could not be read as a year SHALL still be shown, with its
date as written.

A person whose record carries no events SHALL be shown without an events
section.

#### Scenario: Events in record order
- **WHEN** a record carries a birth, a marriage-era residence and a death, in
  that order
- **THEN** the page lists those three events in that order, each named

#### Scenario: An event the catalogue has no name for
- **WHEN** the model reports an event whose tag the plugin's catalogue does not
  name — the model reads more tags than the catalogue names
- **THEN** the event is shown, labelled by its tag as written, rather than
  omitted

#### Scenario: A date in a calendar the year could not be read from
- **WHEN** an event's date reads `@#DHEBREW@ 5628`
- **THEN** the event shows that date exactly as the record writes it

### Requirement: The page returns the reader to the record

The page SHALL carry an action that opens the GEDCOM document the person was
read from and puts the cursor on the line that declares them.

Where the document is already open, that tab SHALL be revealed rather than a
second one opened. Where the document is no longer in the vault, the reader
SHALL be told so and nothing SHALL open.

#### Scenario: Opening the record
- **WHEN** the reader takes that action for `@I1@`
- **THEN** the GEDCOM file opens and the cursor sits on the `0 @I1@ INDI` line

#### Scenario: The file is already open
- **WHEN** the file is already open in another tab
- **THEN** that tab is revealed and the cursor moves to the record

#### Scenario: The file has been removed or renamed
- **WHEN** the document the person was read from is no longer at the path the
  address names, whether it was deleted or renamed
- **THEN** nothing opens and the reader is told the file is not there

### Requirement: The page is drawn by something that could be drawn elsewhere

What draws the page SHALL be given the person to draw, how to name a tag in the
reader's language, and what to do when a person or the source record is chosen.
It SHALL NOT reach for the plugin's language state, its settings, or the
application, so that the same drawing can be tested without either and reused by
another client.

#### Scenario: The page drawn without the application
- **WHEN** the page is drawn into a plain container, given a person and a naming
  function, with no application present
- **THEN** it draws the same sections, and choosing a relative calls back rather
  than opening anything itself

### Requirement: The page looks like part of the application

Person view and the people list SHALL take their colours, spacing and fonts from
the application's own variables, so that both follow the reader's theme,
including light and dark, without the plugin choosing colours of its own.

The page SHALL be laid out as an information page rather than a dashboard: no
decorative cards, gradients or illustrations.

#### Scenario: The reader's theme changes
- **WHEN** the reader switches between a light and a dark theme with a Person
  view open
- **THEN** the page follows, with its text legible against its background in
  both
