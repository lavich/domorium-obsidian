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

**The read model gains three readings on `DateReading`.**
- `end?: number`: the year of the second date of `BET … AND …` and `FROM … TO …`,
  read by the same rules as `year`.
- `period: boolean`: true for `FROM` and `TO`.
- `dayAndMonth: boolean`: the first date states both.

`precision` is unchanged, so `labels.ts` and every caller that reads it keep
their meaning. Alternative: a new precision `period`. Rejected: it would change
what `range` means to every existing caller, and the person page's `≈` marks
would move.

**`src/desk/fileTimeline.ts` holds the model of the view, with no DOM.**
- It is built once per `GenealogyIndex` and held in a `WeakMap` keyed by it, so
  hovering and scrolling never rebuild it, and an edit (which produces a new
  index) does.
- It reads every person with `index.person(xref)` and every family with
  `index.family(xref)` once.
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
- Drawing places, for the rows and years in the scroll window plus one window on
  each side, the lifelines, marks, spans and marriage lines as SVG built with
  `createElementNS`, as `src/desk/treeView.ts` does, and the name rows as
  `createDiv` children between two spacer divs. No `innerHTML`.
- A scroll handler redraws, in an animation frame, only when the visible window
  leaves the drawn one.
- Hover sets `on` and `hl` classes on the drawn elements of the person and their
  relatives, found through maps filled while drawing, and a class on the board
  fades the rest by CSS.
- Arrows, the row highlight and the hovered person's undated facts go into a
  small layer of their own, cleared on every hover.
- The year cursor is its own layer, redrawn on pointer movement for the rows in
  the window.

**The view is an `ItemView` in the main area, bound to one file.**
- `FileTimelineView` sits in `src/desk/DeskViews.ts` beside `IndexView`, with view
  type `domorium-file-timeline`.
- Its state is `{ file, focus?, up, down, zoom, others }`, saved with the
  workspace. Alternative: follow the most recently active GEDCOM tab, as the
  Index does. Rejected: the timeline is an overview of a file the reader chose,
  two can be open for two files, and it must survive the file's tab being closed.
- It asks its host for the index of its file:
  - an open `GedcomView` of that path answers with `genealogy()`, which includes
    unsaved text;
  - otherwise the host reads the file from the vault into an `IndexCache` keyed
    by `mtime:size`.
- `main.ts` redraws timelines of a path from `genealogyChanged`, and on the
  vault's `modify` of a file with no tab open.

**It is opened from a command in `COMMANDS`, so the palette, the pane menu and
the header action share one gate.**
- The command `open-gedcom-file-timeline` is available when the view's
  `genealogyInterface()` is true. It calls a new `CommandHost.openFileTimeline`,
  which `main.ts` implements: reveal a timeline leaf whose state names this file,
  or open one in a new tab.
- `GedcomView` adds a header action with the icon `calendar-range` beside the mode
  switch, hidden with it while the interface is off.
- For a file of more than 500 people, the opener sets `focus` to the person of
  the tab — `recordAtCursor()`, which already answers the page's record in
  Genealogy mode and the cursor's in Source mode, kept only if it is a person —
  or to the first person the file declares.

**Activating leads into the file's tab as the Index does.**
- A person: the host finds a `GedcomView` of the path (the followed one first),
  opening the file in a new tab if there is none, and calls the existing
  `openFromIndex(view, xref)`.
- A mark: it calls `view.showInSource(range)` with the event's range.

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

- **Icon.** `calendar-range` has been in lucide for years, but Obsidian bundles
  its own lucide. → The harness checks that `setIcon` drew something, and the
  manual check on the demo vault confirms it on 1.8.7; `list-tree` is the
  fallback.
- **Size on open.** Reading every person in full on open costs about 0.7 s at
  10 000 people. → Measured in the browser spec. A worker is a later change if
  readers hit it.
- **The 500-person threshold** is a guess at where the whole file stops being
  readable. → One constant; revisited if the graph change measures otherwise.
- **The row order** is a heuristic and can split spouses in a file with many
  marriages between cousins. → The graph change brings crossing reduction, which
  the timeline can adopt then.

## Migration Plan

None: a new view and new optional fields on `DateReading`. Rolling back removes
the view; a saved workspace naming it gets a leaf Obsidian cannot restore, which
it drops on its own.
