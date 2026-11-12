# genealogy-list Specification

## Purpose
The list of a GEDCOM file: a mode of the file's tab, beside Graph, Timeline and Source, that shows the people, families or sources of the file as rows in the look of the file explorer. A reader filters the rows with the expanding search, sorts them by a column, and selects a row to show its record in the record card; the list holds up on a large file, on a phone and in a narrow tab, and is reachable with the keyboard and a screen reader.

## Requirements

### Requirement: A GEDCOM tab can show its file as a list

A GEDCOM tab SHALL offer a **List** mode that shows the people, the families, the sources, the media, the shared notes, the repositories or the other records of its file as a table, in the tab itself, with no tab of its own and no sidebar.
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
- **WHEN** a workspace saved the tab in List mode on the places of `curie.ged`, which the list
  no longer has, with `Paris, France` selected, and Obsidian is restarted
- **THEN** the tab shows the people of the file, no row is marked, and the card says to select
  a record

#### Scenario: An event selected, restored with the workspace
- **WHEN** a workspace saved the tab in List mode on the events of `curie.ged`, which the list no longer has, and Obsidian is restarted
- **THEN** the tab shows the people of the file, and the card shows nothing of an event

#### Scenario: A note selected, restored with the workspace
- **WHEN** the tab is in List mode on the notes of `curie.ged`, the note `@N1@` is selected,
  and Obsidian is restarted
- **THEN** the tab shows the notes with the row of `@N1@` marked and its card in the right panel

### Requirement: People who cite no source

A person whose record cites no source, neither on the record nor beneath any of its
events, SHALL be marked in the **Sources** column of the list by a mark that is a shape
with a text alternative, not a colour alone. There SHALL be no switch that narrows the
people to them; sorting by **Sources**, as the requirement on sorting says, lists them
first.

#### Scenario: The marks
- **WHEN** the list shows the people of `curie.ged`
- **THEN** the rows of Zofia Skłodowska and of Sophie-Claire Depouilly carry the mark in
  the Sources column and Marie's row shows `2`

#### Scenario: No switch for them
- **WHEN** the list shows the people of `curie.ged`
- **THEN** no control narrows the people to those who cite no source, and the count
  reads `17 people`

#### Scenario: Sorted to the top
- **WHEN** the reader presses Sources among the people of `curie.ged`
- **THEN** the 11 people whose records cite nothing, Zofia Skłodowska and
  Sophie-Claire Depouilly among them, come first, each with the mark, and Marie, whose
  record cites two sources, comes last

### Requirement: The find key opens the search

In List mode the editor's find — the command **Find**, and the key Obsidian dispatches to
the tab for it — SHALL open the list's search if it is closed, give the focus to its field and select its text. It
SHALL NOT open the editor's search panel or change the mode. Replace SHALL NOT be
offered.

#### Scenario: Find in the list
- **WHEN** the tab of `curie.ged` is in List mode, the field holds `joliot` and the
  focus is on a row, and the reader presses the find key
- **THEN** the field has the focus, its text is selected, and the rows are still
  narrowed by `joliot`

### Requirement: The list holds up at size

A file of twenty thousand people SHALL show its first rows, and accept typing in the
filter field and a press of a header, without the app becoming unresponsive while the
rest of the list is prepared. The list SHALL draw only the rows in view and a margin
around them, however many it holds, and SHALL give its scrollbar the height of all the
rows.

#### Scenario: A large file
- **WHEN** the list shows a file of twenty thousand people
- **THEN** only a window of the rows is in the page, the scrollbar is as tall as all of
  them, and scrolling draws the rows that come into view

#### Scenario: Typing in a large file
- **WHEN** the reader types in the search of that list
- **THEN** the rows drawn after each keystroke are still only a window

#### Scenario: Sorting a large file
- **WHEN** the reader presses Name in that list
- **THEN** the first rows are drawn in the new order and only a window of them is in the
  page

### Requirement: The list on a phone and in a narrow tab

The list SHALL fit the tab it is in without scrolling sideways, at any width. Where the
tab is narrower than 640 CSS pixels, as in a narrow split, or the device is a touch one,
as a phone or a tablet, each row SHALL
take two lines — the name or title with the years, the marriage or the count at its end,
and the place or the author beneath, with the Sources mark or the count of children or
citations; for the other kinds as the requirement on each says — the column headers SHALL be replaced by a selector of the column to sort by
and a button that turns the direction, as wide as their content and as tall as the other
controls of the toolbar, and a row SHALL be at least 44 CSS pixels tall. A count shown at the end of a two-line row SHALL say what it counts in
words, spelt by the plural rules of the language shown: `2 sources`, `2 children`,
`Cited by 2`, `Linked from 2`. On a touch device the sort selector, the
direction button, the kind buttons, the search and the column headers of
a wide tab SHALL be at least 44 CSS pixels tall. Row and control heights SHALL
follow the reader's font size rather than a fixed number of pixels, and the page SHALL
not scroll sideways at any font size the app offers.

