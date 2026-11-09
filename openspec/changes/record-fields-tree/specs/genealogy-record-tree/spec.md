## Purpose

How the card shows what a person's, a family's or a source's record states: every line of it, as a tree in the order the file writes them, with no grouping of its own. The tree is read-only; the file stays the source of truth.

## ADDED Requirements

### Requirement: The lines of a record are one tree in the file's order

The card of a person, of a family and of a source SHALL show the lines of that record as one **tree**, below the heading and above the sections the card computes. The tree SHALL show every line the record states, to any depth, in the order the file writes them, with a line's substructures nested beneath it in the order the file writes those. It SHALL have no heading of its own and SHALL NOT group lines into sections — not names, events, details, notes, related people, identifiers or anything else — and SHALL NOT reorder them. No line SHALL be left out for being unknown, custom, from the other dialect, or deeply nested; a `CONC` or `CONT` is joined to the line it continues. The tree SHALL be left out only where the record states nothing but its own opening line.

#### Scenario: The file's order
- **WHEN** a person's record states `1 BIRT`, `1 NAME Maria /Curie/`, `1 SEX F` in that order
- **THEN** the tree shows the birth, then the name, then the sex, in that order, under no heading

#### Scenario: A custom line
- **WHEN** a person's record states `1 _MILITARY Cavalry` with `2 _RANK Captain` beneath it
- **THEN** the tree shows `_MILITARY` as written with `Cavalry` and, nested beneath it, `_RANK` with `Captain`

#### Scenario: A family
- **WHEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie
- **THEN** its tree shows the lines of that family's record, the marriage and the pointers to the husband, the wife and the children among them, in the order the file writes them

#### Scenario: A source
- **WHEN** the card shows a source whose record states `1 TITL`, `1 AUTH` and `1 REPO @R1@`
- **THEN** its tree shows those three lines, the repository as the name of the record it points at

#### Scenario: A record with nothing beneath its opening line
- **WHEN** a person's record states nothing
- **THEN** the card shows no tree

### Requirement: A row reads as the file writes it

Each line of the tree SHALL be a **row** of a label and a value. The label SHALL be the name the reader's language gives the tag where the standard names it, and the tag as written otherwise. The value SHALL be read as the requirement on reading a line says: a pointer as the name of the record it points at, as a link that selects that record, or as a pointer to a record that is not in the file with an action that shows it in the source; a note as its text, folded where it is long; any other value as a field that cannot be changed. A line that has substructures SHALL be a **node**: its row SHALL carry a control that opens and closes what is beneath it, and, while it is closed, a **summary** of one line — the value of the line where it has one, and for an event or an attribute its date and its place where it states them. Nodes SHALL be open on the first level beneath the opening line of the record and closed beneath that, and the reader's opening and closing SHALL stay through a redraw of the card for a change of the file, by the line's place in the record and not by its number in the file, and until another record is shown.

#### Scenario: A name with its parts
- **WHEN** a person's record states `1 NAME Maria /Skłodowska/` with `2 TYPE BIRTH` and `2 GIVN Maria` beneath it
- **THEN** the tree shows a node named `Name` whose summary reads `Maria Skłodowska`, and the type and the given name, named in the reader's language, beneath it

#### Scenario: An event while it is closed
- **WHEN** a person's `1 BIRT` states `2 DATE 7 NOV 1867` and `2 PLAC Warsaw, Congress Poland` and the reader has closed it
- **THEN** its row reads `Birth` with the summary `7 NOV 1867 · Warsaw, Congress Poland`

#### Scenario: A pointer
- **WHEN** a person's record states `1 FAMS @F1@` and the file declares `@F1@`
- **THEN** the row shows the family as a link that selects it, and no `@F1@`

#### Scenario: An open node kept across a redraw
- **WHEN** the reader has opened the node of Marie's residence and the file changes on disk above it
- **THEN** her card is redrawn with that node open, and after the card shows Pierre Curie and then Marie again it is closed

#### Scenario: An unknown tag
- **WHEN** a record states `1 _TRIBE Highlander`
- **THEN** the row is labelled `_TRIBE`

