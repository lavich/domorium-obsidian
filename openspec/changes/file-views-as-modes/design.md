## Context

1.14.0 and 1.14.1 built the timeline and the graph of a file as tabs of the main
area of their own, the way Obsidian's graph view is. Each is an `ItemView`
bound to a path kept in `state.gedcom`, and because no tab need be showing that
file, they came with plumbing:

- `src/desk/DeskViews.ts`: `FileOverviewView` (a stale flag, a read only while in
  sight, an `asked` counter against late answers), `FileTimelineView`,
  `FileGraphView`, `FileOverviewHost`.
- `src/vault/overviewReads.ts`: readings of closed files, a plugin-wide revision
  counter, a revision per path, opening counts, `went` and `moved`.
- `src/main.ts`: `openOverview`, `openOverviewOf` (one opening at a time),
  `openOrReveal` (`revealLeaf` only selects a tab, so `setActiveLeaf` follows),
  `overviewIndex`, `portraitIn`, `openRecordIn`, `showSourceIn`, `bringFileTab`,
  `followOverviews`, `markOverviewsStale`, the `modify`, `delete`, `create` and
  `rename` handlers, `syncInterface` detaching both types.
- `src/GedcomView.ts`: three header actions (mode, graph, timeline), toggled
  together.
- `src/commands.ts`: `open-gedcom-file-timeline`, `open-gedcom-file-graph`,
  `OverviewKind`, `CommandHost.openOverview`.

All of it exists to put a second view beside a tab that already has the file,
live, in a `GenealogyIndex` (`GedcomView.genealogy()`: one reading per revision,
typed text included) that the person pages, the Index and Evidence already use.

The user's direction (2026-11-04/05, `proposal.md`) is that the file's own tab
shows the file in several ways. The drawing modules — `fileGraphView.ts`,
`fileTimelineView.ts`, `graphCanvas.ts`, `floatingSearch.ts`, `branchScope.ts` —
take a `FileTimeline` model and a scope and draw into an element they are given;
none of them knows about tabs, so they move into the tab unchanged. What goes is
everything that made them separate.

The work is in steps because the user's target is larger than the user's first
question: the card moves to the right sidebar, Evidence merges into it, and
Genealogy mode goes. Step 1 (this change) leaves the person page, Evidence and
the Index as they are.

## Goals / Non-Goals

**Goals:**

- A GEDCOM tab has four modes — Genealogy, Graph, Timeline, Source — chosen from
  one header control and from commands, remembered by the tab, and offered by
  *Open GEDCOM files as*.
- Graph and Timeline are drawn in the tab from the tab's live reading, and keep
  their scope, position and zoom per view, across mode switches and the
  workspace being restored.
- The separate overview tabs and everything that served them are gone, and a
  workspace saved with them opens cleanly.
- Every behaviour of the views the user approved is unchanged.
- The seams step 2 needs are the ones this change makes: one place where a
  record is chosen out of a view, and a tab that already draws its modes without
  pages.

**Non-Goals:** as in `proposal.md`. In particular: no card in the sidebar, no
selected person in Graph or Timeline, no shared scope, no Mod+F in the views, no
conversion of old tabs.

## Decisions

### Four modes in the order the user named them

`DESK_MODES = ["genealogy", "graph", "timeline", "source"]` in
`src/desk/deskState.ts`, in that order everywhere: the menu, the setting's
dropdown, the command list. (Mine: the user listed Source first — «gedcom, граф
и таймлайн» — but the views are what a reader chooses among and the raw file is
the last resort, as in Obsidian's own reading/editing menu. Reorder freely; it
is one array.) `OpenAsMode` is the same four. `readDeskState` accepts the four
values; any other is ignored, so the setting decides, as now. `effectiveMode`
and `initialMode` are unchanged apart from the type: off means Source, a tab
opened while off stores Source.

The word is **mode**, as the specs have it, though the user says «виды»
(views): "view" in this plugin is also an Obsidian view, a person page's tab
(Card, Tree, Timeline, Places) and a board. Step 2 removes the last of those
clashes — the page's own **Timeline** tab is not the Timeline mode and is left
alone here.

