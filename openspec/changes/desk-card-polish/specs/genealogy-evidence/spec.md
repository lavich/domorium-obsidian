## MODIFIED Requirements

### Requirement: The evidence section closes the card and follows the selection

The last section of a person card, of a family card and of an event card SHALL be **Evidence**.
On a person card and on a family card it SHALL show what the whole record rests on in the file:
the sources the record cites of itself, and the notes in the vault that link to it, headed with
the record's name. On an event card it SHALL show what the event rests on — *Sources of this fact*
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
