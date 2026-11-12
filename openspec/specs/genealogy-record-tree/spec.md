# genealogy-record-tree Specification

## Purpose
How the card shows what a person's, a family's or a source's record states: every line of it, as a tree in the order the file writes them, with no grouping of its own. The tree is where the record is read and edited; the file stays the source of truth.

## Requirements

### Requirement: The lines of a record are one tree in the file's order

The card of a person, of a family, of a source, of a multimedia record, of a shared note, of a repository, of a submitter, of a 5.5.1 submission record, of a record of the file's own and of the file's header SHALL show the lines of that record as one **tree**, as the whole of the card, rooted at a **parent block**: the record's own opening line — a person's `INDI`, a family's `FAM`, a source's `SOUR`, a multimedia record's `OBJE`, a note's `SNOTE` or 5.5.1 `NOTE`, a `REPO`, a `SUBM`, a `SUBN`, a `HEAD`, a custom tag — with every line of the record nested beneath it. The root is a row like any other, with a label naming the kind of record in the reader's language (*Person*, *Family*, *Source*, *Media*, *Shared note*, *Note*, *Repository*, *Submitter*, *Submission*, *Header*), or the tag as written for a kind the plugin does not name, and a control that opens and closes it; it SHALL have no value, except where the opening line itself carries one — the text of a shared note, the value a record of the file's own writes after its tag, as the language service describes that opening line — which the root SHALL show as a line's value is shown, a note's text folded as a note is; it SHALL never show a cross-reference identifier. The tree SHALL show every line the record states, to any depth, in the order the file writes them, with a line's substructures nested beneath it in the order the file writes those. It SHALL have no heading of its own and SHALL NOT group lines into sections — not names, events, details, notes, related people, identifiers or anything else — and SHALL NOT reorder them of its own accord: the order of the lines changes only where the reader moves a line among its siblings, which writes the new order to the file as the requirements on editing a record say, and the tree then shows the file's new order. No line SHALL be left out for being unknown, custom, from the other dialect, or deeply nested; a `CONC` or `CONT` is joined to the line it continues. Where the record states nothing beneath its own opening line, the tree SHALL show the root alone, so that a first line can be added. A line that a section of the card also tells — a pointer to a family, a spouse, a child, a picture, a repository — SHALL be shown in the tree as well.

#### Scenario: The file's order
- **WHEN** a person's record states `1 BIRT`, `1 NAME Maria /Curie/`, `1 SEX F` in that order
- **THEN** the tree shows the birth, then the name, then the sex, in that order, under no heading

#### Scenario: A custom line
- **WHEN** a person's record states `1 _MILITARY Cavalry` with `2 _RANK Captain` beneath it
- **THEN** the tree shows `_MILITARY` as written with `Cavalry` and, once the node is opened, `_RANK` with `Captain` nested beneath it

#### Scenario: A family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** its tree shows the lines of that family's record, the marriage and the pointers to the husband, the wife and the children among them, in the order the file writes them, and the card has no section of its own for the spouses and the children

#### Scenario: A source
- **WHEN** the card shows a source whose record states `1 TITL`, `1 AUTH` and `1 REPO @R1@`
- **THEN** its tree shows those three lines, the repository as the name of the record it points at

#### Scenario: A record with nothing beneath its opening line
- **WHEN** a person's record states nothing
- **THEN** the card shows the root of the tree alone, with nothing beneath it

#### Scenario: A shared note's own text
- **WHEN** the card shows the note `@N1@` of `curie.ged`
- **THEN** the root is labelled *Shared note* and its value is the note's text, its `CONT`
  line joined to it as a second line, and no `CONT` row is shown

#### Scenario: A repository
- **WHEN** the card shows the repository `@R2@` of `curie.ged`
- **THEN** its tree shows the name and the address, with the city and the country beneath
  the address once it is opened

#### Scenario: The order the reader set
- **WHEN** the reader moves Marie's second name before her first and the card is drawn again
- **THEN** the tree shows the name that was second first, as the file now writes it, and no
  other line has changed its place

