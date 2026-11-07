## Why

The graph of a file is laid out by one 1 000-line function, `layoutGraph` in
`src/desk/fileGraph.ts`, that does everything in one pass: it fuses couples into
units, stacks rigid rows, sweeps the order of cards to cross fewer lines, pulls
cards toward their parents and children, and routes lines. None of its stages
can be tested alone, there is no notion of a family as a cluster of people
(adoption, a second marriage, a childless union and a person with unknown
parents are all handled inside the unit code), the root is only a hint, and a
file in which the same ancestor is reached by two paths is laid out by
accident rather than by rule.

The user asked for a **family-oriented** layout: group people into family
clusters first, build the hierarchy of clusters around a chosen root, place the
clusters, then place the people inside them, then route the lines — as separate,
deterministic, independently tested stages.

## User requirement (verbatim, 2026-11-07)

- The task: "Design and implement a new genealogy graph layout algorithm for
  Domorium … move away from traditional tree-based layouts … towards a
  family-oriented, hierarchical, spatial graph layout … a deterministic, reusable
  layout engine independent of the rendering framework." Stages, in order: family
  clustering → root-centred analysis → branch detection → macro layout (constrained
  force-directed, energy `αE_distance + βE_crossings + γE_overlap + δE_generation +
  εE_cluster + ζE_displacement`, configurable weights) → micro layout → collision
  resolution → edge routing → `LayoutResult`. Directions TB/BT/LR/RL; pinned
  nodes and previous coordinates as soft constraints; twelve named fixtures and
  performance tests; no `any`; the renderer is not rewritten.
- Decision on approach: **"Заменить layoutGraph целиком"** — the new engine
  becomes the only layout of the graph of a file.
- Follow-up, after seeing the graph in the demo vault: lines drawn as curves
  crossed one another where a curve met a square corner — "Давай сделаем все
  угловатыми" (2026-11-07) — so every line and join is drawn with square corners.
- Decision on root and direction: **"Корень = focus ветки; направление — только
  в API"** — the root is the person whose branch is shown (the existing focus); the
  four directions are supported by the engine and its tests but no setting,
  command or control for them is added.

## Proposed scope

- A new pure module `src/desk/familyLayout/` with one file per stage, each
  exported and tested alone: cluster construction, root-centred analysis and
  branch detection, macro layout (initial placement and constrained
  optimisation), micro layout with collision resolution, edge routing, and an
  orchestrator that returns the `FileGraphLayout` the renderer already consumes.
- `layoutGraph`, `layoutFileGraph` and `fileGraphOf` keep their names, inputs and
  result type, and call the new orchestrator. The old unit/sweep/pull code is
  deleted, not kept beside it.
- The read model carries the kind of each parent–child link (`PEDI` under
  `FAMC`: birth, adopted, foster, sealing, or unstated) so that adoption and
  foster links are clustered and routed as what they are and are never
  inferred.
- The result additionally carries the clusters, the links between them
  (branch point, convergence point, reference), the logical layer of each card,
  and, per line, the relationship kind — data the renderer may ignore today.
- The acceptance bar is the present behaviour: every scenario of
  `genealogy-file-graph` that is not restated by this change still holds on
  `curie.ged`, and the Curie graph still has eleven lines and no crossing.

## Where it belongs

**This repository.** The layout works on `FileTimeline`, the plugin's own read
model (`src/desk/fileTimeline.ts`, `src/genealogy/`), not on the parser or the
language service. No upstream change in `lavich/domorium` is needed; reading
`PEDI` uses the record tree the published `@domorium/*` packages already hand
over (probed in design.md).

## Capabilities

### New Capabilities
- `family-cluster-layout`: the engine's contract — what a family cluster is, how
  the root shapes the structure, what generation means, determinism, stability
  and pinning, directions, handling of cycles and repeated ancestors, and what
  the result carries.

### Modified Capabilities
- `genealogy-file-graph`: the requirements "Generations run from top to bottom,
  and couples stand together" and "Lines run from a family to each child,
  crossing as little as possible" are restated for the new engine (generation
  rows become bands a card may leave only by a configured slack that is zero for
  the graph; the order of cards is chosen by the cluster layout), and "The graph
  holds up at size" names the time budget of the new stages.

## Impact

- Code: `src/desk/fileGraph.ts` (reduced to the public entry points and shared
  constants), new `src/desk/familyLayout/*`, `src/desk/fileTimeline.ts` and
  `src/genealogy/*` for the link kind. `graphCanvas.ts` and `fileGraphView.ts`
  are not changed.
- Tests: `src/desk/fileGraph.test.ts` and `fileGraphView.test.ts` keep their
  scenarios; assertions on internals the old code exposed (`sweeps`) are
  replaced. New `*.test.ts` beside each stage; fixtures and performance tests.
- Dependencies: none added; no Node built-ins; the clock is injected as today.
- Reader-visible: the graph of a file may place cards differently where the new
  layout finds a better order, and must not otherwise change. No new string,
  setting or command.

## Non-goals

- No UI for direction, layout weights, pinning or the logical layers; no
  dashed or otherwise distinct drawing of adopted and foster lines (the data is
  carried; drawing it is a separate decision for the reader's eyes).
- No change to what the graph shows (cards, nodes, search, scope, phone
  behaviour), to the parser, or to the genealogy-read-model beyond the link kind.
- No third dimension or alternative projection; the result's layer field only
  keeps that door open.
- No inference of relationships absent from the file; ambiguity is kept and
  reported, not resolved.
- No new dependency (no dagre, ELK or d3-force).