### The mode control: one header action with a menu

Alternatives:

1. **A row of icon actions**, one per mode, the current one pressed. One tap to
   switch, but four icons beside Obsidian's own (and, on a phone, the "more
   options" ellipsis) for something chosen a few times a session; and the plugin
   already crowds the header with three.
2. **Two actions kept and a toggle** — the 1.14 shape. Cannot choose among four.
3. **One action, a menu** (chosen). The icon is the current mode's, so the
   header says where the tab is; a tap opens `Menu` with the four modes and the
   current one `setChecked`. Three icons become one. Works the same on a phone,
   where Obsidian shows a `Menu` as a bottom sheet. It costs a second tap
   compared with 1 — the commands cover the keyboard.

`addAction` (1.1.0), `Menu`, `showAtMouseEvent` (0.12.6) and `setChecked`
(0.16.2) are all below the floor of 1.8.7. The action is `toggle`d with
`settings.genealogyInterface`, as the three are today. What the menu lists and
checks is a pure function in `deskState.ts` (`modeChoices(current)` → mode, title
key, icon, checked) so that a unit test pins order and checking; `GedcomView`
only turns it into `Menu` items.

The titles are `mode.genealogy`, `mode.graph`, `mode.timeline`, `mode.source`
(new keys). *Open GEDCOM files as* keeps its own `openAsOption.*` keys, whose
Russian is accusative («Открывать файлы GEDCOM как — Граф»).

Icons: Genealogy `users`, Graph `network` (`FILE_GRAPH_ICON`), Timeline
`calendar-range` (`FILE_TIMELINE_ICON`), Source `code` — each as the header had
it. The tooltip is `mode.control`: «Mode: {mode}».

### Commands: one per mode, and the toggle kept

`show-gedcom-as-genealogy`, `…-graph`, `…-timeline`, `…-source`, named *Show as
genealogy* and so on. Available while the interface is on and the tab is **not
already in that mode** (mine) — the palette and the tab's menu would otherwise
list a command that does nothing; `COMMANDS.isAvailable` is the only gate both
read, so `CommandView` gains `mode()` and `showMode(mode)`.

`toggle-gedcom-mode` keeps its id, so a hotkey a reader bound to it survives, and
now toggles Source and the last other mode: from Source to the mode the tab was
in before it, Genealogy where this session has none; from anything else to
Source (mine; with four modes "genealogy ↔ source" is a special case, and this
is the same thing generalised). The last mode is kept in memory only. Its name
becomes *Switch between source and the last view* («Переключить исходник и
прошлый режим»). A command flag `menu: false` keeps it out of the tab's menu,
where four mode entries already say the same.

No default hotkeys: the only default the plugin has is Replace's, which exists
because Obsidian cannot dispatch it itself; nothing here has that reason.

`open-gedcom-file-timeline` and `open-gedcom-file-graph` go, with
`OverviewKind` and the two `openOverview` methods. Saved hotkeys bound to them
simply stop resolving. Not migrated
(few can exist: 1.14.0 shipped on 2026-11-04).

### The tab draws the views: `FileViews`

`src/desk/fileViews.ts` (no `obsidian` import, tested under happy-dom like the
boards) owns what the tab draws besides the editor and the desk:

```ts
type ViewKind = "graph" | "timeline";
interface ViewMemory { graph?: GraphMemory; timeline?: TimelineMemory }
interface FileViewsHost {
  openRecord(xref: string): void;       // a person or a family
  showInSource(range: Range): void;
  portrait(xref: string): PortraitContent | null;
  changed(): void;                      // the memory changed: save the layout
  setIcon(el: HTMLElement, icon: string): void;
}
class FileViews {
  constructor(parent: HTMLElement, host: FileViewsHost);
  show(kind: ViewKind, index: GenealogyIndex, memory: ViewMemory, around?: string): void;
  hide(): void;
  resized(): void;
  memory(): ViewMemory;
}
```

