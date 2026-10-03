## ADDED Requirements

### Requirement: The page shows the families the person belongs to

The page SHALL show the families the person's record points at: the one they
were a child in, and the ones they were a spouse of, each group named so a
reader can tell which is which, and each left out entirely when the record
points at none.

Each family SHALL be shown the way a row in the families list shows one — the
people it joins and the year of the marriage — and SHALL be openable, opening
that family's own page.

This does not replace the parents, partners and children the page already
shows. Those answer who this person is related to; a family answers what the
record says about the marriage itself, which is where a date and a place live.

#### Scenario: A person who is a child and a spouse
- **WHEN** the record points at one family as a child and one as a spouse
- **THEN** the page shows two named groups, each holding one family

#### Scenario: A person belonging to no family
- **WHEN** the record points at no family
- **THEN** the page shows no family groups of this kind, and shows the rest of
  the person normally

#### Scenario: Opening the family
- **WHEN** the reader chooses one of the families shown
- **THEN** that family's page shows it

#### Scenario: A family the document does not hold
- **WHEN** the record points at a family the document does not declare
- **THEN** it is not shown as a family to open, and the unresolved reference is
  stated as it already is