The kinds SHALL be buttons while the toolbar has room for all seven at their natural width
beside the search closed to its icon, and one dropdown otherwise. The room SHALL be decided
by measuring, not by a fixed breakpoint: the natural width of the seven buttons is measured
as they are drawn, in the language and at the font size shown, and is measured again
whenever the list is resized; the kinds SHALL become a dropdown when the toolbar is
narrower than that width, and SHALL become buttons again only once the toolbar is wider
than that width by a margin, so that a tab at the edge does not switch back and forth. The
dropdown SHALL be the app's own dropdown control, named to assistive technology as the
kind of records shown, reachable by the keyboard where the buttons were, showing the kind
shown, and at least 44 CSS pixels tall on a touch device; choosing a kind in it SHALL do
what pressing that button does. The search SHALL be as in a wide tab, and the toolbar's
controls SHALL share one height, the kinds' dropdown, the sort selector and the direction
button joining them in a compact list. On a
phone the list SHALL be the whole of the tab, with the bottom navigation of Obsidian left
clear.

#### Scenario: A phone
- **WHEN** the reader opens `curie.ged` as a list on a phone, 390 pixels wide
- **THEN** the page has nothing to scroll sideways, each row is two lines of at least 44
  pixels, a selector of the sort is shown where the headers were, and the kinds are one
  dropdown at least 44 pixels tall

#### Scenario: A tablet
- **WHEN** the tab is 1000 pixels wide on a touch device
- **THEN** each row takes two lines, and the kind buttons and the headers, where shown, are
  at least 44 pixels tall

#### Scenario: A wide tab
- **WHEN** the tab is 1400 pixels wide with a mouse
- **THEN** each row is one line, the headers are shown, and no selector of the sort is

#### Scenario: A narrow tab with a mouse
- **WHEN** the tab is 500 pixels wide with a mouse
- **THEN** each row takes two lines, and the sort selector and the direction button are as
  tall as the kinds' dropdown, the selector no wider than its content

#### Scenario: Sorting on a phone
- **WHEN** the reader chooses Years in the selector and turns the direction
- **THEN** the rows are in the order of the Years column descending

#### Scenario: Long names
- **WHEN** a name, a place and a title are far longer than the width of the tab
- **THEN** they are cut with an ellipsis and the page has nothing to scroll sideways

#### Scenario: Buttons where they fit, a dropdown where they do not
- **WHEN** a tab with a mouse is made narrower, a pixel at a time, from 1400 pixels
- **THEN** the kinds are buttons until the toolbar is narrower than the measured width of
  the seven buttons beside the search icon, and a dropdown from then on; widened again,
  they become buttons only once the toolbar is wider than that width by the margin

#### Scenario: Measured in the language shown
- **WHEN** the plugin's language is Russian
- **THEN** the kinds become a dropdown at the width the Russian buttons measure, not at the
  width of the English ones

### Requirement: A command shows the file's list

While the **Genealogy interface** setting is on, the plugin SHALL offer a command,
**Open the list of the GEDCOM file**, that brings the GEDCOM tab most
recently active in this session to the front and give it the focus, wherever it is, and
show it as a list; where
no GEDCOM tab has been active yet, as after a restart, the first GEDCOM tab that is open
SHALL be used. A tab that is already a list SHALL be only brought to the front. Where no
GEDCOM tab is open it SHALL give a
notice that says to open a GEDCOM file, and open nothing. While the setting is off, the
plugin SHALL NOT offer the command. The plugin SHALL add no icon to the ribbon, whatever
the setting, and a ribbon icon an earlier version added SHALL be gone once the plugin is
loaded. The command SHALL keep
the identifier the plugin's earlier command to open the index had, so that a hotkey the
reader bound to it still works.

#### Scenario: From a note
- **WHEN** the interface is on, `curie.ged` is open in Graph mode behind a Markdown note
  and the reader runs the command
- **THEN** the tab of `curie.ged` is in front, in List mode

#### Scenario: Already a list
- **WHEN** the tab is in List mode behind another tab and the reader runs the command
- **THEN** the tab is in front, in List mode, with its filter and sort as they were

#### Scenario: A tab restored behind another
- **WHEN** Obsidian was restarted with `curie.ged` open in a background tab that has not
  been shown yet, and the reader runs the command
- **THEN** that tab is loaded, brought to the front and shown as a list

#### Scenario: No GEDCOM tab
- **WHEN** no GEDCOM tab is open and the reader runs the command
- **THEN** a notice says to open a GEDCOM file, and nothing opens

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off
- **THEN** the palette does not offer the command

#### Scenario: No ribbon icon
- **WHEN** the plugin is loaded, with the interface on or off
- **THEN** the ribbon holds no icon of the plugin

### Requirement: The search of the list

The list SHALL have the expanding search the graph and the timeline have: an icon at the
end of the toolbar, above the rows and clear of the headers and the scrollbar, that gives
way to a field when pressed and comes back when the field is closed empty. It SHALL narrow
the rows as the reader types, not step through matches, and so SHALL have no arrows. For people it SHALL
match the name, any other name the record states, the years shown and the place shown; for
families the spouses' names, the year and the place; for sources the title, the author and
the repository; for media the title, the file and the
format; for notes the whole text of the note, every line of it and not only the one the row
shows; for repositories the name and the address; for other records the kind, as shown and
as its tag is written, and the name. A year before the common era SHALL be matched by its digits as the file
writes it, not by the mark of the era shown beside it, so the same filter finds it in any
language. Case SHALL NOT matter, nor, for media, notes, repositories and other records, the marks on letters and the letters that do not
decompose — `ł`, `ß`, `ø`, `đ`, `æ`, `œ` and `ı` match `l`, `ss`, `o`, `d`, `ae`, `oe` and `i`
— so that a name typed without its marks finds the record. A search matching nothing SHALL say so and say what it
searches. While it holds text it SHALL show how many rows remain of how many there are,
spelt by the plural rules of the language shown, as `4 of 17 people`. Switching the kind
SHALL clear the text and leave the search as open as it was. A cross in the open search
SHALL clear its text and keep it open; Escape in the field SHALL clear its text, and with
the field empty SHALL close the search; Enter SHALL move the keyboard to the rows. The
search SHALL be reachable whatever the width of the tab, and its icon and cross SHALL be at
least 44 CSS pixels tall on a touch device.

