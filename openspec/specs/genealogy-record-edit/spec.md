# genealogy-record-edit Specification

## Purpose
How a reader changes a record from the tree of its card: a value typed or chosen in its field, a pointer pointed at another record, a line added from the menu of the line it goes under, a line removed, a line moved among its siblings by dragging its grip. Every change is a change of the text of the open GEDCOM file, as the language service writes it; the file stays the source of truth.

## Requirements

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

### Requirement: Every card that draws a tree edits, the header's included

Every card that draws a tree — a person, a family, a source, a multimedia record, a shared
note, a repository, a submitter, a 5.5.1 submission record, a record of the file's own and
the header of the file — SHALL edit as the requirements of this capability say, within what
the language service describes and accepts. The header SHALL be no exception: a change the
service refuses there — a change of the GEDCOM version, the removal of `GEDC` or of a 5.5.1
`CHAR` — SHALL be refused and say why as any refusal does, and the plugin SHALL add no rule of
its own to the service's. The value a record's own opening line carries — the text of a
shared note, 7.0 `SNOTE` or 5.5.1 `NOTE` with its `CONC` and `CONT` lines, the value of a
record of the file's own — SHALL be a field of the root of its tree, written on the opening
line as any value is, its continuation lines written by the language service and the lines
beneath it kept. A record that holds no value by the standard on its opening line — a
person, a family, a source, a multimedia record, a repository, a submitter, the header —
SHALL show no value field on its root.

#### Scenario: The header's card
- **WHEN** the card shows the header of `curie.ged` and the reader types `7.1` in the field
  of its GEDCOM version
- **THEN** nothing is written and the field says, in the reader's language, why the standard
  does not allow it, and the header's pointer to the submitter is still a link that selects
  the submitter

#### Scenario: A copyright in the header
- **WHEN** the card shows the header of `curie.ged` and the reader chooses Copyright in the
  menu of its root and types `Domorium`
- **THEN** the file states `1 COPR Domorium` beneath `0 HEAD`

#### Scenario: A repository's card
- **WHEN** the card shows `State Archive in Warsaw` and the reader adds a phone number from
  the menu of its root
- **THEN** the file states the phone number beneath `0 @R2@ REPO`

#### Scenario: No value on a record that holds none
- **WHEN** the card shows the repository `@R2@`, Marie, the family photograph or the header
- **THEN** the root of the tree has no value field

#### Scenario: A note record of 5.5.1 continued
- **WHEN** a 5.5.1 file declares `0 @N1@ NOTE` with `1 CONC` and `1 CONT` lines and a `1 SOUR @S1@`, and the reader replaces its text in the root's field
- **THEN** the file states the new text on `0 @N1@ NOTE` with the continuation lines the language service writes, and `1 SOUR @S1@` is still beneath it

#### Scenario: A shared note's card
- **WHEN** the card shows the note `@N2@` and the reader changes its text in the root's field
- **THEN** the file states the new text on `0 @N2@ SNOTE`, its second line as a `CONT`

### Requirement: The file of a medium is chosen from the vault or uploaded from the device

Where the card writes, pressing the file of a medium in its row — the `FILE` of a multimedia
record, or of an `OBJE` a 5.5.1 record writes inline — SHALL open a menu at it with two
choices, named in the reader's language: **Choose from the vault** and **Upload from
device**. Nothing SHALL be written, copied or created before the reader has made a choice in
it and chosen a file.

- *Choose from the vault* SHALL open a searchable list of every file of the vault but GEDCOM
  files, the images first and then the rest, the file the line names now marked. Choosing
  one SHALL write its path to the line, as the dialect spells a path relative to the GEDCOM
  file. Nothing SHALL be copied.
- *Upload from device* SHALL open the device's own picker of files, in the desktop app and in
  the mobile one. The chosen file SHALL be copied into the vault — into the folder of the file
  the line names now where that file is in the vault, otherwise into a folder `Media` beside
  the GEDCOM file, made where it is missing — under its own name, with a number added before
  its extension where the name is taken (`photo 1.jpg`, then `photo 2.jpg`), and the copy's
  path SHALL be written to the line as for a file of the vault.

