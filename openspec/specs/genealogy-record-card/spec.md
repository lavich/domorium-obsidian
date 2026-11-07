# genealogy-record-card Specification

## Purpose
TBD - created by archiving change record-card-panel. Update Purpose after archive.

## Requirements

### Requirement: The card lives in the right sidebar and follows the GEDCOM tab

While the **Genealogy interface** setting is on, the plugin SHALL offer a view
named **Record**, the record card, in the right sidebar. It SHALL be placed there, without taking the focus, the first time in a session a record is selected in a
GEDCOM tab by a gesture of the reader — a click, a tap, a key on a card or a row, a row of the list, a link, *Go to record* — and no card is open; a reader who then closes it SHALL not have it put back until the plugin loads again, unless the setting **Open the record card when selecting** is on, as below. It SHALL open from the command **Show the record card**, which SHALL expand the sidebar if it is collapsed, bring the card into view and give it the focus. Where the right sidebar is a drawer, as on a phone, the card SHALL be reached from that drawer, and selecting a record by a second touch on a card, a node or a row of Graph or Timeline, and by a tap on a row of the list, SHALL open the drawer on the card, putting the card there if it is not open (even if the reader closed it earlier). Where the sidebar is not a drawer and the setting **Open the record card when selecting** is on, selecting a record by a click, a tap or a key on a card, a node or a row of Graph, Timeline or List, or by a link or *Go to record*, SHALL put the card in the right sidebar if no card is open, even if the reader closed it earlier, and SHALL expand the right sidebar if it is collapsed, without moving the focus from where the reader is, and SHALL NOT open or expand the left sidebar; a card that is open in an expanded sidebar SHALL be left as it is, also when another tab of the sidebar is in front. Selecting by the cursor resting in Source, by Back or Forward in the card, or by a relative, a citation or a tile in the card SHALL NOT expand or switch the sidebar. Where the sidebar is not a drawer and the setting is off, a selection by the reader SHALL NOT move, switch or expand it, once the card has been placed or not. While the genealogy interface is off, the plugin
SHALL NOT place the card, SHALL NOT offer the command, and SHALL close a card that
is open.

The card SHALL show the selected record of the GEDCOM tab most recently active,
and SHALL follow that tab as the reader moves between tabs, whatever the mode of
the tab. Where no GEDCOM tab is open it SHALL say so. Where the tab has nothing
selected it SHALL say to select a record in the graph, the timeline or the list;
where the file declares no person, family or source it SHALL say that the file holds nothing to show. When the record it shows changes, the card SHALL announce the record's name in a polite live region, in the reader's language.

#### Scenario: The first selection
- **WHEN** the Genealogy interface is on, no card is open, and the reader opens
  `curie.ged` in Graph mode and activates Marie's card
- **THEN** the right sidebar gains the Record view as one of its tabs showing
  Marie Skłodowska-Curie, and the graph keeps the focus

#### Scenario: Closed by the reader
- **WHEN** the setting **Open the record card when selecting** is off, the card was placed, the reader closed it, and selects Pierre Curie
- **THEN** the card is not put back during that session

#### Scenario: Closed by the reader, with the setting on
- **WHEN** the setting is on, the card was placed, the reader closed it, and clicks Pierre Curie's card in the graph
- **THEN** the card is put back in the right sidebar showing Pierre Curie, and the graph keeps the focus

#### Scenario: The command
- **WHEN** the card is open behind another tab of the right sidebar, or the
  sidebar is collapsed, and the reader runs **Show the record card**
- **THEN** the right sidebar is open on the card

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** no card is placed and the palette does not offer **Show the record
  card**

#### Scenario: Turning it off with the card open
- **WHEN** the card is open and the reader turns the interface off
- **THEN** the card is closed

#### Scenario: No GEDCOM tab
- **WHEN** the card is open and no GEDCOM tab is
- **THEN** the card says no GEDCOM file is open

#### Scenario: Nothing selected
- **WHEN** the active GEDCOM tab is in Graph mode with nothing selected
- **THEN** the card says to select a record in the graph, the timeline or the
  list

#### Scenario: A file with no people
- **WHEN** the active GEDCOM tab holds a file declaring no `INDI`, `FAM` or `SOUR`
  record
- **THEN** the card says the file holds nothing to show

#### Scenario: Following the tab
- **WHEN** Marie is selected in the tab of `curie.ged` and the reader moves to
  another GEDCOM tab with Pierre Curie selected
- **THEN** the card shows Pierre Curie, and shows Marie again when the reader
  returns to the first tab

#### Scenario: Moving to a Markdown note
- **WHEN** the reader moves from the GEDCOM tab to a Markdown note
- **THEN** the card still shows the record of that GEDCOM tab

#### Scenario: On a phone
- **WHEN** the reader touches Marie's card in the graph on a phone, and then
  touches it again
- **THEN** the right drawer opens on Marie's card

#### Scenario: On a phone after the card was closed
- **WHEN** the card was placed and closed in this session, and the reader touches
  Marie's card in the graph on a phone twice
- **THEN** the right drawer opens on Marie's card

#### Scenario: A collapsed sidebar on a desktop
- **WHEN** the setting is off, the card is open, the right sidebar is collapsed, and the reader activates
  Marie's card in the graph
- **THEN** the sidebar stays collapsed, and the card shows Marie when it is opened

#### Scenario: Both sidebars collapsed
- **WHEN** the setting is on, both sidebars are collapsed, and the reader clicks Marie's card in the graph on a desktop
- **THEN** the right sidebar expands on the card showing Marie, the left sidebar stays collapsed, and the graph keeps the focus

