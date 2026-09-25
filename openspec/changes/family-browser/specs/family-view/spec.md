## Purpose

The page for one family: who it joins, the children it records, what happened
to it and when, how it links to the people in it, and how it returns the reader
to the record in the file.

## ADDED Requirements

### Requirement: The page is a reading of a family record

Family view SHALL be a workspace tab, opened and closed like any other, showing
one family as the GEDCOM document currently states it. It SHALL NOT write to
the document, generate a note, or hold a copy that outlives the document it was
read from.

When the underlying document changes, an open Family view SHALL come to show
the changed record.

A family SHALL be addressed as a person is: by a reference to its document
together with its identifier, never by identifier alone, because two documents
may each declare `@F1@`.

#### Scenario: A family shown as a tab
- **WHEN** the reader opens a family
- **THEN** a workspace tab shows it, titled by the people it joins

#### Scenario: The record is edited while the page is open
- **WHEN** the reader adds a child to that family in the GEDCOM file with the
  Family view open
- **THEN** the Family view comes to show the added child

#### Scenario: The same identifier in two documents
- **WHEN** two GEDCOM files each declare `@F1@` and the reader opens the first
- **THEN** the family shown is the one from the first file

### Requirement: The page says who the family joins

The page SHALL head with the people the family joins as spouses. Where the
record names nobody, it SHALL head with the family's identifier rather than
with an empty heading or an invented name.

Beneath the heading it SHALL show the year of the marriage where one could be
read, so the page says at a glance when this family began.

#### Scenario: A family joining two people
- **WHEN** the record names Pierre Curie and Marie Skłodowska-Curie
- **THEN** the page heads with both

#### Scenario: A family the record names nobody for
- **WHEN** the record names no spouse
- **THEN** the page heads with the family's identifier and does not fail

#### Scenario: A family whose marriage states no year
- **WHEN** the record states a marriage with no date, or none at all
- **THEN** the page heads with the people and shows no year

### Requirement: The page shows the people in the family

The page SHALL show the spouses and the children, each group named, and each
group left out entirely when the record yields nobody for it.

Each person SHALL be shown as a row in the people list shows them — their name
and the years they lived — and SHALL be openable, opening their own page.

A pointer the document does not declare SHALL be stated, naming the identifier
it could not resolve, rather than omitted.

#### Scenario: A family with spouses and children
- **WHEN** the record names two spouses and two children, all declared
- **THEN** the page shows two named groups holding those four people

#### Scenario: A family with no children recorded
- **WHEN** the record names no child
- **THEN** the page shows no children group, and shows the spouses normally

#### Scenario: Opening somebody from the family
- **WHEN** the reader chooses one of the people shown
- **THEN** that person's own page shows them

#### Scenario: A person the document does not hold
- **WHEN** the record names a child the document does not declare
- **THEN** the page shows the remaining children, states that one reference
  could not be resolved, and names the identifier

### Requirement: The page shows what the record says happened

The page SHALL show the events the model reports for the family, each named in
the language the plugin speaks, with its date and place as the record writes
them, in the order the record writes them.

A family whose record carries no event SHALL be shown without an events
section. An event whose tag the plugin's catalogue does not name SHALL be shown
labelled by its tag.

#### Scenario: A marriage
- **WHEN** the record carries a marriage with a date and a place
- **THEN** the page shows it, named, with both

#### Scenario: A family recording nothing that happened
- **WHEN** the record carries no event
- **THEN** the page shows no events section

### Requirement: The page returns the reader to the record

The page SHALL show the identifier that declares the family, near its heading
and in text that does not compete with it, and that identifier SHALL be the way
the reader reaches the record: the GEDCOM opens with the cursor on the `FAM`
line.

Where the document is already open, that tab SHALL be revealed rather than a
second one opened. Where the document is no longer in the vault, the reader
SHALL be told so and nothing SHALL open.

The header above the page SHALL name the document, as it does for a person.

#### Scenario: Opening the record
- **WHEN** the reader chooses the identifier shown for `@F1@`
- **THEN** the GEDCOM opens and the cursor sits on the `0 @F1@ FAM` line

#### Scenario: The file has been removed
- **WHEN** the document is no longer at the path the address names
- **THEN** nothing opens and the reader is told the file is not there

### Requirement: The reader can retrace families and people together

Moving between a family and a person SHALL be retraceable by the same means
moving between people already is, and the two SHALL share one trail: a reader
who opens a person, then their family, then a child of it, SHALL be able to go
back through all three in order.

#### Scenario: Walking out of a person and back
- **WHEN** the reader opens Marie, then a family she is a spouse of, then a
  child of that family, and then goes back twice
- **THEN** the view shows the family, and then Marie

#### Scenario: Forward after going back
- **WHEN** the reader then goes forward
- **THEN** the view shows the family again

### Requirement: The page looks like part of the application

Family view SHALL take its colours, spacing and fonts from the application's
own variables, so that it follows the reader's theme in both light and dark
without the plugin choosing colours of its own, and SHALL be laid out as the
person's page is rather than as a dashboard.

#### Scenario: The reader's theme changes
- **WHEN** the reader switches between a light and a dark theme with a Family
  view open
- **THEN** the page follows, with its text legible against its background in
  both
