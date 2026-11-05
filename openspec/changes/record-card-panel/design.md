## Context

After step 1 a GEDCOM tab has four modes (`DESK_MODES` in `src/settingsData.ts:5`)
and the one that reads a record, Genealogy, is the one that does not fit the
user's target («при клике по пользователю или строке открывается карточка
пользователя в правой вкладке, а не в центре как сейчас»). Today:

- `GedcomView` draws a record as a page into `deskEl` (`drawDesk`,
  `src/GedcomView.ts:784`). The page is chosen by `TabModes.record`; a click in
  a view, an Index row or a link reaches it through `openRecord`
  (`GedcomView.ts:476`), which rewrites the tab's view state and asks Obsidian for
  a history step (`result.history = true`, `GedcomView.ts:302`; the rule is
  `navigationStep`, `src/desk/deskState.ts:132`).
- The page has four tabs (`PERSON_VIEWS`, `src/desk/personPage.ts:35`): Card, Tree
  (`personTree.ts`, `personTreeView.ts`, 257 and 129 lines), Timeline and Places;
  a desktop frame that scrolls a body under a sticky heading and tabs
  (`frame`, `personPage.ts:121`), and a phone variant that scrolls the whole page
  and keeps the tabs. Facts unfold their sources only on a phone (`renderUnfold`).
- Evidence is an `ItemView` in the right sidebar (`EvidenceView`,
  `src/desk/DeskViews.ts:88`) drawn by `renderEvidence` (`src/desk/evidence.ts`),
  placed once a session by `placeEvidence` (`src/main.ts:364`) when
  `view.shownRecord() !== null`, and following the tab most recently active
  (`followed()`, `main.ts:291`). The Index follows it the same way (`IndexView`).
- Step 1 left the seams this change uses: the views call one method to choose a
  record (`FileViewsHost.openRecord`, `fileViews.ts:15`), the tab's modes are a
  pure class (`TabModes`), and an Index row in Graph or Timeline already selects
  (`selectInView`, called from `openFromIndex`, `deskState.ts:96`) — which step 1 said is «the behaviour a click
  gets in step 2».

The renderers a card needs all exist and are pure DOM builders with a host
interface (`PageHost`, `src/desk/personPage.ts:37`): `renderPersonPage`,
`renderFamilyPage`, `renderSourcePage`, `renderMediaPage`, `renderEvidence`,
`renderTimeline`, `renderPlaces`, `renderGallery`. What is new is the container
and the state, not the content.

## Goals / Non-Goals

**Goals:**

- A record is read in a card in the right sidebar, beside whatever mode the tab is
  in, and a tab never leaves Graph, Timeline or Source to show one.
- One state, the selected record, drives the card, the Index's current row, the
  mark in a view and the cursor in Source — whoever changed it.
- Evidence is a section of the card, not a panel; the person page's Timeline and
  Places are sections; the Tree is gone.
- The card works in a 320-pixel sidebar and in a phone drawer.
- Every behaviour of the views the user approved is unchanged but for what a
  click does.
- Nothing is written to the file.

**Non-Goals:** as in `proposal.md`. In particular no map, no new drawing, no
actions in the card that write, no saved history.

## Decisions

### The tab holds one selected record, replacing `record` and `selectedPerson`

`TabModes` has two fields for what is shown: `record`, the page's record in
Genealogy mode, and `selectedPerson`, a mark in a view (`tabModes.ts:34-35`). They
become one, `selected: string | null`, the xref of a person, a family, a source or
a multimedia record of the file (the four kinds `pageKind` already names,
`deskState.ts:58`). `GedcomView.selected` (the selected *fact*, a different thing)
is renamed `selectedFact` to stop the clash and stays in the view: it is not saved
and ends when the record changes.

```ts
class TabModes {
  mode: DeskMode;                 // graph | timeline | source
  lastMode: DeskMode | undefined; // other than Source, for the toggle
  selected: string | null;
  loaded: boolean;
  setMode(next, leaving): ModeChange;   // { changed, moveCursor, selectionChanged }
  applyState(desk): { selectionCleared }; // mode and selected, from a saved or incoming state
  select(xref, index): boolean;         // true for a record that has a card; false, and nothing kept, while the interface is off
  textChanged(index): { selectionCleared };   // the record is gone, also a restored one the file never had
  interfaceChanged(on): { selectionCleared };
  fileChanged(mode): void;
  needsDraw(shown): boolean;
  shownRecord(): string | null;         // the selected record, null while the interface is off
  recordAtCursorFor(mode, cursorRecord): string | undefined;
}

type Origin = "view" | "index" | "card" | "link" | "history" | "cursor";
function originRules(origin: Origin, mobile: boolean): {
  cursorToRecord: boolean;   // Source: put the cursor at the first line
  editorFocus: boolean;      // ...and let the editor take the focus
  revealsView: boolean;      // Graph, Timeline: glide or scroll to it
  addsStep: "visit" | "follow" | "none";
  placesCard: boolean;       // the once-a-session placement
  opensDrawer: boolean;      // mobile only
}
```

`originRules` is pure and lives in `tabModes.ts` (mine, from the plan review), so the
table below is a unit test and not a convention: `cursor` and `history` never move
the cursor, never take the focus and never dispatch into the editor (a cursor-follow
that moved the cursor would fight the reader's typing, and Back in Source would drag
the caret), and only `index`, `link` and `card` put it on a record's first line, the
editor taking the focus for `index` and `link` only.

`openRecord`, `applyState`'s `step` and `recordChanged`, and the Genealogy branches
of `setMode`, `recordAtCursorFor` and `shownRecord` go. `select` no longer needs
`inView()`: it is true wherever the record has a card.

**What selects, and what each mode then does.** One function in `GedcomView`,
`selectRecord(xref, origin)`, is the only way in. `origin` is where the gesture
came from, because the same selection asks different things of the view:

