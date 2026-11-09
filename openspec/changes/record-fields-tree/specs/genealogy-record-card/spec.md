## MODIFIED Requirements

### Requirement: The person card

A person card SHALL show, without any cross-reference identifier, level number or tag the standard names, in this order, each section left out where the record holds nothing for it, except
the one that says what is missing: the parents in the family. A section
that lists things of one kind SHALL show how many in its heading; the family and the lines of the record, which
are made of several kinds, show no count.

- a heading with the person's portrait where there is one, their name, one line with their sex as
  the record states it, the years of birth and death where a year can be read, marked when a year is
  approximate or one end of a range, and the places of birth and death, a part the record does not
  state being left out;
- the **lines of the record**, as the requirement on the tree of a record says: every line the record states, in the order the file writes them, with no section of its own for names, events, details, notes, related people, identifiers or other data;
- their **family**, as a list of people and not a drawing: for each family the person is a
  child of, its parents under a head that says how the person belongs to it where the file says
  it is not by birth — *Adoptive parents*, *Foster parents*, *Sealing parents* — and the status
  the file states for the link; where the person is a child of no family, a line saying the
  parents are not recorded; siblings; and for each family the person is a spouse of, the other
  spouse with the events of that family — the marriage, a divorce, an engagement — as rows under them,
  each opening its event card, the children of that family, and a way to that family's card;
- their **media**, the portrait and the media of the record drawn as tiles, as the requirement on portrait and media says;
- their **timeline**, a section of the card below the one before it, not a tab, and
  **folded** under its heading, which shows how many entries it holds: it is closed
  when a card is opened, and stays open while the card shows the same record,
  across a redraw of the card for a change of the file, and closes again when
  another record is shown. The card SHALL have no
  section of places: a place is a link in a fact and in an entry of the timeline;

Every relative shown SHALL select that person. A relative the file points at but
does not declare SHALL be shown as a pointer to a record that is not in the file,
with an action that shows it in the source. No section of the card SHALL be a tab
or a separate page, and the card SHALL NOT draw the family as a tree.

#### Scenario: Marie's facts
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** below the heading it shows her record's lines as a tree in the order the file writes them under a root named *Person* that is open, every node beneath it closed: her names, her sex, her birth with the summary `7 NOV 1867 · Warsaw, Congress Poland`, her death with `4 JUL 1934 · Passy, Haute-Savoie, France`, her occupation `Physicist and chemist`; her family section shows her marriage with Pierre Curie, `26 JUL 1895` and `Sceaux, France`, as a row under Pierre; and no row carries a dot

#### Scenario: The sections in order
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** below the heading it shows, from the top, the lines of her record, Family, Media where she has pictures, and Timeline, and no section named Names, Events, Details, Notes, Related people, Identifiers and record information or Other data

#### Scenario: Folded sections
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** Timeline is folded and shows its count, and pressing it shows her entries; the root of her tree is open and the nodes beneath it are closed, and Family and Media are open

#### Scenario: A fold kept across a redraw
- **WHEN** the reader has opened Marie's Timeline and the file changes on disk
- **THEN** her card is redrawn with the Timeline open, and after the card shows Pierre
  Curie and then Marie again it is closed

#### Scenario: Marie's family as a list
- **WHEN** the card shows Marie Skłodowska-Curie
- **THEN** the family section lists her parents Władysław Skłodowski and Bronisława
  Boguska, her four siblings, her husband Pierre Curie with the way to their
  family, and her children Irène Joliot-Curie and Ève Curie

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

#### Scenario: An adopted child
- **WHEN** a person is a child of one family by birth and of another by `2 PEDI ADOPTED`
- **THEN** the family section shows the parents of the first under *Parents* and those of the second under *Adoptive parents*

#### Scenario: No parents recorded
- **WHEN** a person is a child of no family
- **THEN** the family section says the parents are not recorded

