## MODIFIED Requirements

### Requirement: Rows are ordered by generation and family

Rows SHALL be ordered by generation, the oldest first: a person with no parents in the file is of the first generation unless they have children in it, when they are of the generation one above the highest-standing of their children, and a child is one generation below
whichever of their parents stands lower. A spouse whose parents are not in the
file shares the generation of the one they married; two spouses whose parents
are both in the file both take the lower of their two generations. Within a generation, children of one family SHALL stand
together, in the order their parents stand above; a spouse whose parents are not
in the file SHALL stand beside the one they married; a person married to someone
of a neighbouring family SHALL stand on the side facing that family; the rest
SHALL follow their years of birth. Generations SHALL NOT be labelled.

#### Scenario: Pierre and Marie side by side
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** the Curie children stand together with Pierre last, the Skłodowski
  children stand together with Marie first, and so Pierre and Marie are
  neighbours

#### Scenario: A spouse from outside the file
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** Frédéric Joliot stands directly beside Irène

#### Scenario: The Curie file keeps its order
- **WHEN** the timeline of `curie.ged` is shown
- **THEN** every row stands where it stood before, the people of the first generation first

#### Scenario: A man with no parents whose daughter marries down
- **WHEN** a man with no parents in the file has a daughter who marries a man whose father and grandfather are in the file
- **THEN** his row stands among the generation of the husband's father, not among the first
