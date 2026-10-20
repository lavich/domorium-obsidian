## Context

See proposal.md — Why. What the code and the earlier draft give this change:

- **`GedcomView`** (`src/GedcomView.ts`) is a `TextFileView` holding one
  CodeMirror `EditorView` and an `EditorLanguageService`. `setViewData` feeds
  the service; `setEphemeralState({ subpath })` routes `#@I1@` to `goToXref`;
  `records()` projects `getDocumentSymbols()` for the record switcher. Links and
  `obsidian://` links already land here (`src/main.ts`, `openGedcomLink`).
- **`getDocumentSymbols()`** carries every field this change reads, with a
  `range` per symbol. `detail` is `VALUE ?? XREF ?? POINTER`, and `CONT`/`CONC`
  arrive as child symbols — which is why notes and citation text wait upstream.
- **`feat/person-browser`** holds `src/genealogy/` — read model, cache, tests,
  fixture, about 900 lines of code and 1200 of tests — plus three measured
  answers this design reuses rather than re-measures: Obsidian's Back and
  Forward walk a custom view's states when `setState` sets
  `result.history = true`; a plain list of 20,000 rows costs ~250 ms per rebuild
  and 80,000 elements, so the index renders a window; and the language service
  does not expose a document version, so the plugin counts its own.
- **Settings** exist twice by design (`getSettingDefinitions` and the deprecated
  `display()`), per the table in CLAUDE.md; a new setting goes into both.
- **`docs/design/research-desk-reading.html`** is the visual reference: layout,
  states, wording and the Obsidian CSS variables it is written in.

## Goals / Non-Goals

**Goals:**

- One tab, one buffer, two modes: no second copy of a file's text anywhere.
- The read model stays free of Obsidian, of the DOM and of reader-facing text,
  so lavich/domorium#379 can move it without rewriting it.
- Pages, index and panel built as plain renderers over the model with their
  dependencies handed in, so the harness can mount them without Obsidian.

**Non-Goals:**

- Reading closed files. Every page, the index and the panel read the text of an
  open `GedcomView`; the index follows a tab, not the vault.
- Sharing one model between two tabs of the same file. Each view builds its own
  from its own text; two tabs of one file are rare and the cost is one pass.

## Decisions

### Genealogy is a mode of `GedcomView`, not a second view type

`GedcomView` gains a second container beside the editor's and shows one or the
other. The mode and the record shown are part of the view's state
(`getState`/`setState`), which Obsidian persists with the workspace and walks
with Back and Forward.

*Alternative considered:* a separate `domorium-genealogy` view type over the
same file, which is how the branch did it. Two views of one file each hold a
buffer, and text typed in one is not in the other until it is saved — exactly
the stale-page bug the spec forbids. Markdown's reading and source modes are one
view for the same reason. Links also already land in `GedcomView`.

### Moving between records rides Obsidian's history; switching mode does not

Opening a record calls `leaf.setViewState` with the new record, and `setState`
sets `result.history = true`, which the branch measured as what makes
`app:go-back` walk the states. Switching mode changes the same state with
history left unrecorded, so Back never toggles between Genealogy and Source.

### The default mode is a setting, read when a tab first opens a file

`openAs: "genealogy" | "source"`, default `"genealogy"`. A tab restored from the
workspace carries its own mode and ignores the setting; a link into a record
opens in whatever mode its tab is in. The setting changes nothing for tabs
already open.

### Links route by record kind

`setEphemeralState({ subpath })` resolves the xref against the model: in
Genealogy mode an `INDI` or `SOUR` opens its page; any other kind switches to
Source and calls the existing `goToXref`. In Source mode nothing changes. An
unknown xref keeps today's notice path in `openGedcomLink`.

### Show in source selects a range the model carries

Records, events and citations carry the symbol `range` they were read from.
Show in source switches mode, dispatches a selection over that range and
scrolls it into view — the same dispatch `goToRecord` already does, widened from
a point to a range. The record under the cursor, for entering Genealogy from
Source, is found the same way `recordAtCursor` finds it today.

### A revision is a counter the view owns