#### Scenario: Sex
- **WHEN** a person's record states `1 SEX F`
- **THEN** the line under the name reads the sex in the reader's language together with the years and places

#### Scenario: A fact that cites a source
- **WHEN** a person's `1 BIRT` carries `2 SOUR @S2@` beneath it
- **THEN** the closed birth shows a quiet dot after its summary that says it cites one source, and once it is opened the citation is a row beneath it

#### Scenario: Some facts without a source
- **WHEN** a person's record states events of which only one cites a source
- **THEN** no line above them says how many cite none, and only the one that cites a source carries a dot

#### Scenario: Every fact cites a source
- **WHEN** every event and detail of a person cites a source
- **THEN** each carries a dot, and no line anywhere says that all of them do

#### Scenario: An event with no date
- **WHEN** a person's `1 BIRT` states a place and no date
- **THEN** its summary shows the place alone, with no dash and no empty date

#### Scenario: A shared note
- **WHEN** a 7.0 person's record states `1 SNOTE @N1@` and the file declares `0 @N1@ SNOTE` with text
- **THEN** the tree shows that text at the place the record writes the line

#### Scenario: Every name of a person
- **WHEN** a person's record states `1 NAME Maria /Curie/` with `2 TYPE BIRTH` and `2 NICK Manya`, and `1 NAME Marie /Curie/` with `2 TYPE MARRIED`
- **THEN** the tree shows both names in the order the file writes them, and once they are opened the first with its type as the birth name and its nickname `Manya` beneath it, the second as the married name

#### Scenario: A person with one plain name
- **WHEN** a person's record states one name and nothing beneath it
- **THEN** the lines of the record show that one line, with no row for what it does not state

#### Scenario: Nothing to say, nothing shown
- **WHEN** a person's record states nothing but its name
- **THEN** the card has no section about notes, related people, identifiers or other data

### Requirement: The family card

A family card SHALL show, without any cross-reference identifier, level number or tag the standard names, in this order, with no other section: a heading, the lines of the record as a tree, and the media.

- a heading naming the family by its spouses, in the order the record names them,
  with the marriage date and place where the record states them; a family naming
  no spouse SHALL be headed by a stated placeholder, and the heading offers **Show in source** for the whole record;
- the **lines of the record**, as the requirement on the tree of a record says: every line the record states, in the order the file writes them, the events, the pointers to the husband, the wife and the children, the number of children, the notes, the related people and the identifiers among them. A pointer to a person the file declares is that person's name as a link that selects their card; a pointer to a record the file does not declare is shown as a pointer to a record that is not in the file, with an action that shows it in the source;
- its **media**, as a person's are.

The card SHALL NOT have a section of its own for the spouses or the children, and SHALL NOT mark a child as adopted, foster or sealing: the tree states what the family's own record states.

#### Scenario: The Curies' family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** it is headed by both names with `26 JUL 1895` and Sceaux, and its tree shows, in the file's order, Pierre Curie as husband, Marie as wife, Irène Joliot-Curie and Ève Curie as children, each a link that selects that person, and the marriage with its date and place, and the card has no section of spouses or children

#### Scenario: From a person to their family
- **WHEN** the reader is on Marie's card and chooses the family card beside Pierre
  Curie in her family section
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie

#### Scenario: An adopted child
- **WHEN** a family lists a child whose own record points back with `2 PEDI ADOPTED`
- **THEN** the tree shows the pointer to that child as to any other, and the card marks no child as adopted

#### Scenario: A note on a family
- **WHEN** a family's record carries `1 NOTE` with text
- **THEN** the lines of the record show the note with its text, folded where it is long

#### Scenario: The number of children
- **WHEN** a family's record states `1 NCHI 3` while it lists two children
- **THEN** the lines of the record show a row named Number of children with `3`, beside the two pointers to children it lists

### Requirement: The source card

