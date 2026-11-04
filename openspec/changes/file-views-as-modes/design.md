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
click that selects (an Index row does), no shared scope, no
conversion of old tabs.

## Decisions

### Four modes in the order the user named them

`DESK_MODES = ["genealogy", "graph", "timeline", "source"]` in
`src/settingsData.ts` — it replaces `OPEN_AS_MODES` there, and `deskState.ts`
imports it, since `settingsData.ts` imports nothing and the other direction would
be a cycle — in that order everywhere: the menu, the setting's
dropdown, the command list. (The user confirmed this order on 2026-11-05. It is one array.) `OpenAsMode` is the same four. `readDeskState` accepts the four
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
  select(kind: ViewKind, xref: string | null): void;   // kept as pending until drawn
  openSearch(kind: ViewKind): void;     // expand the floating search and focus it, or just focus it
  hide(): void;
  resized(): void;                      // only where a board exists
  displayed(): boolean;                 // a board's root has a box: the keep-last-good-size case
  memory(): ViewMemory;
  reset(): void;                        // another file: drop boards and memory
  dispose(): void;                      // the tab closes
}
```

- **One element per view, made on first use and kept.** `GedcomView` already has
  `editorEl` and `deskEl`; `FileViews` adds `viewsEl`, in which `FileGraphBoard`
  and `FileTimelineBoard` are created the first time they are shown, each in its
  own root. A board kept alive is what keeps the zoom, search text and hover
  state between mode switches, with no rebuild; the model is
  `fileTimelineOf(index)`, held per index, so switching back to the same text
  lays nothing out again — the boards already return early on the same model and
  scope.
- **`show` order.** The root is un-hidden *before* `board.show`, and `resized()`
  is called by `show` itself: a switch of mode inside the tab does not resize the
  leaf, so nothing else would tell the board that it has a box now (a board
  shown while its root is `display: none` measures nothing).
- **No board before the file is read.** `GedcomView` constructs and runs
  `showMode()` before Obsidian has loaded the file, and a graph shown on an empty
  index is not harmless: `FileGraphBoard.show` treats the first model it gets as
  the opening, and would spend the saved view on nothing. The tab therefore draws
  a view only when its file is loaded (set in `setViewData`, **not** cleared by
  `clear()`: Obsidian calls `setViewData(data, true)` after `setState` for a
  restored tab, so clearing there would undo what `setState` had just read).
- **No drawing out of sight.** A tab in Graph mode behind another tab must not
  lay out 10 000 people on every `setViewData`. Drawing asks
  `containerEl.isShown()`; if false it marks the views stale and returns, and a
  resize that finds the tab shown draws them.
- **Hiding.** `hide()` toggles the roots off and calls `cancelHover()` on each
  board, so a hover timer cannot light a hidden card. Before it hides, it
  records the timeline's plot scroll (`scrollTop` and `scrollLeft`) into the
  memory: `display: none` resets both, and `show` puts them back after the layout
  (design question settled: restored, not reworded). The graph needs no such
  thing, its position being the transform.
- **Selecting.** `select(kind, xref)` never fails and never needs a drawn board:
  the tab's selection is a fact about the tab, and a tab that the Index follows is
  often hidden, stale or never drawn. `FileViews` keeps it as pending until the
  board exists, and `show` hands it to the board, which marks the person selected
  (a class of its own, `is-selected`, beside the hover light and the search's
  `is-current`) and centres on them with the same glide the search uses: the graph
  at a readable zoom, the timeline with the row in the middle and the lifeline in
  view. A person outside the board's branch changes its scope to theirs first (the
  same `focus`, the numbers kept), through the board's own scope change, which
  reports it like any other. **The board keeps `selected` as the person's id**,
  not as an element: searching (`setQuery`) and a scope change do not clear it; a
  card or row not drawn at the moment — virtualised out of the window, outside a
  scope narrowed by hand, absent from a new model after an edit — shows no mark and
  shows it again when it is drawn; and in the graph every copy of the person
  (`scene.copies`, a person drawn more than once) carries it. `select(kind, null)`
  clears it. The tab clears it on **both** kinds whenever `selectionCleared`
  comes back, because the boards are kept alive: Graph to Timeline to Graph must
  not show a stale mark. The tab, not the board, ends a selection whose person is
  gone: on a draw after a text change `TabModes` finds no such person in the new
  index, drops the selection, and the Index and Evidence follow
  (`genealogyChanged`).
- **Finding.** `openSearch(kind)` is the search's own API
  (`FloatingSearch.open()` and `focus()` in `floatingSearch.ts`): closed, it
  expands the icon into the field and focuses it; open, it only focuses. It needs a
  drawn board, so the tab draws first (`needsDraw`), and then calls it.
- **Dispose.** `dispose()` is `hide()` plus dropping the boards; the tab's
  `onClose` calls it, as the overview view's `onClose` did (`cancelHover`).
- The host methods are thin: `openRecord` is the tab's `openRecord` (below),
  `showInSource` its `showInSource`, `portrait` its `portraitOf` — the picture
  the person's page shows, from the tab's own language service, so the closed-file
  `portraitIn` goes with `OverviewReads.held`.

### What a tab remembers

`getState()` adds, beside `mode`, `record` and `view` (the person page's tab):

```json
{ "mode": "graph", "record": "@I1@",
  "graph":    { "focus": "@I12@", "up": 2, "down": 2, "view": { "x": 0, "y": 0, "k": 0.6 } },
  "timeline": { "focus": "@I12@", "up": 2, "down": 2, "zoom": 8, "scroll": { "top": 0, "left": 0 } } }
