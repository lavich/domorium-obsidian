## Context

Today (1.15.0 plus `auto-open-panels`):

- A GEDCOM tab is in Graph, Timeline or Source mode (`DESK_MODES`, `TabModes`,
  `deskState.ts`). Graph and Timeline are boards that `FileViews`
  (`src/desk/fileViews.ts`) makes on first show, keeps in a root of their own, parks on
  switching and hands a pending selection to. `GedcomView.renderMode`, `drawViews` and
  `handSelectionOver` drive them from the tab's own reading of the file (`genealogy()`).
- The record card is `RecordCardView` in the right sidebar; the Index is `IndexView` in the
  left one (`src/desk/DeskViews.ts`), a widget `IndexList` (`src/desk/indexList.ts`) with a
  kind switch, a search field, two chips (since dropped) and 44 px two-line rows in a window of a
  virtualised list. Both follow `main.followed()`, the most recently active GEDCOM tab, and
  are redrawn by `redrawDesk`.
- A row calls `openFromIndex(view, xref)`, which is `selectRecord(xref, "index")`. The
  origin `index` puts the cursor at the record in Source, gives the editor the focus, opens
  the right drawer on a phone, and is one of the origins that open the side panels.
- `main.cardWanted` builds `sidePanelPlan` for the Index and the card, and `openSidePanels`
  reveals each with `ensureSideLeaf(type, side, { active: false, reveal: true })`, restoring
  the active leaf after.

The user's reading (2026-11-05, in `proposal.md`) is that the left panel duplicates and
smears; the list should be another view of the file in the main window.

## Goals / Non-Goals

**Goals:** the lists of people, families and sources are a mode of the tab, drawn in the
centre where there is width; one selection mechanism, the card on the right; the left panel
and everything that served only it are gone; saved workspaces migrate without a notice.

**Non-Goals:** as in `proposal.md`.

## Decisions

### The list is a third board of `FileViews`

`ViewKind` becomes `"graph" | "timeline" | "list"`, `isViewMode` is true for all three, and
`DESK_MODES` is `["graph", "timeline", "list", "source"]`, which fixes the order of the
mode commands and of the header buttons on the screen: Source is the rightmost, as the
user asked (2026-11-05), and List sits between the two boards (mine). A new
`ListBoard` (`src/desk/fileList.ts`) is made by `FileViews` on the first show of `list`, in
`gedcom-views-root is-list`, parked when another mode is shown and unparked with its
filter, sort and scroll as they were. It gets what Graph and Timeline get: the tab's
`GenealogyIndex`, a saved state, `select(xref, reveal)`, `openSearch()` (focus the filter),
`resized()`.

### The change assumes `open-in-last-mode`

The user (2026-11-05) is removing the setting *Open GEDCOM files as* (`openAs`) in a
separate change, `open-in-last-mode`: a file opened anew takes the mode the reader last
chose on purpose (`lastMode`), Graph on first use. That change merges first and this one
rebases on it. Consequences:

- `list-view` adds no **List** option to *Open GEDCOM files as*, no `openAsOption.list`
  string and no test of the dropdown, and does not touch `openAs`, `readOpenAs`,
  `openAsOptions` or `setting.openAs.*`. `list` joins `DESK_MODES` and `DeskMode`, and so is one
  more mode the last-mode rule can pick; the rule itself is theirs.
- At the rebase these blocks of the delta specs are re-derived from `openspec/specs/` as
  that change leaves them, keeping only what list-view adds: `genealogy-view`'s *A GEDCOM
  tab is in one of four modes* (the sentence on how a file opens anew is a placeholder
  here that says "the rule for a new tab" and is replaced by theirs), *The genealogy interface is off until the
  reader turns it on*, *Links into a record* (its scenario *A link into a file that opens
  as a graph*) and the scenario *The setting row* of *Selecting a record opens the record
  card…* (it no longer says the row follows *Open GEDCOM files as*). They still quote the
  `openAs` wording because that is what `main` holds today.
- `deskState.ts`'s `DeskMode = OpenAsMode` and `settingsData.ts`'s `DESK_MODES` are wherever
  that change leaves them; the task that adds `list` to the modes follows them.
- The new scenario *A tab in List mode opens as a list* needs a counterpart in their
  rule: a reader who last chose List sees the next file open as a list. It is written at the
  rebase, against their requirement.

### The header buttons are added in reverse

Obsidian's `View.addAction` puts each new action to the left of the ones already there:
in the 1.15.0 bundle (`~/Library/Application Support/obsidian/obsidian-1.15.0.asar`,
`app.js`) it is `addAction(e,i,r){let n=createEl("button","clickable-icon view-action");return
this.actionsEl.prepend(n),…}`. Today `GedcomView` adds Graph, Timeline, Source, so on the
screen they read Source, Timeline, Graph from the left. The user wants Graph, Timeline,
List, Source from the left, Source rightmost, so `GedcomView` adds them in the order of a new
pure function, `actionOrder(modes)` in `deskState.ts`, which is the reverse of `DESK_MODES`
(Source first, Graph last). The unit test pins the reverse relation to the screen order (a
stand-in `addAction` that prepends, as Obsidian does), so a reordered `DESK_MODES` or a
change in how the buttons are added fails a test, not only the eye. Whether 1.8.7, the floor,
prepends as well is not verifiable here, the installed app being 1.15.0; the manual task
looks at it on a phone and a desktop, and the harness has no header.

Alternatives: reading the buttons' order from the DOM after adding and reordering the
elements (breaks if Obsidian re-creates the actions container); relying on `prepend`
without a test. Rejected.

