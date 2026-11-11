## Why

The file's list shows people, families, sources, places and events, and the card opens people, families, sources, media and places. Everything else a GEDCOM file declares has no way in: shared notes (1 478 of them in the Gramps export in the demo vault), repositories, the file's header, the submitter, records of the file's own. A reader can reach them only by reading Source. A pointer to such a record on a card is plain text, because there is no card to open.

## What Changes

The user's requirement, in their words and by date:

- 2026-11-11: «REPO (хранилище), общие заметки SNOTE/NOTE, медиа OBJE, свои _RECORD — их надо в табличные представления добавить, да?», then «Да, надо и списки и карточки добавить. Делай по flow прям сейчас от мейна, а потом подтянем это в ветку».

The proposed scope:

- Four new kinds in the list, after the existing five: **Media**, **Notes** (shared notes, 7.0 `SNOTE` and 5.5.1 `NOTE` records), **Repositories**, **Other** (the file header first, then submitters and records of the file's own). Each with its columns, search, sorting and counts, as the existing kinds have.
- Where a tab is too narrow for nine buttons, the kinds become one dropdown (a choice made in this plan; the user may change it).
- A card for a shared note, a repository, the file header, a submitter and a record of the file's own: the record's name as its heading and every line of the record below it. The media card stays as it is.
- A pointer to any of these records on any card now selects it, because it has a card.
- The read model lists these records, with the number of lines pointing at each.

**This repository or upstream.** Entirely this repository: everything is read from `getDocumentSymbols()` and the record lines the published `@domorium/language-service` already gives. Nothing waits on a release.

**Order with the open work.** Built on `main`. PR #260 (`record-fields-tree`) replaces the body of the card with the tree of the record's lines and removes the Events kind; when this change is brought into that branch, the cards added here take the tree (one call site) and the Events kind goes from the list of kinds.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `genealogy-list`: four new kinds and their requirements; the kinds' buttons, and a dropdown on a narrow tab.
- `genealogy-record-card`: the card of a shared note, a repository and another record.
- `genealogy-read-model`: the media, notes, repositories and other records a document declares, and the lines pointing at each.

## Non-goals

- Editing these records (PR #260 brings editing to every card that draws a tree).
- A new card for media; the existing media card stays.
- Creating, removing or merging whole records.
- A tree of the whole file; the list is the way into these records.

## Impact

- `src/genealogy/` (`build.ts`, `index.ts`, `types.ts`): rows of the new kinds and pointer counts, read in the existing pass.
- `src/desk/listRows.ts`, `src/desk/fileList.ts`: kinds, columns, search, sort, counts, the narrow dropdown.
- `src/desk/deskState.ts` (`pageKind`, a kind for the new cards, the header's id), `src/desk/recordCard.ts` and a new `src/desk/recordPage.ts` for the card, `src/desk/detail/lineView.ts` (pointers to the new kinds become links).
- `src/i18n/en.json`, `src/i18n/ru.json`, `styles.css`, `harness/fileViews.ts` and `harness/desk.ts`, `tests/fileList.spec.ts`, `tests/desk.spec.ts`, `README.md`.
