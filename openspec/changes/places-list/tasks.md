No other change is open (`openspec/changes/` holds only `archive/`), so there is no archive order. The change is one branch and one PR with its plan; `openspec archive` is a separate PR after the merge.

Every group ends with `npm run check` exiting 0.

## 1. The Places kind

- [ ] 1.1 Strings: `list.places`, `list.column.events`, `list.count.places`, `list.countOf.places`, `list.search.places`, `list.nothing.places`, `list.none.places` and `list.alphabetical` in `src/i18n/en.json` and `ru.json` (Russian plurals one, few, many). Test in `src/i18n/i18n.test.ts`: parity and sentence case.
- [ ] 1.2 The model: extract `src/desk/listOrder.ts` (stable order, missing last) from `src/desk/listRows.ts`; add `src/desk/placeRows.ts` (`placeKey`, `foldText`, `placesOf`, `placeRows`, `yearsText`); the fourth `ListKind`, its columns, `ListState.place` and `listRows` for it in `listRows.ts`. Test in `src/desk/placeRows.test.ts` (rows, years, names as first written, default and column orders, the fold, state reading) and `src/desk/listRows.test.ts`.
- [ ] 1.3 The board: the kind, its header and rows, the local selection, the compact sort menu's *Alphabetical* in `src/desk/fileList.ts`. Test in `src/desk/fileList.test.ts`.
- [ ] 1.4 `styles.css`: the `is-places` grid. Spec: `tests/fileList.spec.ts` (the Places kind at 1400 and 390 px, no sideways scroll, no action button).

## 2. Documents

- [ ] 2.1 `README.md` and `demo-vault/Start here.md` say what the Places kind lists. Test: none.

## 3. Verify

- [ ] 3.1 `npm run check`, `npm run test:browser` (three runs) and `npm run openspec:validate` pass.
- [ ] 3.2 By hand in Obsidian on `demo-vault/`, desktop and phone (leave unticked until someone has done it): the four kind buttons, the Places rows and their years, the search with and without accents, the three-press sort of each column, a click marking a row without changing the card, the mark kept across modes and a restart, the two-line rows on a phone, the Russian text.
