Archive order: independent; `family-cluster-layout` is already merged (#248).
touches rendering only; its delta adds a requirement and restates none).

## 1. The motion

- [x] 1.1 Create `src/desk/graphMotion.ts` with `canAnimate(doc)` (reduced motion, `Element.animate` present), `beginMotion` (positions of drawn cards, ghosts of leaving cards, the 400-card limit) and `runMotion` (moves, fades, delayed lines and nodes) — `src/desk/graphMotion.test.ts` with a stubbed `animate`: a moved card gets `translate(from)` to `translate(to)` over 400 ms, an unmoved card none, a new card a delayed fade, a line a delayed fade, a leaving card is kept inert and removed when its fade ends.
- [x] 1.2 Call it from `GraphCanvas.show` for a scope change only (`opening` with `centre`), ending a motion in progress at the start of the next — `src/desk/fileGraphView.test.ts`: Branch animates, returning to the whole file animates, opening and an edit do not, reduced motion does not, more than 400 drawn cards do not, a leaving card cannot be focused and is gone after its fade.
- [x] 1.3 Add a Playwright spec to `tests/fileGraph.spec.ts`: on a file of 10 000 people a choice of Branch returns within a short time and no more than a bounded number of animations run; on `curie.ged` the cards of the branch end where the layout puts them and no ghost card is left after the motion.

## 2. Docs and gate

- [x] 2.1 Add a sentence to `README.md` where the graph's Branch is described, and record deviations from this design under an "Implementation" heading in `design.md`.
- [x] 2.2 Run `npm run check && npm run test:browser`, then check the motion in a screenshot sequence at desktop and phone width and delete the script.
