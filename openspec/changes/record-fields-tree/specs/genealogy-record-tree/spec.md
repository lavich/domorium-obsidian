## Purpose

How the card shows what a person's, a family's or a source's record states: every line of it, as a tree in the order the file writes them, with no grouping of its own. The tree is read-only; the file stays the source of truth.

## ADDED Requirements

### Requirement: The lines of a record are one tree in the file's order

The card of a person, of a family and of a source SHALL show the lines of that record as one **tree**, below the heading and above the sections the card computes, rooted at a **parent block**: the record's own opening line — a person's `INDI`, a family's `FAM`, a source's `SOUR` — with every line of the record nested beneath it. The root is a row like any other, with a label naming the kind of record in the reader's language (*Person*, *Family*, *Source*), a control that opens and closes it, and no value; it SHALL never show a cross-reference identifier. The tree SHALL show every line the record states, to any depth, in the order the file writes them, with a line's substructures nested beneath it in the order the file writes those. It SHALL have no heading of its own and SHALL NOT group lines into sections — not names, events, details, notes, related people, identifiers or anything else — and SHALL NOT reorder them. No line SHALL be left out for being unknown, custom, from the other dialect, or deeply nested; a `CONC` or `CONT` is joined to the line it continues. The tree, root included, SHALL be left out only where the record states nothing but its own opening line. A line that a section of the card also tells — a pointer to a family, a spouse, a child, a picture, a repository — SHALL be shown in the tree as well.

#### Scenario: The file's order
- **WHEN** a person's record states `1 BIRT`, `1 NAME Maria /Curie/`, `1 SEX F` in that order
- **THEN** the tree shows the birth, then the name, then the sex, in that order, under no heading

#### Scenario: A custom line
- **WHEN** a person's record states `1 _MILITARY Cavalry` with `2 _RANK Captain` beneath it
- **THEN** the tree shows `_MILITARY` as written with `Cavalry` and, once the node is opened, `_RANK` with `Captain` nested beneath it

#### Scenario: A family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** its tree shows the lines of that family's record, the marriage and the pointers to the husband, the wife and the children among them, in the order the file writes them, while the card still lists the spouses and the children in their own section

#### Scenario: A source
- **WHEN** the card shows a source whose record states `1 TITL`, `1 AUTH` and `1 REPO @R1@`
- **THEN** its tree shows those three lines, the repository as the name of the record it points at

#### Scenario: A record with nothing beneath its opening line
- **WHEN** a person's record states nothing
- **THEN** the card shows no tree

### Requirement: A row reads as the file writes it

Each line of the tree SHALL be a **row** of a label and a value. The label SHALL be the name the reader's language gives the tag where the standard names it, and the tag as written otherwise. The value SHALL be read as the requirement on reading a line says: a pointer as the name of the record it points at, as a link that selects that record, or as a pointer to a record that is not in the file with one action that shows it in the source; a pointer to a shared note as the text of that note and the lines beneath it, drawn where the pointer is; a note as its text, folded where it is long; the type of a name in the reader's language, a name without its slashes and a name that is only a placeholder as the placeholder the card uses elsewhere; any other value as a field that cannot be changed, except that the value `Y` of a line the card knows as an event is not drawn; the type of a name is read as such only on a `NAME`, and a `TYPE` on any other line is drawn as written. A line with no value SHALL show no value and no dash. A value written right to left SHALL be laid out in its own direction. A line that has substructures SHALL be a **node**: its row SHALL carry a control that opens and closes what is beneath it, and a node SHALL be closed when the card is first drawn, except the root, which SHALL be open when the card first shows a record so that the lines beneath it are in view; the reader can close it, and that choice is kept for the record as any node's is. While the root is closed its row SHALL show as its summary the name of the record as the heading of the card shows it — a person's name, a family's spouses, a source's title — and while it is open it SHALL show none, and it SHALL carry no dot. While a node is closed its row SHALL show a **summary** of one line, made of the value of the line where it has one other than `Y`, then, where the card knows the line as an event or an attribute, its date as the file writes it and its place as the file writes it, joined by a dot and leaving out what the line does not state, and for a value of several lines its first line; a closed node whose line cites a source SHALL show a quiet dot after its summary, which says in its accessible name how many sources it cites, and one that cites none SHALL show none; while it is open the row shows the value alone and the substructures show the rest. A node's opened state SHALL be kept for each record, by the line's place among its siblings and not by its number in the file, through a redraw of the card for a change of the file and while another record is shown, for the last twenty records shown and until the plugin reloads.

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
- **THEN** the row shows that text and the citation beneath it where the pointer is, and *Show in source* on that row selects the line of the pointer

