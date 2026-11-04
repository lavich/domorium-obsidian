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

## Goals / Non-Goals

**Goals:**
- The graph of the mockup, its layout and its behaviour, in a tab of its own,
  with the timeline's plumbing rather than a copy of it.
- A layout that knows nothing of Obsidian or the DOM, tested on its own, and
  that stays under a second for 10 000 people whatever their marriages.

**Non-Goals:**
- Changing the timeline's behaviour. Its code moves onto shared pieces; its
  spec, strings and tests stay as they are, apart from renamed shared keys.
- A Web Worker. The layout is a few hundred milliseconds at the worst measured
  and runs once per reading and scope; a worker would mean bundling a second
  entry and copying the model across.

## Decisions

Choices marked **(mine)** were not made by the user and are open to their
review; everything else follows the user's decisions quoted in the proposal or
the mockup.

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
or none, and the two cards it joins; for each line its family, child, parents
and the points it passes through; the size, the number of rows and the
crossings kept. It is the mockup's `layout()` and `scene()`, with these
decisions:

- **Rows.** A person's row is their generation in the model. Generations
  with no one in the scope are dropped, so a branch has no empty rows **(mine;
  the mockup left Marie's 0/0 branch with an empty row above it)**.
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
`WeakMap` keyed by the model, by focus, up and down **(mine)**: switching back
and forth between a branch and the whole file costs nothing, an edit makes a
new index and so a new model.

### `src/desk/fileGraphView.ts` draws it, with only what is in view in the DOM

`FileGraphBoard` mirrors `FileTimelineBoard`:

- **The view.** A transform `{ x, y, k }` on one SVG group. Zoom runs from 0.05
  to 3 **(mine; the mockup's floor of 0.2 cannot fit 500 people)**; **Fit**
  shows the whole scope, at most at 1.4. A graph opens fitted when that scale
  is at least 0.55; otherwise at 0.6, centred on the card of the person the tab
  showed when it was opened, else the first card of the top row **(mine; the
  mockup went to the top left)**. Revealing an open graph keeps its view.
- **Drawing.** `draw(window)` takes the window in graph coordinates as an
  argument rather than measuring the DOM, so a happy-dom test can drive it. It
  draws the items meeting the window extended by one window on each side, or
  a quarter window when zoomed out past 0.35 **(mine)**, where cards are drawn
  as boxes without text. Elements are built with `createElementNS`, never
  `innerHTML`, and kept between draws by item: an item still in range keeps its
  element, so the focus and the highlight survive a redraw. Lines first, then
  family nodes, then cards. A transform change asks, in an animation frame,
  whether the view has left the drawn window or crossed 0.35, and only then
  draws.
- **Hover.** Maps filled while drawing find a person's card, the lines whose
  child or parent they are, and the family groups they are a spouse or child
  in; `on` and `hl` classes are set on those and a class on the board fades the
  rest, as in the mockup. The family node's tooltip and the phone popover use
  the timeline's placing, moved to `src/desk/dom.ts`.
- **Pointer.** A press on empty space starts a drag after 4 pixels, so a click
  is never a pan **(mine)**; the wheel zooms at the pointer with
  `preventDefault` on a non-passive listener; two pointers down pinch around
  their midpoint. The canvas has `touch-action: none`.
- **Activating.** A card calls `openRecord(xref)`; a family node calls
  `openRecord(familyXref)`, which leads to the family page **(mine; the
  mockup did nothing)**. On a phone, as in the timeline, the first touch lights
  the person and shows their Branch pill, the second opens them; a touch on a
  node opens a popover with its details and **Open the family**; a touch on
  empty space puts the light out. A click with `detail` 0 and no pointer type
  is the keyboard's, never a touch.
- **Keyboard (mine).** Each drawn card is an SVG group with `tabindex="0"`,
  `role="button"` and an `aria-label` of name and years; Enter or Space opens
  it, and focus lights it as hover does. Its Branch pill is a sibling element
  after it, also focusable, shown while the card is hovered, focused or armed.
  Cards are drawn row by row, left to right, so Tab walks a row. A focused
  card partly out of view pans the view to show it; the focused item is never
  dropped by a redraw. **+**, **−** and **Fit** are buttons.
- **Icons** are handed in as a function, as in the timeline.

### Shared with the timeline

What now exists twice is extracted, and the timeline moved onto it:

- `src/desk/branchScope.ts`: `BranchScope { focus?, up, down }`, its reading
  from saved state (clamped to 0–9, default 2) and the scope bar — "Whole file ·
  N people" or "Branch of X · n of N", the two steppers and **Whole file** — with
  its focus kept across redraws. The timeline's `readTimelineState` and
  `drawScopeParts` use it.
- `src/desk/labels.ts`: the years of a lifeline (`≈`, an open end, BCE through
  `yearText`), moved from `fileTimelineView.ts`.
- `src/desk/dom.ts`: placing a tooltip or popover inside a root, above the point
  where it would pass the bottom edge.
- Strings both use move from `fileTimeline.*` to `overview.*` keys: the scope
  bar, Branch and its hint, the steppers, the legend's three sexes, and the
  "no longer in the vault" message.

### The view and the host

- `FileOverviewView` in `src/desk/DeskViews.ts` holds what the timeline view
  does today apart from its board: `navigation = false`, `state.gedcom` (not
  `file`, so `shownFilePath` does not take it for a tab of the file), the stale
  flag and the `asked` counter, `refresh` only when shown, `onResize`,
  `onClose`. `FileTimelineView` and a new `FileGraphView` extend it, each
  creating its board and reading its own state. `FileGraphView` has view type
  `domorium-file-graph`, icon `git-fork`, display text "Graph of {name}", and
  state `{ gedcom, focus?, up, down }`.
- The host interface becomes `FileOverviewHost`: `overviewIndex(path)`,
  `openRecordIn(path, xref)`, `showSourceIn(path, range)` and
  `overviewClosed(path, view)`.
- In `src/main.ts` the timeline plumbing iterates the leaves of both view types
  (`OVERVIEW_VIEW_TYPES`): opening (`openOverviewOf(type, path, around)`, matched
  on type and `state.gedcom` so a deferred leaf is found), the closed-file
  reading, which a timeline and a graph of one path share, staleness, rename,
  delete, and `syncInterface`, which detaches both. `bringFileTab` and
  `openFromIndex` serve both unchanged.
- `src/commands.ts`: `open-gedcom-file-graph`, "Open the graph of the file",
  icon `git-fork`, with the timeline's gate (a file and `genealogyInterface()`).
  `CommandHost.openFileTimeline` and `GedcomViewHost.openFileTimeline` become
  `openOverview(kind, …)` with `kind` `"timeline"` or `"graph"`, so the header
  actions, the commands and the menu share one function.
- `GedcomView`: a `git-fork` header action, toggled with the mode switch and the
  timeline action in `showMode`.

### Icon and colours (mine)

- `git-fork` is in the installed Obsidian app bundle 1.8.9
  (`/Applications/Obsidian.app/Contents/Resources/obsidian.asar`) and in the
  1.15.0 update (`~/Library/Application Support/obsidian/obsidian-1.15.0.asar`);
  `network`, `waypoints` and `workflow` are in neither. A fork reads as a family
  splitting into lines.
- Card side bar: `--color-pink`, `--color-blue`, `--text-faint`, as the
  timeline's lifelines. Card tint: `rgba(var(--color-pink-rgb), 0.14)`,
  `rgba(var(--color-blue-rgb), 0.12)`, `rgba(var(--mono-rgb-100), 0.08)`. Card
  border `--background-modifier-border`, the person of a branch and a focused
  card `--interactive-accent`. Lines `--text-faint`; spouse lines and nodes
  `--interactive-accent`; the node's digits `--text-on-accent`; lit lines and
  borders `--text-accent`. All are in the 1.8.9 bundle; the `-rgb` forms are
  already how `styles.css` tints.

### What the header shows (mine)

The scope bar, as the timeline's, and a summary of people and families. The
mockup's "N crossings left" and "read N ms" are a mockup's diagnostics and are
not shown. No legend of generations; the legend has the three sexes and the two
kinds of node.

## Risks / Trade-offs

- **Layout time on a phone.** A phone is several times slower than the
  measurements. → A file over 500 people opens on a branch; the sweep budget
  bounds ordering; **Whole file** on a very large file is the reader's choice.
- **Far out on a large file.** At the zoom floor a 10 000-person graph can
  bring a few thousand boxes into view. → No text far out, a quarter-window
  margin, and the browser spec bounds the count after **Fit**.
- **The budget makes the order depend on speed.** Two machines can keep
  different orders for a huge, tangled file. → The best order found is
  kept; for files the size of the user's 111 people the sweeps end on their
  own long before 250 ms.
- **Barycentre is a heuristic.** Crossings remain in tangled files (the mockup
  kept 767 000 at 10 000 people). → It is what the user accepted; a better
  method can replace the ordering behind the same layout API.
- **SVG focus.** `tabindex` on SVG groups works in Chromium and WebKit, which
  are Obsidian's desktop and iOS engines. → Covered by the browser spec in
  Chromium; the phone check in 7.1 confirms it on the app.
- **Shared code moves under the timeline.** → Its unit tests and browser spec
  run unchanged apart from renamed string keys, and are the guard.

## Migration Plan

None: a new view and a new command. A saved workspace holding a graph leaf
after a rollback is dropped by Obsidian. The renamed string keys are internal.

## Implementation

To be filled in while applying: every place the implementation departs from
this design or the mockup, and why.
