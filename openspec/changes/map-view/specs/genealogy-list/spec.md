## MODIFIED Requirements

### Requirement: A GEDCOM tab can show its file as a list

A GEDCOM tab SHALL offer a **List** mode that shows the people, the families, the
sources or the places of its file as a table, in the tab itself, with no tab of its own and no sidebar.
The tab SHALL enter it from the mode control in its header, from a command, from the
tab's menu, as the requirement on the mode control says, and a file opened anew MAY open
in it by the rule for a new tab, as the requirement on the modes of a GEDCOM tab says. Entering it SHALL NOT open another tab.

The list SHALL be drawn from the same reading of the tab's text that the record card,
the graph and the timeline use, and SHALL NOT read the file from the vault itself. It
SHALL show the file as the tab holds it, including text typed in the tab and not yet
saved, and SHALL show every later change to it: at once while the tab is in view, and the
next time it is brought into view otherwise. A tab SHALL NOT draw the list before it has
read its file. The list SHALL keep the kind it shows, the sort of each kind and, on the Places, the
place whose row is marked, across leaving the mode and coming back and across closing and
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

#### Scenario: A place marked, restored with the workspace
- **WHEN** the tab is in List mode on the places of `curie.ged`, `Paris, France` is marked,
  and Obsidian is restarted
- **THEN** the tab shows the places with the row of `Paris, France` marked

### Requirement: People, families and sources

The list SHALL show the file's people, its families, its sources or its places, switched by
four buttons at its top, labelled **People**, **Families**, **Sources** and **Places**, in
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
- places: as the requirement on the places says.

Without a sort the people, the families and the sources SHALL be in the order the file
declares them, and the places in alphabetical order. Above the rows the
list SHALL say how many it shows, and, where the filter narrows them, how many of all:
`17 people`, `5 families`, `3 sources`, `10 places`, `11 of 17 people`, spelt by the plural rules of
the language shown. A record the file declares without an identifier SHALL NOT be listed,
since it cannot be selected. A kind with no record SHALL say that the file holds none.

#### Scenario: A person row
- **WHEN** the list shows the people of `curie.ged`
- **THEN** Marie's row reads `Marie Skłodowska-Curie`, `1867–1934`,
  `Warsaw, Congress Poland` and `2`, and the count reads `17 people`

#### Scenario: A family row
- **WHEN** the list shows the families of `curie.ged`
- **THEN** the Curies' row reads `Pierre Curie and Marie Skłodowska-Curie`, `1895`,
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
- **WHEN** the list is shown
- **THEN** its kind buttons read **People**, **Families**, **Sources** and **Places**, in that
  order, and one of them is marked as active

#### Scenario: A file with no places
- **WHEN** the list shows the places of a file whose events name no place
- **THEN** it says the file names no places

### Requirement: The search

The list SHALL have the expanding search the graph and the timeline have: an icon at the
end of the toolbar, above the rows and clear of the headers and the scrollbar, that gives
way to a field when pressed and comes back when the field is closed empty. It SHALL narrow
the rows as the reader types, not step through matches, and so SHALL have no arrows. For people it SHALL
match the name, any other name the record states, the years shown and the place shown; for
families the spouses' names, the year and the place; for sources the title, the author and
the repository; for places the name of the place. A year before the common era SHALL be matched by its digits as the file
writes it, not by the mark of the era shown beside it, so the same filter finds it in any
language. Case SHALL NOT matter, nor, for places, the marks on letters and the letters that do not
decompose — `ł`, `ß`, `ø`, `đ`, `æ`, `œ` and `ı` match `l`, `ss`, `o`, `d`, `ae`, `oe` and `i`
— as in the search of the map. A search matching nothing SHALL say so and say what it
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
- **WHEN** the reader types `PARIS` among the places of `curie.ged`
- **THEN** only `Paris, France` is listed and the count reads `1 of 10 places`

#### Scenario: Filtering the places without marks
- **WHEN** a place is named `Łódź, Poland` and the reader types `lodz`
- **THEN** `Łódź, Poland` is listed

#### Scenario: Nothing matches among the places
- **WHEN** the reader types `zzz` among the places
- **THEN** the list says nothing matches `zzz` and that the filter covers place names

### Requirement: Sorting by a column

