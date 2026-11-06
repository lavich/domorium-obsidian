## MODIFIED Requirements

### Requirement: People, families and sources

The list SHALL show the file's people, its families, its sources, its places or its events, switched by
five buttons at its top, labelled **People**, **Families**, **Sources**, **Places** and **Events**, in
that order, the button of the kind shown marked as the active one. A kind SHALL show these columns, and each row SHALL
show them as the card shows the same facts:

- people: **Name**, as the person card names them; **Years**, as the person card shows
  them; **Place**, the place of birth, or of death where no birth place is stated; and
  **Sources**, how many distinct sources the record cites, on itself or beneath any of its
  events, or the mark of People who cite no source where it cites none;
- families: **Spouses**, as the family card names them; **Marriage**, the year of the
  marriage where the record states it; **Place**, the place of the marriage; and
  **Children**, how many children the family has;
- sources: **Title**; **Author** and **Repository**, where stated; and **Cited by**, how
  many records cite the source;
- places: as the requirement on the places says;
- events: as the requirement on the events says.

Without a sort the people, the families and the sources SHALL be in the order the file
declares them, the places in alphabetical order and the events in the order the file writes them. Above the rows the
list SHALL say how many it shows, and, where the filter narrows them, how many of all:
`17 people`, `5 families`, `3 sources`, `10 places`, `51 events`, `11 of 17 people`, spelt by the plural rules of
the language shown. A record the file declares without an identifier SHALL NOT be listed,
since it cannot be selected. A kind with no record SHALL say that the file holds none.

#### Scenario: A person row
- **WHEN** the list shows the people of `curie.ged`
- **THEN** Marie's row reads `Marie Skłodowska-Curie`, `1867–1934`,
  `Warsaw, Congress Poland` and `2`, and the count reads `17 people`

#### Scenario: A family row
- **WHEN** the list shows the families of `curie.ged`
- **THEN** the Curies' row reads `Pierre Curie ⚭ Marie Skłodowska-Curie`, `1895`,
  `Sceaux, France` and `2`, and the count reads `5 families`

#### Scenario: A family with no marriage stated
- **WHEN** the list shows the families of `curie.ged`
- **THEN** the row of Eugène Curie and Sophie-Claire Depouilly shows no year and no
  place, and `2` children

#### Scenario: A source row
- **WHEN** the list shows the sources of `curie.ged`
- **THEN** `Parish registers of Warsaw` shows no author, `State Archive in Warsaw` as its
  repository and `2` records citing it, and the count reads `3 sources`

#### Scenario: A source with an author
- **WHEN** the list shows the sources of `curie.ged`
- **THEN** `The Nobel Prize in Physics 1903` shows `Nobel Prize Outreach` as its author
  and as its repository

#### Scenario: The kind is kept
- **WHEN** the reader chooses Families and Obsidian is restarted
- **THEN** the list shows the families

#### Scenario: A file with no sources
- **WHEN** the list shows the sources of a file declaring no `SOUR` record
- **THEN** it says the file holds no sources

#### Scenario: A record without an identifier
- **WHEN** a person record is declared as `0 INDI` with no identifier
- **THEN** it is not listed

#### Scenario: Five kinds
- **WHEN** the list is shown
- **THEN** its kind buttons read **People**, **Families**, **Sources**, **Places** and **Events**, in that
  order, and one of them is marked as active

#### Scenario: A file with no places
- **WHEN** the list shows the places of a file whose events name no place
- **THEN** it says the file names no places

#### Scenario: A file with no events
- **WHEN** the list shows the events of a file whose people and families state no event
- **THEN** it says the file holds no events
