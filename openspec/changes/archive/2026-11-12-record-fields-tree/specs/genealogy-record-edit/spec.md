## Purpose

How a reader changes a record from the tree of its card: a value typed or chosen in its field, a pointer pointed at another record, a line added from the menu of the line it goes under, a line removed. Every change is a change of the text of the open GEDCOM file, as the language service writes it; the file stays the source of truth.

## ADDED Requirements

### Requirement: A change lands on the line the reader saw

Every change SHALL be made on the line the card drew, against the text the card was drawn from. Where the text of the tab has changed since — a write of the card's own not yet redrawn, the file changed on disk, an edit in Source, a question still open — the language service's refusal SHALL be shown, nothing SHALL be written, and the card SHALL be drawn again from the new text with what the reader typed kept, saying that the file changed. After every change it writes, the card SHALL be drawn again from the new text at once.

#### Scenario: Two presses on removal
- **WHEN** the reader presses the removal control of a line twice before the card is drawn again
- **THEN** that one line is removed and no other

#### Scenario: The file changed while a question was open
- **WHEN** the card asks whether to remove a line with lines beneath it and, before the reader confirms, the file changes above it
- **THEN** confirming removes nothing, and the card is drawn again from the new text and says the file changed

#### Scenario: The file changed meanwhile
- **WHEN** the text of the tab changes between the card's drawing and the reader's commit of a value
- **THEN** the typed value is not written over the new text, the card is drawn again with it kept, and says the file changed

### Requirement: A value is changed in its field

In the tree of a record, the value of a line that has one SHALL be a field the reader can change where it is. While a field has the focus it SHALL hold the value as the file writes it — a name with the slashes around its surname, a value in the standard's words where the language service lists no values for it — and once it loses the focus it SHALL read in the reader's words again. A field whose values the language service lists SHALL be a dropdown of those values, named in the reader's language, with the value the file holds added where it is not among them; a field the standard lets hold several of the listed values SHALL be a menu in which each is checked or not. A value SHALL be written when its field loses the focus or the reader presses Enter outside the composition of a character, except where the language service says a line break is the ordinary case of the value, where Enter starts a new line and the value is written when the field loses the focus; a line break the standard does not allow in a value is refused as any refused value is. A dropdown and a checked menu SHALL write when a value is chosen. A value equal to the one last written SHALL write nothing. Escape SHALL put back the value the file holds, write nothing and keep the focus; where there is no Escape key, a control beside a changed field SHALL do the same. An emptied field SHALL be written as the language service writes it, and refused where the standard requires a value. A long note SHALL unfold into its field when the reader puts the focus in it. The text a shared note shows where it is pointed at belongs to that note's own record and SHALL NOT be a field. The value `Y` of an event is not a field. A pending value SHALL be committed before any other control of the tree acts.

#### Scenario: A given name
- **WHEN** the reader types `Marie` in place of `Maria` in the opened name's Given names and presses Enter
- **THEN** the file states `2 GIVN Marie` and the row shows it

#### Scenario: A name keeps its surname
- **WHEN** the reader puts the focus in the field of `1 NAME Maria /Curie/`, which reads `Maria Curie`, and leaves it without typing
- **THEN** the field held `Maria /Curie/` while it had the focus, and the file is unchanged

#### Scenario: A sex in 5.5.1
- **WHEN** a 5.5.1 file states `1 SEX F` and the reader puts the focus in its field
- **THEN** the field holds `F`, and leaving it without typing writes nothing

#### Scenario: A sex from the list
- **WHEN** the reader chooses `Male` in the dropdown of a 7.0 `1 SEX F`
- **THEN** the file states `1 SEX M`

#### Scenario: A note of several lines
- **WHEN** the reader types two lines into the field of a `NOTE` and leaves it
- **THEN** the file states the note with a `CONT` line, as the language service writes it

#### Scenario: A line break in a date
- **WHEN** the reader pastes `1 JAN` and `1900` on two lines into the field of a `DATE`
- **THEN** nothing is written, the field keeps what was pasted, and the reason is shown under it

