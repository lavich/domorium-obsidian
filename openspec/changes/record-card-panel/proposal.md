## Why

Step 1 (`file-views-as-modes`, 1.14.1 and after) made the graph and the timeline
modes of the GEDCOM tab, but left a record's page where it was: a centre page in
a fourth mode, Genealogy, with its own tabs (Card, Tree, Timeline, Places), a
history that Back walks, and a separate Evidence panel beside it. A click on a
person in the graph or the timeline still *leaves* the view for that page, and
Back has to return. The user asked for the record to be read beside the view, not
instead of it.

## What Changes

The user's requirement, in their words (2026-11-04 and 2026-11-05):

- «есть три вида: gedcom, граф и таймлайн (потом ещё добавим карту); при клике
  по пользователю или строке открывается карточка пользователя в правой вкладке,
  а не в центре как сейчас; в карточке пользователя уже не нужен граф семьи, а
  evidence можно записать ниже».
- Agreed with the proposals made on the way: the person page's **Timeline** and
  **Places** tabs become sections one under another in the card; a click on an
  Index row shows the card in the right panel (and puts the cursor on the record
  in Source, if that is what is shown); the view a file opens in is chosen by a
  setting; and the work goes in steps.
- Step 1's own note on this step: an Index row in Graph or Timeline already
  selects and glides; «step 2 makes a click select + show the card in the right
  panel, i.e. the Index row behaviour becomes the click behaviour».
- «давай планировать и делать» / «да, делай шаг 2».

This is **step 2**. Step 1 is merged. **Step 3**, a map, is a later change.

Proposed scope, taken from that (decisions that are mine are marked):

- **The record card.** A new view in the right sidebar, **Record**, follows the
  GEDCOM tab most recently active, as the Index and Evidence do, and shows the
  tab's **selected record**: a person, a family, a source or a media record. It
  reuses the page renderers that exist, in the one narrow layout the phone page
  already had. It says so when no GEDCOM tab is open or nothing is selected.
- **The person card**: heading (name, years, places, portrait), facts, other
  names, the family as a list of relatives (parents, siblings, each spouse with
  their children — as the page lists them now), media, then **Timeline** and
  **Places** as sections one under another, then **Evidence** at the bottom
  (mine: media sits above the timeline). The family card, the source card and the
  media card get the same frame and the Evidence section where it applies.
- **Evidence merges into the card.** The standalone Evidence view is retired.
  What it showed is the card's bottom section: selecting a fact shows that fact's
  sources, *Whole record*, *Show in source* and the notes in the vault stay as
  specified. A saved Evidence leaf is closed once, like the overview tabs of
  step 1.
- **Selection is the one shared state of a tab.** A click on a card, a family
  node, a row or a name in Graph or Timeline, an Index row, a relative or a
  citation in the card, a followed link and *Go to record* all **select a record
  and show it in the card**. In Graph and Timeline a person is marked as
  selected; a selection that comes from outside the view glides the view to it,
  and a click inside the view does not move it (mine: the card is on the right,
  and the reader is already looking at the thing). In Source the cursor goes to
  the record; and the card follows the record under the cursor, debounced (mine,
  with the reason in `design.md`).
- **Where the card appears.** It is placed in the right sidebar the first time in
  a session a record is selected, without taking the focus (Evidence's rule,
  generalised), and opens from a new command **Show the record card**. On a phone
  it is the right drawer: a tap that selects from a view opens it, and so does an
  Index row (mine; first touch lights, second selects, as the graph has it).
- **History inside the card** (mine): back and forward between the records the
  tab's card has shown, with two buttons (not the mouse's buttons, which Obsidian
  already routes to the tab's own history). Record steps are no longer steps of the tab's own history: the tab's
  Back and Forward carry nothing but files, and the step logic of step 1
  (`navigationStep`, `result.history`) is deleted.
- **Modes become three**: Graph, Timeline, Source. **Genealogy mode is removed**
  — its header button, command, `DeskMode` value, the page and its tabs. A tab or
  setting saved as `genealogy` opens as **Graph** (mine; `design.md` weighs it
  against Source). The default of *Open GEDCOM files as* becomes Graph. Old
  `record` and `view` keys are ignored.
- **Deleted**: the person page's Tree tab and its drawing (`personTree`,
  `personTreeView`), the tab bar and `PersonView`, `EvidenceView`, the centre
  page's frame and its phone-only unfold, the gone page. The full list is in
  `design.md`.
- **Commands.** *Show as genealogy* and *Open the evidence panel* go. *Show the
  record card* is new. *Copy link* now works in Graph and Timeline on the
  selected record, whatever its kind. *Find*, *Replace* and the editor commands
  are as in step 1.
