## Context

Today (1.15.0 plus `auto-open-panels`):

- A GEDCOM tab is in Graph, Timeline or Source mode (`DESK_MODES`, `TabModes`,
  `deskState.ts`). Graph and Timeline are boards that `FileViews`
  (`src/desk/fileViews.ts`) makes on first show, keeps in a root of their own, parks on
  switching and hands a pending selection to. `GedcomView.renderMode`, `drawViews` and
  `handSelectionOver` drive them from the tab's own reading of the file (`genealogy()`).
- The record card is `RecordCardView` in the right sidebar; the Index is `IndexView` in the
  left one (`src/desk/DeskViews.ts`), a widget `IndexList` (`src/desk/indexList.ts`) with a
  kind switch, a search field, two chips and 44 px two-line rows in a window of a
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
header buttons, of the *Open GEDCOM files as* options and of the mode commands: Source
stays last, where it was, and List sits between the two boards (mine). A new
`ListBoard` (`src/desk/fileList.ts`) is made by `FileViews` on the first show of `list`, in
`gedcom-views-root is-list`, parked when another mode is shown and unparked with its
filter, sort and scroll as they were. It gets what Graph and Timeline get: the tab's
`GenealogyIndex`, a saved state, `select(xref, reveal)`, `openSearch()` (focus the filter),
`resized()`.

