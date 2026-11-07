# genealogy-file-graph Specification

## Purpose
The graph of one whole GEDCOM file: every person as a card, generations from top
to bottom, couples joined by their family and lines to their children, laid out
to cross as little as possible, in a tab of its own beside the person pages.

## Requirements

### Requirement: A card is a person, coloured by surname

Each person the file declares with an identifier SHALL have a card showing,
from top to bottom, their given names, their surname and their years of life,
written as the timeline of the file writes them. A card SHALL show no picture, and
every card SHALL be of one height; a name the record writes with no surname SHALL
stand on one line. A card's background SHALL be tinted by the person's whole surname, in the colour the timeline gives their bar: surnames that differ only in a gendered ending, or are one name in two scripts, SHALL be tinted almost alike, surnames with little in common far apart, and a card of a person with no surname SHALL be grey. The lines of the card SHALL be written in an ink that reads at 4.5:1 on its tint, in the light scheme and in the dark. A line
too long for its card SHALL be cut short, and the name given in full when the
pointer rests on the card. Far out, no text SHALL be drawn. The graph SHALL
NOT label generations.

#### Scenario: Marie's card
- **WHEN** the graph of `curie.ged` is shown
- **THEN** Marie's card shows `Marie`, then
  `Skłodowska-Curie`, then `1867–1934`, and is tinted by her surname, `Skłodowska-Curie`, and Pierre Curie's by his, `Curie`, in a different colour; a line wider than the card is cut with an ellipsis, so in a
  wide font her surname may be cut

#### Scenario: A card without a portrait
- **WHEN** the graph of `curie.ged` is shown, whose people have pictures
- **THEN** no card shows a picture, Jacques's card begins with `Jacques` over
  `Curie`, and every card is of one height

#### Scenario: No labels for generations
- **WHEN** the graph of `curie.ged` is shown
- **THEN** no generation is named or numbered anywhere in it

#### Scenario: Two spellings of one surname
- **WHEN** a file has `Лобанов` and `Лобанова`
- **THEN** their cards are tinted in hues that are almost the same, and `Сидорова`'s is far from them

#### Scenario: Readable in both schemes
- **WHEN** the graph of `curie.ged` is shown in the light scheme and then in the dark
- **THEN** the lines of every card read at 4.5:1 on its tint in both

#### Scenario: Without a surname
- **WHEN** a person's name states no surname
- **THEN** their card is grey

### Requirement: Generations run from top to bottom, and couples stand together

Each generation of the file SHALL be one row of cards, the oldest at the top, a person standing in the generation the timeline of the file gives them: a person with no parents in the file, and no spouse standing below them, stands one row above the highest-standing of their children in the file, and in the first row only where they have none. Children of one family SHALL NOT stand at different heights for their years of birth. A person
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

#### Scenario: A man with no parents whose daughter marries down
- **WHEN** a man with no parents in the file has a daughter who marries a man whose own father and grandfather are in the file
- **THEN** the man stands one row above his daughter, in the row of the husband's father, and not in the top row with the husband's grandfather

#### Scenario: A man with children in two generations
- **WHEN** a man with no parents in the file has a son in the second row and a daughter in the third
- **THEN** he stands in the first row, one above the higher of the two, and both lines reach their children

#### Scenario: The Curie file keeps its rows
- **WHEN** the graph of `curie.ged` is shown
- **THEN** every card stands in the row it stood in before, Eugène and Sophie-Claire and Władysław and Bronisława Boguska in the top row

#### Scenario: Brothers of different ages
- **WHEN** two brothers were born in 1901 and 1914
- **THEN** their cards stand in one row, and the elder stands to the left of the younger unless that crosses more lines

### Requirement: Lines run from a family to each child, crossing as little as possible

A line SHALL run from each family node, or from the card of a family's one
parent in the graph, to the card of each of its children in the graph, meeting
the child's own card. Lines SHALL be curves. A line to a child more than one
generation below SHALL pass through the rows between in a lane of its own,
where no card stands.

The order of the cards in each row SHALL be chosen to cross as few lines as the graph can find within the time budget the requirement on size gives it, brothers and sisters standing from the eldest at the left to the youngest at the right wherever that crosses no more lines than any other order the graph found; the cards are then placed as close above their children and below their parents as that order and the room between cards allow. No two cards SHALL overlap.

#### Scenario: The Curie file
- **WHEN** the graph of `curie.ged` is shown whole
- **THEN** eleven lines run from the families to the children, and no two of
  them cross

#### Scenario: A line across a generation
- **WHEN** a man marries his sister's daughter, so that he stands beside her two
  generations below his parents
