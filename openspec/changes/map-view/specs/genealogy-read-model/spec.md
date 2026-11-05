## ADDED Requirements

### Requirement: An event's place carries the coordinates its MAP states

Where the `PLAC` line of an event of a person or of a family has a `MAP` structure holding a `LATI` and a `LONG`, the model SHALL report, with the event's place, the coordinates as signed decimal degrees, positive north and east and negative south and west. A latitude SHALL be valid as one letter `N` or `S` followed by a decimal number from 0 to 90 and a longitude as one letter `E` or `W` followed by a decimal number from 0 to 180. Where either is missing or invalid, the model SHALL report no coordinates for the event, and SHALL still report the place as written. An event with no `PLAC` SHALL have none, and a `MAP` anywhere else SHALL be ignored. The coordinates SHALL be read from the document's own lines, in a document of either version and in one that declares none, and SHALL NOT be looked up from the name of a place, from another file or from the network.

#### Scenario: A birth with coordinates
- **WHEN** a birth has `PLAC Warsaw, Congress Poland` with `MAP`, `LATI N52.2297` and `LONG E21.0122`
- **THEN** the event's place is `Warsaw, Congress Poland` and its coordinates are 52.2297 and 21.0122

#### Scenario: The other hemispheres
- **WHEN** a death has `LATI S18.150944` and `LONG W46.6`
- **THEN** its coordinates are -18.150944 and -46.6

#### Scenario: A family's event
- **WHEN** a marriage has `PLAC Paris, France` with `MAP`, `LATI N48.8566` and `LONG E2.3522`
- **THEN** the family's marriage reports those coordinates

#### Scenario: A place without MAP
- **WHEN** an event has `PLAC Sceaux, France` and no `MAP`
- **THEN** the event reports the place and no coordinates

#### Scenario: A half-stated MAP
- **WHEN** a `MAP` has a `LATI` and no `LONG`, or a latitude of `N95.0`
- **THEN** the event reports the place and no coordinates

#### Scenario: A MAP beside the event
- **WHEN** a `MAP` sits under an event and not under its `PLAC`
- **THEN** it is ignored

#### Scenario: Both versions
- **WHEN** the same birth is written in a 5.5.1 document, in a 7.0 document and in one declaring no version
- **THEN** each reports the same coordinates
