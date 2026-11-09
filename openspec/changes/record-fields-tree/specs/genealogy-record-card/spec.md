## MODIFIED Requirements

### Requirement: The person card

A person card SHALL show, without any cross-reference identifier, level number or
tag, in this order, each section left out where the record holds nothing for it, except
the two that say what is missing: the parents in the family, and the evidence. A section
that lists things of one kind SHALL show how many in its heading; the family, the lines of the record and the evidence, which
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
- the **evidence**, which closes the card: what the whole record rests on; what an event rests on is on the card of that event.

Every relative shown SHALL select that person. A relative the file points at but
does not declare SHALL be shown as a pointer to a record that is not in the file,
with an action that shows it in the source. No section of the card SHALL be a tab
or a separate page, and the card SHALL NOT draw the family as a tree.

#### Scenario: Marie's facts
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** below the heading it shows her record's lines as a tree in the order the file writes them, every node closed: her names, her sex, her birth with the summary `7 NOV 1867 · Warsaw, Congress Poland`, her death with `4 JUL 1934 · Passy, Haute-Savoie, France`, her occupation `Physicist and chemist`; her family section shows her marriage with Pierre Curie, `26 JUL 1895` and `Sceaux, France`, as a row under Pierre; and no row carries a dot

#### Scenario: The sections in order
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** below the heading it shows, from the top, the lines of her record, Family, Media where she has pictures, Timeline, and last Evidence, and no section named Names, Events, Details, Notes, Related people, Identifiers and record information or Other data

#### Scenario: Folded sections
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** Timeline is folded and shows its count, and pressing it shows her entries; her tree's nodes are closed, and Family and Media are open

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
- **THEN** the tree shows the citation as a row beneath the birth, and no row carries a dot

#### Scenario: Some facts without a source
- **WHEN** a person's record states events of which only one cites a source
- **THEN** no line above them says how many cite none, and only the one that cites a source has a citation beneath it

#### Scenario: Every fact cites a source
- **WHEN** every event and detail of a person cites a source
- **THEN** each has its citation beneath it, and no line anywhere says that all of them do

#### Scenario: An event with no date
- **WHEN** a person's `1 BIRT` states a place and no date
- **THEN** its summary shows the place alone, with no dash and no empty date

#### Scenario: A shared note
- **WHEN** a 7.0 person's record states `1 SNOTE @N1@` and the file declares `0 @N1@ SNOTE` with text
- **THEN** the tree shows that text at the place the record writes the line

#### Scenario: Every name of a person
- **WHEN** a person's record states `1 NAME Maria /Curie/` with `2 TYPE BIRTH` and `2 NICK Manya`, and `1 NAME Marie /Curie/` with `2 TYPE MARRIED`
- **THEN** the tree shows both names in the order the file writes them, the first with its type as the birth name and its nickname `Manya` beneath it, the second as the married name

#### Scenario: A person with one plain name
- **WHEN** a person's record states one name and nothing beneath it
- **THEN** the lines of the record show that one line, with no row for what it does not state

#### Scenario: Nothing to say, nothing shown
- **WHEN** a person's record states nothing but its name
- **THEN** the card has no section about notes, related people, identifiers or other data

### Requirement: The family card

A family card SHALL show, without any cross-reference identifier, level number or
tag, each section left out where the record holds nothing for it, in this order, with no section for events, notes, related people, identifiers or other data apart from the lines of the record:

- a heading naming the family by its spouses, in the order the record names them,
  with the marriage date and place where the record states them; a family naming
  no spouse SHALL be headed by a stated placeholder;
- the **lines of the record**, as the requirement on the tree of a record says: every line the record states, in the order the file writes them, the events, the number of children, the notes, the related people and the identifiers among them;
- its **spouses**, each under the role the record names them in, and its
  **children**, each selecting their card and each, where the file says the child belongs to the
  family otherwise than by birth, marked *Adopted*, *Foster* or *Sealing* with the status the file states
  for the link; a spouse or child the file points at
  but does not declare SHALL be shown as a pointer to a record that is not in the file,
  with an action that shows it in the source;
