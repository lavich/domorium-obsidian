import { least } from "../fileTimeline";
import {
  gapBetween,
  keepGaps,
  leftOf,
  pack,
  type Block,
  type BlockLink,
  type Edge,
  type Indexed,
  type Late,
} from "./blocks";
import { crossingsOf, swapDelta } from "./energy";
import { SWEEPS, type Geometry, type GraphInputFamily, type LayoutOptions } from "./types";

/** Lanes are one per family and row; past this many per person shown, further lines go straight. */
const LANES_PER_PERSON = 4;
const TRANSPOSE_ROUNDS = 4;

/** Where a family's lines leave a block: between neighbouring spouses, midway between others, else at its parent's card. */
function familyAnchor(g: Geometry, place: ReadonlyMap<string, number>, parents: string[]): number {
  const at = parents
    .map((xref) => place.get(xref))
    .filter((index): index is number => index !== undefined)
    .sort((a, b) => a - b);
  const [first = 0, second] = at;
  if (second === undefined) {
    return first * g.pitch + g.across / 2;
  }
  if (second - first === 1) {
    return second * g.pitch - g.spouse / 2;
  }
  return ((first + second) * g.pitch + g.across) / 2;
}

function link(from: Block, near: number, to: Block, far: number): void {
  from.down.push({ to, far, near });
  to.up.push({ to: from, far: near, near: far });
}

/**
 * The lines of every family as links between blocks, a lane block in each row a
 * line to a child further down passes through. A family's lines share a lane in
 * a row, and past a cap the rest go straight.
 */
export function linkFamilies(
  g: Geometry,
  families: readonly GraphInputFamily[],
  index: Indexed,
  blocks: Block[],
  blockOf: ReadonlyMap<string, Block>,
  place: ReadonlyMap<string, number>,
): Edge[] {
  const { shown, on, layerOf } = index;
  const edges: Edge[] = [];
  const laneCap = LANES_PER_PERSON * shown.length;
  let laneCount = 0;
  for (const family of families) {
    const parents = family.spouses.filter((xref) => on.has(xref));
    const upper = least(parents.map(layerOf));
    const anchor = parents.find((xref) => layerOf(xref) === upper);
    const from = anchor === undefined ? undefined : blockOf.get(anchor);
    if (!from) {
      continue;
    }
    const leaves = familyAnchor(
      g,
      place,
      parents.filter((xref) => blockOf.get(xref) === from),
    );
    const shared = new Map<number, Block>();
    for (const child of family.children) {
      const to = blockOf.get(child);
      const relationship = family.links?.[child] ?? "unstated";
      if (!on.has(child) || !to || to.layer <= from.layer) {
        continue;
      }
      let missing = 0;
      for (let layer = from.layer + 1; layer < to.layer; layer += 1) {
        missing += shared.has(layer) ? 0 : 1;
      }
      if (laneCount + missing > laneCap) {
        edges.push({ family: family.id, parents, child, lanes: [], relationship });
        continue;
      }
      const lanes: Block[] = [];
      let previous = from;
      let near = leaves;
      for (let layer = from.layer + 1; layer < to.layer; layer += 1) {
        let lane = shared.get(layer);
        if (!lane) {
          lane = {
            members: [],
            layer,
            width: g.lane,
            up: [],
            down: [],
            key: from.key,
            rank: from.rank,
            lane: true,
            kin: new Map(),
            cx: 0,
            home: 0,
            pinned: false,
            dy: 0,
          };
          blocks.push(lane);
          shared.set(layer, lane);
          laneCount += 1;
          link(previous, near, lane, g.lane / 2);
        }
        lanes.push(lane);
        previous = lane;
        near = g.lane / 2;
      }
      link(previous, near, to, (place.get(child) ?? 0) * g.pitch + g.across / 2);
      edges.push({ family: family.id, parents, child, lanes, relationship });
    }
  }
  return edges;
}

export function stackLayers(blocks: Block[], count: number): Block[][] {
  const layers: Block[][] = Array.from({ length: count }, () => []);
  for (const block of blocks) {
    layers[block.layer]?.push(block);
  }
  return layers;
}

/**
 * How much more a block's links to what hangs below it pull than those to what
 * stands above: a block is centred over its children, and forebears follow their
 * child, so that a line of descent runs straight instead of leaning toward a
 * far-off crowd of forebears.
 */
const BELOW_PULL = 64;

/** Where a block would stand over its children, a little drawn to its parents. */
function pull(block: Block): number {
  let sum = 0;
  let weight = 0;
  for (const [links, by] of [[block.up, 1], [block.down, BELOW_PULL]] as const) {
    for (const one of links) {
      sum += by * (leftOf(one.to) + one.far - one.near + block.width / 2);
      weight += by;
    }
  }
  return sum / weight;
}