#### Scenario: The setting is off
- **WHEN** the setting is off, both sidebars are collapsed, and the reader clicks Marie's card in the graph
- **THEN** both sidebars stay collapsed

#### Scenario: A card already visible
- **WHEN** the setting is on, the card is open in the expanded right sidebar and the reader clicks Pierre's card in the graph
- **THEN** the sidebar is not expanded, switched or moved, and the card shows Pierre

#### Scenario: Collapsed again by the reader
- **WHEN** the setting is on and the reader collapsed the right sidebar after the card opened, then clicks Marie's card in the graph
- **THEN** the right sidebar expands again on the card

#### Scenario: Following the cursor in Source
- **WHEN** the setting is on, both sidebars are collapsed, the tab is in Source mode, and the cursor rests in Pierre's record
- **THEN** no sidebar opens

#### Scenario: Back in the card
- **WHEN** the setting is on, the card is open in the expanded right sidebar, the reader collapsed the left sidebar, and presses Back in the card
- **THEN** neither sidebar is expanded, switched or moved

#### Scenario: A row of the list
- **WHEN** the setting is on, the right sidebar is collapsed and the tab is in List mode, and the reader clicks Marie's row
- **THEN** the right sidebar expands on the card showing Marie, and the list keeps the focus

#### Scenario: On a phone, a row of the list
- **WHEN** the reader taps Marie's row in the list on a phone
- **THEN** the right drawer opens on Marie's card

#### Scenario: The announcement
- **WHEN** the reader selects Pierre Curie
- **THEN** a polite live region of the card reads `Pierre Curie`

### Requirement: In Source mode the cursor and the selection go together

In Source mode, selecting a record from a link, *Go to record* or by activating something in the card SHALL put the cursor at the record's first line and scroll it into view; the editor SHALL take the focus when the selection came from a link or *Go to record*, and SHALL NOT when it came from the card. A selection that came from the cursor itself, and one that came from the card's Back and Forward, SHALL NOT move the cursor or take the focus. While the Genealogy interface is off, following a link or choosing *Go to record* in Source mode SHALL still put the cursor at the record, and nothing SHALL be selected. Moving the cursor into a
record that has a card SHALL, once the cursor has rested, select that record
without moving the cursor; a cursor in a record with no card, or between records,
SHALL leave the selection as it is.

Switching to Source mode with a record selected SHALL put the cursor at the start
of the selected fact's lines, or else of the record's lines, and scroll it into
view, unless the cursor is already within those lines. Leaving Source mode SHALL
select the record under the cursor where it has a card.

#### Scenario: Opening Pierre in the source
- **WHEN** the tab is in Source mode and the reader follows `[[curie.ged#@I2@]]`
- **THEN** the tab stays in Source mode with the cursor on `0 @I2@ INDI`, and the
  card shows Pierre Curie

#### Scenario: Opening a family in the source
- **WHEN** the tab is in Source mode and the reader follows `[[curie.ged#@F3@]]`
- **THEN** the tab stays in Source mode with the cursor on `0 @F3@ FAM`, and the
  card shows the Curies' family

#### Scenario: A relative in the card
- **WHEN** the tab is in Source mode and the reader activates Pierre Curie among
  Marie's relatives in the card
- **THEN** the cursor is on `0 @I2@ INDI`, in view, the card shows Pierre Curie,
  and the focus is still in the card

#### Scenario: Back in the source
- **WHEN** the tab is in Source mode, the reader selected Marie and then Pierre by
  links, the cursor is on `0 @I2@ INDI`, and the reader presses Back in the card
- **THEN** the card shows Marie, and the cursor and the focus have not moved

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the tab is in Source mode with the cursor on `0 @I1@ INDI`, and nothing is
  selected

#### Scenario: The cursor moves into a record
- **WHEN** the tab is in Source mode and the reader moves the cursor into Marie's
  record and rests there
- **THEN** the card shows Marie Skłodowska-Curie

#### Scenario: A note at the cursor
- **WHEN** Marie is selected and the reader moves the cursor into the shared note
  record `@N1@`
- **THEN** the card still shows Marie

#### Scenario: Switching to the source from Marie's birth
- **WHEN** Marie's birth is selected on her card and the reader switches to Source
  mode
- **THEN** the cursor is on her `1 BIRT` line, in view

#### Scenario: Switching to the source from the graph
- **WHEN** the cursor is in Pierre Curie's record in Source mode, and the reader
  switches to Graph mode and then to Source mode
- **THEN** the cursor is where it was

#### Scenario: Through the graph
- **WHEN** the cursor is on a line inside Pierre Curie's record, and the reader
  switches to Graph mode
- **THEN** Pierre Curie is selected, and the card shows Pierre Curie

### Requirement: Moving between records in the card

The card SHALL keep, for its tab, the history of the records it has shown, and SHALL
offer **Back** and **Forward** between them: two buttons in its header, disabled where there is nowhere to go. Selecting a record from anywhere but the card's own Back and Forward SHALL add
a step after the current one and drop the steps that were forward of it. A record
shown only because the cursor passed through it in Source mode SHALL NOT leave a
step: moving the cursor on to the next record SHALL replace it. Going back or
forward SHALL select that record as any selection does — marking it in a view and bringing it into view in the view, but not moving the cursor in Source mode — and SHALL skip a record that is no longer in the file.

The tab's own Back and Forward SHALL NOT step between records: selecting a record,
following a link and switching mode are not steps of the tab. The history belongs
to the tab and lasts while it is open; the workspace does not save it.