### Requirement: A row reads as the file writes it

Each line of the tree SHALL be a **row** of a label and a value. The label SHALL be the name the reader's language gives the tag where the standard names it, and the tag as written otherwise. The value SHALL be read as the requirement on reading a line says: a pointer as the name of the record it points at, as a link that selects that record, or as a pointer to a record that is not in the file with one action that shows it in the source; a pointer to a shared note as the text of that note and the lines beneath it, drawn where the pointer is, with a small control beside the text, named *Open note* in the reader's language, that selects the note and shows its card, which is reached by the keyboard, at least 44 pixels in each direction on touch, does not open or close the node its row belongs to, and does not expand or switch the sidebar — the control is drawn where the row shows its value, so a pointer with no lines beneath it shows it at once, and a pointer with lines beneath it, a citation for one, is a node that is closed at first, whose summary reads the note's first line without the control, and shows the control once it is opened; a pointer to a repository, a submitter or any other record that has a card as a link that selects it, as a pointer to a person is; the `FILE` of a multimedia record or of an inline `OBJE` as its picture or its path, as the requirement on the file of a medium says; a note as its text, folded where it is long; the type of a name in the reader's language, a name without its slashes and a name that is only a placeholder as the placeholder the card uses elsewhere; any other value as a field, which the reader can change as the requirements on editing a record say — holding the value as the file writes it while it has the focus — except that the value `Y` of a line the card knows as an event is not drawn; the type of a name is read as such only on a `NAME`, and a `TYPE` on any other line is drawn as written. A line with no value SHALL show no value and no dash. A value written right to left SHALL be laid out in its own direction. A line that has substructures SHALL be a **node**: its row SHALL carry a control that opens and closes what is beneath it, and a node SHALL be closed when the card is first drawn, except the root, which SHALL be open when the card first shows a record so that the lines beneath it are in view; the reader can close it, and that choice is kept for the record as any node's is. While the root is closed its row SHALL show as its summary the name of the record, as every record is named the same way everywhere — a person's name, a family's spouses, a source's title, a note's first line, a repository's name, *File header* — and while it is open it SHALL show none, and it SHALL carry no dot. While a node is closed its row SHALL show a **summary** of one line, made of the value of the line where it has one other than `Y`, then, where the card knows the line as an event or an attribute, its date as the file writes it and its place as the file writes it, joined by a dot and leaving out what the line does not state, and for a value of several lines its first line; a closed node whose line cites a source SHALL show a quiet dot after its summary, which says in its accessible name how many sources it cites, and one that cites none SHALL show none; while it is open the row shows the value alone and the substructures show the rest. A node's opened state SHALL be kept for each record, by the line's place among its siblings and not by its number in the file, through a redraw of the card for a change of the file and while another record is shown, for the last twenty records shown and until the plugin reloads. Where the reader moves a line among its siblings, the opened state of that line and of every line beneath it SHALL follow it to its new place, and that of each sibling whose place the move changed SHALL follow that sibling, as SHALL the notes the reader unfolded there.

#### Scenario: A name with its parts
- **WHEN** a person's record states `1 NAME Maria /Skłodowska/` with `2 TYPE BIRTH` and `2 GIVN Maria` beneath it
- **THEN** the tree shows a node named `Name` closed, whose summary reads `Maria Skłodowska`, and, once it is opened, the type read as `Birth` and the given name `Maria` named in the reader's language beneath it

#### Scenario: The type of a name in Russian
- **WHEN** the plugin's language is Russian and a name states `2 TYPE MARRIED`
- **THEN** the row reads the type in Russian

#### Scenario: An event while it is closed
- **WHEN** a person's `1 BIRT` states `2 DATE 7 NOV 1867` and `2 PLAC Warsaw, Congress Poland`
- **THEN** its row, closed as every node is when the card is first drawn, reads `Birth` with the summary `7 NOV 1867 · Warsaw, Congress Poland`

