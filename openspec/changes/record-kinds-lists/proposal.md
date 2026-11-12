## Why

The file's list shows people, families, sources and places, and the card opens people, families, sources, media and places. Everything else a GEDCOM file declares has no way in: shared notes (1478 of them in a Gramps export the user works with), repositories, the file's header, the submitter, records of the file's own. A reader can reach them only by reading Source. A pointer to a repository or a submitter on a card is plain text, because there is no card to open, and a pointer to a shared note shows the note's text with no way to the note itself.

## What Changes

The user's requirement, in their words and by date:

- 2026-11-11: «REPO (хранилище), общие заметки SNOTE/NOTE, медиа OBJE, свои _RECORD — их надо в табличные представления добавить, да?», then «Да, надо и списки и карточки добавить».
- 2026-11-11, on the second review, asked whether to wait for the language service to write a record's own value or to make it read-only: «ждём upstream» — the text of a shared note and the value of a record of the file's own stay editable fields, and the change waits for lavich/domorium#527.
- 2026-11-11, on the review of the first plan: built in this branch on top of `record-fields-tree`, not on `main`; the new cards are the tree of the record's lines, as the person, family and source cards are; the header's card is read-only; links, `obsidian://` URLs and *Go to record* open these cards; the cursor resting in Source does not select them; a pointer to a shared note keeps its text and gains *Open note*; eight kinds, and a dropdown where the buttons do not fit, decided by measuring them.
- 2026-11-12, asked whether to open the header for editing, since the language service now describes `HEAD`, checks its values and refuses changing `GEDC.VERS` or removing `GEDC` (`rule-violation`) and removing `CHAR` (`required-field-missing`): «да». The header's card edits as every other card; the root still has no value field, because `HEAD` holds none (`value-not-allowed`). No rule of the plugin's own guards `CHAR`; if one is wanted it belongs upstream.
- 2026-11-12, on the media card: «панель для OBJE неполноценная» — the media card becomes the tree of the multimedia record's lines, edited as the others, with no heading and no *Used by* (the list's *Linked from* carries the count).
- 2026-11-12: «давай у тэга FILE сделаем input type=file и если там картинка то отображаем её и при клике предлагается выбрать другую», then, on the recommendations for how: «давай по твоим рекомендациям». Every `FILE` row of a multimedia record or of an inline `OBJE` shows the picture where the file is an image the card can draw, its path with a file icon otherwise; pressing it offers *Choose from the vault* and *Upload from device*, and a choice writes the path, and the format where the record states one.
- 2026-11-12, offered two ways for the card of a place, which kept its old heading and rows of events that opened nothing: «(б) Сделать место полезным для правки». The card of a place lists every line of the file that names the place and offers to rename it everywhere: one change of every `PLAC` line the Places list groups into it, through the service's `setValue`, one step of the history. Merging with another place by a command of its own may come later and is not in this step. Places are not records in GEDCOM, and the lines a `PLAC` holds (`MAP`, `FORM`, `TRAN`, `NOTE`) stay edited in the tree of the event that holds them.

The proposed scope:

- Four new kinds in the list, after the existing four: **Media**, **Notes** (7.0 `SNOTE` and 5.5.1 `NOTE` records), **Repositories**, **Other** (the file's header first, then submitters, 5.5.1 submission records and records of the file's own with an identifier). Each with its columns, search, sorting, counts, two-line phone layout and empty state, as the existing kinds have. Eight kinds in all; Events went with `record-fields-tree`.
- Where the toolbar has no room for the eight buttons, measured as drawn, the kinds become one dropdown.
- A card for a shared note, a repository, a submitter, a submission record, a record of the file's own and the header: the tree of the record's lines, edited as a person's tree is, the header's included.
- The media card becomes the tree of the multimedia record's lines, rooted at *Media*, edited as the others, with no heading of its own and no *Used by*; it gains a row in the list.
- On every `FILE` row of a multimedia record or of an inline `OBJE`: the picture, where the file resolves to an image; the path with a file icon otherwise. Pressing it opens a menu of two choices: *Choose from the vault*, a searchable list of the vault's files, which writes the chosen file's path relative to the GEDCOM file, and *Upload from device*, which copies a file from the device into the vault and writes its path. Where the line states a `FORM`, the same change writes the new file's format in the dialect's form. A copy is made only on the reader's choice and is never removed by the plugin.
- The card of a place, with no heading: a field holding the place's name, which renames the place in every line the list groups into it after one question, joining another place where the new name is that place's; beneath it, one row per line naming the place, in the file's order — the event, its date and the person or family it belongs to — which selects that record's card with the event opened and in view. The Places list does not change.
- These records are selected from their rows, from a link or URL, from *Go to record* (the header included) and from a pointer in a tree; a pointer to a repository or a submitter becomes a link, and a pointer to a shared note gains *Open note*. The cursor in Source still selects only people, families, sources and media.
- One rule names every record, used by the list, the card's announcement, pointers and the tree's root.
- The read model lists these records and counts, per record, how many records point at it.

