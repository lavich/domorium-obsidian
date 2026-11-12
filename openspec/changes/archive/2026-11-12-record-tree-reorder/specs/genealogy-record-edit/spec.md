## ADDED Requirements

### Requirement: A line is moved among its siblings by dragging its grip

In the tree of a record the card writes, every line that has a tag and at least one sibling with a tag — another line beneath the same line — SHALL carry a **grip**: the six-dot icon the app uses for reordering, as the last control of the group that holds the line's removal and add controls, at the end of its row, shown with them while the pointer is over the row or the group has the focus, and always shown, at least 44 pixels in each direction, where the pointer is coarse or the app is the mobile one. The root of the tree, an unwritten row, a line with no sibling, a line written as a level with no tag, a line beneath such a line, a line of a shared note drawn where its pointer is, and every line of a card that does not write SHALL carry no grip.

Dragging the grip SHALL work the same with a mouse, a pen and a finger. A press that moves less than 5 pixels SHALL NOT start a drag and SHALL do nothing. Once the drag starts, a copy of the row SHALL follow the pointer, the line's place in the tree, the lines beneath it included, SHALL be marked as the app marks a dragged item's place, and no row SHALL be painted as under the pointer. A line in the accent colour SHALL show where the line would go, only at a place among its own siblings that changes the order: before a sibling, or after the last one. The lines nested beneath a sibling SHALL NOT be places: over them the line shows the place after that sibling. Over the line's own place, over the place right after it, and anywhere outside the band its siblings take, no line SHALL be shown. Releasing where a line is shown SHALL move the line, with every line beneath it and its continuation lines, to that place, as the language service writes it; releasing where none is shown, pressing Escape, or the system cancelling the pointer SHALL end the drag and write nothing. While the pointer is near the top or the bottom edge of the card, the card SHALL scroll in that direction. On touch the drag SHALL start as soon as the finger pulls the grip, without holding it first; a finger anywhere else on the row SHALL scroll the card as before, and dragging the grip SHALL NOT open, close or switch the side panels. A press on the grip SHALL NOT move the focus or select text, so a field that has the focus keeps it, an empty unwritten row among them. Where a value is being typed, a press on the grip SHALL first write it, as a press on any other control does, and SHALL start no drag, whether the value was written or refused; the reader drags again. A drag in progress SHALL end without writing when the card is drawn again. After a drop that writes, the focus SHALL stay where it was, no focus ring SHALL be drawn on the grip, the grip of the line that moved SHALL be brought into view, and the line's new place SHALL be announced politely, as its place among its siblings and their number, a line with no tag not counted. The grip SHALL be a handle for the pointer alone: it SHALL NOT be reached by the keyboard, SHALL be hidden from assistive technology, and its tooltip SHALL say, in the reader's language, that dragging it moves the line of its row. No key SHALL move a line.

#### Scenario: The birth name made the preferred one
- **WHEN** the reader drags the grip of Marie's second name, `Maria Salomea Skłodowska`, up until the line shows before her first name, and lets go
- **THEN** the file writes `1 NAME Maria Salomea /Skłodowska/` with `2 TYPE BIRTH` beneath it before `1 NAME Marie /Skłodowska-Curie/` with its given name and surname, and no other line has changed

#### Scenario: Its new place said
- **WHEN** the reader drags the grip of Marie's sex up until the line shows before her second name, and lets go
- **THEN** the file writes `1 SEX F` before `1 NAME Maria Salomea /Skłodowska/`, *Sex moved to place 2 of 14* is announced, and the focus is not on the grip

#### Scenario: No keys
- **WHEN** the reader presses Alt+↑ on the row of Marie's sex, or Tab through her tree
- **THEN** nothing is written, and the focus never lands on a grip

#### Scenario: Named for its row
- **WHEN** the plugin's language is Russian and the pointer rests on the grip of Marie's birth
- **THEN** its tooltip says, in Russian, that dragging it moves the birth

#### Scenario: Only among the siblings
- **WHEN** the reader drags the grip of Marie's occupation over the date and the place nested beneath her opened birth
- **THEN** the line shows after the birth, never between its date and its place, and letting go there writes the occupation after the birth's place and before her death

#### Scenario: Nowhere to go
- **WHEN** the reader drags the grip of Marie's sex over its own row, and then over the root's row
- **THEN** no line is shown, and letting go writes nothing

#### Scenario: A press is not a drag
- **WHEN** the reader clicks the grip of Marie's sex, or taps it on a phone
- **THEN** nothing is written, no node opens or closes, and no menu opens

#### Scenario: Escape
- **WHEN** the reader is dragging the grip of Marie's death and presses Escape
- **THEN** the copy and the line are gone, the death is where it was, and the file is unchanged

#### Scenario: A finger on a phone
- **WHEN** on a phone the reader pulls the grip of Marie's occupation up past her birth and lifts the finger
- **THEN** the occupation is written before the birth, the side panels stayed as they were, and a finger dragged on the occupation's label instead scrolls the card

#### Scenario: A long record
- **WHEN** the card holds more lines than fit and the reader drags a grip to the bottom edge of the card
- **THEN** the card scrolls down while the pointer stays there, and the line follows the places now in view

#### Scenario: No grip where nothing can move
- **WHEN** the card shows Marie's opened birth, whose lines are its date and its place, and her opened second name, whose only line is its type
- **THEN** the date and the place each carry a grip, the type carries none, and the root carries none

#### Scenario: A value being typed
- **WHEN** the reader has typed `31 NOV 1867` into the date of Marie's birth and presses the grip of her death
- **THEN** the date is refused and says why under its field, which keeps the focus, and no drag starts

#### Scenario: A card that does not write
- **WHEN** the language service has no dialect for the file
- **THEN** no row of the tree carries a grip

### Requirement: A move is one change, or is refused and says why

A move SHALL be asked of the language service against the text the card was drawn from, and SHALL be written as one change of the text of the open tab, which one undo in Source takes back. The places a drag shows SHALL be those the language service gives for the line at the start of the drag, from the same text. A move the service refuses SHALL write nothing and SHALL say why under the row of the line, in the reader's language, tied to its grip and announced politely — a move that would change how the file is read, in the header or among lines written at a wrong level, for one; the message SHALL stay until the card is next drawn. Where the text of the tab changed since the card was drawn, the move SHALL be refused, the app SHALL say so in a notice as it does for every other edit refused for that reason, and the card SHALL be drawn again from the new text, as any change is. After a move the card SHALL be drawn again at once, and every choice of the reader kept for the record — a node opened, a note unfolded, a value typed and not written, a message, an unwritten row — SHALL follow the line that moved and its siblings to their new places, not stay with the old ones.

#### Scenario: Undo
- **WHEN** the reader moves Marie's death before her birth and then undoes once in Source
- **THEN** the file writes the birth before the death again and the tree shows it

#### Scenario: A move that changes how the file is read
- **WHEN** a birth states `3 DATE 1900` and then `2 PLAC x`, and the reader moves the place before the date
- **THEN** nothing is written, and the row of the place says, in the reader's language, that the move would change how the file is read

#### Scenario: The file changed during a drag
- **WHEN** the reader is dragging a grip and the file changes on disk
- **THEN** the drag ends, nothing is written by it, and the card is drawn from the new text

#### Scenario: Russian
- **WHEN** the plugin's language is Russian and a move is refused because it would change how the file is read
- **THEN** the message under the row is in Russian, and each key the move uses exists in both catalogues