#### Scenario: Opening it
- **WHEN** the reader presses the search icon of the list
- **THEN** the icon gives way to a field with the focus, and no arrow to step to the next
  match is shown

#### Scenario: The counter
- **WHEN** the reader types `joliot` among the people of `curie.ged`
- **THEN** the search says `4 of 17 people`

#### Scenario: The cross
- **WHEN** the search holds `joliot` and the reader presses its cross
- **THEN** the text is gone, all 17 people are listed, and the field is still open

#### Scenario: Filtering by year
- **WHEN** the reader types `1867` in the people of `curie.ged`
- **THEN** only Marie Skłodowska-Curie is listed

#### Scenario: Filtering by another name
- **WHEN** the reader types `salomea`
- **THEN** only Marie Skłodowska-Curie is listed, through the birth name her record states

#### Scenario: Filtering by a name, in any case
- **WHEN** the reader types `JOLIOT`
- **THEN** Irène Joliot-Curie, Frédéric Joliot, Hélène Langevin-Joliot and Pierre Joliot
  are listed, and the count reads `4 of 17 people`

#### Scenario: Filtering by a place
- **WHEN** the reader types `Warsaw` in the people, then switches to Families and types
  `Warsaw`, then to Sources and types `Warsaw`
- **THEN** seven people are listed, then the family of Władysław Skłodowski and
  Bronisława Boguska, then `Parish registers of Warsaw`

#### Scenario: Filtering by a repository
- **WHEN** the reader types `archive` among the sources
- **THEN** `Parish registers of Warsaw` is listed

#### Scenario: Filtering by a year before the common era
- **WHEN** a person's birth and a family's marriage are dated `1401 BCE` in a 7.0
  document, and the reader types `1401` in the people and in the families
- **THEN** that person and that family are listed

#### Scenario: Nothing matches
- **WHEN** the reader types `zzz` among the people
- **THEN** the list says nothing matches `zzz` and that the filter covers names, years
  and places

#### Scenario: Switching the kind
- **WHEN** the reader has typed `joliot` among the people and chooses Families
- **THEN** the field is empty and all five families are listed

#### Scenario: Escape
- **WHEN** the field holds `joliot` and the reader presses Escape, and then presses
  Escape again
- **THEN** the field is empty and open after the first, and after the second the search
  is closed to its icon

#### Scenario: Enter
- **WHEN** the field holds `joliot` and the reader presses Enter
- **THEN** the keyboard is on the rows and they are still narrowed by `joliot`

#### Scenario: Filtering the places
- **WHEN** the reader types `PARIS` among the families of `curie.ged`
- **THEN** only the family of Frédéric Joliot and Irène Joliot-Curie, married at
  `Paris, France`, is listed, through the place its row shows

#### Scenario: Filtering the places without marks
- **WHEN** a repository is named `Archiwum Łódź` and the reader types `lodz` among the
  repositories
- **THEN** `Archiwum Łódź` is listed

#### Scenario: Nothing matches among the places
- **WHEN** the reader types `zzz` among the repositories
- **THEN** the list says nothing matches `zzz` and that the filter covers names and addresses

#### Scenario: Filtering the notes by a later line
- **WHEN** the reader types `chemistry` among the notes of `curie.ged`, a word that `@N1@`
  says only on its second line
- **THEN** the note `@N1@` is listed and the count reads `1 of 2 notes`

#### Scenario: Filtering the repositories without marks
- **WHEN** the reader types `kolo` among the repositories of `curie.ged`
- **THEN** `State Archive in Warsaw`, whose address is `Krzywe Koło 7`, is listed

#### Scenario: Filtering the other records by kind
- **WHEN** the reader types `submitter` among the other records of `curie.ged` in English
- **THEN** only the submitter `Domorium` is listed

#### Scenario: Nothing matches among the notes
- **WHEN** the reader types `zzz` among the notes
- **THEN** the list says nothing matches `zzz` and that the filter covers the text of the notes

### Requirement: Sorting the list by a column

On a wide tab each column header of the list SHALL be a button. Pressing it SHALL sort
the rows by that column ascending, pressing it again descending, and pressing it a third
time SHALL return them to the order of the file; the header of the column the rows are
sorted by SHALL say which way to assistive technology, and the others SHALL say none.
Sorting SHALL be stable: rows whose values compare equal keep the order of the file,
descending too. Names of people SHALL be compared by surname and then given name, and every text
column — the names of repositories and of other records, a title, a file, a format, the text of a note, an address, a kind among them — by the collation of the language shown, numbers inside a text counted as numbers,
so that a letter with a mark sorts with its base letter. Years SHALL be compared by the
year of birth; Marriage by the year of
the marriage, Sources, Children, Cited by and Linked from as numbers. A row whose value is missing — no birth year, no marriage, no place, no
author, an unnamed person, an untitled source, a medium with no format, a repository with no address — SHALL come last in either direction. Among the other records the
row of the file's header SHALL stay first whatever the sort and its direction, and the sort
SHALL order the rows below it. The
sort of each kind SHALL be kept with the kind, SHALL combine with the filter, and SHALL
NOT change which record is selected.

