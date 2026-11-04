## Why

The timeline and the graph of a file (1.14.0, 1.14.1) are tabs of their own,
apart from the file's tab. Each is a second view bound to a file by a path, so
the plugin carries a closed-file reader, a revision counter, a stale refresh, a
rename and delete follower, an open-or-reveal dance and a header action apiece
— all to show what the GEDCOM tab already holds, live, in its own reading. The
user asked for the file's tab to be the one place where a file is seen, in
different ways.

## What Changes

The user's requirement, in their words (2026-11-04 and 2026-11-05):

- «а что если таймлайн и граф будут просто представлениями gedcom файла, а не
  будут открываться отдельной вкладкой?»
- The target design: «есть три вида: gedcom, граф и таймлайн (потом ещё
  добавим карту); при клике по пользователю или строке открывается карточка
  пользователя в правой вкладке, а не в центре как сейчас; в карточке
  пользователя уже не нужен граф семьи, а evidence можно записать ниже».
- Agreed with the proposals made on the way: the person page's tabs **Timeline**
  and **Places** become sections one under another in the card; a click on an
  Index row shows the card in the right panel (and puts the cursor on the
  record in Source, if that is what is shown); the view a file opens in is
  chosen by a setting; and the work goes in steps.
- **Step 1 is this change: the file views.** Source, Graph and Timeline become
  modes of the GEDCOM tab; the separate overview tabs and all their plumbing go;
  the person page stays for now as it is, so the tab has the modes Genealogy,
  Graph, Timeline and Source. **Step 2** (its own change, later): the record
  card moves to the right sidebar, Evidence merges into it, Genealogy mode and
  the page's Tree tab go. **Step 3** (later): a map.

Proposed scope, taken from that:

- **Modes.** A GEDCOM tab has four modes — Genealogy, Graph, Timeline, Source —
  instead of two. The tab remembers its mode, and, for Graph and Timeline each,
  its own scope, position and zoom, across the workspace being restored. The
  setting *Open GEDCOM files as* offers all four, and still defaults to
  Genealogy.
- **One mode control in the header** replaces the three header actions (mode
  switch, timeline, graph): a single action whose menu lists the four modes with
  the current one checked (mine). One command per mode — *Show as genealogy*,
  *Show as graph*, *Show as timeline*, *Show as source* — replaces the two
  commands that opened the overview tabs; the existing switch between genealogy
  and source stays as a toggle between Source and the last other mode (mine).
- **The views are drawn inside the tab**, by the drawing modules that exist, from
  the tab's own live reading of the file. Text typed and not yet saved is always
  current; nothing reads a closed file.
- **Clicks.** Until step 2 gives the card a place of its own, activating a
  person or a family in Graph or Timeline shows their page in the same tab,
  which leaves Graph or Timeline for Genealogy and which Back returns from
  (mine). A mark shows its lines in the source (Source mode). An Index row in
  Graph or Timeline does the same as a card.
- **Removed:** the overview tabs (`domorium-file-timeline`,
  `domorium-file-graph` and their view classes), `src/vault/overviewReads.ts`
  with its tests, everything in `src/main.ts` that opened, revealed, refreshed,
  renamed, closed and read for them, the two header actions and the two open
  commands. A workspace saved with an old overview tab opens without it:
  those leaves are closed once the layout is ready (mine; `design.md` records
  what Obsidian does with an unknown view type, which was checked).
- The interface stays behind **Genealogy interface (beta)**: with it off every
  tab is in Source mode, a stored mode is kept and honoured again when it is
  turned on.
- README and both languages are updated. `CHANGELOG.md` is not touched: it
  belongs to the release PR.

What the views do is not changed: the floating search with its counter and
arrows, the glide to a match, the zoom buttons, no captions, scrollbars kept off
the axis and the names, the hover delay, the 500-person rule. This change moves
them into the tab.

This change is repository-local. It adapts views this plugin already draws to
Obsidian's workspace; nothing is needed from `@domorium/codemirror` or
`@domorium/language-service`, and no API above `minAppVersion` 1.8.7 is used
(`addAction` 1.1.0, `Menu.setChecked` 0.16.2, `Workspace.detachLeavesOfType` and
`onLayoutReady` older).

## Capabilities

### New Capabilities

None. The modes are the tab's, so their requirements are added to
`genealogy-view` beside the two modes it already describes.

### Modified Capabilities

- `genealogy-view`: the tab has four modes; the mode control and the mode
  commands; the views draw the tab's own reading and keep their own scope; Back
  from a page opened out of Graph or Timeline; links, commands, phone and
  Genealogy interface follow the modes; a workspace saved with the overview tabs.
- `genealogy-file-timeline` and `genealogy-file-graph`: "a tab of its own"
  becomes "a mode of the file's tab" (renamed, restated whole); where the large
  file opens; what activating a person, a family or a mark does; for the graph,
  where it first opens.
- `genealogy-index`: opening a row from a tab in Graph or Timeline.
- `genealogy-evidence`: the panel for a tab that is in Graph or Timeline.

## Non-goals

- The record card in the right sidebar, Evidence merged into it, the removal of
  Genealogy mode and of the person page's Tree tab, and the person page's
  Timeline and Places as sections: **step 2**. This change leaves the person
  page, its four tabs, the Evidence panel and the Index as they are.
- A map: **step 3**.
- Following a person across modes: a click on a card shows their page, it does
  not yet select them in the view, and Graph and Timeline have no selected
  person, so the Index marks no row and Evidence shows nothing in those modes.
- A scope shared between Graph and Timeline. Each keeps its own (mine); whether
  to share it is a question for the user.
- Making Mod+F find a person in Graph or Timeline. The editor's find stays a
  Source command.
- Converting an old overview tab into a GEDCOM tab in the matching mode.
- A change to the drawing, the layout, the read model, the person page, the
  settings other than the options of *Open GEDCOM files as*, or `minAppVersion`.
- Anything in `CHANGELOG.md`, `package.json` or `manifest.json`.

## Impact

- Code: `src/GedcomView.ts`, `src/main.ts`, `src/commands.ts`,
  `src/desk/deskState.ts`, a new `src/desk/fileViews.ts`,
  `src/desk/DeskViews.ts` (the overview classes and the host go),
  `src/desk/fileGraphView.ts`, `src/desk/fileTimelineView.ts`,
  `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/vault/openTabs.ts`
  (tests only), `src/i18n/en.json`, `src/i18n/ru.json`, `styles.css`,
  `README.md`; deleted: `src/vault/overviewReads.ts` and its test.
- Tests: Vitest beside each of those; Playwright gains a spec for the views in a
  tab through a new harness entry.
- Persisted: a tab's state gains `graph` and `timeline` objects and the modes
  `graph` and `timeline`; `openAs` may hold the same two values. An older
  plugin ignores the keys and a mode it does not know, and chooses the mode by
  its own rules; going back to an older version is not supported.
- No new setting, no `minAppVersion` change, no dependency.