| Origin | Graph or Timeline | Source | The card |
| --- | --- | --- | --- |
| `view` — a click, tap or key on a card, node, name or lifeline | marks the person, **does not move** | — | shows it; a phone opens the drawer |
| `index` — a row | marks, **glides** | cursor to the first line, scroll, editor takes the focus | shows it; a phone closes the left drawer and opens the right |
| `card` — a relative, a citation, a person or family or media tile | marks, glides | cursor to the first line, scroll, **focus stays in the card** | shows it |
| `link` — a wikilink, `obsidian://`, *Go to record* | marks, glides | as `index` | shows it |
| `history` — the card's Back and Forward | marks, glides | **nothing: cursor and focus stay** | shows it, no new step |
| `cursor` — the cursor rested in a record in Source | — | **nothing: never dispatches into the editor** | shows it, replaces the current step |

The glide rule — a click inside a view does not move the view — is mine. The card
is on the right, the reader is already looking at the card or row, and a view that
re-centred on every click would make the second click land on a moving target. The
Index row, a link and the card's own relatives are the cases where the person may
be out of sight, and those glide, as step 1 specified for the Index.

**While the interface is off** (mine) the Source cursor listener, `select`, the
history and `cardWanted` do nothing, `selected` stays `null` and nothing of it is
written to the saved state; `goToXref` and `goToRecord` still move the cursor in
Source, as before the interface existed (a scenario pins it). `selectRecord` ends with
`requestSaveLayout()`, since `selected` is part of the state. A restored `selected`
that the file does not declare shows the empty state and is dropped by
`TabModes.textChanged` once the file is loaded. `RecordHistory` is seeded from a
restored `selected` with `visit`, so Back has a base.

The mark is kept for persons only. `FileViews.select(kind, xref)` is called with the
person's xref, or `null` for a family, a source or a media record, so that the
previous mark ends. A family node has no mark: step 1 declined it and this change
does not add one (proposal Non-goals). Alternative considered: mark the node.
That is a new state on `GraphCanvas` (nodes have `is-armed` and the light, not a
selected look), a second look in the timeline, which has no family node at all,
and a copy of the same decision for a source and a media record, which no view
draws. Declined; the card says what is selected.

### Persistence: `selected` is saved, a view's saved position still wins

A restart used to show the same page (`record` was saved). An empty card after
every restart would be a step back for the reader who left a tab on a person, and
the cost is small, so `getState()` writes `selected` and `setState` reads it. This
reverses step 1's "an index selection is not saved", which was right while the
selection was a mark on a view and wrong now that it is the thing the card shows.

The part that needs care is the view. Step 1's `FileViews.show` applies a pending
selection by gliding to it, and for the graph a selection "made before the first
draw wins over a saved view" (`graphCanvas.ts` `select`, pending `centre`). A
restored tab must show its saved position with the mark on. So `select` takes a
`reveal` flag and the pending selection remembers it:

```ts
FileViews.select(kind, xref: string | null, reveal: boolean): void  // pending {xref, reveal}
FileGraphBoard.select(xref, reveal), FileTimelineBoard.select(xref, reveal)
GraphCanvas.select(id, reveal)
```

With `reveal: false` the board marks (`is-selected`) and does nothing else; with
`true` it behaves as step 1's `select`, scope change included. A pending selection
keeps `reveal: true` if any revealing origin set it (Index row, link, card relative,
Back or Forward — even while the tab is in Source or behind another tab), and
`renderMode`'s hand-over with `reveal: false` never overwrites it: step 1's scenario
"selected while the tab is behind another, then brought forward: centred" survives,
and a selection that was only kept across a mode switch is not centred. Both have a
scenario in the two views' specs and a unit test in `fileViews.test.ts`. A restore, a mode
switch with a selection, and a `view` origin pass `false`; the rest pass `true`.
`TabModes.setMode` passes nothing to the boards: `renderMode` hands the current
selection to the view it shows with `reveal: false`, so a Graph → Timeline → Graph
trip leaves each view where it was (step 1's requirement) with the mark on.

A person outside the saved scope has no card to mark; the mark appears when the
card is drawn, as step 1 already specifies ("absent from what is drawn"). Only a
`reveal: true` selection widens the scope.

`getState()` therefore holds `{ mode, selected?, graph?, timeline? }`. The old keys
`record` and `view` are not read (`readDeskState`), so a Genealogy tab's person is
dropped on migration; the alternative, reading the old `record` as `selected`, would
be one line and is not done because the user's brief said the old keys are
ignored. It is the cheapest thing to add if it is missed.

### Mode, history and Back: the tab's own history carries nothing

With no page mode there is no navigation a tab does between records. Mode switches
were never steps. So `navigationStep` (`deskState.ts:132`), `result.history = true`
in `setState`, `TabModes.openRecord`, `GedcomView.openRecord`'s
`leaf.setViewState` and the `recordChanged` flag go; the tab's Back and Forward
move between files opened in the tab, as for any Obsidian file view. Obsidian's
`FileView` still steps a leaf back when its file is deleted
(`onDelete`); with only files in the history that is the ordinary behaviour.

Back and Forward for records is the card's own, below.

### The card is a view in the right sidebar over the followed tab

`RecordCardView` (type `domorium-record`) is an `ItemView` in `src/desk/DeskViews.ts`
beside `IndexView`, with the same `DeskViewsHost` (`followed()`, `notesFor`,
`openNote`). It owns no state but the notes it asked the vault for (what
`EvidenceView` held) and the scroll of the body. Everything else is the followed
tab's: `GedcomView` already has `genealogy()`, `portraitOf`, `mediaItems`,
`mediaItem`, `openVaultFile`, `showInSource`, `selectFact`; the card needs three of
them made public and one interface so that the pure renderer does not import
`obsidian`:

```ts
// src/desk/recordCard.ts — no obsidian import
interface CardTab {
  index(): GenealogyIndex;
  selection(): { record: string | null; fact: FactKey | null };
  mediaItems(media: { at: Position; record?: string }[]): MediaItem[];
  mediaItem(at: Position): MediaItem | null;
  portrait(xref: string): PortraitContent | null;
  select(xref: string): void;                // origin "card"
  selectFact(key: FactKey | null): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  history(): { canBack: boolean; canForward: boolean };
  back(): void; forward(): void;
}
function renderRecordCard(container: HTMLElement, tab: CardTab | null, notes: NoteHit[] | null, view: CardView): void
```

`renderRecordCard` draws the header (Back, Forward), the empty states, and the page
for the kind of record, appending the Evidence section. `RecordCardView.redraw()`
asks `followed()` and calls it. `GedcomView` implements `CardTab`.

**Redrawing.** `main.ts:redrawDesk` (called from `genealogyChanged`, from a change of
the followed tab, and after the metadata cache changes) redraws the Index and now
the card in place of Evidence. A card in a sidebar tab that was never shown is a
**deferred leaf** (Obsidian 1.7.2: `leaf.view` is a placeholder until the leaf is
shown), so `leaf.view instanceof RecordCardView` is false for it, as it is today for
Evidence; it is skipped and draws itself in `onOpen`, which already calls
`redraw()`. `revealLeaf` on a deferred leaf loads it (`loadIfDeferred`, 1.7.2); the
card command and the phone path `await leaf.loadIfDeferred()` first.

**Cost** (mine). The Index's current row changes on every cursor-follow, so
`IndexList` gets `setCurrent(xref)`, which moves the `is-current` class and nothing
else, instead of the full `show()`; the full refresh stays for a changed file.
`DeskViewsHost.notesFor` is cached per file and invalidated by the metadata cache's
`changed` for a note that links the file, so a change of record asks the vault once per
file, not once per record. A card whose leaf is hidden or in a collapsed sidebar
neither draws nor asks for notes; it draws from `onOpen`, from `onResize` when shown,
and when `followed()` changes. The 250 ms debounce of the cursor-follow stays.

**Scroll, focus and the announcement.** A redraw rebuilds the DOM, which loses the scroll position and
the keyboard focus. Selecting a fact must not throw the reader to the top of a long
card, and a keyboard user must stay on the fact. The view keeps the body's
`scrollTop` per record (not across records: another record scrolls to the top) and
sets it back after the draw; a focusable row carries `data-focus-key` (the fact key,
or the xref of a relative) and the view focuses the same key after the draw **only if the focus was inside the
card before it**: a redraw caused by typing in Source must not pull the focus out of
the editor. A visually hidden polite live region (`aria-live="polite"`) holds the
shown record's name and is rewritten when the record changes (`card.announce`,
«Shown: {name}» / «Показано: {name}»). Selecting a fact in the Timeline section
selects it and unfolds its sources under the fact in the Facts list; it does not
scroll the card, and only *All evidence* scrolls to the Evidence section. Typed
text redraws on the debounced announce, as it does for the Index, so a keystroke
does not.