function wish(block: Block, links: BlockLink[]): number {
  let sum = 0;
  for (const one of links) {
    sum += leftOf(one.to) + one.far - one.near + block.width / 2;
  }
  return sum / links.length;
}

/**
 * The first placement: the top row in the order the structure from the root
 * gives, each row after it under what it hangs from, blocks with nothing above
 * them keeping their order beside their neighbours. A layout given as previous
 * decides where its blocks stand.
 */
export function initialPlacement(
  g: Geometry,
  layers: Block[][],
  previous: ReadonlyMap<string, number> | undefined,
  mirrored = false,
  pins?: ReadonlySet<string>,
): void {
  layers.forEach((layer, at) => {
    layer.sort((a, b) => (mirrored ? b.rank - a.rank : a.rank - b.rank));
    const held = new Map<Block, number>();
    for (const block of layer) {
      const members = [...block.members.entries()];
      const asked = members.filter(([, id]) => pins?.has(id) === true);
      for (const [place, id] of [...asked, ...members]) {
        const x = previous?.get(id);
        if (x !== undefined) {
          held.set(block, x - place * g.pitch + block.width / 2);
          break;
        }
      }
    }
    if (at > 0 || held.size > 0) {
      const wanted = layer.map((block) => held.get(block) ?? (block.up.length > 0 ? wish(block, block.up) : NaN));
      let last = -Infinity;
      const filled = wanted.map((value) => {
        if (Number.isNaN(value)) {
          return last;
        }
        last = value;
        return value;
      });
      const order = layer
        .map((_, index) => index)
        .sort((a, b) => (mirrored ? (filled[b] ?? 0) - (filled[a] ?? 0) : (filled[a] ?? 0) - (filled[b] ?? 0)) || a - b);
      const sorted = order.map((index) => layer[index]).filter((block): block is Block => block !== undefined);
      sorted.forEach((block, index) => {
        layer[index] = block;
      });
    }
    pack(g, layer);
    for (const block of layer) {
      block.home = held.get(block) ?? block.cx;
    }
  });
}

/**
 * Where each block of a row would stand on its own: under or over what it is
 * joined to, and a block joined to nothing beside its neighbour, so it is not
 * left behind as the rest of the row moves.
 */
export function wantsOf(g: Geometry, layer: Block[]): number[] {
  const want = layer.map((block) => {
    return block.up.length + block.down.length > 0 ? pull(block) : NaN;
  });
  const beside = (from: number, to: number): void => {
    const block = layer[to];
    const other = layer[from];
    const at = want[from];
    if (!block || !other || at === undefined || Number.isNaN(at) || !Number.isNaN(want[to] ?? 0)) {
      return;
    }
    const gap = (other.width + block.width) / 2 + gapBetween(g, other, block);
    want[to] = from < to ? at + gap : at - gap;
  };
  for (let at = 1; at < layer.length; at += 1) {
    beside(at - 1, at);
  }
  for (let at = layer.length - 2; at >= 0; at -= 1) {
    beside(at + 1, at);
  }
  return want.map((value, at) => (Number.isNaN(value) ? (layer[at]?.cx ?? 0) : value));
}

/** -1 where `one` is the elder of two brothers or sisters, 1 where `other` is, and 0 for anyone else. */
function eldest(one: Block, other: Block): number {
  for (const [family, born] of one.kin) {
    const against = other.kin.get(family);
    if (born !== undefined && against !== undefined && born !== against) {
      return born < against ? -1 : 1;
    }
  }
  return 0;
}

/** Neighbours swapped wherever that crosses fewer lines to the rows above and below, or as many with the elder put left. */
function transpose(g: Geometry, layer: Block[], charge: (work: number) => void): void {
  for (let round = 0; round < TRANSPOSE_ROUNDS; round += 1) {
    let swapped = false;
    for (let at = 0; at < layer.length - 1; at += 1) {
      const one = layer[at];
      const other = layer[at + 1];
      if (!one || !other || one.pinned || other.pinned) {
        continue;
      }
      charge(1 + one.up.length + one.down.length + other.up.length + other.down.length);
      const delta = swapDelta(one, other);
      if (delta < 0 || (delta === 0 && eldest(other, one) < 0)) {
        layer[at] = other;
        layer[at + 1] = one;
        swapped = true;
      }
    }
    if (!swapped) {
      break;
    }
  }
  pack(g, layer);
}

export interface Optimised {
  crossingsAtStart: number;
  crossings: number;
  iterations: number;
}

export interface Budget {
  /** The work the optimisation may do, counted in blocks and links visited. */
  cap: number;
  spent: number;
  late: Late;
  charge: (work: number) => void;
}

