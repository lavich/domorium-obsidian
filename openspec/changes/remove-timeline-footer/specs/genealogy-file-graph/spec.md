## MODIFIED Requirements

### Requirement: Finding a person

The graph SHALL offer a search by name that fades the cards that do not match.
The search SHALL be an icon floating over the canvas, away from the zoom
buttons, that is replaced by a field when it is pressed, the icon fading away as the
field grows and taking no place beside it, and the field SHALL take the focus; the
graph SHALL NOT have a toolbar for it. The field SHALL have a cross that
erases the text and leaves the field open. Escape, and the cross of an empty
field, SHALL close the field back to the icon, as SHALL leaving it empty; a
field with text SHALL stay open and keep its matches faded.

The open field SHALL show how many cards match — «4 matches», or «No results»
where none does — and, once the reader has stepped, which match the view is on,
as «3 / 4». Two buttons beside it, previous and next, and Enter and Shift+Enter
in the field, SHALL move the view to the previous and the next match, in the
order of the rows from top to bottom and of the cards from left to right: the
first step forward goes to the first match and the first step back to the last,
and each step past either end comes round to the other. The view SHALL centre on
the card at a readable zoom, and the card SHALL carry a ring of its own, unlike
that of the light of pointing, while the other matches stay lit and the rest
faded. The buttons SHALL be disabled where nothing matches, and pressing one
with a mouse or a key SHALL leave the focus in the field.

#### Scenario: Searching
- **WHEN** the reader types `joliot` in the graph of `curie.ged`
- **THEN** the cards of Frédéric, Irène, Hélène and Pierre Joliot stand out and
  the others fade

#### Scenario: Going from match to match
- **WHEN** the reader has typed `joliot` and presses Enter three times
- **THEN** the view moves to Frédéric's card, then to Irène's, then to Hélène's

#### Scenario: Counting the matches
- **WHEN** the reader types `joliot`, and then presses the next button
- **THEN** the counter reads `4 matches`, and then `1 / 4` with Frédéric's card
  centred and ringed

#### Scenario: Going back past the first match
- **WHEN** the view is on the first of the four matches and the reader presses
  the previous button
- **THEN** the view is on Pierre Joliot's card and the counter reads `4 / 4`

#### Scenario: Coming round after the last match
- **WHEN** the view is on the last of the four matches and the reader presses
  Enter
- **THEN** the view is on Frédéric's card and the counter reads `1 / 4`

#### Scenario: No results
- **WHEN** the reader types `zzz`
- **THEN** the counter reads `No results`, both buttons are disabled and no
  card is ringed

#### Scenario: Opening the search
- **WHEN** the reader presses the search icon in the graph of `curie.ged`
- **THEN** the icon is replaced by a field that has the focus, no search icon
  is left beside it, and the toolbar band above the canvas does not exist

#### Scenario: Clearing the search
- **WHEN** the reader has typed `joliot` and presses the cross
- **THEN** the field is empty and stays open, and no card is faded

#### Scenario: Closing the search
- **WHEN** the field is empty and the reader presses Escape
- **THEN** the field closes back to the icon, which has the focus

### Requirement: The graph on a phone

On a phone the graph SHALL fill the screen's width, with no title or summary above the
canvas, as the timeline of the file has none; the search icon SHALL be at least 44
pixels square. The graph SHALL show no legend. Dragging with
one finger SHALL move it and pinching with two SHALL zoom it; neither SHALL
activate what it began on. Touching a card SHALL light that person and their
family as pointing does and offer their **Branch**; touching it again SHALL show
the person as activating does on a desktop. Touching a family node SHALL show
its details, with the way to the family's page. Touching empty space SHALL put
the light out.

#### Scenario: Touching Marie's card
- **WHEN** the reader touches Marie's card on a phone, and then touches it again
- **THEN** her family is lit, and then her page is shown

#### Scenario: Pinching
- **WHEN** the reader pinches the graph on a phone, beginning with a finger on a
  card
- **THEN** it zooms around the point between the two fingers, the card's person
  is not opened, and no page of the app scrolls or zooms with it