- its **media**, as a person's are;
- the **evidence** its facts and the record rest on, which closes the card.

#### Scenario: The Curies' family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** it is headed by both names with `26 JUL 1895` and Sceaux, shows the marriage among the lines of the record with its date, lists Pierre Curie as husband and Marie as wife, and Irène Joliot-Curie and Ève Curie as children

#### Scenario: From a person to their family
- **WHEN** the reader is on Marie's card and chooses the family card beside Pierre
  Curie in her family section
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie

#### Scenario: An adopted child
- **WHEN** a family lists a child whose own record points back with `2 PEDI ADOPTED`
- **THEN** the card shows that child marked *Adopted* among the children

#### Scenario: A note on a family
- **WHEN** a family's record carries `1 NOTE` with text
- **THEN** the lines of the record show the note with its text, folded where it is long

#### Scenario: The number of children
- **WHEN** a family's record states `1 NCHI 3` while it lists two children
- **THEN** the lines of the record show a row named Number of children with `3`, and the children section lists the two it names

### Requirement: The source card

A source card SHALL show the source's title, its author and publication where the
record states them in the heading, the lines of the record, as the requirement on the tree of a record says, the repository it names with that repository's name, address
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

### Requirement: Show in source

Every fact, every line of the tree of a record, every relative that is not in the file, and the record a card shows
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

#### Scenario: Showing a line of the tree
- **WHEN** the reader chooses Show in source on the row of Marie's occupation
- **THEN** the tab is in Source mode with the `1 OCCU` line and the lines beneath it selected and in view

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

### Requirement: The controls of a card are easy to see and to hit

Every control of a card — the buttons that select a relative, a source, an event or a place, the
links *Show in source*, the notes' lines, the picture of a media card, and Back and Forward — SHALL
show a focus ring in the accent colour when it is reached by the keyboard, and SHALL NOT show it
when it is pressed with a pointer. On a device whose pointer is coarse and in the mobile app, each of
them SHALL have an activation area at least 32 pixels tall without changing the size of its text,
and a control that is a block of its own — a relative, a source, a note's line, the heading of a
fold, Back and Forward (44 by 44) — 44 pixels; where two controls stand closer together than that,
the space between them is shared. Where a card has many controls, those that act on one row or on the whole tree SHALL be shown only while the pointer is over the row or the tree, or the focus is within it, and SHALL NOT take space when hidden; a control that is reached by the keyboard SHALL appear when it takes the focus. Where the pointer cannot hover, those of a row SHALL be shown on the row the reader last pressed, and those of the tree SHALL stay shown. A control that opens or closes a part of the card SHALL stay shown. The headings of the sections of a card and the secondary lines under
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

#### Scenario: Controls under the pointer
- **WHEN** the card is shown and the pointer is not over a row of the tree
- **THEN** no *Show in source* control of a row is visible, and moving the pointer over a row shows that row's

#### Scenario: Controls by keyboard
- **WHEN** the reader reaches a row of the tree with the Tab key
- **THEN** that row's controls are visible and the control that has the focus shows a ring in the accent colour

#### Scenario: Controls on a phone
- **WHEN** Marie's card is shown on a phone and the reader presses the row of her occupation
- **THEN** that row's controls are shown, at least 44 pixels in each direction, and no other row's are

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
- **THEN** its Evidence section shows the quoted text with the citation

#### Scenario: A line no section knows
- **WHEN** an event states a custom `2 _WEATHER Rain`
- **THEN** its card shows `_WEATHER` and `Rain` in a folded Other data section

#### Scenario: A source the file does not declare
- **WHEN** an event cites `@S9@` and the file declares no such record
- **THEN** its Evidence section says the source is missing, with the way to its line
