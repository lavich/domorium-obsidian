## MODIFIED Requirements

### Requirement: The evidence section closes the card and follows the selection

The last section of a person card and of a family card SHALL be **Evidence**: what
the selected fact, or else the whole record, rests on in the file, kept apart so
that a source of the person is never mistaken for a source of a fact. It SHALL show
the fact selected on the card the tab holds, or the whole record when no fact is
selected. Its heading SHALL name what it shows — the fact with its date and place,
or *Whole record* with the person's or family's name — and SHALL offer *Whole
record* when a fact is selected and Show in source always. Selecting a fact on the
card, in the timeline section or in the list of facts, SHALL change the section at
once and SHALL NOT scroll the card.

There SHALL be no Evidence view in the sidebar and no command that opens one.

#### Scenario: Selecting a birth
- **WHEN** the reader selects Marie's birth on her card
- **THEN** the section's heading names the birth with `7 NOV 1867` and `Warsaw,
  Congress Poland`

#### Scenario: Back to the whole record
- **WHEN** a fact is selected and the reader chooses Whole record in the section
- **THEN** the section shows Marie's whole record and the fact is no longer
  selected on the card

#### Scenario: A person selected in the graph
- **WHEN** the active GEDCOM tab is in Graph mode and the reader activates Pierre
  Curie's card
- **THEN** the Evidence section of the card lists `The Nobel Prize in Physics 1903`
  among the sources of Pierre Curie's whole record

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** no card is placed and the palette offers no command to open evidence
