# genealogy-view Specification

## Purpose

How a GEDCOM tab shows its file as genealogy: the Genealogy and Source modes,
the person and source pages, moving between records, links into records, and
the way back to the lines that state what a page shows.

## Requirements

### Requirement: Which record Genealogy mode shows

When a tab enters Genealogy mode it SHALL show, in order of preference: the
record a followed link names, where that record is a person, a family or a
source; the record the tab most recently showed or had under the editor's cursor
on leaving Source mode, whichever was later, where that record is a person, a
family or a source; the first person the file declares.

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

#### Scenario: Through the graph
- **WHEN** the cursor is on a line inside Pierre Curie's record, and the reader
  switches to Graph mode and then to Genealogy mode
- **THEN** Pierre Curie's page is shown

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

Opening a record from a page, the index in Genealogy mode, the evidence panel, a
link, or a person or family of the graph or the timeline SHALL show it in the same tab, and SHALL
be a step the reader can go back from and forward to again with Obsidian's own
back and forward, on desktop and on a phone. Opening a record from Graph or
Timeline mode SHALL leave that mode for Genealogy mode, and going back from it
SHALL return the tab to that mode as it was. Switching mode with the mode control
or a command SHALL NOT be such a step.

#### Scenario: Back to the previous person
- **WHEN** the reader goes from Marie's page to Pierre's and presses back
- **THEN** Marie's page is shown, and forward shows Pierre's again

#### Scenario: Back to the graph
- **WHEN** the tab is in Graph mode, the reader activates Pierre Curie's card, and
  presses back
- **THEN** the tab is in Graph mode again, and forward shows Pierre Curie's page

#### Scenario: A mode switch is not a step
- **WHEN** the reader opens Marie's page, switches to Graph mode with the mode
  control, and presses back
- **THEN** the tab shows the page it showed before Marie's

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
tab in Genealogy, Graph or Timeline mode, show that person's, family's or
source's page, leaving Graph or Timeline mode for Genealogy mode. A link naming a
record of another kind — a note, a multimedia record, a repository — SHALL switch
that tab to Source mode at the record, as following such a link does today. A
link naming a record the file does not declare SHALL leave the page as it was and
give the notice it gives today. The same SHALL hold for choosing a record in the
command **Go to record**: a record with an identifier that has a page shows the
page, in Genealogy mode, and any other record, the header for one, switches the
tab to Source mode at it, never moving a cursor in an editor that is not shown.

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

#### Scenario: A link to a person in a tab in Graph mode
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader follows
  `[[curie.ged#@I1@]]`
- **THEN** the tab is in Genealogy mode showing Marie Skłodowska-Curie's page, and
  back returns it to Graph mode

#### Scenario: A link into a file that opens as a graph
- **WHEN** *Open GEDCOM files as* names Graph and the reader follows
  `[[curie.ged#@I1@]]` to a file not open
- **THEN** the tab is in Genealogy mode showing Marie Skłodowska-Curie's page

#### Scenario: Go to record in the graph
- **WHEN** the tab is in Graph mode and the reader runs **Go to record** and
  chooses the header record
- **THEN** the tab is in Source mode with the cursor on `0 HEAD`

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
the problems commands, and replace — SHALL be offered only when the active GEDCOM
tab is in Source mode. The command **Find**, and the key Obsidian dispatches to the
tab for it, SHALL be offered in Source, Graph and Timeline modes: in Source it
opens the editor's search, and in Graph and Timeline the search of the view, as the
requirements of those views say. In Genealogy mode, which has no search of its
own, it SHALL NOT be offered and the key SHALL do nothing. Copying a link to a
record SHALL be offered in Source and Genealogy modes; in Genealogy mode it SHALL
copy the link to the record the page shows. In Graph and Timeline modes it SHALL
be offered while a person is selected, and copy the link to them.

#### Scenario: The palette in Genealogy mode
- **WHEN** the active tab is in Genealogy mode and the reader opens the palette
- **THEN** neither find nor replace in the file is offered, and copying a link to
  the record is

#### Scenario: The palette in Graph mode
- **WHEN** the active tab is in Graph mode with nobody selected and the reader
  opens the palette
- **THEN** find is offered, and replace and copying a link to a record are not

