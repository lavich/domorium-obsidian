## Purpose

How a reader changes a record from the tree of its card: a value typed or chosen in its field, a pointer pointed at another record, a line added from the menu of the line it goes under, a line removed. Every change is a change of the text of the open GEDCOM file, as the language service writes it; the file stays the source of truth.

## ADDED Requirements

### Requirement: A value is changed in its field

In the tree of a record, the value of a line that has one — a typed value of a row, the value of a node's own line — SHALL be a field the reader can change where it is. A field whose values the language service lists SHALL be a dropdown of those values, named in the reader's language, with the value the file holds added where it is not among them. A value SHALL be written when its field loses the focus or the reader presses Enter, except in a field the language service describes as holding several lines — the text of a note, a quoted text — where Enter starts a new line and the value is written when the field loses the focus. A dropdown SHALL write when a value is chosen. A value that has not changed SHALL write nothing. Escape SHALL put back the value the file holds, write nothing and keep the focus. An emptied field SHALL write nothing and say that the line is removed with its own control. The value `Y` of an event is not a field.

#### Scenario: A given name
- **WHEN** the reader types `Marie` in place of `Maria` in the opened name's Given names and presses Enter
- **THEN** the file states `2 GIVN Marie` and the row shows it

#### Scenario: A sex from the list
- **WHEN** the reader chooses `Male` in the dropdown of `1 SEX F`
- **THEN** the file states `1 SEX M`

#### Scenario: A note of several lines
- **WHEN** the reader types two lines into the field of a `NOTE` and leaves it
- **THEN** the file states the note with a `CONT` line, as the language service writes it

#### Scenario: Escape
- **WHEN** the reader types into a field and presses Escape
- **THEN** the field shows the value the file holds, the file is unchanged and the focus stays in the field

#### Scenario: Nothing changed
- **WHEN** the reader puts the focus in a field and leaves it without typing
- **THEN** the text of the file is as it was and Source's history has no new step

#### Scenario: An emptied field
- **WHEN** the reader empties the field of `2 GIVN Maria` and leaves it
- **THEN** the file is unchanged and the field says the line is removed with its own control

### Requirement: A pointer is pointed at another record

The value of a pointer line SHALL keep its link to the record it points at and SHALL offer a control that opens a searchable list of the records the language service offers for that line, the one it points at now marked. Choosing a record SHALL write the pointer. Where the language service refuses to write a pointer the standard pairs with one on the other record — a family of a person, a spouse or a child of a family — the reason SHALL be shown and nothing written.

#### Scenario: An associated person
- **WHEN** the reader opens the list on Marie's `1 ASSO @I2@` and chooses Pierre Curie
- **THEN** the file states the pointer to Pierre's record and the row links to him

#### Scenario: A pointer the standard pairs
- **WHEN** the reader chooses another family for Marie's `1 FAMS`
- **THEN** nothing is written and the row says that this link is changed on the family's record

### Requirement: A line is added from the menu of the line it goes under

Every line of the tree that may hold lines beneath it, the root included, SHALL offer a control that opens a menu of the fields the language service says may be added beneath it in the file's dialect, named in the reader's language, those the standard allows no more of shown and disabled. Choosing a field SHALL add it beneath that line at the place the language service gives it, and open the node it goes under so that it is in view:
- a field that holds no value, or only the value `Y` of an event, SHALL be written at once, as `Y` where it is an event that may state it, and its node opened with the focus on its own menu;
- a pointer SHALL open the list of the records it may point at, and be written when a record is chosen;
- a field whose values are listed SHALL be drawn as an unwritten row with its dropdown, written when a value is chosen;
- any other field SHALL be drawn as an unwritten row with an empty field that has the focus, written when the reader commits a value, and dropped, writing nothing, when the reader leaves it empty.
An unwritten row SHALL survive a redraw of the card until it is written or dropped.

#### Scenario: A nickname
- **WHEN** the reader chooses Nickname in the menu of Marie's opened name, types `Manya` and presses Enter
- **THEN** the file states `2 NICK Manya` beneath that name, where the language service puts it, and the row shows it

