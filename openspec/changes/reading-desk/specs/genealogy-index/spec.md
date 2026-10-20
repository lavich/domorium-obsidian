## Purpose

The index of a GEDCOM file's people and sources in the left sidebar: finding a
record, seeing at a glance who rests on no source, and opening a record in the
GEDCOM tab.

## ADDED Requirements

### Requirement: The index lives in the left sidebar and follows the GEDCOM tab

The plugin SHALL offer an index view, named **Domorium**, that opens in the left
sidebar from the plugin's ribbon icon and from a command. On a phone it SHALL be
reached as Obsidian's other sidebar views are, from the left drawer.

The index SHALL show the file of the GEDCOM tab most recently active, with the
file's name, the GEDCOM version it declares and how many people it holds. With
no GEDCOM tab open it SHALL say so.

#### Scenario: Opening the index
- **WHEN** `curie.ged` is open and the reader clicks the ribbon icon
- **THEN** the left sidebar shows the index of `curie.ged`, reading
  `GEDCOM 7.0` and 17 people

#### Scenario: Moving to a Markdown note
- **WHEN** the reader moves from the GEDCOM tab to a Markdown note
- **THEN** the index still shows `curie.ged`

#### Scenario: No GEDCOM file open
- **WHEN** the index is open and no GEDCOM tab is
- **THEN** the index says no GEDCOM file is open

### Requirement: People and sources

The index SHALL list either the file's people or its sources, switched at its
top. People SHALL be listed in the order the file declares them, each with their
name, their years as the person page shows them, and the place of birth, or of
death where no birth place is stated. Sources SHALL be listed in the order the
file declares them, each with its title, its author where stated, and how many
records cite it.

A record the file declares without an identifier SHALL NOT be listed, since it
cannot be opened.

#### Scenario: A person row
- **WHEN** the index lists the people of `curie.ged`
- **THEN** Marie's row reads her name, `1867–1934` and
  `Warsaw, Congress Poland`

#### Scenario: A source row
- **WHEN** the index lists the sources of `curie.ged`
- **THEN** `Parish registers of Warsaw` shows that two records cite it

### Requirement: Who rests on no source

A person whose record cites no source, neither on the record nor beneath any of
its events, SHALL be marked in the index. A filter SHALL list only such people,
and SHALL say how many there are.

#### Scenario: The demo vault
- **WHEN** the index lists the people of `curie.ged` and the reader chooses the
  filter
- **THEN** it lists the 11 people whose records cite nothing, and Marie, whose
  record cites two sources, is not among them

### Requirement: Search

A search field SHALL narrow the list as the reader types. For people it SHALL
match the name, any other name the record states, the years shown and the place
shown; for sources the title and the author. Case SHALL NOT matter. A search
matching nothing SHALL say so and say what it searches.

#### Scenario: Searching by year
- **WHEN** the reader types `1867` in the people index of `curie.ged`
- **THEN** Marie Skłodowska-Curie is listed

#### Scenario: Searching by another name
- **WHEN** the reader types `salomea`
- **THEN** Marie Skłodowska-Curie is listed, through the birth name her record
  states

### Requirement: Opening a record from the index

Activating a row SHALL show that record's page in the GEDCOM tab the index
follows, switching that tab to Genealogy mode if it is in Source mode, and on a
phone SHALL close the drawer. The row of the record that tab shows SHALL be
marked as the current one.

#### Scenario: Opening Pierre
- **WHEN** the GEDCOM tab is in Source mode and the reader activates Pierre
  Curie's row
- **THEN** the tab is in Genealogy mode showing Pierre Curie, and his row is the
  current one

### Requirement: The index follows the file and holds up at size

The index SHALL reflect the text of the file it follows, including text typed in
Source mode but not saved, without being reopened.

A file of twenty thousand people SHALL show its first rows and accept typing in
the search field without the app becoming unresponsive while the rest of the
list is prepared.

#### Scenario: A person added in the source
- **WHEN** the reader adds a person record in Source mode
- **THEN** the index lists that person

#### Scenario: A large file
- **WHEN** the index follows a file of twenty thousand people
- **THEN** rows are shown and the search field answers keystrokes while the
  reader scrolls
