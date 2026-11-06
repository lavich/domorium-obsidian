# genealogy-evidence Specification

## Purpose

The evidence panel in the right sidebar: what the selected fact, or the whole
record, rests on in the file, kept apart so that a source of the person is
never mistaken for a source of a fact.

## Requirements

### Requirement: Sources of the fact, then of the whole record

With a fact selected, the section SHALL first list the citations that fact
itself makes. Below them, under a separate heading, it SHALL list the citations
the person's or family's record makes on itself. With no fact selected it
SHALL list only the latter.

Where the selected fact cites nothing, the section SHALL say the fact has no
source of its own, and SHALL say either that the sources below belong to the
whole record and may not support this fact, or that the record cites nothing
either.

A fact of a family the person married into SHALL show that family event's own
citations as its own; the whole record SHALL remain the person's.

#### Scenario: A fact with no source of its own
- **WHEN** Marie's birth is selected
- **THEN** the section says the birth has no source of its own and that the two
  sources below belong to the whole record, and lists those two below

#### Scenario: A fact with its own source
- **WHEN** a selected birth carries `2 SOUR @S2@` beneath it
- **THEN** `@S2@`'s source is listed as the birth's own, above the record's

#### Scenario: A record that cites nothing
- **WHEN** a fact of Zofia Skłodowska is selected
- **THEN** the section says the fact has no source of its own and that the record
  cites nothing either

### Requirement: What a citation shows

Each citation SHALL show the title of the source it names, which selects that
source; the page or entry the citation states; the quality of evidence
it states, in words; and the author and publication the source states.

A citation of a source the file does not declare SHALL say so and offer Show in
source. A source described on the spot SHALL show the text its line states and
say that it is described in the record rather than as a source record.

#### Scenario: A citation with a page
- **WHEN** the whole record of Marie is shown
- **THEN** `The Nobel Prize in Physics 1903` is listed with
  `Nobel Prize in Physics 1903, shared with Pierre Curie and Henri Becquerel`
  and `Nobel Prize Outreach · nobelprize.org`

#### Scenario: A citation with a quality
- **WHEN** a citation carries `QUAY 3`
- **THEN** it shows that the evidence is primary

#### Scenario: Opening a source
- **WHEN** the reader activates `The Nobel Prize in Physics 1903` in the Evidence
  section
- **THEN** the card shows that source

### Requirement: Notes in the vault that link to the record

Below the record's own sources the Evidence section SHALL list every Markdown note in the
vault that links to the record shown — a link or an embed whose target resolves
to this GEDCOM file and whose subpath names the record — for a person, a family,
a source or a multimedia record alike. Each note SHALL be shown by its name with
the line around the link, the link itself marked; a note linking more than once
SHALL be listed once, with each of its lines. Activating a line SHALL open the
note in a new tab at that line.

A record no note links to SHALL say so. Nothing a note says SHALL be compared
with the record.

#### Scenario: Notes linking to Marie
- **WHEN** Marie's whole record is shown in the demo vault
- **THEN** the Evidence section lists six notes, among them *Radium* with the line
  "…announced in December 1898 by Marie Skłodowska-Curie and…", her name marked

#### Scenario: A note linking twice
- **WHEN** *Nobel Prizes in the family* links Marie on two lines
- **THEN** it is listed once, with both lines

#### Scenario: A record no note links to
- **WHEN** the card shows Sophie-Claire Depouilly
- **THEN** it says no note links to this record

### Requirement: The section on a family card

On a family card the section SHALL treat the family as it treats a person: the
selected family fact's own citations first, then those the family record makes
on itself.

#### Scenario: The Curies' marriage selected
- **WHEN** the family card of Pierre and Marie Curie is shown and the marriage
  is selected
- **THEN** the section says the marriage has no source of its own and that the
  family record cites nothing either

### Requirement: The section on a source card and a media card

On a source card and on a media card there SHALL be no list of citations, and the
last section of the card SHALL be the notes in the vault that link to the record.
The card's heading names the source or the file and offers Show in source.

#### Scenario: A source page shown
- **WHEN** the card shows `Parish registers of Warsaw`
- **THEN** its heading names that source and offers Show in source, and the card
  lists no citations of the source's own beneath it

### Requirement: The evidence section closes the card and follows the selection

The last section of a person card, of a family card and of an event card SHALL be **Evidence**.
On a person card and on a family card it SHALL show what the whole record rests on in the file:
the sources the record cites of itself, and the notes in the vault that link to it, under the
heading *Evidence* alone, without a head that repeats the record's name. On an event card it SHALL show what the event rests on — *Sources of this fact*
— and, kept apart under *Whole record*, what the whole record rests on, so that a source of the
person is never mistaken for a source of the event. On an event card the section SHALL NOT open
with a head that repeats the name and the detail of the event, SHALL NOT offer *Show in source*
a second time and SHALL NOT offer a link back to the whole record beside the record link at the
top of the card. Choosing a fact on a person's or a family's card, or an entry of a timeline,
SHALL show the card of its event and its Evidence at once.

There SHALL be no Evidence view in the sidebar and no command that opens one.

#### Scenario: Selecting a birth
- **WHEN** the reader chooses Marie's birth on her card
- **THEN** the event card of the birth is shown, and its Evidence section lists the sources of
  the birth under *Sources of this fact* and has no head naming the birth

#### Scenario: Back to the whole record
- **WHEN** the event card of Marie's birth is shown and the reader presses the record at its top
- **THEN** Marie's card is shown, and its Evidence section shows her whole record

#### Scenario: A person selected in the graph
- **WHEN** the active GEDCOM tab is in Graph mode and the reader activates Pierre
  Curie's card
- **THEN** the Evidence section of the card lists `The Nobel Prize in Physics 1903`
  among the sources of Pierre Curie's whole record

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** no card is placed and the palette offers no command to open evidence