Alternatives for the board: a separate `ItemView` for the list in the centre (what `file-views-as-modes`
removed for the timeline and graph, and which brings the tab-of-its-own problems back);
keeping the sidebar `IndexList` and merely moving its leaf to the centre (the widget is
laid out for a 300 px column, and `followed()` plumbing would stay). Neither.

### The rows are a pure model, the board only draws

`src/desk/listRows.ts` (no `obsidian` import, no DOM) holds what `indexList.ts` held and the
list adds:

```ts
type ListKind = "people" | "families" | "sources";
type SortKey = "name" | "years" | "place" | "sources"        // people
             | "spouses" | "marriage" | "place" | "children" // families
             | "title" | "author" | "repository" | "citedBy"; // sources
interface ListSort { by: SortKey; dir: "asc" | "desc" }
interface ListState { kind?: ListKind; sort?: Partial<Record<ListKind, ListSort>> }

columnsOf(kind): Column[]                    // key, label, numeric
sourcesCited(index, xref): number            // distinct sources, inline ones one each
citingRecords(index, xref): number           // distinct records that cite a source
listRows(index, { kind, query, sort }, collator): Row[]
nextSort(current: ListSort | undefined, by: SortKey): ListSort | undefined  // asc, desc, none
readListState(value: unknown): ListState
```

`peopleShown` (without the chip's filter), `familiesShown` and `sourcesShown` move over: the
same matching, which is why the filter scenarios are the Index's. The row types are the
plugin's own `PersonRow`, `FamilyRow`, `SourceRow` from `src/genealogy` (`childCount` and
`repository` are already there), so nothing is asked of upstream. The two counts are
computed once per `GenealogyIndex` (a `WeakMap`), not per keystroke.

Sorting computes one key per row, then sorts an array of positions with a comparator that
ends with the position, which makes it stable in both directions without reversing: a
descending sort negates the comparison of present values and leaves ties in the order of
the file. A missing value is ordered after every present one before the direction is
applied. Text keys are compared by one `Intl.Collator(currentLanguage(), { numeric: true,
sensitivity: "base" })`, so a letter with a mark sorts with its base letter (Eugène, Ève,
Jacques) and `Person2` before `Person10`. Names compare surname, then given name (a
person's `surname` and `given` where the name line writes both, else the whole name);
Years compares the year of birth; Marriage the year of the marriage. Verified on
`demo-vault/curie.ged` with a script (see "Facts checked"), including ties and the
descending order.

Alternatives: sorting by the name as displayed (given name first), which puts every
Curie under a different letter and is not what a genealogist expects of a name column;
sorting by years of life as text (`1867–1934`), which breaks on `≈` and BCE. Both rejected.

### One selection mechanism; the origin `index` goes

A row calls `host.select(xref)`, which the tab answers with `selectRecord(xref, "view")` —
the origin of a click on a card or a row of the other boards. `Origin` loses `"index"`.
That is right for each rule `originRules` held for it:

| rule | `index` was | `view` is | why it is right for a list row |
| --- | --- | --- | --- |
| `cursorToRecord`, `editorFocus` | true | false | a row is only activated in List mode; there is no editor to move |
| `revealsView` | true | false | the row clicked is in sight; the other boards take the selection when they are shown (`switched` reveal, as for a click in the graph) |
| `placesCard` | true | true | the card is shown |
| `opensDrawer` (mobile) | true | true | a tap opens the right drawer, as the Index row did |
| side panels | opens | opens (the card only) | unchanged for the card |

Alternative: a new origin `list` with the same rules as `view`. Two names for one rule;
rejected.

A selected record can be a person, a family or a source; the list marks the row of any of
them. `GedcomView.handSelectionOver` hands the list the selection where `pageKind` is
`person`, `family` or `source`, and the other boards the person only, as now. A media record
has no row; the list is left as it is.

### Showing the selected row

`ListBoard.select(xref, reveal)` keeps `marked`, the record it last marked, and:

1. `xref === null`, or a record with no row (a media record): unmark, change nothing else.
2. Mark the row (`is-selected`, `aria-selected="true"`) in the window; if the row is not
   drawn it is marked when it is.
3. With `reveal` false (a click in the list itself) stop there.
4. A selection that differs from `marked` (from outside, made while the list was away, or
   met on the first draw, which includes a restore) is brought into view fully: switch to
   the record's kind where the list shows another (this clears the typed filter, as
   switching does); clear the filter where it hides the row; then, if the
   row is not wholly within the visible rows, set `scrollTop` so the row is in the middle of
   the height. The scroll is a direct assignment, not a smooth scroll: a virtualised list
   that animates across ten thousand rows streaks, and reduced motion is honoured
   trivially (mine).
5. A selection equal to `marked` with `reveal` true (the reader switched back to the list)
   first lets the saved scroll be put back, then centres the row only if it is shown and
   outside the visible rows. The reader's filter is not cleared (mine): a filter typed on
   purpose is not the reader asking to see the record, a link or Back is.
6. The virtual focus moves to that row, so the arrow keys continue from the selection.