#### Scenario: Back to the previous person
- **WHEN** the reader selects Marie, then activates Pierre Curie among her relatives,
  and presses Back in the card
- **THEN** the card shows Marie Skłodowska-Curie, and Forward shows Pierre Curie
  again

#### Scenario: A new step drops what was forward
- **WHEN** the reader selects Marie, then Pierre, presses Back, and then activates
  Irène's card in the graph
- **THEN** the card shows Irène and Forward is disabled

#### Scenario: Nowhere to go
- **WHEN** the reader has selected only Marie
- **THEN** Back and Forward are both disabled

#### Scenario: Back moves the view
- **WHEN** the tab is in Graph mode, the reader selected Marie and then Irène, and
  presses Back in the card
- **THEN** Marie's card in the graph is marked selected and the graph glides to it

#### Scenario: A record the cursor passed
- **WHEN** the tab is in Source mode, the reader followed a link to Marie, and
  then moves the cursor into Pierre Curie's record and on into Irène's
- **THEN** Back shows Marie, and Forward shows Irène

#### Scenario: The tab's own Back
- **WHEN** the reader selects Marie and then Pierre and presses the tab's Back
- **THEN** Pierre is still selected, because no step of the tab's history was made

#### Scenario: A record that is gone
- **WHEN** the card has shown Marie and then Pierre, Marie's record is removed from
  the file, and the reader presses Back
- **THEN** Back finds no record to show and the card still shows Pierre

### Requirement: The person card

A person card SHALL show, without any cross-reference identifier, level number or
tag, in this order, each section left out where the record holds nothing for it, except
the two that say what is missing: the parents in the family, and the evidence. A section
that lists things of one kind SHALL show how many in its heading; the family and the evidence, which
are made of several kinds, show no count.

- a heading with the person's portrait where there is one, their name, one line with their sex as
  the record states it, the years of birth and death where a year can be read, marked when a year is
  approximate or one end of a range, and the places of birth and death, a part the record does not
  state being left out;
- their **names**: every name the record states, in the order it writes them, each as written, with the type it
  states and the parts it states beneath it — given names, surname, prefix, suffix, nickname,
  surname prefix — and what the name itself carries, its notes and the sources it cites; left out
  where the record states one name with nothing beneath it, which the heading already shows;
- their **events**: each event of the person — birth, baptism, death, burial, a census, an emigration, an ordinance —
  in the order the record writes them, each as one row: its date as the file writes it on the left, a dash where
  it has none, its name in the reader's language, which opens the card of the event, and its place as a link under the name; a quiet
  dot after the name where the event cites a source, and no mark on one that cites none;
- their **details**: each attribute of the person the standard names — an occupation, a residence, a title, education,
  religion, nationality, a description, an identification number, a property, the number of children or of
  marriages, a fact of a type the file words itself — in the order the record writes them, each as one row of its name on the
  left, which opens the card of the fact, and its value on the right, its date and place beneath the value and the same dot
  where it cites a source;
- their **family**, as a list of people and not a drawing: for each family the person is a
  child of, its parents under a head that says how the person belongs to it where the file says
  it is not by birth — *Adoptive parents*, *Foster parents*, *Sealing parents* — and the status
  the file states for the link; where the person is a child of no family, a line saying the
  parents are not recorded; siblings; and for each family the person is a spouse of, the other
  spouse with the events of that family — the marriage, a divorce, an engagement — as rows under them,
  each opening its event card, the children of that family, and a way to that family's card;
- their **notes**, as the next requirement says, those a `NOTE` states and those a shared note
  states by `NOTE` or `SNOTE`;
- their **related people**: each person the record names as associated with them, with the role
  the record states (`ROLE` in 7.0, `RELA` in 5.5.1), and each record it names as another record of the same person;
- their **media**;
- their **timeline**, a section of the card below the one before it, not a tab, and
  **folded** under its heading, which shows how many entries it holds: it is closed
  when a card is opened, and stays open while the card shows the same record,
  across a redraw of the card for a change of the file, and closes again when
  another record is shown. The names stay open. The card SHALL have no
  section of places: a place is a link in a fact and in an entry of the timeline;
- its **identifiers and record information**, **folded** like the timeline: reference numbers and
  unique identifiers with their types, the restriction, and when the record was created and last
  changed, each named in the reader's language;
- its **other data**, **folded** like the timeline: every line of the record that no section above
  shows, as the next requirement says;
- the **evidence**, which closes the card: what the whole record rests on; what an event rests on is on the card of that event.

Every relative shown SHALL select that person. A relative the file points at but
does not declare SHALL be shown as a pointer to a record that is not in the file,
with an action that shows it in the source. No section of the card SHALL be a tab
or a separate page, and the card SHALL NOT draw the family as a tree.

#### Scenario: Marie's facts
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** its Events list her birth with `7 NOV 1867` on the left and `Warsaw, Congress Poland` as a link under it, and her death with
  `4 JUL 1934` and `Passy, Haute-Savoie, France`; its Details list `Occupation` with `Physicist and chemist`; her family shows her
  marriage with Pierre Curie, `26 JUL 1895` and `Sceaux, France`, as a row under Pierre; and no dot stands after any of them

#### Scenario: The sections in order
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** its section headings read, from the top, Names (2), Events (2), Details (1), Family, Notes (1), Media (3),
  Timeline, then Identifiers and record information and Other data where the record holds them, and
  last Evidence, with her other name `Maria Salomea Skłodowska` under Names, her shared note under
  Notes, and no tab bar and no tree

#### Scenario: Folded sections
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** Timeline, and Identifiers and record information and Other data where the record holds them,
  are folded, each heading shows its count, and pressing Timeline shows her entries; Names, Events,
  Details, Family, Notes and Media are open

