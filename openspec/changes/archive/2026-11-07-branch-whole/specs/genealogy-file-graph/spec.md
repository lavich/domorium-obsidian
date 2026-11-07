## MODIFIED Requirements

### Requirement: Pointing at a person lights their family

Pointing at a person's card, or giving it the keyboard focus, SHALL light that
card, the cards of every person of their branch — their ancestors, their
descendants and the spouses of everyone so shown — and SHALL fade every other
card, until the pointer or the focus leaves. The lines and the family nodes SHALL
be neither lit nor faded: they stay as they are. The pointer SHALL light a person
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
- **THEN** the cards of Marie, Władysław, Bronisława Boguska, Pierre Curie, Irène,
  Ève, Frédéric Joliot, Henry Richardson Labouisse, Hélène and Pierre Joliot are
  lit, and the cards of her sisters and brothers, of Eugène Curie and of
  Sophie-Claire fade, while no line and no family node changes

#### Scenario: Pointing at Hélène
- **WHEN** the reader points at Hélène's card
- **THEN** the cards of Hélène, Frédéric and Irène, Pierre Curie and Marie, and
  Eugène, Sophie-Claire, Władysław and Bronisława Boguska are lit, and Ève fades

#### Scenario: Pointing at the Curies' family node
- **WHEN** the reader points at the node between Pierre Curie and Marie
- **THEN** it shows Pierre Curie ⚭ Marie Skłodowska-Curie, married
  `26 JUL 1895` in Sceaux, France, and 2 children

### Requirement: A branch scope shows one person's ancestors and descendants

The reader SHALL be able to choose, from a person's card, to show only that
person's branch: the same people the timeline of the file shows for that person —
all their ancestors, all their descendants, and the spouses of everyone so shown.
No number of generations SHALL limit a branch and none SHALL be offered. The graph
SHALL say whose branch it shows and how many of the file's people that is,
SHALL return to the whole file on request, and SHALL show the rows of a branch
without empty rows between them. Choosing Branch again on the person whose
branch is shown SHALL return to the whole file, and that person's Branch SHALL
read as pressed while their branch is shown. While the whole file is shown, no
line about the scope SHALL be shown. A scope saved with numbers of generations
SHALL be read as the branch of its person.

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
- **WHEN** the reader shows the branch of Henry Richardson Labouisse, who has no
  parents and no children in the file
- **THEN** one row shows him and Ève

#### Scenario: Marie's branch
- **WHEN** the reader chooses Marie's branch
- **THEN** all her descendants down to Hélène and Pierre Joliot are shown, with
  their spouses, and the graph says this is 10 of 17 people, with no control for
  a number of generations

#### Scenario: A saved scope with numbers
- **WHEN** a tab is restored whose saved graph scope names Marie with `up` 0 and
  `down` 0
- **THEN** the graph shows Marie's whole branch, and the state it saves again has
  no `up` or `down`

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
- **WHEN** the graph shows Marie's branch and the reader follows
  `[[curie.ged#@I5@]]`
- **THEN** the graph shows Zofia's branch, with her card selected

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