#### Scenario: Escape
- **WHEN** the reader types into a field and presses Escape
- **THEN** the field shows the value the file holds, the file is unchanged and the focus stays in the field

#### Scenario: Nothing changed
- **WHEN** the reader puts the focus in a field and leaves it without typing
- **THEN** the text of the file is as it was and Source's history has no new step

#### Scenario: Enter then leaving
- **WHEN** the reader changes a value, presses Enter, and then moves the focus away
- **THEN** the file has changed once and Source's history has one new step

#### Scenario: Composing a character
- **WHEN** the reader confirms a composed character with Enter while typing in an input method
- **THEN** nothing is written until the reader presses Enter again or leaves the field

### Requirement: A pointer is pointed at another record

The value of a pointer line SHALL keep its link to the record it points at and, where the language service offers records for it, SHALL offer a control that opens a searchable list of them, the one it points at now marked. Choosing a record SHALL write the pointer. A pointer the standard pairs with one on the other record — a family of a person, a spouse or a child of a family — SHALL offer no list and SHALL say that the link is changed on the other record.

#### Scenario: An associated person
- **WHEN** the reader opens the list on Marie's `1 ASSO @I2@` and chooses Pierre Curie
- **THEN** the file states the pointer to Pierre's record and the row links to him

#### Scenario: A pointer the standard pairs
- **WHEN** the card shows Marie's `1 FAMS`
- **THEN** its row has no list of families and says that the link is changed on the family's record

### Requirement: A line is added from the menu of the line it goes under

Every line of the tree that the language service describes as able to hold lines beneath it, the root included, SHALL offer a control that opens a menu of the fields that may be added beneath it in the file's dialect, named in the reader's language. A field the standard allows no more of, a pointer with no record to point at, and a pointer the standard pairs SHALL be shown and disabled. A field that may be either a text or a pointer SHALL be offered twice, as a text and as a record. Choosing a field SHALL add it beneath that line at the place the language service gives it, and open the node it goes under so that it is in view:
- a field that holds no value, or an event that may state only `Y`, SHALL be written at once, an event as `Y`, and its node opened with the focus on its own menu;
- a pointer SHALL open the list of the records it may point at, and be written when a record is chosen;
- any other field SHALL be drawn as an **unwritten row** under that line — with its dropdown, its menu of checked values or its empty field, which has the focus, and with an empty field for each line the standard requires beneath it — and be written, with those lines, once the reader has given every one of them a value the language service accepts; left with nothing in it, it SHALL be dropped and write nothing.
An unwritten row SHALL belong to the line it was added under and SHALL survive a redraw of the card while that line is in the file; when that line is gone, the row SHALL be dropped.

#### Scenario: A nickname
- **WHEN** the reader chooses Nickname in the menu of Marie's opened name, types `Manya` and presses Enter
- **THEN** the file states `2 NICK Manya` beneath that name, where the language service puts it, and the row shows it

#### Scenario: A death
- **WHEN** the reader chooses Death in the menu of the root of a 7.0 person
- **THEN** the file states `1 DEAT Y`, and the death's node is open with the focus on its menu

#### Scenario: A source for a birth
- **WHEN** the reader chooses Source in the menu of Marie's birth and then a source in the list
- **THEN** the file states `2 SOUR` with that source's pointer beneath the birth

#### Scenario: An associated person needs a role
- **WHEN** the reader chooses Associated person in the menu of the root of a 7.0 person, picks Pierre Curie and gives the role `Friend`
- **THEN** the file states `1 ASSO` pointing at Pierre with `2 ROLE FRIEND` beneath it, written together once the role is given

#### Scenario: A field left empty
- **WHEN** the reader chooses Surname in the menu of a name and leaves the empty field
- **THEN** the file is unchanged and the unwritten row is gone

#### Scenario: A field there may be only one of
- **WHEN** a person states `1 SEX F` and the reader opens the menu of the root
- **THEN** Sex is shown and disabled

#### Scenario: A note in 5.5.1
- **WHEN** the reader opens the menu of a 5.5.1 person's root
- **THEN** Note is offered as a text and as a record

