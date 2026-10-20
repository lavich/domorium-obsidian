## Purpose

How a GEDCOM tab shows its file as genealogy: the Genealogy and Source modes,
the person and source pages, moving between records, links into records, and
the way back to the lines that state what a page shows.

## ADDED Requirements

### Requirement: A GEDCOM tab has a Genealogy mode and a Source mode

A tab showing a `.ged` or `.gedcom` file SHALL be in one of two modes. In
**Genealogy** mode it shows one record of the file as a page. In **Source** mode
it shows the file in the editor the plugin has today, with everything that
editor does.

The view header SHALL carry a switch between the two modes, and a command SHALL
switch the active GEDCOM tab between them. Switching SHALL NOT change, save or
mark as changed the file, and SHALL NOT discard text typed but not yet saved in
Source mode.

Each tab SHALL remember its own mode, and its record, across closing and
reopening the workspace. A file opened anew SHALL open in the mode the *Open
GEDCOM files as* setting names, which SHALL offer Genealogy and Source and
SHALL default to Genealogy.

#### Scenario: A file opened with the default setting
- **WHEN** the reader opens `curie.ged` with the setting unchanged
- **THEN** the tab is in Genealogy mode and shows a page

#### Scenario: A reader who prefers the source
- **WHEN** the setting names Source and the reader opens `curie.ged`
- **THEN** the tab opens in Source mode, as the plugin did before this change

#### Scenario: Switching with unsaved text
- **WHEN** the reader types in Source mode, switches to Genealogy before the
  file is saved, and switches back
- **THEN** the typed text is still there, and the page in between reflected it

#### Scenario: A tab restored with the workspace
- **WHEN** a tab in Source mode and a tab in Genealogy mode showing Pierre Curie
  are open, and Obsidian is restarted
- **THEN** the first is in Source mode and the second shows Pierre Curie

### Requirement: Which record Genealogy mode shows

When a tab enters Genealogy mode it SHALL show, in order of preference: the
record a followed link names, where that record is a person, a family or a
source; the person, family or source whose record holds the editor's cursor,
when switching from Source mode; the record the tab last showed; the first
person the file declares.

A file that declares no person and no source SHALL show a page saying so, with
an action that switches the tab to Source mode.

#### Scenario: Switching from the source at a person's record
- **WHEN** the cursor is on a line inside Pierre Curie's record and the reader
  switches to Genealogy
- **THEN** Pierre Curie's page is shown

#### Scenario: Switching from the source at a note record
- **WHEN** the cursor is inside a shared note record and the tab last showed
  Marie Skłodowska-Curie
- **THEN** Marie Skłodowska-Curie's page is shown

#### Scenario: A file with no people
- **WHEN** a file declaring no `INDI` and no `SOUR` record is opened in Genealogy
  mode
- **THEN** the page says the file holds no people, and offers to open the source

### Requirement: The person page

A person page SHALL show, without any cross-reference identifier, level number
or tag:

- a heading with the person's name, the years of birth and death where a year
  can be read, marked when a year is approximate or one end of a range, and the
  places of birth and death;
- their **facts**: each event and attribute of the person, in the order the
  record writes them, followed by the events of each family the person is a
  spouse of, named with the other spouse. Each fact SHALL show its name in the
  reader's language, its date as the file writes it, its place, and its own
  payload where it has one, and SHALL show how many sources the fact itself
  cites, or that it cites none;
- their **other names**, where the record states more than one;
- their **family**: parents; siblings; and for each family the person is a
  spouse of, the other spouse with that family's marriage date and place where
  stated, the children of that family, and a way to that family's page.

Every relative shown SHALL open that person's page. A relative the file points
at but does not declare SHALL be shown as a pointer to a record that is not in
the file, with an action that shows it in the source.

A fact SHALL be selectable. Selecting a fact SHALL make it the selection the
evidence panel shows; selecting it again, or choosing *Whole record*, SHALL
return the selection to the whole record.

#### Scenario: Marie's facts
- **WHEN** the page shows Marie Skłodowska-Curie from the demo vault
- **THEN** it lists her birth with `7 NOV 1867` and `Warsaw, Congress Poland`,
  her death, her occupation, and her marriage with Pierre Curie, each marked as
  citing no source of its own

#### Scenario: A fact that cites a source
- **WHEN** a person's `1 BIRT` carries `2 SOUR @S2@` beneath it
- **THEN** the birth shows that it cites one source