#### Scenario: A fold kept across a redraw
- **WHEN** the reader has opened Marie's Timeline and the file changes on disk
- **THEN** her card is redrawn with the Timeline open, and after the card shows Pierre
  Curie and then Marie again it is closed

#### Scenario: Marie's family as a list
- **WHEN** the card shows Marie Skłodowska-Curie
- **THEN** the family section lists her parents Władysław Skłodowski and Bronisława
  Boguska, her four siblings, her husband Pierre Curie with the way to their
  family, and her children Irène Joliot-Curie and Ève Curie

#### Scenario: A fact that cites a source
- **WHEN** a person's `1 BIRT` carries `2 SOUR @S2@` beneath it
- **THEN** the birth shows a dot after its name, and an event that cites none shows none

#### Scenario: Some facts without a source
- **WHEN** a person's record states events of which only one cites a source
- **THEN** no line above them says how many cite none, and only the one that cites a source carries a dot

#### Scenario: Every fact cites a source
- **WHEN** every event and detail of a person cites a source
- **THEN** each carries a dot, and no line anywhere says that all of them do

#### Scenario: An event with no date
- **WHEN** a person's `1 BIRT` states a place and no date
- **THEN** its row shows a dash where the date stands

#### Scenario: Two marriages
- **WHEN** a person is a spouse of two families
- **THEN** the family section shows two spouses, each with the events and the children of that
  family under them

#### Scenario: A parent who is not in the file
- **WHEN** a person's child-family names a husband the file does not declare
- **THEN** the parents show the declared parent and a pointer to a record that is
  not in the file

#### Scenario: Following a relative
- **WHEN** the reader activates Pierre Curie in Marie's family section
- **THEN** the card shows Pierre Curie, and the tab's mode is as it was

#### Scenario: A shared note
- **WHEN** a 7.0 person's record states `1 SNOTE @N1@` and the file declares `0 @N1@ SNOTE` with text
- **THEN** the Notes section shows that text

#### Scenario: Every name of a person
- **WHEN** a person's record states `1 NAME Maria /Curie/` with `2 TYPE BIRTH` and `2 NICK Manya`, and `1 NAME Marie /Curie/` with `2 TYPE MARRIED`
- **THEN** the Names section lists both as written, the first marked as the birth name with its nickname `Manya` beneath it, the second as the married name

#### Scenario: A person with one plain name
- **WHEN** a person's record states one name and nothing beneath it
- **THEN** the card has no Names section

#### Scenario: An adopted child
- **WHEN** a person is a child of one family by birth and of another by `2 PEDI ADOPTED`
- **THEN** the family section shows the parents of the first under *Parents* and those of the second under *Adoptive parents*

#### Scenario: No parents recorded
- **WHEN** a person is a child of no family
- **THEN** the family section says the parents are not recorded

#### Scenario: Sex
- **WHEN** a person's record states `1 SEX F`
- **THEN** the line under the name reads the sex in the reader's language together with the years and places

#### Scenario: Nothing to say, nothing shown
- **WHEN** a person's record has no note, no associated person, no identifier and no line beyond the ones above
- **THEN** the card has no Notes, Related people, Identifiers and record information or Other data section

### Requirement: The timeline of a person

The timeline section of a person card SHALL list, ordered by the year read from
each date, the person's own events and the events of the families they married
into, and the following events of close relatives: their parents' marriage; their
parents' deaths; their siblings' births and deaths; their spouses' deaths; their
children's births, marriages and deaths; and their grandchildren's births. A
relative's event SHALL be listed only from the person's parents' marriage, or their
own birth where that is earlier or the marriage is not dated, to the person's
death, where that is dated.

Each entry SHALL show its year, its date as written, what happened — the event's
name, and for a relative's event the relationship and the relative's name — and its
place. The person's own entries SHALL be told apart from their relatives'. An event
of the person's with no year read from it SHALL be listed apart, as undated, within
the section. No age SHALL be shown.

Activating a relative in an entry SHALL select that relative; activating one of
the person's own entries SHALL select that fact.

#### Scenario: Marie's timeline
- **WHEN** Marie's card is shown
- **THEN** its timeline section begins with her parents' marriage in 1860, lists
  the births of her four siblings before her own birth in 1867, her mother's death
  in 1878, her marriage to Pierre Curie in 1895, her daughters' births, her
  husband's death in 1906, her grandchildren's births, and ends with her death in
  1934, and lists her occupation as undated

#### Scenario: A relative's event after the person's death
- **WHEN** a person died in 1934 and their daughter died in 1956
- **THEN** the daughter's death is not in the person's timeline

#### Scenario: Selecting an entry
- **WHEN** the reader activates the entry for Marie's birth in the timeline section
- **THEN** the card of her birth is shown, with its evidence

#### Scenario: A place in an entry
- **WHEN** the reader activates the place of an entry in the timeline section
- **THEN** the card of that place is shown

### Requirement: The family card

A family card SHALL show, without any cross-reference identifier, level number or
tag, each section left out where the record holds nothing for it, in this order:

- a heading naming the family by its spouses, in the order the record names them,
  with the marriage date and place where the record states them; a family naming
  no spouse SHALL be headed by a stated placeholder;
- the family's **events** — marriage, divorce, engagement and the other family
  events the record states — in the order the record writes them, each one row of its date on the left, its name and its place,
  with a dot after the name where it cites a source, selectable as a person's events are, and the number of children the record
  states for the family where it states one;