#### Scenario: A person selected in the graph
- **WHEN** Pierre Curie is selected in Graph mode and the reader opens the palette
- **THEN** copying a link to the record is offered, and copies the link to
  `@I2@`

#### Scenario: The find key in Genealogy mode
- **WHEN** the tab is in Genealogy mode and the reader presses the find key
- **THEN** nothing opens and the tab stays in Genealogy mode

#### Scenario: The find key in Source mode
- **WHEN** the tab is in Source mode and the reader presses the find key
- **THEN** the editor's search panel opens

### Requirement: Nothing in Genealogy mode writes to the file

Nothing a reader does in Genealogy, Graph or Timeline mode, in the index or in the
evidence panel SHALL change the file, save it, or mark it as changed.

#### Scenario: Browsing a file
- **WHEN** the reader opens ten pages, selects facts and follows links
- **THEN** the file on disk is byte for byte what it was

#### Scenario: Browsing the graph and the timeline
- **WHEN** the reader moves and zooms the graph, chooses a branch, searches in the
  timeline, and opens three cards and two marks
- **THEN** the file on disk is byte for byte what it was

### Requirement: The pages fit a phone

The person and source pages SHALL be readable and usable at a phone's width
without horizontal scrolling of the page, with the mode control reachable from
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

### Requirement: The views of a person page

A person page SHALL offer four views, switched by tabs below its heading:
**Card**, which is the page as described above; **Tree**; **Timeline**; and
**Places**.
The tabs SHALL scroll sideways where they do not fit. The view chosen SHALL be
kept when the tab moves to another person and when the workspace is restored.

On a desktop the heading and the tabs SHALL stay at the top of the page while
the rest of it scrolls. On a phone only the tabs SHALL stay; the heading SHALL
scroll away with the page.

#### Scenario: Scrolling a long page on a desktop
- **WHEN** the reader scrolls to the end of Marie's card on a desktop
- **THEN** her name and the tabs are still at the top of the page

#### Scenario: Scrolling a long page on a phone
- **WHEN** the reader scrolls to the end of Marie's card on a phone
- **THEN** her name has scrolled away and the tabs are at the top of the screen

#### Scenario: Switching to the timeline and moving on
- **WHEN** the reader chooses Timeline on Marie's page and then opens Pierre
  Curie from it
- **THEN** Pierre Curie's page opens on its timeline

### Requirement: The timeline

The timeline SHALL list, ordered by the year read from each date, the person's
own events and the events of the families they married into, and the following
events of close relatives: their parents' marriage; their parents' deaths; their
siblings' births and deaths; their spouses' deaths; their children's births,
marriages and deaths; and their grandchildren's births. A relative's event SHALL
be listed only from the person's parents' marriage, or their own birth where
that is earlier or the marriage is not dated, to the person's death, where that
is dated.

Each entry SHALL show its year, its date as written, what happened — the
event's name, and for a relative's event the relationship and the relative's
name — and its place. The person's own entries SHALL be told apart from their
relatives'. An event of the person's with no year read from it SHALL be listed
apart, as undated. No age SHALL be shown.

Activating a relative in an entry SHALL open their page; activating one of the
person's own entries SHALL select that fact.

#### Scenario: Marie's timeline
- **WHEN** Marie's timeline is shown
- **THEN** it begins with her parents' marriage in 1860, lists the births of
  her four siblings before her own birth in 1867, her mother's death in 1878,
  her marriage to Pierre Curie in 1895, her daughters' births, her husband's
  death in 1906, her grandchildren's births, and ends with her death in 1934

#### Scenario: A relative's event after the person's death
- **WHEN** a person died in 1934 and their daughter died in 1956
- **THEN** the daughter's death is not on the person's timeline

### Requirement: The places

The places view SHALL list every place named by an entry of the timeline, in
the order a place first appears there, each with the events that happened there
and how many. A place SHALL be shown as the file writes it. No map SHALL be
drawn and nothing SHALL be fetched.

#### Scenario: Marie's places
- **WHEN** Marie's places are shown
- **THEN** `Warsaw, Congress Poland` lists her birth among its events, and
  `Sceaux, France` lists her marriage

### Requirement: The tree