#### Scenario: Sorting the people by name
- **WHEN** the reader presses Name in the people of `curie.ged`
- **THEN** Bronisława Boguska is first and Helena Szalay last, and the four Curies stand
  in the order Eugène, Ève, Jacques, Pierre

#### Scenario: Pressing again
- **WHEN** the reader presses Name twice
- **THEN** Helena Szalay is first and Bronisława Boguska last, and the Curies stand in
  the order Pierre, Jacques, Ève, Eugène

#### Scenario: Pressing a third time
- **WHEN** the reader presses Name three times
- **THEN** the rows are in the order of the file, Marie first, and no header says it
  sorts

#### Scenario: The header says which way
- **WHEN** the reader presses Years once
- **THEN** the Years header says ascending and the Name header says none

#### Scenario: Sorting the people by years
- **WHEN** the reader presses Years
- **THEN** Eugène Curie, born 1827, is first and Pierre Joliot, born 1932, last, and
  Władysław Skłodowski stands before Sophie-Claire Depouilly, both born 1832, as the file
  declares them

#### Scenario: Equal values keep the file's order when descending
- **WHEN** the reader presses Years twice
- **THEN** Pierre Joliot is first, and Ève Curie stands before Henry Richardson
  Labouisse, both born in 1904

#### Scenario: A missing value comes last in both directions
- **WHEN** a person record states no birth, and the reader presses Years once and then
  again
- **THEN** that person is the last row both times

#### Scenario: Sorting by sources
- **WHEN** the reader presses Sources among the people of `curie.ged`
- **THEN** the 11 people who rest on no source come first and Marie Skłodowska-Curie last

#### Scenario: Sorting the families by children
- **WHEN** the reader presses Children twice among the families
- **THEN** the family of Władysław Skłodowski and Bronisława Boguska, with five, is
  first, the families of Eugène Curie, of the Curies and of the Joliots, with two each,
  follow in the order of the file, and the family of Ève Curie and Henry Richardson
  Labouisse, with none, is last

#### Scenario: Sorting the sources by citations
- **WHEN** the reader presses Cited by twice among the sources
- **THEN** `The Nobel Prize in Chemistry 1911 and 1935` is first, then
  `The Nobel Prize in Physics 1903` and `Parish registers of Warsaw`

#### Scenario: A sort and a filter together
- **WHEN** the reader types `curie` and presses Years twice
- **THEN** the rows are Ève Curie, Irène Joliot-Curie, Marie Skłodowska-Curie, Pierre
  Curie, Jacques Curie and Eugène Curie

#### Scenario: The selection does not move
- **WHEN** Marie is selected and the reader presses Name
- **THEN** Marie is still selected, her row is marked, and the card still shows her

#### Scenario: Each kind keeps its sort
- **WHEN** the reader sorts the families by Children, chooses People and then Families
- **THEN** the families are in the same order

#### Scenario: Sorting the places by events
- **WHEN** the reader presses Sources twice among the repositories of `curie.ged`
- **THEN** `Nobel Prize Outreach`, pointed at by two sources, is first, then
  `State Archive in Warsaw`

#### Scenario: Pressing a third time among the places
- **WHEN** the reader presses Sources three times among the repositories
- **THEN** the repositories are in the order of the file and no header says it sorts

#### Scenario: Sorting the notes by how many link them
- **WHEN** a file declares three notes, linked from 3, 0 and 1 records in that order, and
  the reader presses Linked from twice among the notes
- **THEN** the note linked from 3 records is first, then the one linked from 1, then the one
  linked from none

#### Scenario: The header stays first
- **WHEN** the reader presses Name among the other records of a file whose submitter is
  named `Zygmunt` and whose record of its own is named `Album`, and then presses it again
- **THEN** the file's header is the first row both times, `Album` before `Zygmunt` after
  the first press and after them after the second

### Requirement: The list is reachable by the keyboard

The rows of the list SHALL be one stop in the order of the tab key, after the kind
buttons, the search and the headers. With the focus on a row, the Up and Down arrows
SHALL move it to the previous and next row of the rows shown, Home and End to the first
and the last, and Page Up and Page Down by what the list shows at once; the row given the
focus SHALL be drawn and brought into view, also where only a window of rows is drawn.
Enter or Space SHALL select the record of the row with the focus, and the focus SHALL stay on the row. Moving the focus SHALL NOT select. The list SHALL be a grid to assistive
technology: a header row of column headers, each saying its sort, and rows of cells, each
row saying its position among all the rows, including those not drawn. The row that has
the focus SHALL always be one that is drawn. A
row SHALL say to assistive technology whom or what it shows, and whether it is selected.
The kind buttons, the headers and the search SHALL be reachable with the keyboard.

#### Scenario: Arrow keys
- **WHEN** the focus is on the first row of the people and the reader presses Down twice
- **THEN** the focus is on the third row and nothing is selected

#### Scenario: Enter
- **WHEN** the focus is on Pierre Curie's row and the reader presses Enter
- **THEN** Pierre Curie is selected and the focus is still on his row

#### Scenario: Space
- **WHEN** the focus is on Marie's row and the reader presses Space
- **THEN** Marie is selected and the page does not scroll

#### Scenario: Home and End
- **WHEN** the list holds twenty thousand people and the reader presses End
- **THEN** the last row is drawn, has the focus and is in view

