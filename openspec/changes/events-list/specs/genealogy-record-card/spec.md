## MODIFIED Requirements

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
- **WHEN** the reader selects Marie's birth on her card and then chooses Whole
  record in the Evidence section of the card of her birth
- **THEN** the card shows Marie, with the Evidence section of her whole record

## ADDED Requirements

### Requirement: The event card

Selecting an event, which a row of the Events in the List does, SHALL show its **event card**: the
name of the event as the person card names it, a custom event by its type, and the text the event
carries other than `Y`; the record it belongs to, as a link that selects that record; the date as
the file writes it; and the place as the file writes it, as a link that selects the place. Below them
the card SHALL show the **Evidence** section for the event: the sources the event cites, each a link
that selects the source, and what the whole record rests on, as the person card shows it for a
selected fact. The card SHALL have a *Show in source* that moves to the lines of the event, and it SHALL show
nothing the file does not hold. Choosing a fact on a person's or a family's card, or an entry of a
person's timeline, SHALL open this card. Selecting a link on it SHALL NOT write to the file. An event that
carries nothing to show beyond its name SHALL still have a card, which says that the event states no
date, place or source.

#### Scenario: A birth
- **WHEN** the event card of Marie's birth is shown
- **THEN** it reads `Birth`, links `Marie Skłodowska-Curie`, and shows `7 NOV 1867` and a link
  `Warsaw, Congress Poland`

#### Scenario: An occupation
- **WHEN** the event card of an occupation `Physicist` with no date and no place is shown
- **THEN** it reads `Occupation · Physicist` and says the event states no date, place or source

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
- **WHEN** the reader presses the record on the event card of Marie's birth
- **THEN** the card shows Marie

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
