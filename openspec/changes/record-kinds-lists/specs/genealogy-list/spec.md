## MODIFIED Requirements

### Requirement: A GEDCOM tab can show its file as a list

A GEDCOM tab SHALL offer a **List** mode that shows the people, the families, the
sources, the places, the events, the media, the shared notes, the repositories or the other records of its file as a table, in the tab itself, with no tab of its own and no sidebar.
The tab SHALL enter it from the mode control in its header, from a command, from the
tab's menu, as the requirement on the mode control says, and a file opened anew MAY open
in it by the rule for a new tab, as the requirement on the modes of a GEDCOM tab says. Entering it SHALL NOT open another tab.

The list SHALL be drawn from the same reading of the tab's text that the record card,
the graph and the timeline use, and SHALL NOT read the file from the vault itself. It
SHALL show the file as the tab holds it, including text typed in the tab and not yet
saved, and SHALL show every later change to it: at once while the tab is in view, and the
next time it is brought into view otherwise. A tab SHALL NOT draw the list before it has
read its file. The list SHALL keep the kind it shows and the sort of each kind across leaving the mode and coming back and across closing and
reopening the workspace; it SHALL keep the text typed in its search and its scroll position
across leaving the mode and coming back, and SHALL NOT save either with the workspace.
Nothing in the list SHALL write to the file, save it or mark it as changed.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Source mode and the reader chooses List from the mode
  control in its header
- **THEN** the same tab shows the 17 people of `curie.ged` as rows of a table, and no
  new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader adds a person record in Source mode, the file is not yet saved,
  and the reader switches to List mode
- **THEN** the list shows 18 people, the new one among them

#### Scenario: Changed on disk while out of view
- **WHEN** a tab in List mode is behind another tab and the file is changed on disk so
  that Marie's year of death is 1935, and the reader brings the tab to the front
- **THEN** her row reads `1867–1935`

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in List mode on the families of `curie.ged`, filtered by `curie`
  and sorted by children, and the reader switches to Graph mode and then back
- **THEN** the list shows the families, filtered by `curie`, in the same order, scrolled
  to the same place

#### Scenario: Restored with the workspace
- **WHEN** the tab is in List mode on the sources of `curie.ged`, sorted by the number of
  records that cite them, the reader had typed `nobel`, and Obsidian is restarted
- **THEN** the tab shows the sources in that order with the search empty

#### Scenario: A tab that is not in view
- **WHEN** a tab in List mode is behind another tab and the file changes on disk
- **THEN** the list is not drawn again until the tab is brought to the front

#### Scenario: Browsing the list
- **WHEN** the reader sorts, filters and selects ten rows
- **THEN** the file on disk is byte for byte what it was

#### Scenario: A place selected, restored with the workspace
- **WHEN** the tab is in List mode on the places of `curie.ged`, `Paris, France` is selected,
  and Obsidian is restarted
- **THEN** the tab shows the places with the row of `Paris, France` marked and its card in the right panel

#### Scenario: An event selected, restored with the workspace
- **WHEN** the tab is in List mode on the events of `curie.ged`, Marie's birth is selected,
  and Obsidian is restarted
- **THEN** the tab shows the events with the row of Marie's birth marked and its card in the right panel

### Requirement: People, families and sources

The list SHALL show the file's people, its families, its sources, its places, its events, its media, its shared notes, its repositories or its other records, switched by
nine buttons at its top, labelled **People**, **Families**, **Sources**, **Places**, **Events**, **Media**, **Notes**, **Repositories** and **Other**, in
that order, where a tab is too narrow for them a single dropdown of the same kinds in the same order, the button of the kind shown marked as the active one. A kind SHALL show these columns, and each row SHALL
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
- events: as the requirement on the events says;
- media, notes, repositories and other records: as the requirements on them say.

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
- **WHEN** the list is shown in a tab wide enough for its buttons
- **THEN** its kind buttons read **People**, **Families**, **Sources**, **Places**, **Events**, **Media**, **Notes**, **Repositories** and **Other**, in that
  order, and one of them is marked as active

#### Scenario: A file with no places
- **WHEN** the list shows the places of a file whose events name no place
- **THEN** it says the file names no places

#### Scenario: A file with no events
- **WHEN** the list shows the events of a file whose people and families state no event
- **THEN** it says the file holds no events

