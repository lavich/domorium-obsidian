## RENAMED Requirements

- FROM: `### Requirement: A card is a person, coloured by sex`
- TO: `### Requirement: A card is a person, coloured by surname`

## MODIFIED Requirements

### Requirement: A card is a person, coloured by surname

Each person the file declares with an identifier SHALL have a card showing,
from top to bottom, their portrait where they have one, their given names,
their surname and their years of life, written as the timeline of the file
writes them. The portrait SHALL be the picture, cut as its crop says, that the
person's card shows; a picture from the web SHALL be shown only where the
setting *Load images from the web*, or the reader's answer for this session,
allows it, as on the card. A card without a portrait, or whose portrait cannot
be shown, SHALL show none, and a name the record writes with no surname SHALL
stand on one line. A card's background SHALL be tinted by the person's whole surname, in the colour the timeline gives their bar: surnames that differ only in a gendered ending, or are one name in two scripts, SHALL be tinted almost alike, surnames with little in common far apart, and a card of a person with no surname SHALL be grey. The lines of the card SHALL be written in an ink that reads at 4.5:1 on its tint, in the light scheme and in the dark. A line
too long for its card SHALL be cut short, and the name given in full when the
pointer rests on the card. Far out, neither portraits nor text SHALL be drawn,
and only cards in or near the view SHALL load their portraits. The graph SHALL
NOT label generations.

#### Scenario: Marie's card
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Marie's card shows her portrait at its top, then `Marie`, then
  `Skłodowska-Curie`, then `1867–1934`, and is tinted by her surname, `Skłodowska-Curie`, and Pierre Curie's by his, `Curie`, in a different colour; a line wider than the card is cut with an ellipsis, so in a
  wide font her surname may be cut

#### Scenario: A card without a portrait
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Jacques's card has no portrait and begins with `Jacques` over
  `Curie`, and stands in the same row as Pierre Curie's, which has one

#### Scenario: No labels for generations
- **WHEN** the graph of `curie.ged` is shown
- **THEN** no generation is named or numbered anywhere in it

#### Scenario: Two spellings of one surname
- **WHEN** a file has `Лобанов` and `Лобанова`
- **THEN** their cards are tinted in hues that are almost the same, and `Сидорова`'s is far from them

#### Scenario: Readable in both schemes
- **WHEN** the graph of `curie.ged` is shown in the light scheme and then in the dark
- **THEN** the lines of every card read at 4.5:1 on its tint in both

#### Scenario: Without a surname
- **WHEN** a person's name states no surname
- **THEN** their card is grey
