## 1. The read model

- [ ] 1.1 Add optional `end` and `period` to `DateReading` in `src/genealogy/dates.ts`, from `readDate`'s second date and modifier, set only where they apply; extend `src/genealogy/dates.test.ts` with `FROM 1891 TO 1894`, `FROM 1891`, `BET 1867 AND 1870`, `BET 1867 AND HEBREW 5628` (7.0), `FROM 1894 TO 1891`, a BCE second date (`BCE` in 7.0, `B.C.` in 5.5.1) and `FROM 1700 TO 1750/51` in 5.5.1, and check `src/genealogy/dates.test.ts` and `src/genealogy/index.test.ts` pass unchanged otherwise.

## 2. Fixtures

- [ ] 2.1 Add to `src/testing/curie.ts` a `curieWithEvents()` text: `curie.ged` plus the mockup's sample events (Marie's 1891 emigration, `EDUC FROM 1891 TO 1894`, Pierre's `RESI FROM 1895 TO 1906`, the Nobel `EVEN`s, Ève's 1940 immigration), Władysław's birth as `ABT 1832`, and one more person with no dated event (18 people); leave `CURIE` unchanged. Checked by its use in 3.x.

## 3. The model of the timeline

- [ ] 3.1 Create `src/desk/fileTimeline.ts`: per person sex, span (birth, else christening or baptism, else earliest event; death, else burial or cremation, else an open end capped at a hundred years and the present) and dated events with kind, sign, uncertainty and period; per family spouses, children and marriage; no row for a person without an identifier. Test in a new `src/desk/fileTimeline.test.ts` on `curieIndex()` and `curieWithEvents()` (Marie `1867–1934`, the 1895 marriage on both, Hélène's open end, Pierre's residence as a period, Władysław's `ABT 1832` birth as uncertain, the undated person counted).
- [ ] 3.2 Port generations and the order of rows from the mockup; test in `src/desk/fileTimeline.test.ts` that the Curie children stand together with Pierre last, the Skłodowski with Marie first, and Frédéric beside Irène.
- [ ] 3.3 Add `branch(focus, up, down)` with steps 0–9 and `alive(year)` with the age reached that year; test in `src/desk/fileTimeline.test.ts` Irène's branch (10 of 17), ages in 1906 (Marie 39, Irène 9), 68 in 1900 for Władysław's `1832` on `curieIndex()` and approximately 68 for his `ABT 1832` on `curieWithEvents()`, no age for a lifeline begun at another event, and an open lifeline not counted alive past its end.
- [ ] 3.4 Hold the model in a `WeakMap` by `GenealogyIndex`; test in `src/desk/fileTimeline.test.ts` that the same index answers the same model and a new index a new one.

## 4. Drawing

- [ ] 4.1 Extend `src/testing/obsidianDom.ts` with the helpers the toolbar needs (`attr`, inputs), each implemented rather than dropped; covered by its use in 4.2–4.5.
- [ ] 4.2 Create `src/desk/fileTimelineView.ts`: layout per scope, zoom and switch; the names column and axis; lifelines, marks, spans and marriage lines with `createElementNS`, for a window passed in and one window around it; icons handed in; no `innerHTML`. Test in a new `src/desk/fileTimelineView.test.ts` (happy-dom) that a window draws only its rows, and that a window past the drawn one draws the next.
- [ ] 4.3 Hover by classes and the arrows layer; test in `src/desk/fileTimelineView.test.ts` that pointing at Marie marks her relatives `on` without replacing any drawn element, draws arrows from both her parents and to her daughters, and none from Pierre's row.
- [ ] 4.4 The year cursor with ages and the count alive, and undated facts in the bar when zoomed in or under the pointer; test in `src/desk/fileTimelineView.test.ts`.
- [ ] 4.5 The toolbar: other-events switch, zoom, search, branch with − and +, Whole file; test in `src/desk/fileTimelineView.test.ts`.
- [ ] 4.6 Styles in `styles.css` from the theme's variables; the phone layout and the touch behaviour (first touch highlights and places the cursor, second activates, a mark shows its event with Show in source); tested by `tests/fileTimeline.spec.ts` in 6.2.

## 5. The view in Obsidian

- [ ] 5.1 `FileTimelineView` in `src/desk/DeskViews.ts` with `navigation = false`, its state `{ gedcom, focus, up, down, zoom, others }`, and the host methods: the index of a path (an open tab's, else the vault's, under a revision counter bumped on `modify`, forgotten when the last timeline of the path closes); opening a person or a range in the file's tab, found with `leafShowingFile` among `GEDCOM_VIEW_TYPE` leaves, loaded with `loadIfDeferred` and brought forward with `revealLeaf`. No unit test is possible (`obsidian` is types only); covered by 7.1.
- [ ] 5.2 In `src/main.ts` register the view; implement `openFileTimeline(path, around)` matching an existing leaf on `getViewState().state.gedcom`, with the 500-person default focus; mark timelines stale on `genealogyChanged` and on the vault's `modify`, rebuilding a shown one with a new index at once and a hidden one when `active-leaf-change` or `layout-change` shows it; follow `rename`, a moved folder included through `descendantPaths`; on `delete` show that the file is gone; implement `GedcomViewHost.openFileTimeline` with the same function; detach them in `syncInterface`. Covered by 7.1.
- [ ] 5.3 Add `open-gedcom-file-timeline` to `COMMANDS`, gated on a file and `genealogyInterface()`, and `openFileTimeline` to `CommandHost`; extend the fakes and tests in `src/commands.test.ts`: offered with the interface on and a file, not with it off, not without a file, and called with the path and the person at the cursor.
- [ ] 5.4 The `calendar-range` header action in `src/GedcomView.ts`, shown and hidden with the mode switch in `showMode`; a test in `src/vault/openTabs.test.ts` that a timeline leaf's state is not taken for a tab of its file. The action itself is covered by 7.1.
- [ ] 5.5 Strings in `src/i18n/en.json` and `src/i18n/ru.json`; `src/i18n/i18n.test.ts` checks parity and sentence case.
- [ ] 5.6 A paragraph on the timeline in `README.md` among the paragraphs on the genealogy interface, and the sentence that counts them ("The next three paragraphs") updated.

## 6. Browser

- [ ] 6.1 A harness entry `harness/fileTimeline.ts` and page, added to the list in `harness/build.mjs`, mounting the drawing on `curieWithEvents()` or a given text; add the colour variables it uses (`--color-pink`, `--color-blue`, `--color-green`, `--color-orange`, `--interactive-accent`) to `harness/palette.css`.
- [ ] 6.2 A new Playwright spec `tests/fileTimeline.spec.ts`: Marie's row and its colour from the theme, the marriage line, the period span, hover and arrows, the cursor at 1906, Irène's branch (10 of 18 on `curieWithEvents()`), a phone width without sideways overflow of the page and the touch sequence, and a generated 10 000-person file holding at most a few hundred drawn rows while scrolling.

## 7. Verify

- [ ] 7.1 In Obsidian on the demo vault, and on a phone: the header action and command open the timeline and reveal it the second time, also after a restart; it follows an unsaved edit, a rename and a moved folder, and says so when the file is deleted; a background timeline brought forward shows the latest text; a person brings the file's tab forward on their page, a mark on the source; it is restored with the workspace; it closes when the interface is turned off; the icon draws.
- [ ] 7.2 `npm run check` and `npm run test:browser`; screenshot the timeline at desktop and phone width from a temporary Playwright script, then delete it.
