## ADDED Requirements

### Requirement: A change of scope moves the cards

Choosing a person's **Branch**, choosing it again, and returning to the whole file
SHALL show the new scope by moving the cards that stand in both the old and the new
layout from where they stood to where they stand now, over the time and with the
easing of the glide of the view, while the view glides. Cards new to the picture
SHALL fade in and cards that leave it SHALL fade out where they stood and SHALL
NOT be reachable meanwhile. The lines and family nodes SHALL not be shown while the
cards move, and SHALL fade in as the cards arrive. A reader who asks for reduced
motion, and a picture in which more than 400 cards are drawn before or after the
change, SHALL see the change at once. Opening the graph, an edit of the file, the
search and the zoom SHALL NOT move cards, and nothing in the motion SHALL lay the
graph out again.

#### Scenario: Choosing Branch
- **WHEN** the reader chooses Irène's branch in the graph of `curie.ged`
- **THEN** the cards of her branch glide to their new places, the cards of the other seven people fade out where they stood, and the lines and family nodes appear once the cards have arrived

#### Scenario: Returning to the whole file
- **WHEN** the reader returns from a branch to the whole file
- **THEN** the cards of the branch glide to their places in the whole, the others fade in, and the lines return after them

#### Scenario: Reduced motion
- **WHEN** the reader's system asks for reduced motion and the reader chooses a branch
- **THEN** the new scope is shown at once, with no card moving or fading

#### Scenario: A large picture
- **WHEN** more than 400 cards would be drawn after the change of scope
- **THEN** the change is shown at once, and the choice does not wait on any motion

#### Scenario: A card that is leaving
- **WHEN** a card fades out during a change of scope
- **THEN** the reader cannot point at it, focus it or select it, and it is gone from the graph when the fade ends

#### Scenario: Opening is not a move
- **WHEN** the graph of a file is shown for the first time, or the file is edited
- **THEN** no card moves or fades
