Built on `main`. To be brought into PR #260 (`record-fields-tree`) after it is ready: the record page's body becomes the tree, and the Events kind goes.

## 1. The read model

- [ ] 1.1 Rows of media, shared notes (7.0 `SNOTE`, 5.5.1 `NOTE`), repositories and other records (header first) in the existing pass of `src/genealogy/build.ts`, with `linkedFrom(xref)` counted from every pointer line; verify in `src/genealogy/index.test.ts` with `curie.ged`, a 5.5.1 and a 7.0 note, a `_PLAN` record, the header, and three pointers to one note
- [ ] 1.2 `record(HEADER)` returns the header's lines; verify in `src/genealogy/index.test.ts`

## 2. The list

- [ ] 2.1 `LIST_KINDS`, `COLUMNS`, `cellsOf`, `sortValue`, search and counts for `media`, `notes`, `repositories`, `other` in `src/desk/listRows.ts`; the whole text of a note in its search; verify in `src/desk/listRows.test.ts`
- [ ] 2.2 The kinds' buttons and the narrow dropdown in `src/desk/fileList.ts`, the saved kind and sort per kind, empty states; verify in `src/desk/fileList.test.ts` and `src/desk/deskState.test.ts`
- [ ] 2.3 Strings for the kinds, columns, counts (plural rules) and empty states in `src/i18n/en.json` and `src/i18n/ru.json`; verify in `src/i18n/i18n.test.ts`

## 3. The cards

- [ ] 3.1 `pageKind` answers `record` for a shared note, a repository, a submitter, a record of the file's own and `header:`; verify in `src/desk/deskState.test.ts`
- [ ] 3.2 `src/desk/recordPage.ts`: the heading from the record's name and `renderLines` over its lines, drawn by `drawRecord`; verify in `src/desk/recordCard.test.ts` for a note, a repository, the header and a `_PLAN` record
- [ ] 3.3 A pointer to a repository, a note or a submitter on a source's or a person's card is a link that selects it; verify in `src/desk/recordCard.test.ts`

## 4. The browser

- [ ] 4.1 `harness/fileViews.ts` and `harness/desk.ts` fixtures with a repository, notes, a submitter, a `_PLAN` record; `tests/fileList.spec.ts`: the nine kinds at 1400 px and the dropdown at 390 px, each new kind's rows, sort and search, the Notes of a large file timed; `tests/desk.spec.ts`: choosing a note, a repository, the header and opening a repository from a source; verify with `npm run test:browser`
- [ ] 4.2 `styles.css` for the dropdown and the new columns at 320 and 390 px; verify by screenshots of the harness, light and dark

## 5. Docs and gate

- [ ] 5.1 `README.md` where it describes the list and the card
- [ ] 5.2 `npm run check` and `npm run test:browser`
