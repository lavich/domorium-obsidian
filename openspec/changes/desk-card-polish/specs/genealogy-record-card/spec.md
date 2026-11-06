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
  cites, or that it cites none;
- their **other names**, where the record states more than one;
- their **family**, as a list of people and not a drawing: parents; siblings; and
  for each family the person is a spouse of, the other spouse with that family's
  marriage date and place where stated, the children of that family, and a way to
  that family's card;
- their **media**;
- their **timeline** and their **places**, each a section of the card below the
  one before it, not a tab, and each **folded** under its heading, which shows how
  many entries or places it holds: both are closed when a card is opened, and a
  section the reader opens stays open while the card shows the same record,
  across a redraw of the card for a change of the file, and closes again when
  another record is shown. The other names stay open;
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
  and `Sceaux, France`, each marked as citing no source of its own

#### Scenario: The sections in order
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** its section headings read, from the top, Facts, Other names, Family,
  Media, Timeline, Places and Evidence, with her other name `Maria Salomea
  Skłodowska` under Other names, and no tab bar and no tree

#### Scenario: Folded sections
- **WHEN** the card shows Marie Skłodowska-Curie from the demo vault
- **THEN** Timeline and Places are folded, each heading shows its count, and pressing
  the Timeline heading shows her entries

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

### Requirement: The event card

Selecting an event, which a row of the Events in the List does, SHALL show its **event card**. At
its top, a line naming the kind of record the event belongs to — *Person* or *Family* — and the
record as a link that selects it. Under it, the title: the name of the event as the person card
names it, a custom event by its type, and the text the event carries other than `Y`, with a *Show
in source* that moves to the lines of the event. Under the title, one line with the date as the
file writes it and the place as the file writes it, the place a link that selects it; a part the
event does not state is left out. Below them the card SHALL show the **Evidence** section for the
event: the sources the event cites, each a link that selects the source, and what the whole record
rests on, as the person card shows it for the record. The card SHALL show nothing the file does not
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

## ADDED Requirements

### Requirement: An event is one row wherever a card lists it

The facts of a person, the facts of a family and the events at a place on the card of that place
SHALL each be drawn as one **event row**: the name of the event in the reader's language, which
opens the card of the event; its date, its place as a link to the place, and its text where it has
one; and the number of sources the event cites, or that it cites none, as a mark. On the card of a
place the row SHALL also name the record the event belongs to, as a link that selects that record.
The timeline of a person SHALL keep its own form, a chronology, and SHALL show the same detail of an
event. An event that states nothing SHALL be drawn as *recorded, no details*, and an event whose
record has no identifier SHALL be drawn with a name that does not act.

#### Scenario: A fact on a person's card
- **WHEN** Marie's card shows her birth
- **THEN** its row names `Birth`, shows `7 NOV 1867` and `Warsaw, Congress Poland` as a link, and shows that it cites no source

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
them SHALL have an activation area at least 44 pixels tall (Back and Forward 44 by 44), without
changing the size of its text; where two controls stand closer together than that, the space between
them is shared, and neither has less than 36 pixels. The headings of the sections of a card and the secondary lines under
them SHALL be set in the muted text colour of the theme, not the faint one. A fact or an event that
cites no source SHALL be marked in a neutral colour, not a warning one; a notice that a source is
missing keeps its warning colour. Nothing SHALL set a colour that is not one of the theme's.

#### Scenario: Keyboard focus
- **WHEN** the reader reaches `Pierre Curie` in Marie's family section with the Tab key
- **THEN** a ring in the accent colour surrounds it

#### Scenario: A press with the pointer
- **WHEN** the reader presses `Pierre Curie` with a pointer
- **THEN** no ring is drawn around it

#### Scenario: A phone
- **WHEN** Marie's card is shown 390 pixels wide on a phone
- **THEN** the area that activates `Pierre Curie`, a place link in her birth and Back is at least 36 pixels tall, and 44 where no other control is beside it

#### Scenario: A fact without a source
- **WHEN** Marie's birth cites no source
- **THEN** its mark reads that it cites none, in a neutral colour on a card with no orange mark

#### Scenario: A picture on a media card
- **WHEN** the card of a photograph in the vault is shown
- **THEN** its picture is a button that opens the file, reachable with the keyboard
