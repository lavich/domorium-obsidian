## Context

See proposal.md for why. What exists, observed in the code on `main`:

- `layoutGraph(input, clock)` (`src/desk/fileGraph.ts:955`) takes
  `GraphInput { cards, families, focus }` and returns `FileGraphLayout { cards,
  card, nodes, node, lines, width, height, rows, bands, crossings,
  crossingsAtStart, sweeps, focus }`. It runs `indexCards → mapMarriages →
  makeUnits → linkFamilies → stackLayers → reduceCrossings → pullTogether →
  squeeze → stackBands → placeCards → joinSpouses → routeLines → bendApart`.
  `layoutFileGraph` (`:463`) maps a `FileTimeline` and a `BranchScope` onto
  `GraphInput`; `fileGraphOf` (`:998`) caches the last four layouts per model.
- The renderer reads `cards`, `card`, `nodes` (`spouses` as a pair, `joins`,
  `kind`, `year`, `family`), `lines` (`family`, `child`, `parents`, `points`),
  `width`, `height`, `focus` (`sceneItems.ts:27-79`, `cardRender.ts:153-167`,
  `graphCanvas.ts:91,235,364,493,559`, `fileGraphView.ts:184-188`). `bands`,
  `rows`, `lanes`, `crossings*`, `sweeps` are read by tests only. So an engine
  that returns the same `FileGraphLayout` — nodes still keyed by a pair of
  spouses, joins still arbitrary polylines — leaves the renderer untouched.
- Today a family's node is made for its first two spouses only
  (`fileGraph.ts:535-542`, `fileTimeline.ts:460`); a third partner gets no join
  and a row from the input only.
- The generation of a person is `FileTimeline.generations`, computed from
  relationships (`generationsOf`, `fileTimeline.ts:189-265`), not from dates;
  the focus of a branch is `BranchScope.focus`; `model.branch(focus)`
  is the set of a whole branch (since #246 there is no generation limit).
- `FileTimeline` has no kind of parent–child link. `src/genealogy/build.ts:290-299`
  (`familiesOf`; `:221` iterates the same FAMC link symbols) walks `FAMC` link nodes of a person's record (`childrenOf(record,
  tag)`), so the `PEDI` substructure of each `FAMC` is reachable there without
  any parser change (GEDCOM 5.5.1: `birth|adopted|foster|sealing`; 7.0:
  `BIRTH|ADOPTED|FOSTER|OTHER`, written upper-case).
- Existing tests: `fileGraph.test.ts` (34 cases, a `file(people, families)` helper
  that writes GEDCOM text), `fileGraphView.test.ts`, `tests/generated.ts`
  (`tangled`, a generated large tangled file), Playwright specs on the harness.
- The user decided (proposal.md): replace `layoutGraph` entirely; root = branch
  focus; direction in the API only.

## Goals / Non-Goals

**Goals:**
- Stage-per-module, pure, deterministic, DOM-free layout; each stage's input and
  output a plain exported type, tested alone.
- The result type of today, extended, so the renderer is unchanged.
- Every `genealogy-file-graph` scenario that this change does not restate keeps
  passing on `curie.ged` and on the generated tangled file.

**Non-Goals:**
- A general-purpose graph library; a physical simulation with velocities.
- Drawing differences for adoption or foster lines.

## Decisions

### D1. Vocabulary: cluster, block, link, layer

- **Cluster** — one per `FAM` record the graph shows: `partners` (0, 1, 2 or
  more; not assumed to be two), `children` (each with its link kind), the `FAM`
  xref as provenance. Clusters are visualisation structures; a person's identity
  is the xref, and a person is in as many clusters as they have FAMC and FAMS
  links. A person is **one card**, never copied.
- **Block** — what the macro stage moves: a maximal chain of clusters that share
  a partner within one generation (a couple, a person with several spouses), or a
  single person with no partner in their generation. A block is rigid inside
  (micro layout fixed before macro) and its box is the real card widths plus
  spouse gaps. Children without a partner of their own are one-person blocks; the
  siblings of one cluster are tied together by the cluster term, so they
  "remain visually grouped with their parent family".
- **Link** — between clusters: `descent` (a person is a child in A and a partner
  in B), `remarriage` (a person is a partner in A and B), `alternate-parents` (a
  child in two clusters: birth and adoptive, or contradictory data), and, found
  by root analysis, `convergence` (two paths from the root reach one person or
  cluster) and `branch` (a collateral cluster attached to the lineage at a
  person). A link keeps the xrefs and the relationship kind of both ends.
- **Reference** — a link, found after placement, that the layout can only draw
  as a long line: a descent or alternate-parents line that crosses more than one
  generation, or that reaches a person already placed through a second cluster.
  It names the person and the two clusters; there is still one card.
- **Layer** — `0` for the root's lineage (ancestors, descendants, their
  spouses), `n` for a collateral branch `n` clusters away from it. The layer is
  carried in the result and tints nothing today; layout never forces a layer
  into its own region.

### D2. Stages and types

```
fileGraph.ts        public entry: layoutGraph / layoutFileGraph / fileGraphOf (cache stays)
familyLayout/
  types.ts          LayoutOptions, FamilyCluster, ClusterLink, ClusterGraph, Block, Placement
  clusters.ts       buildClusters(input) → ClusterGraph
  rootAnalysis.ts   analyseRoot(graph, root) → RootAnalysis (distance, role, layer, links)
  micro.ts          arrangeBlocks(graph) → Block[] with offsets; later resolveCollisions
  macro.ts          initialPlacement(...) and optimise(...)
  energy.ts         the six energy terms, pure, weights in LayoutOptions
  routing.ts        routeEdges(placement) → lines, nodes
  engine.ts         runs the stages, applies direction, previous and pinned
  fixtures.ts       (test-only) twelve named files built as GEDCOM text
