Independent of the other open changes; archive order does not matter.

## 1. The read model

- [ ] 1.1 `branch(focus)` in `src/desk/fileTimeline.ts` walks all ancestors and all descendants with a visited set, adds spouses; `related` is removed and its callers ask `branch`. `BRANCH_STEPS` goes. Tests in `src/desk/fileTimeline.test.ts`: Marie's branch is 10 of 17, Irène's 10, a looping file finishes, an unknown person gives an empty set.

## 2. The scope and the saved state

- [ ] 2.1 `BranchScope` is `{focus?}` in `src/desk/branchScope.ts`; `readBranchScope` ignores `up` and `down`; `sameBranch`, the layout cache key in `src/desk/fileGraph.ts`, `src/desk/timelineLayout.ts`, `src/desk/deskState.ts`, `src/desk/fileViews.ts` and both views follow. Tests in `src/desk/deskState.test.ts`, `src/desk/fileViews.test.ts`, `src/desk/fileGraphView.test.ts`, `src/desk/fileTimelineView.test.ts`: a saved `up`/`down` is dropped and the focus kept.
- [ ] 2.2 The steppers leave `BranchScopeBar`, the six `overview.*Ancestors`/`*Descendants` keys leave `src/i18n/en.json` and `src/i18n/ru.json`, the stepper rules leave `styles.css`; the line about the scope keeps its text, the pressed Branch and the Whole file button. Tests in `src/desk/fileGraphView.test.ts` and `src/desk/fileTimelineView.test.ts` that pressed a stepper are replaced by one that finds none.

## 3. The light

- [ ] 3.1 Graph: `graphCanvas.highlight` lights every card of the branch, and a family node or line where at least two of its `people` are in the branch (`src/desk/graphCanvas.ts`, `src/desk/sceneItems.ts`, `src/desk/fileGraphView.ts`). Tests in `src/desk/fileGraphView.test.ts`: Marie lights ten cards and fades her siblings, Hélène lights her ancestors and fades Ève.
- [ ] 3.2 Timeline: rows, lifelines and age pills of the branch light; `drawArrows` draws parent → child and marriage links within the branch (`src/desk/fileTimelineView.ts`). Tests in `src/desk/fileTimelineView.test.ts`.

## 4. The rest

- [ ] 4.1 `tests/fileGraph.spec.ts`, `tests/fileViews.spec.ts` and `harness/fileGraph.ts` follow the scope without numbers; a screenshot of the harness at desktop and phone width.
- [ ] 4.2 `README.md` loses any sentence on the steppers and says what the light shows, where it describes them.
- [ ] 4.3 `npm run check` and `npm run test:browser`.