- **THEN** the line from his parents' family reaches his card through a lane in
  his sister's row, and no card stands in that lane

#### Scenario: A crossing that cannot be avoided
- **WHEN** no order of a row crosses fewer lines than the order shown
- **THEN** the elder brother stands to the left of the younger

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
- **THEN** it shows Pierre Curie ⚭ Marie Skłodowska-Curie, married
  `26 JUL 1895` in Sceaux, France, and 2 children

### Requirement: Finding a person

The graph SHALL offer a search by name that fades the cards that do not match.
The search SHALL be an icon floating over the canvas, in the top corner
beside the zoom buttons, that is replaced by a field when it is pressed, the icon fading away as the
field grows and taking no place beside it, and the field SHALL take the focus; the
graph SHALL NOT have a toolbar for it. The open field SHALL grow away from the
zoom buttons and SHALL NOT cover them. The field SHALL have a cross that
erases the text and leaves the field open. Escape, and the cross of an empty
field, SHALL close the field back to the icon, as SHALL leaving it empty; a
field with text SHALL stay open and keep its matches faded.

The open field SHALL show how many cards match — «4 matches», or «No results»
where none does — and, once the reader has stepped, which match the view is on,
as «3 / 4». Two buttons beside it, previous and next, and Enter and Shift+Enter
in the field, SHALL move the view to the previous and the next match, in the
order of the rows from top to bottom and of the cards from left to right: the
first step forward goes to the first match and the first step back to the last,
and each step past either end comes round to the other. The view SHALL centre on
the card at a readable zoom, and the card SHALL carry a ring of its own, unlike
that of the light of pointing, while the other matches stay lit and the rest
faded. The view SHALL glide there rather than jump, unless the reader has asked
for reduced motion or the card is further away than a glide can show without a
streak, when it SHALL jump; a drag, the wheel or a key SHALL take over from a
glide at the place it has reached. The buttons SHALL be disabled where nothing matches, and pressing one
with a mouse or a key SHALL leave the focus in the field.

#### Scenario: Searching
- **WHEN** the reader types `joliot` in the graph of `curie.ged`
- **THEN** the cards of Frédéric, Irène, Hélène and Pierre Joliot stand out and
  the others fade

#### Scenario: Going from match to match
- **WHEN** the reader has typed `joliot` and presses Enter three times
- **THEN** the view moves to Frédéric's card, then to Irène's, then to Hélène's

#### Scenario: Gliding to a match
- **WHEN** the reader presses the next button with `joliot` typed
- **THEN** the view passes through intermediate positions to Frédéric's card with
  the cards of the whole path already drawn, and a drag begun on the way stops it
  where it is; where reduced motion is asked for the view jumps

#### Scenario: Counting the matches
- **WHEN** the reader types `joliot`, and then presses the next button
- **THEN** the counter reads `4 matches`, and then `1 / 4` with Frédéric's card
  centred and ringed

#### Scenario: Going back past the first match
- **WHEN** the view is on the first of the four matches and the reader presses
  the previous button
- **THEN** the view is on Pierre Joliot's card and the counter reads `4 / 4`

#### Scenario: Coming round after the last match
- **WHEN** the view is on the last of the four matches and the reader presses
  Enter
- **THEN** the view is on Frédéric's card and the counter reads `1 / 4`

#### Scenario: No results
- **WHEN** the reader types `zzz`
- **THEN** the counter reads `No results`, both buttons are disabled and no
  card is ringed

#### Scenario: Opening the search
- **WHEN** the reader presses the search icon in the graph of `curie.ged`
- **THEN** the icon is replaced by a field that has the focus, no search icon
  is left beside it, and the toolbar band above the canvas does not exist

#### Scenario: Clearing the search
- **WHEN** the reader has typed `joliot` and presses the cross
- **THEN** the field is empty and stays open, and no card is faded

#### Scenario: Closing the search
- **WHEN** the field is empty and the reader presses Escape
- **THEN** the field closes back to the icon, which has the focus

#### Scenario: Opening the search beside the zoom
- **WHEN** the reader presses the search icon
- **THEN** the field grows away from the zoom buttons, which stay where
  they were and uncovered

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

A file of more than 500 people SHALL show its graph, the first time the tab does,
on the branch of the person the tab had selected when it was brought to the graph
— in Source mode, the person of the record at the cursor — or of the first person
the file declares where neither names one. A smaller file
SHALL open on all of it. Once the tab has shown the graph, the scope the reader
leaves it on SHALL be kept, the whole file included.

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
- **WHEN** a file of 2 000 people is open in Source mode with the cursor inside one
  person's record and the reader switches the tab to Graph mode
