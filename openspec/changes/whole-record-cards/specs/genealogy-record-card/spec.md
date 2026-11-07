## MODIFIED Requirements

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