```

`graph` and `timeline` are present once that view has been shown, and not
before; the timeline's also carries `scroll: { top, left }`, so an untouched tab's state is what it was. They are the shapes the
overview tabs saved, less `gedcom` and the state's `around`, plus the timeline's
scroll: `readGraphState` and
`readTimelineState` stay, read the nested object, and clamp as they did (0–9
generations, zoom ranges, a missing or empty focus dropped, a malformed view
dropped; a scroll is clamped to a non-negative finite number); `GraphState.gedcom`,
`GraphState.around` and `TimelineState.gedcom` go. `GraphSettings.around` stays: it
is how the first opening is told whom to centre on, and is no longer saved. Nested rather than flat because Graph and Timeline each have a `focus`, `up`
and `down`, and because it keeps `view` (the graph's position) apart from the
person page's `view` key.

**Each view keeps its own scope** (mine). The alternative, one scope for the tab
so that choosing Irène's branch in the timeline is still Irène's branch when the
tab is switched to the graph, is a better feel and a worse contract: the two
views already differ in what they save (zoom against position), their first
opening differs (the graph centres a person, the timeline scrolls), and the
requirements that exist say "keep its scope". The user confirmed one scope
each (2026-11-05).

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

**The memory is written from callbacks only.** The boards report their scope and
view through `scopeChanged` and `stateChanged`, and `FileViews` keeps what they
report; `memory()` returns that, and never asks a live board for `view()`. A
board that has just been shown, or hidden, or resized to nothing, would otherwise
hand back a view computed from a zero size, and the tab would save it. (The
timeline's scroll is the exception: read in `hide()`, while the plot is still
displayed, and in `memory()` only while `displayed()`.)

**`GraphCanvas.resized` keeps the last good size.** Today it assigns the size
before its zero check (`graphCanvas.ts:331-333`), so a zero rect leaves the canvas
with no size and the next draw lays out for a window of nothing. The size is
assigned only after the check.

**What `setState` does with them.** History navigation (Back to the graph)
arrives as `setState` with the state `getState()` produced earlier. The tab takes
`graph` and `timeline` from it into its memory; `FileViews.show` applies a scope
that differs from the board's (the board's own change handling), and does *not*
move a view already on screen, since only a first show takes a saved view — so
Back to a graph the board still holds shows it as it stands, which is where the
reader left it. A restored tab has no board yet, and takes the saved view.

**Another file.** `setState` with a file other than the tab's own — the tab was
navigated — resets in its `!sameFile` branch, where the mode, record and selection
are already reset today: `FileViews.reset()`, an empty memory, then the incoming
state's `graph` and `timeline` are read *after* the reset and *before*
`super.setState`. Not in `clear()` or in `setViewData(…, true)`: a restored tab
receives `clear = true` after its `setState`, which would drop the state just
read. Without the reset the second file would draw with the first's focus, view
and board.

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

**An Index row is not a click.** The user's decision (2026-11-05): while the tab
is in Graph or Timeline, an Index row for a *person* **selects** them — the view
glides to the card or row and marks it selected — without opening the page and
without changing the mode. This is new behaviour of the two views and the one
step 2 wants for a click: when the card has its own place, a click on a card or a
row will do exactly what the Index row does now, and `openRecord` from the views
will mean "select, and show the card in the right panel". Until then the two
differ, and the difference is stated, not hidden. A row for a family, a source or
a media record has nothing to select in either view and opens its page, leaving
the mode, as before (a family *node* could be selected in the graph; not
done — the Index lists families, and a node is a click away).

The mark is the tab's, not a board's: `FileViews.select(kind, xref)` marks one
person in the board shown. The tab holds `selectedPerson` (`GedcomView.selected` is the selected *fact*,
which is a different thing), which ends — `selectionCleared` calls
`FileViews.select(kind, null)` for both kinds — whenever the mode changes,
whatever the target, including from Graph to Timeline, when the person's record
is gone from the file, and when the interface is turned off (the mode then shows
as Source, and `shownRecord()` is null); it is not saved. A second selection replaces the first. Selecting
a person who is not in the branch shown changes the branch to theirs (mine; the
alternatives were the whole file, which can be 10 000 people, and a notice).

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
read `shownRecord()` and `deskSelection()`. With a selection in the views
(above), the choice of 2026-11-05 is that both are cheap and both are used:

- `shownRecord()` is the page's record in Genealogy mode, the **selected person**
  in Graph and Timeline (null when nobody is selected), and null in Source. The
  Index therefore marks the selected row, as the requirement says.
- `deskSelection()` is `{ index, record, fact: null }` for that selected person,
  so Evidence shows their whole record, and says to open the file as genealogy
  when nothing is selected. `placeEvidence` keeps its condition,
  `shownRecord() !== null`, so the panel is also placed on the first selection in
  a view.
- `recordAtCursor()` is the selected person's record in Graph and Timeline, so the
  copy-link commands are offered while somebody is selected and not otherwise
  (`identifiedRecord`); in Genealogy it is the page's record, in Source the
  cursor's.
- `openFromIndex(tab, xref)` in `deskState.ts` takes three branches: Source goes
  to the line; Graph or Timeline calls the tab's `selectInView(xref)`, which
  answers true whenever the tab is in a view mode and the record is a person of
  the file — whether or not the view is drawn: it records the selection, applies
  it when the board is drawn, and ends with `host.genealogyChanged(this)` so the
  Index marks the row, Evidence shows the record and `placeEvidence` runs — and
  false only for a record that is not a person, which then opens the page;
  Genealogy opens the page. `IndexTarget` gains `inView()` and
  `selectInView(xref)`.
- Editor commands: `inSource()` is the mode being Source, so they are offered in
  Source only — except **Find**, which is offered in Source, Graph and Timeline
  (`canFind()` on `CommandView`). `showSearch(replace)`, which Obsidian's own
  `editor:open-search` dispatches to the active view by duck type, is routed by
  the mode (the user, 2026-11-05: «Mod+F вне режима Source пусть открывает поиск в
  том режиме, который включен»): Source opens the editor's panel as now; Graph and
  Timeline call `FileViews.openSearch` — the field expanded and focused, or only
  focused if already open; Genealogy has no search of its own and the call does
  nothing (before, it opened the panel in a hidden editor, which showed up later in
  Source). `showSearch(true)`, replace, is Source-only: it does nothing elsewhere,
  and the Replace command is offered in Source only.
- The status bar (version, problems) is the file's, not the mode's, and shows for
  any GEDCOM tab as it does in Genealogy mode; unchanged.

### Leaving Source, and the cursor

`toggleMode` today sets the record from the cursor when going Source →
Genealogy, and moves the cursor to the page's lines going back. The first half
becomes "on leaving Source for any mode" so that the 500-person rule and a later
switch to Genealogy see the cursor's record. The second half stays Genealogy →
Source only; from Graph or Timeline the cursor is left where it was, since those
modes have no "what is shown" to move it to, and the `record` the tab holds may be
older than the cursor.

### Routes into a page

`goToXref` (a followed link, an `obsidian://` link, `openGedcomLink` on a file that
opens as a graph, **Go to record**) takes its page route today without changing
the mode, which is right only in Genealogy. Now: in Genealogy the route is as
before (`record` set, the page redrawn, no history step); in Graph or Timeline it
is `openRecord(xref)` — Genealogy mode, a history step by `navigationStep`, and the
layout saved — so Back returns to the view. A record with no page that has an
identifier switches to Source and goes to it, as now. `goToRecord` for a record
with no identifier (the header, the trailer) switches to Source first and then
moves the cursor: in any mode but Source it would otherwise dispatch into an
editor that is not shown. The scenarios are in `genealogy-view`.