- its **spouses**, each under the role the record names them in, and its
  **children**, each selecting their card and each, where the file says the child belongs to the
  family otherwise than by birth, marked *Adopted*, *Foster* or *Sealing* with the status the file states
  for the link; a spouse or child the file points at
  but does not declare SHALL be shown as a pointer to a record that is not in the file,
  with an action that shows it in the source;
- its **notes**, and its **related people**, as a person's card shows them;
- its **media**;
- its **identifiers and record information** and its **other data**, each folded as a person's are;
- the **evidence** its facts and the record rest on, which closes the card.

#### Scenario: The Curies' family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** it is headed by both names with `26 JUL 1895` and Sceaux, lists the
  marriage as an event with its date on the left and no dot, Pierre Curie as husband and Marie as wife,
  and Irène Joliot-Curie and Ève Curie as children

#### Scenario: From a person to their family
- **WHEN** the reader is on Marie's card and chooses the family card beside Pierre
  Curie in her family section
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie

#### Scenario: An adopted child
- **WHEN** a family lists a child whose own record points back with `2 PEDI ADOPTED`
- **THEN** the card shows that child marked *Adopted* among the children

#### Scenario: A note on a family
- **WHEN** a family's record carries `1 NOTE` with text
- **THEN** the card shows a Notes section with the text, folded where it is long

#### Scenario: The number of children
- **WHEN** a family's record states `1 NCHI 3` while it lists two children
- **THEN** the card shows a row named Number of children with `3`, beside the two it lists, and one such row for each `NCHI` the record states

### Requirement: The source card

A source card SHALL show the source's title, its author and publication where the
record states them, the repository it names with that repository's name, address
and web address, every record that cites it — for each, the person or family, where
in that record the citation sits (the whole record or the named event) and the page
the citation states — and its media. It SHALL end with the notes in the vault that
link to the source. A person or a family among those that cite it SHALL select
their card. A source naming a repository the file does not declare SHALL say so.

#### Scenario: A source cited by three people
- **WHEN** the card shows `The Nobel Prize in Chemistry 1911 and 1935`
- **THEN** it lists Marie Skłodowska-Curie, Irène Joliot-Curie and Frédéric Joliot,
  each with the page their citation states

#### Scenario: A source nothing cites
- **WHEN** the card shows a source no record cites
- **THEN** it says no record cites it

### Requirement: The media card

Selecting a multimedia record SHALL show its **media card**, which SHALL show the
file as large as the card allows — or say what it is, or that it is missing or not
loaded, as a tile does — with its caption and every record that links it. Each of
those SHALL show the part of the picture its link names, with its own caption, and
SHALL select that record. It SHALL end with the notes in the vault that link to the
record. A multimedia record is selected by following a link to it and from the
tile of a file on another card, and has no row in the list.

#### Scenario: The family photograph
- **WHEN** the reader follows `[[curie.ged#@O5@]]`
- **THEN** the card shows the family photograph and lists Marie and Pierre, each
  with their own part of it and their own caption

#### Scenario: From a tile to its media card
- **WHEN** the reader chooses the media card of the family photograph from Marie's
  media
- **THEN** the card shows the media card of `@O5@`

### Requirement: Portrait and media on a card

A person card SHALL show in its heading the person's portrait — the first file the
record links that is an image — drawn from the part of the picture the link names
where it names one. A person, family or source card SHALL show a **Media** section
listing every file the record links, in the order it links them, each with its
caption:

- an image in the vault SHALL be shown as a thumbnail, cut to the link's rectangle
  where it names one;
- a file in the vault that is not an image SHALL be named, with what kind of file it
  is;
- a file at a web address SHALL NOT be fetched unless the reader has allowed images
  from the web, and until then SHALL say it is from the web and not loaded;
- a file the vault does not hold SHALL say so, with Show in source for the line that
  names it.

Activating a file in the vault SHALL open it in Obsidian, in the tab already showing
it if there is one, and SHALL leave the GEDCOM tab and the card as they were.

#### Scenario: Marie's portrait and gallery
- **WHEN** Marie's card is shown from the demo vault
- **THEN** her heading shows her portrait, and her media lists her portrait, the
  family photograph cut to her part of it with the caption "Marie, on the left",
  and a portrait at a web address that is not loaded

#### Scenario: A file not in the vault
- **WHEN** a record links a file at `Media/lost.jpg` the vault does not hold
- **THEN** its tile says the file is not in the vault and offers Show in source

#### Scenario: Opening a file
- **WHEN** the reader activates the portrait of Pierre Curie in the media of his card
- **THEN** the file opens in Obsidian and the card still shows Pierre Curie

### Requirement: Show in source

Every fact, every relative that is not in the file, and the record a card shows
SHALL offer **Show in source**. It SHALL switch the tab to Source mode and select,
and scroll into view, exactly the lines of the file that state it.

#### Scenario: Showing a birth in the source
- **WHEN** the reader selects Marie's birth and chooses Show in source
- **THEN** the tab is in Source mode with the `1 BIRT` line and the lines beneath it
  selected and in view

#### Scenario: Showing a whole record
- **WHEN** the reader chooses Show in source with no fact selected on Pierre Curie's
  card
- **THEN** the lines of Pierre Curie's record are selected and in view

### Requirement: A card follows the file

When the text of the file changes — typed in Source mode, or changed on disk — the
card SHALL show the new text, redrawn without the reader asking, and SHALL keep its
place in the card where the record is the same. Where the record no longer exists
in the file the selection ends, as the requirement on the selected record says.

