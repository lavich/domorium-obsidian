## Why

Step 2 (`record-card-panel`, 1.15.0) moved a record's page into a card in the right
sidebar and left the Index, the list of a file's people, families and sources, in the
left one; `auto-open-panels` then made both panels open by themselves when the reader
selects a record. The result is two sidebars around a centre that draws the same file a
third time. The user, after using it (2026-11-05):

«что-то мне теперь не нравится левая панель — она и дублирует и размазывает
информацию. Может быть списки теперь будут просто ещё одним представлением gedcom
файла и будут в основном окне?»

and, when the design below was proposed to them, «мержить» (agreement).

The Index duplicates what the graph and the timeline already show — a name, years, a
place — in a column too narrow to carry more, and smears the file across three places
(left list, centre view, right card). A list wants width: columns, a sort, a count. The
centre is where the width is.

## What Changes

- **The Index goes.** The left-sidebar view `domorium-index` (**Domorium**), its place
  in the left sidebar, and the half of *Open the side panels when selecting* that put it
  there are removed. A workspace saved with an Index leaf has it closed, once, as the
  retired views before it were.
- **A fourth mode, List.** A GEDCOM tab is in Graph, Timeline, **List** or Source mode.
  List shows the people, families or sources of the file as a table in the tab: columns,
  sortable by a click on a header, a filter field that narrows the rows, the *No sources*
  filter for people, a count, and the same virtualised rows at twenty thousand. It is
  drawn from the tab's own reading of the file like Graph and Timeline, and kept (kind,
  sort, filter) across switching modes and restarting.
- **A row selects.** Activating a row — click, tap, Enter, Space — selects that record
  with the existing mechanism: the record card on the right shows it, the tab stays in
  List mode, the row is marked selected. The selection is the tab's, so it survives a
  switch to Graph (which then centres on the person) and back (which centres the row).
- **Where it is reached.** A header button and a command **Show as list**, the tab's menu;
  the mode buttons read Graph, Timeline, List, Source from the left, Source rightmost. Find
  (`Mod+F`) focuses the filter. List is one more mode a file can open in by the rule for a new
  tab: *Open GEDCOM files as* is being removed by the separate change `open-in-last-mode`,
  which merges first and which this change rebases on, so no **List** option is added to it.
  The ribbon icon and the command **Open Domorium** stay as one door: they bring the most
  recently active GEDCOM tab to the front as a list, and say so in a notice when no GEDCOM tab
  is open.
- **The setting is renamed for what is left.** *Open the side panels when selecting*
  becomes **Open the record card when selecting**: the saved key, `openPanelsOnSelect`,
  and its meaning for the card are unchanged, and a saved value is read as before.
- **A phone gets two-line rows** and a sort selector in place of the header; a narrow tab
  on a desktop gets the same.

Repository or upstream: **this repository only.** The list reads the rows the plugin's own
`src/genealogy` already builds (`PersonRow`, `FamilyRow` with `childCount`, `SourceRow`
with `repository`, `citesBy`, `citedBy`); nothing is asked of `@domorium/language-service`
or `@domorium/codemirror`, and no new upstream release is waited for.

## Capabilities

### New Capabilities

- `genealogy-list`: the List mode of a GEDCOM tab: kinds, columns, filter, sort,
  selection, keyboard, size, phone, and the door from the ribbon and the command.

### Modified Capabilities

- `genealogy-index`: retired. Every requirement moves to `genealogy-list`; the spec file is
  deleted by hand (see `design.md`, "Retiring `genealogy-index`"), since `openspec archive`
  refuses a delta that removes the last requirement of a capability.
- `genealogy-view`: four modes, the mode control (and the order of its buttons) and
  commands, Find in List, a workspace saved with the Index, the renamed setting.
- `genealogy-record-card`: the card no longer names an Index; a list row selects.
- `genealogy-evidence`: a scenario that selected through the Index row.
- `genealogy-file-graph`, `genealogy-file-timeline`: a selection made in the list is a
  selection made from outside the view.
- `plugin-language`: the list, not the index, among the texts that follow the language.

## Non-goals

- The map (step 3, issue #215), colouring by family line, editing from the list, the hover
  preview card, a column picker, grouping, multi-selection.
- Moving the card out of the right sidebar or changing what it shows.
- Changing the file format, the parser, validation or the language service.
- Raising `minAppVersion`: every Obsidian API used is already below the floor 1.8.7.
  `Workspace.revealLeaf` (1.7.2) and `ResizeObserver` are.
- Touching *Open GEDCOM files as* (`openAs`), which `open-in-last-mode` removes.
- Keeping the Index behind a setting. The user asked for it to go.

## Impact

- New: `src/desk/listRows.ts` (pure: columns, filter, sort), `src/desk/fileList.ts` (the
  board), tests beside them, harness mount and `tests/fileList.spec.ts`.
- Changed: `src/desk/deskState.ts`, `fileViews.ts`, `tabModes.ts`, `sidePanels.ts`,
  `DeskViews.ts`, `src/GedcomView.ts`, `src/main.ts`, `src/commands.ts`,
  `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/i18n/{en,ru}.json`,
  `styles.css`, README, `harness/desk.*`, `tests/desk.spec.ts`.
- Deleted: `src/desk/indexList.ts` and its test, `IndexView`, the Index styles. See
  `design.md` for the full list.
- Saved state: a tab gains an optional `list` key; `mode` may now be `list`. No saved
  value is rewritten and no file is touched.