The tree SHALL show the person in focus with, above, their parents and their
parents' parents, and the parents of their first spouse; beside them, their
spouses and their siblings and the first spouse's siblings; below, their
children with each child's spouse, and their grandchildren. More than one
sibling SHALL be shown as one box saying how many, which shows them one by one
when activated. A husband SHALL stand to the left of his wife, and each side's
parents and siblings SHALL tend to stand on that side. A person married more
than once SHALL stand between their first two spouses with the first spouse to
the left, so that each marriage's children sit beneath it.

Each box SHALL be a card drawn as the graph of the file draws it — coloured by
sex, pink for a woman, blue for a man, grey where no sex is stated, from the
theme; showing the person's portrait at its top where they have one, their given
names, their surname and their years. It SHALL mark the person in focus, mark a person
whose record cites no source at all, and mark a person with parents above, or
children below, that the tree does not reach. Each couple SHALL be joined
through a family node between them showing the year of the marriage, hollow
where no marriage is dated; activating the node SHALL show that family's page.
Curved lines SHALL lead from each family node, or a single parent's card, to
each child, turning only between rows. No two boxes SHALL overlap, however wide
a family is. The tree SHALL fill the space under the page's heading and tabs,
with nothing on the page to scroll to and no legend, and SHALL open fitted to
that space; only where the whole tree would then be too small to read SHALL it
open at a readable size with the person in focus in view. It SHALL be moved and
zoomed as the graph of the file is, with the same buttons floating over it.

Pointing at a person, or giving them the keyboard focus, SHALL light them and
their parents, spouses and children in the tree, and the lines between them.
Every card and family node SHALL be reachable with the keyboard and activated
with Enter or Space; on a phone a first touch SHALL light a person and a second
activate them.

Activating a person SHALL make them the focus.

The tree SHALL offer the search of the graph of the file, floating over its
canvas away from the zoom buttons: an icon that is replaced by a field when it is
pressed, with a cross, a counter of the matches, previous and next buttons, and
Enter and Shift+Enter to step. A search SHALL read the names of the people drawn,
all the names of a person who stands twice lighting each of their cards, and the
names of every sibling in a box of siblings, which a match SHALL light without
opening it, stepping reaching the box like any card. Matching cards SHALL stay lit
and the rest fade, the current match carries a ring and the view glides to it as it
does in the graph of the file, and the buttons are at least 44 pixels square on a
phone. The tree SHALL have no other toolbar. Its buttons SHALL show Obsidian's
tooltip only, not the system's, placed so that it does not cover the buttons
beside it.

#### Scenario: Marie's tree
- **WHEN** Marie's tree is shown
- **THEN** her parents and Pierre's parents are above, four siblings are one
  box beside her with Pierre and his brother Jacques, Irène and Ève are below
  with their husbands, and Hélène and Pierre Joliot below Irène

#### Scenario: A wide family
- **WHEN** a person has twelve children with eight children each
- **THEN** all ninety-six grandchildren are shown and no boxes overlap

#### Scenario: Moving the focus
- **WHEN** the reader activates Pierre Curie in Marie's tree
- **THEN** the tree shows Pierre Curie in focus

#### Scenario: Colours and sides
- **WHEN** Marie's tree is shown
- **THEN** Marie's card is marked pink and Pierre Curie's blue, in the theme's
  colours; Pierre Curie stands to her left with a node showing `’95` between
  them; Jacques and Pierre's parents stand on his side, and her siblings' box
  and her parents on hers

#### Scenario: Opening the Tree tab
- **WHEN** the reader chooses the Tree tab on Marie's page at a desktop's width
- **THEN** the page does not scroll, the tree fills the space under the tabs
  with all of Marie's tree in view, and no legend is shown

#### Scenario: Opening the Tree tab on a phone
- **WHEN** the reader chooses the Tree tab on Marie's page on a phone
- **THEN** the page does not scroll, and the tree fills the space under the
  tabs with Marie's card in view and readable

#### Scenario: Portraits and names in the tree
- **WHEN** Marie's tree is shown
- **THEN** her card shows her portrait over `Marie` over `Skłodowska-Curie`
  (a line wider than the card is cut with an ellipsis, so in a wide font her
  surname may be cut), Pierre Curie's and Irène's show theirs, and Jacques's
  shows none

#### Scenario: A person who stands twice
- **WHEN** a person stands twice in a tree, as a cousin marriage makes, and the
  reader points at one of them
- **THEN** both are lit