- **THEN** the graph shows that person's branch, with the way back to the whole
  file

#### Scenario: A large file opened as a graph
- **WHEN** Graph is the mode the reader last chose and the reader opens a file of
  2 000 people
- **THEN** the graph shows the branch of the first person the file declares

#### Scenario: The whole file, chosen, stays
- **WHEN** the reader returns a large file's graph to the whole file, switches to
  Source mode and back to Graph mode
- **THEN** the whole file is shown

### Requirement: Moving about the graph

The reader SHALL be able to move the graph by dragging it from anywhere, a card
included; a press that moves before it is released SHALL NOT activate what it
began on. A mouse wheel SHALL zoom around the pointer; a trackpad's two-finger
scroll SHALL move the graph and its pinch SHALL zoom; buttons floating over the top
corner of the graph, inside the same bordered box as the search icon, right after it, which
stay where they are as it moves, SHALL zoom in and out. **Fit** SHALL show the whole scope where the zoom range allows, and
otherwise as much of it as the farthest zoom shows, centred on it. Zoomed out
beyond the point where names can be read, cards SHALL be drawn without text.

A graph restored with the workspace, or shown again after the tab was in another
mode, SHALL be shown as it was left. Any other graph SHALL first be shown fitted
to its view where it can then be read, and otherwise at a readable size around
the first of these that is shown: the person the tab had selected when it was brought to the graph, the person whose branch it shows, the first card of the top
row. An edit of the file SHALL leave the view where it is. Changing the scope
SHALL show the new scope at a readable size around the person whose branch it now
shows, or, on returning to the whole file, around the person whose branch it
showed.

#### Scenario: Opening on a small file
- **WHEN** the graph of `curie.ged` is shown in a tab 1 400 pixels wide
- **THEN** every card of the file is in view, with its name

#### Scenario: Far out
- **WHEN** the reader zooms out until names could not be read
- **THEN** the cards are drawn as coloured boxes without names or years

#### Scenario: A drag that begins on a card
- **WHEN** the reader presses on Marie's card, moves the pointer and releases it
- **THEN** the graph has moved, and Marie is not selected

#### Scenario: Choosing a branch
- **WHEN** the tab of `curie.ged` had Marie selected when it was switched to Graph
  mode and the reader chooses Irène's branch, and then returns to the whole
  file
- **THEN** the view is centred on Irène's card both times, at a readable size

#### Scenario: An edit keeps the view
- **WHEN** the reader has moved and zoomed the graph and then corrects a date in
  the source and returns to Graph mode
- **THEN** the graph shows the correction at the same position and zoom

#### Scenario: Another mode and back
- **WHEN** the reader has moved and zoomed the graph, switches to Timeline mode
  and then back to Graph mode
- **THEN** the graph is at the same position and zoom, and was not laid out again

#### Scenario: The search and the zoom side by side
- **WHEN** the graph of `curie.ged` is shown
- **THEN** the search icon and the zoom out, zoom in and Fit buttons are in one bordered box
  in the top corner of the canvas, the buttons to the right of the icon, and none is
  at the bottom of the canvas

#### Scenario: The buttons of the box are one size
- **WHEN** the search and the zoom buttons are shown
- **THEN** the search icon and the zoom out, zoom in and Fit buttons are squares of one size, at least 44
  pixels on a phone

#### Scenario: The zoom on a phone while the search is open
- **WHEN** the reader opens the search on a phone
- **THEN** the zoom buttons are hidden while the field is open, so it has the room to be used, and are
  shown again when it closes

### Requirement: The graph holds up at size

The graph of a file of any size shown whole SHALL be laid out within a time
budget — the ordering of the cards stops improving after a quarter of a second
and the placing after half a second, keeping the best found — and SHALL always
finish, however tangled the file, once for each reading of the file and scope:
pointing, dragging, zooming and searching SHALL NOT lay it out again. The graph SHALL draw
only the shapes in view and near it, and SHALL keep up with the pointer.

#### Scenario: A file of 10 000 people
- **WHEN** a file of 10 000 people is shown whole in a view of 1 400 by 900
  pixels, and the reader drags, zooms and points at people
- **THEN** its layout stopped improving within its time budget and finished, the
  highlight follows the pointer
  without a visible delay, the graph holds no more than a few hundred cards at
  its opening size, and no more than a few thousand shapes after **Fit**

### Requirement: The graph on a phone