On a wide tab each column header of the list SHALL be a button. Pressing it SHALL sort
the rows by that column ascending, pressing it again descending, and pressing it a third
time SHALL return them to the order of the file, and the places to alphabetical order; the header of the column the rows are
sorted by SHALL say which way to assistive technology, and the others SHALL say none.
Sorting SHALL be stable: rows whose values compare equal keep the order of the file,
descending too, and places the order in which the file first names them. Names SHALL be compared by surname and then given name, and every text
column by the collation of the language shown, numbers inside a text counted as numbers,
so that a letter with a mark sorts with its base letter. Years SHALL be compared by the
year of birth, or, for places, by the first year of an event there, Marriage by the year of
the marriage, Sources, Children, Cited by and Events as numbers, and Coordinates by
whether the place has any, those with none coming first when ascending. A row whose value is missing — no birth year, no marriage, no place, no
author, an unnamed person, an untitled source, a place with no dated event — SHALL come last in either direction. The
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
- **WHEN** the reader presses Events twice among the places of `curie.ged`
- **THEN** `Warsaw, Congress Poland`, with twelve events, is first, and the places with one
  event follow in the order in which the file first names them

#### Scenario: Pressing a third time among the places
- **WHEN** the reader presses Events three times among the places
- **THEN** the places are in alphabetical order and no header says it sorts

#### Scenario: Sorting the places by coordinates
- **WHEN** the reader presses Coordinates among the places of `curie.ged`
- **THEN** the six places with no coordinates come first and the four with coordinates last

### Requirement: A row selects a record, and the selected row is marked

Activating a row of the list, by a click, a tap, or Enter or Space on a row with the
focus, SHALL select that record in the tab, as the requirement on the selected record
says: the record card shows it, the tab stays in List mode, and no page or other tab is
opened. The row of the selected record SHALL be marked as selected, and as selected to
assistive technology, whichever kind is shown; with nothing selected, or a record that
has no row — a multimedia record — no row SHALL be marked. The mark SHALL follow the
selection however it was made: from the list, from the record card, by a link or by *Go
to record*; and SHALL stay across sorting, filtering and switching the kind, and be
marked again when its row is drawn. A selection made from the list SHALL NOT move the
list. A row of the Places SHALL NOT select a record, since a place is not one: activating it
SHALL mark that row, and as selected to assistive technology, and nothing else, so that the
tab stays in List mode, the selection and the record card are as they were, the map does not
move and no panel is opened; with another row marked, that one SHALL be marked no more. Selecting SHALL NOT write to the file. On a phone, a tap on a row SHALL select the
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
- **WHEN** the reader follows `[[curie.ged#@O5@]]` with the tab in List mode
- **THEN** the card shows the family photograph and no row is marked

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
- **WHEN** the reader chooses Places, and clicks `Paris, France`, with Marie selected
- **THEN** the row of `Paris, France` is marked selected, the record card still shows Marie,
  and the tab is still in List mode

#### Scenario: Another place row
- **WHEN** `Paris, France` is marked and the reader clicks `Warsaw, Congress Poland`
- **THEN** only the row of `Warsaw, Congress Poland` is marked

#### Scenario: The place is kept across the modes
- **WHEN** `Paris, France` is marked, and the reader switches to Map mode and back
- **THEN** the row of `Paris, France` is marked again

#### Scenario: The place is let go with the kind
- **WHEN** `Paris, France` is marked and the reader chooses People and then Places
- **THEN** no row of the places is marked

### Requirement: The selected row is brought into view

The list SHALL bring the row of the selected record into view when the selection is
one it has not yet marked: a selection made from outside the list — from the record
card, by a link, *Go to record*, or Back and Forward in the card — whether the list is
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
scroll position, the kind nor the filter. Where the record has no row, the list SHALL
be left as it is, and so it SHALL be on the Places, where no record has a row: a selection
SHALL NOT switch the list away from them, and the row of the selected record is marked
when the list next shows its kind.

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
- **WHEN** the list shows the places and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the list still shows the places and no row of them is marked, and Marie's row is
  marked once the reader chooses People

### Requirement: The list is reachable with the keyboard

The rows of the list SHALL be one stop in the order of the tab key, after the kind
buttons, the search and the headers. With the focus on a row, the Up and Down arrows
SHALL move it to the previous and next row of the rows shown, Home and End to the first
and the last, and Page Up and Page Down by what the list shows at once; the row given the
focus SHALL be drawn and brought into view, also where only a window of rows is drawn.
Enter or Space SHALL select the record of the row with the focus, or, in the Places,
mark the row, and the focus SHALL stay on the row. Moving the focus SHALL NOT select. The list SHALL be a grid to assistive
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
- **WHEN** the focus is on the row of `Paris, France` among the places and the reader presses
  Enter
- **THEN** the row is marked, the focus is still on it, and no record is selected

## ADDED Requirements

### Requirement: Places