#### Scenario: A family node
- **WHEN** the reader activates the node between Pierre Curie and Marie in her
  tree
- **THEN** the Curies' family page is shown

#### Scenario: Married twice
- **WHEN** Anna married Bert and then Carl, with a child of each
- **THEN** Bert stands to her left and Carl to her right, and each child stands
  beneath their own parents

#### Scenario: Searching Marie's tree
- **WHEN** the reader types `joliot` in the search of Marie's tree
- **THEN** the counter reads `4 matches` and the cards of Frédéric, Irène, Hélène
  and Pierre Joliot stand out while the others fade

#### Scenario: Stepping through the tree
- **WHEN** the reader presses the next button four times, and then once more
- **THEN** the current card is Frédéric's, Irène's, Hélène's and Pierre's, each
  ringed and glided to, and then Frédéric's again

#### Scenario: A box of siblings
- **WHEN** the reader types the name of one of Marie's sisters, who stands in the
  box of siblings
- **THEN** the box is lit and not opened, and the counter reads `1 match`

### Requirement: A year before the common era is shown as one

Wherever a page shows a year read from a date — a person's heading, a row of a
list, an entry of the timeline, a box of the tree, the span of years a run of
siblings covers — a year before the common era SHALL be shown as the year the
file writes, marked in the reader's language as before the common era. It SHALL
NOT be shown as a negative number, nor bare as though it were of the common era.
A year of the common era SHALL be shown bare, as before.

#### Scenario: A heading in English
- **WHEN** the reader's language is English and a person's birth reads
  `1401 BCE` in a 7.0 document
- **THEN** the heading shows the year of birth as `1401 BCE`

#### Scenario: A heading in Russian
- **WHEN** the reader's language is Russian and a person's birth reads
  `ABT 1401 BCE` in a 7.0 document
- **THEN** the heading shows the year of birth as approximate and before the
  common era, `≈1401 до н. э.`

#### Scenario: A timeline across the start of the era
- **WHEN** a person's own events are dated `10 BCE`, `5 BCE` and `20` in a 7.0
  document
- **THEN** the timeline lists them in that order, showing `10 BCE`, `5 BCE` and
  `20`

### Requirement: The genealogy interface is off until the reader turns it on

The plugin SHALL have a setting, **Genealogy interface (beta)**, that SHALL be
off by default for every reader, including one whose settings were saved before
the setting existed, and whose description SHALL say that the interface is still
in beta and may change. It SHALL be changed only in the plugin settings. While it is
off, the plugin SHALL NOT offer Genealogy, Graph or Timeline mode, the Index, the
Evidence panel, the ribbon icon, the mode control in a tab header, or the commands
that show a mode or open a panel; every GEDCOM tab SHALL show the source.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A mode a tab was last in, the scope and zoom of its
Graph and Timeline, and the *Open GEDCOM files as* value, SHALL be kept while the
setting is off and honoured again when it is turned on; the *Open GEDCOM files as*
setting SHALL stay in the settings and say that it applies only while the
interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index, Evidence or mode command, and no mode control
  in a tab header is offered

#### Scenario: The setting says it is a beta
- **WHEN** the reader opens the plugin settings
- **THEN** the setting is named **Genealogy interface (beta)**, and its
  description says that the interface is still in beta and may change

#### Scenario: A reader who used Genealogy mode before
- **WHEN** the plugin updates and their saved settings name Genealogy in *Open
  GEDCOM files as*
- **THEN** `curie.ged` opens in Source mode until they turn the setting on

#### Scenario: Turning it on with a tab open
- **WHEN** `curie.ged` is open in Source mode and the reader turns the setting
  on
- **THEN** the mode control appears in the tab header, the ribbon icon appears,
  and the tab stays in Source mode

#### Scenario: Turning it off with panels open
- **WHEN** a tab is in Graph mode, the Index and Evidence panels are open, and the
  reader turns the setting off
- **THEN** the panels close, the tab shows the source, and the mode control and
  the ribbon icon are gone

#### Scenario: Turning it on again
- **WHEN** a tab was in Graph mode on Irène's branch, zoomed in, the setting was
  turned off and then on
- **THEN** the tab is in Graph mode again, on Irène's branch at the same zoom

#### Scenario: A tab opened while it is off
- **WHEN** the interface is off, `curie.ged` is opened and the reader then
  turns the interface on
