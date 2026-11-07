This change touches `genealogy-file-timeline` and `genealogy-file-graph`; no other open change does, and the release PR (#237) does not.

Every group ends with `npm run check` exiting 0.

## 1. Generations

- [x] 1.1 `src/desk/fileTimeline.ts`: the last pass of `generationsOf` that lowers a root to one row above the highest-standing of its children (D1). Test in `src/desk/fileTimeline.test.ts`: the man whose daughter marries down, the man with children in two generations, a root married to a root, a root with no children, and `curie.ged` unchanged.
- [x] 1.2 A spike, not shipped: a temporary test that loads `demo-vault/2020.11.08.ged` and records the crossings and the rows of `@I0072@`, `@I0000@`, `@I0005@`, `@I0071@`, `@I0064@` and `@I0067@` before and after 1.1. Its numbers go under `## Implementation` in `design.md`; the file is not committed.
- [x] 1.3 The graph's rows follow: `src/desk/fileGraph.ts` reads `layerOf` as before. Test in `src/desk/fileGraph.test.ts`: Mikhail's row equals Pyotr's on a small document of the same shape; `curie.ged` has eleven lines and no crossing.
- [x] 1.4 The timeline's order follows: Test in `src/desk/fileTimelineView.test.ts`: the same small document orders Mikhail's row among the generation of Pyotr, and `curie.ged`'s rows are as before.

## 2. The order in a row

- [x] 2.1 `src/desk/fileGraph.ts`: the tie-break for the elder at the left in `transpose` (D3). Test in `src/desk/fileGraph.test.ts`: two brothers with no crossing either way stand eldest first; where the other order crosses fewer lines, it stays.
- [x] 2.2 Dropped: the sibling block move was prototyped in `src/desk/fileGraph.ts` and measured; see `design.md`, `## Implementation`. No code of it remains.
- [x] 2.3 Measured on `demo-vault/2020.11.08.ged`, the Gramps export and `curie.ged`: roots lowered and eldest first take 18 to 17, 4 261 to 3 923 and 0 to 0 crossings; the sibling move 17 and 4 108. The numbers are under `## Implementation` in `design.md`.

## 3. Documents

- [x] 3.1 `README.md`: read the sentence on generations in the graph and the timeline, and change it only if it states the first-row rule. Test: none.

## 4. Verify

- [x] 4.1 `npm run check`, `npm run test:browser` and `npm run openspec:validate` pass.
- [ ] 4.2 By hand in Obsidian on `demo-vault/2020.11.08.ged`, desktop and phone (leave unticked until someone has done it): Mikhail beside Pyotr, no line from Mikhail across Pyotr's, the brothers eldest first, the rest of the graph not worse to the eye.