#### Scenario: The first and the last
- **WHEN** the focus is on the first row and the reader presses Up, and then on the last
  row and presses Down
- **THEN** the focus does not move

#### Scenario: Enter on a place
- **WHEN** the focus is on the row of `State Archive in Warsaw` among the repositories and the
  reader presses Enter
- **THEN** the row is marked, the focus is still on it, and the card shows the repository

### Requirement: The kinds of records the list shows

The list SHALL show the file's people, its families, its sources, its media, its
shared notes, its repositories or its other records, switched by seven buttons at its top,
labelled **People**, **Families**, **Sources**, **Media**, **Notes**,
**Repositories** and **Other**, in that order, the button of the kind shown marked as the
active one. The list SHALL have no kind of places: a place is read in the rows of the people
and the families and in the tree of a record, as the file writes it. Where the toolbar is too narrow for the seven buttons at their natural width
beside the search, the buttons SHALL give way to one dropdown of the same kinds in the same
order, showing the kind shown, as the requirement on the list in a narrow tab says. A kind SHALL show these columns, and each row SHALL
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
- media, notes, repositories and other records: as the requirements on each of them say.

Without a sort the people, the families, the sources, the media, the notes, the
repositories and the other records SHALL be in the order the file declares them. Above the rows the
list SHALL say how many it shows, and, where the filter narrows them, how many of all:
`17 people`, `5 families`, `3 sources`, `7 media`, `2 notes`,
`2 repositories`, `2 records`, `11 of 17 people`, spelt by the plural rules of
the language shown, the number written as digits with no separator of thousands. A record the file declares without an identifier SHALL NOT be listed,
since it cannot be selected; the header of the file, which the Other kind lists, is the one
exception. A record that some kind lists SHALL be listed by exactly one kind. A kind with no record SHALL say that the file holds none.

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

#### Scenario: Four kinds
- **WHEN** the list is shown in a tab wide enough for its buttons
- **THEN** its kind buttons read **People**, **Families**, **Sources**, **Media**,
  **Notes**, **Repositories** and **Other**, in that order, one of them is marked as
  active, and there is no button for the events or for the places

#### Scenario: The kinds in a dropdown
- **WHEN** the list is shown in a tab too narrow for the seven buttons beside the search
- **THEN** one dropdown, named as the kind of records shown, offers the same seven kinds in
  the same order with the kind shown chosen, and choosing **Notes** in it shows the notes

#### Scenario: A file with no places
- **WHEN** the list is shown for `curie.ged`, whose events name ten places
- **THEN** no kind lists the places, and the place of Marie's birth is read in her row among
  the people

### Requirement: A row selects its record, and the selected row is marked

Activating a row of the list, by a click, a tap, or Enter or Space on a row with the
focus, SHALL select that record in the tab, as the requirement on the selected record
says: the record card shows it, the tab stays in List mode, and no page or other tab is
opened. The row of the selected record SHALL be marked as selected, and as selected to
assistive technology, whichever kind is shown; with nothing selected, or a selected record
whose row the kind shown does not hold, no row SHALL be marked. Every record that can be
selected has a row in exactly one kind: a person, a family, a source, a multimedia
record, a shared note, a repository, and a submitter, a record of the file's own or the
file's header among the other records. A row of the Other kind for the file's header SHALL
select the header, which has no xref and is selected under the id `header:`. The mark SHALL follow the
selection however it was made: from the list, from the record card, by a link or by *Go
to record*; and SHALL stay across sorting, filtering and switching the kind, and be
marked again when its row is drawn. A selection made from the list SHALL NOT move the
list. A place is not a record and SHALL NOT be selected. Selecting SHALL NOT write to the file. On a phone, a tap on a row SHALL select the
record and open the right drawer on the card at once: the rule of the graph and the
timeline, that the first touch lights and the second selects, does not apply to rows.

The rows SHALL be drawn as the rows of Obsidian's own file explorer are: inset
from the edges of the list, with the explorer's radius on the hover, the selected
background and the focus ring alike, in the explorer's text size, line height and
vertical padding, one directly below the next with no gap, the first cell at the
size of the explorer's text and the others smaller. The hover and the selected row SHALL
take their colours and weight from the navigation variables Obsidian's themes set, and
the keyboard focus SHALL be drawn as the explorer draws its focused row: a ring in the
focus border colour, in the active tab of a desktop only, and never in the accent
colour. A row SHALL be selected to assistive technology, whatever the theme makes of its
colour, and SHALL NOT have stripes or lines between rows. The height of a row SHALL be
derived from that text size, so that it follows the reader's font size.

#### Scenario: Styled as the explorer's rows
- **WHEN** the list shows the people of `curie.ged` with Pierre Curie selected and the
  pointer over Marie's row
- **THEN** both rows have the explorer's radius, Pierre's has the explorer's active
  background and Marie's its hover background, and no other row is tinted

#### Scenario: The explorer's metrics
- **WHEN** the list shows the people of `curie.ged`
- **THEN** the name in a row is in the explorer's text size, a row is as tall as that
  size times the explorer's line height plus twice its vertical padding, and the next
  row begins where the one above ends

#### Scenario: The keyboard focus
- **WHEN** the reader moves the focus to a row with the arrow keys in the active tab of
  a desktop
- **THEN** the row has a ring in the focus border colour, not in the accent colour, and
  its background is unchanged