- **THEN** the tab is still in Source mode

### Requirement: A GEDCOM tab is in one of four modes

A tab showing a `.ged` or `.gedcom` file SHALL be in one of four modes. In
**Genealogy** mode it shows one record of the file as a page. In **Graph** mode it
shows the whole file as the graph of the file, and in **Timeline** mode as the
timeline of the file. In **Source** mode it shows the file in the editor the
plugin has today, with everything that editor does. While the **Genealogy
interface** setting is off, every tab SHALL be in Source mode.

While the setting is on, the view header SHALL carry the mode control, and
commands SHALL switch the active GEDCOM tab to each mode. Switching SHALL NOT
change, save or mark as changed the file, SHALL NOT discard text typed but not
yet saved in Source mode, and SHALL NOT open another tab.

Switching from Genealogy mode to Source mode SHALL put the cursor at the start of
what the page shows — the selected fact, or else the whole record — and scroll it
into view, unless the cursor is already within those lines. Switching to Source
mode from Graph or Timeline mode SHALL leave the cursor where it was.

Each tab SHALL remember its own mode, its record, and the scope, position and zoom
of its Graph and its Timeline, across closing and reopening the workspace. A file
opened anew while the interface is on SHALL open in the mode the *Open GEDCOM
files as* setting names, which SHALL offer Genealogy, Graph, Timeline and Source
and SHALL default to Genealogy. A file opened anew while the interface is off
SHALL be remembered as in Source mode, so that turning the interface on does not
change the tab. Two tabs of one file SHALL each have a mode of their own.

#### Scenario: A file opened with the default setting
- **WHEN** the reader has turned the Genealogy interface on, leaves *Open GEDCOM
  files as* unchanged and opens `curie.ged`
- **THEN** the tab is in Genealogy mode and shows a page

#### Scenario: A reader who prefers the source
- **WHEN** the Genealogy interface is on, the setting names Source and the
  reader opens `curie.ged`
- **THEN** the tab opens in Source mode, as the plugin did before this change

#### Scenario: A reader who prefers the graph
- **WHEN** the Genealogy interface is on, the setting names Graph and the reader
  opens `curie.ged`
- **THEN** the tab opens in Graph mode and shows a card for each of the 17
  people

#### Scenario: The interface is off
- **WHEN** the Genealogy interface is off and the reader opens `curie.ged`
- **THEN** the tab is in Source mode, its header has no mode control, and no mode
  command is offered

#### Scenario: Switching with unsaved text
- **WHEN** the reader types in Source mode, switches to Genealogy before the
  file is saved, and switches back
- **THEN** the typed text is still there, and the page in between reflected it

#### Scenario: Switching to the source from Marie's birth
- **WHEN** Marie's birth is selected on her page and the reader switches to
  Source mode
- **THEN** the cursor is on her `1 BIRT` line, in view

#### Scenario: Switching to the source from the graph
- **WHEN** the cursor is in Pierre Curie's record in Source mode, and the reader
  switches to Graph mode and then to Source mode
- **THEN** the cursor is where it was

#### Scenario: A tab restored with the workspace
- **WHEN** the interface is on, a tab in Source mode, a tab in Genealogy mode
  showing Pierre Curie and a tab in Graph mode on Irène's branch are open, and
  Obsidian is restarted
- **THEN** the first is in Source mode, the second shows Pierre Curie and the
  third shows Irène's branch

#### Scenario: Two tabs of one file
- **WHEN** `curie.ged` is open in two tabs, one in Graph mode and one in Source
  mode
- **THEN** switching the first to Timeline mode leaves the second in Source mode

### Requirement: The mode control

While the **Genealogy interface** setting is on, the header of a GEDCOM tab SHALL
carry the mode control: one icon button for each mode — Genealogy, Graph,
Timeline and Source, in that order — each a header action of the tab, labelled
with the name of its mode. The button of the tab's mode SHALL be marked as the
active one, in the accent colour and as pressed to assistive technology, and the
mark SHALL follow every change of the tab's mode, however it came about.
Pressing a button SHALL switch the tab to that mode, and pressing the active one
SHALL do nothing. While the setting is off none of the buttons SHALL be shown. The
buttons SHALL be reachable in the header on a phone as Obsidian's own view
actions are.

