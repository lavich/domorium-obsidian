## MODIFIED Requirements

### Requirement: Pointing at a person lights their family

Pointing at a person's card, or giving it the keyboard focus, SHALL light that
card, the cards of their parents, spouses and children, the lines between them
and those people, and the family nodes they belong to, and SHALL fade everything
else, until the pointer or the focus leaves. The pointer SHALL light a person
only once it has rested on them a moment, and put the light out only once it
has rested off them as long, so that a sweep across cards does not flicker; the
keyboard's focus and a touch SHALL light at once. Lighting and fading SHALL be
eased in over a moment, except where the reader's system asks for reduced
motion. Lighting SHALL NOT lay the graph out or draw it again.

Pointing at a family node, or giving it the keyboard focus, SHALL show its
spouses, the date of the marriage as the file writes it and its place, or that
it has no date, and how many children the family has.

#### Scenario: Pointing at Marie
- **WHEN** the reader points at Marie's card in the graph of `curie.ged`
- **THEN** the cards of Marie, Władysław, Bronisława Boguska, Pierre Curie, Irène
  and Ève are lit, with the lines from her parents' family to her and from her
  family with Pierre Curie to Irène and to Ève, and every other card fades

#### Scenario: Pointing at the Curies' family node
- **WHEN** the reader points at the node between Pierre Curie and Marie
- **THEN** it shows Pierre Curie + Marie Skłodowska-Curie, married
  `26 JUL 1895` in Sceaux, France, and 2 children
