## Why

The file's list shows people, families, sources and places, and the card opens people, families, sources, media and places. Everything else a GEDCOM file declares has no way in: shared notes (1478 of them in a Gramps export the user works with), repositories, the file's header, the submitter, records of the file's own. A reader can reach them only by reading Source. A pointer to a repository or a submitter on a card is plain text, because there is no card to open, and a pointer to a shared note shows the note's text with no way to the note itself.

## What Changes

The user's requirement, in their words and by date:

- 2026-11-11: «REPO (хранилище), общие заметки SNOTE/NOTE, медиа OBJE, свои _RECORD — их надо в табличные представления добавить, да?», then «Да, надо и списки и карточки добавить».
- 2026-11-11, on the second review, asked whether to wait for the language service to write a record's own value or to make it read-only: «ждём upstream» — the text of a shared note and the value of a record of the file's own stay editable fields, and the change waits for lavich/domorium#527.
- 2026-11-11, on the review of the first plan: built in this branch on top of `record-fields-tree`, not on `main`; the new cards are the tree of the record's lines, as the person, family and source cards are; the header's card is read-only; links, `obsidian://` URLs and *Go to record* open these cards; the cursor resting in Source does not select them; a pointer to a shared note keeps its text and gains *Open note*; eight kinds, and a dropdown where the buttons do not fit, decided by measuring them.

The proposed scope:

- Four new kinds in the list, after the existing four: **Media**, **Notes** (7.0 `SNOTE` and 5.5.1 `NOTE` records), **Repositories**, **Other** (the file's header first, then submitters, 5.5.1 submission records and records of the file's own with an identifier). Each with its columns, search, sorting, counts, two-line phone layout and empty state, as the existing kinds have. Eight kinds in all; Events went with `record-fields-tree`.
- Where the toolbar has no room for the eight buttons, measured as drawn, the kinds become one dropdown.
- A card for a shared note, a repository, a submitter, a submission record, a record of the file's own and the header: the tree of the record's lines, edited as a person's tree is, except the header's, which is read-only. The media card keeps its form and gains a row in the list.
- These records are selected from their rows, from a link or URL, from *Go to record* (the header included) and from a pointer in a tree; a pointer to a repository or a submitter becomes a link, and a pointer to a shared note gains *Open note*. The cursor in Source still selects only people, families, sources and media.
- One rule names every record, used by the list, the card's announcement, pointers and the tree's root.
- The read model lists these records and counts, per record, how many records point at it.

**This repository or upstream.** The list, the cards and the routing are this repository's. The records are read from `getDocumentSymbols()` and the record lines built from them, except a record of the file's own whose opening line carries a value, which the symbols do not hold: that value is read from `describeStructure(at).value`, which the service already gives. Editing uses the operations `record-fields-tree` calls (lavich/domorium#522), and writing a record's own value — the text of a 7.0 `SNOTE`, a 5.5.1 `NOTE` record with its `CONC` and `CONT`, the value of a record of the file's own — needs `setValue` on a record's opening line, which the service refuses today (`record-edit-unsupported`) and lavich/domorium#527 asks for, with a refusal of its own for a record that holds no value by the standard, `validateValue` on an opening line and `describeStructure` agreeing. The change cannot merge before a release of `@domorium/language-service` and `@domorium/validator` carrying #522 and #527.

**Order with the open work.** Depends on lavich/domorium#527 as well as #522. Built in branch `lavich/record-fields-tree` (PR #260) on top of `record-fields-tree`, and archived after it: every delta here is written against the specs as they stand once `record-fields-tree` is archived.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-list`: four new kinds and what a list counts; the kinds' requirement renamed and widened to eight, with a measured dropdown; search, sorting, selection, bringing into view and the narrow tab restated for them.
- `genealogy-record-card`: the cards of the new records; one naming rule; the empty state; what can be selected and how; the cursor in Source; the media card's row.
- `genealogy-record-tree`: the root of every card's tree and its value; *Open note* on a pointer to a shared note; a pointer to a repository or a submitter is a link.
- `genealogy-record-edit`: the header's card is read-only, every other new card edits.
- `genealogy-view`: links and *Go to record* open the new cards; copying a link to a selected record of any kind; List in the four modes names every kind.
- `genealogy-record-detail`: notes of any record whose card is a tree.
- `genealogy-read-model`: the media, notes, repositories and other records a document declares, the header's lines, and the records that point at each.

## Non-goals

- A tree for the media card; it keeps its form.
- Creating, removing or merging whole records, or changing a record's identifier.
- Editing the header from its card; it is changed in Source.
- Selecting a note, a repository, a submitter, a record of the file's own or the header by the cursor in Source.
- Marking any of these records in the graph or the timeline.
- Folding marks in the search of the people, families and sources, which keep their case-only matching.
- A tree of the whole file.

## Impact

- `src/genealogy/build.ts`, `index.ts`, `types.ts`, `recordLines.ts`: the lists of the new kinds, the header's lines under `header:`, the root value of a record of the file's own read from `describeStructure` (`IndexSource` gains it), and `linkedFrom` / `sourcesOf` from one lazy walk.
- `src/desk/listRows.ts`: `ListKind`, `LIST_KINDS`, `COLUMNS`, `SortKey`, `cellsOf`, `sortValue`, `listRows`, search with `foldText`, `recordKind`, `listSelection`, the header row kept first.
- `src/desk/fileList.ts`: the kinds' buttons and the measured dropdown in `resized()`, `place()` and `activate()` for the new kinds and the header id, `markedKey`, `totalOfKind`, `countLabel`, the label tables.
- `src/desk/deskState.ts`: `PageKind` gains `record`, `pageKind`, `HEADER_ID`, `followsCursor`, `shownRange`, and `routeRecord`, the one pure routing of links, URLs and *Go to record*, replacing `routeLink`.
- `src/desk/tabModes.ts`, `src/desk/followRules.ts`: leaving Source and the cursor's rest select only what `followsCursor` allows.
- `src/GedcomView.ts`: a thin caller of `routeRecord` and `followsCursor` in `goToXref`, `goToRecord`, `cursorSettled` and `has()`; `selectRecord` placing the cursor from `shownRange`.
- `src/desk/recordCard.ts`: `hasTree`, the empty state, the announcement through `recordTitle`, `drawRecord` drawing the new cards and keeping the header read-only; `src/desk/recordPage.ts` (new) for the new cards' tree.
- `src/desk/detail/lineView.ts` (`recordTitle`), `src/desk/detail/tree.ts` (the root's value, *Open note* in `paintValue`), `src/desk/mediaPage.ts` (its private namer replaced).
- `src/i18n/en.json`, `src/i18n/ru.json`, `styles.css`, `harness/fileViews.ts`, `harness/desk.ts`, `src/testing/curie.ts`, `tests/generated.ts`, `tests/fileList.spec.ts`, `tests/desk.spec.ts`, `README.md`.
- Unit tests beside each module listed in `tasks.md`.