Alternatives: a separate `ItemView` for the list in the centre (what `file-views-as-modes`
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
interface ListState { kind?: ListKind; noSources?: boolean; sort?: Partial<Record<ListKind, ListSort>> }

columnsOf(kind): Column[]                    // key, label, numeric
sourcesCited(index, xref): number            // distinct sources, inline ones one each
citingRecords(index, xref): number           // distinct records that cite a source
listRows(index, { kind, query, noSources, sort }, collator): Row[]
nextSort(current: ListSort | undefined, by: SortKey): ListSort | undefined  // asc, desc, none
readListState(value: unknown): ListState
```

`peopleShown`, `familiesShown`, `sourcesShown` and `restsOnNothing` move over unchanged: the
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

`ListBoard.select(xref, reveal)`:

1. `xref === null` or no row for the record's kind: unmark, change nothing else.
2. Mark the row (`is-selected`, `aria-selected="true"` on the row element) in the window; if
   the row is not drawn it is marked when it is.
3. With `reveal` false (a click in the list itself, a restore) stop there.
4. With `reveal` true: if the record's kind is not the one shown, switch to it (this
   clears the typed filter, as switching does); if the row is not among the rows shown
   because of the filter or *No sources*, clear both; then set the scroll so the row is in
   the middle of the list's height. The scroll is a direct `scrollTop` assignment, not a
   smooth scroll: a virtualised list that animates across ten thousand rows streaks, and
   "reduced motion" is honoured trivially (mine).
5. The roving focus moves to that row, so the arrow keys continue from the selection.

`FileViews` already keeps a pending selection until the board is drawn and displayed and
`reveal` survives a later hand-over without it (`select` of `pending`), so a link followed
while the tab is behind another, in Source, or before its first draw centres the row when
the list is shown. `renderMode(true)` (the reader chose the mode) reveals; a restore does
not.

Alternative to clearing the filter: leave the row hidden and say so. Rejected: the reader
asked to see the record (a link, *Go to record*, Back), and a hidden selection is the
failure the Graph spec guards against by showing the person's branch.

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
had, re-homed under `gedcom-list-seg*`), the filter field, and for people the chips
*All N* and *No sources N*; beneath it the count line (an `aria-live="polite"` text) and,
on a wide tab, the header row. Columns are fixed per kind (`columnsOf`) and laid out with
`grid-template-columns: minmax(0, …fr) …` so that a long value is cut with an ellipsis and
the row can never be wider than the list.

People show Name, Years, Place, Sources; the Sources cell is the count of distinct sources
(`sourcesCited`) or, at zero, the `gedcom-list-gap` mark with the label «No sources at all».
Families show Spouses, Marriage, Place, Children. Sources show Title, Author, Repository,
Cited by (`citingRecords`). The kind is kept in `ListState.kind`, the chip in
`noSources`, each kind's sort in `sort[kind]`.

### Narrow tabs and phones

`ListBoard.resized()` measures its own root (`clientWidth`) and toggles `is-compact` below
640 CSS pixels; a width of zero (hidden, or happy-dom) changes nothing. A width, not
`Platform.isPhone`, because a desktop split can be as narrow as a phone and the rule is
about the room, not the device (mine). Compact: rows of two lines and 56 px (the wide row
is 32 px), the header row replaced by a `<select>` of the sort column and a direction
button, each at least 44 px high. The row height is a constant per layout
(`ROW_HEIGHT = 32`, `COMPACT_ROW_HEIGHT = 56`) because a virtualised window needs one;
the text is cut, never wrapped, so a wide font cannot change it. The root leaves room for
Obsidian's mobile navigation (`padding-bottom: var(--navbar-height, 0px)` as `.gedcom-fg`
does) and for the safe area.

### Keyboard and assistive technology

The scroller is the one focusable element (`role="grid"`, `tabindex="0"`) and keeps a
virtual focus: `aria-activedescendant` names the row, which carries `id`, `role="row"`,
`aria-rowindex`, and `.is-focused`. Rows are recycled by the window, so a DOM focus on a row
would be lost on each redraw; a virtual focus is not (mine). Keys: Up, Down, Home, End,
Page Up, Page Down move it and scroll it into the window; Enter and Space select it (Space
`preventDefault`s the page scroll) and the focus stays; a click sets the virtual focus and
selects. `aria-rowcount` is the number of rows shown plus the header. Headers are buttons
with `aria-sort`; the kind buttons are `aria-pressed`; the filter has a label. How a screen
reader reads a grid with a virtual focus and sticky headers is checked in the manual task;
if the tree is wrong the fix is the roles, not the model.

### What is saved, and what is not

A tab's state gains `list?: ListState` beside `graph` and `timeline`; `mode` may be
`"list"`. `readDeskState` reads it tolerantly (an unknown kind, a sort whose column
belongs to another kind, a non-boolean chip are dropped, the rest kept), and
`getState`/`setState` carry it through `ViewMemory` as the other two do. The typed filter
and the scroll are kept in memory while the tab is open (the board is kept, and the scroll
is recorded when the root is parked, as the timeline's is, because a webview may reset the
scroll of a hidden element) and are not saved: a restored list starts at the selected row.

A tab navigated to another file resets the views (`FileViews.reset`), which now includes
the list. A saved `mode: "list"` in a version that does not know it would be read by
`readOpenAs` as `undefined` and fall back to the setting; that is an older-plugin problem
only.

### The door: ribbon icon and command

The ribbon icon and the command `open-gedcom-index` stay, as one door, now **Open the list
of the GEDCOM file** (`command.openList`; `command.openIndex` goes). The id is kept so a
hotkey the reader bound survives (mine). `main.openList()`:
the followed tab (`followedView`), else the first leaf of `GEDCOM_VIEW_TYPE`; if it is
deferred, `await leaf.loadIfDeferred()`; `workspace.revealLeaf(leaf)` (1.7.2, below the
floor); `view.showMode("list")` (a no-op in List). With no GEDCOM leaf a `Notice`
(`notice.noGedcomTab`). The simplest thing that works: opening a file from a picker would
need a modal and a "last file" memory the plugin does not have, and the command **Show as
list** already covers the active tab. The door is for the tab that is behind a note.

Alternative: remove the ribbon icon and the command with the Index. Rejected for now: the
icon is the plugin's visible presence while the interface is on (a spec requirement), and
a reader looking at a note has no other way to reach the list of the file next to it.

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

All six of its requirements move to `genealogy-list`. Written as a delta with every
requirement REMOVED, `openspec archive` refuses it ("removes the last requirement … cannot
be written"), and refuses it again once the main spec is deleted by hand ("nothing to
remove"). What archives cleanly, tried on a copy of `openspec/`, is a change with **no**
`genealogy-index` delta and the main spec deleted by hand. So the change carries no delta for
the capability, and a task deletes `openspec/specs/genealogy-index/spec.md` in the
implementation commit. What a delta would have said:

| `genealogy-index` requirement | Reason | Moves to |
| --- | --- | --- |
| The index lives in the left sidebar and follows the GEDCOM tab | The left sidebar duplicated the file's list; the list is a mode of the tab | `genealogy-list`: A GEDCOM tab can show its file as a list; The ribbon icon and a command show the file's list; `genealogy-view`: A workspace saved with the Index in the left sidebar opens without it, and the renamed setting |
| People, families and sources | Laid out as a table for the centre | `genealogy-list`: People, families and sources |
| Who rests on no source | Unchanged | `genealogy-list`: Who rests on no source |
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
- `README.md`: the paragraph on the ribbon icon and the index, and the clauses about the
  index in the paragraphs on the panels and on what selects a record.
- `openspec/specs/genealogy-index/spec.md` (see above).

## Migration

- A saved `mode` is read as before and may now also be `"list"`; every earlier value
  (`graph`, `timeline`, `source`, `genealogy`) means what it did. A tab saved by this
  version in List mode opened by an older one reads `undefined` and falls back to *Open
  GEDCOM files as*.
- *Open GEDCOM files as* keeps its saved value; `list` is a new option, the default stays
  `graph`.
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
- A MODIFIED requirement restates the whole current text and every scenario; a new one is
  ADDED; a rename is REMOVED with a Reason and a Migration plus ADDED.

## Implementation

Deviations and decisions made while implementing are recorded here.