The path SHALL be written only where it reads back as the file chosen: a GEDCOM 7 file names
only files in its own folder or beneath it, and a file it cannot name SHALL be refused, with
nothing written or copied. Where the line states a format beneath it (`FORM`), the same change
SHALL write the new file's format in the dialect's form — in GEDCOM 7 a media type such as
`image/jpeg`, in 5.5.1 an extension such as `jpg` — as one step of the file's history with the
path; where it states none, none SHALL be added. A path or a format the language service
refuses SHALL write nothing, copy nothing, and say why under the row. A copy SHALL be made
only on the reader's choice; once made it SHALL never be removed by the plugin, and where the
line is then not written — the text changed while the file was copied — the message under
the row SHALL say where the copy is and why the line was not changed. The menu, the list and
the picker SHALL be reached by the keyboard, and the file of a medium SHALL be at least 44
pixels in each direction on touch. Where the card does not write, pressing the file SHALL
open it, where it is in the vault.

#### Scenario: Another picture from the vault
- **WHEN** the card shows the family photograph and the reader presses its picture, chooses
  *Choose from the vault* and then `Media/pierre-curie.svg`
- **THEN** the file states `1 FILE Media/pierre-curie.svg` in `@O5@`, its `2 FORM` still
  `image/svg+xml`, and the row draws that picture

#### Scenario: A photograph from the phone
- **WHEN** the card shows the family photograph and the reader chooses *Upload from device*
  and a file `photo.png` on the device
- **THEN** the vault holds `Media/photo.png`, a copy of it, and the file states
  `1 FILE Media/photo.png` with `2 FORM image/png` beneath it, written as one change

#### Scenario: A name already taken
- **WHEN** the reader uploads `photo.png` and the folder already holds `photo.png` and
  `photo 1.png`
- **THEN** the copy is `photo 2.png`, and nothing in the vault is overwritten

#### Scenario: A file not in the vault
- **WHEN** the card shows `A plate nobody can find`, whose file is not in the vault, and the
  reader uploads `plate.jpg`
- **THEN** the copy is `Media/plate.jpg`, beside `curie.ged`, and the file states that path
  with `2 FORM image/jpeg`

#### Scenario: A file a GEDCOM 7 file cannot name
- **WHEN** a 7.0 file in the folder `trees` names a medium and the reader chooses
  `Media/photo.jpg`, outside that folder, from the vault
- **THEN** nothing is written and the row says that the file can name only files in its own
  folder or beneath it

#### Scenario: A format the standard does not list
- **WHEN** a 5.5.1 multimedia record states `2 FORM jpg` and the reader chooses a `.png` file
  from the vault
- **THEN** the file states the new path with `2 FORM png`, and the row shows the language
  service's warning that the value is read as a file extension

#### Scenario: A format that is no extension
- **WHEN** a 5.5.1 multimedia record states `2 FORM jpg` and the reader uploads a file named
  `photo.xyz`
- **THEN** nothing is written or copied and the row says that the value is not one of those
  the standard lists

#### Scenario: The text changed while the file was copied
- **WHEN** the reader uploads a file and the text of the tab changes before the copy is made
- **THEN** the copy stays in the vault, the line is not changed, and the row names the copy
  and says the file changed

#### Scenario: Closing the menu
- **WHEN** the reader opens the menu of a file and closes it, or cancels the device's picker
- **THEN** nothing is written, copied or created

#### Scenario: An inline medium of 5.5.1
- **WHEN** a 5.5.1 person states `1 OBJE` with `2 FILE b.png` and `3 FORM bmp` beneath it, and
  the reader chooses `Media/c.gif` from the vault
- **THEN** the file states `2 FILE Media/c.gif` and `3 FORM gif`

#### Scenario: By the keyboard
- **WHEN** the reader reaches the picture of the family photograph with Tab and presses Enter
- **THEN** the menu opens at the picture, and its choices are reached with the arrow keys

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
