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

#### Scenario: A source the file does not declare
- **WHEN** an event cites `@S9@` and the file declares no such record
- **THEN** the card shows `@S9@` as text, not as a link

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
