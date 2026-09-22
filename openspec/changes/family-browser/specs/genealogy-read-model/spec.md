## ADDED Requirements

### Requirement: The families a document declares

The model SHALL report every `FAM` record in the document as a family, in the
order the file declares them, with the identifier the record carries. A record
declaring no identifier SHALL be reported and marked unaddressable, as a person
so declared is.

Each family SHALL carry what a reader needs to tell it from another without
opening it: the people it joins as spouses, a year and a place read from the
marriage the record states, and how many children it records.

#### Scenario: A document of people and families
- **WHEN** the model reads a document holding 5 `FAM` records
- **THEN** it reports 5 families, in the order the file declares them

#### Scenario: What a family carries for a list
- **WHEN** a family record names two spouses, a marriage in 1895 at Sceaux and
  two children
- **THEN** the family carries both spouses, the year 1895, the place, and a
  count of two children

#### Scenario: A family record with no identifier
- **WHEN** the document holds a line `0 FAM` with no cross-reference
- **THEN** a family is reported for it, marked unaddressable, and the rest of
  the document is read normally

### Requirement: A family is named by the people in it

A family record carries no name of its own. The model SHALL name a family by
the people it joins as spouses, in the order the record names them, joined so
that a reader can tell one family from another in a list.

Where a family names one spouse, that one names it. Where it names none, the
model SHALL report no name rather than an invented one, and a caller SHALL
show the identifier instead.

A spouse the document does not declare SHALL NOT contribute a name, and SHALL
NOT prevent the other spouse from naming the family.

#### Scenario: A family joining two people
- **WHEN** a family names `@I2@` as Pierre Curie and `@I1@` as Marie
  Skłodowska-Curie, in that order
- **THEN** the family is named by both, in that order

#### Scenario: A family naming one spouse
- **WHEN** a family names one spouse and no other
- **THEN** that spouse names the family

#### Scenario: A family naming nobody
- **WHEN** a family names no spouse at all
- **THEN** the family has no name, and the caller is left to show its
  identifier

#### Scenario: A spouse the document does not declare
- **WHEN** a family names two spouses and the document declares only one
- **THEN** the family is named by the one it declares, and the other is
  reported as an unresolved reference

### Requirement: A family read in full

Reading one family SHALL report its spouses and its children as people,
resolved and in the order the record names them, each carrying what a person
row carries so a caller can show them as it shows anybody.

Which role named each person SHALL be reported with them, because a family is
read differently from either side, and a caller showing one cannot infer the
role from position.

A pointer the document does not declare SHALL be reported as unresolved,
carrying the identifier it named, as it is for a person.

#### Scenario: A family with spouses and children
- **WHEN** a family names two spouses and two children, all declared
- **THEN** all four are reported as people, in the order the record names
  them, each with the role that named them

#### Scenario: A child the document does not hold
- **WHEN** a family names a child the document does not declare
- **THEN** the remaining children are reported and the identifier is reported
  as unresolved

### Requirement: The events a family record carries

The model SHALL report the events a family record carries, in the order the
record writes them, from a named set of the event structures GEDCOM defines
for a family record — marriage, divorce, engagement, annulment and the rest of
that set.

The set SHALL be named rather than inferred, for the reason a person's is:
nothing in the document data distinguishes an event from another structure.
A structure outside the set — a pointer to a spouse, a child, a note, a source
— SHALL NOT be reported as an event.

Each event SHALL carry the tag it was written with, its date and place where
it has them, and its own payload where it carries one, as a person's event
does.

#### Scenario: A marriage with a date and a place
- **WHEN** a family record carries `1 MARR` with `2 DATE 26 JUL 1895` and
  `2 PLAC Sceaux, France`
- **THEN** one event is reported, tagged `MARR`, carrying that date and place

#### Scenario: A family that records only that a marriage happened
- **WHEN** a family record carries `1 MARR` with nothing beneath it
- **THEN** one event is reported, tagged `MARR`, with no date and no place

#### Scenario: A structure that is not an event
- **WHEN** a family record carries `1 HUSB @I1@`, `1 CHIL @I2@` and
  `1 SOUR @S1@`
- **THEN** none of the three is reported as an event

### Requirement: The families a person belongs to

Reading a person SHALL report the families they belong to: the ones their
record points at as a child, and the ones it points at as a spouse, each
distinguished from the other, in the order the record points at them.

Each SHALL carry what a family row carries, so a caller can show a family
beside a person without reading it in full.

A person whose record points at no family SHALL report none, and a pointer the
document does not declare SHALL be reported as unresolved, as it already is.

#### Scenario: A person who is a child and a spouse
- **WHEN** a person's record carries `1 FAMC @F1@` and `1 FAMS @F3@`, both
  declared
- **THEN** `@F1@` is reported as a family they were a child in and `@F3@` as
  one they were a spouse of

#### Scenario: A person in more than one spouse-family
- **WHEN** a person's record points at two families as a spouse
- **THEN** both are reported, in the order the record points at them

#### Scenario: A person pointing at no family
- **WHEN** a person's record points at no family
- **THEN** no families are reported for them