Why a restore reveals. Graph and Timeline save a position, so a restore marks the card
without moving a view that has one. The list saves no scroll (a number of rows scrolled is
meaningless once the file changes), so on the first draw there is nothing to keep: the first
draw is "a selection not yet marked" and the row is centred, which is what a reader of a
restored tab with a selection wants (the review of this plan found the earlier text, "a
restore does not", contradicting the spec and the first draw).

`FileViews` keeps a pending selection until the board is drawn and displayed and `reveal`
survives a later hand-over without it, so a link followed while the tab is behind another, or
in Source, or before the first draw, is applied when the list is shown. A first show hands
the pending selection over (`restore || displayed()`), and for the list that also covers a
tab that had a selection restored before its board existed: `FileViews.show` selects with
`reveal: true` for `first || parked` when the kind is `list`. `renderMode(true)` (the reader
chose the mode) is rule 5.

Alternative to clearing the filter on an outside selection: leave the row hidden and say so.
Rejected: the reader asked to see the record, and a hidden selection is the failure the
Graph spec guards against by showing the person's branch.

`GedcomView.markInViews` hands Graph and Timeline the person only. For the list the tab
hands `selectRecord`'s record whatever its kind where `pageKind` says person, family or
source (a media record becomes `null`), through `views.select("list", …)` from
`markInViews`, `handSelectionOver` and `clearViewSelections`; without this a family chosen in the card would never
switch the list's kind and no family or source row would ever be marked.

### The filter is a field, not the floating search

Graph and Timeline search with `FloatingSearch`: an icon over the canvas that expands into
a field with a counter and arrows, because a canvas has matches to step to. A list's
natural search is to narrow it; stepping through matches in a table the reader can scan is
worse than seeing only the matches, and the Index already narrowed. So the list has an
always-visible filter field in its toolbar (mine). The find key focuses it (`showSearch` →
`views.openSearch("list")` → `ListBoard.focusFilter()`: focus and select the text), so
`Mod+F` behaves as in the other modes: it takes the reader to the search of the mode.
Escape clears; with an empty field it returns the focus to the rows.

### Columns, headers, kinds

The toolbar is, left to right: the three kind buttons (the segmented control the Index
had, re-homed under `gedcom-list-seg*`), the filter field; beneath it the count line (an `aria-live="polite"` text) and,
on a wide tab, the header row. Columns are fixed per kind (`columnsOf`) and laid out with
`grid-template-columns: minmax(0, …fr) …` so that a long value is cut with an ellipsis and
the row can never be wider than the list.

People show Name, Years, Place, Sources; the Sources cell is the count of distinct sources
(`sourcesCited`) or, at zero, the `gedcom-list-gap` mark with the label «No sources at all».
Families show Spouses, Marriage, Place, Children. Sources show Title, Author, Repository,
Cited by (`citingRecords`). The kind is kept in `ListState.kind`, each kind's sort in `sort[kind]`.

### Narrow tabs, phones and touch

`ListBoard` measures its own root (`clientWidth`) in `resized()` and in a `ResizeObserver`
on the root (the tab's `onResize` alone misses a width that changes while the card opens),
and is `is-compact` below 640 CSS pixels **or** on a touch device (`Platform.isMobile` or
`matchMedia("(pointer: coarse)")`, which the board reads through its host so a test can
set it); a width of zero (hidden, or happy-dom) changes nothing. A width as well as the
device, because a desktop split can be as narrow as a phone and a tablet is wide but
touched (mine). Above 640 px on touch, rows are two lines too, and the kind buttons, chips
and column headers are at least 44 px tall.

The compact flip happens when a selection opens the card and shrinks the tab, which moves
the rows under the reader's finger. The board therefore keeps a hysteresis (compact below
640, wide again from 680) and, when the layout flips, re-anchors the scroll to the first
visible row (`scrollTop = firstVisibleIndex * newRowHeight`) before it redraws the window.
A resize alone never re-sorts or re-filters: `show` is a no-op for the same `GenealogyIndex`
identity and the same state, so only the window is redrawn. Compact: rows of two lines (the wide row
one), the header row replaced by a `<select>` of the sort column and a direction button, each
at least 44 px high.

Row heights follow the font size: `--gedcom-list-row` is `2.2em`-based (wide) and `3.6em`-based
(compact) on the root, with a floor of 44 px on touch, and the window reads the computed
height of one drawn row (`getBoundingClientRect`) rather than a constant, re-reading it on a
change of the root's font size. The text is cut with an ellipsis, never wrapped, so a wide
font changes a row's width but not its height. The root leaves room for Obsidian's mobile
navigation (`padding-bottom: var(--navbar-height, 0px)` as `.gedcom-fg` does) and for the
safe area.

### Keyboard and assistive technology

The grid is `role="grid"` with `aria-rowcount` (rows shown plus the header) and holds a
header row (`role="row"` of `role="columnheader"` cells, each containing the sort button,
`aria-sort` on the cell) and a scroller (`role="rowgroup"`, `tabindex="0"`) of
`role="row"` rows with `role="gridcell"` cells and `aria-rowindex`. The scroller keeps a
virtual focus: `aria-activedescendant` names the active row, which has an id and
`.is-focused`. Rows are recycled by the window, so a DOM focus on a row would be lost on
each redraw; a virtual focus is not (mine). The id is `${boardId}-r${position}`, a
per-board prefix plus the row's position among the rows shown, never the xref (an xref
contains `@`, and two tabs of one file would collide). A window redraw always draws the
active row, and a filter or sort that removes it re-points the focus to the nearest
shown row or clears the attribute, so the attribute never dangles. Keys: Up, Down, Home,
End, Page Up, Page Down move it and scroll it into the window; Enter and Space select it
(Space `preventDefault`s the page scroll) and the focus stays; a click sets the virtual
focus and selects. The kind buttons are `aria-pressed`. The filter is
`<input type="text">`, not `type="search"`, which would swallow the first Escape in some
engines and break the two-step Escape of the spec. How a screen reader reads a grid with a
virtual focus and a sticky header is checked in the manual task; if the tree is wrong the
fix is the roles or a roving `tabindex` on the drawn row, not the model.

### One collator

A module-level `collatorFor(language)` in `listRows.ts` owns one `Intl.Collator` per
language (`numeric: true`, `sensitivity: "base"`), created on first use; `ListBoard` and
`listRows` take it from there, not from `new` per sort.

### What is saved, and what is not