The **Places** kind SHALL list every place the file names in an event of a person or a family, once
each, whether the place has coordinates or not, each named as its first occurrence in the
file writes it: two spellings that differ only in case, in the space between words or in
the form of a letter are one place. Its columns SHALL be **Place**, **Events**, the number
of events at the place, **Years**, the years of those events as `1855–1958`, or the one year, or nothing
where none is dated, and **Coordinates**, the coordinates the map draws the place at, in degrees
as `48.8566, 2.3522`. A place with no coordinates SHALL show, in place of the coordinates, a mark that is a shape with a
text alternative **No coordinates**, the mark of the people who cite no source, and not colour
alone; on a phone and in a narrow tab the label SHALL be written out beside the shape. While the
places table, which may give the place its coordinates, has not been read yet, the list SHALL show
the coordinates the file gives and no mark, so that a place is not shown as lacking coordinates
that the table is about to give it. Without a sort the places SHALL be in alphabetical order by the collation of the language shown. The
count above the rows SHALL be of places, spelt by the plural rules of the language shown, and each
row SHALL be a row of the grid of the list, and a place SHALL be one row however many events it has.

#### Scenario: The places of a file
- **WHEN** the list shows the places of `curie.ged` with `MAP`s in the file and the places table has no rows
- **THEN** ten places are listed alphabetically, the count reads `10 places`, the row of `Paris, France`
  reads `11`, `1855–1958` and `48.8566, 2.3522`, and the row of `Mulhouse, France` reads `1`, `1827`
  and the mark **No coordinates**

#### Scenario: A mark that is not colour alone
- **WHEN** a place has no coordinates
- **THEN** its row carries a shape of its own with the text alternative **No coordinates**, and the
  shape is the same whatever the theme

#### Scenario: A place from the places table
- **WHEN** the places table gives `Sceaux, France` coordinates
- **THEN** its row shows them, and no mark

#### Scenario: The table is not read yet
- **WHEN** the tab has just shown the places and the places table has not been read
- **THEN** no row carries the mark, and the marks appear once the table has been read or found missing

#### Scenario: Two spellings
- **WHEN** the file names `Paris, France` and `paris,  france`
- **THEN** one row is listed, named `Paris, France`, with the events of both

#### Scenario: A phone
- **WHEN** the reader opens the places on a phone, 390 pixels wide
- **THEN** each row takes two lines of at least 44 pixels, the place and its events on the first,
  the years and the coordinates, or the mark and **No coordinates**, on the second

### Requirement: The actions of the places table are in the header of the Places

While the list shows the Places and the places table has been read or found missing, the end of
the row of the kind buttons SHALL hold a button for the table, reading **Create the places table**
where the table of the file does not exist and **Open the places table** where it does. Pressing it
SHALL do what the same button of the map's empty state does: create the table as the requirement on that
state says and open it in a tab of the workspace, creating nothing where the note exists. Where the table
exists and some places of the file that the file gives no coordinates have no row in it, a second button,
**Add the N places that have no row**, SHALL append those places, named as first written, with empty coordinates, to the end of the
first table of the note and change nothing else in it; where the note has no table, it SHALL add the header
and the rows at its end. It SHALL write only that note. The buttons SHALL NOT be shown on the other kinds, SHALL NOT add a
row above the kind buttons, SHALL be at least 44 CSS pixels tall on a touch device, SHALL wrap
under the kind buttons where the tab is too narrow for one line, and SHALL be reachable with the keyboard.
Where a button goes because it has done its work, the focus SHALL move to the rows.

#### Scenario: No places table
- **WHEN** the list shows the places of a file that has no places table
- **THEN** the end of the row of the kind buttons reads **Create the places table**, and no second button

#### Scenario: A places table
- **WHEN** `curie.places.md` exists
- **THEN** the button reads **Open the places table** and opens that note in a tab

#### Scenario: Adding the missing places
- **WHEN** the table has a row for Mulhouse and the file names five more places that have no
  coordinates, and the reader presses **Add the 5 places that have no row**
- **THEN** five rows with empty coordinates, named as first written, are appended to the table, the rows already
  there and the text around them are unchanged, and the button goes

#### Scenario: Every place has a row or coordinates
- **WHEN** every place without coordinates has a row in the table
- **THEN** only the button for the table is shown

#### Scenario: Not on the other kinds
- **WHEN** the reader chooses People
- **THEN** no button of the places table is shown

#### Scenario: A phone
- **WHEN** the reader opens the places on a phone
- **THEN** the buttons are at least 44 pixels tall and fit the width of the tab without scrolling it sideways

### Requirement: The map's counter opens the Places

Where the tab is switched to the list by the counter of the places with no coordinates in the map's scope row,
the list SHALL show the Places with its search empty and no place marked, the sort of each kind as it was. The list SHALL show every place of the file, not only those of the map's branch or years range.

#### Scenario: From the map
- **WHEN** the reader presses `6 places have no coordinates` in the map, and the list had the sources
  filtered by `nobel`
- **THEN** the tab shows the list on the Places, with an empty search and ten places

#### Scenario: A search left in the places
- **WHEN** the list shows the places filtered by `paris`, the reader goes to the map and presses the counter
- **THEN** the list shows ten places with the search empty
