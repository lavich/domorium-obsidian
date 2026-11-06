## RENAMED Requirements

- FROM: `### Requirement: Sources of the fact, then of the whole record`
- TO: `### Requirement: Sources of the fact`

## MODIFIED Requirements

### Requirement: Sources of the fact

On an event card the section SHALL list the citations that event itself makes, and no others.

Where the event cites nothing, the section SHALL say the event has no source of its own, and SHALL
say either that the sources of the whole record are on the card of the record, or that the record
cites nothing either.

An event of a family the person married into SHALL show that family event's own citations as its
own.

#### Scenario: A fact with no source of its own
- **WHEN** Marie's birth is selected
- **THEN** the section says the birth has no source of its own and that the sources of the whole
  record are on Marie's card, and lists no source

#### Scenario: A fact with its own source
- **WHEN** a selected birth carries `2 SOUR @S2@` beneath it
- **THEN** `@S2@`'s source is listed as the birth's own, and no source of the record is listed

#### Scenario: A record that cites nothing
- **WHEN** a fact of Zofia Skłodowska is selected
- **THEN** the section says the fact has no source of its own and that the record
  cites nothing either

### Requirement: The section on a family card

On a family card the section SHALL show what the family record rests on, as a person card does: the
sources the record cites of itself and the notes in the vault that link to it. The
citations of a family event are on the card of that event.

#### Scenario: The Curies' marriage selected
- **WHEN** the event card of the marriage of Pierre and Marie Curie is shown
- **THEN** the section says the marriage has no source of its own and that the
  family record cites nothing either

### Requirement: Notes in the vault that link to the record

Below the record's own sources the Evidence section SHALL list every Markdown note in the
vault that links to the record shown — a link or an embed whose target resolves
to this GEDCOM file and whose subpath names the record — for a person, a family,
a source or a multimedia record alike. Each note SHALL be shown by its name with
the line around the link, the link itself marked; a note linking more than once
SHALL be listed once, with each of its lines. Activating a line SHALL open the
note in a new tab at that line.

The section of an event card SHALL list no note: the notes that link to the record are on the
card of the record. A record no note links to SHALL say so. Nothing a note says SHALL be compared
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

### Requirement: The evidence section closes the card and follows the selection

The last section of a person card, of a family card and of an event card SHALL be **Evidence**.
On a person card and on a family card it SHALL show what the whole record rests on in the file:
the sources the record cites of itself, and the notes in the vault that link to it, under the
heading *Evidence* alone, without a head that repeats the record's name. On an event card it SHALL show only what the event rests on — *Sources of this fact* — and no
source of the record and no note, so that a source of the person is never mistaken for a source of
the event; the whole record is one link away, at the top of the card. On an event card the section SHALL NOT open
with a head that repeats the name and the detail of the event, SHALL NOT offer *Show in source*
a second time and SHALL NOT offer a link back to the whole record beside the record link at the
top of the card. Choosing a fact on a person's or a family's card, or an entry of a timeline,
SHALL show the card of its event and its Evidence at once.

There SHALL be no Evidence view in the sidebar and no command that opens one.

#### Scenario: Selecting a birth
- **WHEN** the reader chooses Marie's birth on her card
- **THEN** the event card of the birth is shown, and its Evidence section lists the sources of
  the birth under *Sources of this fact* and has no head naming the birth

#### Scenario: An event card has no whole record
- **WHEN** the event card of Marie's birth is shown
- **THEN** its Evidence section has no heading *Whole record* and no heading *Sources of the record*

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