#### Scenario: Selecting Pierre in the list
- **WHEN** the tab is in List mode and the reader clicks Pierre Curie's row
- **THEN** the tab is still in List mode, his row is marked selected, the record card
  shows Pierre Curie, and no other tab is open

#### Scenario: A family row
- **WHEN** the reader chooses Families and clicks the Curies' row
- **THEN** the record card shows the Curies' family and that row is marked selected

#### Scenario: A source row
- **WHEN** the reader chooses Sources and clicks `Parish registers of Warsaw`
- **THEN** the record card shows that source and the row is marked selected

#### Scenario: Nothing selected
- **WHEN** the tab is in List mode and nothing is selected
- **THEN** no row is marked

#### Scenario: Selected from the record card
- **WHEN** Marie is selected in List mode and the reader activates Pierre Curie among her
  relatives in the record card
- **THEN** Pierre Curie's row is marked and Marie's is not

#### Scenario: A record with no row
- **WHEN** the list shows the notes and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the card shows Marie, the list still shows the notes, and no row of them is marked

#### Scenario: A media row
- **WHEN** the reader follows `[[curie.ged#@O5@]]` with the tab in List mode on the people
- **THEN** the list shows the media with the row of the family photograph marked and in
  view, and the card shows its media card

#### Scenario: A note row
- **WHEN** the reader chooses Notes and clicks the row of `@N1@`
- **THEN** the row is marked selected, the card shows that note's card, and the tab is still
  in List mode

#### Scenario: The header row
- **WHEN** the reader chooses Other and clicks *File header*
- **THEN** the row is marked selected and the card shows the header's card

#### Scenario: Kept across the modes
- **WHEN** Marie is selected in List mode, and the reader switches to Graph mode and
  back
- **THEN** her card in the graph was marked selected, and her row is marked selected
  again

#### Scenario: The list does not move
- **WHEN** the list is scrolled so that Marie's row is at its edge and the reader clicks
  it
- **THEN** her row is marked selected and the list has not scrolled

#### Scenario: A row on a phone
- **WHEN** the reader taps Marie's row on a phone
- **THEN** the right drawer opens on Marie's card

#### Scenario: A place row
- **WHEN** the reader chooses Repositories, and clicks `State Archive in Warsaw`, with Marie
  selected
- **THEN** the row of `State Archive in Warsaw` is marked selected, the record card shows that
  repository, and the tab is still in List mode

#### Scenario: Another place row
- **WHEN** `State Archive in Warsaw` is marked and the reader clicks `Nobel Prize Outreach`
- **THEN** only the row of `Nobel Prize Outreach` is marked

#### Scenario: The place is kept across the modes
- **WHEN** `State Archive in Warsaw` is marked, and the reader switches to Graph mode and back
- **THEN** the row of `State Archive in Warsaw` is marked again

#### Scenario: A place in a person's card
- **WHEN** the list shows the people with Marie selected and the reader presses
  `Warsaw, Congress Poland` in the summary of the closed birth in Marie's tree
- **THEN** the node of her birth opens, the list still shows the people with Marie's row
  marked, and the card still shows Marie

#### Scenario: A record selected elsewhere
- **WHEN** the list shows the repositories and Marie is selected in the graph
- **THEN** no row of the repositories is marked

### Requirement: The selected record is brought into view

The list SHALL bring the row of the selected record into view when the selection is
one it has not yet marked: a selection made from outside the list — from the record
card, by a link or *Go to record* — whether the list is
in view or out of it, and a selection the list meets when it is first drawn, which
includes a tab restored with the workspace, since the list's scroll position is not
saved. Bringing into view SHALL, in this order: switch to the record's kind where the
list shows another; clear the typed filter where it hides
the row; and, where the row is not wholly within the visible rows, scroll it to the
middle of the list's height, without animation.

When the reader returns to the list with the selection unchanged, the list SHALL first
put back the scroll position it left; then, where the row of the selected record is
shown but is not wholly within the visible rows, it SHALL be scrolled to the middle as
above, because the reader has just chosen this view. A filter the reader typed
SHALL NOT be cleared by returning to the list with the selection
unchanged. A selection made by activating a row of the list SHALL change neither the
scroll position, the kind nor the filter. While the list shows the Media, the
Notes, the Repositories or the Other records, the selection of a person, a family or a
source from a link, *Go to record*, the graph, the timeline or the cursor SHALL NOT switch
the list away from the kind it shows, and no row of it SHALL be marked; the selection of a
multimedia record, a shared note, a repository or a record of the Other kind,
however it was made, SHALL switch the list to the kind that holds its row and bring that row
into view when the list brings a selection into view as this requirement says: at once for
one made from the card, by a link or by *Go to record*, and, for one made by the cursor in
Source, when the list is next shown. A record that the reader selects in the record card — a person on the card of a family, a repository on the card of a source, a note opened from a card, for some — SHALL switch the list to the kind of that record and bring its row into view.

#### Scenario: Entering the list with a selection
- **WHEN** a file of 500 people has its 400th person selected in Graph mode and the
  reader switches to List mode
- **THEN** that person's row is drawn, marked selected, and inside the middle half of the
  list's visible height

#### Scenario: A tab restored with a selection
- **WHEN** a file of 500 people has its 400th person selected in a tab in List mode, and
  Obsidian is restarted
- **THEN** that person's row is drawn, marked selected, and inside the middle half of the
  list's visible height

#### Scenario: Returning with the place kept
- **WHEN** nobody is selected, the reader scrolls the list, switches to Graph mode and back
- **THEN** the list is scrolled to the same place

