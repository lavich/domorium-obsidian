## Context

The timeline of the file (#194, archived as `2026-11-04-add-file-timeline`) put
the first overview in place, and this change follows it closely:

- `src/desk/fileTimeline.ts` builds, once per `GenealogyIndex` (`fileTimelineOf`,
  a `WeakMap`), a model of the file with no DOM: per person sex, lifeline,
  parents, spouses and children; per family spouses, children and marriage;
  `generations`, `rows`, `branch(focus, up, down)`, `related(xref)`;
  `initialFocus(index, around)` holds the 500-person rule (`LARGE_FILE`).
- `src/desk/fileTimelineView.ts` draws it (`FileTimelineBoard`) with only what is
  in view in the DOM, hover by classes, a scope bar with the branch steppers,
  a tooltip and a phone popover placed inside the view.
- `FileTimelineView` in `src/desk/DeskViews.ts` is an `ItemView` bound to one
  file through `state.gedcom`, with `navigation = false`, a stale flag rebuilt
  only when shown, and a host (`FileTimelineViewHost`) that `src/main.ts`
  implements: the index of a path including a closed file (a plugin-wide
  revision counter), `bringFileTab` to lead into the file's tab, staleness on
  `genealogyChanged`, `modify`, `create` and `delete`, `rename` through
  `descendantPaths`, and detaching in `syncInterface`.
- The command `open-gedcom-file-timeline` in `src/commands.ts` gives the palette
  and the pane menu; `GedcomView` has a `calendar-range` header action toggled
  with the mode switch in `showMode`.

The archived design deferred sharing: "the graph change will extract what both
need, from code that then exists twice, rather than guess now". This is that
change.

The mockup is `docs/design/file-graph.html` on `lavich/design-file-timeline`
(PR #188, not merged). Its `layout()` is the algorithm the user accepted, and
its measurements in headless Chrome are: layout 452 ms for 10 000 people in the
worst synthetic case, with 767 000 crossings left; hover about 0 ms by classes;
tens of shapes in the DOM at the start. Its crossing count compares every pair
of lines between two rows, O(E²) per row.

Measured for this design, in Node 22 on the author's machine, with the mockup's
`layout()` ported onto the repository's `buildFileTimeline` model (a scratch
script, not committed):

| File | Read + model | Layout, mockup's count | Layout, counted by sorting | Crossings, first → kept |
| --- | --- | --- | --- | --- |
| `curie.ged` | — | — | — | 0 → 0 |
| The timeline spec's generated 10 000 | 390 ms | 60 ms | 48 ms | 0 → 0 |
| 10 000, random marriages, 15 % remarried | 415 ms | 444 ms | 197 ms | 1 905 414 → 1 481 552 |
| 10 000, two generations, 7 000 children of 1 500 couples married at random | — | 1 146 ms | 145 ms | 6 172 703 → 3 033 552 |

Both counts agree in every case. With 8 sweeps instead of 24 the third case
takes 97 ms and keeps 1 482 302 crossings: the later sweeps buy little.

None of the generated files had a line spanning more than one row, so the cost
of lanes is not in these figures.

## Goals / Non-Goals

**Goals:**
- The graph of the mockup, its layout and its behaviour, in a tab of its own,
  with the timeline's plumbing rather than a copy of it.
- A layout that knows nothing of Obsidian or the DOM, tested on its own, and
  that stays under a second for 10 000 people whatever their marriages.

**Non-Goals:**
- Changing the timeline's behaviour. Its code moves onto shared pieces; its
  spec is untouched, and its tests change only where task 1.3 lists: the
  lifeline-years tests in `src/desk/fileTimeline.test.ts`, the scope bar's in
  `src/desk/fileTimelineView.test.ts`, `src/commands.test.ts` and
  `tests/fileTimeline.spec.ts`.
- A Web Worker. The layout is a few hundred milliseconds at the worst measured
  and runs once per reading and scope; a worker would mean bundling a second
  entry and copying the model across.

## Decisions

The user's answers of 2026-11-04 are recorded in the proposal. Choices marked
**(mine)** were not made by the user and are open to their review; everything
else follows the user's decisions or the mockup.

### The model is the timeline's, read as it is

The graph reads `fileTimelineOf(index)`: people with sex, parents, spouses and
children; families with spouses, children and marriage; `generations`, `rows`
(the starting order of each row), `branch` and `related`. Nothing is added to
the model. `initialFocus` and `LARGE_FILE` serve the graph unchanged.
Alternative: a separate graph model. Rejected: it would read every person
again and could drift from the timeline's generations and branch.

The file stays `fileTimeline.ts` and the type `FileTimeline` **(mine)**:
renaming it to a neutral name touches every timeline file for no behaviour.

### `src/desk/fileGraph.ts` lays out a model and a scope, with no DOM

`layoutFileGraph(model, scope, clock)` returns plain values: for each card its
person, row, x and y; for each family node its family, position, marriage year
or none, and the cards it joins; for each line its family, child, parents and
the points it passes through; the size, the number of rows and the crossings
kept. It is the mockup's `layout()` and `scene()`, with these decisions:

- **No spreads or recursion over the file.** Minima and maxima use `least` and
  `most` from `fileTimeline.ts`, never `Math.min(...list)`, and the walk along
  a chain of spouses is a loop with an explicit stack, so a block or a row of
  thousands cannot overflow the call stack.
- **Rows.** A person's row is their generation in the model. Generations with
  no one in the scope are dropped, so a branch has no empty rows **(mine; the
  mockup left Marie's 0/0 branch with an empty row above it)**.
- **Blocks.** People joined by marriage within one row form a block, walked
  from an end of the chain, so someone married twice stands between two
  spouses; the block is reversed when that makes more neighbouring pairs read
  husband on the left. Cards are 168 by 46 pixels, 36 apart within a block, 72
  between blocks, rows 130 apart, as in the mockup.
- **Anchors.** A line leaves a block at the gap between two neighbouring
  spouses and meets a block at the child's own card centre. This is what puts
  a husband's parents to the left and a wife's to the right.
- **Lanes.** A line spanning rows gets a 10-pixel lane in each row between,
  20 pixels from its neighbours, which takes part in ordering like a block.
  Their number is not bounded: one per line per row crossed.
- **Order.** Each row starts in the model's `rows` order; barycentre sweeps
  alternate downward and upward, and the order with the fewest crossings seen
  is kept. Sweeps stop at 24, at zero crossings, after 4 sweeps without
  improvement, or once the sweeps have taken 250 ms **(mine: the last two
  bounds)**. The clock is passed in, so a test can run the budget out.
- **Counting crossings.** Between two rows, lines are sorted by their upper
  end and the crossings counted as inversions of their lower ends with a
  Fenwick tree, O(E log E), with lines sharing an end not counted, as the
  mockup's strict test does. Alternative: the mockup's pairwise count.
  Rejected: 1.1 s on its own on the wide case above.
- **Coordinates.** Forty alternating passes pull each block towards the mean of
  the anchors it is joined to, keeping the order and the gaps, as the mockup
  does.
- **Family nodes.** Between neighbouring spouses, at mid-height, radius 11 with
  the year's last two digits after an apostrophe, or radius 6 and hollow when
  the marriage is undated. A year before the common era gets a filled node
  with no digits, since two digits cannot say BCE; the tooltip gives the date
  **(mine)**. Where spouses in one block are not neighbours (a third marriage),
  the node sits just below the block midway between them, joined to both
  cards from below, and their lines leave from it **(mine; the mockup drew it
  across the card between)**. Where spouses stand in different rows, the node
  sits on a curve from the upper spouse's card to the lower one's, and the
  family is anchored at the upper spouse for the layout **(mine; the mockup
  joined them by nothing)**. A family with one parent in scope has no node;
  its lines leave from the bottom of that card.
- **Lines.** A cubic curve through the anchor and each lane, vertical at both
  ends, as the mockup's `curve()`.

`fileGraphOf(model, scope)` holds the last four layouts of each model in a
`WeakMap` keyed by the model **(mine)**. The key within it is normalised: the
whole file is one key whatever `up` and `down` say, and a focus the model does
not know counts as the whole file, as the timeline treats it. Switching back
and forth between a branch and the whole file costs nothing; an edit makes a
new index and so a new model.

### `src/desk/fileGraphView.ts` draws it, with only what is in view in the DOM

`FileGraphBoard` mirrors `FileTimelineBoard`:

- **The view.** A transform `{ x, y, k }` on the SVG's content. Zoom runs from
  0.05 to 3 **(mine; the mockup's floor of 0.2 cannot fit 500 people)**.
  **Fit** shows the whole scope at a scale of at most 1.4; where the whole scope
  needs less than 0.05, it shows the scope's centre at 0.05 **(mine)**, so the
  number of shapes in the DOM stays bounded by the view's size. Going below the
  floor with boxes only was rejected: at 10 000 people it would put every card
  in the DOM.
- **What is saved.** The view is saved as the graph point at the centre of the
  canvas and `k` **(mine: a centre, not an offset, so a tab of another size
  shows the same place)**, in the state with the scope and `around`.
- **When the view is set.**
  - *First show*: the saved view if the state has one; otherwise the opening
    view — fitted when Fit's scale is at least 0.55, else 0.6 centred on the
    first of these that is shown: the card of `around`, the card of the
    branch's person, the first card of the top row **(mine; the mockup went to
    the top left)**. It is computed only once the canvas has a non-zero size: a
    graph opened in a background tab waits for `onResize`.
  - *A new model with the same scope* (an edit, a rename): the view is kept.
  - *A change of scope* (Branch, the steppers, Whole file): 0.6 centred on the
    card of the new focus; on **Whole file**, on the card of the focus just
    left. `around` plays no part, and there is no fitting.
  - *Revealing an open graph*: nothing changes.
- **`around` is in the state.** The opener always passes the person of the tab
  it was opened from, whatever the size of the file, so the opening view can
  centre on them on first show; `initialFocus` still decides whether there is
  a branch.
- **Drawing.** `draw(window)` takes the window in graph coordinates as an
  argument rather than measuring the DOM, so a happy-dom test can drive it. It
  draws the items meeting the window extended by one window on each side, or a
  quarter window when zoomed out past 0.35 **(mine)**, where cards are drawn as
  boxes without text. Elements are built with `createElementNS`, never
  `innerHTML`, and kept between draws by item: an item still in range keeps its
  element, so the focus and the highlight survive a redraw, and the focused item
  is never dropped. Two layers: the lines, then the nodes and cards, which a new
  element joins at its place in row order, not at the end. A transform change
  asks, in an animation frame, whether the view has left the drawn window or
  crossed 0.35, and only then draws.
- **Hover.** Maps filled while drawing find a person's card, the lines whose
  child or parent they are, and the family groups they are a spouse or child
  in; `on` and `hl` classes are set on those and a class on the board fades the
  rest, as in the mockup. The family node's tooltip and the phone popover use
  the timeline's placing, moved to `src/desk/dom.ts`.
- **Search** **(the user's; its details mine)**. An input in the toolbar, as the
  timeline's, matching a person's names: non-matching cards get a fading class.
  The matches are listed in row order, left to right, from the layout, not
  from the DOM, so Enter can move the view to a card not drawn yet; each Enter
  centres the next at the current zoom, or at 0.6 when zoomed out past 0.35,
  and lights it. Searching neither lays out nor redraws more than moving does.
- **Pointer** **(mine)**. A press anywhere, a card or node included, becomes a
  drag once it has moved 4 pixels; it then takes pointer capture, and the click
  that follows the release is swallowed, so a drag is never an activation.
  Two pointers down pinch around their midpoint, and the click after a pinch
  is swallowed too. The wheel: with `ctrlKey` (a trackpad's pinch, or
  Ctrl+wheel) it zooms at the pointer; without it, an event with a horizontal
  delta, or a vertical delta under 40 pixels in pixel mode, is a trackpad's
  scroll and pans; anything else is a mouse wheel and zooms at the pointer, as
  the user asked. The listener is non-passive and calls `preventDefault`. The
  canvas has `touch-action: none`.
- **Activating.** A card calls `openRecord(xref)`; a family node calls
  `openRecord(familyXref)`, which leads to the family page. On a phone, as in
  the timeline, the first touch lights the person and shows their Branch pill,
  the second opens them; a touch on a node opens a popover with its details
  and **Open the family**; a touch on empty space puts the light out. A click
  with `detail` 0 and no pointer type is the keyboard's, never a touch.
- **Keyboard** **(mine)**. Each card is an SVG group holding two focusable
  children with `tabindex="0"` and `role="button"`: the card, labelled with
  name and years, and its Branch pill, shown while the pointer is on the group,
  the group has the focus (`:focus-within`) or the card is armed. Each family
  node is focusable too, labelled with the spouses and the marriage year,
  since it now opens the family's page. They sit in the DOM in row order, left
  to right, so Tab walks a row; each family node comes right after its left
  spouse, or its upper spouse where the two stand in different rows, which also
  places the node of a third marriage and of a marriage across rows. An SVG
  element with `role="button"` gets no click from the keyboard, so a `keydown`
  handler on the board activates the focused card, pill or node on Enter or
  Space, calling `preventDefault` so Space does not scroll; focus lights as
  hover does; a focused element partly out of view pans the view to show it.
  **+**, **−** and **Fit** are buttons.
- **Icons** are handed in as a function, as in the timeline.

### Shared with the timeline

What now exists twice is extracted, and the timeline moved onto it:

- `src/desk/branchScope.ts`: `BranchScope { focus?, up, down }`, its reading
  from saved state (clamped to 0–9, default 2) and the scope bar — "Whole file ·
  N people", "Branch of X · n of N", the two steppers and **Whole file** — with
  its focus kept across redraws. The caller hands in the class prefix, so the
  timeline keeps `gedcom-ft-scope`, `gedcom-ft-step*` and `gedcom-ft-whole`,
  its CSS and its tests' selectors, and the graph gets `gedcom-fg-*`; the
  `data-step` and `data-whole` attributes are the same. The caller hands in its
  help text too: the timeline says "a person's row", the graph "a person's
  card". `readTimelineState` stays exported, built on it.
- `src/desk/labels.ts`: the years of a lifeline (`≈`, an open end, BCE through
  `yearText`), moved from `fileTimelineView.ts`.
- `src/desk/dom.ts`: placing a tooltip or popover inside a root, above the point
  where it would pass the bottom edge.
- Strings both use move from `fileTimeline.*` to `overview.*` keys: the scope
  bar's counts, Branch and its hint, the steppers, the legend's three sexes,
  and the "no longer in the vault" message. Each view keeps its own help text.
  Counts go through `plural()`, which gives Russian its three forms.

### Reading a closed file is a module of its own

The bookkeeping now in `src/main.ts` — the plugin-wide revision counter, the
revision per path, the revision a reading was made at, the paths being opened,
forgetting a path, which overviews show a path — moves to a new
`src/vault/overviewReads.ts` with no `obsidian` import, tested in
`src/vault/overviewReads.test.ts`. It is handed a function listing the open
overviews as `{ type, gedcom, view }` for both view types, and answers:

- `shows(path, except?)`: whether any overview of either type shows the path,
  leaving out a view being closed;
- `opening(path)` and its release: a **count** per path, not a set, since a
  timeline and a graph of one path can be opening at once;
- `modified(path)`: a new revision, if anything shows the path;
- `closed(path, view)`: forget the path when no other overview shows it;
- `went(path, folder)` on delete and create: forget every path under it;
- `moved(from, to, descendants)`: the mapping of old paths to new ones that
  the rename handler applies to every overview's state.

`main.ts` keeps the vault reads, the `IndexCache` and the events, and calls it.

### The view and the host

- `FileOverviewView` in `src/desk/DeskViews.ts` holds what the timeline view
  does today apart from its board: `navigation = false`, `state.gedcom` (not
  `file`, so `shownFilePath` does not take it for a tab of the file), the stale
  flag and the `asked` counter, `refresh` only when shown, `onResize`,
  `onClose`. `FileTimelineView` and a new `FileGraphView` extend it, each
  creating its board and reading its own state. `FileGraphView` has view type
  `domorium-file-graph`, display text "Graph of {name}", and state
  `{ gedcom, focus?, around?, up, down, view? }`.
- The host interface becomes `FileOverviewHost`: `overviewIndex(path)`,
  `openRecordIn(path, xref)`, `showSourceIn(path, range)` and
  `overviewClosed(path, view)`.
- In `src/main.ts` the plumbing serves both view types
  (`OVERVIEW_VIEW_TYPES`) through `overviewReads`: opening
  (`openOverview(kind, path, around)`, matched on type and `state.gedcom` so a
  deferred leaf is found), the closed-file reading, which a timeline and a graph
  of one path share, staleness, rename, delete, and `syncInterface`, which
  detaches both. `bringFileTab` and `openFromIndex` serve both unchanged.
- One signature, kind first, everywhere: `CommandHost.openOverview(kind, path,
  around)` and `GedcomViewHost.openOverview(kind, view)`, with `kind`
  `"timeline"` or `"graph"`; they replace `openFileTimeline` on both.
- `src/commands.ts`: `open-gedcom-file-graph`, "Open the graph of the file",
  with the timeline's gate (a file and `genealogyInterface()`).
- `GedcomView`: a header action for the graph, toggled with the mode switch and
  the timeline action in `showMode`.

### Icon: `network`

The user chose `network` (2026-11-04). What the installed app holds, read from
`/Applications/Obsidian.app/Contents/Resources/obsidian.asar` (1.8.9) and
`~/Library/Application Support/obsidian/obsidian-1.15.0.asar`:

- `git-fork` is Obsidian's own graph-view icon: the bundle maps `graph-glyph`
  (and `dot-network`) to it. Using it would make the plugin's graph look like
  Obsidian's in the header and the tab.
- `network`, `waypoints`, `workflow` and `chart-network` are lucide icons
  defined in both bundles.

The icon is one constant, `FILE_GRAPH_ICON`, used by the view, the command and
the header action. The icons and colour variables were checked on the 1.8.9
bundle, not on 1.8.7, the minimum; task 6.1 confirms them on 1.8.7.

### Colours (mine)

- Card side bar: `--color-pink`, `--color-blue`, `--text-faint`, as the
  timeline's lifelines. Card tint: `rgba(var(--color-pink-rgb), 0.14)`,
  `rgba(var(--color-blue-rgb), 0.12)`, `rgba(var(--mono-rgb-100), 0.08)`. Card
  border `--background-modifier-border`, the person of a branch and a focused
  card `--interactive-accent`. Lines `--text-faint`; spouse lines and nodes
  `--interactive-accent`; the node's digits `--text-on-accent`; lit lines and
  borders `--text-accent`. All are in the 1.8.9 bundle. `styles.css` already
  tints with `rgba(var(--color-orange-rgb), 0.12)`; the pink, blue and mono
  `-rgb` variables are new to it.

### What the header shows (mine)

The scope bar, the search, **+**, **−**, **Fit**, and a summary of people and
families. The mockup's "N crossings left" and "read N ms" are a mockup's
diagnostics and are not shown. The legend has the three sexes and the two kinds
of node. On a phone, as the timeline: the title is hidden (the tab names the
file) and the legend folds behind a **Legend** button.

### The person page's tree on the graph's pieces

Added at the user's request (proposal): the tree keeps its people and is drawn
by the graph.

- **Who is in it** stays the old `layoutTree`'s composition, moved to a new
  `src/desk/personTree.ts` that answers not positions but an input to the
  graph's layout: cards (with the row, sex, name, years and marks of each) and
  families (spouses, children, marriage year, the family record a node opens).
  A card's id is its own, not the person's identifier, because one person can
  stand in the tree twice, as a cousin marriage makes.
- **The layout** is split: `layoutGraph(input, clock)` is everything
  `layoutFileGraph` did after reading the model, and `layoutFileGraph(model,
  scope)` builds its input from the model and calls it. The tree calls
  `layoutGraph` with rows −2…2. Blocks, husband-left, anchors, lanes, sweeps,
  pulls, the squeeze of empty columns and the bends all serve both.
- **Husband-left and the first spouse (mine).** The old tree put a first spouse
  to the person's left when there was a second. In a chain of three — a person
  between two spouses — the two orientations always score the same by sex and
  by HUSB role, one pair reading husband-left either way. Where they tie the
  layout now keeps the first-listed spouse on the left, for the tree and the
  file alike: Anna between Bert and Carl, a man between his first and second
  wife. `curie.ged` has no one married twice, so nothing in it moves by this
  rule; what moves is Marie's own pair, Pierre now to her left, with her
  siblings and parents to her right and his to his left.
- **Drawing.** The canvas — the SVG, drawing only what is near the view, hover
  by classes, pan, zoom, pinch, the keyboard, touch, the node's tooltip and
  popover — moves out of `FileGraphBoard` into `src/desk/graphCanvas.ts`, fed a
  layout and a description of each card and family. `FileGraphBoard` keeps its
  header, search, scope bar and legend; the tree's view
  (`src/desk/personTreeView.ts`) puts the canvas in the page at a fixed height,
  with **+**, **−**, **Fit** and a legend. The tree's cards have no Branch pill.
- **Marks (mine).** The focus is drawn as the graph's branch person is, a
  thicker accent border; no source is the old warning dot at the top right of
  the card; relatives beyond the edge are ▲ above the card and ▼ below it; a
  sibling, or the run of them, is faded as before; the run is a grey card
  saying how many, which unfolds them when activated.
- **Opening (mine).** Each drawing of the tree — and the page draws it again on
  each new focus — opens fitted where that is readable, else at 0.6 centred on
  the focus, by the graph's rule with the focus as the tab's person. Nothing is
  saved: the old tree saved no scroll either.
- **Lighting** reaches the people the tree joins to the card — the spouses and
  children of its families and the parents of the family it is a child of —
  computed from the input, so a person standing twice lights each place.

### The scope line and Branch as a toggle

From the demo vault (proposal). The scope bar draws nothing, and is hidden,
while the whole file is shown; its help text goes, with its two strings, and the
count of people stays in the subtitle. Branch on the person whose branch is
shown returns to the whole file through the same path as **Whole file**, so the
view follows the rule for it: centred on the person just left. The Branch of
that person carries `aria-pressed="true"` and stays shown — the graph's pill on
the card, the timeline's button on the row — in the pressed look of the theme's
accent; every other Branch carries `aria-pressed="false"`. On a phone the
pressed pill is shown, so a touch on it acts at once rather than first lighting
the card.

## Risks / Trade-offs

- **Layout time on a phone.** A phone is several times slower than the
  measurements. → A file over 500 people opens on a branch; the sweep budget
  bounds ordering; **Whole file** on a very large file is the reader's choice.
- **Lanes are unbounded and unmeasured.** A file where many lines span several
  rows adds a lane per line per row, which lengthens ordering and widens rows.
  → The tangled generator of the browser spec includes marriages across
  generations, so the one-second bound covers lanes.
- **Far out on a large file.** At the zoom floor a 10 000-person graph can bring
  a few thousand shapes into view. → No text far out, a quarter-window margin,
  Fit stopping at the floor, and the browser spec bounds the count after Fit at
  1 400 by 900.
- **Telling a mouse wheel from a trackpad** is a heuristic: a mouse with smooth
  scrolling can be taken for a trackpad and pan. → Ctrl+wheel and the buttons
  always zoom; the thresholds are constants checked on the demo vault in 6.1.
- **The budget makes the order depend on speed.** Two machines can keep
  different orders for a huge, tangled file. → The best order found is kept;
  for files the size of the user's 111 people the sweeps end on their own long
  before 250 ms.
- **Barycentre is a heuristic.** Crossings remain in tangled files (the mockup
  kept 767 000 at 10 000 people). → It is what the user accepted; a better
  method can replace the ordering behind the same layout API.
- **SVG focus.** `tabindex` on SVG elements works in Chromium and WebKit, which
  are Obsidian's desktop and iOS engines. → Covered by the browser spec in
  Chromium; the phone check in 6.1 confirms it on the app.
- **Shared code moves under the timeline.** → Its spec does not change, and its
  unit tests and browser spec run with only the changes task 1.3 lists.

## Migration Plan

None: a new view and a new command. A saved workspace holding a graph leaf
after a rollback is dropped by Obsidian. The renamed string keys are internal.

## Implementation

- **Transposing neighbours.** Barycentre sweeps alone made the tangled
  generated files worse than the starting order within the four idle sweeps
  (600 people: 1 814 crossings at the start, more after each of the first four
  sweeps). After each row is sorted, and once on the starting order, neighbours
  are swapped wherever that crosses fewer lines to the rows above and below —
  an exact local count, so it never adds a crossing. 600 tangled people now end
  at 1 667, 10 000 at 160 000 of 372 000, in about 180 ms in Node.
- **Lines turn only between rows.** The mockup's curve from the node straight
  to the child travels sideways through the parents' row for a long line, behind
  the cards beside it. A line now drops straight out of the parents' row, runs
  straight down each lane from above its row to below it, and drops straight
  into the child's row; it curves only in the gaps. `GraphLine` carries these
  points and, separately, its `lanes`.
- **A person joined to no one** (Kazimierz Żorawski in `curieWithEvents()`)
  is pulled to stand beside their neighbour in the row; left where the row was
  first packed, they ended 2 400 pixels to the right of everyone else as the
  joined blocks moved.
- **A node across rows** sits midway on the curve only where the spouses are
  one row apart; further apart, the midpoint would land on a card of the row
  between, so the node sits in the gap under the upper spouse and joins the
  lower one from there. Lines from it drop the lanes above it.
- **Lanes are bounded** (review): the lines of one family share one lane per
  row, and lanes stop at four per person shown, past which a line is drawn
  without them. A deep line of descent with 500 sons marrying near its bottom
  made 125 000 lanes before; it now makes 250 and lays out well under the
  test's two seconds. A child who stands no lower than a parent, as a loop in
  the file makes, gets no line.
- **The clock** (review) is read before the first transpose, before each row
  inside a sweep, and before each pulling pass: the ordering stops at 250 ms
  and the pulling at 500 ms from the start, keeping the best order and valid
  positions wherever it stops. A sweep cut short still counts as one.
- **Narrowing** (review). Capping the gap between neighbours within each row
  was tried and rejected: at a cap of two cards it took tangled(300) from
  87 814 to 53 230 pixels but its median line from 757 to 12 096, since rows
  lost their alignment with each other. Instead every stretch of x empty in
  all rows is shortened to two cards, the same for every row. tangled(300):
  87 814 → 49 893 pixels wide, its widest row packed being 50 160, median line
  712 → 757; tangled(2000): 249 312 → 228 479 (228 960 packed), median 8 102 →
  7 496. Both are now about as narrow as their widest row allows, so Fit still
  stops at the floor for 300 such people: 150 cards in one generation need a
  scale of 0.035 to fit 1 400 pixels.
- **Bends** (review). Where the long lines of two or more families cross one
  gap, each family's cross at a height of its own, ranked by where the family
  stands, four pixels apart; past twelve families the heights repeat, never for
  neighbours. A gap with one family's long lines keeps the plain curve.
- **Who stands left** where neither spouse states a sex is read from the
  family: its first spouse, the HUSB, stands left.
- **The layouts held** are the four last asked for, not the four last made.
- **The view base class** is not generic: `FileTimelineView` and
  `FileGraphView` each keep their own board, which `instanceof` on a generic
  class could not type without `any`.
- **Icons.** `FILE_TIMELINE_ICON` and `FILE_GRAPH_ICON` live in `src/icon.ts`,
  since `src/commands.ts` may not import `DeskViews` (it imports `obsidian`).
  `OverviewKind` is in `src/commands.ts`. The header reads, left to right, the
  timeline, the graph, then the mode switch.
- **The scope bar** owns its clicks and reports the change through a callback;
  the timeline's tests that click its steppers pass unchanged.
- **Openings.** Releasing the last opening of a path that nothing shows forgets
  its reading, where `main.ts` used to keep it cached.
- **The harness** answers the time from after the file is read — the model, the
  layout and the first drawing — since reading is the read model's cost and the
  same for every view: 200 ms for the generated 10 000 and 270 ms for the
  tangled one in headless Chromium. The DOM stand-in gains `hasClass`, which the
  legends' *Legend* toggle needs; the timeline's toggle threw in the harness
  before, untested.
- **The tangled generator** takes the number of founding couples, so the
  screenshots could use a deeper 150-person file than forty couples give; the
  unit test of the ordering imports it from `tests/generated.ts`.
- **Labels.** A card's label is the name and the years joined by a comma, with
  no message of its own; a node's label gives the year ("married in 1895",
  «брак — 1895»), its tooltip the date as the file writes it.
- **Names** (review) are cut by their measured width on a canvas, by code
  point, in a 12-pixel semibold rather than the mockup's 12.5, so "Marie
  Skłodowska-Curie" (145 pixels) fits the 146 a card leaves; where no canvas can
  measure, as in a unit test, by a count of code points.
- **Pointer and focus** (review): the light goes out as the pointer moves off a
  card within the canvas and as the focus leaves the cards; a drag ends on a
  move with no button down, as when the button is let go outside; only the
  primary button drags; the hidden Branch pill takes no pointer until shown,
  and a touch on it before its card is lit lights the card; wheel events less
  than 150 ms apart are one gesture and keep the mode — zoom or pan — of its
  first; a change of scope before the canvas has a size is saved without a
  view; Branch-armed state is cleared through one place.
- **Opening** (review): an opening of an overview of a path already on its way
  is the same opening, for the timeline too, so two quick activations open one
  tab.
- **Far out** starts below 0.5 rather than 0.35. Tooltips and popovers are
  placed by their own width, in both views. The keyboard's focus ring is a
  dashed outline in the text colour, apart from hover and the branch's person.
- **Seen in the screenshots, not changed:** the opening view of a file too wide
  to fit, with no person of the tab, centres the first card of the top row, which
  leaves the upper half of the canvas empty, as specified. Lines of a tangled
  file between families far apart run in long bundles through the gaps.
