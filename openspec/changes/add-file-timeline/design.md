## Context

The genealogy interface today is a GEDCOM tab with a Genealogy and a Source mode
(`src/GedcomView.ts`), an Index and an Evidence view in the sidebars that follow
the most recently active GEDCOM tab (`src/desk/DeskViews.ts`, `followed()` in
`src/main.ts`), all hidden while **Genealogy interface** is off (`syncInterface`
in `src/main.ts`). A tab reads its file through `IndexCache`
(`src/genealogy/cache.ts`) into a `GenealogyIndex` (`src/genealogy/index.ts`),
whose rows are compact and whose `person(xref)` and `family(xref)` resolve
relatives and events on demand.

The mockup this change implements is `docs/design/file-timeline.html` on PR #188.
It measured, for 10 000 people in headless Chrome: reading with the language
service about 320 ms, about 250 shapes in the DOM when only the rows in view are
drawn, and hover under a millisecond when it changes classes instead of
redrawing.

A date's reading (`src/genealogy/dates.ts`) carries a year and a precision of
`exact`, `approximate` or `range`; `range` covers `BET`, `BEF`, `AFT`, `FROM` and
`TO` alike, and the second date of `BET`/`FROM … TO` is not reported. The
language service's `readDate` already returns both dates and the modifier.

## Goals / Non-Goals

