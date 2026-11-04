import type { BranchScope } from "./branchScope";
import { least, most, type FileTimeline } from "./fileTimeline";

export const CARD = { width: 168, height: 46 } as const;
const SPOUSE_GAP = 36;
const BLOCK_GAP = 72;
export const ROW_PITCH = 130;
export const LANE = 10;
const LANE_GAP = 20;
const BELOW = 16;
const PULLS = 40;
const TRANSPOSE_ROUNDS = 4;

export const SWEEPS = { most: 24, idle: 4, budget: 250 } as const;

export type Point = [number, number];

export interface GraphCard {
  xref: string;
  row: number;
  x: number;
  y: number;
}

/**
 * `pair`: between neighbouring spouses. `below`: under a block whose two
 * spouses are not neighbours, as a third marriage leaves them. `across`: on
 * the curve between spouses in different rows.
 */
export type NodeKind = "pair" | "below" | "across";

export interface GraphNode {
  family: string;
  kind: NodeKind;
  x: number;
  y: number;
  /** Null where the marriage is undated. */
  year: number | null;
  /** The left spouse first, or the upper one where they stand in different rows. */
  spouses: [string, string];
  /** What joins the node to its spouses' cards, each drawn as a curve. */
  joins: Point[][];
}

export interface GraphLine {
  family: string;
  child: string;
  parents: string[];
  /** From the family's node, or its one parent's card, through a lane in each row between, to the child's card. */
  points: Point[];
}

export interface FileGraphLayout {
  /** In row order, left to right. */
  cards: GraphCard[];
  card: ReadonlyMap<string, GraphCard>;
  nodes: GraphNode[];
  node: ReadonlyMap<string, GraphNode>;
  lines: GraphLine[];
  focus: string | null;
  width: number;
  height: number;
  rows: number;
  crossings: number;
  crossingsAtStart: number;
  sweeps: number;
}

interface Link {
  to: Unit;
  /** The anchor's offset from the left of the unit at the other end. */
  far: number;
  /** The anchor's offset from the left of this unit. */
  near: number;
}

interface Unit {
  members: string[];
  layer: number;
  width: number;
  up: Link[];
  down: Link[];
  key: number;
  lane: boolean;
  cx: number;
}

interface Edge {
  family: string;
  parents: string[];
  child: string;
  lanes: Unit[];
}

/** Two digits after an apostrophe; nothing for a year before the era, which two digits cannot say. */
export function marriageDigits(year: number): string {
  return year > 0 ? `’${String(year % 100).padStart(2, "0")}` : "";
}

/**
 * The crossings of lines between two rows, each line given by its x in the
 * upper row and in the lower: inversions counted with a Fenwick tree. Lines
 * sharing an end do not cross.
 */
export function countCrossings(segments: readonly (readonly [number, number])[]): number {
  if (segments.length < 2) {
    return 0;
  }
  const sorted = [...segments].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lows = [...new Set(sorted.map((segment) => segment[1]))].sort((a, b) => a - b);
  const rank = new Map(lows.map((value, at) => [value, at + 1]));
  const tree = new Array<number>(lows.length + 1).fill(0);
  let crossings = 0;
  sorted.forEach((segment, seen) => {
    const at = rank.get(segment[1]) ?? 1;
    let notAbove = 0;
    for (let i = at; i > 0; i -= i & -i) {
      notAbove += tree[i] ?? 0;
    }
    crossings += seen - notAbove;
    for (let i = at; i < tree.length; i += i & -i) {
      tree[i] = (tree[i] ?? 0) + 1;
    }
  });
  return crossings;
}

const pitch = CARD.width + SPOUSE_GAP;
const leftOf = (unit: Unit): number => unit.cx - unit.width / 2;
const gapBetween = (a: Unit, b: Unit): number => (a.lane || b.lane ? LANE_GAP : BLOCK_GAP);

/** Where a family's lines leave a block: between neighbouring spouses, midway between others, else at its parent's card. */
function familyAnchor(place: ReadonlyMap<string, number>, parents: string[]): number {
  const at = parents
    .map((xref) => place.get(xref))
    .filter((index): index is number => index !== undefined)
    .sort((a, b) => a - b);
  const [first = 0, second] = at;
  if (second === undefined) {
    return first * pitch + CARD.width / 2;
  }
  if (second - first === 1) {
    return second * pitch - SPOUSE_GAP / 2;
  }
  return ((first + second) * pitch + CARD.width) / 2;
}

function pack(layer: Unit[]): void {
  let x = 0;
  layer.forEach((unit, at) => {
    const before = layer[at - 1];
    if (before) {
      x += gapBetween(before, unit);
    }
    unit.cx = x + unit.width / 2;
    x += unit.width;
  });
}