`GedcomView` increments a revision in `setViewData` and on every editor change,
and the cache in `src/genealogy/cache.ts` (moved as is) keys on it. Edits reach
the plugin today through `host.statusChanged`, on every update with no settle.
The view gains a `genealogyChanged` host call raised after edits settle
(300 ms), and the index and the panel redraw on it rather than per keystroke. A
page is redrawn when it is shown, so Source mode pays nothing.

### Citations attach to the event they sit under

`collectCitations` already walks every `SOUR` under a record and records the
level-one tag it sat under. It changes to record the level-one symbol itself,
and the event read for that symbol carries its citations. `Citation.within` stays
for the source page ("Birth"), and an event index disambiguates two of a kind.
`QUAY` is read beside `PAGE`. A `SOUR` line whose payload is not a pointer is
reported as an inline citation instead of being descended into.

### Event names come from the catalogue, not from upstream

`tags.ts` moves as is, and every tag in it gets a key in `en.json` and
`ru.json` (`event.BIRT`, …). An `EVEN` or `FACT` with a `TYPE` shows the type as
written. A tag outside the catalogue is not an event, by the model's rule.

### Pages, index and panel are renderers in `src/desk/`

`src/desk/personPage.ts`, `sourcePage.ts`, `indexList.ts` and `evidence.ts`
render into an element from the model plus a small host interface (open a
record, select a fact, show in source, name a tag). `GedcomView`, the index
`ItemView` and the evidence `ItemView` are thin Obsidian shells over them. The
harness mounts the renderers directly, as it mounts the editor today.

*Alternative considered:* rendering inside the `ItemView` classes, as the branch
did. It ties every layout test to Obsidian, which the harness does not have.

### The index renders a window

Fixed row height, a spacer of the full height, rows in view plus a margin —
the branch's measurement decided this and nothing has changed since. Search
filters the precomputed lowercase string per row the model already builds.

### Styling uses Obsidian's variables, as the mockup does

Every colour, border and spacing in `styles.css` comes from Obsidian's CSS
variables (`--background-modifier-border`, `--text-muted`, `--text-warning`,
`--interactive-accent`, …), so themes apply. Classes are prefixed `gedcom-desk-`.

### Media is asked of the language service, not read again

The model already reports a record's pictures. What a file *is* — image, audio,
document — and the rectangle a link draws are what `getMediaAt(position)`
answers in upstream, with the dialect's rules; the hover preview already uses
it and `mediaPreviewContent` turns its answer into image, file, remote or
missing. The model therefore carries, for each picture, the position of the link
naming it, and the view asks the language service there. Nothing here decides a
media kind a second way.

### Vault notes come from Obsidian's link cache, and their context from the note

`metadataCache.resolvedLinks` says which notes link to the GEDCOM file at all,
and only those notes' cached links and embeds are read for a subpath naming the
record. The line around a link is cut from the note's text, read with
`cachedRead`. A pure function takes the links and the text and returns what to
show, so it is unit-tested without Obsidian; the panel draws the sources at
once and the notes when they arrive.

## Risks / Trade-offs

- [Existing readers find their file opens differently] → the setting brings
  Source back; the release notes say so first; each tab remembers its mode.
- [Dates shown as written read as syntax: `7 NOV 1867`] → accepted until
  lavich/domorium#378 lands; the year in the heading and the index is read.
- [Index in file order is hard to scan in a large file] → search covers names,
  years and places; surname grouping follows name parts from upstream.
- [A rebuild on a 50 MB file after each settled edit] → the model build is
  ~0.5 s at 234,652 records (lavich/domorium#379) against ~2.5 s the editor
  already spends in `getDocumentSymbols()`; rebuilds only after the debounce,
  and only while a page, the index or the panel is visible.
- [Two event structures with the same tag confuse a reader] → each shows its
  own date and place and its own citations; Show in source tells them apart.

## Migration Plan

No data moves. Shipping the release changes the default mode for files opened
afterwards; a reader who wants the old behaviour sets *Open GEDCOM files as* to
Source. Rolling back is shipping the previous version; workspace state carrying
a mode is ignored by a version that does not know it.

After this lands, `feat/person-browser` is closed and its three OpenSpec changes
are not archived: this change supersedes them.
