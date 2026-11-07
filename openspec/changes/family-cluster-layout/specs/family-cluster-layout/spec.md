## Purpose
The layout engine behind the graph of a file: it groups people into family clusters, builds the hierarchy of clusters around a root, places the clusters and then the people in them, and routes the lines, deterministically and without depending on how the result is drawn.

## ADDED Requirements

### Requirement: People are grouped into family clusters before they are placed

The engine SHALL build one cluster for each family record it is given, holding
the family's partners — none, one, two or more — and its children, each child
with the kind of its link to the family as the file states it (birth, adopted,
foster, sealing, other) or as unstated where the file states none. A person
SHALL be one card however many clusters they belong to: a child in one, a
partner in a second and a third, a child in two where a file names both a birth
and an adoptive family. A family with no partner in the shown people but a child
SHALL still form a cluster. The engine SHALL NOT add a person, a family or a
link the file does not state, and SHALL NOT drop one: a link it cannot place — a
person who is their own parent, a member listed twice in a family — SHALL be kept
as written and reported with the layout.

Clusters SHALL be connected where they share a person: by descent where a person
is a child in one and a partner in the other, by remarriage where a person is a
partner in both, and by alternate parents where a child is in both. Each
connection SHALL keep the xref of the person and the kind of each end.

#### Scenario: A couple with two children
- **WHEN** a file has one family with a husband, a wife and two children
- **THEN** there is one cluster of two partners and two children, every person is one card, and each child's link is of the kind the file states or unstated

#### Scenario: A child who marries
- **WHEN** a child of family A is a partner in family B
- **THEN** the two clusters are joined by descent through that person, who is one card

#### Scenario: Multiple marriages
- **WHEN** a man is a partner in three families
- **THEN** there are three clusters, joined by remarriage through him, and he is one card standing between two of his spouses

#### Scenario: Two partners of one sex, or three partners
- **WHEN** a family has two husbands, or three partners
- **THEN** the cluster holds all of them and no partner is dropped or assumed to be missing

#### Scenario: Unknown parents
- **WHEN** a family names a child and no partner, or a person has no child-family
- **THEN** the child is shown, the engine invents no parent, and the person is the top of their own branch

#### Scenario: Adoption
- **WHEN** a child has an adoptive family and a birth family
- **THEN** the child is one card, joined to both clusters by alternate parents, each link keeping its kind

#### Scenario: A contradiction is kept
- **WHEN** a person is listed as their own parent, or twice as a partner of one family
- **THEN** the layout finishes, the link or member is reported and not dropped, and no other cluster changes

### Requirement: The root shapes the structure

The engine SHALL take a root person, and SHALL lay the file out around them:
their ancestors above, their descendants below, their spouses beside them, and
every other cluster attached at the person and the cluster where it branches from
that structure, near that point. Each cluster SHALL be given the number of
clusters it is from the root, its role — ancestor, descendant, collateral — and
the logical layer it belongs to: the root's lineage in the first, a collateral
branch in the layer after the one it hangs from. Where two paths from the root
reach one person or cluster, the engine SHALL show it once and join both paths
to it, as a convergence. Choosing another root SHALL lay the same file out again
around that person. Where no root is given the first person of the file SHALL be
the root, and a part of the file not reached from it SHALL be laid out from its
own first person and stand after it.

The engine SHALL NOT assume the families form an acyclic graph: it SHALL find its
way through a person who is their own ancestor, and through the same ancestor
reached by many paths, in a time that does not grow with the number of paths,
and SHALL finish.

#### Scenario: Ancestors up, descendants down
- **WHEN** a file is laid out around a person with parents and children
- **THEN** the parents' cluster stands in an earlier generation than the root's, the children's in a later one

#### Scenario: A collateral branch
- **WHEN** the root's father has a brother with a family
- **THEN** the brother's cluster is a collateral of the layer after the root's lineage, attached at the root's grandparents' cluster, and stands next to it rather than at the far edge

#### Scenario: Another root
- **WHEN** the same file is laid out around two different people
- **THEN** both layouts hold the same cards and each places its root's lineage in the first layer

#### Scenario: Pedigree collapse
- **WHEN** a person's mother and father descend from one pair of grandparents
- **THEN** the grandparents are one pair of cards, each reached by two paths and joined to both, as a convergence

#### Scenario: Cousins who marry
- **WHEN** two first cousins marry and have a child
- **THEN** the common grandparents are one pair of cards and no person is duplicated

#### Scenario: A person who is their own ancestor
- **WHEN** a file says a person is a descendant of a person who is a descendant of them
- **THEN** the layout finishes, every person is one card, and the cycle is reported with the layout

### Requirement: Generation comes from relationships, never from dates

The generation of a person SHALL be the one the file's relationships give them
and SHALL NOT be derived from a birth year. A person whose parents,
spouses and children give generations that disagree SHALL keep the generation
the relationships give them, and the link that disagrees SHALL be reported as
ambiguous; the engine SHALL NOT invent an order to resolve it. The engine
SHALL keep cards of a generation in one band and let a card leave it only by
the slack the caller allows, which is none unless asked for.