The plugin SHALL offer a command for each mode — **Show as genealogy**, **Show as
graph**, **Show as timeline** and **Show as source** — each available while the
interface is on and a GEDCOM tab is active in another mode, and no hotkey SHALL
be assigned to any of them by default. A command **Switch between source and the
last view** SHALL switch a tab in Source mode to the mode it was in before Source
mode — Genealogy where it has none in this session — and a tab in any other mode
to Source mode. The tab's menu SHALL offer the four mode commands that are
available, and the commands SHALL be offered in the command palette as well.

#### Scenario: A button for each mode
- **WHEN** `curie.ged` is open in Genealogy mode with the interface on
- **THEN** the header shows buttons for Genealogy, Graph, Timeline and Source in
  that order, and the Genealogy button is marked as active and no other

#### Scenario: Pressing a button
- **WHEN** the tab is in Genealogy mode and the reader presses the Graph button
- **THEN** the tab shows the graph, and the Graph button is the one marked active

#### Scenario: Pressing the active button
- **WHEN** the tab is in Graph mode and the reader presses the Graph button
- **THEN** nothing changes

#### Scenario: The mark follows the mode
- **WHEN** the reader switches the tab by a command, goes Back to an earlier mode,
  or restarts Obsidian
- **THEN** the button of the mode the tab is then in is the one marked active

#### Scenario: The interface is off
- **WHEN** the interface setting is off
- **THEN** none of the four buttons is in the tab's header

#### Scenario: A command
- **WHEN** a tab is in Source mode and the reader runs **Show as timeline** from
  the command palette
- **THEN** the tab is in Timeline mode

#### Scenario: The current mode is not offered
- **WHEN** a tab is in Graph mode and the reader opens the command palette
- **THEN** **Show as graph** is not offered and **Show as genealogy**, **Show as
  timeline** and **Show as source** are

#### Scenario: Back to the last view
- **WHEN** a tab is in Graph mode and the reader runs **Switch between source and
  the last view** twice
- **THEN** the tab is in Source mode after the first and in Graph mode after the
  second

#### Scenario: A tab that has had only Source
- **WHEN** a tab opened in Source mode and the reader runs **Switch between source
  and the last view**
- **THEN** the tab is in Genealogy mode

#### Scenario: The tab's menu
- **WHEN** a tab is in Timeline mode and the reader opens the tab's menu
- **THEN** it offers to show the tab as genealogy, as graph and as source, and
  not as timeline

#### Scenario: The mode control on a phone
- **WHEN** the reader opens a tab on a phone
- **THEN** the four buttons are in the tab's header, and tapping one switches the
  tab to its mode

### Requirement: Graph and Timeline draw the tab's own reading of the file

The Graph and Timeline modes SHALL draw the file from the same reading of the
tab's text that the pages, the Index and the Evidence panel use, and SHALL NOT
read the file from the vault themselves. A mode not in view SHALL NOT be drawn: a
tab whose file changes while it is behind another, or while it is in another mode,
SHALL draw it when it is next in view. Switching between modes SHALL NOT lay the
graph or the timeline out again where the text and the scope are the same, and
SHALL leave each at the scope, position, zoom and scroll position it was left at. Graph and
Timeline SHALL each keep a scope of their own: choosing a branch in one SHALL NOT
change the other. A tab SHALL NOT draw either mode before it has read its file. A change of the
tab's size SHALL NOT disturb either mode: a tab that is not displayed, or whose
size is momentarily nothing, SHALL keep the position and zoom it had. Where the
text changes by any route — typed, changed on disk, or rewritten by the plugin
as a renamed file is followed — the mode shown SHALL show it. A tab that is
navigated to another file SHALL NOT carry the scope, position, zoom, selection or
drawn views of the first into the second.

#### Scenario: A restored tab
- **WHEN** a tab of `curie.ged` in Graph mode, zoomed in and moved, is restored
  with the workspace
- **THEN** the graph is shown at that zoom and position, not at the position of
  an empty graph

#### Scenario: Each view keeps its own branch
- **WHEN** the reader chooses Irène's branch in Graph mode and switches to
  Timeline mode
- **THEN** the timeline shows all 17 people

#### Scenario: A tab resized while it is hidden
- **WHEN** a tab in Graph mode, zoomed in and moved, is behind another tab, the
  window is resized, and the reader brings the tab to the front