A source card SHALL show, in this order and with no other section: the source's title, its author and publication where the record states them in the heading, the lines of the record as a tree, as the requirement on the tree of a record says, and its media. A line that points at a repository is a row of the tree like any pointer, showing the repository's name. The card SHALL NOT list the records that cite the source, and SHALL NOT show the repository's address and web address.

#### Scenario: A source
- **WHEN** the card shows `The Nobel Prize in Chemistry 1911 and 1935`
- **THEN** it shows its title and author in the heading, the tree of its lines and its pictures where it has some, and no section of repository or of the records that cite it

#### Scenario: A source cited by three people
- **WHEN** the card shows `The Nobel Prize in Chemistry 1911 and 1935`
- **THEN** it lists none of the three records that cite it, the card having no list of the records that cite a source

#### Scenario: A source nothing cites
- **WHEN** the card shows a source no record cites
- **THEN** it says nothing of citations, as it does for a source that is cited

#### Scenario: A source's repository
- **WHEN** the card shows a source whose record states `1 REPO @R1@` and the file declares `@R1@` named `State Archive in Warsaw`
- **THEN** its tree shows a row named Repository with `State Archive in Warsaw`

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
- **THEN** every line of her record and every relative is visible without scrolling sideways

#### Scenario: A person card on a phone
- **WHEN** Marie's card is shown 390 pixels wide
- **THEN** every line of her record and every relative is visible without scrolling sideways

#### Scenario: Tapping a fact
- **WHEN** the reader taps Marie's birth
- **THEN** the card of her birth is shown, and the list, where it is in view, shows the events with her birth marked

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

### Requirement: The controls of a card are easy to see and to hit

Every control of a card — the buttons that select a relative, a source, an event or a place, the
links *Show in source*, the notes' lines, the picture of a media card, and Back and Forward — SHALL
show a focus ring in the accent colour when it is reached by the keyboard, and SHALL NOT show it
when it is pressed with a pointer. On a device whose pointer is coarse and in the mobile app, each of
them SHALL have an activation area at least 32 pixels tall without changing the size of its text,
and a control that is a block of its own — a relative, a source, a note's line, the heading of a
fold, Back and Forward (44 by 44) — 44 pixels; where two controls stand closer together than that,
the space between them is shared. The control of a node of the tree, its arrow, SHALL stay shown, like any control that opens or closes a part of the card; the one control that opens or closes every node of a tree SHALL be shown only while the pointer is over the tree or the focus is within it, SHALL NOT shift anything when it appears or disappears, SHALL stay reachable by assistive technology while it is not shown, and SHALL stay shown where the pointer cannot hover. The headings of the sections of a card and the secondary lines under
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

#### Scenario: The arrows of a node
- **WHEN** the card is shown and the pointer is not over the tree
- **THEN** the arrows of the nodes are visible, and the control that opens or closes every node is not until the pointer or the focus is in the tree

### Requirement: An event is one row wherever a card lists it

The events of a family under a spouse in a person's family section and the
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
- **WHEN** Marie's card shows her marriage under Pierre in her family section
- **THEN** its row shows `26 JUL 1895` on the left, names `Marriage`, shows `Sceaux, France` as a link under the name, and carries no dot

#### Scenario: A fact that cites a source
- **WHEN** a marriage carries `2 SOUR @S2@` and a person's family section shows it
- **THEN** its row shows a dot after the name, which says it cites one source

#### Scenario: Tapping the name or the place on a phone
- **WHEN** Marie's card is shown on a phone and the reader taps `Marriage` in her family section, and then taps `Sceaux, France` in the same row
- **THEN** the first opens the event card of the marriage and the second the card of the place

#### Scenario: An event at a place
- **WHEN** the card of `Warsaw, Congress Poland` lists Marie's birth
- **THEN** the row shows `7 NOV 1867`, names `Birth`, and links `Marie Skłodowska-Curie` under the name

#### Scenario: Opening the event from a place
- **WHEN** the reader presses `Birth` in that row
- **THEN** the event card of Marie's birth is shown