A tab's state gains `list?: ListState` beside `graph` and `timeline`; `mode` may be
`"list"`. `readDeskState` reads it tolerantly (an unknown kind, a sort whose column
belongs to another kind are dropped, and an old `noSources` key is ignored, the rest kept), and
`getState`/`setState` carry it through `ViewMemory` as the other two do. The typed filter
and the scroll are kept in memory while the tab is open (the board is kept, and the scroll
is recorded when the root is parked, as the timeline's is, because a webview may reset the
scroll of a hidden element) and are not saved: a restored list is drawn from the top and centres the selected row on its first
draw (see "Showing the selected row").

`FileViews.parkOthers` today calls `cancelHover()` on a graph and `unlight()` on a timeline; it
gains the list as a third case that does nothing (a list has no light), so parking a list or
parking another mode with a list drawn never calls a method the list lacks.

A tab navigated to another file resets the views (`FileViews.reset`), which now includes
the list. A saved `mode: "list"` read by a version that does not know it is dropped by that
version's reader and the tab opens by the rule for a new tab; that is an older-plugin problem
only.

### The door: a command

The command `open-gedcom-index` stays, as the one door, now **Open the list
of the GEDCOM file** (`command.openList`; `command.openIndex` goes). The id is kept so a
hotkey the reader bound survives (mine). `main.openList()`:
the followed tab (`followedView`), else the first leaf of `GEDCOM_VIEW_TYPE`; if it is
deferred, `await leaf.loadIfDeferred()`; `workspace.revealLeaf(leaf)` (1.7.2, below the
floor) and `workspace.setActiveLeaf(leaf, { focus: true })` (revealing alone does not
focus a tab); `view.showMode("list")` (a no-op in List). The leaf is the followed view's own
`leaf`, so a tab in a split or a popout is the one revealed. With no GEDCOM leaf a `Notice`
(`notice.noGedcomTab`). The simplest thing that works: opening a file from a picker would
need a modal and a "last file" memory the plugin does not have, and the command **Show as
list** already covers the active tab. The door is for the tab that is behind a note.

The ribbon icon that opened the Index is removed outright at the user's request (2026-11-05):
the plugin adds no ribbon icon, and `syncInterface` no longer creates or removes one. The
command stays, in the palette and for a hotkey. `GEDCOM_ICON_ID` stays registered, since the
views use it as their icon. Alternative: remove the command too. Rejected: a reader looking
at a note would have no way left to reach the list of the file next to it.

### The setting keeps its key and loses a word

With the Index gone, *Open the side panels when selecting* opens one panel. It is renamed
**Open the record card when selecting**, `ru`: «Открывать карточку записи при выборе»
(mine); the saved key `openPanelsOnSelect` and the i18n key `setting.openPanelsOnSelect.*`
stay so that no saved value is lost and no migration is written. `sidePanels.ts` keeps its
name and loses the Index half:

```ts
opensCard(origin): boolean                         // view | link
sidePanelPlan({ enabled, mobile, origin, card }): PanelStep   // "none" | "open"
```

`panelStep` stays. `main.cardWanted` uses it for the card; the focus restore after
`ensureSideLeaf` stays. The left sidebar is never opened by a selection, and a reader who
keeps a file explorer there has it left alone, which was the other half of the complaint.

### Retiring the view and the capability

`"domorium-index"` is added to `RETIRED_VIEW_TYPES`; `sweepRetiredViews` already runs at
layout-ready and on every layout change and detaches those leaves, so the left leaf is closed without a notice and
the other left-sidebar tabs and its collapsed state are untouched (`detachLeavesOfType`).
`syncInterface` no longer detaches the Index, and the test that no retired id is a
registered one (`deskState.test.ts`) drops `domorium-index` from the registered ids and
lists it among the retired.

#### Retiring `genealogy-index`

All six of its requirements move to `genealogy-list`. `openspec archive` does have a way to
retire a capability, but it refuses while the main spec holds content the merge cannot
account for ("removes the last requirement … cannot be written … delete the spec by hand");
a delta of REMOVED requirements for every one of them was refused on that ground. Deleting
the main spec by hand while keeping the delta was refused too ("nothing to remove"). The
route that was run to success on a copy of `openspec/` is a change with **no**
`genealogy-index` delta and the main spec deleted by hand. So the change carries no delta for
the capability, and a task deletes `openspec/specs/genealogy-index/spec.md` in the
implementation commit. What a delta would have said:

| `genealogy-index` requirement | Reason | Moves to |
| --- | --- | --- |
| The index lives in the left sidebar and follows the GEDCOM tab | The left sidebar duplicated the file's list; the list is a mode of the tab | `genealogy-list`: A GEDCOM tab can show its file as a list; A command shows the file's list; `genealogy-view`: A workspace saved with the Index in the left sidebar opens without it, and the renamed setting |
| People, families and sources | Laid out as a table for the centre | `genealogy-list`: People, families and sources |
| Who rests on no source | The *All / No sources* filter was dropped on purpose, at the user's request (2026-11-05); the mark stays and sorting by Sources lists those people first | `genealogy-list`: People who cite no source |
| Search | Unchanged matching, plus the repository | `genealogy-list`: The filter field |
| The index follows the file and holds up at size | Every mode follows the file | `genealogy-list`: A GEDCOM tab can show its file as a list; The list holds up at size |
| Selecting a record from the index | A row selects in the tab it is drawn in | `genealogy-list`: A row selects…; The selected row is brought into view |

### Renames the validator forces

A requirement cannot be renamed, nor can a scenario of a MODIFIED one (the validator lists
omitted scenarios), so where the Index's name is in a scenario's name or the requirement's
title, the requirement is REMOVED and ADDED under a new name: *A GEDCOM tab is in one of
four modes*, *The graph, the timeline and the list draw the tab's own reading of the file*,
*Nothing a reader does in a tab or the card writes to the file*, *Selecting a record opens
the record card, unless the reader turned it off*, *A tab holds one selected record*,
*A person's card is marked as selected*, *A person's row is marked as selected*. Where only
the body changed, the requirement is MODIFIED with every scenario, as the earlier steps did.
A scenario whose name stayed true ("Turning it off with panels open") kept its name.