#### Scenario: Two marriages
- **WHEN** a person is a spouse of two families
- **THEN** the family section shows two spouses, each with the children of that
  family under them

#### Scenario: A parent who is not in the file
- **WHEN** a person's child-family names a husband the file does not declare
- **THEN** the parents show the declared parent and a pointer to a record that
  is not in the file

#### Scenario: Following a relative
- **WHEN** the reader activates Pierre Curie in Marie's family section
- **THEN** the tab shows Pierre Curie's page

### Requirement: The family page

A family page SHALL show, without any cross-reference identifier, level number
or tag:

- a heading naming the family by its spouses, in the order the record names
  them, with the marriage date and place where the record states them; a family
  naming no spouse SHALL be headed by a stated placeholder;
- the family's **facts** — marriage, divorce, engagement and the other family
  events the record states — in the order the record writes them, each with its
  date as written, its place, and how many sources it cites itself, selectable
  as a person's facts are;
- its **spouses**, each under the role the record names them in, and its
  **children**, each opening their page; a spouse or child the file points at
  but does not declare SHALL be shown as a pointer to a record that is not in
  the file, with an action that shows it in the source.

#### Scenario: The Curies' family
- **WHEN** the page shows the family of Pierre Curie and Marie
  Skłodowska-Curie
- **THEN** it is headed by both names with `26 JUL 1895` and Sceaux, lists the
  marriage as a fact citing no source, Pierre Curie as husband and Marie as
  wife, and Irène Joliot-Curie and Ève Curie as children

#### Scenario: From a person to their family
- **WHEN** the reader is on Marie's page and chooses the family page beside
  Pierre Curie in her family section
- **THEN** the tab shows the family of Pierre Curie and Marie Skłodowska-Curie

### Requirement: The source page

A source page SHALL show the source's title, its author and publication where
the record states them, the repository it names with that repository's name,
address and web address, and every record that cites it: for each, the person
or family, where in that record the citation sits — the whole record or the
named event — and the page the citation states.

A person or a family among those SHALL open their page. A source naming a
repository the file does not declare SHALL say so.

#### Scenario: A source cited by three people
- **WHEN** the page shows `The Nobel Prize in Chemistry 1911 and 1935`
- **THEN** it lists Marie Skłodowska-Curie, Irène Joliot-Curie and Frédéric
  Joliot, each with the page their citation states

#### Scenario: A source nothing cites
- **WHEN** the page shows a source no record cites
- **THEN** it says no record cites it

### Requirement: Moving between records

Opening a record from a page, the index, the evidence panel or a link SHALL
show it in the same tab, and SHALL be a step the reader can go back from and
forward to again with Obsidian's own back and forward, on desktop and on a
phone. Switching mode SHALL NOT be such a step.

#### Scenario: Back to the previous person
- **WHEN** the reader goes from Marie's page to Pierre's and presses back
- **THEN** Marie's page is shown, and forward shows Pierre's again

### Requirement: Show in source

Every fact, every relative that is not in the file, and the record a page shows
SHALL offer **Show in source**. It SHALL switch the tab to Source mode and
select, and scroll into view, exactly the lines of the file that state it.

#### Scenario: Showing a birth in the source
- **WHEN** the reader selects Marie's birth and chooses Show in source
- **THEN** the tab is in Source mode with the `1 BIRT` line and the lines beneath
  it selected and in view

#### Scenario: Showing a whole record
- **WHEN** the reader chooses Show in source with no fact selected on Pierre
  Curie's page
- **THEN** the lines of Pierre Curie's record are selected and in view

### Requirement: Links into a record

Following a link that names a record of a GEDCOM file — a wikilink with a
`#@I1@` subpath, or an `obsidian://` link to the file and record — SHALL, in a
tab in Genealogy mode, show that person's, family's or source's page. A link
naming a record of another kind — a note, a multimedia record, a repository —
SHALL switch that tab to Source mode at the record, as following such a link
does today. A link naming a record the file does not declare SHALL leave the
page as it was and give the notice it gives today.

In Source mode a link SHALL behave as it does today.

#### Scenario: A link to a person
- **WHEN** the reader follows `[[curie.ged#@I1@]]` and the file opens in
  Genealogy mode
- **THEN** Marie Skłodowska-Curie's page is shown

#### Scenario: A link to a family
- **WHEN** the reader follows `[[curie.ged#@F3@]]` and the file opens in
  Genealogy mode
- **THEN** the family page of Pierre Curie and Marie Skłodowska-Curie is shown

