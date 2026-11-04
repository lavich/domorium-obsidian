## Purpose

The graph of one whole GEDCOM file: every person as a card, generations from top
to bottom, couples joined by their family and lines to their children, laid out
to cross as little as possible, in a tab of its own beside the person pages.

## ADDED Requirements

### Requirement: The graph of a file is a tab of its own

The plugin SHALL offer a view, **Graph of the file**, that shows one GEDCOM file
and opens in a tab of the main area, as Obsidian's graph view does. It SHALL
open from an action in the header of a GEDCOM tab, in either mode, beside the
action that opens the timeline of the file; from a command available while a
GEDCOM tab is active; and from that tab's menu. Opening it for a file that
already has a graph open SHALL reveal that one, with its scope and view as the
reader left them, rather than open a second.

The graph SHALL show the file as the plugin reads it, including text typed in a
tab of that file and not yet saved, and SHALL follow every later change to it.
Where no tab of the file is open, it SHALL read the file from the vault. It SHALL
keep its file, scope, position and zoom across closing and reopening the
workspace, SHALL follow the file when it is renamed or moved, and SHALL say so
when the file no longer exists.

Nothing in the graph SHALL write to the file.

#### Scenario: Opening it from the header
- **WHEN** `curie.ged` is open and the reader chooses the graph action in its
  header
- **THEN** a new tab shows the graph of `curie.ged`, with a card for each of its
  17 people in four generations

#### Scenario: Opening it twice
- **WHEN** the graph of `curie.ged` is open in a tab and the reader chooses the
  action again
- **THEN** that tab is shown, and no second graph opens

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death to 1935 in the source and the
  file is not yet saved
- **THEN** her card in the graph reads `1867–1935`

#### Scenario: The file is renamed
- **WHEN** the graph of `curie.ged` is open and the file is renamed to
  `family.ged`
- **THEN** the graph shows `family.ged`

#### Scenario: The file is deleted
- **WHEN** the graph of `curie.ged` is open and the file is deleted
- **THEN** the graph says that `curie.ged` is no longer in the vault

#### Scenario: Restored with the workspace
- **WHEN** the graph of `curie.ged` is open on Irène's branch, zoomed in and
  moved, and Obsidian is restarted
- **THEN** the graph shows Irène's branch at the same zoom and position

### Requirement: A card is a person, coloured by sex

Each person the file declares with an identifier SHALL have a card showing,
from top to bottom, their portrait where they have one, their given names,
their surname and their years of life, written as the timeline of the file
writes them. The portrait SHALL be the picture, cut as its crop says, that the
person's page shows; a picture from the web SHALL be shown only where the
setting *Load images from the web*, or the reader's answer for this session,
allows it, as on the page. A card without a portrait, or whose portrait cannot
be shown, SHALL show none, and a name the record writes with no surname SHALL
stand on one line. A card's background SHALL be tinted pink for a woman, blue
for a man, and grey where the record states no sex, in colours taken from the
theme. A line
too long for its card SHALL be cut short, and the name given in full when the
pointer rests on the card. Far out, neither portraits nor text SHALL be drawn,
and only cards in or near the view SHALL load their portraits. The graph SHALL
NOT label generations.

#### Scenario: Marie's card
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Marie's card shows her portrait at its top, then `Marie`, then
  `Skłodowska-Curie`, then `1867–1934`, and is marked pink, and Pierre Curie's
  is marked blue

#### Scenario: A card without a portrait
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Jacques's card has no portrait and begins with `Jacques` over
  `Curie`, and stands in the same row as Pierre Curie's, which has one

#### Scenario: No labels for generations
- **WHEN** the graph of `curie.ged` is shown
- **THEN** no generation is named or numbered anywhere in it

### Requirement: Generations run from top to bottom, and couples stand together

Each generation of the file SHALL be one row of cards, the oldest at the top, a
person standing in the generation the timeline of the file gives them. A person
and their spouses in the same generation SHALL stand side by side, a husband to
the left of his wife; a person married more than once SHALL stand between two
of their spouses. Where a couple's families are both in the graph, the
husband's parents and siblings SHALL tend to stand to the left of the couple and
the wife's to the right.

Each couple SHALL be joined through a family node between them. The node SHALL
show the year of the marriage, in its last two digits after an apostrophe, and
SHALL be drawn hollow where no marriage is dated. Spouses who stand in different
generations SHALL still be joined through their family node. A family with
one parent in the graph SHALL have no node, and its lines SHALL leave from that
parent's card.

#### Scenario: Pierre and Marie
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Pierre Curie's card stands to the left of Marie's, with a node showing
  `’95` between them; Jacques stands to the left of Pierre Curie, and Zofia,
  Józef, Bronisława Dłuska and Helena to the right of Marie

#### Scenario: The parents of each side
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Eugène and Sophie-Claire stand in the top row to the left of
  Władysław and Bronisława Boguska