#### Scenario: An attribute with a value
- **WHEN** a person's `1 OCCU Physicist` states `2 DATE 1900`
- **THEN** its closed row's summary reads `Physicist · 1900`, and opened it shows the value `Physicist` and the date beneath it

#### Scenario: A citation at a glance
- **WHEN** a person's `1 BIRT` carries `2 SOUR @S2@` and the node is closed
- **THEN** its row shows a quiet dot after the summary that says it cites one source, and once it is opened the citation is a row beneath it

#### Scenario: A type that is not a name's
- **WHEN** a person's `1 EVEN` states `2 TYPE Stage name`
- **THEN** the row shows the type as written, not read as a name type

#### Scenario: A bare event
- **WHEN** a person's record states `1 DEAT Y` and nothing beneath it
- **THEN** its row reads `Death` with no value, no dash and no summary

#### Scenario: A pointer
- **WHEN** a person's record states `1 FAMS @F1@` and the file declares `@F1@`
- **THEN** the row shows the family as a link that selects it, and no `@F1@`

#### Scenario: A pointer to a shared note
- **WHEN** a 7.0 person's record states `1 SNOTE @N1@` and the file declares `0 @N1@ SNOTE` with text and a `2 SOUR` beneath it
- **THEN** the row shows that text and the citation beneath it where the pointer is, and an
  *Open note* control beside the text

#### Scenario: Opening a shared note from a pointer
- **WHEN** the reader presses *Open note* beside the text of `@N1@` in Marie's tree
- **THEN** the card shows the card of `@N1@`, and the list, where it is in view, shows the
  notes with the row of `@N1@` marked

#### Scenario: A note pointer with a citation beneath it
- **WHEN** a person's record states `1 SNOTE @N1@` with `2 SOUR @S1@` beneath it
- **THEN** the row is a closed node whose summary reads the note's first line and offers no
  *Open note*, and once it is opened the note's text shows with *Open note* beside it, and
  pressing that control leaves the node open

#### Scenario: A pointer to a repository
- **WHEN** a source's record states `1 REPO @R1@` and the file declares `@R1@`
- **THEN** the row shows `Nobel Prize Outreach` as a link that selects the repository

#### Scenario: A pointer to a record not in the file
- **WHEN** a person's record states `1 FAMS @F9@` and the file declares no `@F9@`
- **THEN** the row shows a pointer to a record that is not in the file with one action that shows the line in the source, which a closed node offers in its summary and an open node on the pointer itself

#### Scenario: An open node kept across a redraw and a visit elsewhere
- **WHEN** the reader has opened the node of Marie's residence, the file changes on disk above it, and the card then shows Pierre Curie and Marie again
- **THEN** her card was redrawn with that node open and is drawn with it open after the visit

#### Scenario: Notes folded in the order they are opened
- **WHEN** a record has two long notes and the reader shows the rest of the second and then of the first, and the file changes on disk
- **THEN** the card is redrawn with each note showing the rest as the reader left it

#### Scenario: An unknown tag
- **WHEN** a record states `1 _TRIBE Highlander`
- **THEN** the row is labelled `_TRIBE`

#### Scenario: An open node moved
- **WHEN** the reader has opened Marie's second name, leaves her first closed, and moves the second before the first
- **THEN** the card is drawn again with the name now first open, its type in view, and the name now second closed

### Requirement: No tag, level number or identifier is shown

The tree SHALL show no tag the standard names, no level number and no cross-reference identifier, on any row, the root included. A tag the standard does not name, a custom one beginning with an underscore among them, is its own label and is shown as written.

#### Scenario: The standard's tags
- **WHEN** the card shows Marie's tree
- **THEN** no row shows `INDI`, `NAME`, `BIRT` or any other tag the standard names, no level number and no `@I1@`

#### Scenario: A custom tag
- **WHEN** a record states `1 _TRIBE Highlander`
- **THEN** the row is labelled `_TRIBE` and shows no second tag