#### Scenario: Returning to a selected row that is out of sight
- **WHEN** the 400th of 500 people is selected, the reader scrolls the list to the top,
  switches to Graph mode and back
- **THEN** the row of the 400th person is inside the middle half of the list's height

#### Scenario: Returning with the row in sight
- **WHEN** Marie is selected, the reader scrolls the 17 people a little, switches to Graph
  mode and back
- **THEN** the list is scrolled to the same place

#### Scenario: A filter kept on returning
- **WHEN** Marie is selected, the filter holds `joliot`, and the reader switches to Graph
  mode and back
- **THEN** the filter still holds `joliot`

#### Scenario: The kind follows the record
- **WHEN** the list shows the people and the reader activates the Curies' family in the
  record card
- **THEN** the list shows the families, with the Curies' row marked selected

#### Scenario: A filter that hides the row
- **WHEN** the filter holds `joliot` and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the filter is empty and Marie's row is marked selected

#### Scenario: The filter stays after a click in the list
- **WHEN** the filter holds `joliot` and the reader clicks Pierre Joliot's row
- **THEN** the filter still holds `joliot`

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in List mode is behind another tab, the reader follows
  `[[curie.ged#@I2@]]` into it, and then brings the tab to the front
- **THEN** Pierre Curie's row is marked selected and in view

#### Scenario: Selected in Source and then shown
- **WHEN** the reader moves the cursor into Marie's record in Source mode, so that she is
  selected, and then switches to List mode
- **THEN** Marie's row is marked selected

#### Scenario: The places stay
- **WHEN** the list shows the media and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the list still shows the media and no row of them is marked, and Marie's row is
  marked once the reader chooses People

#### Scenario: A person pressed in the card of a place
- **WHEN** the list shows the notes, the reader followed `[[curie.ged#@F3@]]`, so that the
  card shows the Curies' family and the notes stay, and the reader presses Pierre Curie in
  the tree of that family
- **THEN** the list shows the people with the row of Pierre Curie marked and in view

#### Scenario: A family pressed in the card of a place
- **WHEN** the list shows the media, the reader followed `[[curie.ged#@I1@]]`, and the reader
  presses the Curies' family in Marie's tree
- **THEN** the list shows the families with the row of the Curies' family marked and in view

#### Scenario: The notes stay for a person from the graph
- **WHEN** the list shows the notes and Pierre Curie is selected in the graph, and the
  reader comes back to List mode
- **THEN** the list still shows the notes and no row of them is marked

#### Scenario: A repository pressed in the card of a source
- **WHEN** the list shows the sources, `Parish registers of Warsaw` is selected, and the
  reader presses `State Archive in Warsaw` in the tree of its card
- **THEN** the list shows the repositories with the row of `State Archive in Warsaw` marked
  and in view

#### Scenario: A medium selected by the cursor
- **WHEN** the list shows the notes, the reader moves the cursor into `@O5@` in Source mode
  and rests there, and then switches to List mode
- **THEN** the list shows the media with the row of the family photograph marked and in view

#### Scenario: A note from a link while the people are shown
- **WHEN** the list shows the people, filtered by `joliot`, and the reader follows
  `[[curie.ged#@N2@]]`
- **THEN** the list shows the notes, its filter empty, with the row of `@N2@` marked and in view

### Requirement: Media

The **Media** kind SHALL list every multimedia record the file declares with an identifier,
in the order the file writes them without a sort. Its columns SHALL be **Title**, the
record's name as the card names it — its title, or, where it states none, the name of its
first file; **File**, the path or address of its first file as written; **Format**, the
format the record states for that file, where it states one; and **Linked from**, how many
records point at it, as the requirement on what a list counts says. The count above the
rows SHALL be of media. Choosing a row SHALL select the record and show its media card. On a
phone a row SHALL take two lines: the title with the count at its end, and the file and the
format beneath.

#### Scenario: The media of a file
- **WHEN** the list shows the media of `curie.ged`
- **THEN** its seven multimedia records are listed in the order of the file, the count reads
  `7 media`, and the row of `The Curie family, about 1908` reads
  `Media/curie-family-1908.svg`, `image/svg+xml` and `2`

#### Scenario: A medium nothing links
- **WHEN** the list shows the media of `curie.ged`
- **THEN** the row of `A plate nobody can find` reads `0` under Linked from

#### Scenario: A medium with no title
- **WHEN** a multimedia record states `1 FILE scans/letter.jpg` and no title
- **THEN** its row's Title reads `letter.jpg`

#### Scenario: A phone
- **WHEN** the reader opens the media of `curie.ged` on a phone, 390 pixels wide
- **THEN** each row takes two lines of at least 44 pixels, the title and its count, as
  `Linked from 2`, on the first, the file and the format on the second

### Requirement: Notes

The **Notes** kind SHALL list every shared note the file declares with an identifier — a
7.0 `SNOTE` record and a 5.5.1 `NOTE` record — in the order the file writes them without a
sort. Its columns SHALL be **Text**, the first line of the note's text that is not empty,
read with its `CONC` and `CONT` lines joined, cut to the width of the column; and
**Linked from**, how many records point at the note. The count above the rows SHALL be of
notes. Choosing a row SHALL select the note and show its card. On a phone a row SHALL take
two lines: the text, wrapped to two lines and cut after the second, with the count at the
end of the first.