## Deleted code

- `src/desk/indexList.ts` (`IndexList`, `IndexHost`, `IndexFile`, `INDEX_KINDS`, `ROW_HEIGHT`
  of 44) and `src/desk/indexList.test.ts`: the filtering functions move to `listRows.ts`
  with their tests, the widget's tests become `fileList.test.ts`.
- `src/desk/DeskViews.ts`: `IndexView`, `INDEX_VIEW_TYPE`, the imports it alone used
  (`Platform`, `openFromIndex`, `IndexList`, `GEDCOM_ICON_ID`). `RecordCardView`,
  `RECORD_VIEW_TYPE` and `DeskViewsHost` (with `followed()`, which the card still needs)
  stay.
- `src/desk/deskState.ts`: `IndexTarget`, `openFromIndex`, the origin `"index"`.
- `src/desk/tabModes.ts`: `"index"` in `originRules`.
- `src/desk/sidePanels.ts`: the Index half of `PanelState`, `SidePanelsInput`,
  `SidePanelPlan`, `opensSidePanels` (renamed `opensCard`).
- `src/main.ts`: the `IndexView` registration, `openIndex`, `revealSidebarView`, the Index
  half of `cardWanted` and `openSidePanels`, the Index loop in `redrawDesk`, the Index
  detach in `syncInterface`, `INDEX_VIEW_TYPE`/`IndexView` imports.
- `src/i18n/{en,ru}.json`: every `index.*` key (the kinds, search hints, chips, empty
  states and the gap mark become `list.*`), `command.openIndex`, `index.noFile`.
- `styles.css`: `.gedcom-desk-index`, `-index-head`, `-index-list`, `-index-spacer`,
  `-index-window`, `.gedcom-desk-search`, `-filters`, `button.gedcom-desk-chip-filter`,
  `button.gedcom-desk-row`, `.gedcom-desk-row-*`, `.gedcom-desk-gap` and the `.gedcom-desk-seg*`
  rules (re-homed under `gedcom-list-*`); `.gedcom-desk-index` leaves the shared colour rule
  with `.gedcom-card`. Found with `grep -n "gedcom-desk-\(index\|row\|seg\|search\|filters\|chip\|gap\)" styles.css`.
- `harness/desk.ts`, `harness/desk.html`: the `IndexList` mount and `#index-pane`.
- `tests/desk.spec.ts`: "lists families in the index and selects one", "rounds the index
  tabs…", "the index in a narrow sidebar", "the index of a large file"; replaced by specs in
  `tests/fileList.spec.ts`. The empty-state expectation «…the timeline or the index.»
  becomes «…or the list.».
- Left alone: `docs/design/research-desk*.md`, `docs/design/next-steps.md` and `CHANGELOG.md`
  mention the Index; they are historical notes and a release's job, not this change's.
- `README.md`: the paragraph on the ribbon icon and the index, and the clauses about the
  index in the paragraphs on the panels and on what selects a record.
- `openspec/specs/genealogy-index/spec.md` (see above).

## Migration

- A saved `mode` is read as before and may now also be `"list"`; every earlier value
  (`graph`, `timeline`, `source`, `genealogy`) means what it did.
- *Open GEDCOM files as* is not touched here: `open-in-last-mode` removes it and merges
  first (see "The change assumes `open-in-last-mode`").
- `openPanelsOnSelect` keeps its key and value; only its label changed.
- A saved Index leaf in the left sidebar is closed once, at layout-ready, by
  `sweepRetiredViews`, interface on or off.
- Nothing about a file, a link or the API (`src/api.ts`) changes. `src/api.ts` does not
  mention the Index (`grep -n -i index src/api.ts` finds nothing).

## Relation to the previous steps

- `file-views-as-modes` put Graph and Timeline in the tab and gave `FileViews` its shape;
  List is the third occupant, reusing the pending selection, the park-and-restore and the
  `resized()` hand-over, and adding no new mechanism to the tab.
- `record-card-panel` made the card the single reader of a record and the selection the
  tab's; the list is one more way to set it, and the Index's `index` origin collapses into
  `view`.
- `auto-open-panels` is narrowed to the card; its pure `sidePanelPlan` shrinks, its
  setting is renamed, its requirement is restated.