### Requirement: The node controls and the toggle stay in view

The control of a node — its arrow — SHALL always be shown, quiet in the colour the app gives its collapse icons and drawn as the app draws them, pointing at the reader's end while the node is closed and downward while it is open, SHALL be a real button that is focusable and in the accessibility tree, named by its row, that says whether the node is open and which part it controls, and SHALL show a focus ring when the keyboard reaches it. A press on a node's header outside its own controls SHALL open or close the node as the arrow does. The arrow's column SHALL be reserved at the start of every row, of a node and of a line alike, so that the labels of one depth start at one place, and the label SHALL follow the arrow's glyph closely. The control that acts on the whole tree — the one icon toggle that opens or closes every node — SHALL always be shown, in a header above the first row made as the header of Obsidian's file explorer is (`nav-header` holding `nav-buttons-container`). The toggle SHALL be a single icon button of the `clickable-icon nav-action-button` kind, a focusable element with the role of a button that Enter and Space press, drawn by the app's own rules for such buttons, that shows the icon of the action it will do now — expanding all while any node is closed, collapsing all while every node is open, the state taken from the tree itself and updated whenever the reader opens or closes a node — and SHALL be named for that action, *Open every node* or *Close every node*. Opening every node SHALL open every node of the record, the root included, drawing what is beneath each as it is opened. The toggle SHALL take the size the app gives such a button where the app is mobile, and the arrows SHALL be at least 44 pixels tall. The rows of the tree SHALL be set apart by a small vertical space, the guide of the children continuing across it, and a row under the pointer SHALL be painted with the neutral hover colour of the app's navigation and never with the colour of a selected row, whether or not it has been pressed.

#### Scenario: A quiet card
- **WHEN** the card is shown and the pointer is outside the tree
- **THEN** the arrows of the nodes are visible and so is the open-all toggle in the header above the tree, focusable and named

#### Scenario: Arrows in the file explorer's way
- **WHEN** the card shows Marie's tree
- **THEN** each node has its arrow inside its row, followed closely by its label, the label of a line such as `Sex` starts where the label of a node such as `Birth` starts, and the rows are apart

#### Scenario: Under the pointer
- **WHEN** the pointer moves over a row of the tree
- **THEN** the row is painted with the hover background of the navigation, not with the colour of a selected row, and after a press on it and the pointer moving away it keeps no background

#### Scenario: By the keyboard
- **WHEN** the reader reaches the open-all toggle with the Tab key
- **THEN** the toggle shows a focus ring and its name says what it will do, and Enter or Space opens or closes every node

#### Scenario: The toggle opens and closes every node
- **WHEN** the reader presses the toggle on Marie's record with her nodes closed
- **THEN** every node is open, the lines of every note and event are shown, the focus has stayed on the toggle, and it is now named *Close every node* with the icon for collapsing; closing one node by hand turns its name back to *Open every node*

### Requirement: Reading the tree changes nothing

Pressing, focusing, selecting, opening or closing in the tree SHALL NOT write to the file, and neither SHALL pressing a line's grip without moving it, or a drag that ends anywhere but at a place that changes the order. Only the editing controls of the capability `genealogy-record-edit` write — a value committed in its field, a record chosen for a pointer, a field added from a line's menu, a line removed, a line moved among its siblings — each as one change of the text of the open tab.

#### Scenario: Reading
- **WHEN** the reader opens every node, selects a value and presses a link
- **THEN** the text of the file is as it was

#### Scenario: A grip pressed and a drag let go
- **WHEN** the reader presses the grip of Marie's birth and lets go without moving, and then drags it and lets go over the root's row
- **THEN** the text of the file is as it was

### Requirement: The tree fits a narrow panel and a phone

The tree SHALL be readable in one column from 320 pixels up and at a phone's width, without horizontal scrolling. The indentation of nested lines SHALL stop growing after the fourth level beneath the root, so that a line nested deeper keeps the width of a line at the fourth. A long value SHALL wrap, and a long label SHALL wrap. A redraw of the card for a change of the file SHALL keep the focus on the same control and SHALL NOT scroll the card, except that after the reader moves a line the card SHALL scroll only as far as it takes to bring that line's grip into view; showing another record SHALL scroll the card to its top.

