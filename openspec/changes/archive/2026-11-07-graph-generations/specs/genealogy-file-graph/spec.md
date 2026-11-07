## MODIFIED Requirements

### Requirement: Generations run from top to bottom, and couples stand together

Each generation of the file SHALL be one row of cards, the oldest at the top, a person standing in the generation the timeline of the file gives them: a person with no parents in the file, and no spouse standing below them, stands one row above the highest-standing of their children in the file, and in the first row only where they have none. Children of one family SHALL NOT stand at different heights for their years of birth. A person
and their spouses in the same generation SHALL stand side by side, a husband to
the left of his wife; a person married more than once SHALL stand between two
of their spouses. Where a couple's families are both in the graph, the
husband's parents and siblings SHALL tend to stand to the left of the couple and
the wife's to the right.

Each couple SHALL be joined through a family node between them. The node SHALL
show the year of the marriage, in its last two digits after an apostrophe, and
SHALL be drawn hollow where no marriage is dated. Spouses who stand in different
generations SHALL still be joined through their family node. A family with
one parent in the graph SHALL have no node, and its lines SHALL leave from that
parent's card.

#### Scenario: Pierre and Marie
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Pierre Curie's card stands to the left of Marie's, with a node showing
  `’95` between them; Jacques stands to the left of Pierre Curie, and Zofia,
  Józef, Bronisława Dłuska and Helena to the right of Marie

#### Scenario: The parents of each side
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Eugène and Sophie-Claire stand in the top row to the left of
  Władysław and Bronisława Boguska

#### Scenario: A marriage with no date
- **WHEN** the graph of `curie.ged` is shown
- **THEN** the node between Eugène and Sophie-Claire is hollow, and the nodes of
  the other four couples show `’60`, `’95`, `’26` and `’54`

#### Scenario: A man with no parents whose daughter marries down
- **WHEN** a man with no parents in the file has a daughter who marries a man whose own father and grandfather are in the file
- **THEN** the man stands one row above his daughter, in the row of the husband's father, and not in the top row with the husband's grandfather

#### Scenario: A man with children in two generations
- **WHEN** a man with no parents in the file has a son in the second row and a daughter in the third
- **THEN** he stands in the first row, one above the higher of the two, and both lines reach their children

#### Scenario: The Curie file keeps its rows
- **WHEN** the graph of `curie.ged` is shown
- **THEN** every card stands in the row it stood in before, Eugène and Sophie-Claire and Władysław and Bronisława Boguska in the top row

#### Scenario: Brothers of different ages
- **WHEN** two brothers were born in 1901 and 1914
- **THEN** their cards stand in one row, and the elder stands to the left of the younger unless that crosses more lines

### Requirement: Lines run from a family to each child, crossing as little as possible

A line SHALL run from each family node, or from the card of a family's one
parent in the graph, to the card of each of its children in the graph, meeting
the child's own card. Lines SHALL be curves. A line to a child more than one
generation below SHALL pass through the rows between in a lane of its own,
where no card stands.

The order of the cards in each row SHALL be chosen to cross as few lines as the graph can find within the time budget the requirement on size gives it, brothers and sisters standing from the eldest at the left to the youngest at the right wherever that crosses no more lines than any other order the graph found; the cards are then placed as close above their children and below their parents as that order and the room between cards allow. No two cards SHALL overlap.

#### Scenario: The Curie file
- **WHEN** the graph of `curie.ged` is shown whole
- **THEN** eleven lines run from the families to the children, and no two of
  them cross

#### Scenario: A line across a generation
- **WHEN** a man marries his sister's daughter, so that he stands beside her two
  generations below his parents
- **THEN** the line from his parents' family reaches his card through a lane in
  his sister's row, and no card stands in that lane



#### Scenario: A crossing that cannot be avoided
- **WHEN** no order of a row crosses fewer lines than the order shown
- **THEN** the elder brother stands to the left of the younger