#### Scenario: The record from a place
- **WHEN** the reader presses `Marie Skłodowska-Curie` in that row
- **THEN** Marie's card is shown and the list, where it is in view, shows the people with her marked

### Requirement: The event card

Selecting an event, which a row of the Events in the List does, SHALL show its **event card**. At
its top, a line naming the kind of record the event belongs to — *Person* or *Family* — and the
record as a link that selects it. Under it, the title: the name of the event in the reader's language, a custom event by its type, and the text the event carries other than `Y`, with a *Show
in source* that moves to the lines of the event. Under the title, one line with the date as the
file writes it and the place as the file writes it, the place a link that selects it; a part the
event does not state is left out. Below them the card SHALL show everything else the event states,
each in a section of its own that is left out where the event states nothing for it:

- its **details**, as rows each named in the reader's language: the age, the cause, the agency, the
  religion, the restriction, the temple and status of an LDS ordinance, the age of each spouse for an event of a family, the date's phrase and time,
  the sorting date, the address as the file writes it, and the phone numbers, e-mail addresses, fax numbers
  and web addresses; and what the place itself states — its form, its latitude and longitude, its
  translations and its notes;
- its **notes**, and its **related people** with the role each is stated in, in sections of their own on this card, as the detail requirements say;
- its **media**;
- its **other data**, folded: every line of the event no section above shows;
- the **sources** the event cites, each as a row in the order the event writes them: a source the file
  declares as a link that selects it, a source stated inline as its text, one the file does not declare as a
  pointer to a record that is not in the file, and beneath each whatever the citation states — its page,
  its quality, its quoted text and date, the event and role it names, its notes and media.

The card SHALL have no section of evidence and SHALL NOT list what the whole record rests on: that is
in the tree of the card of the record, whose link is at the top of the card. The card SHALL show nothing the file does not
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
- **THEN** it has no section named Evidence, lists no source of Marie's record and no note of the vault, and has no head *Whole
  record*

#### Scenario: A cited source
- **WHEN** the event card of an event that cites a source record is shown, and the reader presses the source among its rows
- **THEN** the card shows that source

#### Scenario: Chosen on a person's card
- **WHEN** the reader presses `Birth` in the tree of her card
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
- **THEN** its card shows the source row with the quoted text beneath it

#### Scenario: A citation with a page
- **WHEN** an event states `2 SOUR @S1@` with `3 PAGE 12` beneath it
- **THEN** its card shows a row *Source* with the source as a link and a row *Page* with `12` beneath it

#### Scenario: A line no section knows
- **WHEN** an event states a custom `2 _WEATHER Rain`
- **THEN** its card shows `_WEATHER` and `Rain` in a folded Other data section

#### Scenario: A source the file does not declare
- **WHEN** an event cites `@S9@` and the file declares no such record
- **THEN** its card shows a pointer to a record that is not in the file, with the way to its line

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
- **THEN** the card of her birth is shown

#### Scenario: A place in an entry
- **WHEN** the reader activates the place of an entry in the timeline section
- **THEN** the card of that place is shown

### Requirement: The media card

Selecting a multimedia record SHALL show its **media card**, which SHALL show the
file as large as the card allows — or say what it is, or that it is missing or not
loaded, as a tile does — with its caption and every record that links it. Each of
those SHALL show the part of the picture its link names, with its own caption, and
SHALL select that record. A multimedia record is selected by following a link to it and from the
tile of a file on another card, and has no row in the list.

#### Scenario: The family photograph
- **WHEN** the reader follows `[[curie.ged#@O5@]]`
- **THEN** the card shows the family photograph and lists Marie and Pierre, each
  with their own part of it and their own caption

#### Scenario: From a tile to its media card
- **WHEN** the reader chooses the media card of the family photograph from Marie's
  media
- **THEN** the card shows the media card of `@O5@`

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
its event, whose card shows it; the record it belongs to is selected from the link at the top of that card.

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
- **THEN** the card shows Marie