- **THEN** the graph is at the same position and zoom as before

#### Scenario: Rewritten by the plugin
- **WHEN** the tab is in Graph mode and the plugin rewrites a `FILE` path in the
  text because the media file was renamed
- **THEN** the graph is drawn from the new text, and a card whose portrait it
  names shows the portrait at the new path

#### Scenario: Navigated to another file
- **WHEN** a tab of `curie.ged` is in Graph mode on Irène's branch, zoomed in, and
  the same tab is navigated to another GEDCOM file
- **THEN** the tab shows the other file's graph, opened by the rule for a view
  never shown, and not Irène's branch or zoom

#### Scenario: A tab that is not in view
- **WHEN** a tab of `curie.ged` in Timeline mode is behind another tab, and
  Marie's year of death is changed on disk
- **THEN** the timeline is not drawn again until the reader brings the tab to the
  front, and then her lifeline ends at the new year

### Requirement: An index row selects a person in Graph and Timeline

While a tab is in Graph or Timeline mode, activating a person's row in the index
SHALL select that person in the view, without opening their page and without
changing the mode. The tab SHALL keep at most one selected person; selecting
another replaces them. The selection SHALL end when the tab leaves the mode,
including for the other of the two views, when the person's record no longer
exists in the file, and when the Genealogy interface is turned off, and SHALL NOT
be saved with the workspace. A person selected while the tab is not in view or not
yet drawn SHALL be shown selected, and centred, when the view is drawn. Where a
person is drawn more than once, every copy SHALL carry the mark. While a person is selected, the index SHALL mark their row as the
current one, the Evidence panel SHALL show their whole record, and the command
that copies a link to a record SHALL copy a link to them. Activating the row of a
family, a source or a media record in these modes SHALL show its page, as it does
in Genealogy mode. Activating a card or a row in the view itself SHALL show the
person's page, as the requirements of the two views say.

#### Scenario: Selecting from the index
- **WHEN** the tab is in Timeline mode and the reader activates Marie's row in the
  index
- **THEN** the tab stays in Timeline mode with her row selected, the index marks
  her row, and the Evidence panel shows her whole record

#### Scenario: Leaving the mode ends the selection
- **WHEN** Marie is selected in Graph mode and the reader switches to Timeline mode
- **THEN** nobody is selected, and no row of the index is marked

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in Graph mode is behind another tab and the reader activates
  Pierre Curie's row in the index, and then brings the tab to the front
- **THEN** the graph shows his card selected and centred, and no page was opened

#### Scenario: The record goes
- **WHEN** Marie is selected in Graph mode and her record is removed from the file
  on disk
- **THEN** nobody is selected, and no row of the index is marked

#### Scenario: The interface is turned off
- **WHEN** Marie is selected in Graph mode and the reader turns the Genealogy
  interface off
- **THEN** the tab shows the source and no row of the index is marked

#### Scenario: Not kept by the workspace
- **WHEN** Marie is selected in Graph mode and Obsidian is restarted
- **THEN** the tab is in Graph mode with nobody selected

### Requirement: A tab navigated to another file starts afresh

When a tab that was showing one GEDCOM file is navigated to another, the Graph and
Timeline of the first — the scope, position, zoom and scroll position, the drawn
boards and the selection — SHALL NOT be shown for the second. The second file's
views SHALL be opened as for a view never shown, or from the state saved for the
second file where the navigation brings it.

#### Scenario: From one file to another
- **WHEN** a tab in Graph mode on a branch of one file is navigated to another
  file
- **THEN** the graph of the other file is opened by the rule for a first opening,
  with that file's own people

### Requirement: A workspace saved with the file's overview in a tab of its own opens without it

Versions of the plugin before this change opened the timeline and the graph of a
file in tabs of their own. A workspace that still holds such a tab
SHALL, once loaded, have it closed, without a notice and without leaving a pane
that Obsidian calls unknown; the GEDCOM tabs of the same files SHALL be left as
they were.

#### Scenario: A workspace saved by 1.14
- **WHEN** the workspace was saved with a tab of `curie.ged`, a graph of the file
  and a timeline of the file, and the plugin is updated and Obsidian restarted
- **THEN** only the tab of `curie.ged` is open, and no pane says that it does not
  look like anything
