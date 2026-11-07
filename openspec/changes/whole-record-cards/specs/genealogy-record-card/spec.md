## MODIFIED Requirements

### Requirement: The person card

A person card SHALL show, without any cross-reference identifier, level number or
tag, in this order, each section left out where the record holds nothing for it, except
the two that say what is missing: the parents in the family, and the evidence. A section
that lists things SHALL show how many in its heading, as `Facts · 4`.

- a heading with the person's portrait where there is one, their name, one line with their sex as
  the record states it, the years of birth and death where a year can be read, marked when a year is
  approximate or one end of a range, and the places of birth and death, a part the record does not
  state being left out;
- their **names**: every name the record states, in the order it writes them, each as written, with the type it
  states and the parts it states beneath it — given names, surname, prefix, suffix, nickname,
  surname prefix — and what the name itself carries, its notes and the sources it cites; left out
  where the record states one name with nothing beneath it, which the heading already shows;
- their **facts**: each event and attribute of the person, in the order the
  record writes them, followed by the events of each family the person is a
  spouse of, named with the other spouse. Each fact SHALL be one compact row showing its name in the
  reader's language, its date as the file writes it, its place, and its own
  payload where it has one, and SHALL show how many sources the fact itself
  cites where it cites any, with no mark on a fact that cites none; every other thing the fact
  states is on its event card. One line above
  the facts SHALL say how many of the facts listed, those of the families the person is
  a spouse of included, cite no source, and SHALL be left out where every fact cites one;
- their **family**, as a list of people and not a drawing: for each family the person is a
  child of, its parents under a head that says how the person belongs to it where the file says
  it is not by birth — *Adoptive parents*, *Foster parents*, *Sealing parents* — and the status
  the file states for the link; where the person is a child of no family, a line saying the
  parents are not recorded; siblings; and for each family the person is a spouse of, the other
  spouse with that family's marriage date and place where stated, the children of that family, and
  a way to that family's card;
- their **notes**, as the next requirement says;
- their **related people**: each person the record names as associated with them, with the role
  the record states, and each record it names as another record of the same person;
- their **media**;
- their **timeline**, a section of the card below the one before it, not a tab, and
  **folded** under its heading, which shows how many entries it holds: it is closed
  when a card is opened, and stays open while the card shows the same record,
  across a redraw of the card for a change of the file, and closes again when
  another record is shown. The names stay open. The card SHALL have no
  section of places: a place is a link in a fact and in an entry of the timeline;
- the **evidence**: what the whole record rests on; what an event rests on is on the card of that event;
- its **identifiers and record information**, **folded** like the timeline: reference numbers and
  unique identifiers with their types, the restriction, and when the record was created and last
  changed, each named in the reader's language;
- its **other data**, **folded** like the timeline: every line of the record that no section above
  shows, as the next requirement says.

Every relative shown SHALL select that person. A relative the file points at but
does not declare SHALL be shown as a pointer to a record that is not in the file,
with an action that shows it in the source. No section of the card SHALL be a tab
or a separate page, and the card SHALL NOT draw the family as a tree.

#### Scenario: Marie's facts
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** it lists her birth with `7 NOV 1867` and `Warsaw, Congress Poland`, her
  death with `4 JUL 1934` and `Passy, Haute-Savoie, France`, her occupation
  `Physicist and chemist`, and her marriage with Pierre Curie with `26 JUL 1895`
  and `Sceaux, France`, with no mark of sources on any of them and, above them, a line reading
  `Facts without a source: 4 of 4`

#### Scenario: The sections in order
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** its section headings read, from the top, Names · 2, Facts · 4, Family, Media · 3,
  Timeline, Evidence, Identifiers and record information and Other data where the record holds
  them, with her other name `Maria Salomea Skłodowska` under Names, and no tab bar and no tree

#### Scenario: Folded sections
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** Timeline, Identifiers and record information and Other data are folded, each heading
  shows its count, and pressing Timeline shows her entries; Names, Facts and Family are open

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
- **THEN** the birth shows that it cites one source

#### Scenario: Some facts without a source
- **WHEN** a person's record states four facts and one of them carries `2 SOUR @S2@` beneath it
- **THEN** the line above the facts reads `Facts without a source: 3 of 4`, and only the fact
  that cites one carries a mark

#### Scenario: Every fact cites a source
- **WHEN** every fact of a person's record cites a source
- **THEN** the card draws no line above the facts about facts without a source

#### Scenario: Two marriages
- **WHEN** a person is a spouse of two families
- **THEN** the family section shows two spouses, each with the children of that
  family under them

#### Scenario: A parent who is not in the file
- **WHEN** a person's child-family names a husband the file does not declare
- **THEN** the parents show the declared parent and a pointer to a record that is
  not in the file

#### Scenario: Following a relative
- **WHEN** the reader activates Pierre Curie in Marie's family section
- **THEN** the card shows Pierre Curie, and the tab's mode is as it was

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
- the family's **facts** — marriage, divorce, engagement and the other family
  events the record states — in the order the record writes them, each one compact row with its
  date as written, its place, and how many sources it cites itself where it cites any,
  selectable as a person's facts are, with the same line above them about the facts
  that cite no source, and the number of children the record states for the family where it states one;
- its **spouses**, each under the role the record names them in, and its
  **children**, each selecting their card and each, where the file says the child belongs to the
  family otherwise than by birth, marked *Adopted*, *Foster* or *Sealing* with the status the file states
  for the link; a spouse or child the file points at
  but does not declare SHALL be shown as a pointer to a record that is not in the file,
  with an action that shows it in the source;
- its **notes**, and its **related people**, as a person's card shows them;
- its **media**, and the **evidence** its facts and the record rest on;
- its **identifiers and record information** and its **other data**, each folded as a person's are.

#### Scenario: The Curies' family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** it is headed by both names with `26 JUL 1895` and Sceaux, lists the
  marriage as a fact with no mark of sources, under a line reading
  `Facts without a source: 1 of 1`, Pierre Curie as husband and Marie as wife,
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
- **THEN** the card says the record states three children, beside the two it lists

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
  religion, the restriction, the age of each spouse for an event of a family, the date's phrase and time,
  the sorting date, the address as the file writes it, and the phone numbers, e-mail addresses, fax numbers
  and web addresses; and what the place itself states — its form, its latitude and longitude, its
  translations and its notes;
- its **notes**, and its **related people** with the role each is stated in, as a person's card shows them;
- its **media**;
- its **Evidence** section: the sources the event cites, each a link that selects the source, with
  the page, the quality and whatever else the citation states — its quoted text and date, the event
  and role it names, its notes and media;
- its **other data**, folded: every line of the event no section above shows.

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
- **WHEN** the reader chooses Marie's birth in the Facts of her card
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