#### Scenario: A date corrected in the source
- **WHEN** the reader changes Marie's `2 DATE 7 NOV 1867` to `8 NOV 1867` in Source
  mode with Marie selected
- **THEN** Marie's card shows her birth as `8 NOV 1867`

#### Scenario: Changed on disk
- **WHEN** Marie is selected in a tab behind another tab and her birth date is
  changed on disk
- **THEN** her card shows the new date

### Requirement: The card fits a narrow panel and a phone

The card SHALL be readable and usable in one column at the width a sidebar has,
from 320 pixels up, and at a phone's width, without horizontal scrolling of the
card. The card as a whole SHALL scroll beneath a header carrying Back and Forward,
which stays at the top. Choosing a fact SHALL open the card of its event, as the
requirement on the event card says, and a place named in a fact or an entry SHALL open the card of that place. Redrawing the card for the same record — the file changing —
SHALL NOT scroll it back to the top, and, where the focus was in the card, SHALL keep it on the same fact; selecting another record, an event or a place SHALL scroll the card to
the top.

#### Scenario: A person card at a sidebar's width
- **WHEN** Marie's card is shown 320 pixels wide
- **THEN** every fact, name and relative is visible without scrolling sideways

#### Scenario: A person card on a phone
- **WHEN** Marie's card is shown 390 pixels wide
- **THEN** every fact, name and relative is visible without scrolling sideways

#### Scenario: Tapping a fact
- **WHEN** the reader taps Marie's birth
- **THEN** the card of her birth is shown, with its evidence, and the list, where it is in view, shows the events with her birth marked

#### Scenario: Tapping a place in a fact
- **WHEN** the reader taps `Warsaw, Congress Poland` in Marie's birth
- **THEN** the card of that place is shown, and the card of her birth is not

#### Scenario: Selecting a fact in a scrolled card
- **WHEN** the card is scrolled to Marie's family section and the reader selects her
  marriage
- **THEN** the card of the marriage is shown from its top

#### Scenario: Another record
- **WHEN** the card is scrolled to the end of Marie's card and the reader activates
  Pierre Curie in her family section
- **THEN** Pierre Curie's card is shown from its top

#### Scenario: The header stays
- **WHEN** the reader scrolls to the end of Marie's card
- **THEN** Back and Forward are still at the top of the card

### Requirement: A tab holds one selected record

A GEDCOM tab SHALL hold at most one **selected record**: a person, a family, a
source or a multimedia record of its file, or a place or an event that the file names. It SHALL be selected by activating a
person's card, a family node, a name or a lifeline in Graph or Timeline; by
activating a row of the list; by activating a relative, a citation, a person, a
family, a source or a media record in the card; by following a link into the file
and by choosing a record with **Go to record**, where the record is of one of those
four kinds; and in Source mode by the cursor, as the requirement on Source says.
Selecting another record SHALL replace the first. Selecting SHALL show the record in
the card, SHALL NOT change the tab's mode, SHALL NOT open another tab and SHALL NOT
write to the file.

The selection SHALL belong to the tab and to the record, not to what is drawn. It
SHALL be kept when the tab changes mode, and when the workspace is closed and
reopened. It SHALL end when the record no longer exists in the file and when the tab is navigated to another file, and SHALL NOT be shown while the Genealogy interface is off.
A record of another kind — a note, a repository, a submitter, the header — SHALL NOT be selected, and SHALL leave the selection as it was. While the Genealogy interface is off nothing SHALL be selected or shown, and a saved selection SHALL be kept in the tab's state unused, to come back when the interface is turned on. A state handed to a tab for the same file that names no selection SHALL leave the selection as it is. A record saved as selected that the file does not declare, when the file is loaded, SHALL be dropped, and until then the card SHALL show the empty state.

While a record is selected the list SHALL mark its row as selected in List mode. A
fact of a person or a family SHALL be selectable on its card, and selecting it SHALL select
its event, whose card shows the Evidence section for that event; choosing *Whole
record* there SHALL select the record it belongs to.

In Graph and Timeline mode a selected person SHALL be marked in the view, as the
requirements of those views say. In List mode the row of a selected person, family
or source SHALL be marked, as the requirements of the list say. A selected family,
source or media record has no card or row to mark in Graph or Timeline, and while one
is selected nobody is marked there; a media record has no row in the list.

#### Scenario: From a card in the graph
- **WHEN** the tab is in Graph mode and the reader activates Irène's card
- **THEN** the tab stays in Graph mode, Irène's card is marked selected, the card
  shows Irène Joliot-Curie, and no other tab is open

#### Scenario: From a row in the timeline
- **WHEN** the tab is in Timeline mode and the reader activates Marie's lifeline
- **THEN** the tab stays in Timeline mode, her row is marked selected, and the
  card shows Marie Skłodowska-Curie

#### Scenario: From a family node
- **WHEN** the tab is in Graph mode and the reader activates the node between
  Pierre Curie and Marie
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie,
  and no card of the graph is marked selected

#### Scenario: From the list
- **WHEN** the tab is in List mode and the reader activates Marie's row
- **THEN** the tab stays in List mode, her row is marked selected, and the card shows
  her

#### Scenario: A family row in the list
- **WHEN** the tab is in List mode and the reader activates the Curies' row among
  the families
- **THEN** the tab stays in List mode, the card shows the Curies' family, and
  that row is marked selected

#### Scenario: Kept across the modes
- **WHEN** Marie is selected in Graph mode and the reader switches to Timeline
  mode
- **THEN** her row is marked selected, the card still shows her, and the list,
  when shown, marks her row

#### Scenario: Kept by the workspace
- **WHEN** Marie is selected in a tab in Graph mode, zoomed in and moved, and
  Obsidian is restarted