#### Scenario: The notes of a file
- **WHEN** the list shows the notes of `curie.ged`
- **THEN** two rows are listed, the first reading `The only person to have won a Nobel Prize
  in two different sciences:` and `1`, and the count reads `2 notes`

#### Scenario: A 5.5.1 note continued
- **WHEN** a 5.5.1 file declares `0 @N1@ NOTE Born in War` with `1 CONC saw` and
  `1 CONT in 1867` beneath it
- **THEN** its row's Text reads `Born in Warsaw`

#### Scenario: A file with many notes
- **WHEN** the list shows the notes of a file that declares 1478 shared notes
- **THEN** 1478 rows are listed, the count reads `1478 notes`, only a window of the rows is
  in the page, scrolling draws the rows that come into view, and the first rows are drawn
  within a second of choosing Notes in headless Chromium

#### Scenario: A phone
- **WHEN** the reader opens the notes of `curie.ged` on a phone, 390 pixels wide
- **THEN** each row takes two lines of at least 44 pixels, the text over both and
  `Linked from 1` at the end of the first

### Requirement: Repositories

The **Repositories** kind SHALL list every repository the file declares with an identifier,
in the order the file writes them without a sort. Its columns SHALL be **Name**, as the card
names it; **Address**, the first line of its address, where it states one; and
**Sources**, how many source records point at it. The count above the rows SHALL be of
repositories. Choosing a row SHALL select the repository and show its card. On a phone a row
SHALL take two lines: the name with the count at its end, and the address beneath.

#### Scenario: The repositories of a file
- **WHEN** the list shows the repositories of `curie.ged`
- **THEN** `Nobel Prize Outreach` reads no address and `2`, `State Archive in Warsaw` reads
  `Krzywe Koło 7` and `1`, and the count reads `2 repositories`

#### Scenario: A phone
- **WHEN** the reader opens the repositories of `curie.ged` on a phone, 390 pixels wide
- **THEN** each row takes two lines of at least 44 pixels, the name and `1 source` or
  `2 sources` on the first, the address on the second

### Requirement: Other records

The **Other** kind SHALL list, first, the header of the file, named *File header*, and then,
in the order the file writes them, every record the file declares with an identifier that
no other kind lists — a submitter, a 5.5.1 submission record, a record of the file's own
such as `0 @X1@ _PLAN`. The trailer of the file and any record without an identifier other
than the header SHALL NOT be listed. Its columns SHALL be **Kind**, the record's kind in the
reader's language where the plugin names it — *Header*, *Submitter*, *Submission* among them —
and its tag as written otherwise; **Name**, the record's name as the card names it; and
**Linked from**, how many records point at it, left blank on the header's row, which nothing
can point at. The count above the rows SHALL be of records, the header included. Choosing a row SHALL select the record and show its card. On a phone a
row SHALL take two lines: the name with the count at its end, and the kind beneath.

#### Scenario: The header and a submitter
- **WHEN** the list shows the other records of `curie.ged`
- **THEN** the first row reads *Header* and *File header* and nothing under Linked from, the
  second *Submitter*, `Domorium` and `1`, no row is the trailer, and the count reads `2 records`

#### Scenario: A record of the file's own
- **WHEN** a file declares `0 @X1@ _PLAN` with `1 NAME Research plan`
- **THEN** a row reads `_PLAN` as its Kind and `Research plan` as its Name

#### Scenario: A submission in 5.5.1
- **WHEN** a 5.5.1 file declares `0 @SUB1@ SUBN`
- **THEN** a row reads *Submission* as its Kind, in the reader's language

#### Scenario: A phone
- **WHEN** the reader opens the other records of `curie.ged` on a phone, 390 pixels wide
- **THEN** each row takes two lines of at least 44 pixels, `Domorium` and `Linked from 1` on
  the first and *Submitter* on the second

### Requirement: What a list counts

**Linked from** SHALL count records, not lines: the number of distinct records of the file —
its header among them — that hold, on any line at any depth, a pointer to the record the row
shows. A record pointing at it twice SHALL count once; a record pointing at itself, a
pointer `@VOID@`, and text that only looks like a pointer in a `CONC` or `CONT` line SHALL
NOT count. The **Sources** of a repository SHALL count, in the same way, the source records
that point at it. The counts SHALL be read from the file as the tab holds it, as every
column is.

#### Scenario: Two pointers from one record
- **WHEN** a person's record points at the note `@N1@` from a line of its own and again from
  beneath its birth, and a family's record points at it once
- **THEN** the row of `@N1@` reads `2` under Linked from

#### Scenario: A void pointer
- **WHEN** a 7.0 person's record states `1 SNOTE @VOID@`
- **THEN** no row counts it

#### Scenario: The header points at the submitter
- **WHEN** the header of `curie.ged` states `1 SUBM @U1@` and no other record points at `@U1@`
- **THEN** the submitter's row reads `1` under Linked from

### Requirement: The new kinds have no actions and nothing in them writes

While the list shows the media, the notes, the repositories or the other records, the row of
the kinds SHALL hold the kinds and the search and nothing else,
and nothing the reader does in them SHALL write to the file, a note or any other file. A
kind with no record SHALL say that the file holds none.

#### Scenario: No repositories
- **WHEN** the list shows the repositories of a file that declares none
- **THEN** it says the file holds no repositories

#### Scenario: Nothing is written
- **WHEN** the reader sorts, searches and selects rows in each of the four kinds
- **THEN** no note or file in the vault has been created or changed
