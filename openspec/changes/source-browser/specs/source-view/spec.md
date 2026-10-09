## Purpose

The page for one source: what the document says it is, where it is held, and
everything in the tree that rests on it.

## ADDED Requirements

### Requirement: The page is a reading of a source record

Source view SHALL be a workspace tab, opened and closed like any other, showing
one source as the GEDCOM document currently states it, and SHALL NOT write to
the document or generate a note.

A source SHALL be addressed as a person and a family are: by a reference to its
document together with its identifier.

The header above the page SHALL name the document, and the tab SHALL be titled
by the source, as the other pages are.

#### Scenario: A source shown as a tab
- **WHEN** the reader opens a source
- **THEN** a workspace tab shows it, titled by its title

#### Scenario: The record is edited while the page is open
- **WHEN** the reader changes that source's title in the GEDCOM file with the
  Source view open
- **THEN** the page comes to show the new title

### Requirement: The page says what the source is

The page SHALL head with the source's title, or with its identifier where the
record states no title, and SHALL show what the record states about it — the
author, the publisher and the rest — each labelled, leaving out what the record
does not state.

Where the source names a repository, the page SHALL show it: its name, and its
address and web address where the record states them.

Where the source carries a picture, the page SHALL show it, cut to the
rectangle the record names, exactly as a person's portrait is shown.

#### Scenario: A source with an author and a publisher
- **WHEN** the record states a title, an author and a publisher
- **THEN** the page heads with the title and shows the other two, labelled

#### Scenario: A source the record states little about
- **WHEN** the record states a title and nothing else
- **THEN** the page shows the title and no empty rows

#### Scenario: A source held somewhere
- **WHEN** the source names a repository with an address
- **THEN** the page shows the repository's name and its address

### Requirement: The page shows what rests on the source

The page SHALL show every citation of the source the document makes, and this
SHALL be the substance of the page rather than a footnote to it.

Each SHALL name the record that cites it, openable so the reader reaches that
person or family; what within the record the citation was attached to, where it
was attached to a structure rather than to the record itself; and the page or
entry the citation states.

A source nothing cites SHALL say so plainly rather than showing an empty
section, because a source nothing rests on is a fact about the tree worth
seeing.

#### Scenario: A source several people cite
- **WHEN** three people cite the source
- **THEN** the page lists all three, each openable

#### Scenario: A citation attached to an event
- **WHEN** a citation sits beneath a person's birth
- **THEN** the page says the citation is of that birth, not of the person

#### Scenario: A citation stating a page
- **WHEN** a citation states `2 PAGE Warsaw parish registers`
- **THEN** the page shows that text beside the record that cites it

#### Scenario: Opening a citing record
- **WHEN** the reader chooses one of the records listed
- **THEN** that person's or family's page shows them

#### Scenario: A source nothing rests on
- **WHEN** no record in the document cites the source
- **THEN** the page says so

### Requirement: The page returns the reader to the record

The page SHALL show the identifier that declares the source near its heading,
and that identifier SHALL be the way the reader reaches the record: the GEDCOM
opens with the cursor on the `SOUR` line, by the means the other pages already
use.

#### Scenario: Opening the record
- **WHEN** the reader chooses the identifier shown for `@S1@`
- **THEN** the GEDCOM opens and the cursor sits on the `0 @S1@ SOUR` line

### Requirement: The page looks like part of the application

Source view SHALL take its colours, spacing and fonts from the application's
own variables, and SHALL be laid out as the person's and the family's pages
are.

#### Scenario: The reader's theme changes
- **WHEN** the reader switches between a light and a dark theme with a Source
  view open
- **THEN** the page follows, legible in both