- **THEN** the tab is in Graph mode at that zoom and position with Marie's card
  marked selected, and the card shows Marie

#### Scenario: A record with no card
- **WHEN** Marie is selected and the reader follows `[[curie.ged#@N1@]]`
- **THEN** the tab switches to Source mode at that note's record, and the card
  still shows Marie

#### Scenario: The record goes
- **WHEN** Marie is selected in Graph mode and her record is removed from the file
  on disk
- **THEN** nobody is selected, the card says to select a record, and no row of
  the list is marked

#### Scenario: The interface is turned off
- **WHEN** Marie is selected in Graph mode and the reader turns the Genealogy
  interface off
- **THEN** the tab shows the source, the card is closed, and no row of the list is
  marked; turning the interface on again shows Marie selected

#### Scenario: Another file
- **WHEN** Marie is selected in a tab and the same tab is navigated to another
  GEDCOM file
- **THEN** nothing is selected in the tab

#### Scenario: A saved record the file no longer has
- **WHEN** a tab was saved with `@I99@` selected, which the file does not declare,
  and Obsidian is restarted
- **THEN** nothing is selected, the card says to select a record, and no row of the
  list is marked

#### Scenario: Selecting a fact and going back
- **WHEN** the reader selects Marie's birth on her card and then presses her name at the
  top of the card of her birth
- **THEN** the card shows Marie, with the Evidence section of her whole record

### Requirement: The event card

Selecting an event, which a row of the Events in the List does, SHALL show its **event card**. At
its top, a line naming the kind of record the event belongs to — *Person* or *Family* — and the
record as a link that selects it. Under it, the title: the name of the event as the person card
names it, a custom event by its type, and the text the event carries other than `Y`, with a *Show
in source* that moves to the lines of the event. Under the title, one line with the date as the
file writes it and the place as the file writes it, the place a link that selects it; a part the
event does not state is left out. Below them the card SHALL show everything else the event states,
each in a section of its own that is left out where the event states nothing for it:

- its **details**, as rows each named in the reader's language: the age, the cause, the agency, the
  religion, the restriction, the temple and status of an LDS ordinance, the age of each spouse for an event of a family, the date's phrase and time,
  the sorting date, the address as the file writes it, and the phone numbers, e-mail addresses, fax numbers
  and web addresses; and what the place itself states — its form, its latitude and longitude, its
  translations and its notes;
- its **notes**, and its **related people** with the role each is stated in, as a person's card shows them;
- its **media**;
- its **other data**, folded: every line of the event no section above shows;
- its **Evidence** section, which closes the card: the sources the event cites, each a link that selects
  the source, with the page, the quality and whatever else the citation states — its quoted text and
  date, the event and role it names, its notes and media.

The evidence SHALL NOT list what the whole record rests on: that is on the card of the record, whose link
is at the top of the card. The card SHALL show nothing the file does not
hold and SHALL NOT label the date, the place or the record with a row of its own. Choosing a fact on
a person's or a family's card, or an entry of a person's timeline, SHALL open this card. Selecting
a link on it SHALL NOT write to the file. An event that carries nothing to show beyond its name
SHALL still have a card, which says that the event states no date, place or source.

#### Scenario: A birth
- **WHEN** the event card of Marie's birth is shown
- **THEN** it shows `Person` and a link `Marie Skłodowska-Curie` above the title `Birth`, and
  under the title `7 NOV 1867` and a link `Warsaw, Congress Poland`

#### Scenario: An occupation
- **WHEN** the event card of an occupation `Physicist` with no date and no place is shown
- **THEN** its title reads `Occupation · Physicist`, it draws no line of date and place, and it
  says the event states no date, place or source

#### Scenario: Nothing of the whole record
- **WHEN** the event card of Marie's birth is shown
- **THEN** its Evidence section lists no source of Marie's record, no note, and has no head *Whole
  record*

#### Scenario: A cited source
- **WHEN** the event card of an event that cites a source record is shown, and the reader presses the source in its Evidence section
- **THEN** the card shows that source

#### Scenario: Chosen on a person's card
- **WHEN** the reader chooses Marie's birth in the Events of her card
- **THEN** the event card of her birth is shown, and a list in view shows the events with that birth marked

#### Scenario: Show in source
- **WHEN** the reader presses *Show in source* on the event card of Marie's birth
- **THEN** the tab shows the Source mode with the lines of that birth selected

#### Scenario: A record pressed
- **WHEN** the reader presses the record at the top of the event card of Marie's birth
- **THEN** the card shows Marie

#### Scenario: A family event
- **WHEN** the event card of the Curies' marriage is shown
- **THEN** its top line reads `Family` and links the family

#### Scenario: What an event states beyond its date and place
- **WHEN** an event states `2 AGE 0y`, `2 CAUS Natural` and `2 AGNC Registry office`
- **THEN** its card shows rows named Age, Cause and Agency with those values under the date and place

#### Scenario: An address
- **WHEN** an event states `2 ADDR 1 Street` continued by `3 CONT Town`
- **THEN** the card shows the address as two lines in a row named Address

#### Scenario: The place's coordinates
- **WHEN** an event's place states `3 MAP` with `4 LATI N52.2` and `4 LONG E21.0`
- **THEN** the card shows the latitude and longitude under the place

#### Scenario: A note on an event
- **WHEN** an event states `2 NOTE Born at home.`
- **THEN** its card shows a Notes section with that text

#### Scenario: A witness
- **WHEN** an event states `2 ASSO @I2@` with `3 ROLE WITN`
- **THEN** its card lists that person under Related people with the role *Witness*