### The mode state machine is a pure class

`GedcomView` is untestable in Vitest (`obsidian` is types only), and almost
everything this change decides is a rule about which mode, which record and what
to draw. Those rules live in `src/desk/tabModes.ts`, no `obsidian` import, with
`src/desk/tabModes.test.ts`:

```ts
class TabModes {
  mode, lastMode, record, selectedPerson, stale, loaded;
  setMode(next, { interfaceOn, cursorRecord }): { changed, moveCursor, selectionCleared };
  openRecord(xref): { mode: "genealogy", record, step };   // what the tab sets and whether history steps
  select(xref, isPerson): boolean;       // true in a view mode for a person, drawn or not
  textChanged(index): { selectionCleared };  // marks stale; drops a selection whose person is gone
  fileChanged(): void;                                      // reset record, selection, lastMode
  textChanged(): void;                                      // mark the drawn views stale
  needsDraw(shown: boolean): boolean;                       // loaded, a view mode, and shown
  toggleTarget(): DeskMode;
}
```

`GedcomView` applies its results (moves the cursor, calls `FileViews`, saves the
layout); it does not decide. The rules carried here: leaving Source records the
cursor's record when it has a page; the last mode other than Source; mode change
clears the selection; `openRecord` from Graph or Timeline is a history step on the
same record; a file change resets everything; a mode while the interface is off is
Source; nothing is drawn before the file is loaded. `navigationStep`,
`modeChoices` and `openingMemory` stay as free functions in `deskState.ts`, which
`TabModes` uses.