**Revealing.** `revealLeaf` expands a collapsed sidedock and selects the tab, and
does **not** make the leaf active (step 1 hit the same: `revealLeaf` only selects
the tab). That is what is wanted: the reader keeps the focus in the view, and
`followed()` stays on the GEDCOM tab, since `active-leaf-change` to the card finds
no `GedcomView` and leaves `followedView` alone (`main.ts:213`). The consequence,
accepted: while the card has the focus no GEDCOM command is available
(`getActiveViewOfType(GedcomView)` is null), so *Copy link* is run from the tab.

**Revealing and the focus** (mine, from the plan review). On a desktop a selection
gesture never calls `revealLeaf` or expands a sidebar (the spec says it shall not).
Where the right split is a drawer — `Platform.isMobile`, not `isPhone`, since a
tablet's drawer is the same — a second touch and an Index row call
`workspace.ensureSideLeaf(RECORD_VIEW_TYPE, "right", { active: false, reveal: true })`
(1.7.2): it creates the leaf if there is none and reveals it, ignoring `cardPlaced`,
so a card the reader closed is back on the touch that asked for it. The command *Show
the record card* uses the same call with `active: true` and then
`setActiveLeaf(leaf, { focus: true })`, so it expands a collapsed sidebar and the card
has the focus.

**Placement.** `placeEvidence` becomes `placeCard`: once per session, the first time
a record is selected by a gesture of the reader, `getRightLeaf(false).setViewState(
{ type, active: false })` where no card is open. It is called from `selectRecord`
for every origin except `cursor`, not from `genealogyChanged`, because
`genealogyChanged` also fires when a tab opens or a file changes; with the cursor
following a record in Source, a reader who opened a file to edit would otherwise get
a panel they did not ask for. A closed card stays closed for the session
(`cardPlaced`, as `evidencePlaced`). Whether `getRightLeaf(false)` leaves a
collapsed sidebar collapsed is Obsidian's, and is in the manual check.

**On a phone** the right sidebar is a drawer. A second touch on a card, node or
row, and an Index row, open the drawer on the card as above; a relative
inside the card does not (it is already open). First touch lights, second touch
selects and opens, as the graph and timeline already have it, so the step-1 gesture
rule is kept. An Index row on a phone used to close the left drawer and show a page
in the centre (`IndexView.open`, `DeskViews.ts:64`); it now closes the left drawer
and opens the right one, because with no page in the centre the card is the only
place the person can be read. Mine; see open questions.

**Command.** `open-gedcom-evidence` ("Open the evidence panel") is replaced by
`open-gedcom-record-card` ("Show the record card"), same availability (interface on).
It `revealLeaf`s, creating the leaf if there is none. A hotkey bound to the old
command stops resolving; not migrated, as step 1 did for the overview commands.
A second command, "Show the record at the cursor", is not added: in Source the
card follows the cursor, and in the views the selection is what the reader chose.

### The card's body: one narrow column, sections in order

`renderPersonPage` loses `frame()`, `renderTabs`, the `tree` and `expanded` options
and `PersonPageOptions.phone`. What remains is a single column — heading, facts,
other names, family, media — followed by two new sections and the evidence:

