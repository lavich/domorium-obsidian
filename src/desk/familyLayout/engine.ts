import { most } from "../fileTimeline";
import { indexCards, leftOf, mapMarriages, squeeze, type Block } from "./blocks";
import { buildClusters } from "./clusters";
import { orient } from "./direction";
import { energyOf, familiesOf, crossingsOf } from "./energy";
import { budgetOf, initialPlacement, linkFamilies, optimise, stackLayers, wantsOf } from "./macro";
import { measureBlocks, placeCards, resolveCollisions, staggerRow } from "./micro";
import { analyseRoot } from "./rootAnalysis";
import { bendApart, joinSpouses, routeLines } from "./routing";
import {
  DEFAULT_OPTIONS,
  DEFAULT_WEIGHTS,
  geometryOf,
  SWEEPS,
  type ClusterLink,
  type FileGraphLayout,
  type Geometry,
  type GraphBand,
  type GraphInput,
  type LayoutOptions,
} from "./types";

function stackBands(g: Geometry, layers: Block[][]): GraphBand[] {
  const bands: GraphBand[] = [];
  layers.forEach((layer, at) => {
    const top = at === 0 ? 0 : (bands[at - 1]?.bottom ?? 0) + g.rowGap;
    const extra = layer.reduce((worst, block) => Math.max(worst, block.dy), 0);
    bands.push({ top, bottom: top + g.along + extra });
  });
  return bands;
}

/** Lines that can only be drawn as a long line, or to a family a child is not primarily in: a reference to a placed person. */
function referencesOf(
  lines: FileGraphLayout["lines"],
  childOf: ReadonlyMap<string, string[]>,
  partnerIn: ReadonlyMap<string, string[]>,
): ClusterLink[] {
  const found: ClusterLink[] = [];
  for (const line of lines) {
    const alternate = (childOf.get(line.child)?.[0] ?? line.family) !== line.family;
    if (line.lanes.length === 0 && !alternate) {
      continue;
    }
    found.push({
      kind: "reference",
      person: line.child,
      from: line.family,
      to: partnerIn.get(line.child)?.[0] ?? line.family,
      fromKind: line.relationship,
    });
  }
  return found;
}

/**
 * The family layout: clusters, the structure from the root, blocks measured,
 * placed and improved, people put in their blocks, lines routed, the whole turned
 * to its direction. Every stage is a function of the one before it.
 */
export function runLayout(
  input: GraphInput,
  given: Partial<Omit<LayoutOptions, "weights">> & { weights?: Partial<LayoutOptions["weights"]> } = {},
  clock: () => number = () => performance.now(),
): FileGraphLayout {
  const options: LayoutOptions = {
    ...DEFAULT_OPTIONS,
    ...given,
    weights: { ...DEFAULT_WEIGHTS, ...given.weights },
  };
  const g = geometryOf(options);
  const graph = buildClusters(input);
  const analysis = analyseRoot(input, graph, input.focus);
  const index = indexCards(input);
  const marriages = mapMarriages(input.families, index);
  const { blocks, blockOf, place } = measureBlocks(input, index, marriages, analysis, g);
  const edges = linkFamilies(g, input.families, index, blocks, blockOf, place);
  const layers = stackLayers(blocks, index.generations.length);

  const turned = options.direction === "LR" || options.direction === "RL";
  const previous = options.previous
    ? new Map([...options.previous].map(([id, at]) => [id, turned ? at.y : at.x]))
    : undefined;
  initialPlacement(g, layers, previous);
  const pins = options.pinned;
  let pinned = false;
  if (pins && pins.size > 0) {
    for (const block of blocks) {
      block.pinned = block.members.some((id) => pins.has(id));
      pinned = pinned || block.pinned;
    }
  }

  const families = familiesOf(graph, blockOf);
  const descents = edges.flatMap((edge) => {
    const from = blockOf.get(edge.parents[0] ?? "");
    const to = blockOf.get(edge.child);
    return from && to ? [{ from, to, ambiguous: false }] : [];
  });
  const rowStart = (at: number): number => at * (g.along + g.rowGap);
  const measure = (bandStart: (at: number) => number) =>
    energyOf({ layers, families, weights: options.weights, g, descents, bandStart });
  const start = measure(rowStart);

  const budget = budgetOf(layers, options, clock);
  let optimised = optimise(g, layers, options, budget);
  if (optimised.crossings > 0 && !pinned && !budget.late(SWEEPS.budget)) {
    const first = layers.map((layer) => layer.map((block) => [block, block.cx] as const));
    const mirrored = layers.map((layer) => [...layer]);
    initialPlacement(g, mirrored, previous, true);
    mirrored.forEach((layer, at) => {
      layers[at] = layer;
    });
    const second = optimise(g, layers, options, budget);
    if (second.crossings < optimised.crossings) {
      optimised = { ...second, crossingsAtStart: optimised.crossingsAtStart };
    } else {
      first.forEach((row, at) => {
        layers[at] = row.map(([block, cx]) => {
          block.cx = cx;
          return block;
        });
      });
      optimised = { ...optimised, iterations: Math.max(optimised.iterations, second.iterations) };
    }
  }
  if (!pinned) {
    squeeze(blocks, g.most);
  }
  for (const layer of layers) {
    const wants = wantsOf(g, layer);
    if (pinned) {
      resolveCollisions(g, layer, wants);
    }
    if (options.generationSlack > 0) {
      staggerRow(g, layer, wants, options.generationSlack);
    }
  }

  const bands = stackBands(g, layers);
  const minX = pinned || blocks.length === 0 ? 0 : Math.min(...blocks.map(leftOf));
  const end = measure((at) => bands[at]?.top ?? rowStart(at));
  const { cards, card } = placeCards(g, layers, bands, minX);
  const { nodes, node } = joinSpouses(g, input.families, card);
  const lines = routeLines(g, edges, card, node, bands);
  bendApart(g, lines, bands);

  const rights = blocks.map((block) => block.cx + block.width / 2);
  const layout: FileGraphLayout = {
    cards,
    card,
    nodes,
    node,
    lines,
    focus: input.focus,
    width: rights.length > 0 ? most(rights) : 0,
    height: bands.at(-1)?.bottom ?? 0,
    bands,
    rows: index.generations.length,
    crossings: optimised.crossings,
    crossingsAtStart: optimised.crossingsAtStart,
    iterations: optimised.iterations,
    direction: "TB",
    clusters: graph.clusters,
    links: [...graph.links, ...analysis.links, ...referencesOf(lines, graph.childOf, graph.partnerIn)],
    layerOf: analysis.layerOf,
    anomalies: [...graph.anomalies, ...analysis.anomalies],
    energy: { start, end: { ...end, crossings: crossingsOf(layers) } },
  };
  return orient(layout, options.direction);
}