#### Scenario: A pointer to a record not in the file
- **WHEN** a person's record states `1 FAMS @F9@` and the file declares no `@F9@`
- **THEN** the row shows a pointer to a record that is not in the file with one action that shows the line in the source

#### Scenario: An open node kept across a redraw and a visit elsewhere
- **WHEN** the reader has opened the node of Marie's residence, the file changes on disk above it, and the card then shows Pierre Curie and Marie again
- **THEN** her card was redrawn with that node open and is drawn with it open after the visit

#### Scenario: Notes folded in the order they are opened
- **WHEN** a record has two long notes and the reader shows the rest of the second and then of the first, and the file changes on disk
- **THEN** the card is redrawn with each note showing the rest as the reader left it

#### Scenario: An unknown tag
- **WHEN** a record states `1 _TRIBE Highlander`
- **THEN** the row is labelled `_TRIBE`

### Requirement: No tag, level number or identifier is shown

The tree SHALL show no tag the standard names, no level number and no cross-reference identifier, on any row, the root included. A tag the standard does not name, a custom one beginning with an underscore among them, is its own label and is shown as written.

#### Scenario: The standard's tags
- **WHEN** the card shows Marie's tree
- **THEN** no row shows `INDI`, `NAME`, `BIRT` or any other tag the standard names, no level number and no `@I1@`

#### Scenario: A custom tag
- **WHEN** a record states `1 _TRIBE Highlander`
- **THEN** the row is labelled `_TRIBE` and shows no second tag

### Requirement: An event or an attribute opens its card from its name

Where a line of the tree is an event or an attribute that the card of the record also knows as a fact — a birth, a death, an occupation, a residence, a marriage — and the fact has an identifier, its label SHALL be a control that opens the card of that event, as the name of a fact does elsewhere on a card, and a fact with no identifier SHALL have a label that does not act. Any other line's label SHALL NOT act. The value of a `PLAC` line, where the card knows the place, SHALL be a link that opens the card of that place, and so SHALL the place in the summary of a closed row, as a place is a link in a fact elsewhere on a card. Opening a card SHALL NOT write to the file.

#### Scenario: Opening a birth
- **WHEN** the reader presses `Birth` in Marie's tree
- **THEN** the event card of her birth is shown

#### Scenario: Opening a place
- **WHEN** the reader presses `Warsaw, Congress Poland` in the opened birth of Marie's tree
- **THEN** the card of that place is shown, and the card of her birth is not

#### Scenario: A line that is not a fact
- **WHEN** the reader presses `Sex` in Marie's tree
- **THEN** nothing opens

### Requirement: The controls of the tree appear only where the reader is