export function budgetOf(layers: Block[][], options: LayoutOptions, clock: () => number): Budget {
  let blocks = 0;
  let links = 0;
  for (const layer of layers) {
    blocks += layer.length;
    for (const block of layer) {
      links += block.up.length + block.down.length;
    }
  }
  const started = clock();
  const budget: Budget = {
    cap: Math.max(1, options.optimizationIterations) * 6 * (blocks + links + 1),
    spent: 0,
    late: (limit) => budget.spent >= budget.cap || clock() - started >= limit,
    charge: (work) => {
      budget.spent += work;
    },
  };
  return budget;
}

/**
 * Improves the initial placement: the order of each row by sweeps that reorder
 * rows toward the blocks they are joined to and swap neighbours wherever that
 * lowers the weighted crossings, then the positions by pulling every block
 * toward the mean of its anchors. The work is bounded by a budget counted in
 * blocks and links, so that the result does not depend on the machine; the
 * clock only stops a run that is too slow, keeping the best order so far.
 */
export function optimise(
  g: Geometry,
  layers: Block[][],
  options: LayoutOptions,
  budget: Budget,
): Optimised {
  const crossingsAtStart = crossingsOf(layers);
  const { charge, late } = budget;
  const costOf = (layer: Block[]): number => layer.reduce((sum, block) => sum + 1 + block.up.length + block.down.length, 0);
  for (const layer of layers) {
    if (late(SWEEPS.budget)) {
      break;
    }
    charge(costOf(layer));
    transpose(g, layer, charge);
  }
  let best = crossingsOf(layers);
  let bestOrder = layers.map((layer) => [...layer]);
  let sweeps = 0;
  let idle = 0;
  let stopped = late(SWEEPS.budget);
  const most = Math.min(SWEEPS.most, options.optimizationIterations);
  while (!stopped && sweeps < most && best > 0 && idle < SWEEPS.idle) {
    const down = sweeps % 2 === 0;
    sweeps += 1;
    for (let step = 1; step < layers.length; step += 1) {
      if (late(SWEEPS.budget)) {
        stopped = true;
        break;
      }
      const layer = layers[down ? step : layers.length - 1 - step] ?? [];
      charge(costOf(layer));
      const wanted = new Map<Block, number>();
      for (const block of layer) {
        const links = down ? block.up : block.down;
        wanted.set(block, block.pinned ? block.home : links.length > 0 ? wish(block, links) : block.cx);
      }
      layer.sort((a, b) => (wanted.get(a) ?? 0) - (wanted.get(b) ?? 0) || eldest(a, b));
      pack(g, layer);
      transpose(g, layer, charge);
    }
    const found = crossingsOf(layers);
    if (found < best) {
      best = found;
      bestOrder = layers.map((layer) => [...layer]);
      idle = 0;
    } else {
      idle += 1;
    }
  }
  bestOrder.forEach((layer, at) => {
    layers[at] = layer;
    pack(g, layer);
  });
  pullTogether(g, layers, options, budget);
  return { crossingsAtStart, crossings: best, iterations: sweeps };
}

function pullTogether(g: Geometry, layers: Block[][], options: LayoutOptions, budget: Budget): void {
  const { late, charge } = budget;
  const mix = options.previous
    ? options.weights.displacement / (options.weights.distance + options.weights.displacement || 1)
    : 0;
  const passes = Math.max(1, options.optimizationIterations - SWEEPS.most);
  for (let pass = 0; pass < passes && !late(SWEEPS.pulls); pass += 1) {
    const forward = pass % 2 === 0;
    for (let step = 0; step < layers.length; step += 1) {
      const layer = layers[forward ? step : layers.length - 1 - step] ?? [];
      if (layer.length === 0) {
        continue;
      }
      charge(layer.reduce((sum, block) => sum + 1 + block.up.length + block.down.length, 0));
      const want = wantsOf(g, layer).map((value, at) => {
        const block = layer[at];
        if (!block) {
          return value;
        }
        if (block.pinned) {
          return block.home;
        }
        return mix > 0 ? (1 - mix) * value + mix * block.home : value;
      });
      const fromLeft: number[] = [];
      const fromRight: number[] = [];
      layer.forEach((block, at) => {
        const before = layer[at - 1];
        const own = want[at] ?? block.cx;
        fromLeft[at] = before
          ? Math.max(own, (fromLeft[at - 1] ?? 0) + before.width / 2 + gapBetween(g, before, block) + block.width / 2)
          : own;
      });
      for (let at = layer.length - 1; at >= 0; at -= 1) {
        const block = layer[at];
        const after = layer[at + 1];
        if (!block) {
          continue;
        }
        const own = want[at] ?? block.cx;
        fromRight[at] = after
          ? Math.min(own, (fromRight[at + 1] ?? 0) - after.width / 2 - gapBetween(g, block, after) - block.width / 2)
          : own;
      }
      layer.forEach((block, at) => {
        block.cx = ((fromLeft[at] ?? 0) + (fromRight[at] ?? 0)) / 2;
      });
      keepGaps(g, layer);
    }
  }
}
