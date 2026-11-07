import { least, most } from "../fileTimeline";
import { countCrossings } from "./crossings";
import { leftOf, type Block, type BlockLink } from "./blocks";
import type { ClusterGraph, EnergyTerms, Geometry, Weights } from "./types";

export { countCrossings };

/** Crossings between the lines of a block and of the block to its right, toward one neighbouring row. */
export function crossed(left: BlockLink[], right: BlockLink[]): number {
  if (left.length === 0 || right.length === 0) {
    return 0;
  }
  const fars = right.map((link) => leftOf(link.to) + link.far).sort((a, b) => a - b);
  let found = 0;
  for (const link of left) {
    const x = leftOf(link.to) + link.far;
    let low = 0;
    let high = fars.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((fars[middle] ?? 0) < x) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    found += low;
  }
  return found;
}

/**
 * The change in crossings if two neighbouring blocks of a row swapped, from
 * their own links alone: negative when swapping helps.
 */
export function swapDelta(one: Block, other: Block): number {
  const now = crossed(one.up, other.up) + crossed(one.down, other.down);
  const then = crossed(other.up, one.up) + crossed(other.down, one.down);
  return then - now;
}

export function crossingsOf(layers: Block[][]): number {
  let found = 0;
  for (let at = 0; at < layers.length - 1; at += 1) {
    const segments: [number, number][] = [];
    for (const block of layers[at] ?? []) {
      const left = leftOf(block);
      for (const link of block.down) {
        segments.push([left + link.near, leftOf(link.to) + link.far]);
      }
    }
    found += countCrossings(segments);
  }
  return found;
}

/** The squared offset of a block's anchors from those it is joined to, beyond a dead zone of one family. */
export function moveDelta(block: Block, to: number, dead: number): number {
  const was = block.cx;
  const cost = (): number => {
    let sum = 0;
    for (const link of [...block.up, ...block.down]) {
      const off = Math.abs(leftOf(link.to) + link.far - (leftOf(block) + link.near));
      sum += Math.max(0, off - dead) ** 2;
    }
    return sum;
  };
  const before = cost();
  block.cx = to;
  const after = cost();
  block.cx = was;
  return after - before;
}

interface Family {
  /** The blocks a family's children stand in. */
  children: Block[];
}

/** The families of a graph as the blocks their children stand in, for the cluster term. */
export function familiesOf(graph: ClusterGraph, blockOf: ReadonlyMap<string, Block>): Family[] {
  return graph.clusters
    .map((cluster) => ({
      children: [
        ...new Set(cluster.children.flatMap((child) => {
          const block = blockOf.get(child.id);
          return block ? [block] : [];
        })),
      ],
    }))
    .filter((family) => family.children.length > 1);
}

export interface EnergyInput {
  layers: Block[][];
  families: Family[];
  weights: Weights;
  g: Geometry;
  /** Every descent line as the block it leaves and the block it reaches. */
  descents: { from: Block; to: Block; ambiguous: boolean }[];
  bandStart: (layer: number) => number;
}

/**
 * The six terms of the energy a layout is judged by, and their weighted sum.
 * Overlap counts squared penetration of neighbours in a row; generation counts
 * how far a child stands from being a pitch below a parent along the axis of
 * generations; cluster counts the blocks of other families standing between the
 * children of one.
 */
export function energyOf({ layers, families, weights, g, descents, bandStart }: EnergyInput): EnergyTerms {
  let distance = 0;
  for (const layer of layers) {
    for (const block of layer) {
      for (const link of block.down) {
        const off = Math.abs(leftOf(link.to) + link.far - (leftOf(block) + link.near));
        distance += Math.max(0, off - g.block - g.across) ** 2;
      }
    }
  }
  let overlap = 0;
  let displacement = 0;
  for (const layer of layers) {
    layer.forEach((block, at) => {
      const before = layer[at - 1];
      if (before) {
        const room = before.cx + before.width / 2 + (before.lane || block.lane ? g.laneGap : 0) - leftOf(block);
        overlap += Math.max(0, room - 1e-6) ** 2;
      }
      displacement += (block.cx - block.home) ** 2;
    });
  }
  const at = new Map<Block, number>();
  for (const layer of layers) {
    layer.forEach((block, index) => at.set(block, index));
  }
  let cluster = 0;
  for (const family of families) {
    const byLayer = new Map<number, number[]>();
    for (const block of family.children) {
      byLayer.set(block.layer, [...(byLayer.get(block.layer) ?? []), at.get(block) ?? 0]);
    }
    for (const spots of byLayer.values()) {
      cluster += most(spots) - least(spots) + 1 - new Set(spots).size;
    }
  }
  let generation = 0;
  for (const { from, to, ambiguous } of descents) {
    if (ambiguous) {
      continue;
    }
    const gap = bandStart(to.layer) + to.dy - (bandStart(from.layer) + from.dy + g.along);
    generation += Math.max(0, g.rowGap / 2 - gap) ** 2;
  }
  const crossings = crossingsOf(layers);
  const total =
    weights.distance * distance +
    weights.crossings * crossings +
    weights.overlap * overlap +
    weights.generation * generation +
    weights.cluster * cluster +
    weights.displacement * displacement;
  return { distance, crossings, overlap, generation, cluster, displacement, total };
}