```
Header  [‹] [›]                                   sticky, from RecordCardView
Heading portrait · name · years · places · Show in source
Facts   (selected fact unfolds its sources beneath it, at every width)
Other names
Family  parents · siblings · each spouse + their children + family card
Media
Timeline   renderTimeline(page, timelineOf(person, index))   — own entry selects the fact, a relative selects the person
  Undated
Places     renderPlaces(page, placesOf(timelineOf(person, index)))
Evidence   renderEvidenceSection(...)
```

The order is mine, and the one question in it is Media: it is above Timeline
because the gallery is part of "who the person is" and the timeline and places are
derived reading. Verified on `curie.ged` for Marie: 4 facts, 1 other name, parents
Władysław Skłodowski and Bronisława Boguska, 4 siblings, 1 union with Pierre Curie
and children Irène Joliot-Curie and Ève Curie, 3 media, a timeline of 17 dated
entries and 1 undated (Occupation), 4 places, 2 citations of the whole record, 6
notes in the vault. The family section is already a list (`renderFamily`,
`personPage.ts:249`), so "no graph of the family" is the removal of the Tree tab
only. The family, source and media cards share the frame and gain the Evidence (or,
for source and media, only the notes) section; `renderEmptyPage` and
`renderGonePage` (`sourcePage.ts:105-125`) are replaced by the card's own empty
states.

**One layout, not two.** The page had a desktop layout (split frame, centre
column up to 720 px) and a phone layout (`is-phone`). The card needs neither
variation: it is a column at the width of its panel, from 320 px up, with a sticky
header of its own. `.gedcom-desk-page` loses `max-width: 720px` and `margin: 0 auto`
for the card (the class stays while the centre page exists nowhere else, so the
card gets `.gedcom-card` and the old selectors are deleted, not reused);
`.is-mobile .gedcom-desk` padding is the card's padding on every platform.

**Facts unfold at every width.** The unfold under a selected fact (its source
titles, or "No source of its own", with "All evidence" and "Show in source") existed
because the Evidence panel was a different place on a phone. Now evidence is a
section a scroll away on every width, so the unfold — compact, in the card — is the
phone behaviour generalised, and "All evidence" scrolls the body to the Evidence
section (`scrollIntoView({ block: "start" })`, `behavior: smooth` unless
`prefers-reduced-motion`). `host.openEvidence` is replaced by `scrollToEvidence`.
Alternative: no unfold, rely on the section; a reader looking at the facts at the top
of Marie's card would not see their selection take effect, since the section is a
screen below. Mine.

### The Evidence section

`renderEvidence(container, selection, host)` empties the container and draws its own
head ("Evidence" title, context, actions). It becomes `renderEvidenceSection(parent,
selection, host)`: it appends an `h3` "Evidence" (the `evidence.title` string), the
context line (the fact with its date and place, or *Whole record* and the name),
the actions (*← Whole record* when a fact is selected, *Show in source*), the fact's
sources, the record's sources, the notes. `evidence.noTab` (the panel's
"open a GEDCOM file as genealogy") is deleted: the card has its own empty states. For
a source or a media record it renders only the notes, under the notes' own heading,
since the card above already names the source and carries *Show in source*; the
genealogy-evidence requirement says so. `EvidenceHost.wholeRecord` stays, as
`selectFact(null)`.

The notes are asked of the vault asynchronously (`DeskViewsHost.notesFor`); the card
view keeps `{ key, hits }` for the selected record as `EvidenceView` did, redraws
when they arrive, and forgets them on the metadata cache's `changed`.

### History inside the card

`src/desk/recordHistory.ts`, pure:

```ts
class RecordHistory {
  visit(xref: string): void;       // explicit selection: push after the cursor, drop what was forward
  follow(xref: string): void;      // the cursor rested here: replaces the current step if it was itself a follow, else pushes it as one
  back(exists: (xref: string) => boolean): string | null;
  forward(exists: (xref: string) => boolean): string | null;
  canBack(exists), canForward(exists): boolean;
  current(): string | null;
  reset(): void;
}
```

One per `GedcomView`, because selection is per tab; reset when the file changes.
Limit 50 steps, oldest dropped. Not saved (the record is; the stack is a session's
convenience). `visit` of the record already current is not a step. `back` and
`forward` skip a record `exists` says is gone, so deleting Pierre's record in Source
does not strand the reader on a card that cannot be drawn.

**Why `follow` is separate.** In Source the card follows the cursor; every record the
cursor crosses while the reader scrolls would otherwise be a step, and Back would
walk the file. A follow replaces the previous follow, and an explicit step before it
survives (Marie by the Index, then the cursor through Pierre and Irène: Back is
Marie, Forward Irène). Alternative considered: no history for follows at all, so the
current record is not on the stack. Then Back from a followed record has no honest
answer (is "back" the record before the follow, or the one before that?); with
`follow` as a replaceable step, the stack is always a list of records the card
showed and Back means the one before.

**Controls.** Two icon buttons at the left of the card's sticky header
(`chevron-left`, `chevron-right`; `aria-label` *Back* and *Forward*; disabled where
there is nowhere to go), .
Mouse buttons 3 and 4 are **not** handled (mine, from the plan review): Obsidian's
window-level capture `mousedown` handler for those buttons already navigates the
tab's own history, so a handler in the card would race it and the tab would step back
from under the reader. No key either: Obsidian binds Back and Forward to its own
hotkeys, and a second pair in one view would collide. The buttons are reachable with
Tab.

### In Source the card follows the cursor, debounced

