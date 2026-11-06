Prerequisite: `places-list` is archived (`openspec archive places-list`) before this change, so that the main `genealogy-list` spec holds the text this change replaces. The change is one branch and one PR with its plan; `openspec archive` of this change is a separate PR after the merge.

Every group ends with `npm run check` exiting 0.

## 1. The Events kind

- [ ] 1.1 Strings: `list.events`, `list.column.event`, `list.column.record`, `list.column.date`, `list.count.events`, `list.countOf.events`, `list.search.events`, `list.nothing.events` (it says the filter covers events, records, dates and places), `list.none.events` in `src/i18n/en.json` and `ru.json` (Russian plurals one, few, many; `list.column.events` and `list.compact.events` exist for the Places and are not repeated). Test in `src/i18n/i18n.test.ts`: parity and sentence case.
- [ ] 1.2 The model: move `foldText` out of `src/desk/placeRows.ts` into a module both kinds import; add `src/desk/eventRows.ts` (`eventsOf`, `eventRows`, `EventRow`, the cells, the sort values); the fifth `ListKind`, its columns, `listRows`, `cellsOf` and `sortValue` for it in `src/desk/listRows.ts`. Test in `src/desk/eventRows.test.ts` (a file of its own, as `placeRows.test.ts` is one for the places: rows from people and families, the order, `name · value`, the awards told apart, undated and unplaced events, the sorts and the Record order, the fold) and `src/desk/listRows.test.ts` (state reading, the fall-through of `cellsOf` and `sortValue`).
- [ ] 1.3 The board: the kind, its header and rows, `keyOf`, `markedKey`, `place()`, `activate()`, `makeRow` (`data-xref` stays the record's, the row key goes in another attribute) and `totalOfKind` in `src/desk/fileList.ts`, the one-row mark by `(xref, fact)` (no row for a record without a fact or for a `u:` fact), the folded text kept with each row, and the guard that leaves the Places and the Events when a record or a source is selected elsewhere while a place still switches to the Places. Test in `src/desk/fileList.test.ts`, one case for each of those and for each of the four selections on the two kinds.
- [ ] 1.4 `styles.css`: the Events grid and its own compact rules (D6). Update `tests/fileList.spec.ts` where it counts four kind buttons (the kind bar `toHaveCount(4)` and the Places block) and add the Events at 1400 and 390 px: five buttons without overflow, no sideways scroll, two lines of at least 44 px, no action button.

## 2. Selecting an event

- [ ] 2.1 The host: `selectRecord(xref, origin, fact?)` and `selectEvent(xref, fact)` (origin `"view"`) in `src/GedcomView.ts`; an optional trailing `fact` on `FileViews.select` and the list board's `select`, forwarded to the list only; the fact carried by `markInViews`, `selectFact`, `handSelectionOver` and `FileViews.pending` with its merge and restore in `src/desk/fileViews.ts`. Test in `src/desk/fileViews.test.ts` (the wiring, pending and restore carry the fact; graph and timeline calls unchanged) and `src/desk/tabModes.test.ts` (a refused selection selects no fact; the card opens, and on a phone the drawer; selecting a record anew, Back and Forward drop the event; an edit that removes the last event of the record leaves the record shown).
- [ ] 2.2 The harness takes `selectEvent` (`calls.selectedEvent`), and its `hand()`, `pending` and `select` take the fact. Spec in `tests/fileList.spec.ts`: a click and Enter on an event row call `selectEvent` with its record and fact, and only that row is marked.

## 3. Documents

- [ ] 3.1 `README.md` and `demo-vault/Start here.md` say what the Events kind lists and what a click does. Test: none.

## 4. Verify

- [ ] 4.1 `npm run check`, `npm run test:browser` and `npm run openspec:validate` pass.
- [ ] 4.2 By hand in Obsidian on `demo-vault/`, desktop and phone (leave unticked until someone has done it): the five kind buttons, the Events rows, `Occupation · Physicist`-style cells, the search with and without accents, the three-press sort of each column, a click unfolding the event in the card and *Show in source* going to its lines, an event pressed in the card marking its row, the two-line rows on a phone, the Russian text.