- Step 3, the map (#215), will be a fifth mode: `DESK_MODES`, `ViewKind`, `FileViews` and
  the mode control are where it goes. Nothing here blocks it.

## Facts checked

On `demo-vault/curie.ged` with a script under `/tmp` that bundles `src/genealogy` and
`src/desk/indexList` (the functions that move) and reads the file: 17 people, 5 families, 3
sources; the 11 people citing nothing (I5 Zofia, I6, I7, I8, I9, I10 Sophie-Claire, I11,
I13, I15, I16, I17), Marie citing 2 sources and Pierre 1; filters `joliot` → I12, I14, I16,
I17 (and `JOLIOT` the same; with *No sources* I16, I17), `1867` → I1, `salomea` → I1,
`Warsaw` → seven people, family F1, source S2, `archive` → S2 only, `curie` → six people and
four families; the family rows (`F3` 1895, Sceaux, France, two children; `F2` no marriage;
`F1` five children); the source rows (S2 no author, repository State Archive in Warsaw, two
citing records; S3 three; S1 two); sort orders — name ascending starts Boguska and ends
Szalay with the Curies Eugène, Ève, Jacques, Pierre, descending reverses them; years
ascending Eugène (1827) … Pierre Joliot (1932) with I3 before I10 at 1832; descending with
I13 before I15 at 1904; sources ascending the 11 first and Marie last; families by
children descending F1, F2, F3, F4, F5; sources by citing records descending S3, S1, S2;
`curie` with years descending: I13, I12, I1, I2, I11, I9.
`Hélène Langevin-Joliot` reads `b. 1927` and depends on the current year, so no scenario
uses it for her years.

## Risks / Trade-offs

- **A list that is not on screen while the graph is.** The reader loses an always-visible
  overview; that is the user's request and the card on the right is the always-visible part.
  Two tabs of one file (a graph and a list side by side) are possible and each keeps its own
  mode.
- **Virtual focus in a grid.** `aria-activedescendant` on a scroller with recycled rows is
  correct on paper and needs a screen reader to confirm: a manual task, with the fallback
  of roving `tabindex` on the drawn row.
- **Sorting twenty thousand rows on a keystroke.** Sorting is on a press, filtering on a
  keystroke; keys are computed once per index and the sort is one `Array.sort` of positions.
  The spec promises responsiveness, not a time; the browser spec asserts the drawn window,
  not a duration.
- **`openspec archive` and the retired capability** (above); a task deletes the spec by hand
  and `npm run openspec:validate` runs after.
- **A hotkey on the old command now does something else.** It shows the list instead of
  opening the Index; both are "the thing that was the Domorium panel". Accepted.
- **The label of the setting changes in Russian too**, and a reader who knew it may look for
  the old words; the description says what it does.

## Lessons carried over from the earlier steps

- A leaf may be deferred (Obsidian loads background tabs lazily): the door calls
  `loadIfDeferred()` before it touches a view, and `redrawDesk` skips a leaf whose view is
  not a `RecordCardView`.
- A selection can arrive before a board is drawn, while the tab is hidden, or while a mode
  is being switched: it goes through `FileViews.select`, which holds it, and a `reveal`
  asked for survives a later one without.
- Focus: a click in the list does not move the focus out of the list; the side-panel plan
  restores the active leaf after revealing the card; `Mod+F` focuses the filter.
- Counts and plurals go through `plural()` with Russian `few`/`many` forms; nothing is
  spelt by "is it one".
- Reduced motion: the list animates nothing.
- CI is a slower Linux runner with a wider font: browser specs assert relations (inside,
  no overflow, fixed row heights, a bounded number of drawn rows, order of text) and never
  a duration or a text width.
- The `## Purpose` of a new capability is written by hand: archive creates `genealogy-list`'s
  spec with a placeholder ("TBD - created by archiving change list-view"), as it did for
  `genealogy-record-card`, so the archive PR must write a real Purpose (a task).
- A MODIFIED requirement restates the whole current text and every scenario; a new one is
  ADDED; a rename is REMOVED with a Reason and a Migration plus ADDED.

## Implementation

Deviations and decisions made while implementing are recorded here.

- 0.1: the `genealogy-view` blocks that quoted `openAs` are re-derived from the main spec as `open-in-last-mode` left it (the last-mode rule restated in full for four modes, with a scenario that a reader who last chose List sees a file open as a list); every MODIFIED block of the other capabilities was compared with the current main text and its scenarios and none had drifted.
- 3.1 (mine): the rows are positioned absolutely (`top` = position × measured row height) and kept in a map of live rows that is reconciled, not rebuilt, on a scroll, a key or a focus; only a change of rows, a flip of the layout or a resize of the height replaces them. The first version rebuilt the window when the scroller took the focus, which removed the row under a mousedown and lost the click; the browser spec "selects the record of a clicked row" found it, and a unit test now pins that taking the focus keeps the row elements. Because the rows are absolute, the active row is always one of the live rows even where it lies outside the window (a key moved it, then the reader scrolled away), so `aria-activedescendant` never names a missing row.
- 3.1 (mine): `state()` omits what is default (kind People, no chip, no sort), so a list nobody touched is `{}` and `show` compares states by a canonical form, not by the saved JSON. A key from no focus (Down, Up, the page keys) goes to the selected row, else the first, rather than moving by one from nowhere; Home and End do as they say.
- 3.1 (mine): the Escape in the filter that finds the field empty gives the focus to the scroller; the board has no host call for it. The sort direction button is named by the state it shows, with `list.sortAscending` and `list.sortDescending` in place of the planned `list.sortDirection`. `list.search.sources` and `list.nothing.sources` name the repository, which the filter matches (the Index's text did not). The kind buttons and the chips carry `aria-pressed`.
- 3.1 (mine): the root also gets `is-touch` (from the host's `coarsePointer()`), which is what lifts the kind buttons, chips, headers and the filter field to 44 px, while `is-compact` (a narrow tab or touch) is what makes rows two lines and brings the selector. On a compact people or families row the cells go to a two-by-two grid (name and years above, place and the count or mark below); on a source row the title and the count are above and the author and repository below. The `ResizeObserver` is created only where the global exists, so the unit tests under happy-dom run without it.
- 3.2 (mine): `FileViews` hands a pending selection to the list with `reveal` true on a restored show, as designed; the list's scroll is kept in memory in `FileViews` (not in `ViewMemory`, so it is never saved) and put back on a restore before that selection is applied.
- 4.1 (mine): the unit tests cannot reach `GedcomView`; `markInViews` and `handSelectionOver` hand the list a person, a family or a source through one helper that returns `null` for a media record, and the harness stand-in tab does the same, so `tests/fileList.spec.ts` covers the hand-over of a family and a source.
- 6.2 (mine): the harness has no real view header, so the spec that reads Graph, Timeline, List, Source from the left reads the stand-in's own buttons; what pins the real order is `actionOrder` with a prepending `addAction` in `deskState.test.ts`. The stand-in gained a `touch` option (the host's `coarsePointer()`) and a `language` option, its host `select` records the call and hands the selection back to the views as the tab does, and `src/testing/obsidianDom.ts` gained the global `createDiv` the board uses (`obsidianmd/prefer-create-el` asks for it).
- 6.2 (mine): the spec that nothing scrolls sideways reads the list, its scroller and the views root, not the page: the stand-in's button bar is wider than 390 px by itself.
- 7.1 (mine, by instruction): the delete of `openspec/specs/genealogy-index/spec.md` is left for the archive PR, so `openspec validate` still sees it; every other part of 7.1 (the two files, the README) is done, and the task stays unticked for that reason.
- Not touched: the strings `setting.openAs.*` and `openAsOption.*` that `open-in-last-mode` left unused in `src/i18n`; they are not this change's.


### After review

Two reviews of the implementation; what was changed, each decision (mine):

- **A kind switched from outside was never reported.** `ListBoard.select` now snapshots the state it would save and calls `host.changed` once at the end when it differs (kind, chip), so `FileViews.kept.list` and the tab's memory follow, and a later `show` (resize, a mode round trip, a restart) no longer reverts the kind. The typed filter is cleared by the switch itself and by a new selection that hides its row, and by nothing else.
- **Keyboard focus survived nothing.** The header buttons, the two chips and the sort selector's options are built once and updated in place (text, `aria-sort`, `aria-pressed`, `is-active`); the options are rebuilt only when the kind changes. The grid's key handler ignores events that do not come from the grid itself, because the header now lives inside it and Enter on a header button was being cancelled.
- **The grid is the focusable scroller.** The scrolling element is the `grid` with `aria-activedescendant`, `aria-label` and `aria-rowcount`; the header row is inside it, sticky, with `aria-rowindex="1"`, data rows start at 2 and sit in a `rowgroup`. The sort arrow is a real `aria-hidden` element, not a pseudo-element, so a screen reader reads `aria-sort` only. With the header inside the scroller there is no scrollbar gutter to measure, and the visible height of the rows is the scroller's less the header's.
- **The list's scroll.** The board reports every scroll, its own included, to `FileViews`, which keeps the last value; `show` puts it back whenever the board's differs, so a tab that went behind another with no `hide`, or was hidden before the views, comes back where it was. This replaces capturing it only in `parkOthers`; that capture stays, guarded by the board being in sight (a hidden scroller reads zero).
- **Row height follows the font.** A hidden probe element takes the row's height from the same style (`--gedcom-list-row`, in `em`); the board reads it instead of drawing a row, and a `ResizeObserver` on the probe re-reads it when the font size or the layout changes, keeping the first visible row. The browser spec sets `--font-ui-small` and checks the rows' height and pitch, not a pixel value.
- **Marks that are not colour alone.** The no-source mark is a 10 px ring with a title, and on a compact row it is followed by "0 sources"; the selected row has an inset accent bar on the inline start besides its background, distinct from hover (background only) and focus (outline). On a compact row the counts are labelled ("2 sources", "2 children", "Cited by 2"), and a source row has the same two-by-two grid as the others. The count line aligns with the controls on a compact list.
- **Shared helper.** `listSelection(index, xref)` in `listRows.ts` is what the tab and the harness stand-in both use to say which record the list can mark.
- **Cleanup.** The unused `setting.openAs.*` and `openAsOption.*` strings are deleted; comments that restated code are removed. Task 7.1 stays unticked: the deletion of the `genealogy-index` spec belongs to the archive PR.

### The toolbar's one height

The user found the kind buttons and the filter field of different heights. All of the toolbar's controls now take one height from `--gedcom-list-control`, which is Obsidian's `--input-height` (30 px where it is missing) and 44 px on a touch device, set on the root with `is-touch`, so the lift applies to every one of them together. The segmented bar, the filter field and the chips are that height with the same radius (`--input-radius`) and the same font size, centred in the row; the buttons inside the bar are the bar's height less its inset. In a compact list the sort select and the direction button are the larger of that height and 44 px, which the spec asks of them. The browser spec compares the heights of the bar, the filter and the chips, and of the buttons among themselves, on a desktop and with touch. (mine)

### The No sources switch is gone

The user (2026-11-05) does not want the *All / No sources* switch. The two chips, their counts, the `noSources` key of the saved list state (an old saved key is read and ignored; the kind and the sorts are kept), the filter by "cites no source" in `listRows.ts`, `restsOnNothing`, the strings `list.all` and `list.noSources` and the CSS are removed, with their tests and the README sentence. Kept: the mark of a person who cites no source (the ring with its title, and "0 sources" on a compact row) and the sortable Sources column, whose ascending order lists those people first (checked on `curie.ged`: the 11 people, I5 to I17 in the file's order, then Pierre and Marie). That sort replaces the filter. The toolbar is now the kind bar, the filter field and, in a compact list, the sort select, which share one height. On touch the kind bar has no inset, so its buttons are 44 px as well. (mine)
- Ribbon (mine, by the user's decision): `addRibbonIcon`, the `ribbonIcon` field and its removal are deleted from `main.ts`; the interface-setting description no longer names the ribbon icon, in either language; the requirement is now "A command shows the file's list", with a scenario that the ribbon holds no icon of the plugin. No pure test of `syncInterface` existed. `addIcon` and `removeIcon` stay for the views. The README names the command only.

- Tooltip lesson (mine, a bug the user found in Obsidian): Obsidian turns any element with an `aria-label` into a hover tooltip, so naming the grid, which fills the tab, with `aria-label` put «Records of the file» over the whole list. The grid, the filter field, the sort select and the floating search field are now named by `aria-labelledby` on a visually hidden span (`nameBy` in `dom.ts`, one id per label); the `title` that doubled the tooltip on the direction button and the no-source mark is gone. `aria-label` stays on small icon buttons, the mark, and the cards, nodes and name buttons of the graph and timeline, where the tooltip is wanted. Guards: a unit test that no element of the list carries `aria-label` where it would be a tooltip, and browser specs that no element larger than 120 by 60 px, except buttons and inputs, carries one in the list, graph, timeline and card, and that the grid's `aria-labelledby` names an element holding the label.

### The list's search, the explorer's rows, the header buttons (mine)

- **Search.** The list uses the same `FloatingSearch` as the graph and the timeline, configured by a `narrowing` option: no arrows (the buttons are not created, so the tab order and the tooltip guard have nothing to skip), a counter text of its own (`N of M` from the list's own count strings), and Enter handing the keyboard to the rows. It stays in the toolbar, at the inline end, as a flex item and not floated over the rows: a float over the table would cover the header's sort buttons or the scrollbar, and the toolbar has the room. The shared CSS selectors gained the list's prefix. An outside selection that clears a hiding query empties the field but leaves the search open; the typed text is still not saved. `focus(select)`, `reset()` and `describe()` were added to the component for the list.
- **Rows.** Rows are drawn as `.nav-file-title`, read from the installed 1.15 bundle: radius `var(--nav-item-radius, var(--radius-s))` (Obsidian sets it to `--radius-m`), inset 4 px in the grid with 8 px inside, hover from `--nav-item-background-hover` and `--nav-item-color-hover`, the selected row from `--nav-item-background-active`, `--nav-item-color-active` and `--nav-item-weight-active`, and the focus ring `0 0 0 2px --background-modifier-border-focus`, accent while the grid has the focus, as `.tree-item-self.has-focus` does. The inset accent bar and tinted backgrounds are gone. By default Obsidian's active weight is `inherit` and its active background is the hover one, so the cue is the colour change and `aria-selected`; that is the parity the user asked for. The harness palette gained the navigation variables, with distinct values, and the theme spec reads them and the radius.
- **Header buttons.** Obsidian's own `.clickable-icon.is-active` styling (`--icon-color-active`, `--background-modifier-active-hover`) already marks the mode shown, so our accent colour rule is deleted. The four buttons get the class `gedcom-mode-action` and `.view-action.gedcom-mode-action + .gedcom-mode-action { margin-inline-start: var(--size-2-2) }`: a sibling margin, not `gap` on `.view-actions` (which would space Obsidian's own buttons) and not `:has()`. The stand-in tab bar now uses the same classes so `tests/header.spec.ts` reads the computed gap, active and hover backgrounds and radius. Whether four buttons and their gaps fit the 390 px header beside Obsidian's own actions is not measurable here and goes to the manual check.

### Metrics, focus and header icons by evidence (mine)

Read from the compiled `app.css` of the installed 1.15.0 bundle:

- **Explorer rows.** `.tree-item-self{border-radius:var(--nav-item-radius); color:var(--nav-item-color); font-size:var(--nav-item-size); line-height:var(--line-height-tight); font-weight:var(--nav-item-weight); margin-bottom:var(--nav-item-margin-bottom); padding:var(--nav-item-padding)}` with, on a desktop, `--nav-item-size: var(--font-ui-small)` (13 px), `--line-height-tight: 1.3`, padding `var(--size-4-1) var(--size-4-2) var(--size-4-1) var(--size-4-6)` and `--nav-item-margin-bottom: 0`; the container has `padding: 4px 12px`. A list row now takes `font-size: var(--nav-item-size, var(--font-ui-small))`, `line-height: var(--line-height-tight, 1.3)`, `padding-block: var(--size-4-1)`, no gap, and its height, and the probe's, is `calc(size * line-height + 2 * var(--size-4-1))`, 24.9 px at the default 13 px (compact: the larger of that for two lines and 44 px). The first cell has the row's colour (`--nav-item-color`) and the other cells `--font-ui-smaller` in `--text-faint`, the one choice of mine that departs from the explorer, for a hierarchy.
- **Explorer focus.** `body:not(.is-phone) .workspace-leaf.mod-active .tree-item-self.has-focus{box-shadow:0 0 0 2px var(--background-modifier-border-focus)}`, and the accent colour only for `:focus-within`, which is the item element itself holding the focus, never the case in the explorer's container. The accent we used came from the scroller being the focused element. The row's ring is now the border-focus colour, only in an active leaf and not on a phone; the selected row keeps `--nav-item-background-active` whether or not the grid has the focus, as `.tree-item-self.is-active` has no focus variant. The harness wraps the stand-in tab in `.workspace-leaf.mod-active`.
- **Header icons.** `.clickable-icon{color:var(--icon-color)}`, `.clickable-icon svg{opacity:var(--icon-opacity)}`, `:hover{color:var(--icon-color-hover);background-color:var(--background-modifier-hover)}` with `svg{opacity:var(--icon-opacity-hover)}`, `.is-active{color:var(--icon-color-active);background-color:var(--background-modifier-active-hover)}`. Native header actions that are on or off do not use `is-active`: `.view-action.mod-bookmarked{--icon-color:var(--icon-color-active);--icon-color-hover:var(--icon-color-active)}` (the same for `.mod-webviewer`), no background. We mirror that: the mode shown has `gedcom-mode-active` and `aria-pressed="true"`, and one rule sets `--icon-color` and `--icon-color-hover` to `--icon-color-active` for either, so that a theme restyling `is-active` cannot reach it, and our `is-active` toggle is gone. The harness palette now carries the native `.clickable-icon` rules (opacity on the svg, not the button), its icons are real svgs, and `tests/header.spec.ts` reads their computed colour, opacity and background for normal, hover and active.