The user asked that an Index row put the cursor on the record in Source. The inverse
— the card following the cursor — is mine, for a reason: in Source there is no other
way to see "what record am I in" than counting lines, and the Evidence panel, which
said so ("open a file as genealogy") in Source, was the clearest admission that a
tab with nothing to select was a gap. The cost is small: `GedcomView` already
listens to the editor (`createState`'s `updateListener`, `GedcomView.ts:967`); a
`selectionSet` there schedules, with `debounce(…, 250, true)` (Obsidian's, as
`announceEdit` is) a check of `sourceRecordAtCursor()`; if it names a record with a
card and not the selected one, `selectRecord(xref, "cursor")` runs. A cursor in a
record with no card — the header, a note, a repository, a submitter — or between
records changes nothing (step 1's "a note record at the cursor leaves the record
alone", kept). Typing inside a record changes nothing either, since the record is the
same; the Index and card redraw on the debounced edit announce as before.

Alternatives: **only on the Index and commands** (the user's literal words): in Source
the card is then stale after the reader moves, and the Index's current row lies;
**immediately, no debounce**: a long arrow-key run through a 2 000-person file would
redraw the card, the Index and the history on every line. 250 ms is the existing
order of the announce (300).

Going the other way, `setMode` to Source with a record selected moves the cursor to
the selected fact's lines, or the record's, unless the cursor is already inside
(`moveCursorToShown`, `GedcomView.ts:421`, which until now ran only for Genealogy →
Source). Leaving Source selects the record at the cursor if it has a card, so the
step-1 scenario "cursor in Pierre → Graph → Source: cursor where it was" holds (the
selection is Pierre, the cursor is inside him). The selection made while the cursor
sat in a note record is left alone.

### Three modes; Genealogy opens as Graph

`DESK_MODES = ["graph", "timeline", "source"]`; `DeskMode` and `OpenAsMode` follow.
`modeButtons`, `modeLook`, the three `showAs` commands (`commands.ts`),
`toggleTarget` (`last ?? "graph"`), `renderMode`, the header actions and
`openAsOptions` read the array.

**The migration of `genealogy`.** A tab saved with `mode: "genealogy"` and a setting
`openAs: "genealogy"` have to open as something.

1. **Graph** (chosen, mine). The reader who chose Genealogy chose the rich reading,
   and Graph is its nearest: pictures of people, and the card appears on a click. A
   file of up to 500 people opens whole; a larger one opens on the branch of the
   first person (`initialFocus`, unchanged). It is also the default for a reader
   who never touched the setting: `DEFAULT_SETTINGS.openAs` (`settingsData.ts:29`)
   becomes `"graph"`.
2. **Source.** Safe: it is what every tab is while the interface is off, it opens at
   once on any size of file, and no one is surprised by a drawing. But it reads as a
   demotion, and the whole point of the interface is to read a file as people.
3. **Timeline.** Dense; opens on the whole file, 17 rows on Curie and 2 000 for a
   large file. A worse first sight than the graph.

`readDeskState` reads `genealogy` as `graph`, `parseSettings` likewise, the stored
value is rewritten on the next save, and a test pins both. The old `record` and
`view` keys are ignored. A tab saved while the interface was off stores Source and is
unaffected.

### Selecting in a view, the boards, and the host

`FileViewsHost.openRecord` becomes `select(xref)`, and the boards' `activateCard`,
`activateFamily` and the timeline's `openPerson` call it; the tab's `selectRecord(xref,
"view")` answers. The phone's two-touch rule lives in `graphCanvas.activate` and
`FileTimelineBoard.activate` and is untouched: the second touch calls what the click
calls. `FileGraphBoard.select(xref, reveal)` skips `setScope` and `canvas.select`'s
glide when `reveal` is false; `FileTimelineBoard.select(xref, reveal)` skips `reveal(xref)`
and `setScope`. A mark (`showInSource`) is as before.

### Commands

`CommandView` loses nothing it has and gains nothing: `showMode(mode)` takes the
three modes; `recordAtCursor()` is the cursor's record in Source and the selected
record in Graph and Timeline, whatever its kind — step 1 limited it to a person; the
four kinds all have a `GedcomRecord` in `records()`, and `recordLinkText` takes the
record's label for any of them (`protocolLink.ts:49`). With nothing selected in Graph or Timeline the copy commands are
not offered, as now. `canFind()` is true in every mode, so it can go; `showSearch` is
as it is. The editor commands stay Source-only.

`toggle-gedcom-mode` keeps its id and its target rule (Source ↔ last other mode),
defaulting to Graph where the session has none.

### Spec organisation

The requirements about *pages* are about a record read in a place, so they move to a
new capability, **`genealogy-record-card`**, not left in `genealogy-view` with "page"
renamed to "card". Reasons: `genealogy-view` is already the largest spec (902 lines)
and its subject, after this change, is the *tab* — its modes, header, links,
interface, workspace migration — while the card has a place, a lifecycle (selected
record, history, placement, empty states) and a layout of its own; and
`genealogy-evidence` and `genealogy-index` can cite one place for "the card".

In `genealogy-view`:

- **REMOVED** with `Migration:` pointing at the new requirement: Which record
  Genealogy mode shows, The person page, The family page, The source page, Moving
  between records, Show in source, A page follows the file, The pages fit a phone,
  Portrait and media on a page, The media page, The views of a person page, The
  timeline, The places, The tree, An index row selects a person in Graph and
  Timeline, A GEDCOM tab is in one of four modes, Commands follow the mode.
- **ADDED** in their place: A GEDCOM tab is in one of three modes, Commands follow
  the mode and the selection, A workspace saved with Genealogy mode or the Evidence
  panel opens cleanly. The two replaced by an ADDED (modes, commands) are not
  `RENAMED` + `MODIFIED` because the validator requires a MODIFIED to keep every
  scenario of the requirement it replaces, and three of the four-mode scenarios
  (the graph preference, the two switches to Source) and two of the old commands'
  (the palette and the find key in Genealogy mode) would have no honest content.
  The same reason makes the graph's and timeline's "leads to the page" and the
  index's "Opening a record" REMOVED and ADDED.
- **MODIFIED** (restated whole): Links into a record, The mode control, The
  genealogy interface is off…, A year before the common era, Graph and Timeline draw
  the tab's own reading, and — through RENAMED — Nothing a reader does in a tab, the
  card or the index writes to the file.
- **A correction made on the way.** "Links into a record" said a link to a
  *multimedia record* switches to Source, while "The media page" said it opens the
  media page, and the code (`pageKind` includes `media`, `routeLink`) does the second.
  The restated requirement says the code's behaviour and has a scenario for it.

`genealogy-evidence`: its first requirement is REMOVED (what lives in the sidebar is
now the card), the rest MODIFIED in wording ("panel" → "section", the card shows the
source) with two renames and one ADDED requirement for the section.
`genealogy-index`: "Opening a record from the index" is REMOVED, and "Selecting a
record from the index" ADDED. `genealogy-file-graph` / `-timeline`: the leading
requirements REMOVED and ADDED as above; the selected card and row, phone, mode,
branch scope and moving about MODIFIED, each restated with all its scenarios.
`plugin-language`: its first requirement lists what follows the language, restated.

Also restated for wording: `genealogy-index`'s "People, families and sources" ("as the
person page shows them", "as the family page names it") and `genealogy-file-graph`'s
"A card is a person, coloured by sex" ("the person's page shows", "as on the page").
One old title is kept on purpose: the scenario "A person page in Russian" of
`plugin-language`, because a MODIFIED requirement must keep every scenario name of the
one it replaces; its content says "card".

Left, on purpose: `document-links`, which says "a picture on a desk page" and "a desk
tile" — "desk" there is the plugin's name for the reading surface and now reads as
the card; changing a whole requirement for one noun is not worth a MODIFIED. The
Purpose paragraphs of `genealogy-view` ("the Genealogy and Source modes, the person
and source pages…"), `genealogy-evidence` ("The evidence panel in the right sidebar")
and `genealogy-file-graph` ("beside the person pages"), which `openspec archive`
leaves alone, are edited by hand in the archive PR; `genealogy-record-card` gets its
Purpose there too.

### What is deleted

- `src/desk/personTree.ts`, `personTree.test.ts`, `personTreeView.ts`,
  `personTreeView.test.ts`; `TreeMemory`, `treeMemory`, `expandedSiblings`,
  `PageHost.toggleSiblings`, `PageHost.chooseView`.
- In `personPage.ts`: `PersonView`, `PERSON_VIEWS`, `renderTabs`, `frame`,
  `PersonPageOptions.view`, `.expanded`, `.tree`, `.phone`; the Tree branch and the
  `is-wide`/`is-tree` classes. `src/desk/personPage.test.ts` loses the tab and tree
  tests.
- `GedcomView`: `personView`, `deskEl`, `drawDesk`, `pageHost`, `renderEmptyPage` and
  `renderGonePage` use, `openRecord`, the `view` key of `getState`/`setState`,
  `record`, `moveCursorToShown`'s Genealogy caller, `genealogy` in `renderMode`;
  `DeskSelection` becomes the card's selection.
- `DeskViews.ts`: `EvidenceView`, `EVIDENCE_VIEW_TYPE`; `main.ts`:
  `EvidenceView` registration, `placeEvidence`, `openEvidence`, the evidence loop in
  `redrawDesk`, `metadataCache` handler's Evidence target (now the card),
  `syncInterface`'s Evidence detach (now the card's).
- `deskState.ts`: `navigationStep`, `PersonView` import, the Genealogy entries of
  `MODE_LOOKS`, `toggleTarget`'s default, `PageKind` stays; `readDeskState`'s `view`.
- `commands.ts`: `show-gedcom-as-genealogy` (by `DESK_MODES`), `open-gedcom-evidence`
  (in `main.ts`); strings `mode.genealogy`, `command.showGenealogy`,
  `command.openEvidence`, `openAsOption.genealogy`, `desk.tab.card`, `desk.tab.tree`,
  `desk.tab.timeline`, `desk.tab.places`, `tree.siblings`, `tree.moreUp`,
  `tree.moreDown`, `evidence.noTab`, `desk.empty.*` and `desk.gone.*` where the
  card's states replace them. `desk.allEvidence` stays (its action scrolls).
- `graphCanvas.ts`: what only the tree used — the card fields `aside`, `gap`, `up`
  and `down` and their drawing (`is-aside`, `gedcom-fg-card-gap`,
  `gedcom-fg-card-more`), the sibling-run affordances — are deleted **only after**
  `grep` shows `fileGraphView.ts`/`fileGraph.ts` do not set them (they set `focus`
  for the branch's person, which stays). `fileGraphView.ts` and the graph specs pass
  unchanged. `styles.css`: `.gedcom-desk-frame`, `-top`, `-body`, `-tabs`, `-tab`,
  `.is-wide`, `.is-tree`, `.gedcom-desk-graph`, and the `:has` rules for them.
- `harness/desk.ts` tree and tab code; `tests/desk.spec.ts` tree and tab specs
  (lines 170–385 of the current file).
- `RETIRED_VIEW_TYPES` gains `"domorium-evidence"`.

### Old tabs and panels

`sweepRetiredViews()` (step 1) detaches leaves of each id in `RETIRED_VIEW_TYPES`
at layout-ready and on `layout-change`, whether the interface is on or off; the
Evidence view type is added, so a reader's saved Evidence leaf closes once and
leaves no unknown pane. Nothing is registered for it. Alternative: convert the
saved Evidence leaf into the card (`setViewState` to `domorium-record`), keeping its
slot in the sidebar. It is a few lines and kind to the reader, but then the card
appears without a gesture, against the placement rule; declined. A Genealogy tab is
read as Graph by `readDeskState`; no leaf is closed.

That `getLeavesOfType` returns leaves of an unregistered type was verified against
Obsidian 1.15 (an unknown pane's `getViewType()` is the saved type); the floor is
1.8.7, so task 7.1 re-checks it there.

### Settings and copy

*Genealogy interface (beta)*, description: «Still in beta: it may change and have
rough edges. Show the Domorium index, the record card, the timeline and the graph of
the file, with the ribbon icon and their commands. While this is off, GEDCOM files
open in the source editor.» (it names the card and no longer names genealogy mode, the
evidence panel or the family tree). *Open GEDCOM files as*: «How a GEDCOM file opens
in a new tab: as a graph, a timeline or the source. Each tab remembers the mode it
was last in. Applies when the genealogy interface is on.» Options Graph, Timeline,
Source («Граф», «Хронологию», «Исходник» — accusative as in step 1). New strings:
`command.openRecordCard` («Show the record card» / «Показать карточку записи»),
`card.title` («Record» / «Запись»; the view's display text), `card.back`, `card.forward`
(«Back» / «Forward», «Назад» / «Вперёд»), `card.noTab` («Open a GEDCOM file to see
its records.»), `card.nothing` («Select a record in the graph, the timeline or the
index.»), `card.empty` («The file holds nothing to show.»), `desk.timeline`,
`desk.places` (section headings, replacing `desk.tab.*`), `card.announce`. Leftover
wording is fixed with them: `desk.familyPage` («Family page») and `desk.mediaPage`
(«Media page») become «Family card» and «Media card» (and in Russian), and
`desk.openSource` is deleted when `renderEmptyPage` goes, if nothing else reads it. Sentence case; the
existing plurals are unchanged and none of the new strings has a count.

### Tests

- Unit (Vitest, `node`): `deskState.test.ts` — three modes, `genealogy` read as
  graph, old keys ignored, `selected` read, `toggleTarget`, `modeButtons`, no
  `navigationStep`, `RETIRED_VIEW_TYPES` with the evidence id and none a registered
  view. `tabModes.test.ts` — the selected-record machine: select a record with a card
  and not a note; kept across modes; ended by a text change, by the interface off, by
  another file; leaving Source takes the cursor's record; entering Source asks to
  move the cursor. `recordHistory.test.ts` — visit, back, forward, drop forward,
  follow replacing a follow but not a visit, skipping a gone record, the limit.
  `commands.test.ts` — three show commands, toggle, copy link on the selected record
  of any kind. `settings.test.ts` — three `openAs` values, `genealogy` → `graph`,
  default graph.
- Unit (happy-dom): `personPage.test.ts` and siblings — the section order on Marie,
  no tab bar, no tree, the unfold at every width, a relative selects; `recordCard.test.ts`
  — empty states, the right page per kind, header buttons disabled and enabled,
  scroll and focus kept across a redraw for the same record; `evidence.test.ts` —
  the section; `fileViews.test.ts`, `fileGraphView.test.ts`, `fileTimelineView.test.ts`
  — `select(xref, false)` marks and does not move, `select(xref, true)` as before, a
  pending selection with `reveal: false` over a saved view.
- Browser: `harness/desk.ts` mounts `renderRecordCard` in a pane of chosen width beside
  an `IndexList`, with `RecordHistory`; `tests/desk.spec.ts` is rewritten around it:
  Marie's sections in order at 320, 360 and 420 px and at 390 as a phone with no
  horizontal overflow, the header staying while the body scrolls, a fact's unfold and
  "All evidence" bringing the section into view, selecting a fact not scrolling the
  card, another record scrolling it to the top, Back and Forward, a relative selecting, the family, source and media cards, the notes list,
  no tabs and no tree; `tests/theme.spec.ts`'s desk colours test follows the class
  names; `tests/fileViews.spec.ts` gains: a card activated records `select(…, false)`
  and does not move the view, a selection with `reveal: true` does. CI is a slower Linux
  runner with a wider font than a developer's machine, so no spec asserts a wall time,
  a pixel width of text or a position that depends on the font; layouts are asserted by
  relations (inside the pane, no overflow, below, in order).
- By hand in Obsidian (the manual task): placement, revealing, deferred leaves, the
  phone drawer, focus, the saved Evidence leaf, `getRightLeaf`
  with a collapsed sidebar.

### Relation to step 1, and what step 3 gets

Kept from step 1: `FileViews` and its pending selection, `TabModes` as the pure
machine, `DESK_MODES` as one array, the mode buttons and commands, the retired-view
sweep, the boards, the find key. Changed: the host method (`openRecord` → `select`),
the `reveal` flag, `selectedPerson` → `selected`, what a click does, the glide rule,
the saved selection. A map in step 3 is a fourth entry in `DESK_MODES`, a
`ViewKind`, a board and a memory key; the card, the history and the selection need
nothing for it, and a place on a card could select the map's marker the way a card of
the graph selects a person.

## Risks / Trade-offs

- **A click that does not move the view** may feel dead on a large graph where the
  card is a few pixels at the screen's edge: the mark is the only feedback in the
  view. Mitigation: the mark's look is already specified (step 1); the card changes at
  once beside it.
- **Selecting an Index row now means two places change on a phone** (drawer closes,
  drawer opens). Mine; one open question.
- **Redrawing the card loses scroll and focus** unless handled; handled by the view
  and tested at the DOM level (`recordCard.test.ts`) and in the browser spec, but real
  scroll preservation across Obsidian's own layout is a manual check.
- **A saved selection and a restored view** interact (above); the unit test pins
  that a `reveal: false` selection over a saved view leaves the view alone.
- **The cursor following the record** adds an editor listener. It only schedules a
  debounced check, reads `recordAtLine` from the already-parsed symbols, and does
  nothing while the record is the same.
- **A deferred card leaf** is not an `instanceof RecordCardView`; a redraw skips it
  and `onOpen` draws. Tested only by hand.
- **A large source or media list** on a source card (a source cited by thousands of
  records) is drawn whole, as the page drew it; no virtualisation is added. A card's
  `Cited by` is one row per record.
- **Section length.** Marie's card is Facts, Other names, Family, Media, a 17-entry
  timeline, places, evidence: several screens. No collapsing (non-goal); *All
  evidence* and the unfold keep the two things a reader jumps between near each
  other.
- **No Evidence view means no way to keep evidence visible beside a card of
  another person.** Declared by the user's design («evidence можно записать ниже»).
- **Downgrade.** An older plugin ignores `selected` and a `graph` mode it knows; for a
  tab that was `genealogy` it opens a page; not supported.
- **Lessons carried from the earlier views** (the "Implementation" of
  `add-file-graph`, `add-file-timeline` and `file-views-as-modes`): a restored leaf may
  be deferred, so state is read in `setState` and the file waited for; `revealLeaf`
  only selects a tab and does not activate it, so the card reveal never moves the
  focus; a view shown while hidden measures nothing, so a card drawn into a collapsed
  sidebar draws again from `onOpen`/resize; late answers (the notes list) are matched
  to the key they were asked for; counts use `plural()`; reduced motion is honoured by
  the smooth scroll to the Evidence section; the browser specs never time anything
  and assert layout by relations because CI is a slower Linux runner with a wider
  font.

## Migration Plan

Updating needs nothing from the reader. A stored `genealogy` mode or `openAs` reads
as Graph; `record` and `view` in a tab's state are ignored; a saved Evidence leaf is
closed once; hotkeys bound to *Show as genealogy* and *Open the evidence panel* stop
resolving. The interface setting still defaults to off. Rolling back means going to
1.14.1 or the release before this change, whose tabs ignore `selected` and which
reads `graph` and `timeline` as it did. When the change is archived, the Purpose of
`genealogy-view`, `genealogy-evidence`, `genealogy-file-graph` and the new
`genealogy-record-card` are edited by hand, as `openspec archive` leaves Purpose
alone. The retired-type sweep is meant to go in a later release (step 1's note,
extended by one id).

## Open Questions

None left. The user delegated the decisions on 2026-11-05 and the seven below were settled as proposed (the earlier wording is kept for the reasons):

1. **Phone and the Index.** An Index row now closes the left drawer and opens the right
   one on the card. The alternative is to close the drawer and leave the view, with the
   card a swipe away. Which?
2. **Genealogy → Graph.** Saved Genealogy tabs and the setting open as Graph, and the
   default for a new reader becomes Graph. Source or Timeline instead?
3. **The card follows the cursor in Source** (debounced). The user said only that an
   Index row puts the cursor on the record; the other direction is mine. Keep, or only
   on the Index and commands?
4. **Selection saved with the workspace.** A restart shows the same record in the card,
   reversing step 1's "not saved". Keep, or an empty card after a restart?
5. **Facts unfold under the selected fact at every width**, with *All evidence*
   scrolling to the section (the phone behaviour generalised). Keep, or no unfold?
6. **Order of the sections**: Media above Timeline and Places. Keep, or Media last
   before Evidence?
7. **A family node is selectable but not marked** in the graph. Keep, or mark it?

Decided by me and open to a change: the card's back and forward are buttons only,
with no key and no mouse buttons; placing the card does not reveal it; the old `record`
key is ignored rather than read as the selection; the Evidence leaf is closed rather
than converted.

## Implementation

Deviations and decisions made while implementing (mine):

- `CardTab.filePath()` is added: the card must tell the same xref in two files apart when deciding whether a redraw is for the same record, and `file` is already a property of `FileView`.
- `RecordCardView.onResize` redraws only a card that skipped drawing while hidden, and `main.ts` calls it on `layout-change`, so a card revealed without a resize event still draws.
- Sub-headings inside the Evidence section and the timeline's *Undated* are `h4.gedcom-desk-subsection`; only `h3.gedcom-desk-section` are section headings.
- Cursor-follow in Source reacts to user `select` transactions only, so a restored cursor or our own dispatch does not change the selection.
- `FileViews.select` keeps a pending `reveal: true` only for the same xref; a different xref takes the new flag.
- `RecordHistory.visit` of the current record turns a followed step into an explicit one, so it is kept.
- `notesFor` caches the notes linking a file (per path) and the whole cache is cleared on any metadata `changed`.
- `TabModes.applyState` returns `{ selectionChanged }`; `setMode` returns `{ changed, moveCursor, selectionChanged }`.
- The harness `fileViews` tab keeps the selection across modes and hands it over with `reveal: false` on a mode switch, as `renderMode` does; the old spec on marks being cleared by a mode switch is replaced by one on the selection following the modes.
- `recordToShow` is deleted with the Genealogy page; the card never selects a record on its own.
- The Media section of a person card is absent when the record links no file, as before; the Marie scenario holds on the demo vault.

### After review

Two reviews found no blocker. Decisions and fixes (mine):

- A pending cursor-follow is cancelled by every selection but its own and by a mode switch (`CursorFollow`, `followRules.ts`), so a late follow cannot overwrite Back or Forward. The rule for when a resting cursor selects is the pure `shouldFollowCursor`.
- `records()` is memoised by revision (`RevisionMemo`), so a cursor rest does not rescan a large file.
- A changed note invalidates the notes cache only when it is a followed file or a note that links one (cached linking set, or its resolved links); a rejected lookup drops its entry; the card redraws only when the hits for the shown record differ (`refreshNotes`).
- A state for the same file that names another `selected` replaces the selection and adds a history step; a state that names none leaves the selection untouched, because Obsidian's own Back and duplicate states omit it.
- The saved `selected` is kept while the interface is off and only its use is gated (`shownRecord` is null); turning the interface on shows it again. This replaces "nothing is saved while off".
- Switching into Graph or Timeline with a selection centres on it, as the reader just chose the view; a click inside a view still does not move it, and a restore does not either. A tab opened in Source, or an interface switched on, with the cursor in a record shows "nothing selected" until the first user selection; kept.
- A fact's unfold lists the sources it cites and the actions; the "No source of its own" notice lives only in the Evidence section.
- Card sections are `h2` under the name's `h1`, Evidence's sub-headings `h3`; the sticky header shows the record's name between the chevrons, `aria-hidden`.
- The media card's uncropped thumbnails are 72 by 90 and contained; the narrow-column specs cover a person, a family, a source and a media card in English at 320 and in Russian at 320 and 390.
- `placeCard` sets `cardPlaced` only once a leaf exists or is created; a closed followed tab falls back to the most recently active remaining GEDCOM tab and a background tab cannot take the follow while another GEDCOM tab is active (`adoptsFollow`, `fallbackFollowed`).
- Skipped: a test that `GedcomView.selectRecord` itself calls `CursorFollow.selected` (the view imports `obsidian`, which Vitest cannot load); the rule is tested on the class and the call is one line. The redraw-only-on-change of `refreshNotes` is likewise untested in a unit.