- **One element per view, made on first use and kept.** `GedcomView` already has
  `editorEl` and `deskEl`; `FileViews` adds `viewsEl`, in which `FileGraphBoard`
  and `FileTimelineBoard` are created the first time they are shown, each in its
  own root, toggled by `show` and `hide`. A board kept alive is what keeps the
  position, zoom, search text and hover state between mode switches, with no
  rebuild; the model is `fileTimelineOf(index)`, held per index, so switching
  back to the same text lays nothing out again — the boards already return early
  on the same model and scope.
- **No board before the file is read.** `GedcomView` constructs and runs
  `showMode()` before Obsidian has loaded the file, and a graph shown on an empty
  index is not harmless: `FileGraphBoard.show` treats the first model it gets as
  the opening, and would spend the saved view on nothing. `GedcomView` therefore
  keeps `loaded` (set in `setViewData`, cleared by `clear`) and draws a view only
  when it is true; `setViewData` draws the mode the tab is in, so a restored tab
  draws once, with the file. (The same race, seen from the other end, is what the
  `asked` counter in `FileOverviewView` guarded; here nothing is asynchronous.)
- **No drawing out of sight.** A tab in Graph mode that is behind another tab
  must not lay out 10 000 people on every `setViewData`. `drawDesk` for these two
  modes asks `containerEl.isShown()`; if false it sets `viewsStale` and returns.
  `onResize()` — which Obsidian calls as a tab is shown — redraws when stale and
  tells the board its size (`resized()`); this is the same device as the
  overview views' `refreshIfStale` on `onResize`, minus the plugin-wide loop
  that called it from `active-leaf-change` and `layout-change` (the tab is its
  own owner now).
- **Hide stops the board.** `hide()` toggles the roots off and calls
  `cancelHover()` on each board, so a hover timer cannot light a hidden card.
  The boards' own pointer listeners need nothing more.
- The host methods are thin: `openRecord` is the tab's `openRecord` (below),
  `showInSource` its `showInSource`, `portrait` its `portraitOf` — the picture
  the person's page shows, from the tab's own language service, so the closed-file
  `portraitIn` goes with `OverviewReads.held`.

### What a tab remembers