#### Scenario: A citation that quotes
- **WHEN** an event cites a source with `3 DATA` and `4 TEXT` beneath it
- **THEN** its Evidence section shows the quoted text with the citation

#### Scenario: A line no section knows
- **WHEN** an event states a custom `2 _WEATHER Rain`
- **THEN** its card shows `_WEATHER` and `Rain` in a folded Other data section

#### Scenario: A source the file does not declare
- **WHEN** an event cites `@S9@` and the file declares no such record
- **THEN** its Evidence section says the source is missing, with the way to its line

### Requirement: An event stays selected while the cursor is in its record

While an event is selected, the cursor being in the record that event belongs to SHALL count as the
same selection, in Source mode and on leaving it: switching to Source mode moves the cursor to the
lines of the event, and the event SHALL stay selected there and after switching back, and a click
inside its record SHALL NOT replace it with the record. The cursor resting in another record SHALL
select that record, as it does for any selection. Selecting an event SHALL NOT write to the file.

#### Scenario: To Source and back
- **WHEN** the event card of Marie's birth is shown in Graph mode, the reader switches to Source mode
  and then back to Graph mode without moving the cursor out of her record
- **THEN** the card still shows her birth

#### Scenario: A click inside the record
- **WHEN** the event card of Marie's birth is shown in Source mode and the reader clicks in her death
- **THEN** the card still shows her birth

#### Scenario: A click in another record
- **WHEN** the event card of Marie's birth is shown in Source mode and the reader clicks in Pierre's record
- **THEN** the card shows Pierre

### Requirement: An event is one row wherever a card lists it

The events of a person, the events of a family — in its own card and under a spouse in a person's family section — and the
events at a place on the card of that place SHALL each be drawn as one **event row**: its date as the file writes it on
the left, a dash where it has none; its name in the reader's language, which opens the card of the event, with its text where it has
one; its place, as a link to the place, under the name; and, where it cites any source, a quiet dot after the name, which says
how many in its accessible name and title; an event that cites none carries no dot. On the card of a
place the row SHALL also name the record the event belongs to, as a link that selects that record, under the name. A tap or a press anywhere on the row
SHALL open the card of the event, except on a link inside it, and on a phone the name and each link SHALL be a target of its own that the
other does not cover.
The timeline of a person SHALL keep its own form, a chronology, and SHALL show the same detail of an
event. An event that states nothing SHALL be drawn as *recorded, no details*, and an event whose
record has no identifier SHALL be drawn with a name that does not act.

#### Scenario: A fact on a person's card
- **WHEN** Marie's card shows her birth
- **THEN** its row shows `7 NOV 1867` on the left, names `Birth`, shows `Warsaw, Congress Poland` as a link under the name, and carries no dot

#### Scenario: A fact that cites a source
- **WHEN** a birth carries `2 SOUR @S2@` and a person's card shows it
- **THEN** its row shows a dot after the name, which says it cites one source

#### Scenario: Tapping the name or the place on a phone
- **WHEN** Marie's card is shown on a phone and the reader taps `Birth`, and then taps `Warsaw, Congress Poland` in the same row
- **THEN** the first opens the event card of her birth and the second the card of the place

#### Scenario: An event at a place
- **WHEN** the card of `Warsaw, Congress Poland` lists Marie's birth
- **THEN** the row shows `7 NOV 1867`, names `Birth`, and links `Marie Skłodowska-Curie` under the name

#### Scenario: Opening the event from a place
- **WHEN** the reader presses `Birth` in that row
- **THEN** the event card of Marie's birth is shown

#### Scenario: The record from a place
- **WHEN** the reader presses `Marie Skłodowska-Curie` in that row
- **THEN** Marie's card is shown and the list, where it is in view, shows the people with her marked

### Requirement: The controls of a card are easy to see and to hit

Every control of a card — the buttons that select a relative, a source, an event or a place, the
links *Show in source*, the notes' lines, the picture of a media card, and Back and Forward — SHALL
show a focus ring in the accent colour when it is reached by the keyboard, and SHALL NOT show it
when it is pressed with a pointer. On a device whose pointer is coarse and in the mobile app, each of
them SHALL have an activation area at least 32 pixels tall without changing the size of its text,
and a control that is a block of its own — a relative, a source, a note's line, the heading of a
fold, Back and Forward (44 by 44) — 44 pixels; where two controls stand closer together than that,
the space between them is shared. The headings of the sections of a card and the secondary lines under
them SHALL be set in the muted text colour of the theme, not the faint one. A date at the left of an event SHALL be set
in the muted text colour; a notice that a source is missing keeps its warning colour. Nothing SHALL set a colour that is not one of the theme's.

#### Scenario: Keyboard focus
- **WHEN** the reader reaches `Pierre Curie` in Marie's family section with the Tab key
- **THEN** a ring in the accent colour surrounds it

#### Scenario: A press with the pointer
- **WHEN** the reader presses `Pierre Curie` with a pointer
- **THEN** no ring is drawn around it

#### Scenario: A phone
- **WHEN** Marie's card is shown 390 pixels wide on a phone
- **THEN** the area that activates a place link in her birth is at least 32 pixels tall, and the area that activates `Pierre Curie` and Back at least 44

#### Scenario: A fact without a source
- **WHEN** Marie's card is shown
- **THEN** the dates of her events are in the muted text colour, on a card with no orange mark

#### Scenario: A picture on a media card
- **WHEN** the card of a photograph in the vault is shown
- **THEN** its picture is a button that opens the file, reachable with the keyboard