On a phone the graph SHALL fill the screen's width, with no title or summary above the
canvas, as the timeline of the file has none; the search icon SHALL be at least 44
pixels square. The graph SHALL show no legend. Dragging with
one finger SHALL move it and pinching with two SHALL zoom it; neither SHALL
activate what it began on. Touching a card SHALL light that person and their
family as pointing does and offer their **Branch**; touching it again SHALL select the person as activating does on a desktop, and
open the right drawer on their card. Touching a family node SHALL show
its details, with the way to the family's card. Touching empty space SHALL put
the light out.

#### Scenario: Touching Marie's card
- **WHEN** the reader touches Marie's card on a phone, and then touches it again
- **THEN** her family is lit, and then Marie is selected and the right drawer
  shows her card

#### Scenario: Pinching
- **WHEN** the reader pinches the graph on a phone, beginning with a finger on a
  card
- **THEN** it zooms around the point between the two fingers, the card's person
  is not selected, and no page of the app scrolls or zooms with it

### Requirement: The graph is a mode of the file's tab

A GEDCOM tab SHALL offer a **Graph** mode that shows the whole of its file as
the graph of the file, in the tab itself, with no tab of its own. The tab SHALL
enter it from the mode control in its header, from a command, and from the tab's
menu, as the requirement on the mode control of a GEDCOM tab says. Entering it
SHALL NOT open another tab.

The graph SHALL show the file as the tab holds it, including text typed in the
tab and not yet saved, and SHALL show every later change to it: at once while the
tab is in view, and the next time it is brought into view otherwise. It SHALL
keep its scope, position and zoom across leaving the mode and coming back and
across closing and reopening the workspace, and SHALL stay on the file when it is
renamed or moved, as the tab does.

Nothing in the graph SHALL write to the file.

#### Scenario: Choosing it from the mode control
- **WHEN** `curie.ged` is open in Source mode and the reader chooses Graph from
  the mode control in its header
- **THEN** the same tab shows the graph of `curie.ged`, with a card for each of
  its 17 people in four generations, and no new tab is open

#### Scenario: An edit not yet saved
- **WHEN** the reader changes Marie's year of death to 1935 in Source mode, the
  file is not yet saved, and the reader switches to Graph mode
- **THEN** her card in the graph reads `1867–1935`

#### Scenario: Changed on disk while out of view
- **WHEN** a tab in Graph mode is behind another tab and the file is changed on
  disk so that Marie's year of death is 1935, and the reader brings the tab to the
  front
- **THEN** her card reads `1867–1935`

#### Scenario: The file is renamed
- **WHEN** the tab of `curie.ged` is in Graph mode and the file is renamed to
  `family.ged`
- **THEN** the tab is named `family.ged` and still shows the graph

#### Scenario: Leaving the mode and coming back
- **WHEN** the tab is in Graph mode on Irène's branch, zoomed in and moved, and
  the reader switches to Timeline mode and then back to Graph mode
- **THEN** the graph shows Irène's branch at the same zoom and position

#### Scenario: Restored with the workspace
- **WHEN** a tab of `curie.ged` is in Graph mode on Irène's branch, zoomed in and
  moved, and Obsidian is restarted
- **THEN** the tab shows the graph of Irène's branch at the same zoom and position

### Requirement: The find key opens the graph's search

In Graph mode the editor's find — the command **Find**, and the key Obsidian
dispatches to the tab for it — SHALL open the search of the graph: the icon
floating over the canvas expands into the field, which takes the focus. Where
the field is already open it SHALL only take the focus. It SHALL NOT open the
editor's search panel or change the mode. Replace SHALL NOT be offered.

#### Scenario: Find with the search closed
- **WHEN** the tab of `curie.ged` is in Graph mode with the search closed and the
  reader presses the find key
- **THEN** the icon is replaced by the field, and the field has the focus

#### Scenario: Find with the search open
- **WHEN** the search is open with `joliot` typed and the focus is elsewhere in
  the graph, and the reader runs **Find**
- **THEN** the field keeps its text and takes the focus

### Requirement: A card or a node selects a record

Activating a person's card SHALL select that person: the tab SHALL stay in Graph
mode, SHALL open no page and no other tab, and the card SHALL be marked as selected
and shown in the record card of the right sidebar. The graph SHALL NOT move when it
is a card of the graph that was activated: the reader is looking at it. Activating
a family node SHALL select that family the same way, and show it in the record
card; no card is marked while a family is selected.

Every card and family node drawn SHALL be reachable with the keyboard, in the
order of the rows and, within a row, from left to right; SHALL say whom it
shows to assistive technology; and SHALL be activated with Enter or Space. A
card's **Branch** choice SHALL be reachable with the keyboard too. A card or node
given the focus SHALL be brought into view.

