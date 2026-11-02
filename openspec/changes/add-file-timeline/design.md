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
approximate, and `precision` already says that.

**`src/desk/fileTimeline.ts` holds the model of the view, with no DOM.**
- It is built once per `GenealogyIndex` and held in a `WeakMap` keyed by it, so
  hovering and scrolling never rebuild it, and an edit (which produces a new
  index) does.
- It reads every person with an identifier with `index.person(xref)` and every
  family with `index.family(xref)` once. A person without one cannot be read in
  full or opened, and gets no row.
- A birth falls back to a christening or baptism, a death to a burial or
  cremation, as the mockup does.
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
    before the synchronous `IndexCache.at`) into a cache keyed by `mtime:size`,
    forgotten when the last timeline of that path closes.

  This reverses a non-goal of the reading-desk change, "reading closed files":
  the pages, the Index and the panel still read only an open tab, and the
  timeline reads the vault only when no tab of its file is open. A timeline is an
  overview the reader keeps open in its own tab, and losing it when the file's
  tab closes would be the surprise.
- `main.ts` marks the timelines of a path stale from `genealogyChanged` and on
  the vault's `modify` of a file with no tab open. A timeline rebuilds only when
  it is shown (`containerEl.isShown()`) and its index is a different object, so
  typing in Source mode with a timeline in a background tab costs nothing until
  it is looked at. In the foreground the rebuild follows the tab's 300 ms
  settle, as the Index does.
- The `rename` handler `main.ts` already registers rewrites `gedcom` in the
  state of timelines of the old path. A timeline whose file is gone says so.

**It is opened from a command in `COMMANDS`, so the palette, the pane menu and
the header action share one gate.**
- The command `open-gedcom-file-timeline` is available when the view has a
  file and its `genealogyInterface()` is true. It calls a new
  `CommandHost.openFileTimeline(path, around)`, where `around` is the person of
  the tab, and `main.ts` implements it: reveal a timeline leaf whose
  `getViewState().state.gedcom` names this path — matched on the state, so a
  deferred leaf after a restart is found too — or open one in a new tab.
- `GedcomView` adds a header action with the icon `calendar-range` beside the mode
  switch, shown and hidden with it in `showMode`.
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
