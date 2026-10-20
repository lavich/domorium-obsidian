## Why

A genealogist who does not know GEDCOM cannot read a `.ged` file in the vault
today: it opens only as source code, with levels, tags and pointers. The
research desk ([`docs/design/research-desk.md`](../../../docs/design/research-desk.md))
turns the same file into people, families and evidence. This change is the
first slice of its reading stage: the file opens as genealogy, nothing writes to
it, and the source editor stays the one place to change it.

The read model this needs already exists as a draft on `feat/person-browser`
(`src/genealogy/`, with its tests), and nothing it needs is missing upstream
that would block a first, honest version.

## What Changes

- **BREAKING (behaviour):** a `.ged` or `.gedcom` file opens in a new
  **Genealogy** mode by default. The existing editor becomes the **Source** mode
  of the same tab, switched from the view header. A new setting, *Open GEDCOM
  files as*, brings back Source as the default. Each tab remembers its mode.
- Genealogy mode shows one record at a time: a **person page** (facts with the
  source state of each, names, family), a **family page** (the couple, the
  family's own facts, the children) or a **source page** (repository, who cites
  it and where). Moving between records has back and forward, Obsidian's
  own.
- An **index** of people, families and sources in the left sidebar: search, a
  filter for people with no source at all, and a mark on each such person.
- An **evidence panel** in the right sidebar: for the selected fact, the
  sources cited for that fact; below them, apart, the sources cited for the
  whole record.
- **Show in source** from every fact and every record: switches the tab to
  Source and selects the lines that state it.
- A link into a record (`[[tree.ged#@I1@]]`, `obsidian://` links) opens that
  person or source page in Genealogy mode, and the record in the editor in
  Source mode, as today.
- The read model moves over from `feat/person-browser` and grows what the pages
  need: the lines each record, event and citation occupies; citations attached
  to the event they sit under; citation quality (`QUAY`); 5.5.1 sources written
  inline; siblings, and each family a person married into with its spouse,
  events and children.
- Editor-bound commands (definition, references, rename, problems, search) are
  offered in Source mode only. Copying a record link works in both modes, on
  the record shown.

This change belongs in **this repository**: it adapts language support to
Obsidian views and builds a read model from the public `getDocumentSymbols()`.
Nothing in it changes parsing or language-service behaviour. Where upstream does
not yet give what the design wants, this change shows less rather than
reimplementing it here:

- dates are shown as the file writes them, and as a year where one is readable
  ([lavich/domorium#378](https://github.com/lavich/domorium/issues/378));
- a name is one string, so the index is in file order, not grouped by surname;
- notes in the file and citation text (`DATA`/`TEXT`) are not shown, because a
  multi-line value cannot be read without joining `CONT`/`CONC`;
- event tags stay named by hand
  ([lavich/domorium#379](https://github.com/lavich/domorium/issues/379)).

## Non-goals

- Writing anything to the file. Every correction goes through Source mode.
- Tree, Timeline and Places views. They are later slices; the person page has
  room for them but this change adds no tabs for them.
- A map, coordinates, or anything that needs the network.
- Vault notes that link to a record, media and portraits in the evidence panel
  or on the page. They are the next slice, *Evidence from the vault*.
- Name parts, surname grouping, formatted dates, ages: upstream first.
- Several GEDCOM files in one index at once. The index follows the GEDCOM tab
  most recently active.
- Moving the read model upstream. It is kept free of Obsidian so that
  [lavich/domorium#379](https://github.com/lavich/domorium/issues/379) can move
  it later.

## Capabilities

### New Capabilities

- `genealogy-read-model`: people, families, sources and citations read from one
  revision of a document's symbols, with the lines each occupies; no host, no
  reader-facing text.
- `genealogy-view`: the Genealogy and Source modes of a GEDCOM tab, the person
  and source pages, navigation between records, links into records, and Show in
  source.
- `genealogy-index`: the people and sources index in the left sidebar.
- `genealogy-evidence`: the evidence panel in the right sidebar.

### Modified Capabilities

- `plugin-language`: the list of text that follows the app's language gains the
  genealogy views, the index, the evidence panel, event names and the new
  setting.

## Impact

- `src/genealogy/` (new, from `feat/person-browser`): read model, cache, tests,
  fixture.
- `src/GedcomView.ts`: holds both modes; view state gains mode and record;
  `setEphemeralState` routes a subpath to the page or to the editor.
- New views under `src/desk/` (page, index, evidence) and their registration in
  `src/main.ts`; `src/commands.ts` gates editor commands by mode.
- `src/settingsData.ts`, `src/settingDefinitions.ts`, `src/settings.ts`: the
  *Open GEDCOM files as* setting, in both the new and the deprecated settings
  paths.
- `src/i18n/en.json`, `src/i18n/ru.json`: every new string, event names.
- `styles.css`: the pages, index and panel, on Obsidian's CSS variables.
- `harness/` and `tests/`: Playwright specs for the pages, index and panel.
- No new dependency, no API above `minAppVersion` 1.8.7.
- `feat/person-browser` is closed once this lands.
