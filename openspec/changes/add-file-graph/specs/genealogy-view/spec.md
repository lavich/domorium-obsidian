## MODIFIED Requirements

### Requirement: The genealogy interface is off until the reader turns it on

The plugin SHALL have a setting, **Genealogy interface (beta)**, that SHALL be
off by default for every reader, including one whose settings were saved before
the setting existed, and whose description SHALL say that the interface is still
in beta and may change. It SHALL be changed only in the plugin settings. While it is
off, the plugin SHALL NOT offer Genealogy mode, the Index, the Evidence panel,
the timeline of the file, the graph of the file, the ribbon icon, the header
actions that open the timeline and the graph, or the commands that open any of
them.

Turning the setting on or off SHALL take effect in every open tab and sidebar
without restarting Obsidian. A mode a tab was last in, and the *Open GEDCOM files
as* value, SHALL be kept while the setting is off and honoured again when it is
turned on; the *Open GEDCOM files as* setting SHALL stay in the settings and
say that it applies only while the interface is on.

#### Scenario: A reader who never touched the setting
- **WHEN** the plugin is installed or updated and the setting is not changed
- **THEN** no ribbon icon, no Index, Evidence, timeline or graph command, and no
  mode switch, timeline action or graph action in a tab header is offered

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
- **THEN** the mode switch, the timeline action and the graph action appear in
  the tab header, the ribbon icon appears, and the tab stays in Source mode

#### Scenario: Turning it off with panels open
- **WHEN** a tab is in Genealogy mode, the Index and Evidence panels and the
  timeline and the graph of the file are open, and the reader turns the setting
  off
- **THEN** the panels, the timeline and the graph close, the tab shows the
  source, and the mode switch, the timeline action, the graph action and the
  ribbon icon are gone

#### Scenario: Turning it on again
- **WHEN** a tab was in Genealogy mode, the setting was turned off and then on
- **THEN** the tab is in Genealogy mode again, showing the record it showed

#### Scenario: A tab opened while it is off
- **WHEN** the interface is off, `curie.ged` is opened and the reader then
  turns the interface on
- **THEN** the tab is still in Source mode

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
