## MODIFIED Requirements

### Requirement: Links into a record

Following a link that names a record of a GEDCOM file — a wikilink with a
`#@I1@` subpath, or an `obsidian://` link to the file and record — SHALL, in a tab
in Graph, Timeline, List or Source mode, select that person, family, source,
multimedia record, shared note, repository, submitter, 5.5.1 submission record or record of
the file's own and show it in the card, as the requirement on the selected
record says, without changing the tab's mode; in Source mode it SHALL also put the cursor at
the record. A link naming a record that has no card SHALL switch that tab to Source mode at
the record, as following such a link does today. A link
naming a record the file does not declare SHALL leave the selection as it was and
give the notice it gives today. The same SHALL hold for choosing a record in the
command **Go to record**: a record that has a card is selected, in whatever mode
the tab is in — the header among them, whose card it opens — and any other record, the
trailer for one, switches the tab to Source mode at it, never moving a cursor in an editor
that is not shown.

#### Scenario: A link to a person
- **WHEN** the reader follows `[[curie.ged#@I1@]]` and the file opens in Graph mode
- **THEN** the tab is in Graph mode with Marie Skłodowska-Curie's card marked
  selected, and the card shows her

#### Scenario: A link to a family
- **WHEN** the reader follows `[[curie.ged#@F3@]]` and the file opens in Graph mode
- **THEN** the card shows the family of Pierre Curie and Marie Skłodowska-Curie

#### Scenario: A link to a media record
- **WHEN** the reader follows `[[curie.ged#@O5@]]`
- **THEN** the card shows the media card of the family photograph

#### Scenario: A link to a shared note
- **WHEN** the reader follows `[[curie.ged#@N1@]]` and the file opens in Graph mode
- **THEN** the tab stays in Graph mode and the card shows the card of that note

#### Scenario: A URL to a repository
- **WHEN** the reader follows an `obsidian://` link to `curie.ged` and `@R2@` with the tab in
  List mode
- **THEN** the tab stays in List mode, the row of `State Archive in Warsaw` is marked among
  the repositories, and the card shows the repository

#### Scenario: Go to record on the trailer
- **WHEN** the tab is in Graph mode and the reader runs **Go to record** and chooses the
  trailer
- **THEN** the tab is in Source mode with the cursor on `0 TRLR`

#### Scenario: A link to a person in a tab in Graph mode
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab stays in Graph mode, Marie Skłodowska-Curie's card is marked
  selected and the graph glides to it, and the card shows her

#### Scenario: A link to a person in a tab in Timeline mode
- **WHEN** the tab of `curie.ged` is in Timeline mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab stays in Timeline mode, Marie Skłodowska-Curie's row is marked
  selected and scrolled to, and the card shows her

#### Scenario: A link to a person in a tab in List mode
- **WHEN** the tab of `curie.ged` is in List mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab stays in List mode, Marie Skłodowska-Curie's row is marked selected and
  in view, and the card shows her

#### Scenario: A link into a file that opens as a graph
- **WHEN** Graph is the mode the reader last chose and the reader follows
  `[[curie.ged#@I1@]]` to a file not open
- **THEN** the tab is in Graph mode with Marie Skłodowska-Curie selected

#### Scenario: A link in Source mode
- **WHEN** the tab is in Source mode and the reader follows `[[curie.ged#@I1@]]`
- **THEN** the cursor is on `0 @I1@ INDI`, in view, and the card shows Marie
  Skłodowska-Curie

#### Scenario: Go to record in the graph
- **WHEN** the tab is in Graph mode and the reader runs **Go to record** and
  chooses the header record
- **THEN** the tab stays in Graph mode and the card shows the header's card

### Requirement: Commands follow the mode and the selection

Commands that act on the editor — go to definition, find references, rename, the
problems commands, and replace — SHALL be offered only when the active GEDCOM tab
is in Source mode. The command **Find**, and the key Obsidian dispatches to the tab
for it, SHALL be offered in every mode: in Source it opens the editor's search, in
Graph and Timeline the search of the view, and in List it opens the search of the list and focuses its field,
as the requirements of those views say. Copying a link to a record SHALL be offered
in Source mode, for the record under the cursor, and in Graph, Timeline and List
modes while a record with an identifier is selected, for the selected record, whatever its
kind; the header, which has no identifier, and a place offer no link.

#### Scenario: The palette in Graph mode
- **WHEN** the active tab is in Graph mode with nobody selected and the reader
  opens the palette
- **THEN** find is offered, and replace and copying a link to a record are not

#### Scenario: A person selected in the graph
- **WHEN** Pierre Curie is selected in Graph mode and the reader opens the palette
- **THEN** copying a link to the record is offered, and copies the link to `@I2@`

#### Scenario: A family selected in the timeline
- **WHEN** the Curies' family is selected in Timeline mode and the reader copies a
  link to the record
- **THEN** the link copied is to `@F3@`

#### Scenario: A person selected in the list
- **WHEN** Pierre Curie is selected in List mode and the reader opens the palette
- **THEN** copying a link to the record is offered, and copies the link to `@I2@`

#### Scenario: The find key in List mode
- **WHEN** the tab is in List mode and the reader presses the find key
- **THEN** the search of the list is open and its field has the focus, and the editor's search panel is
  not opened

#### Scenario: The find key in Source mode
- **WHEN** the tab is in Source mode and the reader presses the find key
- **THEN** the editor's search panel opens

#### Scenario: Replace outside the source
- **WHEN** the tab is in Timeline or List mode and the reader opens the palette
- **THEN** replace and the editor commands are not offered

#### Scenario: A note selected in the list
- **WHEN** the note `@N1@` is selected in List mode and the reader copies a link to the record
- **THEN** the link copied is to `@N1@`

#### Scenario: The header selected
- **WHEN** the header is selected in List mode and the reader opens the palette
- **THEN** copying a link to the record is not offered