#### Scenario: A record with nothing beneath it
- **WHEN** a person's record is `0 @I3@ INDI` and nothing else
- **THEN** the tree shows the root with its menu, and a first line can be added

### Requirement: A line is removed with its own control

A line the language service allows to go SHALL offer a control that removes it with every line beneath it, as one change; where lines beneath it go with it, the reader SHALL be asked once, told how many. A line the standard requires SHALL offer no such control. After a removal the focus SHALL go to the menu of the line it was under.

#### Scenario: A plain line
- **WHEN** the reader removes `1 SEX F`
- **THEN** the line is gone from the file without a question and the focus is on the root's menu

#### Scenario: A line with lines beneath it
- **WHEN** the reader removes Marie's birth, which states a date and a place
- **THEN** the card asks once, saying two lines go with it, and removes the three lines only on confirmation

#### Scenario: Removing the first of two names
- **WHEN** the reader removes the first of two names with the keyboard
- **THEN** the focus is on the root's menu, not on the removal control of the name that is now first

### Requirement: A refused value is not written and says why

The card SHALL ask the language service to make each change and SHALL write nothing the service refuses. A refusal SHALL be shown under the field or the row it concerns, in the reader's language, chosen by its code, and the service's own message where the card has no words for the code; the field SHALL keep what the reader typed, and typing again SHALL clear the message. Warnings the service returns with a written change SHALL be shown the same way. A message SHALL be tied to its field for assistive technology and announced politely.

#### Scenario: An impossible date
- **WHEN** the reader writes `31 NOV 1867` as the date of a birth
- **THEN** nothing is written and the field says, in the reader's language, that November has 30 days

#### Scenario: A value outside the list
- **WHEN** the language service refuses a value for not being one of those it lists
- **THEN** nothing is written and the reason is under the field

### Requirement: Every change is one step of the file's history

Each written change SHALL be one change of the text of the open tab, saved as typed text is saved, and undone by one undo in Source. The focus SHALL stay on the field or control the reader used, except where a requirement above says where it goes.

#### Scenario: Undo
- **WHEN** the reader changes a surname in the tree and then undoes once in Source
- **THEN** the file states the old surname and the tree shows it

### Requirement: Nothing is offered that cannot be written

Where the language service declines to describe a record — a file with no dialect it checked — the tree SHALL draw that record as it reads it, with no field to type in, no menu, no list and no removal, and SHALL say once, in the reader's language, why it cannot be edited. A line of the file's own, which the service does not describe, SHALL keep a field for its value and its removal and SHALL offer no menu. A field, a menu entry or a list SHALL NOT be offered for a change the language service cannot make.

#### Scenario: A file with no dialect
- **WHEN** the language service has no dialect for the file
- **THEN** the tree has no editing control and a line says the record cannot be edited here

#### Scenario: A custom line
- **WHEN** a record states `1 _MILITARY Cavalry`
- **THEN** its value can be changed and the line removed, and it has no menu

### Requirement: Editing is reachable by the keyboard and by touch

Every field, menu, list and removal control of this capability SHALL be reached by the keyboard in the order it is drawn, named in the reader's language for its action and its row, and at least 44 pixels in each direction where the pointer is coarse or the app is the mobile one. A menu opened from the keyboard SHALL open at its control. A menu and a list SHALL be operated by the arrow keys, Enter and Escape.

#### Scenario: Adding by the keyboard
- **WHEN** the reader reaches the menu of Marie's name with Tab, opens it with Enter, moves with the arrow keys and chooses Nickname with Enter
- **THEN** the menu opened at the control, and the empty Nickname field has the focus

#### Scenario: A phone
- **WHEN** the reader changes a value on a phone and then presses the removal control of another line
- **THEN** the changed value is written first, and the other line is removed

### Requirement: The words of editing are in both languages

Every word this capability adds — controls, refusal messages by code, the question before a removal, the notice that the file changed, the line that says a record cannot be edited, the reason a paired pointer is changed elsewhere — SHALL exist in each language the plugin ships.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian and a date is refused
- **THEN** the message under the field is in Russian