`getState()` adds, beside `mode`, `record` and `view` (the person page's tab):

```json
{ "mode": "graph", "record": "@I1@",
  "graph":    { "focus": "@I12@", "up": 2, "down": 2, "view": { "x": 0, "y": 0, "k": 0.6 } },
  "timeline": { "focus": "@I12@", "up": 2, "down": 2, "zoom": 8 } }
```

`graph` and `timeline` are present once that view has been shown, and not
before, so an untouched tab's state is what it was. They are the shapes the
overview tabs saved, less `gedcom` and `around`: `readGraphState` and
`readTimelineState` stay, read the nested object, and clamp as they did (0–9
generations, zoom ranges, a missing or empty focus dropped, a malformed view
dropped); `GraphState.gedcom`, `GraphState.around` and `TimelineState.gedcom`
go. Nested rather than flat because Graph and Timeline each have a `focus`, `up`
and `down`, and because it keeps `view` (the graph's position) apart from the
person page's `view` key.

**Each view keeps its own scope** (mine). The alternative, one scope for the tab
so that choosing Irène's branch in the timeline is still Irène's branch when the
tab is switched to the graph, is a better feel and a worse contract: the two
views already differ in what they save (zoom against position), their first
opening differs (the graph centres a person, the timeline scrolls), and the
requirements that exist say "keep its scope". Sharing is one more key and one
changed scenario; it is an open question for the user.

**The opening rule** reads the tab, not a path. A view with no memory is opened
with `scope = { focus: initialFocus(index, around), up: 2, down: 2 }`, where
`around` is the tab's `record` — which is the page's person in Genealogy mode,
and in Source mode the record under the cursor, because leaving Source for any
mode now sets `record` from the cursor when that record has a page (it did only
for Genealogy). `initialFocus` is unchanged: no focus for a file of up to 500
people; for a larger one `around` if it is a person, else the first person
declared. Verified on `curie.ged`: `initialFocus(index, "@I1@")` is `undefined`;
on `generated(2000)` it is `"@I6@"` for the sixth person, `"@I1@"` for no
`around` and for a family xref.

The tab writes the memory as soon as a view is first shown, with the scope it
opened on, and after every change the board reports (`scopeChanged`,
`stateChanged`) — so that "the whole file, chosen" on a large file is a saved
fact and not an absent one that the opening rule would fill in again on the next
switch. This is why the graph's first opening takes `memory.graph?.view`: it is
`{ saved }` for a restored tab and `{ open: around }` for a new one, as
`GraphSettings` already has it.

**What `setState` does with them.** History navigation (Back to the graph)
arrives as `setState` with the state `getState()` produced earlier. The tab takes
`graph` and `timeline` from it into its memory; `FileViews.show` applies a scope
that differs from the board's (the board's own change handling), and does *not*
move a view already on screen, since only a first show takes a saved view — so
Back to a graph the board still holds shows it as it stands, which is where the
reader left it. A restored tab has no board yet, and takes the saved view.

### Clicks in the views, until step 2

Activating a person or a family in Graph or Timeline calls the tab's
`openRecord(xref)`, the method that every page, Index row and Evidence link
already use: it sets the view state to Genealogy mode with the record, as a
step Back returns from. Alternatives:

- **Stay in the view and offer an "Open page" action** on the card or row. No
  navigation, but a new control on two drawings, popover or no, to be deleted in
  step 2; and a click that does nothing visible.
- **Do nothing yet.** Honest, and useless: the user asked to open the page.
- **Open the page in the same tab** (chosen). It is what the tab did in 1.14
  ("the file's tab is brought to the front showing the page"), with one tab fewer
  to hop to, and Back returns to the view exactly as left (`getState` carries
  `mode`, `graph` and `timeline`).

For step 2 this is the cheapest shape: the views call one method —
`openRecord` — and do not know what it does. Step 2 re-implements it as "select
the record and show its card in the right sidebar", leaving the mode alone, and
the views, `FileViews`, its host and the boards do not change. Had the views
learned about pages or an "Open page" button, step 2 would have to take that out
of them too.

Marks go to `showInSource(range)`: Source mode, the lines selected and in view,
as the page's *Show in source* does; this survives step 2 as it is.

**History.** Obsidian's history takes a step when a view reports it in
`setState`'s `result.history`, which the tab sets today when the *record*
changes. A click from Graph on the person who is already the tab's `record`
changes only the mode, and would take no step, so Back would not return. The rule
becomes a pure function in `deskState.ts`:

```ts
navigationStep(current: {mode, record}, next: {mode?, record?}): boolean
// true when the record changes, or the tab goes from Graph or Timeline to
// Genealogy with a record named
```

Switching mode with the control calls `setMode` and never `setState`, so it is
still not a step, as the existing requirement says. The behaviour of
`result.history` while Obsidian itself navigates back and forward is the existing
one for records and is checked by hand in the task list.

### Panels while the tab is in Graph or Timeline

The Index and Evidence follow `followed()`, the tab most recently active, and
read `shownRecord()` and `deskSelection()`:

- `shownRecord()` and `deskSelection()` stay `null` outside Genealogy mode (as
  they already are for Source). In Graph and Timeline the view has no selected
  person to give them (mine: step 2 will add one, and the card in the sidebar is
  what shows it), so the Index marks no row and Evidence says to open the file as
  genealogy. The alternative — answering the tab's last `record` — would highlight
  a row that the view on screen does not show.
- `recordAtCursor()` is `undefined` outside Source and Genealogy, so the copy-link
  commands are not offered in Graph and Timeline (`identifiedRecord`).
- An Index row, `openFromIndex`: Source goes to the line, everything else opens
  the page. So in Graph or Timeline a row opens its page and leaves the view, like
  a card does. Step 2 turns this into "show the card".
- `goToXref` (a followed link, `goToRecord`): the route for a page is taken in
  any mode but Source — `showsPages()` replaces `shownMode === "genealogy"` in
  the three places — so a link followed into a tab in Graph shows the page in
  Genealogy mode, instead of moving a cursor in an editor that is hidden.
- `placeEvidence` keeps its condition, `shownRecord() !== null`: the panel is put
  on first sight of a page.
- The status bar (version, problems) is the file's, not the mode's, and shows for
  any GEDCOM tab as it does in Genealogy mode; unchanged.
- Editor commands: `inSource()` is `shownMode === "source"`, so they are offered
  in Source only, as for Genealogy now.

### Leaving Source, and the cursor

`toggleMode` today sets the record from the cursor when going Source →
Genealogy, and moves the cursor to the page's lines going back. The first half
becomes "on leaving Source for any mode" (`setMode` does it) so that the 500-person
rule and a later switch to Genealogy see the cursor's record. The second half
stays Genealogy → Source only; from Graph or Timeline the cursor is left where it
was, since those modes have no "what is shown" to move it to, and the `record`
the tab holds may be older than the cursor (a requirement and a scenario say so).

### Old overview tabs

A workspace saved by 1.14.0 or 1.14.1 can hold leaves of type
`domorium-file-timeline` and `domorium-file-graph`. Checked in the Obsidian
bundle (installer 1.8.9, `app.asar`):

- `WorkspaceLeaf.setViewState` looks the type up with
  `viewRegistry.getViewCreatorByType(type)`. Where none is registered it creates
  `new Kj(leaf, type)`: an *unknown pane*, whose title is the app's
  `unknownPaneTitle`, whose body reads "This pane doesn't look like anything to
  me", with a *Close* action, and whose `getState` returns the saved state — so
  the leaf is kept in the layout and written back until the reader closes it.
- Its `getViewType()` is the saved type, so `workspace.getLeavesOfType(type)` and
  `detachLeavesOfType(type)` (which filters on `view.getViewType()`) find it.
- `onLayoutReady` runs the callback at once if the layout is ready and after the
  layout is restored otherwise; `main.ts` already relies on that for the panels a
  saved layout brings back.

So without handling, every reader with an old overview tab would meet an unknown
pane at each start. Options:

1. **Detach them on layout-ready** (chosen, mine): `detachLeavesOfType` for the
   two retired ids, in the `onLayoutReady` callback beside `syncInterface`. No
   registered view, no code that needs `obsidian` types beyond what exists, idempotent,
   silent. Loses nothing the reader has not got in the file's tab: the graph's
   scope and zoom, which were view state, not data.
2. **Keep the types registered, as views that close themselves** on `onOpen`.
   More code, a view class for nothing, and a flash of a pane.
3. **Convert** each into a GEDCOM tab of its `gedcom` path in the matching mode
   with its scope (`setViewState` of the leaf). Kind to the reader, but the same
   path may already be open in a tab, which then has two; the file may be gone; and
   it needs the state readers the old views had. A question for the user if
   losing two tabs once matters. (The graph and timeline tabs are days old.)

The ids live in `RETIRED_VIEW_TYPES` in `src/desk/deskState.ts`, so a test pins
them and that neither is the id of a registered view. The loop is deleted in a
later release (the change's follow-up note, not tracked here). It runs whether the
interface is on or off.

### What is deleted

- `src/desk/DeskViews.ts`: `FileOverviewView`, `FileTimelineView`,
  `FileGraphView`, `FileOverviewHost`, `OverviewBoard`, `FILE_TIMELINE_VIEW_TYPE`,
  `FILE_GRAPH_VIEW_TYPE`, `OVERVIEW_VIEW_TYPES`, `fileName`, and the imports of the
  boards. `IndexView` and `EvidenceView` and their host stay.
- `src/vault/overviewReads.ts` and `overviewReads.test.ts`.
- `src/main.ts`: the registrations; `overviewsOpening`; `reads`; `openOverview`,
  `openOverviewOf`, `openOrReveal`, `overviewIndex`, `portraitIn`,
  `overviewClosed`, `openRecordIn`, `showSourceIn`, `bringFileTab`, `openTab`
  (only the overviews asked "which tab holds this path"), `forEachOverview`,
  `markOverviewsStale`, `followOverviews`; the `modify` handler; the `delete` and
  `create` handlers (they exist for readings of closed files); the overview lines
  in `active-leaf-change`, `layout-change`, `genealogyChanged` and `syncInterface`;
  `FileOverviewHost` from the `implements`, `OverviewKind` and `leafShowingFile`
  imports it no longer needs; `descendantPaths` stays (the `MoveFollower` uses it).
  The `rename` handler stays, minus `followOverviews`.
- `GedcomViewHost.openOverview`; `CommandHost.openOverview`; `OverviewKind`.
- The boards: `showGone`, the gone element and its class, `overview.gone`, and
  their tests; `GraphState.gedcom`/`around`, `TimelineState.gedcom`.
- `src/vault/openTabs.test.ts`: the two tests that a timeline or graph leaf is not
  taken for a tab of its file. `openTabs.ts` itself stays: it reads
  `state.file` only. The `gedcom` key existed so that an overview leaf was not
  matched as a tab of the file by `leafShowingFile` and `MoveFollower.openView`;
  with no such leaf there is nothing to keep apart.
- Strings: `command.openFileTimeline`, `command.openFileGraph`,
  `fileTimeline.title`, `fileTimeline.name`, `fileGraph.name`, `fileGraph.title`,
  `overview.gone`, `mode.toGenealogy`, `mode.toSource`.

Specs: the two "a tab of its own" requirements are REMOVED and their replacement
ADDED rather than renamed, because a rename must keep every scenario of the old
one and three — *Opening it twice* (there is one tab), *The file is deleted* (the
GEDCOM tab's own business, as it is today for any file), and the header-action
form of *Opening it from the header* — have no meaning in a mode.

### Settings and copy

`OPEN_AS_MODES` is `DESK_MODES`; `parseSettings` accepts the four, so a saved
`genealogy` or `source` reads as before. The row stays where it is and stays
visible: it needs no `visible` (1.13.0, already a row in `CLAUDE.md`). Its
description: «How a GEDCOM file opens in a new tab: as a page, a graph, a
timeline or the source. Each tab remembers the mode it was last in. Applies when
the genealogy interface is on.» Options: *Genealogy*, *Graph*, *Timeline*,
*Source* (sentence case); in Russian «Генеалогию», «Граф», «Хронологию»,
«Исходник». The Russian for the timeline is *хронология*, as in 1.14.

The README sections for the timeline and the graph are rewritten: they are modes
chosen from the header control, a command or the tab's menu, not tabs.

### Tests

- Unit (Vitest, `node`): `deskState.test.ts` — `readDeskState` with the four modes
  and the two memories; `modeChoices`; `navigationStep`; the toggle target;
  `RETIRED_VIEW_TYPES`; the opening scope (`openingMemory`) for a small and a
  large file. `settings.test.ts` — the four `openAs` values. `commands.test.ts`
  — the four commands and their availability, the toggle, no overview commands.
- Unit (happy-dom): a new `fileViews.test.ts` — no board before the first `show`;
  `show("graph")` then `show("timeline")` toggles roots and leaves each board's
  view; the same index lays nothing out twice (a spy on the layout); the saved
  view is spent by the first show only; the opening scope on a 2 000-person file;
  the memory after a scope change and after the first show; `hide()` cancels the
  hover; a click on a card calls the host's `openRecord`, a mark `showInSource`.
  `fileGraphView.test.ts` and `fileTimelineView.test.ts` lose `gedcom`, `around`
  and `showGone` tests and keep the rest unchanged — which is the check that the
  views are not altered.
- Browser: `harness/fileViews.ts` (+ `.html`, one line in `build.mjs`) mounts a
  `FileViews` in a stand-in tab with buttons for the modes; `tests/fileViews.spec.ts`
  checks in a real browser what happens when a board is unhidden — a canvas that
  was hidden has a size and draws, the position survives a round trip, the
  timeline's sticky names and axis still follow the plot after it, a phone width.
  The existing `fileGraph` and `fileTimeline` specs mount the boards directly and
  do not change (their `around` option goes with the state field).
- By hand in Obsidian (the first task of the last group): what no test reaches —
  the header control and its menu on desktop and phone, Back from a page to a
  graph and Forward again, a restored tab in each mode, the old overview tabs
  closing, hotkeys.

### What step 2 leaves to do, and what this makes easy

Step 2 (its own change): the record card in the right sidebar; Evidence's
content merged into the card, below it; the person page's Timeline and Places
as sections; removing Genealogy mode and the page's Tree tab; `openRecord`
becoming "select and show the card"; a selected person in Graph and Timeline,
which gives the Index a current row and Evidence something to show there;
`shownRecord()`/`deskSelection()` answering for every mode; the *Open GEDCOM
files as* option *Genealogy* going (a saved `genealogy` read as Graph or
Source — that is step 2's decision). What this change leaves for it, on purpose:
Genealogy mode and its four-tab person page untouched; the Index and Evidence
untouched; the interim click behaviour confined to `openRecord`; the mode
list one array.

What this change makes easy: `FileViews` and its host do not know pages; the
tab's modes are a closed set with one switch function; the toggle, the menu and
the setting read the same list. Step 3's map is a fifth entry in the array, a
board, a `ViewKind` and a memory key.

## Risks / Trade-offs

- **An empty first show spends the saved view** — handled by drawing only once the
  file is loaded (above); a unit test and a restore check.
- **Hidden boards have no size.** `display: none` gives a zero rect, and a canvas
  that is told to fit on it fits nothing. The views draw only while the tab is
  shown, and tell the board its size on `onResize`; the browser spec unhides a
  hidden board. The boards already ignore a zero size (`viewChanged` is "absent
  until the canvas has had a size").
- **`requestSaveLayout` on every pan.** The board reports a view change per
  gesture; Obsidian debounces its own saving. No new throttle, as before.
- **Back and `result.history`.** The rule is pure and tested, but how Obsidian
  treats a flag set while it navigates by itself is the app's; checked by hand.
- **History shows a graph the board still holds, not the state saved with the
  entry.** If the reader pans, opens a page, and goes back, the graph is where
  they left it, not where they were when they opened the page — the same, since
  they did not move it in between. Where they changed the tab to another mode
  first and the graph was dropped, it is shown from memory.
- **A tab's memory grows the layout file** by two small objects per tab; both are
  dropped from `getState` until the view is first shown.
- **The mode control costs a tap** compared with two header icons (above).
- **Tabs of one file** each keep their own state; edits typed in one are not in the
  other until saved, which is how the Genealogy mode already behaves and why
  `openTab` (`followedView` first) existed; nothing depends on it now.
- **Downgrade.** An older plugin ignores the new keys and modes. Not supported.
- **Mod+F in Graph or Timeline** does nothing visible: the editor's search opens
  in a hidden editor, as in Genealogy mode today. Not changed (Non-goals).
- **Lessons from the overview views carried over:** a restored tab may be
  deferred, so state is read in `setState` and the file is waited for; a view
  shown while hidden is read stale, so it draws on `onResize`; focus is not moved
  into a board on a mode switch (the control keeps it), and the boards manage
  their own focus ring; counts and plurals in the boards are unchanged (`plural()`),
  and the three new strings have none; reduced motion is the boards' own and is
  not touched.

## Migration Plan

Updating needs nothing from the reader: stored `openAs` values stay valid, a tab
saved before has no `graph` or `timeline` key and opens each view on its first
show by the rule, and old overview tabs are closed once when the workspace loads.
The setting for the interface still defaults to off. Rolling back means going
back to 1.14.1, which ignores the new state; a workspace that held overview tabs
before the update has lost them. The detaching loop is meant to go in a later
release. When the change is archived, the Purpose of `genealogy-file-graph` ("in a
tab of its own beside the person pages") and of `genealogy-view` ("the Genealogy and
Source modes") is edited by hand in the archive PR, as `openspec archive` leaves
Purpose alone.

## Open Questions

For the user:

1. Should Graph and Timeline share one scope (Irène's branch in both), as against
   one each?
2. Is closing an old overview tab, silently, right, or should it become a GEDCOM
   tab in the matching mode with its scope?
3. In Graph and Timeline, should an Index row **centre the view on that person**
   rather than open the page, until step 2? (Not done here; it is a new behaviour
   in two drawings.)
4. The order of the modes in the menu and the setting: Genealogy, Graph,
   Timeline, Source, or Source first?