```

Each stage takes the previous stage's output and options, returns new data and
mutates nothing it received. `engine.ts` is the only place that knows the order.

**Micro before macro.** The brief puts micro layout after macro, but a block's
width must be known to place it without overlap. So `micro.measure` runs first
(widths, spouse order), macro places blocks, and `micro.resolve` runs last to fix
what macro cannot see (children centred under their family node, collisions).
The spirit holds: macro never decides inside a block, micro never moves a block
beyond collision repair.

### D3. Cluster construction (`clusters.ts`)

Input is the existing `GraphInput`, extended with `GraphInputFamily.links?:
Record<childId, LinkKind>` where `LinkKind = "birth" | "adopted" | "foster" |
"sealing" | "other" | "unstated"`. For each family: partners are `spouses`
present in the shown set; children are those present. Families with zero shown
partners and at least one shown child still form a cluster (unknown parents).
A person appearing in `spouses` twice, or as a child and as a partner of the same
family, is kept as the file writes it and reported in `ClusterGraph.anomalies`
(`self-parent`, `duplicate-member`, `unknown-member`), never dropped silently.
Anomalies are returned to the caller; nothing is written to the file.

Every walk here (Tarjan, root analysis, path counting) is iterative: the chain
of 5 000 people the present tests already lay out (`fileGraph.test.ts:424`) must
not overflow the stack.

A child listed under a `FAM` with `CHIL` but with no matching `FAMC` has kind
`unstated`.

Cycles and repeated ancestors: directed person graph `parent → child` over
`descent` edges; Tarjan strongly connected components finds cycles (a person who
is their own ancestor) and marks the clusters inside as `cyclic`. Pedigree
collapse (a person reachable by ≥2 distinct parent paths) is counted per person
(`ancestorPaths`) with a path cap so the count cannot explode (D8); the person is
still one card.

### D4. Root analysis and generations (`rootAnalysis.ts`)

Traversal rules are explicit and direction-aware, so a cyclic graph terminates:

1. From the root's child-clusters go **up** through each parent cluster
   (`role: ancestor`), then continue up through the partners' own child-clusters.
2. From the root's partner-clusters go **down** through each child
   (`role: descendant`), then through the children's partner-clusters.
3. Every other cluster is reached from a visited person by the cheapest link and
   is `collateral`; its **branch point** is that person and cluster; `layer =
   1 + layer of the cluster it hangs from`, capped.
4. A cluster reached twice by different roles or different layers gets a
   `convergence` link on the second arrival; the first arrival keeps the cluster.
   Visited sets are per (cluster, direction) and the walk is iterative.
5. Distance is the number of cluster hops from the root.

The root matters for structure only where the file has more than the root's
branch: `model.branch` already trims a focused graph to ancestors, descendants
and spouses, and rows are `model.generations`, so in a focused graph the root
changes layers and the order of traversal, not who stands in which row. In the
whole file the root is the focus or, without one, the first card: collateral
layers exist only there. A choice of root for the whole file beyond that is not
part of this change.

Generation is the input `row` (relationship-derived `model.generations`); it is
never recomputed from dates. Where a person's parents, spouse and children give
rows that disagree (a child at or above the row of a parent, found when checking
every descent link), the link is marked `ambiguous` in the result, the person
keeps the input row, and the generation term is not charged for that link —
"preserve the uncertainty rather than inventing an ordering". With no root (the
whole file), the root is the first card of the input in its order, and the
analysis still covers every component: unreached components are analysed from
their own first card and sit in layer 0 after the main component.

### D5. Macro layout (`macro.ts`, `energy.ts`)

Coordinates are abstract: `u` along the generation axis, `v` across it, one
card-size scale; direction (D7) maps `(u,v)` to `(x,y)` last.

**Initial placement.** `u` of a block = the edge of its generation's band (`bands` carry the real
heights, cards are of unequal height only in tests) (+ slack, D6). `v`: blocks of each generation are ordered by a deterministic traversal of
the cluster hierarchy from the root — each cluster's children in the file's
order (eldest left where years allow, as the present spec says) and a block
placed at the mean `v` of its partner clusters' parents and children, then
compacted left to right with the spacing options. Siblings are ordered by year of birth where known, then by xref; the order of
`CHIL` lines in the file is not used, so shuffling them changes nothing beyond
floating-point noise (checked to the pixel on every fixture); the order of a
person's families is data and is kept. Other
ties break by xref. No `Math.random`, no object-key order dependence.

**Optimisation.** The budget is counted in **work units** (one unit per link
visited when a transposition or a position step is evaluated), derived from the
number of blocks and `optimizationIterations`, so the result is identical on
every machine. The millisecond budget (`SWEEPS.pulls`, from the injected clock)
is only a safety net that stops the loop early on a slow machine and keeps the
best state seen; the result of a run the safety net did not stop is the
deterministic one. Determinism is therefore specified for runs that finish
within their work budget, and the performance test asserts that at 10 000
people the work budget finishes inside the time budget on the CI machine. Each iteration is a sweep, not a continuous simulation:

- *Order* (affects `E_crossings`): per generation, an adjacent-block transposition
  is kept when the energy falls. The delta is computed **incrementally** from the
  links of the two blocks only (`energy.ts` exposes `swapDelta` and
  `moveDelta`, and a test proves each equals the difference of full recomputations);
  a full recomputation per swap would be O(n) and miss the budget.
- *Position* (affects the rest): `v` of each block moves toward the weighted mean
  of its neighbours' anchors (clamped step), then overlap is resolved by a
  left-to-right sweep per row that pushes blocks apart to `nodeSpacing` and
  `familySpacing`, never reordering.

Energy, minimised, all weights in `LayoutOptions.weights`:

| Term | Meaning | Computed as |
| --- | --- | --- |
| `E_distance` | related clusters far apart | Σ over links of the squared cross-axis offset between anchors, with a dead zone of one family width |
| `E_crossings` | crossing lines | count of crossing segment pairs between adjacent generations (existing `countCrossings`, kept) |
| `E_overlap` | overlap | Σ squared penetration of block boxes within a row (made zero by the row sweep and never traded away), plus a soft term for hulls of clusters that share no person, found with a spatial grid |
| `E_generation` | generation order broken | Σ over non-ambiguous descent links of the squared amount a child's `u` fails to exceed its parent's by the pitch |
| `E_cluster` | a family's members separated | Σ over families and rows of the blocks of other families (and lanes) standing between the first and the last of its children |
| `E_displacement` | movement from start | Σ squared distance to the initial placement, or to `previous` where given |

Default weights make crossings dominate, then cluster, generation, distance,
displacement; card overlap in a row is a hard constraint enforced by the sweep,
not a weight. `E_distance` does reward shortness, bounded by its dead zone; that a
compact graph does not beat a readable one holds because the order of
generations and non-overlap are constraints, so the scenario that raises the
distance weight stays correct at any weight. With `generationSlack = 0`,
`E_generation` is constant for the graph (vestigial) and acts only in tests
and callers that grant slack; this is deliberate, see D6.

### D6. Generation flexibility

`LayoutOptions.generationSlack` (default `0`) lets a block's `u` move by at most
that many pitches from its generation line, spent only where the overlap sweep
of a row cannot place blocks within the available width without leaving a gap
wider than `MOST_GAP`. The graph passes `0`, so the reader sees the flat rows the
spec promises; the engine and its tests exercise a positive slack. Raising it is
a reader-visible change and is the user's decision, not made here.

### D7. Direction

`direction: "TB" | "BT" | "LR" | "RL"`. The engine lays out as `TB` in `(u, v)`
and maps at the end: `BT` flips `u`; `LR` swaps axes; `RL` swaps and flips.
Card boxes swap `width` and `height` along with the axes so the geometry stays
consistent for a consumer that draws them. The graph calls it with `TB` and no
control exists to change that.

### D8. Determinism, stability, pinning, previous coordinates

- No randomness; sorts are stable on explicit keys; maps are iterated in
  insertion order of sorted inputs. A unit test runs the engine twice and with
  the input arrays in a different order of equal keys, and compares output.
- `LayoutOptions.previous?: ReadonlyMap<id, {x,y}>` seeds `E_displacement` and
  the initial `v`; ids no longer present are ignored, new ids are placed by the
  initial rule. `LayoutOptions.pinned?: ReadonlySet<id>` holds those blocks at
  their `previous` (or initial) position through every sweep; where a pinned block
  overlaps a neighbour, the neighbour moves. The graph passes
  neither: it lays out once per reading of the file and scope (spec), and layout
  never depends on UI state.
- Caps for pedigree collapse: path counting and the optimisation limit work per
  generation to the number of blocks; the time budget bounds the rest. A tangled
  file always finishes with the best state found so far.

### D9. Routing (`routing.ts`)

Replaces `routeLines` and `bendApart`. For each cluster with a family node, one
**trunk** leaves the node down to a bus level in the gap below the row; each
child's line drops from the bus to the child's card top, so siblings share the
trunk. A cluster with one shown partner has no node and the trunk leaves that
card. A line to a child more than one generation below uses a lane in each
row between, one per cluster and row, placed at a free `v` between blocks (the
present lane rule, kept so that "no card stands in the lane" holds). A cluster of three or more partners keeps `GraphNode.spouses` as its first two
shown partners (the pair the renderer expects) and adds one more entry to
`joins` for each further partner, plus `GraphNode.others` naming them; the
renderer draws every join and needs no change. Fewer than two shown partners has
no node, as today. Bus levels
and lanes of different clusters in one gap are staggered by `BEND_STEP` as today.
Several lines between the same two people (a person who is both child and spouse
of one family, or two families linking the same pair) keep separate `id`s and
`relationship` kinds and are offset, not merged. `points` are a polyline of vertical and horizontal stretches only, drawn with
square corners (the reader's decision, after the first build: the old S-curves
crossed where they met a corner); a stretch that changes x between rows becomes a
drop, a run across at the family's bus height, and a drop. Routing reads
placement and never writes it.

### D10. Result

`FileGraphLayout` keeps every field and adds `clusters`, `links`, `layerOf`,
`anomalies`, `energy` (the six terms at the start and at the end, for tests),
and each `GraphLine` gains `id` (unique; `family|child|relationship`, the key
`sceneItems.ts:73` needs where two lines share a family) and `relationship`, and
`GraphNode` gains `others`. `crossingsAtStart` and `crossings`
stay (the initial placement versus the final). `sweeps` is replaced by
`iterations`. `LayoutNode`/`LayoutEdge` of the brief map to `GraphCard` and
`GraphLine`/`GraphNode`; no parallel model is introduced.

### Alternatives considered

- *Keep `layoutGraph` and add clusters as a side output* — rejected by the user.
- *A true force simulation (velocities, springs on every card)* — spends the
  time budget on settling instead of on order, loses the guarantee of a flat row,
  and is far less deterministic across platforms; the sweep-style constrained
  minimisation above reaches the same energy terms with a hard budget.
- *dagre or ELK* — a dependency, a bundle-size cost on mobile, and no notion of
  couples or of a person in two clusters.

## Risks / Trade-offs

- [The largest rewrite in the graph's history; every unspecified wrinkle of the
  old layout is an implicit requirement] → the Curie file, the 34 existing
  cases and `tangled` are the acceptance bar, run before any old code is deleted.
- [Time budget on 10 000 people: more stages, more passes] → each stage is linear
  or `n log n` except the transposition sweep, which keeps the old budget
  (`pulls`); a performance test at 1 000, 5 000, 10 000 people asserts completion
  within budget on the generated file.
- [Orthogonal bus routing changes how lines look] → points stay between-row
  polylines; browser screenshot at desktop and phone width
  compared before and after.
- [`PEDI` absent or contradictory] → `unstated` is a valid kind; a child listed
  under a `FAM` with a `FAMC` of another family is an `alternate-parents` link, not
  an error.
- [Soft generation slack could surprise] → default zero for the graph (D6).

## Migration Plan

1. Land the link kind in the read model with its tests (no visible effect).
2. Land the stages behind tests while `layoutGraph` still calls the old code;
   a differential test lays out `curie.ged` and `tangled` both ways and compares
   crossings, overlaps and rows.
3. Switch `layoutGraph` to the engine, delete the old code in the same commit.
4. Rollback is `git revert` of the switch commit; the stages stay unused.

## Open Questions

- Whether the renderer should one day draw adopted and foster lines
  differently, and whether the layer should tint anything — deferred, reader's
  eyes, not this change.

## Implementation

Deviations from the design above, as built:

- **Types moved.** The input and result types and the layout constants moved to
  `familyLayout/types.ts` (re-exported from `fileGraph.ts`, which keeps
  `layoutGraph`, `layoutFileGraph`, `fileGraphOf` and a new `graphInputOf`), to
  keep the import graph acyclic. `GraphCard` gained `width`, so that the four
  directions can turn a card's box; `GraphNode` gained `others`; `GraphLine`
  gained `id` and `relationship`; `FileGraphLayout` gained `direction`,
  `clusters`, `links`, `layerOf`, `anomalies`, `energy` and `iterations`
  (replacing `sweeps`).
- **The read model.** `Person.childLinks` carries `PEDI` (one entry per declared
  child-family); `TimelineFamily.links` names the children whose link is stated.
  A child under `CHIL` with no `FAMC` simply has no entry: `unstated`.
- **Two starts, not one.** The initial placement orders the top row by the
  structure from the root and each row below by the mean of what it hangs from.
  From that start a row can sit in a local minimum (a case in the existing tests
  needs the top row reversed), so a run that still crosses lines is repeated from
  the mirrored start — the same rule with every row reversed, still canonical —
  and the better of the two is kept. This is not in the design; it replaced a
  dependence on the order of the input.
- **`E_cluster`** is the number of other families' blocks standing between a
  family's children, not a variance: a variance grows with the subtrees the
  children carry and is not "unnecessary" separation.
- **`E_displacement`** pulls the optimisation only where `previous` is given.
  Without it the initial placement is a left-packed row, not a meaningful anchor;
  the term is still reported at the start and at the end.
- **Work budget.** `cap = optimizationIterations × 6 × (blocks + links)`, charged
  per block and link visited; the clock (`SWEEPS.budget`, `SWEEPS.pulls`) is a
  safety net only. At default options the cap is not reached on the generated
  files; on a clock that never advances the layout is the same as on the real one
  (test in `performance.test.ts`).
- **Pinned** means the block the card stands in: its spouses move with it, as
  they stand beside it as one rigid row.
- **Slack** is implemented as a second line half a step off the row's line, taken
  by a block the row would push more than a card's width from where it wants to
  stand; it is zero for the graph. Lanes were not made aware of it.
- **Unequal card sizes.** `GraphInputCard` carries no size, so all cards are the
  size of `CARD` in the direction the layout is turned to; the scenario of cards
  of different widths was dropped from the spec.
- **Shuffled families.** The order of a person's families is data in the file
  (who stands left), so only the order of the children is promised to be
  irrelevant, to within a pixel; the spec says so.
- **Three or more partners.** `mapMarriages` now chains every pair of a family's
  partners, so a family of three stands in one block, and the family's node is
  kept on its first two partners with one join more for each other (`others`).
  The upstream generation pass still reads only the first two partners of a
  family; a third partner takes the generation of the row given for them.
- **Micro before macro** as designed; collision repair is `resolveCollisions`,
  used where a block is pinned.
- **Differential test.** The old layout is not kept in the tree; `baseline.test.ts`
  asserts the numbers it recorded on `main` at 28b5730 instead.
- **Child centring** is not a separate step: the pull toward the mean of a
  block's anchors centres children under their family, and `resolveCollisions`
  only repairs overlap.
- **Screenshots** were taken for `curie.ged` at 1 400 and 390 pixels; the
  10 000-person file is covered by the unit performance test and the existing
  Playwright spec, not by a screenshot.
- **The renderer is turned to one direction only.** `graphCanvas.ts`,
  `cardRender.ts` and `sceneItems.ts` draw and cull with `CARD.width` and ignore
  `GraphCard.width`; the graph asks for `TB`, where they agree, as the user
  decided (direction only in the API). Drawing a turned layout is a separate
  change.
- **Time limits in tests are smoke limits.** The spec's 250 ms and 500 ms are the
  budgets the optimisation stops on (a safety net behind the work cap), not a bound
  on the whole layout; `performance.test.ts` bounds the whole with generous limits
  and shows that, with the clock off, the result is the same.
- **Found in review and fixed:** a `Math.min(...spread)` that overflowed the stack
  on about 130 000 blocks (test: a row of 130 000 people); `bendApart` applying
  bends to a line with stale indices when it crossed several gaps; a pinned card
  taking its block's home from the first spouse rather than the pinned one; the
  mirrored start leaving `home` stale when rejected; lanes being staggerable; lines
  keyed by family in `sceneItems.ts` rather than by `line.id`.
- **Square corners.** `squareOff` replaces `bendApart`: a family's lines share a
  bus height in each gap, and families whose runs overlap in x take heights of
  their own (greedy interval levels, wrapping past the room the gap has).
  Joins to a family node are elbows, and a join between spouses in different rows
  runs across at the node's height. `curve` became `polyline` in `cardRender.ts`.