#### Scenario: A deep line at a sidebar's width
- **WHEN** a record nests a line six levels deep and the card is 320 pixels wide
- **THEN** the line is shown in full without scrolling sideways once its nodes are open

#### Scenario: Focus across a redraw
- **WHEN** the reader has opened a node with the keyboard and the file changes on disk
- **THEN** the card is redrawn and the focus is on the same node's control

#### Scenario: A line moved out of view
- **WHEN** the reader drags a line to the bottom edge of the card, the card scrolls, and the reader lets go there
- **THEN** the card has scrolled just enough to show that line's grip, and no further

### Requirement: The words of the tree are in both languages

Every word the tree adds — the controls, their names for assistive technology, the summaries — SHALL be written in each language the plugin ships. A control SHALL be named for its action.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian
- **THEN** every control of the tree is named in Russian and each key it uses exists in both catalogues

### Requirement: A place and a label in the tree are text

The place in the summary of a closed row SHALL be text, as the file writes it, and SHALL NOT act on its own: pressing it does what pressing the header of its node does. On the row of a `PLAC` line the value SHALL be a field the reader can change, as the requirements on editing a record say, with no control beside it: a place has no card. The label of a line, whether the line is an event or an attribute or not, SHALL be text and SHALL NOT act: no card of an event exists. Pressing a place or a label SHALL NOT write to the file.

#### Scenario: Opening a place
- **WHEN** the reader presses `Warsaw, Congress Poland` in the summary of Marie's closed birth, and then looks at the `PLAC` row of the opened birth
- **THEN** the birth is opened, the card still shows Marie, and the row of its place holds a field with `Warsaw, Congress Poland` and no control that opens a place

#### Scenario: A label
- **WHEN** the reader presses `Sex` or `Birth` in Marie's tree
- **THEN** nothing opens, and pressing the header of the node `Birth` opens or closes the node

### Requirement: The file of a medium is shown as its picture

The row of a `FILE` line beneath an `OBJE` — the file of a multimedia record, or of an `OBJE`
a 5.5.1 record writes inline — SHALL show, where its value is, the picture, where the file is
an image in the vault, or an image on the web while the setting allows the card to fetch it;
otherwise a file icon and the path or address as the file writes it; it SHALL show it whether
the line's node is open or closed, in place of the closed node's summary, so that the picture
is in view when the card is first drawn. The picture SHALL fit
the width of the row and be at most 160 pixels tall, keeping its proportions. The picture or
the path SHALL be one control, reached by the keyboard, named in the reader's language for
the file, which the requirements on editing say what pressing does. A `FILE` that is not
beneath an `OBJE` — the 5.5.1 header's, which names the file itself — SHALL be a value like
any other.

#### Scenario: A picture in the vault
- **WHEN** the card shows the family photograph, whose `1 FILE Media/curie-family-1908.svg` is
  in the vault
- **THEN** the row of its file shows the picture, at most 160 pixels tall, and no field,
  while its node, holding the format and the title, is still closed

#### Scenario: A file not in the vault
- **WHEN** the card shows `A plate nobody can find`, whose `1 FILE Media/lost-daguerreotype.jpg`
  is not in the vault
- **THEN** the row of its file shows a file icon and `Media/lost-daguerreotype.jpg`

#### Scenario: A picture on the web not yet allowed
- **WHEN** the card shows `@O6@`, whose file is an `https` address, and the setting does not
  let the card fetch images from the web
- **THEN** the row shows a file icon and the address, and nothing is fetched

#### Scenario: The header's file of 5.5.1
- **WHEN** the card shows the header of a 5.5.1 file that states `1 FILE tree.ged`
- **THEN** the row reads as any value does, with no picture and no file icon