### Requirement: Tags are shown when asked for

The tree SHALL show no tag, level number or cross-reference identifier by default. A control of the tree SHALL show the tag of each line, after its label, in the secondary text colour and in the monospace face, and hide it again; no level number and no identifier SHALL be shown either way. The choice SHALL hold for every record the card shows until the plugin reloads.

#### Scenario: Tags off
- **WHEN** the card shows Marie's tree and the reader has not asked for tags
- **THEN** no row shows `NAME`, `BIRT` or any other tag, no level number and no `@I1@`

#### Scenario: Tags on
- **WHEN** the reader asks for tags
- **THEN** each row shows its tag after its label, `BIRT` after `Birth`, and the choice holds on Pierre Curie's card

### Requirement: An event or an attribute opens its card from its name

Where a line of the tree is an event or an attribute that the card of the record also knows as a fact — a birth, a death, an occupation, a residence, a marriage — its label SHALL be a control that opens the card of that event, as a fact does elsewhere on a card, and the row SHALL be marked while that fact is the selected one. Any other line's label SHALL NOT act. Selecting a fact SHALL NOT write to the file.

#### Scenario: Opening a birth
- **WHEN** the reader presses `Birth` in Marie's tree
- **THEN** the event card of her birth is shown

#### Scenario: The selected fact
- **WHEN** the cursor in Source mode rests in Marie's death
- **THEN** the row of her death is marked in the tree

#### Scenario: A line that is not a fact
- **WHEN** the reader presses `Sex` in Marie's tree
- **THEN** nothing opens

### Requirement: The controls of the tree appear only where the reader is

The controls that act on one row — *Show in source* — and those that act on the whole tree — show or hide tags, open every node, close every node — SHALL be shown only while the pointer is over the row or the tree or the focus is within it, SHALL NOT take space while hidden, and SHALL be shown for a row when it is reached by the keyboard. A control that opens or closes a node SHALL stay shown. Where the pointer cannot hover, the controls of a row SHALL be shown on the row the reader last pressed and those of the tree SHALL stay shown, each at least 44 pixels in each direction. *Show in source* on a row SHALL select exactly the lines that state it.

#### Scenario: A quiet card
- **WHEN** the card is shown and the pointer is outside the tree
- **THEN** only the controls that open and close nodes are visible among the controls of the tree

#### Scenario: Under the pointer
- **WHEN** the pointer moves over the row of Marie's occupation
- **THEN** its *Show in source* is shown, and moving away hides it

#### Scenario: Show in source
- **WHEN** the reader chooses *Show in source* on the row of Marie's birth
- **THEN** the tab is in Source mode with the `1 BIRT` line and the lines beneath it selected and in view

### Requirement: The tree changes nothing

Pressing, focusing, selecting, opening or closing in the tree SHALL NOT write to the file. The tree SHALL NOT offer to change a value, add a line, remove one or move one.

#### Scenario: Reading
- **WHEN** the reader opens every node, shows tags, selects a value and presses a link
- **THEN** the text of the file is as it was

### Requirement: The tree fits a narrow panel and a phone

The tree SHALL be readable in one column from 320 pixels up and at a phone's width, without horizontal scrolling. The indentation of nested lines SHALL stop growing after the fourth level beneath the opening line, so that a line nested deeper keeps the width of a line at the fourth. A long value SHALL wrap, and a long label SHALL wrap or be cut with an ellipsis that shows all of it on hover or focus.

#### Scenario: A deep line at a sidebar's width
- **WHEN** a record nests a line six levels deep and the card is 320 pixels wide
- **THEN** the line is shown in full without scrolling sideways

### Requirement: The words of the tree are in both languages

Every word the tree adds — the controls, their names for assistive technology, the summaries — SHALL be written in each language the plugin ships. A control SHALL be named for its action, and a control that appears only on hover SHALL have the same accessible name whether or not it is shown.

#### Scenario: Russian
- **WHEN** the plugin's language is Russian
- **THEN** every control of the tree is named in Russian and each key it uses exists in both catalogues