#### Scenario: A death
- **WHEN** the reader chooses Death in the menu of the root of a 7.0 person
- **THEN** the file states `1 DEAT Y`, and the death's node is open with the focus on its menu

#### Scenario: A source for a birth
- **WHEN** the reader chooses Source in the menu of Marie's birth and then a source in the list
- **THEN** the file states `2 SOUR` with that source's pointer beneath the birth

#### Scenario: A field left empty
- **WHEN** the reader chooses Surname in the menu of a name and leaves the empty field
- **THEN** the file is unchanged and the unwritten row is gone

#### Scenario: A field there may be only one of
- **WHEN** a person states `1 SEX F` and the reader opens the menu of the root
- **THEN** Sex is shown and disabled

### Requirement: A line is removed with its own control

A line the language service allows to go SHALL offer a control that removes it with every line beneath it, as one change; where lines beneath it go with it, the reader SHALL be asked once, told how many. A line the standard requires SHALL offer no such control.

#### Scenario: A plain line
- **WHEN** the reader removes `1 SEX F`
- **THEN** the line is gone from the file without a question

#### Scenario: A line with lines beneath it
- **WHEN** the reader removes Marie's birth, which states a date and a place
- **THEN** the card asks once, saying two lines go with it, and removes the three lines only on confirmation

### Requirement: A refused value is not written and says why

The card SHALL ask the language service to make each change and SHALL write nothing the service refuses. A refusal SHALL be shown under the field or the row it concerns, in the reader's language, chosen by its code, and the service's own message where the card has no words for the code; the field SHALL keep what the reader typed, and typing again SHALL clear the message. Warnings the service returns with a written change SHALL be shown the same way. A message SHALL be tied to its field for assistive technology and announced politely. A change refused because the text of the tab changed since the card was drawn SHALL redraw the card from the new text with the typed value kept and say that the file changed.

#### Scenario: An impossible date
- **WHEN** the reader writes `31 NOV 1867` as the date of a birth
- **THEN** nothing is written and the field says, in the reader's language, that November has 30 days

#### Scenario: A value outside the list
- **WHEN** the language service refuses a value for not being one of those it lists
- **THEN** nothing is written and the reason is under the field

#### Scenario: The file changed meanwhile
- **WHEN** the text of the tab changes between the card's drawing and the reader's commit
- **THEN** the typed value is not written over the new text, the card is drawn again with it kept, and says the file changed

### Requirement: Every change is one step of the file's history

Each written change SHALL be one change of the text of the open tab, saved as typed text is saved, and undone by one undo in Source. The card SHALL be redrawn from the new text at once, keeping the focus on the field or control the reader used, or, after a removal, on the control of the line above.

#### Scenario: Undo
- **WHEN** the reader changes a surname in the tree and then undoes once in Source
- **THEN** the file states the old surname and the tree shows it

### Requirement: Nothing is offered that cannot be written

Where the language service declines to describe a line — a file with no dialect it checked — the tree SHALL draw that record as it reads it, with no field to type in, no menu, no list and no removal, and SHALL say once, in the reader's language, why it cannot be edited. A field, a menu entry or a list SHALL NOT be offered for a change the language service cannot make.

#### Scenario: A file with no dialect
- **WHEN** the language service has no dialect for the file
- **THEN** the tree has no editing control and a line says the record cannot be edited here

### Requirement: Editing is reachable by the keyboard and by touch

Every field, menu, list and removal control of this capability SHALL be reached by the keyboard in the order it is drawn, named in the reader's language for its action and its row, and at least 44 pixels in each direction where the pointer is coarse or the app is the mobile one. A menu and a list SHALL be operated by the arrow keys, Enter and Escape.

#### Scenario: Adding by the keyboard
- **WHEN** the reader reaches the menu of Marie's name with Tab, opens it with Enter, moves with the arrow keys and chooses Nickname with Enter
- **THEN** the empty Nickname field has the focus

### Requirement: The words of editing are in both languages

Every word this capability adds — controls, refusal messages by code, the question before a removal, the notice that the file changed, the line that says a record cannot be edited — SHALL exist in each language the plugin ships.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian and a date is refused
- **THEN** the message under the field is in Russian