#### Scenario: A link to a shared note
- **WHEN** the reader follows `[[curie.ged#@N1@]]` and the file opens in
  Genealogy mode
- **THEN** the tab switches to Source mode with the cursor at that note's record

### Requirement: A page follows the file

When the text of the file changes — typed in Source mode, or changed on disk —
a page SHALL show the new text the next time it is shown, and a page on screen
SHALL be redrawn without the reader asking. A page whose record no longer exists
in the file SHALL say so and offer the file's first person and Show in source.

#### Scenario: A date corrected in the source
- **WHEN** the reader changes Marie's `2 DATE 7 NOV 1867` to `8 NOV 1867` in
  Source mode and switches to Genealogy
- **THEN** Marie's birth shows `8 NOV 1867`

#### Scenario: A record removed
- **WHEN** the record a page shows is deleted from the file
- **THEN** the page says the record is no longer in the file

### Requirement: Commands follow the mode

Commands that act on the editor — go to definition, find references, rename,
the problems commands, search and replace — SHALL be offered only when the
active GEDCOM tab is in Source mode. Copying a link to a record SHALL be offered
in both modes; in Genealogy mode it SHALL copy the link to the record the page
shows.

#### Scenario: The palette in Genealogy mode
- **WHEN** the active tab is in Genealogy mode and the reader opens the palette
- **THEN** search in the file is not offered, and copying a link to the record
  is

### Requirement: Nothing in Genealogy mode writes to the file

Nothing a reader does in Genealogy mode, in the index or in the evidence panel
SHALL change the file, save it, or mark it as changed.

#### Scenario: Browsing a file
- **WHEN** the reader opens ten pages, selects facts and follows links
- **THEN** the file on disk is byte for byte what it was

### Requirement: The pages fit a phone

The person and source pages SHALL be readable and usable at a phone's width
without horizontal scrolling of the page, with the mode switch reachable from
the view header as Obsidian's own view actions are.

On a phone, selecting a fact SHALL unfold beneath it the titles of the sources
the fact cites, or that it cites none, with an action that opens the evidence
panel.

#### Scenario: A person page on a phone
- **WHEN** Marie's page is shown 390 pixels wide
- **THEN** every fact, name and relative is visible without scrolling sideways

#### Scenario: Tapping a fact on a phone
- **WHEN** the reader taps Marie's birth on a phone
- **THEN** beneath it the page says it cites no source of its own, and offers
  the evidence panel

### Requirement: Portrait and media on a page

A person page SHALL show in its heading the person's portrait — the first file
the record links that is an image — drawn from the part of the picture the link
names where it names one. A person, family or source page SHALL show a
**Media** section listing every file the record links, in the order it links
them, each with its caption:

- an image in the vault SHALL be shown as a thumbnail, cut to the link's
  rectangle where it names one;
- a file in the vault that is not an image SHALL be named, with what kind of
  file it is;
- a file at a web address SHALL NOT be fetched unless the reader has allowed
  images from the web, and until then SHALL say it is from the web and not
  loaded;
- a file the vault does not hold SHALL say so, with Show in source for the line
  that names it.

Activating a file in the vault SHALL open it in Obsidian, in the tab already
showing it if there is one, and SHALL leave the GEDCOM tab showing its page.

#### Scenario: Marie's portrait and gallery
- **WHEN** Marie's page is shown from the demo vault
- **THEN** her heading shows her portrait, and her media lists her portrait, the
  family photograph cut to her part of it with the caption "Marie, on the
  left", and a portrait at a web address that is not loaded

#### Scenario: A file not in the vault
- **WHEN** a record links a file at `Media/lost.jpg` the vault does not hold
- **THEN** its tile says the file is not in the vault and offers Show in source

### Requirement: The media page

A link to a multimedia record SHALL, in Genealogy mode, open its **media page**,
which SHALL show the file as large as the page allows — or say what it is, or
that it is missing or not loaded, as a tile does — with its caption and every
record that links it. Each of those SHALL show the part of the picture its link
names, with its own caption, and SHALL open that record's page.

#### Scenario: The family photograph
- **WHEN** the reader follows `[[curie.ged#@O5@]]` in Genealogy mode
- **THEN** the page shows the family photograph and lists Marie and Pierre, each
  with their own part of it and their own caption

#### Scenario: From a tile to its media page
- **WHEN** the reader chooses the media page of the family photograph from
  Marie's gallery
- **THEN** the tab shows the media page of `@O5@`