### Resizes and the edges of the view

Obsidian calls a view's `onResize` from a `ResizeObserver` and from a loop on
window resize, hidden leaves included. `GedcomView.onResize` therefore returns
unless `containerEl.isShown()` and the tab's `viewsEl` has a box (`showMode()`
un-hides `viewsEl` in the view modes whether or not a board exists yet), and only
then draws what `needsDraw` says — which makes the first board of a tab restored
behind another tab, a view never drawn — and calls `FileViews.resized()` once a
board exists. Guarding on a board's own root instead would never fire for a view
that was never drawn: such a tab would stay blank when brought to the front.
`displayed()` (a board's root has a box) is kept for the other case, where a board
exists and a zero rect must not be taken as its size. With
`GraphCanvas.resized` keeping the last good size and the memory written from
callbacks only (above), a hidden tab that is resized to nothing and shown again
comes back at the position it left.

**Text changed by the plugin.** `MoveFollower.followMove` reaches the tab through
`applyWorkspaceEdit`, a CodeMirror transaction that is not `applyingData`; the
update listener bumps `revision` and calls `announceEdit`, which today only tells
the panels. In the debounced announce, a tab that is not in Source now also
marks its views stale and draws them if shown, and drops a selection whose person
is gone. (The Genealogy page after such an edit is `A page follows the file`,
which exists; no new requirement.)

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

1. **Detach them on layout-ready** (chosen, mine; confirmed 2026-11-05): a
   `sweepRetiredViews()` doing `detachLeavesOfType` for the two retired ids, in the
   `onLayoutReady` callback and also in the `layout-change` handler, which
   already runs `syncInterface` while the interface is off — so a leaf that a
   late restore or a pasted layout brings back is swept too, whether the interface
   is on or off. No
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
  `FILE_GRAPH_VIEW_TYPE`, `OVERVIEW_VIEW_TYPES`, `fileName`, and the imports they
  alone used: `Range`, `Platform`, `setIcon`, `GenealogyIndex`, `FILE_GRAPH_ICON`,
  `FILE_TIMELINE_ICON`, `fileTimelineOf`, `FileGraphBoard`, `readGraphState`,
  `GraphState`, `PortraitContent`, `FileTimelineBoard`, `readTimelineState`,
  `TimelineScope`, `TimelineState`, `ViewStateResult` if nothing else uses it —
  `Platform` and `setIcon` stay if `IndexView` still uses them (it uses
  `Platform`). `IndexView` and `EvidenceView` and their host stay; `Index`'s
  `open` goes through `openFromIndex` as before.
- `src/vault/overviewReads.ts` and `overviewReads.test.ts`.
- `src/main.ts`: the registrations; `overviewsOpening`; `reads`; `openOverview`,
  `openOverviewOf`, `openOrReveal`, `overviewIndex`, `portraitIn`,
  `overviewClosed`, `openRecordIn`, `showSourceIn`, `bringFileTab`, `openTab`
  (only the overviews asked "which tab holds this path"), `forEachOverview`,
  `markOverviewsStale`, `followOverviews`; the `modify` handler; the `delete` and
  `create` handlers (they exist for readings of closed files); the overview lines
  in `active-leaf-change`, `layout-change`, `genealogyChanged` and `syncInterface`;
  `FileOverviewHost` from the `implements`; the imports that become unused:
  `Range`, `TAbstractFile`, `MediaVault`, `mediaPreviewContent`, `PortraitContent`,
  `initialFocus`, `openFromIndex`, `GenealogyIndex`, `OverviewKind`,
  `leafShowingFile`, `OverviewReads`, and the view classes and types of
  `DeskViews` (`tsc` and `eslint` find the rest); `descendantPaths` stays (the
  `MoveFollower` uses it). The `rename` handler stays, minus `followOverviews`.
- `GedcomViewHost.openOverview`; `CommandHost.openOverview`; `OverviewKind`.
- The boards: `showGone`, the gone element and its class, `overview.gone`, and
  their tests; `GraphState.gedcom` and the state's `around`, `TimelineState.gedcom`
  (`GraphSettings.around` stays).
- `src/vault/openTabs.test.ts`: the two tests that a timeline or graph leaf is not
  taken for a tab of its file. `openTabs.ts` itself stays: it reads
  `state.file` only. The `gedcom` key existed so that an overview leaf was not
  matched as a tab of the file by `leafShowingFile` and `MoveFollower.openView`;
  with no such leaf there is nothing to keep apart.
- `styles.css`: the rules `.workspace-leaf-content[data-type="domorium-file-timeline"] .view-content`
  (near line 1125) and `…-graph"` (near 1676), dead with the views; their `padding:
  0` and `overflow: hidden` go to the tab's content (`.gedcom-gedcom-view`). The
  harness pages `harness/fileGraph.html` and `harness/fileTimeline.html` lose the
  `data-type` attribute of the removed types and wrap their board in an element
  with the tab's class, so the specs see the same CSS the tab gives.
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
«Исходник». The Russian for the timeline is *хронология*, as in 1.14. `evidence.noTab`
(«Open a GEDCOM file as genealogy to see what a fact rests on.») is unchanged; it is
also what Evidence shows in a view with nobody selected, until step 2 reworks it.

The README sections for the timeline and the graph are rewritten: they are modes
chosen from the header control, a command or the tab's menu, not tabs.

### Tests

- Unit (Vitest, `node`): `deskState.test.ts` — `readDeskState` with the four modes
  and the two memories; `modeChoices`; `navigationStep`; `RETIRED_VIEW_TYPES`; the
  opening scope (`openingMemory`) for a small and a large file; `openFromIndex`
  in the three modes. `tabModes.test.ts` — the state machine of the section
  above: the record from the cursor on leaving Source, the toggle's last mode, a
  selection ended by a mode change, `openRecord` as a step from a view, a file
  change resetting, nothing drawn before the file is loaded, a hidden tab marked
  stale, `recordAtCursor`'s rule for each mode. `settings.test.ts` — the four `openAs` values. `commands.test.ts`
  — the four commands and their availability, the toggle, no overview commands.
- Unit (happy-dom): a new `fileViews.test.ts` — no board before the first `show`;
  `show("graph")` then `show("timeline")` toggles roots and leaves each board's
  view; the same index lays nothing out twice (a spy on the layout); the saved
  view is spent by the first show only; the opening scope on a 2 000-person file;
  the memory after a scope change and after the first show; `hide()` cancels the
  hover; a click on a card calls the host's `openRecord`, a mark `showInSource`.
  `fileGraphView.test.ts` and `fileTimelineView.test.ts` lose `gedcom`, the state's
  `around` and `showGone` tests — `GraphSettings.around` and its tests stay — and
  gain tests of the selected mark, of a zero-size `resized` keeping the last good
  size, and of the timeline's scroll read and restored; the rest passes unchanged,
  which is the check that the views are not altered.
- Browser: `harness/fileViews.ts` (+ `.html`, one line in `build.mjs`) mounts a
  `FileViews` in a stand-in tab with buttons for the modes; `tests/fileViews.spec.ts`
  checks in a real browser what happens when a board is unhidden — a canvas that
  was hidden has a size and draws, the position survives a round trip, the
  timeline's sticky names and axis still follow the plot after it, a phone width.
  The existing `fileGraph` and `fileTimeline` specs mount the boards directly and
  do not change, their `around` option included (it feeds `GraphSettings.around`);
  the harness pages only lose their `data-type`.
- By hand in Obsidian (the first task of the last group): what no test reaches —
  the header control and its menu on desktop and phone, Back from a page to a
  graph and Forward again, a restored tab in each mode, the old overview tabs
  closing, hotkeys.

### What step 2 leaves to do, and what this makes easy

Step 2 (its own change): the record card in the right sidebar; Evidence's
content merged into the card, below it; the person page's Timeline and Places
as sections; removing Genealogy mode and the page's Tree tab; `openRecord`
becoming "select and show the card", which is what an Index row already does in
Graph and Timeline after this change, so a click on a card or row then does what
the row does now; `shownRecord()`/`deskSelection()` answering for every mode, Genealogy gone; the *Open GEDCOM
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
- **Mod+F outside Source** is routed by mode, so a hidden editor's panel is never
  opened: a view that is not drawn is drawn first, and Genealogy mode does nothing.
- **A selection and a view that is not drawn.** The selection is kept by the tab and
  by `FileViews` as pending, and applied when the board is made; no answer depends
  on a board existing.
- **A deleted file's tab.** `FileView.onDelete` steps the leaf back through its
  history; with the views in the tab that can land on a page or a graph state of
  another file. Checked by hand (7.1), not designed around.
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

## Decisions of the user (2026-11-05)

1. Graph and Timeline each keep their own branch scope.
2. An old overview tab is closed silently.
3. An Index row in Graph or Timeline selects the person and centres the view,
   without opening the page or changing the mode; a click on a card or row in the
   view keeps opening the page until step 2, when it becomes what the Index row does.
4. The order of the modes is Genealogy, Graph, Timeline, Source.
5. Mod+F outside Source opens the search of the mode that is on: the view's
   floating search, expanded and focused, in Graph and Timeline; nothing in
   Genealogy; replace stays Source-only.

## Open Questions

None for the user at the time of writing. Decided by me and open to a change:
selecting a person outside the branch shown changes the branch to theirs, and an
Index row for a family, a source or a media record opens its page.
