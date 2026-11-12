## ADDED Requirements

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
- **THEN** nothing is written and the row says that the value is not one of those the
  standard lists

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