function wish(unit: Unit, links: Link[]): number {
  let sum = 0;
  for (const link of links) {
    sum += leftOf(link.to) + link.far - link.near + unit.width / 2;
  }
  return sum / links.length;
}

function crossingsOf(layers: Unit[][]): number {
  let found = 0;
  for (let at = 0; at < layers.length - 1; at += 1) {
    const segments: [number, number][] = [];
    for (const unit of layers[at] ?? []) {
      const left = leftOf(unit);
      for (const link of unit.down) {
        segments.push([left + link.near, leftOf(link.to) + link.far]);
      }
    }
    found += countCrossings(segments);
  }
  return found;
}

/** Crossings between the lines of a unit and of the unit to its right, toward one neighbouring row. */
function crossed(left: Link[], right: Link[]): number {
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

/** Neighbours swapped wherever that crosses fewer lines to the rows above and below. */
function transpose(layer: Unit[]): void {
  for (let round = 0; round < TRANSPOSE_ROUNDS; round += 1) {
    let swapped = false;
    for (let at = 0; at < layer.length - 1; at += 1) {
      const one = layer[at];
      const other = layer[at + 1];
      if (!one || !other) {
        continue;
      }
      const now = crossed(one.up, other.up) + crossed(one.down, other.down);
      const then = crossed(other.up, one.up) + crossed(other.down, one.down);
      if (then < now) {
        layer[at] = other;
        layer[at + 1] = one;
        swapped = true;
      }
    }
    if (!swapped) {
      break;
    }
  }
  pack(layer);
}

/** A chain of spouses walked from an end, so someone married twice stands between two of them. */
function walkBlock(start: string, spouses: ReadonlyMap<string, string[]>): string[] {
  const component: string[] = [];
  const seen = new Set([start]);
  const stack = [start];
  while (stack.length > 0) {
    const xref = stack.pop() ?? start;
    component.push(xref);
    for (const other of spouses.get(xref) ?? []) {
      if (!seen.has(other)) {
        seen.add(other);
        stack.push(other);
      }
    }
  }
  const end = component.find((xref) => (spouses.get(xref)?.length ?? 0) <= 1) ?? start;
  const order: string[] = [];
  const done = new Set<string>();
  const walk = [end];
  while (walk.length > 0) {
    const xref = walk.pop() ?? end;
    if (done.has(xref)) {
      continue;
    }
    done.add(xref);
    order.push(xref);
    const next = spouses.get(xref) ?? [];
    for (let at = next.length - 1; at >= 0; at -= 1) {
      const other = next[at];
      if (other !== undefined && !done.has(other)) {
        walk.push(other);
      }
    }
  }
  return order;
}

export function layoutFileGraph(
  model: FileTimeline,
  scope: BranchScope,
  clock: () => number = () => performance.now(),
): FileGraphLayout {
  const focus = scope.focus !== undefined && model.people.has(scope.focus) ? scope.focus : null;
  const keep = focus === null ? null : model.branch(focus, scope.up, scope.down);
  const shown = keep ? model.rows.filter((xref) => keep.has(xref)) : [...model.rows];
  const on = new Set(shown);
  const rowIndex = new Map(model.rows.map((xref, at) => [xref, at]));

  const generations = [...new Set(shown.map((xref) => model.generations.get(xref) ?? 0))].sort((a, b) => a - b);
  const layerOfGeneration = new Map(generations.map((generation, at) => [generation, at]));
  const layerOf = (xref: string): number => layerOfGeneration.get(model.generations.get(xref) ?? 0) ?? 0;

  const spouses = new Map<string, string[]>(shown.map((xref) => [xref, []]));
  for (const family of model.families.values()) {
    const [a, b] = family.spouses;
    if (a !== undefined && b !== undefined && on.has(a) && on.has(b) && layerOf(a) === layerOf(b)) {
      spouses.get(a)?.push(b);
      spouses.get(b)?.push(a);
    }
  }

  const sexOf = (xref: string) => model.people.get(xref)?.sex ?? "U";
  const husbandLeft = (order: string[]): number => {
    let count = 0;
    for (let at = 1; at < order.length; at += 1) {
      if (sexOf(order[at - 1] ?? "") === "M" || sexOf(order[at] ?? "") === "F") {
        count += 1;
      }
    }
    return count;
  };

  const units: Unit[] = [];
  const unitOf = new Map<string, Unit>();
  const place = new Map<string, number>();
  for (const xref of shown) {
    if (unitOf.has(xref)) {
      continue;
    }
    let members = walkBlock(xref, spouses);
    const reversed = [...members].reverse();
    if (husbandLeft(reversed) > husbandLeft(members)) {
      members = reversed;
    }
    const unit: Unit = {
      members,
      layer: layerOf(xref),
      width: members.length * CARD.width + (members.length - 1) * SPOUSE_GAP,
      up: [],
      down: [],
      key: rowIndex.get(xref) ?? 0,
      lane: false,
      cx: 0,
    };
    units.push(unit);
    members.forEach((member, at) => {
      unitOf.set(member, unit);
      place.set(member, at);
    });
  }

  const link = (from: Unit, near: number, to: Unit, far: number): void => {
    from.down.push({ to, far, near });
    to.up.push({ to: from, far: near, near: far });
  };
  const edges: Edge[] = [];
  for (const family of model.families.values()) {
    const parents = family.spouses.filter((xref) => on.has(xref));
    const upper = least(parents.map(layerOf));
    const anchor = parents.find((xref) => layerOf(xref) === upper);
    const from = anchor === undefined ? undefined : unitOf.get(anchor);
    if (!from) {
      continue;
    }
    const leaves = familyAnchor(
      place,
      parents.filter((xref) => unitOf.get(xref) === from),
    );
    for (const child of family.children) {
      const to = unitOf.get(child);
      if (!on.has(child) || !to) {
        continue;
      }
      const lanes: Unit[] = [];
      let previous = from;
      let near = leaves;
      for (let layer = from.layer + 1; layer < to.layer; layer += 1) {
        const lane: Unit = { members: [], layer, width: LANE, up: [], down: [], key: from.key, lane: true, cx: 0 };
        units.push(lane);
        lanes.push(lane);
        link(previous, near, lane, LANE / 2);
        previous = lane;
        near = LANE / 2;
      }
      if (to.layer > from.layer) {
        link(previous, near, to, (place.get(child) ?? 0) * pitch + CARD.width / 2);
      }
      edges.push({ family: family.xref, parents, child, lanes });
    }
  }

  const layers: Unit[][] = Array.from({ length: generations.length }, () => []);
  for (const unit of units) {
    layers[unit.layer]?.push(unit);
  }
  for (const layer of layers) {
    layer.sort((a, b) => a.key - b.key);
    pack(layer);
  }

  const crossingsAtStart = crossingsOf(layers);
  layers.forEach(transpose);
  let best = crossingsOf(layers);
  let bestOrder = layers.map((layer) => [...layer]);
  let sweeps = 0;
  let idle = 0;
  const started = clock();
  while (sweeps < SWEEPS.most && best > 0 && idle < SWEEPS.idle) {
    const down = sweeps % 2 === 0;
    for (let step = 1; step < layers.length; step += 1) {
      const layer = layers[down ? step : layers.length - 1 - step] ?? [];
      const wanted = new Map<Unit, number>();
      for (const unit of layer) {
        const links = down ? unit.up : unit.down;
        wanted.set(unit, links.length > 0 ? wish(unit, links) : unit.cx);
      }
      layer.sort((a, b) => (wanted.get(a) ?? 0) - (wanted.get(b) ?? 0));
      pack(layer);
      transpose(layer);
    }
    sweeps += 1;
    const found = crossingsOf(layers);
    if (found < best) {
      best = found;
      bestOrder = layers.map((layer) => [...layer]);
      idle = 0;
    } else {
      idle += 1;
    }
    if (clock() - started >= SWEEPS.budget) {
      break;
    }
  }
  bestOrder.forEach((layer, at) => {
    layers[at] = layer;
    pack(layer);
  });

  for (let pass = 0; pass < PULLS; pass += 1) {
    const forward = pass % 2 === 0;
    for (let step = 0; step < layers.length; step += 1) {
      const layer = layers[forward ? step : layers.length - 1 - step] ?? [];
      if (layer.length === 0) {
        continue;
      }
      const want = layer.map((unit) => {
        const links = [...unit.up, ...unit.down];
        return links.length > 0 ? wish(unit, links) : unit.cx;
      });
      const fromLeft: number[] = [];
      const fromRight: number[] = [];
      layer.forEach((unit, at) => {
        const before = layer[at - 1];
        const own = want[at] ?? unit.cx;
        fromLeft[at] = before
          ? Math.max(own, (fromLeft[at - 1] ?? 0) + before.width / 2 + gapBetween(before, unit) + unit.width / 2)
          : own;
      });
      for (let at = layer.length - 1; at >= 0; at -= 1) {
        const unit = layer[at];
        const after = layer[at + 1];
        if (!unit) {
          continue;
        }
        const own = want[at] ?? unit.cx;
        fromRight[at] = after
          ? Math.min(own, (fromRight[at + 1] ?? 0) - after.width / 2 - gapBetween(unit, after) - unit.width / 2)
          : own;
      }
      layer.forEach((unit, at) => {
        unit.cx = ((fromLeft[at] ?? 0) + (fromRight[at] ?? 0)) / 2;
      });
      layer.forEach((unit, at) => {
        const before = layer[at - 1];
        if (before) {
          unit.cx = Math.max(unit.cx, before.cx + before.width / 2 + gapBetween(before, unit) + unit.width / 2);
        }
      });
    }
  }

  const minX = units.length > 0 ? least(units.map(leftOf)) : 0;
  const cards: GraphCard[] = [];
  const card = new Map<string, GraphCard>();
  layers.forEach((layer) => {
    for (const unit of layer) {
      unit.cx -= minX;
      unit.members.forEach((xref, at) => {
        const placed = { xref, row: unit.layer, x: leftOf(unit) + at * pitch, y: unit.layer * ROW_PITCH };
        cards.push(placed);
        card.set(xref, placed);
      });
    }
  });

  const nodes: GraphNode[] = [];
  const node = new Map<string, GraphNode>();
  for (const family of model.families.values()) {
    const placed = family.spouses
      .map((xref) => card.get(xref))
      .filter((one): one is GraphCard => one !== undefined);
    const [one, other] = placed;
    if (!one || !other) {
      continue;
    }
    const year = family.marriage?.year ?? null;
    const bottom = (at: GraphCard): Point => [at.x + CARD.width / 2, at.y + CARD.height];
    let made: GraphNode;
    if (one.row === other.row) {
      const [a, b] = one.x <= other.x ? [one, other] : [other, one];
      const neighbours = Math.abs(b.x - a.x - pitch) < 0.5;
      if (neighbours) {
        const y = a.y + CARD.height / 2;
        made = {
          family: family.xref,
          kind: "pair",
          x: (a.x + CARD.width + b.x) / 2,
          y,
          year,
          spouses: [a.xref, b.xref],
          joins: [[[a.x + CARD.width, y], [b.x, y]]],
        };
      } else {
        const x = (a.x + b.x + CARD.width) / 2;
        const y = a.y + CARD.height + BELOW;
        made = {
          family: family.xref,
          kind: "below",
          x,
          y,
          year,
          spouses: [a.xref, b.xref],
          joins: [[bottom(a), [x, y]], [bottom(b), [x, y]]],
        };
      }
    } else {
      const [upper, lower] = one.row < other.row ? [one, other] : [other, one];
      const from = bottom(upper);
      const to: Point = [lower.x + CARD.width / 2, lower.y];
      made = {
        family: family.xref,
        kind: "across",
        x: (from[0] + to[0]) / 2,
        y: (from[1] + to[1]) / 2,
        year,
        spouses: [upper.xref, lower.xref],
        joins: [[from, to]],
      };
    }
    nodes.push(made);
    node.set(family.xref, made);
  }

  const lines: GraphLine[] = [];
  for (const edge of edges) {
    const child = card.get(edge.child);
    const parent = card.get(edge.parents[0] ?? "");
    const familyNode = node.get(edge.family);
    if (!child || !parent) {
      continue;
    }
    const start: Point = familyNode ? [familyNode.x, familyNode.y] : [parent.x + CARD.width / 2, parent.y + CARD.height];
    lines.push({
      family: edge.family,
      child: edge.child,
      parents: edge.parents,
      points: [
        start,
        ...edge.lanes
          .map((lane): Point => [lane.cx, lane.layer * ROW_PITCH + CARD.height / 2])
          .filter((point) => point[1] > start[1]),
        [child.x + CARD.width / 2, child.y],
      ],
    });
  }

  const rights = units.map((unit) => unit.cx + unit.width / 2);
  return {
    cards,
    card,
    nodes,
    node,
    lines,
    focus,
    width: rights.length > 0 ? most(rights) : 0,
    height: generations.length > 0 ? (generations.length - 1) * ROW_PITCH + CARD.height : 0,
    rows: generations.length,
    crossings: best,
    crossingsAtStart,
    sweeps,
  };
}

const LAYOUTS_HELD = 4;
const held = new WeakMap<FileTimeline, { key: string; layout: FileGraphLayout }[]>();

/** The last few layouts of a model, so going back and forth between a branch and the whole file costs nothing. */
export function fileGraphOf(model: FileTimeline, scope: BranchScope): FileGraphLayout {
  const key =
    scope.focus !== undefined && model.people.has(scope.focus) ? `${scope.focus}|${scope.up}|${scope.down}` : "";
  const list = held.get(model) ?? [];
  const found = list.find((one) => one.key === key);
  if (found) {
    return found.layout;
  }
  const layout = layoutFileGraph(model, scope);
  held.set(model, [{ key, layout }, ...list].slice(0, LAYOUTS_HELD));
  return layout;
}