#### Scenario: From the graph to Irène's card
- **WHEN** the tab of `curie.ged` is in Graph mode and the reader activates Irène's
  card
- **THEN** the tab is still in Graph mode with Irène's card marked selected, the
  record card shows Irène Joliot-Curie, and no other tab has opened

#### Scenario: The graph stays where it is
- **WHEN** the reader has zoomed the graph until Marie's card is at its edge, and
  activates her card
- **THEN** her card is marked selected and the graph has not moved

#### Scenario: From a family node
- **WHEN** the reader activates the node between Pierre Curie and Marie
- **THEN** the tab is in Graph mode, the record card shows the Curies' family, and
  no card is marked selected

#### Scenario: From the keyboard
- **WHEN** the reader moves the focus to Marie's card and presses Enter
- **THEN** Marie is selected and the record card shows her

### Requirement: A person's card is marked as selected

The graph SHALL mark one person's card as **selected** when the person is the
tab's selected record, however it was selected: by activating a card, from a
row of the list, from the record card, by a link or by the cursor in Source mode. Where
the selection came from outside the graph, the view SHALL centre on the card at a
readable zoom, gliding there rather than jumping unless the reader has asked for
reduced motion or the card is further away than a glide can show without a streak,
as stepping to a match does; where it came from activating a card of the graph, the
view SHALL NOT move. A selection made from outside the graph while the tab was behind another tab, in another mode or not yet drawn SHALL, when the graph is shown, centre on the card; one that the reader switched into the view with, SHALL also centre on the card, as the reader has just chosen this view; one restored with the workspace SHALL mark the card without moving a view that has a position. The mark SHALL be unlike the light of pointing and unlike the ring of the
search's current match, SHALL stay while the pointer lights other people and while
the reader searches, and SHALL stay until another record is selected or the
selection ends. Where the person is not in the branch shown and the view is asked
to move to them, the graph SHALL show their branch, with the way back to the whole
file. The selection SHALL belong to the person, not to what is drawn: a card out of
view, outside a scope the reader has narrowed, or absent from a text that has
changed SHALL show the mark again when it is drawn, and every card of a person drawn
more than once SHALL carry it. Searching, and changing the scope, SHALL NOT end it.
Selecting SHALL NOT open a page, change the mode or write to the file.

#### Scenario: Selecting Pierre from the list
- **WHEN** the tab is in List mode, the reader activates Pierre Curie's row, and then
  switches to Graph mode
- **THEN** his card is marked selected and centred, and the record card shows him

#### Scenario: Selecting Pierre from the record card
- **WHEN** the tab is in Graph mode and the reader activates Pierre Curie among
  Marie's relatives in the record card
- **THEN** his card is marked selected and the graph glides to it

#### Scenario: The mark outlasts hover and search
- **WHEN** Pierre Curie is selected, the pointer rests on Marie's card and the
  reader types `joliot` and presses Enter
- **THEN** Pierre Curie's card still carries the selected mark, apart from the
  light on Marie's and the ring on Frédéric's

#### Scenario: A card out of view and back
- **WHEN** Pierre Curie is selected and the reader moves the graph until his card
  is out of the drawn window, and then back
- **THEN** his card carries the selected mark again

#### Scenario: Another selection
- **WHEN** Pierre Curie is selected and the reader activates Irène's card
- **THEN** only Irène's card is marked selected

#### Scenario: A person outside the branch
- **WHEN** the graph shows Marie's branch with zero generations of ancestors and
  zero of descendants and the reader follows `[[curie.ged#@I16@]]`
- **THEN** the graph shows Hélène's branch, with her card selected

#### Scenario: Selected while the tab is behind another
- **WHEN** a tab in Graph mode is behind another tab and the reader follows
  `[[curie.ged#@I2@]]`, and then brings the tab to the front
- **THEN** the graph shows his card selected and centred, and no page was opened

#### Scenario: Selected in Source and then shown
- **WHEN** the reader follows `[[curie.ged#@I2@]]` while the tab is in Source mode,
  and then switches to Graph mode
- **THEN** his card is marked selected and the graph is centred on it

#### Scenario: Switching to Graph mode with a selection
- **WHEN** Marie is selected, the graph was zoomed in and moved, the reader
  switched to Timeline mode and then back to Graph mode
- **THEN** Marie's card is marked selected and the graph is centred on it

#### Scenario: Restored with the workspace
- **WHEN** Marie is selected in a tab in Graph mode, zoomed in and moved, and
  Obsidian is restarted
- **THEN** the graph is at that zoom and position, with Marie's card marked