The controls that act on one row — *Show in source* — and those that act on the whole tree — the one icon toggle that opens or closes every node — SHALL be shown only while the pointer is over the row or the tree or the focus is within it, and SHALL NOT shift anything when they appear or disappear: the row keeps the room for them. They SHALL remain focusable and in the accessibility tree while they are not shown, SHALL be shown when their row takes the focus, and SHALL be named for their action and for the row they act on, as `Show in source: Birth`. The controls of a node, and of a row that holds a link or a button of its own, SHALL be in the tab order after that row's other controls; those of a plain value, which is a field that is not in the tab order, SHALL be reachable by the pointer, by touch and by assistive technology but not by Tab, and the node that holds the value has one for the keyboard. The control that opens and closes a node SHALL stay shown, and a node's control SHALL say whether the node is open; the controls of the tree are not among those that stay shown. Where the pointer cannot hover — a touch screen, the mobile app — the controls of a row SHALL be shown on the row the reader last pressed and those of the tree SHALL stay shown, each at least 44 pixels in each direction. *Show in source* on a row SHALL select exactly the lines that state it, the lines beneath it included; on the root that is the whole record, as the control in the heading selects it, which the heading keeps. The toggle that opens or closes every node includes the root. The toggle SHALL be a single icon button, in the style of the icon buttons of Obsidian's own file explorer, that shows the icon of the action it will do now — expanding all while any node is closed, collapsing all while every node is open, the state taken from the tree itself and updated whenever the reader opens or closes a node — and SHALL be named for that action, *Open every node* or *Close every node*. Opening every node SHALL open every node of the record, drawing what is beneath each as it is opened.

#### Scenario: A quiet card
- **WHEN** the card is shown and the pointer is outside the tree
- **THEN** only the controls that open and close nodes are visible among the controls of the tree

#### Scenario: Under the pointer
- **WHEN** the pointer moves over the row of Marie's occupation
- **THEN** its *Show in source* is shown, and moving away hides it, and nothing in the row moves

#### Scenario: By the keyboard
- **WHEN** the reader reaches the node of Marie's birth with the Tab key
- **THEN** its *Show in source* is shown and named `Show in source: Birth`, and the next Tab reaches it after the node's other controls

#### Scenario: A hidden control and assistive technology
- **WHEN** a screen reader lists the controls of Marie's card with the pointer outside the tree
- **THEN** each row's `Show in source` is listed with the name of its row

#### Scenario: Show in source
- **WHEN** the reader chooses *Show in source* on the row of Marie's birth
- **THEN** the tab is in Source mode with the `1 BIRT` line and the lines beneath it selected and in view

#### Scenario: On a phone
- **WHEN** Marie's card is shown on a phone and the reader presses the row of her occupation
- **THEN** that row's *Show in source* is shown, 44 pixels in each direction, and no other row's is

#### Scenario: The toggle opens and closes every node
- **WHEN** the reader presses the toggle on Marie's record with her nodes closed
- **THEN** every node is open, the lines of every note and event are shown, the focus has stayed on the toggle, and it is now named *Close every node* with the icon for collapsing; closing one node by hand turns its name back to *Open every node*

### Requirement: The tree changes nothing

Pressing, focusing, selecting, opening or closing in the tree SHALL NOT write to the file. The tree SHALL NOT offer to change a value, add a line, remove one or move one.

#### Scenario: Reading
- **WHEN** the reader opens every node, selects a value and presses a link
- **THEN** the text of the file is as it was

### Requirement: The tree fits a narrow panel and a phone

The tree SHALL be readable in one column from 320 pixels up and at a phone's width, without horizontal scrolling. The indentation of nested lines SHALL stop growing after the fourth level beneath the root, so that a line nested deeper keeps the width of a line at the fourth. A long value SHALL wrap, and a long label SHALL wrap. A redraw of the card for a change of the file SHALL keep the focus on the same control and SHALL NOT scroll the card; returning to a record with Back or Forward SHALL restore its scroll position, and showing a record in any other way SHALL scroll the card to its top.

#### Scenario: A deep line at a sidebar's width
- **WHEN** a record nests a line six levels deep and the card is 320 pixels wide
- **THEN** the line is shown in full without scrolling sideways once its nodes are open

#### Scenario: Focus across a redraw
- **WHEN** the reader has opened a node with the keyboard and the file changes on disk
- **THEN** the card is redrawn and the focus is on the same node's control

### Requirement: The words of the tree are in both languages

Every word the tree adds — the controls, their names for assistive technology, the summaries — SHALL be written in each language the plugin ships. A control SHALL be named for its action.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian
- **THEN** every control of the tree is named in Russian and each key it uses exists in both catalogues
