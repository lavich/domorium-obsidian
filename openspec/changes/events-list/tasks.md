Prerequisite: `places-list` is archived (`openspec archive places-list`) before this change, so that the main `genealogy-list` spec holds the text this change replaces. The change is one branch and one PR with its plan; `openspec archive` of this change is a separate PR after the merge.

Every group ends with `npm run check` exiting 0.

## 1. The Events kind

- [ ] 1.1 Strings: `list.events`, `list.column.event`, `list.column.record`, `list.column.date`, `list.count.events`, `list.countOf.events`, `list.search.events`, `list.nothing.events` (it says the filter covers events, records, dates and places), `list.none.events`, and the event card's: its record, date and place labels, its sources heading and its line for an event that states nothing, in `src/i18n/en.json` and `ru.json` (Russian plurals one, few, many; `list.column.events` and `list.compact.events` exist for the Places and are not repeated). Test in `src/i18n/i18n.test.ts`: parity and sentence case.
- [ ] 1.2 The model: move `foldText` out of `src/desk/placeRows.ts` into a module both kinds import; export `personSortKey` and `familySortKey` from `src/desk/labels.ts` and use them in `listRows.ts`; add `src/desk/eventRows.ts` (`eventsOf`, `eventRows`, `eventId`, `eventAt` in O(1), `EventRow`, the cells, the sort values); the fifth `ListKind`, its columns, `listRows`, `cellsOf` and `recordKind` for it in `src/desk/listRows.ts`. Test in `src/desk/eventRows.test.ts` (a file of its own, as `placeRows.test.ts` is one for the places: rows from people and families, a record declared twice, the order, `name · value`, the awards told apart, undated and unplaced events, the sorts and the Record order, the fold, the language of a cached search, the id and `eventAt` for a good, a gone and a foreign id) and `src/desk/listRows.test.ts` (state reading, `recordKind`).
- [ ] 1.3 The board: the kind, its header and rows, `keyOf`, `markedKey`, `place()` (one rule for the Places and the Events: a record or a source leaves the list, a place or an event switches it, clears a hiding filter and brings the row into view), `activate()` and `totalOfKind` in `src/desk/fileList.ts`, and the row's `data-key`. Test in `src/desk/fileList.test.ts`, one case for each, including each of the selections on both kinds.
- [ ] 1.4 `styles.css`: the Events grid and its own compact rules (D6). Update `tests/fileList.spec.ts` where it counts four kind buttons (the kind bar `toHaveCount(4)` and the Places block) and add the Events at 1400 and 390 px: five buttons without overflow, no sideways scroll, two lines of at least 44 px, no action button, and the sort of each column.

## 2. The card of an event

- [ ] 2.1 `PageKind` and `pageKind` in `src/desk/deskState.ts` answer `event`; `shownRange` returns the event's range; `src/desk/recordCard.ts` learns it in its own `pageKind`, `recordName` and `drawRecord`; add `src/desk/eventPage.ts` (D4). Test in `src/desk/deskState.test.ts` (the page kind, the range, the drop of a selection an edit removes) and `src/desk/recordCard.test.ts` (the card's title, the live-region name, the links to the record, the place and the source, the line for an event that states nothing, no evidence section).
- [ ] 2.2 Selection through the tab: a click, Enter and Space select the event id; the mark follows it across the modes, history, Back and Forward, and the restart. Test in `src/desk/tabModes.test.ts` (an edit that removes the event clears the selection) and `tests/fileList.spec.ts` (a click and Enter call the host with the id and mark only that row).

## 3. Documents

- [ ] 3.1 `README.md` and `demo-vault/Start here.md` say what the Events kind lists and what a click opens. Test: none.

## 4. Verify

- [ ] 4.1 `npm run check`, `npm run test:browser` and `npm run openspec:validate` pass.
- [ ] 4.2 By hand in Obsidian on `demo-vault/`, desktop and phone (leave unticked until someone has done it): the five kind buttons, the Events rows, `Occupation · Physicist`-style cells, the search with and without accents, the three-press sort of each column, a click opening the card of the event, its links to the record, the place and a source, *Show in source* going to its lines, Back and Forward across events, the selection kept across modes and a restart, the two-line rows on a phone, the Russian text.
