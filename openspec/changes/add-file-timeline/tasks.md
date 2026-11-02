## 1. The read model

- [ ] 1.1 Add `end`, `period` and `dayAndMonth` to `DateReading` in `src/genealogy/dates.ts`, read from `readDate`'s second date, modifier and first date; extend `src/genealogy/dates.test.ts` with `FROM 1891 TO 1894`, `BET 1867 AND 1870`, `7 NOV 1867` against `1867`, and a BCE second date, and check the existing date tests still pass.

## 2. The model of the timeline

- [ ] 2.1 Create `src/desk/fileTimeline.ts`: per person sex, span (birth, else earliest event; open end capped at a hundred years and the present) and dated events with kind, sign, uncertainty and period; per family spouses, children and marriage. Test in a new `src/desk/fileTimeline.test.ts` on `src/testing/curie` (Marie `1867–1934`, the 1895 marriage on both, Hélène's open end).
- [ ] 2.2 Port generations and the order of rows from the mockup; test in `src/desk/fileTimeline.test.ts` that the Curie children stand together with Pierre last, the Skłodowski with Marie first, Frédéric beside Irène, and that a person with no dated event has no lifeline and is counted.
- [ ] 2.3 Add `branch(focus, up, down)` and `alive(year)`; test in `src/desk/fileTimeline.test.ts` Irène's branch (10 of 17), ages in 1906 (Marie 39, Irène 9), and an approximate age for a birth dated `1832`.
- [ ] 2.4 Hold the model in a `WeakMap` by `GenealogyIndex`; test in `src/desk/fileTimeline.test.ts` that the same index answers the same model and a new index a new one.

## 3. Drawing

- [ ] 3.1 Create `src/desk/fileTimelineView.ts`: layout per scope, zoom and switch; the names column and axis; lifelines, marks, spans and marriage lines with `createElementNS`, only for the scroll window and one window around it; no `innerHTML`. Test in a new `src/desk/fileTimelineView.test.ts` (happy-dom) that a window draws only its rows, and that scrolling past the drawn window draws the next.
- [ ] 3.2 Hover by classes and the arrows layer; test in `src/desk/fileTimelineView.test.ts` that pointing at Marie marks her relatives `on` without replacing any drawn element, and draws arrows only for her.
- [ ] 3.3 The year cursor with ages and the count alive, and the undated facts in the bar (zoomed in, or under the pointer); test in `src/desk/fileTimelineView.test.ts`.
- [ ] 3.4 The toolbar: other-events switch, zoom, search, branch with − and +, Whole file; test in `src/desk/fileTimelineView.test.ts`.
- [ ] 3.5 Styles in `styles.css` from the theme's variables; the phone layout and touch behaviour.

## 4. The view in Obsidian

- [ ] 4.1 `FileTimelineView` in `src/desk/DeskViews.ts`, its state `{ file, focus, up, down, zoom, others }`, and the host methods: the index of a path (an open tab's, else the vault's through `IndexCache`), opening a person, showing a range in the source. No unit test is possible (`obsidian` is types only); covered by 6.2.
- [ ] 4.2 In `src/main.ts` register the view, implement `openFileTimeline` with the 500-person default focus, redraw timelines on `genealogyChanged` and on the vault's `modify`, and detach them in `syncInterface`. Covered by 6.2.
- [ ] 4.3 Add `open-gedcom-file-timeline` to `COMMANDS` gated on `genealogyInterface()`, and `openFileTimeline` to `CommandHost`; test in `src/commands.test.ts` that it is offered while the interface is on and not while it is off.
- [ ] 4.4 The `calendar-range` header action in `src/GedcomView.ts`, hidden while the interface is off. Covered by 6.2.
- [ ] 4.5 Strings in `src/i18n/en.json` and `src/i18n/ru.json`; `src/i18n/i18n.test.ts` checks parity and sentence case.
- [ ] 4.6 A paragraph on the timeline in `README.md`, in the genealogy interface section.

## 5. Browser

- [ ] 5.1 A harness page `harness/fileTimeline.ts` mounting the drawing on `curie.ged` or a given text, built by `harness/build.mjs`.
- [ ] 5.2 A new Playwright spec `tests/fileTimeline.spec.ts`: Marie's row and colours from the theme, the marriage line, hover and arrows, the cursor at 1906, Irène's branch, a phone width without sideways overflow of the page, and a generated 10 000-person file holding at most a few hundred drawn rows while scrolling.

## 6. Verify

- [ ] 6.1 `npm run check` and `npm run test:browser`; screenshot the timeline at desktop and phone width from a temporary Playwright script, then delete it.
- [ ] 6.2 In Obsidian on the demo vault, and on a phone: the header action and command open the timeline and reveal it the second time; it follows an unsaved edit; a person opens their page, a mark the source; it is restored with the workspace; it closes when the interface is turned off; the icon draws on 1.8.7.
