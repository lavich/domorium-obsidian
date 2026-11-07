Archive order: independent of the other changes; `openspec/changes/` holds no other in-flight change.

## 1. Baseline and the kind of each link

- [ ] 1.1 Run `npm run test` on the untouched branch and record the count; add `src/desk/familyLayout/baseline.test.ts` that lays out `curie.ged` and the `tangled` file with the present `layoutGraph` and asserts the numbers the spec states (11 lines, 0 crossings, 4 rows) — verify it passes before any change.
- [ ] 1.2 In `src/genealogy/build.ts` and `src/genealogy/types.ts` read `PEDI` under each `FAMC` into `Person.childLinks: { family: string; kind: LinkKind }[]`, kind normalised from 5.5.1 lower-case and 7.0 upper-case values, `unstated` where absent, `other` for any other value — extend `src/genealogy/index.test.ts` with 5.5.1, 7.0, absent and unknown values.
- [ ] 1.3 In `src/desk/fileTimeline.ts` carry the kind onto `TimelineFamily.links` (child xref → kind) and onto `GraphInputFamily.links` in `layoutFileGraph` — extend `src/desk/fileTimeline.test.ts`; verify a child with `2 PEDI adopted` reads `adopted`.

## 2. Family clusters

- [ ] 2.1 Create `src/desk/familyLayout/types.ts` (options with defaults, cluster, link, block, anomaly, placement, energy) — verify `npm run typecheck`.
- [ ] 2.2 Create `src/desk/familyLayout/fixtures.ts` building the twelve named files as GEDCOM text through one helper (couple with two children; three generations; siblings with independent families; multiple marriages; children of different partners; a large extended family; unknown parents; adoption; pedigree collapse; cousins who marry; branches converging on one ancestor; incomplete and contradictory data) — verify each parses to the expected people and families in `src/desk/familyLayout/fixtures.test.ts`.
- [ ] 2.3 Create `src/desk/familyLayout/clusters.ts` (`buildClusters`: clusters, links of kind descent/remarriage/alternate-parents, anomalies, Tarjan cycles, bounded ancestor-path counts) — `src/desk/familyLayout/clusters.test.ts`: membership of every fixture, one identity per person, no inferred relationship, anomalies reported, cycles flagged, collapse counted without explosion on a 40-generation ladder.

## 3. Root-centred analysis

- [ ] 3.1 Create `src/desk/familyLayout/rootAnalysis.ts` (`analyseRoot`: distance, role, layer, branch and convergence links, ambiguous generation links, unreached components, no-root default) — `src/desk/familyLayout/rootAnalysis.test.ts`: roles on the three-generations and siblings fixtures, collateral layer and branch point, convergence on collapse and on cousins, termination on the cyclic fixture, a different root gives a different layering of the same cards.

## 4. Micro measure and initial macro placement

- [ ] 4.1 Create `src/desk/familyLayout/micro.ts` `measureBlocks` (partner chains, husband-left, multi-spouse person between two, widths from real card sizes) — `src/desk/familyLayout/micro.test.ts`: order and widths for couple, multiple marriages, same-sex pair, three partners, unequal card widths.
- [ ] 4.2 Create `src/desk/familyLayout/macro.ts` `initialPlacement` (generation line, cluster-hierarchy order, eldest-left tie rule, deterministic keys) — `src/desk/familyLayout/macro.test.ts`: no overlap, generation order on known links, same output on shuffled input.

## 5. Energy and optimisation

- [ ] 5.1 Create `src/desk/familyLayout/energy.ts` (the six terms, `countCrossings` imported from the shared place it moves to) — `src/desk/familyLayout/energy.test.ts`: each term is zero where it should be, positive where a layout is made to violate it, and monotone in a violation.
- [ ] 5.2 Implement `optimise` in `macro.ts` (transposition by energy, bounded position step, overlap sweep, iteration count and clock budget, best state kept, `previous`, `pinned`, `generationSlack`) — extend `macro.test.ts`: final energy ≤ initial, crossings ≤ initial on the extended-family fixture, a pinned card does not move, a positive slack is used only when a row cannot fit, raising the distance weight does not break generation order or cause overlap.

## 6. Collision repair, routing, direction

- [ ] 6.1 Implement `resolveCollisions` and child centring in `micro.ts` — extend `micro.test.ts`: twelve children beside one child, no overlap, other blocks moved no more than needed.
- [ ] 6.2 Create `src/desk/familyLayout/routing.ts` (family nodes `pair`/`below`/`across`, shared trunk and bus, lanes through intermediate rows, staggered bends, parallel lines for a double relationship, relationship kind on each line) — `src/desk/familyLayout/routing.test.ts`: a line turns only between rows, passes through no foreign card, siblings share a trunk, adopted and birth lines both present, a lane stands where no card stands.
- [ ] 6.3 Create `src/desk/familyLayout/engine.ts` (`runLayout`: stages in order, direction mapping TB/BT/LR/RL, result assembly) — `src/desk/familyLayout/engine.test.ts`: all twelve fixtures give every person once, no overlap, parents above children, deterministic twice, the four directions hold the same order and no overlap.

## 7. Switch the graph to the engine

- [ ] 7.1 Add a differential test to `src/desk/familyLayout/baseline.test.ts` comparing engine against old `layoutGraph` on `curie.ged` and `tangled`: same rows, no overlap, engine crossings ≤ old crossings + the slack the test names; investigate and fix any worse result before continuing.
- [ ] 7.2 Make `layoutGraph` call `runLayout`; delete `reduceCrossings`, `pullTogether`, `squeeze`, `makeUnits`, `routeLines`, `bendApart`, the `Unit`/`Link` types and constants they alone use from `src/desk/fileGraph.ts`; keep `CARD`, `ROW_GAP`, `LANE`, `SWEEPS`, `marriageDigits`, `countCrossings`, `fileGraphOf`; replace `sweeps` with `iterations`; adapt `src/desk/fileGraph.test.ts` and `src/desk/fileGraphView.test.ts` only where they assert on an internal removed — verify every named scenario still passes.
- [ ] 7.3 Add `src/desk/fileGraph.test.ts` cases for the new scenarios of the modified requirements (children share a trunk; a person who is child and spouse of one family) — verify they fail without the change and pass with it.

## 8. Performance

- [ ] 8.1 Add `src/desk/familyLayout/performance.test.ts` laying out generated files of 1 000, 5 000 and 10 000 people (the `tangled` generator) and a 40-generation ladder with collapse, asserting each finishes within the stated budget with an injected clock and with the real one, and that the 10 000-person result has no overlap — verify on the real clock with generous slack for CI.
- [ ] 8.2 Run the browser harness: `npm run build`, then a temporary Playwright script at desktop and phone width on `curie.ged` and on the 10 000-person file comparing before and after screenshots; delete the script — name what still needs a look in Obsidian on the demo vault and on a phone.

## 9. Docs and gate

- [ ] 9.1 Update `README.md` where it describes the graph; add a `design.md` "Implementation" heading with every deviation from this design.
- [ ] 9.2 Run `npm run check && npm run test:browser` and record both outputs.
