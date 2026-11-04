## MODIFIED Requirements

### Requirement: The tree

The tree SHALL show the person in focus with, above, their parents and their
parents' parents, and the parents of their first spouse; beside them, their
spouses and their siblings and the first spouse's siblings; below, their
children with each child's spouse, and their grandchildren. More than one
sibling SHALL be shown as one box saying how many, which shows them one by one
when activated. A husband SHALL stand to the left of his wife, and each side's
parents and siblings SHALL tend to stand on that side. A person married more
than once SHALL stand between their first two spouses with the first spouse to
the left, so that each marriage's children sit beneath it.

Each box SHALL be a card drawn as the graph of the file draws it — coloured by
sex, pink for a woman, blue for a man, grey where no sex is stated, from the
theme; showing the person's portrait at its top where they have one, their given
names, their surname and their years. It SHALL mark the person in focus, mark a person
whose record cites no source at all, and mark a person with parents above, or
children below, that the tree does not reach. Each couple SHALL be joined
through a family node between them showing the year of the marriage, hollow
where no marriage is dated; activating the node SHALL show that family's page.
Curved lines SHALL lead from each family node, or a single parent's card, to
each child, turning only between rows. No two boxes SHALL overlap, however wide
a family is. The tree SHALL fill the space under the page's heading and tabs,
with nothing on the page to scroll to and no legend, and SHALL open fitted to
that space; only where the whole tree would then be too small to read SHALL it
open at a readable size with the person in focus in view. It SHALL be moved and
zoomed as the graph of the file is, with the same buttons floating over it.

Pointing at a person, or giving them the keyboard focus, SHALL light them and
their parents, spouses and children in the tree, and the lines between them.
Every card and family node SHALL be reachable with the keyboard and activated
with Enter or Space; on a phone a first touch SHALL light a person and a second
activate them.

Activating a person SHALL make them the focus.

The tree SHALL offer the search of the graph of the file, floating over its
canvas away from the zoom buttons: an icon that is replaced by a field when it is
pressed, with a cross, a counter of the matches, previous and next buttons, and
Enter and Shift+Enter to step. A search SHALL read the names of the people drawn,
all the names of a person who stands twice lighting each of their cards, and the
names of every sibling in a box of siblings, which a match SHALL light without
opening it, stepping reaching the box like any card. Matching cards SHALL stay lit
and the rest fade, the current match carries a ring and the view glides to it as it
does in the graph of the file, and the buttons are at least 44 pixels square on a
phone. The tree SHALL have no other toolbar. Its buttons SHALL show Obsidian's
tooltip only, not the system's, placed so that it does not cover the buttons
beside it.

#### Scenario: Marie's tree
- **WHEN** Marie's tree is shown
- **THEN** her parents and Pierre's parents are above, four siblings are one
  box beside her with Pierre and his brother Jacques, Irène and Ève are below
  with their husbands, and Hélène and Pierre Joliot below Irène

#### Scenario: A wide family
- **WHEN** a person has twelve children with eight children each
- **THEN** all ninety-six grandchildren are shown and no boxes overlap

#### Scenario: Moving the focus
- **WHEN** the reader activates Pierre Curie in Marie's tree
- **THEN** the tree shows Pierre Curie in focus

#### Scenario: Colours and sides
- **WHEN** Marie's tree is shown
- **THEN** Marie's card is marked pink and Pierre Curie's blue, in the theme's
  colours; Pierre Curie stands to her left with a node showing `’95` between
  them; Jacques and Pierre's parents stand on his side, and her siblings' box
  and her parents on hers

#### Scenario: Opening the Tree tab
- **WHEN** the reader chooses the Tree tab on Marie's page at a desktop's width
- **THEN** the page does not scroll, the tree fills the space under the tabs
  with all of Marie's tree in view, and no legend is shown

#### Scenario: Opening the Tree tab on a phone
- **WHEN** the reader chooses the Tree tab on Marie's page on a phone
- **THEN** the page does not scroll, and the tree fills the space under the
  tabs with Marie's card in view and readable

#### Scenario: Portraits and names in the tree
- **WHEN** Marie's tree is shown
- **THEN** her card shows her portrait over `Marie` over `Skłodowska-Curie`
  (a line wider than the card is cut with an ellipsis, so in a wide font her
  surname may be cut), Pierre Curie's and Irène's show theirs, and Jacques's
  shows none

#### Scenario: A person who stands twice
- **WHEN** a person stands twice in a tree, as a cousin marriage makes, and the
  reader points at one of them
- **THEN** both are lit

#### Scenario: A family node
- **WHEN** the reader activates the node between Pierre Curie and Marie in her
  tree
- **THEN** the Curies' family page is shown

#### Scenario: Married twice
- **WHEN** Anna married Bert and then Carl, with a child of each
- **THEN** Bert stands to her left and Carl to her right, and each child stands
  beneath their own parents

#### Scenario: Searching Marie's tree
- **WHEN** the reader types `joliot` in the search of Marie's tree
- **THEN** the counter reads `4 matches` and the cards of Frédéric, Irène, Hélène
  and Pierre Joliot stand out while the others fade

#### Scenario: Stepping through the tree
- **WHEN** the reader presses the next button four times, and then once more
- **THEN** the current card is Frédéric's, Irène's, Hélène's and Pierre's, each
  ringed and glided to, and then Frédéric's again

#### Scenario: A box of siblings
- **WHEN** the reader types the name of one of Marie's sisters, who stands in the
  box of siblings
- **THEN** the box is lit and not opened, and the counter reads `1 match`