**This repository or upstream.** The list, the cards and the routing are this repository's. The records are read from `getDocumentSymbols()` and the record lines built from them, except a record of the file's own whose opening line carries a value, which the symbols do not hold: that value is read from `describeStructure(at).value`, which the service already gives. Editing uses the operations `record-fields-tree` calls (lavich/domorium#522), and writing a record's own value — the text of a 7.0 `SNOTE`, a 5.5.1 `NOTE` record with its `CONC` and `CONT`, the value of a record of the file's own — needs `setValue` on a record's opening line, which the service refuses today (`record-edit-unsupported`) and lavich/domorium#527 asks for, with a refusal of its own for a record that holds no value by the standard, `validateValue` on an opening line and `describeStructure` agreeing. The change cannot merge before a release of `@domorium/language-service` and `@domorium/validator` carrying #522 and #527. The header's editing rests on what the service already describes and refuses for `HEAD` on the linked upstream (main b368a80). The file of a medium is written through `setValue` on its `FILE` and `FORM` lines; the path is spelt with the service's own `relativeFilePath` and `encodeFileTarget`, as moved media are, and read back with `resolveFileTarget`. The service accepts a 7.0 `FILE` naming `../photo.jpg`, which `resolveFileTarget` does not read as a file; the plugin therefore declines a file it could not name so that it reads back, as moving media already does. Whether the service should refuse such a value is a question for upstream, not answered here.

Renaming a place is this repository's too: it is one `setValue` per `PLAC` line, asked of the service at the version the card was drawn from and applied as one change, as the file and format of a medium are; the service's refusals are the rules, and no new upstream behaviour is needed.

**Order with the open work.** Depends on lavich/domorium#527 as well as #522. Built in branch `lavich/record-fields-tree` (PR #260) on top of `record-fields-tree`, and archived after it: every delta here is written against the specs as they stand once `record-fields-tree` is archived.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-list`: four new kinds and what a list counts; the kinds' requirement renamed and widened to eight, with a measured dropdown; search, sorting, selection, bringing into view and the narrow tab restated for them.
- `genealogy-record-card`: the card of a place, a field of its name over a row for each line naming it, a row opening its event in the record's tree; the cards of the new records; one naming rule; the empty state; what can be selected and how; the cursor in Source; the media card is a tree and has a row; the preview of a file among the controls of a card.
- `genealogy-record-tree`: the root of every card's tree and its value, the multimedia record's and the header's among them; *Open note* on a pointer to a shared note; a pointer to a repository or a submitter is a link; the file of a medium shown as its picture or its path.
- `genealogy-record-edit`: every new card edits, the header's and the media card included; the file of a medium is chosen from the vault or uploaded from the device, with its format; a place is renamed everywhere from its card.
- `genealogy-view`: links and *Go to record* open the new cards; copying a link to a selected record of any kind; List in the four modes names every kind.
- `genealogy-record-detail`: notes of any record whose card is a tree.
- `genealogy-read-model`: the media, notes, repositories and other records a document declares, the header's lines, and the records that point at each; a multimedia record no longer lists the records that link it, which nothing reads once the media card is a tree.

## Non-goals

- Creating, removing or merging whole records, or changing a record's identifier.
- A rule of the plugin's own for the header's `CHAR` or `GEDC`; the language service's refusals are the rules.
- Copying a file into the vault without the reader choosing it, removing a copy, or choosing a folder for it.
- Adding a `FORM` where the line states none, choosing several files at once, dragging a file onto the card, and editing the path of a file as text in the tree (it stays editable in Source).
- Opening the file from the media card while the card writes: pressing the preview offers the two choices, as the user asked.
- Selecting a note, a repository, a submitter, a record of the file's own or the header by the cursor in Source.
- Marking any of these records in the graph or the timeline.
- Folding marks in the search of the people, families and sources, which keep their case-only matching.
- A tree of the whole file.
- Merging a place with another by a command of its own, splitting a place, or renaming only some of its lines; a place joins another only by being given that place's name.
- Editing a place's `MAP`, `FORM`, `TRAN` or `NOTE` on the card of the place: they stay lines of the event's tree. A `PLAC` outside the events of people and families, which the Places list does not group, is not renamed.
- Any change to the Places list.

## Impact

- `src/genealogy/build.ts`, `index.ts`, `types.ts`, `recordLines.ts`: the lists of the new kinds, the header's lines under `header:`, the root value of a record of the file's own read from `describeStructure` (`IndexSource` gains it), and `linkedFrom` / `sourcesOf` from one lazy walk.
- `src/desk/listRows.ts`: `ListKind`, `LIST_KINDS`, `COLUMNS`, `SortKey`, `cellsOf`, `sortValue`, `listRows`, search with `foldText`, `recordKind`, `listSelection`, the header row kept first.
- `src/desk/fileList.ts`: the kinds' buttons and the measured dropdown in `resized()`, `place()` and `activate()` for the new kinds and the header id, `markedKey`, `totalOfKind`, `countLabel`, the label tables.
- `src/desk/deskState.ts`: `PageKind` gains `record`, `pageKind`, `HEADER_ID`, `followsCursor`, `shownRange`, and `routeRecord`, the one pure routing of links, URLs and *Go to record*, replacing `routeLink`.
- `src/desk/tabModes.ts`, `src/desk/followRules.ts`: leaving Source and the cursor's rest select only what `followsCursor` allows.
- `src/GedcomView.ts`: a thin caller of `routeRecord` and `followsCursor` in `goToXref`, `goToRecord`, `cursorSettled` and `has()`; `selectRecord` placing the cursor from `shownRange`.
- `src/desk/recordCard.ts`: `hasTree`, the empty state, the announcement through `recordTitle`, `drawRecord` drawing the new cards, the media card and the header as trees; `src/desk/recordPage.ts` (new) for the new cards' tree.
- `src/desk/detail/lineView.ts` (`recordTitle`), `src/desk/detail/tree.ts` (the root's value, *Open note* in `paintValue`, the row of a medium's file).
- `src/desk/mediaPage.ts` and `src/desk/mediaPage.test.ts` removed, with what only they used in `src/desk/media.ts` (`renderTile`), its strings and its CSS; `MediaRecord.links`, `MediaRecord.at` and `collectMediaLinks` in `src/genealogy/`.
- `src/desk/mediaFile.ts` (new): the path a file is written as, the folder and name of a copy, the format of a file, the write of `FILE` and `FORM` as one change, and the menu's two choices; `src/desk/deviceFile.ts` (new), the `<input type="file">`; `src/desk/pointerModal.ts` gains the list of the vault's files; `src/desk/DeskViews.ts`, `src/GedcomView.ts` and `harness/desk.ts` wire them; `src/genealogy/recordLines.ts` gives a line the position of its value.
- `src/desk/placeEdits.ts` (new): the lines of a place and the one change that renames it; `src/desk/edits.ts` gains `joinEdits`, which `mediaFileEdit` uses too; `src/desk/placePage.ts` redrawn as the field and the rows; `src/desk/detail/tree.ts` gains `revealLine`; `src/desk/recordCard.ts`, `src/desk/confirmModal.ts`, `src/GedcomView.ts` and `harness/desk.ts` wire the rename; `src/desk/factRow.ts`, `src/desk/eventDetail.ts`, `occurrencesAt` and the heading's CSS and strings go, having no caller left.
- `src/i18n/en.json`, `src/i18n/ru.json`, `styles.css`, `harness/fileViews.ts`, `harness/desk.ts`, `src/testing/curie.ts`, `tests/generated.ts`, `tests/fileList.spec.ts`, `tests/desk.spec.ts`, `README.md`.
- Unit tests beside each module listed in `tasks.md`.