#### Scenario: A marriage with no date
- **WHEN** the graph of `curie.ged` is shown
- **THEN** the node between Eugène and Sophie-Claire is hollow, and the nodes of
  the other four couples show `’60`, `’95`, `’26` and `’54`

### Requirement: Lines run from a family to each child, crossing as little as possible

A line SHALL run from each family node, or from the card of a family's one
parent in the graph, to the card of each of its children in the graph, meeting
the child's own card. Lines SHALL be curves. A line to a child more than one
generation below SHALL pass through the rows between in a lane of its own,
where no card stands.

The order of the cards in each row SHALL be chosen to cross as few lines as the
graph can find within the time the requirement on size allows, and the cards
then placed as close above their children and below their parents as that order
and the room between cards allow. No two cards SHALL overlap.

#### Scenario: The Curie file
- **WHEN** the graph of `curie.ged` is shown whole
- **THEN** eleven lines run from the families to the children, and no two of
  them cross

#### Scenario: A line across a generation
- **WHEN** a man marries his sister's daughter, so that he stands beside her two
  generations below his parents
- **THEN** the line from his parents' family reaches his card through a lane in
  his sister's row, and no card stands in that lane

### Requirement: Pointing at a person lights their family

Pointing at a person's card, or giving it the keyboard focus, SHALL light that
card, the cards of their parents, spouses and children, the lines between them
and those people, and the family nodes they belong to, and SHALL fade everything
else, until the pointer or the focus leaves. The pointer SHALL light a person
only once it has rested on them a moment, and put the light out only once it
has rested off them as long, so that a sweep across cards does not flicker; the
keyboard's focus and a touch SHALL light at once. Lighting and fading SHALL be
eased in over a moment, except where the reader's system asks for reduced
motion. Lighting SHALL NOT lay the graph out or draw it again.

Pointing at a family node, or giving it the keyboard focus, SHALL show its
spouses, the date of the marriage as the file writes it and its place, or that
it has no date, and how many children the family has.

#### Scenario: Pointing at Marie
- **WHEN** the reader points at Marie's card in the graph of `curie.ged`
- **THEN** the cards of Marie, Władysław, Bronisława Boguska, Pierre Curie, Irène
  and Ève are lit, with the lines from her parents' family to her and from her
  family with Pierre Curie to Irène and to Ève, and every other card fades

#### Scenario: Pointing at the Curies' family node
- **WHEN** the reader points at the node between Pierre Curie and Marie
- **THEN** it shows Pierre Curie and Marie Skłodowska-Curie, married
  `26 JUL 1895` in Sceaux, France, and 2 children

### Requirement: Finding a person

The graph SHALL offer a search by name that fades the cards that do not match.
Pressing Enter in the search SHALL move the view to the first matching card, in
the order of the rows from top to bottom and of the cards from left to right,
and each further Enter to the next, coming back to the first after the last.

#### Scenario: Searching
- **WHEN** the reader types `joliot` in the graph of `curie.ged`
- **THEN** the cards of Frédéric, Irène, Hélène and Pierre Joliot stand out and
  the others fade

#### Scenario: Going from match to match
- **WHEN** the reader has typed `joliot` and presses Enter three times
- **THEN** the view moves to Frédéric's card, then to Irène's, then to Hélène's

### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's card, to show only that
person's branch: the same people the timeline of the file shows for that person
and those numbers — their ancestors up to a number of generations, their
descendants down to a number, and the spouses of everyone so shown. Both numbers
SHALL start at two and be changed in steps of one, from zero to nine. The graph
SHALL say whose branch it shows and how many of the file's people that is,
SHALL return to the whole file on request, and SHALL show the rows of a branch
without empty rows between them. Choosing Branch again on the person whose
branch is shown SHALL return to the whole file, and that person's Branch SHALL
read as pressed while their branch is shown. While the whole file is shown, no
line about the scope SHALL be shown.

A file of more than 500 people SHALL open on the branch of the person shown by
the GEDCOM tab the graph was opened from — the page's person in Genealogy mode,
the person at the cursor in Source mode — or of the first person the file
declares where neither names one. A smaller file SHALL open on all of it.

#### Scenario: Irène's branch
- **WHEN** the reader chooses Irène's branch in the graph of `curie.ged`
- **THEN** four rows show Eugène, Sophie-Claire, Władysław and Bronisława
  Boguska; Pierre Curie and Marie; Frédéric and Irène; Hélène and Pierre Joliot
  — and the graph says this is 10 of 17 people

#### Scenario: Branch again
- **WHEN** Irène's branch is shown and the reader chooses Branch on Irène's card
- **THEN** the whole file is shown, centred on Irène's card, and no line about
  the scope is shown

#### Scenario: No ancestors and no descendants
- **WHEN** the reader shows Marie's branch with zero generations of ancestors
  and zero of descendants
- **THEN** one row shows Pierre Curie and Marie

