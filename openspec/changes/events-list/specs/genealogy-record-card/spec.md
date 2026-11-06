## ADDED Requirements

### Requirement: The event card

Selecting an event, which a row of the Events in the List does, SHALL show its **event card**: the
name of the event as the person card names it, a custom event by its type, and the text the event
carries other than `Y`; the record it belongs to, as a link that selects that record; the date as
the file writes it; the place as the file writes it, as a link that selects the place; and the
sources the event cites, each a link that selects the source, or its text where the citation names no
record. The card SHALL have a *Show in source* that moves to the lines of the event, and it SHALL show
nothing the file does not hold. Selecting a link on it SHALL NOT write to the file. An event that
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
- **WHEN** the event card of an event that cites a source record is shown, and the reader presses the source
- **THEN** the card shows that source

#### Scenario: Show in source
- **WHEN** the reader presses *Show in source* on the event card of Marie's birth
- **THEN** the tab shows the Source mode with the lines of that birth selected

#### Scenario: A record pressed
- **WHEN** the reader presses the record on the event card of Marie's birth
- **THEN** the card shows Marie