**Goals:**
- A timeline view of one file that matches the mockup's behaviour and speed.
- Layout logic that knows nothing of Obsidian, so it can move with the read
  model (lavich/domorium#379) and be reused by the graph change after this one.

**Non-Goals:**
- Sharing a layout engine with the graph yet: the graph change will extract what
  both need, from code that then exists twice, rather than guess now.
- A Web Worker or a cache across sessions: the first open of a 10 000-person file
  is paid once, at the cost the measurement shows.

## Decisions

**The read model gains two optional readings on `DateReading`, set only where
they apply.**
- `end?: number`: the year of the second date of `BET … AND …` and `FROM … TO …`,
  read by the same rules as `year`, absent where that date yields none.
- `period?: true`: for `FROM` and `TO`.

Being optional and absent otherwise, they leave every existing whole-reading
comparison in `dates.test.ts` and `index.test.ts` true. `precision` is
unchanged, so `labels.ts` and every caller keep their meaning. Alternative: a new
precision `period`. Rejected: it would change what `range` means to every
existing caller, and the person page's `≈` marks would move.

Day and month are not read. An age at the cursor is the age reached during that
year, which the year alone gives; only an approximate or uncertain birth makes it
approximate, which `precision` says once `period` is excluded: `range` without
`period` is `BET`, `BEF` or `AFT`.

**`src/desk/fileTimeline.ts` holds the model of the view, with no DOM.**
- It is built once per `GenealogyIndex` and held in a `WeakMap` keyed by it, so
  hovering and scrolling never rebuild it, and an edit (which produces a new
  index) does.
- It reads every person with an identifier with `index.person(xref)` and every
  family with `index.family(xref)` once. A person without one cannot be read in
  full or opened, and gets no row.
- A birth falls back to a christening or baptism, as the mockup does, and a
  death to a burial, as the mockup does, or a cremation.
- It reports:
  - per person: their sex, lifeline span and dated events, each with a kind
    (`birth`, `marriage`, `death`, `other`), a sign for `other`, uncertainty and
    period;
  - per family: its spouses, its children and its marriage;
  - generations and the order of rows, ported from the mockup's `build()`;
  - `branch(focus, up, down)` and `alive(year)` with ages.

  Each answer is a plain value with a unit test.

**`src/desk/fileTimelineView.ts` draws it, with only what is in view in the
DOM.**
- The layout of a scope (rows, x of each year) is computed once per scope, zoom
  and switch, as the mockup's `render()` does.
- Drawing takes the window — scroll offsets and size — as an argument rather
  than measuring the DOM, so a happy-dom test, which has no layout, can drive it;
  the view passes the board's. It places, for the rows and years in that window
  plus one window on each side, the lifelines, marks, spans and marriage lines as SVG built with
  `createElementNS`, as `src/desk/treeView.ts` does, and the name rows as
  `createDiv` children between two spacer divs. No `innerHTML`.
- A scroll handler redraws, in an animation frame, only when the visible window
  leaves the drawn one.
- Hover sets `on` and `hl` classes on the drawn elements of the person and their
  relatives, found through maps filled while drawing, and a class on the board
  fades the rest by CSS.
- Arrows, the row highlight and the hovered person's undated facts go into a
  small layer of their own, cleared on every hover. Arrows run to the hovered
  person's birth from each parent in the file, and from the hovered person's row
  to each child's birth.
- Icons are handed in as a function, as `harness/icons.ts` does for the pages,
  so the module does not import `setIcon` from `obsidian`, which is types only
  in tests.
- The year cursor is its own layer, redrawn on pointer movement for the rows in
  the window.

**The view is an `ItemView` in the main area, bound to one file.**
- `FileTimelineView` sits in `src/desk/DeskViews.ts` beside `IndexView`, with view
  type `domorium-file-timeline`.
- Its state is `{ gedcom, focus?, up, down, zoom, others }`, saved with the
  workspace. The path is not under `file`: `shownFilePath`
  (`src/vault/openTabs.ts`) reads `state.file` of any leaf, so a timeline keyed
  so would pass for a tab of the file to `GedcomView.leafShowing` and to the
  search for the file's tab below.
- `navigation = false`, so `getLeaf(false)` never replaces the timeline with
  another file. Alternative: follow the most recently active GEDCOM tab, as the
  Index does. Rejected: the timeline is an overview of a file the reader chose,
  two can be open for two files, and it must survive the file's tab being closed.
- It asks its host for the index of its file:
  - an open `GedcomView` of that path answers with `genealogy()`, which includes
    unsaved text;
  - otherwise the host reads the file from the vault (`cachedRead`, awaited
    before the synchronous `IndexCache.at`) into a cache whose revision is a
    counter per path, bumped on the vault's `modify` of that path — not the
    file's modification time or size, which the read model's "Reading is paid
    for once per revision" forbids as a revision. It is forgotten when the last
    timeline of that path closes.

  This reverses a non-goal of the reading-desk change, "reading closed files":
  the pages, the Index and the panel still read only an open tab, and the
  timeline reads the vault only when no tab of its file is open. A timeline is an
  overview the reader keeps open in its own tab, and losing it when the file's
  tab closes would be the surprise.
- `main.ts` marks the timelines of a path stale from `genealogyChanged` and on
  the vault's `modify` of a file with no tab open. A timeline rebuilds only when
  it is shown (`containerEl.isShown()`) and its index is a different object, so
  typing in Source mode with a timeline in a background tab costs nothing until
  it is looked at. A stale timeline that becomes shown — on `active-leaf-change`
  and `layout-change` — rebuilds then. In the foreground the rebuild follows the
  tab's 300 ms settle, as the Index does.
- The `rename` handler `main.ts` already registers rewrites `gedcom` in the
  state of timelines of the old path, through the `descendantPaths` mapping it
  already uses for a moved folder. On the vault's `delete` of the path, a
  timeline says its file no longer exists.

**It is opened from a command in `COMMANDS`, so the palette, the pane menu and
the header action share one gate.**
- The command `open-gedcom-file-timeline` is available when the view has a
  file and its `genealogyInterface()` is true. It calls a new
  `CommandHost.openFileTimeline(path, around)`, where `around` is the person of
  the tab, and `main.ts` implements it: reveal a timeline leaf whose
  `getViewState().state.gedcom` names this path — matched on the state, so a
  deferred leaf after a restart is found too — or open one in a new tab.
- `GedcomView` adds a header action with the icon `calendar-range` beside the mode
  switch, shown and hidden with it in `showMode`. It calls a new
  `GedcomViewHost.openFileTimeline(view)`, which `main.ts` implements with the
  same function as the command's `CommandHost.openFileTimeline`, so the action
  and the command cannot drift apart.
- For a file of more than 500 people, the opener sets `focus` to `around` — the
  tab's `recordAtCursor()`, which already answers the page's record in Genealogy
  mode and the cursor's in Source mode, kept only if it is a person — or to the
  first person the file declares.

**Activating leads into the file's tab, brought to the front.** Unlike the
Index, the timeline covers the main area, so the file's tab is behind it and
`openRecord`, `goToXref` and `showInSource` change a tab the reader cannot see.
- The host finds the file's leaf with `leafShowingFile`, limited to
  `GEDCOM_VIEW_TYPE` leaves, or opens the file in a new tab. It then awaits
  `leaf.loadIfDeferred()` (a restored background tab holds a `DeferredView`) and
  `workspace.revealLeaf(leaf)`, both 1.7.2.
- Then, for a person, it calls the existing `openFromIndex(view, xref)`; for a
  mark, `view.showInSource(range)` with the event's range.

**Colours come from the theme.**
- Lifelines: `--color-pink`, `--color-blue` and `--text-faint`.
- Marks: births `--color-green`, marriages `--interactive-accent`, deaths
  `--text-normal`, other events `--color-orange`.

These are Obsidian's own variables, so a theme recolours them. The mockup's
fixed hues were only for the mockup.

**The interface switch closes it.** `syncInterface` detaches
`domorium-file-timeline` leaves with the Index and Evidence, and the
`layout-change` pass already re-runs it while the setting is off.

**On a phone** the names column is 120 px. The first touch on a lifeline sets the
hover state and the cursor at the touch; a second touch on the same person
activates it; a touch on a mark opens a small popover with its details and
**Show in source**.

## Risks / Trade-offs

- **Icon.** `calendar-range` and every colour variable named here are in the
  installed Obsidian 1.8.9 bundle. → The manual check on the demo vault confirms
  them on the app; `list-tree` is the fallback icon. The harness icon table is a
  copy, so it proves nothing about the app.
- **Size on open.** Measured on a generated 160 000-line file of 10 000 people:
  `buildIndex` about 400–450 ms, `person()` for everyone about 60 ms; the parse
  dominates and the tab pays it already. → The browser spec measures the
  drawing; a worker is a later change if readers hit it.
- **Edits.** Rebuilding after every settled edit would cost that again. → Only a
  shown timeline rebuilds, and only for a new index.
- **The 500-person threshold** is a guess at where the whole file stops being
  readable. → One constant; revisited if the graph change measures otherwise.
- **The row order** is a heuristic and can split spouses in a file with many
  marriages between cousins. → The graph change brings crossing reduction, which
  the timeline can adopt then.

## Migration Plan

None: a new view and new optional fields on `DateReading`. Rolling back removes
the view; a saved workspace naming it gets a leaf Obsidian cannot restore, which
it drops on its own.

## Implementation

- **Branch spouses.** `branch()` adds the spouses of everyone in the branch, ancestors included, as the spec says; the mockup added only the descendants' spouses. Curie's figures (10 of 17) are unchanged.
- **Generations.** After the mockup's spouse passes, a child is pushed below a parent the passes moved down, so "one generation below whichever parent stands lower" holds at the end; the mockup's single reading could leave such a child level with the parent.
- **Earliest event.** A lifeline with no birth or christening begins at the earliest dated event of the person *or of a family they are a spouse in*, so a person whose only date is a marriage gets a lifeline rather than a mark on an empty row.
- **Arrows.** One arrow per parent in the file, as the spec says (the mockup drew one per family, from its first parent), offset 4 px from each other so two parents' arrows to one birth do not overlap.
- **Periods.** A period with both ends is drawn as a span whatever its kind, as the spec says; the mockup drew spans for other events only.
- **Exactness.** A date of a year alone is exact, for marks, name years and ages, per the spec; the mockup marked `≈` unless day and month were known.
- **`initialFocus(index, around)`** in `fileTimeline.ts` holds the 500-person rule, so it has a unit test; `main.ts` and the harness call it.
- **Revisions.** The per-path counter is kept only for paths a timeline shows, and dropped with the last one. The vault's `create` of a path also marks its timelines stale, so a file deleted and restored is shown again.
- **Rename of a deferred timeline** goes through `leaf.setViewState`, the only way to rewrite a saved state, which loads that leaf.
- **Opening a timeline of a file not in the vault** says so with the existing *file not found* notice.
- **Search** matches a person's names, not the Index's identifiers, years and places: the spec's search is by name.
- **The mark tooltip and the phone popover** are placed inside the view rather than `position: fixed`.
- **Ages under the cursor** fade with everyone else while a person is picked out.
- **Phone layout**, found in the screenshots: a name stands over its years in the 120 px column; the legend folds behind a *Legend* button and the title (the tab names the file) is hidden, which leaves the height to the rows; the count alive has a line of its own, because appearing on the first touch it wrapped and moved the rows from under the second.
- **Name rows** take the keyboard focus and open the person on Enter.
- **Harness.** `harness/fileTimeline.html` carries a viewport meta tag, as Obsidian's mobile app does; without it a phone-width page lays out at 980 px. Its `whole` option shows a large file whole, as *Whole file* does.
- **Revealing an open timeline** keeps its own scope rather than moving to the person of the tab it was asked from: the reader chose that scope in it. `revealLeaf` only selects the tab, so the opener also makes it the active leaf, and `onResize`, which Obsidian calls as a hidden tab is shown, catches a stale timeline up.
- **Leading into the file's tab** makes it the active leaf too, so commands, the status bar, the Index and the Evidence panel follow it.
- **Reading a closed file.** The revision is one plugin-wide counter that never restarts, and a reading finished after the last timeline of its path closed is not cached; a closed timeline drops its board and ignores any answer still on its way. A path's timelines are marked stale on every modify of it, tab open or not, so edits saved as the tab closes inside its 300 ms settle are not lost; an unchanged index costs nothing. Of two tabs of one file, the one last worked in answers. The vault's `create` is listened to only once the layout is ready, and deleting a folder forgets every reading under it.
- **Keyboard.** A name row is a plain container holding a real button that opens the person and, beside it, the Branch button, shown while the row has the focus. Focus on a row or a stepper survives the redraws that rebuild them.
- **A click from the keyboard** (`detail` 0, no pointer type) is never taken for a touch. On a phone a touch on empty space puts the light out, and a touch on a lifeline after one on a mark lights the person rather than opening them.
- **Tooltip and popover** open above the point when they would pass the bottom edge.
- **Not fixed here:** `index.person()` for everyone grows with the square of the largest sibling group — about 0.5 s for 2 500 children of one family and 10 s for 10 000 — a cost of the read model, not of the timeline.