#### Scenario: A large file
- **WHEN** a file of 2 000 people is open on a person's page and the reader opens
  its graph
- **THEN** the graph shows that person's branch, with the way back to the whole
  file

### Requirement: Moving about the graph

The reader SHALL be able to move the graph by dragging it from anywhere, a card
included; a press that moves before it is released SHALL NOT activate what it
began on. A mouse wheel SHALL zoom around the pointer; a trackpad's two-finger
scroll SHALL move the graph and its pinch SHALL zoom; buttons floating over a
corner of the graph, which stay where they are as it moves, SHALL zoom in and
out. **Fit** SHALL show the whole scope where the zoom range allows, and
otherwise as much of it as the farthest zoom shows, centred on it. Zoomed out
beyond the point where names can be read, cards SHALL be drawn without text.

A graph restored with the workspace SHALL first be shown as it was left. Any
other graph SHALL first be shown fitted to its view where it can then be read,
and otherwise at a readable size around the first of these that is shown: the
person of the tab it was opened from, the person whose branch it shows, the
first card of the top row. An edit of the file SHALL leave the view where it
is. Changing the scope SHALL show the new scope at a readable size around the
person whose branch it now shows, or, on returning to the whole file, around
the person whose branch it showed.

#### Scenario: Opening on a small file
- **WHEN** the graph of `curie.ged` is opened in a tab 1 400 pixels wide
- **THEN** every card of the file is in view, with its name

#### Scenario: Far out
- **WHEN** the reader zooms out until names could not be read
- **THEN** the cards are drawn as coloured boxes without names or years

#### Scenario: A drag that begins on a card
- **WHEN** the reader presses on Marie's card, moves the pointer and releases it
- **THEN** the graph has moved, and Marie's page is not opened

#### Scenario: Choosing a branch
- **WHEN** the graph of `curie.ged` was opened from Marie's page and the reader
  chooses Irène's branch, and then returns to the whole file
- **THEN** the view is centred on Irène's card both times, at a readable size

#### Scenario: An edit keeps the view
- **WHEN** the reader has moved and zoomed the graph and then corrects a date in
  the source
- **THEN** the graph shows the correction at the same position and zoom

### Requirement: The graph leads to the pages

Activating a person's card SHALL show that person in the GEDCOM tab of the file,
as a row of the index does: their page in Genealogy mode, the cursor on their
record in Source mode. Activating a family node SHALL show that family the same
way. The file's tab SHALL be brought to the front; where no tab of the file is
open, one SHALL be opened. The graph tab SHALL stay open behind it.

Every card and family node drawn SHALL be reachable with the keyboard, in the
order of the rows and, within a row, from left to right; SHALL say whom it
shows to assistive technology; and SHALL be activated with Enter or Space. A
card's **Branch** choice SHALL be reachable with the keyboard too. A card or node
given the focus SHALL be brought into view.

#### Scenario: From the graph to Irène's page
- **WHEN** the GEDCOM tab of `curie.ged` is in Genealogy mode and the reader
  activates Irène's card
- **THEN** that tab comes to the front showing Irène's page, and the graph stays
  open in its own tab

#### Scenario: From a family node to the family page
- **WHEN** the reader activates the node between Pierre Curie and Marie
- **THEN** the GEDCOM tab comes to the front showing the Curies' family page

#### Scenario: From the keyboard
- **WHEN** the reader moves the focus to Marie's card and presses Enter
- **THEN** Marie's page is shown in the file's tab

### Requirement: The graph holds up at size

The graph of a file of 10 000 people shown whole SHALL be laid out in under a
second on a desktop, once for each reading of the file and scope: pointing,
dragging, zooming and searching SHALL NOT lay it out again. The graph SHALL draw
only the shapes in view and near it, and SHALL keep up with the pointer.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole in a view of 1 400 by 900
  pixels, and the reader drags, zooms and points at people
- **THEN** it was laid out in under a second, the highlight follows the pointer
  without a visible delay, the graph holds no more than a few hundred cards at
  its opening size, and no more than a few thousand shapes after **Fit**

### Requirement: The graph on a phone

On a phone the graph SHALL fill the screen's width, with the title hidden and the
legend folded behind a button, as the timeline of the file does. Dragging with
one finger SHALL move it and pinching with two SHALL zoom it; neither SHALL
activate what it began on. Touching a card SHALL light that person and their
family as pointing does and offer their **Branch**; touching it again SHALL show
the person as activating does on a desktop. Touching a family node SHALL show
its details, with the way to the family's page. Touching empty space SHALL put
the light out.

#### Scenario: Touching Marie's card
- **WHEN** the reader touches Marie's card on a phone, and then touches it again
- **THEN** her family is lit, and then her page is shown

#### Scenario: Pinching
- **WHEN** the reader pinches the graph on a phone, beginning with a finger on a
  card
- **THEN** it zooms around the point between the two fingers, the card's person
  is not opened, and no page of the app scrolls or zooms with it
