## 1. Remove the captions of the timeline

- [x] 1.1 In `src/desk/fileTimelineView.ts`, `src/desk/fileTimeline.ts`, `styles.css`, `src/i18n/en.json` and `src/i18n/ru.json`, remove the two lines under the board, the subtitle, and the captions of undated facts inside a lifeline, with the `undated` fields of the model and the strings and styles only they used. Test in `src/desk/fileTimelineView.test.ts`: the tests that asserted the lines, the subtitle and the captions are gone, a person with no dated event (Kazimierz Żorawski on `curieWithEvents()`) still has a row and no lifeline, and the rest passes unchanged; in `src/desk/fileTimeline.test.ts` the same person has a row and a null lifeline; `src/i18n/i18n.test.ts` passes.
- [x] 1.2 Replace the browser assertions of the removed subtitle in `tests/fileTimeline.spec.ts` ("a large file", "the timeline of a file of 10 000 people") so that the specs still check what they are about: the branch scope and its way back, and the rows drawn.

- [x] 1.3 On a phone give the board the freed height: hide the empty header, keep the toolbar compact. Test in `tests/fileTimeline.spec.ts`: at 390 px the board reaches the bottom of the view, nothing stands below it and the page does not scroll.

- [x] 1.4 Make the plot the only scroller, with the names and the axis outside it and following it (`design.md`), in `src/desk/fileTimelineView.ts` and `styles.css`. Test in `tests/fileTimeline.spec.ts`, at 1400 and 390 px with classic scrollbars: the names, the axis and the corner end where the plot begins, the names column stops above the horizontal bar, and after scrolling the names and the axis stand at the plot's offsets.

## 2. The zoom buttons

- [x] 2.1 Move the −, + and Fit group of `src/desk/graphCanvas.ts` to `zoomControls` in `src/desk/dom.ts`, with its three strings as `overview.*` keys; the graph passes `src/desk/fileGraphView.test.ts` unchanged, `src/i18n/i18n.test.ts` checks parity.
- [x] 2.2 In `src/desk/fileTimelineView.ts` remove the slider and its label, put the group over a stage around the board, step the zoom by 1.2 within 2–16 and let Fit fit the span of years to the board; style it with the graph's rules in `styles.css`. Test in `src/desk/fileTimelineView.test.ts`: no slider, zoom in then out reaches the range's ends and `scopeChanged` carries the zoom, Fit makes the chart as wide as the board; in `tests/fileTimeline.spec.ts` the group is inside the board's box and does not move while the rows scroll, and the buttons widen and narrow the axis.

## 3. The title and the search

- [x] 3.1 Remove the title and summary block of the graph and the title block of the timeline, with their styles, and the graph's toolbar; `show` no longer takes the file's name. Test in `src/desk/fileGraphView.test.ts`: no head, title, summary or toolbar in the graph.
- [x] 3.2 Create `src/desk/floatingSearch.ts`: a search icon that opens into a field, a cross that clears it or closes an empty field, Escape, closing on leaving an empty field, Enter and Shift+Enter; use it in the graph (`stepMatch` in `src/desk/graphCanvas.ts`, which also keeps the pointer away from it) and in the timeline; style it with the zoom group's rules in `styles.css`, 44 px on a phone, no animation under reduced motion. Test in `src/desk/fileGraphView.test.ts` (open, clear and stay open, Escape twice, a query kept open, Shift+Enter) and `src/desk/fileTimelineView.test.ts`; in `tests/fileGraph.spec.ts` and `tests/fileTimeline.spec.ts` at 1400 and 390 px the box floats inside the canvas or board away from the zoom group and the graph has no band above its canvas.

- [x] 3.3 Replace the icon with the field while the box is open, fading and growing, and add the counter and the previous and next arrows to `src/desk/floatingSearch.ts`, with the current match marked and centred in `src/desk/graphCanvas.ts` and `src/desk/fileTimelineView.ts`, the strings in `src/i18n/en.json` and `src/i18n/ru.json`. Test in `src/desk/fileGraphView.test.ts` and `src/desk/fileTimelineView.test.ts` (the counter, both arrows, wrapping, no results, the ring on one card or row) and in `tests/fileGraph.spec.ts` and `tests/fileTimeline.spec.ts` at 1400 and 390 px (the icon hidden while open, the box inside the canvas, arrows 44 px on a phone, the focus kept in the field).

## 4. Verify

- [x] 4.1 `npm run check`, `npm run test:browser` and `npm run openspec:validate` pass.