#### Scenario: Born later, a generation up
- **WHEN** an uncle is born after his nephew
- **THEN** he stands in his own generation, the nephew's parents' generation, and not in the nephew's

#### Scenario: An ambiguous link
- **WHEN** a file makes a child's generation equal to their parent's
- **THEN** the link is reported ambiguous, neither person is moved to hide it, and the layout finishes

### Requirement: The layout is optimised by weighted terms

The engine SHALL place clusters by an initial placement taken from the root and
the structure, and then improve it for at most a number of iterations the caller
gives and the time budget, keeping the best found, by minimising a sum of
weighted terms: the distance between related clusters, the crossings of lines, the
overlap of cards and clusters, a break in the order of generations, the
separation of the members of a family, and the movement from the initial
placement. The weights SHALL be given by the caller with defaults, and
no term SHALL reward a shorter line alone: of two layouts the one that crosses
fewer lines or overlaps fewer cards SHALL win over a shorter one. The result
SHALL carry each term at the start and at the end.

#### Scenario: Fewer crossings than the start
- **WHEN** a file whose initial placement crosses lines is laid out
- **THEN** the final crossings are no more than the initial, and fewer where a better order exists

#### Scenario: No overlap
- **WHEN** any file is laid out
- **THEN** no two cards overlap

#### Scenario: Compactness does not beat order
- **WHEN** the weight of distance is raised far above the others
- **THEN** the layout still keeps the order of generations and overlaps no cards

#### Scenario: Reasonable lines
- **WHEN** the generated large file is laid out
- **THEN** the mean horizontal distance from a family to its children is no greater than that of the initial placement

### Requirement: People are placed inside their clusters

Partners SHALL stand beside each other, a husband to the left of his wife, a
person with several spouses between two of them; the children of a family SHALL
stand together under it in an order that is the same wherever the family stands;
a family of many children SHALL take more room without moving another family
apart from its relatives; and no two cards SHALL overlap whatever the families'
sizes, which the engine SHALL take from the real size of each card.

#### Scenario: A large family
- **WHEN** a family with twelve children is laid out beside a family with one
- **THEN** the twelve stand together under their parents and the other family is not pushed further than the room the twelve need

#### Scenario: Cards of unequal size
- **WHEN** cards are given different widths
- **THEN** no two overlap and the gaps are measured from their real edges

### Requirement: The layout is deterministic and stable

The same input and options SHALL give the same layout, bit for bit, on every run
and whatever order equal-keyed people or families come in. The layout SHALL NOT
depend on any state of the view. Where the caller gives the positions of an
earlier layout, they SHALL pull the new one as a soft constraint, so that a small
change to the file moves few cards. Where the caller pins cards, they SHALL stay
where the earlier layout, or the initial placement, put them.

#### Scenario: The same twice
- **WHEN** a file is laid out twice with the same options
- **THEN** every card, node and line is at the same position both times

#### Scenario: Shuffled input
- **WHEN** the people and families of a file are given in another order
- **THEN** the layout places every card at the same position

#### Scenario: A small edit
- **WHEN** a file is laid out, one child is added to one family, and it is laid out again with the first layout as previous positions
- **THEN** the cards of other families have moved by no more than the room the new child needs

#### Scenario: A pinned card
- **WHEN** a card is pinned at its earlier position and the layout is run again
- **THEN** the card is at that position

### Requirement: The four directions

The layout SHALL be given in any of four directions: generations from top to
bottom, from bottom to top, from left to right, from right to left. A card's
width and height SHALL be exchanged along with the axes, and the order within a
generation, the crossings and the overlaps SHALL be the same in all four.

#### Scenario: Left to right
- **WHEN** a file is laid out from left to right
- **THEN** each generation is a column, the oldest at the left, and no two cards overlap

#### Scenario: The same order
- **WHEN** a file is laid out in each of the four directions
- **THEN** each generation holds the same people in the same order, read along its axis

### Requirement: The lines keep what the file says

Each line SHALL keep the family, the child, the parents and the kind of the link
it joins, as the file states them, and edge routing SHALL NOT change them. Lines
SHALL turn only between generations, run through no card of a family they do not
belong to, and the lines of one family SHALL share a trunk. Two lines between the
same people SHALL both be present.

#### Scenario: Adopted and birth
- **WHEN** a child has a birth family and an adoptive family
- **THEN** two lines reach the child, one of each kind, and neither runs through a card of an unrelated family

### Requirement: The result describes more than positions

The result SHALL carry, besides the positions, the clusters with their members
and link kinds, the connections between them — a branch point, a convergence
and a reference, which is a link to a person already placed that the layout
draws as a line and not as a second card — the layer of each card, and what the
engine reported about the file. It SHALL hold each person once. It SHALL be
usable without the browser: the engine SHALL NOT read the document or the view.

#### Scenario: Reference to a placed person
- **WHEN** a person has parents far from them in the layout
- **THEN** the result holds one card for them and a line to their parents, and a reference connection naming the person

#### Scenario: Whole identity
- **WHEN** any file is laid out
- **THEN** the cards are exactly the people given, each once
