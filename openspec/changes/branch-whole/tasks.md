Independent of the other open changes: those that touched these requirements are archived.

## 1. The read model

- [x] 1.1 `branch(focus)` in `src/desk/fileTimeline.ts` walks all ancestors and all descendants with a visited set, adds spouses; `related` is removed and its callers ask `branch`. `BRANCH_STEPS` goes. The branch of a person is memoised for the last `(model, xref)` so a redraw, a year cursor move or a focus step does not walk it again. Tests in `src/desk/fileTimeline.test.ts`: a generated chain of 12 generations in both directions is whole (past the old maximum of 9), Marie's branch is 10 of 17, a person who is their own ancestor finishes, an unknown person gives an empty set.

## 2. The scope and the saved state

- [x] 2.1 `BranchScope` is `{focus?}` in `src/desk/branchScope.ts`; `readBranchScope` ignores `up` and `down`; `sameBranch`, the layout cache key in `src/desk/fileGraph.ts`, `src/desk/timelineLayout.ts`, `src/desk/deskState.ts`, `src/desk/fileViews.ts` and both views follow; the persisted state of a restored tab carries no `up` or `down`. Tests in `src/desk/fileGraph.test.ts` (the cache key by focus alone), `src/desk/deskState.test.ts`, `src/desk/fileViews.test.ts`, `src/desk/fileGraphView.test.ts`, `src/desk/fileTimelineView.test.ts`, `tests/fileViews.spec.ts` and `harness/fileGraph.ts`: a saved `up`/`down` is dropped and the focus kept.
- [x] 2.2 The steppers leave `BranchScopeBar` (with `clampTo` and the focus restore of a step), the six `overview.*Ancestors`/`*Descendants` keys leave `src/i18n/en.json` and `src/i18n/ru.json`, the stepper rules leave `styles.css`; the line about the scope keeps its text, the pressed Branch and the Whole file button. Tests in `src/desk/fileGraphView.test.ts` and `src/desk/fileTimelineView.test.ts` that pressed a stepper are replaced by one that finds none.

## 3. The light

- [x] 3.1 Graph: `graphCanvas.highlight` lights every card of the branch, a line whose child and at least one parent are in the branch, and a family node with a spouse in the branch and another of its `people` in it; only the pointed card and its own lines carry `is-hl` (`src/desk/graphCanvas.ts`, `src/desk/sceneItems.ts`, `src/desk/fileGraphView.ts`). `CanvasScene.related` becomes `branch(xref)`. Tests in `src/desk/fileGraphView.test.ts` (the stub at its line 1090 follows) and `tests/fileGraph.spec.ts` (six lit cards for Marie become ten): Marie lights ten cards and not the lines to her sisters and brothers, Hélène lights her ancestors and fades Ève and her line.
- [x] 3.2 Timeline: rows, lifelines and age pills of the branch light; `drawArrows` draws, once for the branch and not per person, parent → child and marriage links within it, only where an end is in the drawn window, and redraws them as the window moves (`src/desk/fileTimelineView.ts`). Tests in `src/desk/fileTimelineView.test.ts`, with a 10 000-person file clicked at its root.

## 4. The rest

- [x] 4.1 `tests/fileGraph.spec.ts`, `tests/fileViews.spec.ts` and `harness/fileGraph.ts` follow the scope without numbers; a screenshot of the harness at desktop and phone width.
- [x] 4.2 `README.md` (line 166, "lights their parents, spouses and children") says what the light shows now.
- [x] 4.3 `npm run check` and `npm run test:browser`.
