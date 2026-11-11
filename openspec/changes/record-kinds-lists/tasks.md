Built in branch `lavich/record-fields-tree` on top of the change `record-fields-tree`, and archived after it (`openspec archive record-fields-tree`, then `openspec archive record-kinds-lists`). Every test file named below exists unless marked *new*.

## 1. The read model

- [ ] 1.1 In `src/genealogy/build.ts` and `types.ts`, the lists of media, shared notes (7.0 `SNOTE`, 5.5.1 `NOTE`), repositories and other records (header first as `header:`, no `TRLR`, no record without an identifier) from the existing top-level loop; `record("header:")` answers the header's lines; verify in `src/genealogy/index.test.ts` with `curie.ged` (7 media, 2 notes, 2 repositories, header then `@U1@`), a 5.5.1 file with a `SUBN` and a `_PLAN` record
- [ ] 1.2 `linkedFrom(xref)` and `sourcesOf(xref)` from one lazy walk of every line, kept per index; distinct records, the header counted, self, `@VOID@` and `CONC`/`CONT` excluded; verify in `src/genealogy/index.test.ts` (two pointers from one record count once, `@U1@` is 1 from the header, the walk runs once for all counts of a revision)
- [ ] 1.3 `recordLines` gives a root its payload as text for any record whose opening line carries a value, and a 5.5.1 note's text is the joined text; verify in `src/genealogy/recordLines.test.ts`

## 2. Naming

- [ ] 2.1 `recordTitle` in `src/desk/detail/lineView.ts` names every kind (place, medium by title or file base name, note by first non-empty joined line, repository and submitter by `NAME`, other records by `NAME`/`TITL`/first value/kind, `header:` as *File header*); `recordCard.ts` and `mediaPage.ts` drop their own namers and call it; verify in `src/desk/detail/lineView.test.ts`, `src/desk/recordCard.test.ts` (announcement) and `src/desk/mediaPage.test.ts`

## 3. The list

- [ ] 3.1 `ListKind`, `LIST_KINDS`, `COLUMNS`, new `SortKey`s, `cellsOf`, `sortValue` (header row first under any sort), `listRows`, search through `foldText` for the four new kinds, in `src/desk/listRows.ts`; verify in `src/desk/listRows.test.ts` (the curie rows of each kind, `chemistry` finds `@N1@`, `kolo` finds `@R2@`, `submitter` finds `@U1@`, the header stays first ascending and descending, missing values last)
- [ ] 3.2 `recordKind` and `listSelection` answer `media`, `notes`, `repositories`, `other` and `header:`; verify in `src/desk/listRows.test.ts` ("which selection the list can show")
- [ ] 3.3 In `src/desk/fileList.ts`: the label tables, `totalOfKind`, `countLabel` for `linkedFrom` and the repositories' `sources`, `place()` keeping the five holding kinds against a person, a family or a source from outside and switching to the kind of a new record from anywhere, `activate()` and `markedKey()` for the header id; verify in `src/desk/fileList.test.ts` ("selecting", "the kinds", "a narrow tab and a touch device")
- [ ] 3.4 The kinds' dropdown in `resized()`: a hidden probe of the eight buttons measured with the search icon, the switch below the measured width and back above it plus 40 px, the `select.dropdown` named `list.kind`, the same tab stop; verify in `src/desk/fileList.test.ts` with stubbed widths (both directions, the margin, a wider language)
- [ ] 3.5 Strings in `src/i18n/en.json` and `src/i18n/ru.json`: `list.media`, `list.notes`, `list.repositories`, `list.other`, `list.kind`, the new `list.column.*`, `list.count.*` and `list.countOf.*` with plural forms, `list.search.*`, `list.nothing.*`, `list.none.*`, `list.compact.linkedFrom`, `record.header`, `record.tag.HEAD`, `record.tag.SUBN`, `desk.openNote`; verify in `src/i18n/i18n.test.ts`

## 4. Selection, links and Source

- [ ] 4.1 `PageKind` gains `record`; `pageKind` answers it for the new records and `header:`; `HEADER_ID`, `followsCursor`, `goToTarget` and `shownRange` for these records and the header in `src/desk/deskState.ts`; verify in `src/desk/deskState.test.ts` ("which records have a card", "where a link into a record lands", "where the source opens when the tab switches to it")
- [ ] 4.2 `TabModes.setMode` selects on leaving Source only where `followsCursor` allows; verify in `src/desk/tabModes.test.ts`; `shouldFollowCursor` is fed `followsCursor` in `GedcomView.has()`; verify in `src/desk/followRules.test.ts`
- [ ] 4.3 In `src/GedcomView.ts`: `goToRecord` selects the header through `goToTarget`; `selectRecord` places the cursor from `shownRange`; `cursorSettled` and `has()` use `followsCursor`; covered by the unit tests of 4.1 and 4.2, and checked by hand in the demo vault (a link, a URL and *Go to record* to `@N1@`, `@R1@`, `@U1@` and the header, in every mode)
- [ ] 4.4 Copying a link offered for a selected note and not for the header; verify in `src/commands.test.ts`

## 5. The cards

- [ ] 5.1 `src/desk/recordPage.ts` (new): `renderRecordPage` draws the tree through `drawTree` with no facts; `drawRecord` and `hasTree` in `src/desk/recordCard.ts` take the `record` kind; the empty state counts any record with an identifier; verify in `src/desk/recordCard.test.ts` ("the page of each kind of record", "the empty states of the card") for a note, a repository, a submitter, a `_PLAN` record and the header
- [ ] 5.2 The header read-only: `writes` and `uneditable` false for `header:` in `drawRecord`; a submitter, a repository and a note write; verify in `src/desk/recordCard.test.ts` ("a card that writes") through `src/testing/textTab.ts`
- [ ] 5.3 The root's value in `src/desk/detail/tree.ts`: a shared note's text as a note, a custom record's value as a field, labels from `tagLabel`; verify in `src/desk/detail/tree.test.ts`
- [ ] 5.4 *Open note* beside a shared note's text in `renderPointer`, focus key `t:<node key>:open`, a card-origin selection; a pointer to a repository or a submitter is a link; verify in `src/desk/detail/lineView.test.ts` and `src/desk/detail/tree.test.ts`

## 6. The browser

- [ ] 6.1 `tests/generated.ts`: `generatedNotes(count, dialect)` making 7.0 `SNOTE` and 5.5.1 `NOTE` records with `CONC`/`CONT`, each pointed at by a person
- [ ] 6.2 `src/testing/curie.ts`, `harness/fileViews.ts` and `harness/desk.ts`: a fixture with a `_PLAN` record, a 5.5.1 file with a `SUBN`, and the generated notes
- [ ] 6.3 `tests/fileList.spec.ts`: the eight buttons at 1400 px, the dropdown at 390 px and when narrowed, buttons again only past the margin, in English and Russian; each new kind's rows, sort, search and two-line phone rows at 390 and 320 px; 1478 notes in both dialects timed and windowed; the header row first under a sort; a person from the graph keeps the Notes
- [ ] 6.4 `tests/desk.spec.ts`: choosing a note, a repository, a submitter, a `_PLAN` record and the header; the header has no editing control; *Open note* from Marie's tree; the repository from a source's tree; the announcement
- [ ] 6.5 `styles.css` for the dropdown, the new columns and their two-line rows; verify by screenshots of the harness at 320 and 390 px, light and dark

## 7. Docs and gate

- [ ] 7.1 `README.md` where it describes the list and the card
- [ ] 7.2 `npm run check` and `npm run test:browser`
