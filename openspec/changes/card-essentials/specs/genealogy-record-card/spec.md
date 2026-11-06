## MODIFIED Requirements

### Requirement: The person card

A person card SHALL show, without any cross-reference identifier, level number or
tag, in this order:

- a heading with the person's portrait where there is one, their name, the years
  of birth and death where a year can be read, marked when a year is approximate
  or one end of a range, and the places of birth and death;
- their **facts**: each event and attribute of the person, in the order the
  record writes them, followed by the events of each family the person is a
  spouse of, named with the other spouse. Each fact SHALL show its name in the
  reader's language, its date as the file writes it, its place, and its own
  payload where it has one, and SHALL show how many sources the fact itself
  cites where it cites any, with no mark on a fact that cites none; one line above
  the facts SHALL say how many of the facts listed, those of the families the person is
  a spouse of included, cite no source, and SHALL be left out where every fact cites one;
- their **other names**, where the record states more than one;
- their **family**, as a list of people and not a drawing: parents; siblings; and
  for each family the person is a spouse of, the other spouse with that family's
  marriage date and place where stated, the children of that family, and a way to
  that family's card;
- their **media**;
- their **timeline**, a section of the card below the one before it, not a tab, and
  **folded** under its heading, which shows how many entries it holds: it is closed
  when a card is opened, and stays open while the card shows the same record,
  across a redraw of the card for a change of the file, and closes again when
  another record is shown. The other names stay open. The card SHALL have no
  section of places: a place is a link in a fact and in an entry of the timeline;
- the **evidence**: what the whole record rests on; what an event rests on is on the card of that event.

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
- **THEN** its section headings read, from the top, Facts, Other names, Family,
  Media, Timeline and Evidence, with her other name `Maria Salomea
  Skłodowska` under Other names, and no tab bar and no tree

#### Scenario: Folded sections
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** Timeline is folded, its heading shows its count, and pressing it shows her
  entries

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

### Requirement: The family card

A family card SHALL show, without any cross-reference identifier, level number or
tag:

- a heading naming the family by its spouses, in the order the record names them,
  with the marriage date and place where the record states them; a family naming
  no spouse SHALL be headed by a stated placeholder;
- the family's **facts** — marriage, divorce, engagement and the other family
  events the record states — in the order the record writes them, each with its
  date as written, its place, and how many sources it cites itself where it cites any,
  selectable as a person's facts are, with the same line above them about the facts
  that cite no source;
- its **spouses**, each under the role the record names them in, and its
  **children**, each selecting their card; a spouse or child the file points at
  but does not declare SHALL be shown as a pointer to a record that is not in the
  file, with an action that shows it in the source;
- its **media**, and the **evidence** its facts and the record rest on.

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

### Requirement: The event card

Selecting an event, which a row of the Events in the List does, SHALL show its **event card**. At
its top, a line naming the kind of record the event belongs to — *Person* or *Family* — and the
record as a link that selects it. Under it, the title: the name of the event as the person card
names it, a custom event by its type, and the text the event carries other than `Y`, with a *Show
in source* that moves to the lines of the event. Under the title, one line with the date as the
file writes it and the place as the file writes it, the place a link that selects it; a part the
event does not state is left out. Below them the card SHALL show the **Evidence** section for the
event: the sources the event cites, each a link that selects the source. It SHALL NOT list what the whole record rests on: that is on the card of the record, whose link
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

#### Scenario: A source the file does not declare
- **WHEN** an event cites `@S9@` and the file declares no such record
- **THEN** its Evidence section says the source is missing, with the way to its line

### Requirement: An event is one row wherever a card lists it

The facts of a person, the facts of a family and the events at a place on the card of that place
SHALL each be drawn as one **event row**: the name of the event in the reader's language, which
opens the card of the event; its date, its place as a link to the place, and its text where it has
one; and, where it cites any, the number of sources it cites, as a mark; an event that cites none
carries no mark. On the card of a
place the row SHALL also name the record the event belongs to, as a link that selects that record.
The timeline of a person SHALL keep its own form, a chronology, and SHALL show the same detail of an
event. An event that states nothing SHALL be drawn as *recorded, no details*, and an event whose
record has no identifier SHALL be drawn with a name that does not act.

#### Scenario: A fact on a person's card
- **WHEN** Marie's card shows her birth
- **THEN** its row names `Birth`, shows `7 NOV 1867` and `Warsaw, Congress Poland` as a link, and carries no mark of sources

#### Scenario: A fact that cites a source
- **WHEN** a birth carries `2 SOUR @S2@` and a person's card shows it
- **THEN** its row shows that it cites one source

#### Scenario: An event at a place
- **WHEN** the card of `Warsaw, Congress Poland` lists Marie's birth
- **THEN** the row names `Birth`, shows `7 NOV 1867`, and links `Marie Skłodowska-Curie`

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
them SHALL be set in the muted text colour of the theme, not the faint one. The line that says how many
facts cite no source SHALL be set in the muted text colour, not a warning one; a notice that a
source is missing keeps its warning colour. Nothing SHALL set a colour that is not one of the theme's.

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
- **THEN** the line above her facts is in the muted text colour, on a card with no orange mark

#### Scenario: A picture on a media card
- **WHEN** the card of a photograph in the vault is shown
- **THEN** its picture is a button that opens the file, reachable with the keyboard

## REMOVED Requirements

### Requirement: The places of a person

**Reason**: The place is already a link in every fact and in every entry of the timeline; a section that lists the same places again with the same events is a third copy of what the card shows. The list's Places kind and the card of a place stay.

**Migration**: Open the place from the link in a fact or in an entry of the timeline.