### Requirement: The Places has no actions

While the list shows the Places, the row of the kind buttons SHALL hold the kind buttons and the
search and nothing else: no button that creates, opens, appends to or otherwise writes a note, a
table or a file. The Places SHALL be read-only.

#### Scenario: The row of the kinds
- **WHEN** the list shows the places of a file
- **THEN** the row of the kind buttons holds the kinds and the search, and no other button

#### Scenario: Nothing is written
- **WHEN** the reader sorts, searches, marks a row and leaves the Places
- **THEN** no note or file in the vault has been created or changed

## ADDED Requirements

### Requirement: Media

The **Media** kind SHALL list every multimedia record the file declares with an identifier, in the order the file writes them without a sort. Its columns SHALL be **Title**, the record's title or, where it states none, the name of its first file; **File**, the path of its first file as written; **Format**, the format the record states for that file; and **Linked from**, how many lines of the file point at the record. The count above the rows SHALL be of media, spelt by the plural rules of the language shown. Choosing a row SHALL select the record and show its media card.

#### Scenario: The media of a file
- **WHEN** the list shows the media of `curie.ged`
- **THEN** its seven multimedia records are listed in the order of the file, the count reads `7 media`, and the row of the family photograph shows how many records link it

#### Scenario: A medium with no title
- **WHEN** a multimedia record states `1 FILE scans/letter.jpg` and no title
- **THEN** its row's Title reads `letter.jpg`

### Requirement: Notes

The **Notes** kind SHALL list every shared note the file declares with an identifier — a 7.0 `SNOTE` record and a 5.5.1 `NOTE` record — in the order the file writes them without a sort. Its columns SHALL be **Text**, the first line of the note's text, cut to one line; and **Linked from**, how many lines of the file point at the note. The search SHALL match the whole text of a note, not only its first line. The count above the rows SHALL be of notes. Choosing a row SHALL select the note and show its note card.

#### Scenario: A file with many notes
- **WHEN** the list shows the notes of a file that declares 1 478 note records
- **THEN** 1 478 rows are listed, the count reads `1 478 notes`, and scrolling keeps up as it does for people

#### Scenario: Searching inside a note
- **WHEN** the reader searches `Nobel` and a note says it only on its third line
- **THEN** that note is listed

### Requirement: Repositories

The **Repositories** kind SHALL list every repository the file declares with an identifier, in the order the file writes them without a sort. Its columns SHALL be **Name**; **Address**, the first line of its address; and **Sources**, how many source records name it. The count above the rows SHALL be of repositories. Choosing a row SHALL select the repository and show its repository card.

#### Scenario: The repositories of a file
- **WHEN** the list shows the repositories of `curie.ged`
- **THEN** its two repositories are listed, each with the number of its sources

### Requirement: Other records

The **Other** kind SHALL list, first, the header of the file, named *File header*, and then every record the file declares that no other kind lists — a submitter, a record of the file's own such as `0 @X1@ _PLAN` — in the order the file writes them without a sort. Its columns SHALL be **Kind**, the record's kind in the reader's language where the standard names it and its tag as written otherwise; **Name**, the record's name, title or first value where it states one; and **Linked from**, how many lines of the file point at it. The count above the rows SHALL be of records. Choosing a row SHALL select the record and show its card.

#### Scenario: The header and a submitter
- **WHEN** the list shows the other records of `curie.ged`
- **THEN** the first row is *File header* and the second the submitter, with its name

#### Scenario: A record of the file's own
- **WHEN** a file declares `0 @X1@ _PLAN` with `1 NAME Research plan`
- **THEN** a row reads `_PLAN` as its Kind and `Research plan` as its Name

### Requirement: The new kinds have no actions and nothing in them writes

While the list shows media, notes, repositories or other records, the row of the kind buttons SHALL hold the kinds and the search and nothing else, as it does for the places, and nothing the reader does in them SHALL write to the file, a note or any other file. A kind with no record SHALL say that the file holds none.

#### Scenario: No repositories
- **WHEN** the list shows the repositories of a file that declares none
- **THEN** it says the file holds no repositories

#### Scenario: Nothing is written
- **WHEN** the reader sorts, searches and selects rows in each new kind
- **THEN** no note or file in the vault has been created or changed