- The Index keeps its lists, search and filter; a row selects the record and
  marks as current whatever is selected.
- *Genealogy interface (beta)* still gates everything; its description names the
  card. README and both languages are updated. `CHANGELOG.md` is not touched.

This change is repository-local. The card adapts what the read model already
provides to Obsidian's workspace; nothing is needed from `@domorium/codemirror`
or `@domorium/language-service`, and no API above `minAppVersion` 1.8.7 is used
(`ItemView`, `getRightLeaf`, `revealLeaf` and `WorkspaceSidedock.expand` are
older; `loadIfDeferred` is 1.7.2). No row is added to the table in `CLAUDE.md`.

## Capabilities

### New Capabilities

- `genealogy-record-card`: the card in the right sidebar — where it lives, the
  selected record and what selecting does in each mode, the card's own history,
  the person, family, source and media cards with their sections, portrait and
  media, Show in source, following the file, the narrow layout. Most of its
  requirements are moved here from `genealogy-view` with their scenarios checked
  against `curie.ged`.

### Modified Capabilities

- `genealogy-view`: three modes instead of four, the mode buttons and commands,
  links into a record and *Go to record*, commands by mode, the interface
  setting, nothing writes to the file, a year before the common era, the graph
  and the timeline draw the tab's reading. **Removed** (moved to
  `genealogy-record-card`): which record Genealogy mode shows, the person, family
  and source pages, moving between records, Show in source, a page follows the
  file, the pages fit a phone, portrait and media, the media page, the views of a
  person page, the timeline, the places, the tree, and the index row selecting.
  Added: a workspace saved with Genealogy mode or the Evidence panel.
- `genealogy-file-graph` and `genealogy-file-timeline`: a card, a node, a name or
  a lifeline *selects* instead of opening a page; the selected mark and where
  it glides; the first opening around the selected record; the phone's two
  touches.
- `genealogy-index`: a row selects the record, in every mode.
- `genealogy-evidence`: the panel becomes the card's last section.
- `plugin-language`: the card's headings in the list of what follows the
  language.

## Non-goals

- A map: **step 3**.
- The lineage colouring of cards, or any new drawing: the graph, the timeline,
  their scope, zoom, search and the 500-person rule are not changed.
- Writing to the file from the card. The card reads; the file stays the source
  of truth and nothing here saves or edits it.
- A card of a repository, a note or a submitter. A record with no page still
  goes to Source, as before.
- Marking a family node as selected in the graph. A family can be selected and is
  shown in the card; the nodes keep their light of pointing only (mine; see
  the design's decisions).
- Copying a link, or any other action, from the card itself. The commands act on
  the active GEDCOM tab, as they do; the card never becomes that tab.
- Saving the card's history across a restart. The selected record is saved; the
  stack behind it is not.
- Collapsible sections, a table of contents, or a wider layout for the card. One
  narrow column, scrolling.
- Converting a saved Genealogy tab into anything but the Graph, or restoring its
  record.
- A change to `minAppVersion`, the read model, the parser, the language service,
  or `CHANGELOG.md`, `package.json` and `manifest.json`.

## Impact

- Code: `src/GedcomView.ts`, `src/main.ts`, `src/commands.ts`,
  `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/desk/deskState.ts`,
  `src/desk/tabModes.ts`, `src/desk/fileViews.ts`, `src/desk/fileGraphView.ts`,
  `src/desk/fileTimelineView.ts`, `src/desk/graphCanvas.ts`,
  `src/desk/personPage.ts`, `src/desk/familyPage.ts`, `src/desk/sourcePage.ts`,
  `src/desk/mediaPage.ts`, `src/desk/evidence.ts`, `src/desk/DeskViews.ts`,
  `src/desk/timelineView.ts`, `src/i18n/en.json`, `src/i18n/ru.json`,
  `styles.css`, `README.md`; new `src/desk/recordCard.ts` and
  `src/desk/recordHistory.ts`; deleted `src/desk/personTree.ts`,
  `src/desk/personTreeView.ts` and their tests.
- Tests: Vitest beside each of those; Playwright: `tests/desk.spec.ts` is
  rewritten around the narrow card through an adapted `harness/desk.ts`, and
  `tests/fileViews.spec.ts` gains the select-without-glide case.
- Persisted: a tab's state loses `record` and `view` and gains `selected`; the
  modes are `graph`, `timeline`, `source`, and a stored `genealogy` reads as
  `graph`; `openAs` likewise. An older plugin ignores `selected`, and chooses a
  mode it does not know by its own rules; going back to an older version is not
  supported. The saved Evidence leaf and the type `domorium-evidence` are
  swept.
- No new setting, no `minAppVersion` change, no dependency.
