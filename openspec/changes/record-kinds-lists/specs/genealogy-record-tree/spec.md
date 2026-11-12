## MODIFIED Requirements

### Requirement: The lines of a record are one tree in the file's order

The card of a person, of a family, of a source, of a multimedia record, of a shared note, of a repository, of a submitter, of a 5.5.1 submission record, of a record of the file's own and of the file's header SHALL show the lines of that record as one **tree**, as the whole of the card, rooted at a **parent block**: the record's own opening line — a person's `INDI`, a family's `FAM`, a source's `SOUR`, a multimedia record's `OBJE`, a note's `SNOTE` or 5.5.1 `NOTE`, a `REPO`, a `SUBM`, a `SUBN`, a `HEAD`, a custom tag — with every line of the record nested beneath it. The root is a row like any other, with a label naming the kind of record in the reader's language (*Person*, *Family*, *Source*, *Media*, *Shared note*, *Note*, *Repository*, *Submitter*, *Submission*, *Header*), or the tag as written for a kind the plugin does not name, and a control that opens and closes it; it SHALL have no value, except where the opening line itself carries one — the text of a shared note, the value a record of the file's own writes after its tag, as the language service describes that opening line — which the root SHALL show as a line's value is shown, a note's text folded as a note is; it SHALL never show a cross-reference identifier. The tree SHALL show every line the record states, to any depth, in the order the file writes them, with a line's substructures nested beneath it in the order the file writes those. It SHALL have no heading of its own and SHALL NOT group lines into sections — not names, events, details, notes, related people, identifiers or anything else — and SHALL NOT reorder them. No line SHALL be left out for being unknown, custom, from the other dialect, or deeply nested; a `CONC` or `CONT` is joined to the line it continues. Where the record states nothing beneath its own opening line, the tree SHALL show the root alone, so that a first line can be added. A line that a section of the card also tells — a pointer to a family, a spouse, a child, a picture, a repository — SHALL be shown in the tree as well.

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

### Requirement: A row reads as the file writes it

Each line of the tree SHALL be a **row** of a label and a value. The label SHALL be the name the reader's language gives the tag where the standard names it, and the tag as written otherwise. The value SHALL be read as the requirement on reading a line says: a pointer as the name of the record it points at, as a link that selects that record, or as a pointer to a record that is not in the file with one action that shows it in the source; a pointer to a shared note as the text of that note and the lines beneath it, drawn where the pointer is, with a small control beside the text, named *Open note* in the reader's language, that selects the note and shows its card, which is reached by the keyboard, at least 44 pixels in each direction on touch, does not open or close the node its row belongs to, and does not expand or switch the sidebar — the control is drawn where the row shows its value, so a pointer with no lines beneath it shows it at once, and a pointer with lines beneath it, a citation for one, is a node that is closed at first, whose summary reads the note's first line without the control, and shows the control once it is opened; a pointer to a repository, a submitter or any other record that has a card as a link that selects it, as a pointer to a person is; the `FILE` of a multimedia record or of an inline `OBJE` as its picture or its path, as the requirement on the file of a medium says; a note as its text, folded where it is long; the type of a name in the reader's language, a name without its slashes and a name that is only a placeholder as the placeholder the card uses elsewhere; any other value as a field, which the reader can change as the requirements on editing a record say — holding the value as the file writes it while it has the focus — except that the value `Y` of a line the card knows as an event is not drawn; the type of a name is read as such only on a `NAME`, and a `TYPE` on any other line is drawn as written. A line with no value SHALL show no value and no dash. A value written right to left SHALL be laid out in its own direction. A line that has substructures SHALL be a **node**: its row SHALL carry a control that opens and closes what is beneath it, and a node SHALL be closed when the card is first drawn, except the root, which SHALL be open when the card first shows a record so that the lines beneath it are in view; the reader can close it, and that choice is kept for the record as any node's is. While the root is closed its row SHALL show as its summary the name of the record, as every record is named the same way everywhere — a person's name, a family's spouses, a source's title, a note's first line, a repository's name, *File header* — and while it is open it SHALL show none, and it SHALL carry no dot. While a node is closed its row SHALL show a **summary** of one line, made of the value of the line where it has one other than `Y`, then, where the card knows the line as an event or an attribute, its date as the file writes it and its place as the file writes it, joined by a dot and leaving out what the line does not state, and for a value of several lines its first line; a closed node whose line cites a source SHALL show a quiet dot after its summary, which says in its accessible name how many sources it cites, and one that cites none SHALL show none; while it is open the row shows the value alone and the substructures show the rest. A node's opened state SHALL be kept for each record, by the line's place among its siblings and not by its number in the file, through a redraw of the card for a change of the file and while another record is shown, for the last twenty records shown and until the plugin reloads.

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

## ADDED Requirements

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
