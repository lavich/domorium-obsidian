import type { BranchScope } from "./branchScope";
import { least, most, type FileTimeline, type Sex } from "./fileTimeline";

/** `height` is a card's text; a card with a portrait is `portrait` taller. */
export const CARD = { width: 124, height: 58, portrait: 50 } as const;
const SPOUSE_GAP = 36;
const BLOCK_GAP = 48;
/** Between one row's bottom edge and the next row's top. */
export const ROW_GAP = 84;
export const LANE = 10;
const LANE_GAP = 20;
const SIBLING_GAP = 12;
const BELOW = 16;
const CLEAR = 10;
/** The widest stretch of x left with no unit in any row. */
const MOST_GAP = 2 * CARD.width;
/** Lanes are one per family and row; past this many per person shown, further lines go straight. */
const LANES_PER_PERSON = 4;
const BEND = 8;
/** The least distance between two bent lines in one gap; past as many families as fit, heights repeat. */
const BEND_STEP = 4;
const LONG = CARD.height + ROW_GAP;
const PULLS = 40;
const TRANSPOSE_ROUNDS = 4;

/** `budget` bounds the ordering, and `pulls` the ordering and the pulling together, in milliseconds. */
export const SWEEPS = { most: 24, idle: 4, budget: 250, pulls: 500 } as const;

export type Point = [number, number];

/** A card to lay out: a person in the graph of a file, a box of its own in a person's tree. */
export interface GraphInputCard {
  id: string;
  /** Any number, a generation or a step from a focus: rows are ordered by it, and a number no card has makes no row. */
  row: number;
  sex: Sex;
  portrait?: boolean;
}

export interface GraphInputFamily {
  id: string;
  /** Card ids; the first is the husband where the family names one. */
  spouses: string[];
  children: string[];
  year: number | null;
}

export interface GraphInput {
  /** In the order each row starts from. */
  cards: GraphInputCard[];
  /** In the order a person's marriages come, which decides who stands left where sex and role cannot. */
  families: GraphInputFamily[];
  focus: string | null;
}

export interface GraphCard {
  id: string;
  row: number;
  x: number;
  y: number;
  height: number;
}

/** A row's top and bottom edge; cards stand on the bottom one. */
export interface GraphBand {
  top: number;
  bottom: number;
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
  /** The rows between the family and the child, and where in each the line passes. */
  lanes: { row: number; x: number }[];
  /**
   * From the family's node, or its one parent's card, to the child's card:
   * straight down out of the parents' row, through each lane, and into the
   * child's row, so that it turns only between rows and never across a card.
   */
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
  bands: GraphBand[];
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
  /** For a person standing alone: the family they are a child of, beside whose other children they stand closer. */
  family?: string;
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
const gapBetween = (a: Unit, b: Unit): number =>
  a.lane || b.lane ? LANE_GAP : a.family !== undefined && a.family === b.family ? SIBLING_GAP : BLOCK_GAP;

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

/** Each unit at least its gap from the one before it. */
function keepGaps(layer: Unit[]): void {
  layer.forEach((unit, at) => {
    const before = layer[at - 1];
    if (before) {
      unit.cx = Math.max(unit.cx, before.cx + before.width / 2 + gapBetween(before, unit) + unit.width / 2);
    }
  });
}

/** Every stretch of x where no row has a unit is shortened to `most`, the same for every row. */
function squeeze(units: Unit[], most: number): void {
  const spans = units.map((unit) => [leftOf(unit), unit.cx + unit.width / 2] as const).sort((a, b) => a[0] - b[0]);
  const cuts: { at: number; by: number }[] = [];
  let reach = -Infinity;
  let removed = 0;
  for (const [left, right] of spans) {
    if (reach !== -Infinity && left - reach > most) {
      removed += left - reach - most;
      cuts.push({ at: left, by: removed });
    }
    reach = Math.max(reach, right);
  }
  if (cuts.length === 0) {
    return;
  }
  for (const unit of units) {
    const left = leftOf(unit);
    let low = 0;
    let high = cuts.length;
    while (low < high) {
      const middle = (low + high) >> 1;
      if ((cuts[middle]?.at ?? Infinity) <= left) {
        low = middle + 1;
      } else {
        high = middle;
      }
    }
    unit.cx -= cuts[low - 1]?.by ?? 0;
  }
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

/**
 * Where each unit of a row would stand on its own: under or over what it is
 * joined to, and a unit joined to nothing beside its neighbour, so it is not
 * left behind as the rest of the row moves.
 */
function wantsOf(layer: Unit[]): number[] {
  const want = layer.map((unit) => {
    const links = [...unit.up, ...unit.down];
    return links.length > 0 ? wish(unit, links) : NaN;
  });
  const beside = (from: number, to: number): void => {
    const unit = layer[to];
    const other = layer[from];
    const at = want[from];
    if (!unit || !other || at === undefined || Number.isNaN(at) || !Number.isNaN(want[to] ?? 0)) {
      return;
    }
    const gap = (other.width + unit.width) / 2 + gapBetween(other, unit);
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

/**
 * Where long lines of several families cross one gap between rows, each
 * family's cross at a height of their own, ranked by where the family stands,
 * so a bundle of them can be told apart; neighbours never share a height.
 */
/** The band a height falls in, or the last whose bottom it is below. */
function bandAt(bands: readonly GraphBand[], y: number): number {
  let found = 0;
  bands.forEach((band, at) => {
    if (band.top <= y) {
      found = at;
    }
  });
  return found;
}

function bendApart(lines: GraphLine[], bands: readonly GraphBand[]): void {
  const crossings = new Map<number, { line: GraphLine; at: number }[]>();
  for (const line of lines) {
    line.points.forEach((point, at) => {
      const next = line.points[at + 1];
      if (next && Math.abs(next[0] - point[0]) > LONG && next[1] > point[1]) {
        const gap = bandAt(bands, point[1]);
        crossings.set(gap, [...(crossings.get(gap) ?? []), { line, at }]);
      }
    });
  }
  for (const [gap, found] of crossings) {
    const families = [...new Set(found.map((one) => one.line.family))];
    if (families.length < 2) {
      continue;
    }
    const startOf = new Map(found.map((one) => [one.line.family, one.line.points[one.at]?.[0] ?? 0]));
    families.sort((a, b) => (startOf.get(a) ?? 0) - (startOf.get(b) ?? 0));
    const rank = new Map(families.map((family, at) => [family, at]));
    const top = (bands[gap]?.bottom ?? 0) + CLEAR + BEND;
    const bottom = (bands[gap + 1]?.top ?? top) - CLEAR - BEND;
    const replaced = new Map<GraphLine, Map<number, Point[]>>();
    for (const { line, at } of found) {
      const [x0 = 0, y0 = 0] = line.points[at] ?? [];
      const [x1 = 0, y1 = 0] = line.points[at + 1] ?? [];
      const levels = Math.max(1, Math.min(families.length, Math.floor((bottom - top) / BEND_STEP)));
      const bend = top + ((bottom - top) * (((rank.get(line.family) ?? 0) % levels) + 0.5)) / levels;
      if (bend - BEND < y0 || bend + BEND > y1) {
        continue;
      }
      const own = replaced.get(line) ?? new Map<number, Point[]>();
      own.set(at, [[x0, bend - BEND], [x1, bend + BEND]]);
      replaced.set(line, own);
    }
    for (const [line, at] of replaced) {
      line.points = line.points.flatMap((point, index) => [point, ...(at.get(index) ?? [])]);
    }
  }
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
  const shown = keep ? model.rows.filter((xref) => keep.has(xref)) : model.rows;
  return layoutGraph(
    {
      cards: shown.map((xref) => ({
        id: xref,
        row: model.generations.get(xref) ?? 0,
        sex: model.people.get(xref)?.sex ?? "U",
        portrait: model.people.get(xref)?.portrait !== undefined,
      })),
      families: [...model.families.values()].map((family) => ({
        id: family.xref,
        spouses: family.spouses,
        children: family.children,
        year: family.marriage?.year ?? null,
      })),
      focus,
    },
    clock,
  );
}

interface Indexed {
  shown: string[];
  on: Set<string>;
  rowIndex: Map<string, number>;
  generations: number[];
  layerOf: (id: string) => number;
  portraits: Set<string>;
}

interface Marriages {
  spouses: Map<string, string[]>;
  husbands: Set<string>;
  marriedAt: Map<string, number>;
}

interface Layering {
  layers: Unit[][];
  crossingsAtStart: number;
  best: number;
  sweeps: number;
}

type Late = (budget: number) => boolean;

function indexCards(input: GraphInput): Indexed {
  const shown = input.cards.map((one) => one.id);
  const rowOf = new Map(input.cards.map((one) => [one.id, one.row]));
  const generations = [...new Set(input.cards.map((one) => one.row))].sort((a, b) => a - b);
  const layerOfGeneration = new Map(generations.map((generation, at) => [generation, at]));
  return {
    shown,
    on: new Set(shown),
    rowIndex: new Map(shown.map((id, at) => [id, at])),
    generations,
    layerOf: (id) => layerOfGeneration.get(rowOf.get(id) ?? 0) ?? 0,
    portraits: new Set(input.cards.filter((one) => one.portrait).map((one) => one.id)),
  };
}

function mapMarriages(families: readonly GraphInputFamily[], index: Indexed): Marriages {
  const { shown, on, layerOf } = index;
  const spouses = new Map<string, string[]>(shown.map((id) => [id, []]));
  const husbands = new Set<string>();
  const marriedAt = new Map<string, number>();
  families.forEach((family, at) => {
    const [a, b] = family.spouses;
    if (a === undefined || b === undefined) {
      return;
    }
    husbands.add(`${a}|${b}`);
    for (const key of [`${a}|${b}`, `${b}|${a}`]) {
      if (!marriedAt.has(key)) {
        marriedAt.set(key, at);
      }
    }
    if (on.has(a) && on.has(b) && layerOf(a) === layerOf(b)) {
      spouses.get(a)?.push(b);
      spouses.get(b)?.push(a);
    }
  });
  return { spouses, husbands, marriedAt };
}

function readsBetterIn(
  sexOf: (id: string) => string,
  { husbands, marriedAt }: Marriages,
): (one: string[], other: string[]) => boolean {
  const husbandLeft = (order: string[]): [number, number] => {
    let bySex = 0;
    let byRole = 0;
    for (let at = 1; at < order.length; at += 1) {
      const left = order[at - 1] ?? "";
      const right = order[at] ?? "";
      if (sexOf(left) === "M" || sexOf(right) === "F") {
        bySex += 1;
      }
      if (husbands.has(`${left}|${right}`)) {
        byRole += 1;
      }
    }
    return [bySex, byRole];
  };
  const firstMarriageLeft = (order: string[]): number =>
    order.length < 2 ? 0 : (marriedAt.get(`${order[0] ?? ""}|${order[1] ?? ""}`) ?? Infinity);
  return (one, other) => {
    const [sexOne, roleOne] = husbandLeft(one);
    const [sexOther, roleOther] = husbandLeft(other);
    if (sexOne !== sexOther) {
      return sexOne > sexOther;
    }
    if (roleOne !== roleOther) {
      return roleOne > roleOther;
    }
    return firstMarriageLeft(one) < firstMarriageLeft(other);
  };
}

function makeUnits(
  input: GraphInput,
  index: Indexed,
  marriages: Marriages,
): { units: Unit[]; unitOf: Map<string, Unit>; place: Map<string, number> } {
  const { shown, rowIndex, layerOf } = index;
  const sexes = new Map(input.cards.map((one) => [one.id, one.sex]));
  const readsBetter = readsBetterIn((id) => sexes.get(id) ?? "U", marriages);
  const childOf = new Map<string, string>();
  for (const family of input.families) {
    for (const child of family.children) {
      if (!childOf.has(child)) {
        childOf.set(child, family.id);
      }
    }
  }
  const units: Unit[] = [];
  const unitOf = new Map<string, Unit>();
  const place = new Map<string, number>();
  for (const xref of shown) {
    if (unitOf.has(xref)) {
      continue;
    }
    let members = walkBlock(xref, marriages.spouses);
    const reversed = [...members].reverse();
    if (readsBetter(reversed, members)) {
      members = reversed;
    }
    const [only] = members;
    const unit: Unit = {
      members,
      ...(members.length === 1 && only !== undefined && childOf.has(only) ? { family: childOf.get(only) } : {}),
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
  return { units, unitOf, place };
}

function link(from: Unit, near: number, to: Unit, far: number): void {
  from.down.push({ to, far, near });
  to.up.push({ to: from, far: near, near: far });
}

function linkFamilies(
  families: readonly GraphInputFamily[],
  index: Indexed,
  units: Unit[],
  unitOf: ReadonlyMap<string, Unit>,
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
    const from = anchor === undefined ? undefined : unitOf.get(anchor);
    if (!from) {
      continue;
    }
    const leaves = familyAnchor(
      place,
      parents.filter((xref) => unitOf.get(xref) === from),
    );
    const shared = new Map<number, Unit>();
    for (const child of family.children) {
      const to = unitOf.get(child);
      if (!on.has(child) || !to || to.layer <= from.layer) {
        continue;
      }
      let missing = 0;
      for (let layer = from.layer + 1; layer < to.layer; layer += 1) {
        missing += shared.has(layer) ? 0 : 1;
      }
      if (laneCount + missing > laneCap) {
        edges.push({ family: family.id, parents, child, lanes: [] });
        continue;
      }
      const lanes: Unit[] = [];
      let previous = from;
      let near = leaves;
      for (let layer = from.layer + 1; layer < to.layer; layer += 1) {
        let lane = shared.get(layer);
        if (!lane) {
          lane = { members: [], layer, width: LANE, up: [], down: [], key: from.key, lane: true, cx: 0 };
          units.push(lane);
          shared.set(layer, lane);
          laneCount += 1;
          link(previous, near, lane, LANE / 2);
        }
        lanes.push(lane);
        previous = lane;
        near = LANE / 2;
      }
      link(previous, near, to, (place.get(child) ?? 0) * pitch + CARD.width / 2);
      edges.push({ family: family.id, parents, child, lanes });
    }
  }
  return edges;
}

function stackLayers(units: Unit[], count: number): Unit[][] {
  const layers: Unit[][] = Array.from({ length: count }, () => []);
  for (const unit of units) {
    layers[unit.layer]?.push(unit);
  }
  for (const layer of layers) {
    layer.sort((a, b) => a.key - b.key);
    pack(layer);
  }
  return layers;
}

function reduceCrossings(layers: Unit[][], late: Late): Layering {
  const crossingsAtStart = crossingsOf(layers);
  for (const layer of layers) {
    if (late(SWEEPS.budget)) {
      break;
    }
    transpose(layer);
  }
  let best = crossingsOf(layers);
  let bestOrder = layers.map((layer) => [...layer]);
  let sweeps = 0;
  let idle = 0;
  let stopped = late(SWEEPS.budget);
  while (!stopped && sweeps < SWEEPS.most && best > 0 && idle < SWEEPS.idle) {
    const down = sweeps % 2 === 0;
    sweeps += 1;
    for (let step = 1; step < layers.length; step += 1) {
      if (late(SWEEPS.budget)) {
        stopped = true;
        break;
      }
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
    pack(layer);
  });
  return { layers, crossingsAtStart, best, sweeps };
}

function pullTogether(layers: Unit[][], late: Late): void {
  for (let pass = 0; pass < PULLS && !late(SWEEPS.pulls); pass += 1) {
    const forward = pass % 2 === 0;
    for (let step = 0; step < layers.length; step += 1) {
      const layer = layers[forward ? step : layers.length - 1 - step] ?? [];
      if (layer.length === 0) {
        continue;
      }
      const want = wantsOf(layer);
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
      keepGaps(layer);
    }
  }
}

function stackBands(layers: Unit[][], portraits: ReadonlySet<string>): GraphBand[] {
  const bands: GraphBand[] = [];
  layers.forEach((layer, at) => {
    const top = at === 0 ? 0 : (bands[at - 1]?.bottom ?? 0) + ROW_GAP;
    const tall = layer.some((unit) => unit.members.some((id) => portraits.has(id)));
    bands.push({ top, bottom: top + CARD.height + (tall ? CARD.portrait : 0) });
  });
  return bands;
}

function placeCards(
  layers: Unit[][],
  bands: readonly GraphBand[],
  portraits: ReadonlySet<string>,
  minX: number,
): { cards: GraphCard[]; card: Map<string, GraphCard> } {
  const cards: GraphCard[] = [];
  const card = new Map<string, GraphCard>();
  layers.forEach((layer, row) => {
    const band = bands[row] ?? { top: 0, bottom: CARD.height };
    for (const unit of layer) {
      unit.cx -= minX;
      unit.members.forEach((id, at) => {
        const height = CARD.height + (portraits.has(id) ? CARD.portrait : 0);
        const placed = { id, row: unit.layer, x: leftOf(unit) + at * pitch, y: band.bottom - height, height };
        cards.push(placed);
        card.set(id, placed);
      });
    }
  });
  return { cards, card };
}

function nodeOf(family: GraphInputFamily, one: GraphCard, other: GraphCard): GraphNode {
  const { year } = family;
  const bottom = (at: GraphCard): Point => [at.x + CARD.width / 2, at.y + at.height];
  if (one.row === other.row) {
    const [a, b] = one.x <= other.x ? [one, other] : [other, one];
    const neighbours = Math.abs(b.x - a.x - pitch) < 0.5;
    if (neighbours) {
      const y = a.y + a.height - CARD.height / 2;
      return {
        family: family.id,
        kind: "pair",
        x: (a.x + CARD.width + b.x) / 2,
        y,
        year,
        spouses: [a.id, b.id],
        joins: [[[a.x + CARD.width, y], [b.x, y]]],
      };
    }
    const x = (a.x + b.x + CARD.width) / 2;
    const y = a.y + a.height + BELOW;
    return {
      family: family.id,
      kind: "below",
      x,
      y,
      year,
      spouses: [a.id, b.id],
      joins: [[bottom(a), [x, y]], [bottom(b), [x, y]]],
    };
  }
  const [upper, lower] = one.row < other.row ? [one, other] : [other, one];
  const from = bottom(upper);
  const to: Point = [lower.x + CARD.width / 2, lower.y];
  const next = lower.row - upper.row === 1;
  const at: Point = next ? [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] : [from[0], from[1] + BELOW];
  return {
    family: family.id,
    kind: "across",
    x: at[0],
    y: at[1],
    year,
    spouses: [upper.id, lower.id],
    joins: next ? [[from, to]] : [[from, at], [at, to]],
  };
}

function joinSpouses(
  families: readonly GraphInputFamily[],
  card: ReadonlyMap<string, GraphCard>,
): { nodes: GraphNode[]; node: Map<string, GraphNode> } {
  const nodes: GraphNode[] = [];
  const node = new Map<string, GraphNode>();
  for (const family of families) {
    const placed = family.spouses
      .map((id) => card.get(id))
      .filter((one): one is GraphCard => one !== undefined);
    const [one, other] = placed;
    if (!one || !other) {
      continue;
    }
    const made = nodeOf(family, one, other);
    nodes.push(made);
    node.set(family.id, made);
  }
  return { nodes, node };
}

function routeLines(
  edges: readonly Edge[],
  card: ReadonlyMap<string, GraphCard>,
  node: ReadonlyMap<string, GraphNode>,
  bands: readonly GraphBand[],
): GraphLine[] {
  const lines: GraphLine[] = [];
  for (const edge of edges) {
    const child = card.get(edge.child);
    const parent = card.get(edge.parents[0] ?? "");
    const familyNode = node.get(edge.family);
    if (!child || !parent) {
      continue;
    }
    const start: Point = familyNode
      ? [familyNode.x, familyNode.y]
      : [parent.x + CARD.width / 2, parent.y + parent.height];
    const end: Point = [child.x + CARD.width / 2, child.y];
    const points: Point[] = [start];
    let y = start[1];
    const step = (point: Point, bottom = point[1]): void => {
      if (point[1] > y && point[1] < end[1]) {
        points.push(point);
        y = bottom;
      }
    };
    const own = bands[bandAt(bands, y)];
    if (own && y <= own.bottom) {
      step([start[0], own.bottom + CLEAR]);
    }
    const lanes = edge.lanes.filter((lane) => (bands[lane.layer]?.top ?? 0) - CLEAR > y);
    for (const lane of lanes) {
      const top = (bands[lane.layer]?.top ?? 0) - CLEAR;
      const bottom = (bands[lane.layer]?.bottom ?? 0) + CLEAR;
      step([lane.cx, top]);
      step([lane.cx, bottom]);
    }
    step([end[0], end[1] - CLEAR]);
    points.push(end);
    lines.push({
      family: edge.family,
      child: edge.child,
      parents: edge.parents,
      lanes: lanes.map((lane) => ({ row: lane.layer, x: lane.cx })),
      points,
    });
  }
  return lines;
}

export function layoutGraph(input: GraphInput, clock: () => number = () => performance.now()): FileGraphLayout {
  const index = indexCards(input);
  const marriages = mapMarriages(input.families, index);
  const { units, unitOf, place } = makeUnits(input, index, marriages);
  const edges = linkFamilies(input.families, index, units, unitOf, place);

  const layers = stackLayers(units, index.generations.length);
  const started = clock();
  const late: Late = (budget) => clock() - started >= budget;
  const { best, crossingsAtStart, sweeps } = reduceCrossings(layers, late);
  pullTogether(layers, late);
  squeeze(units, MOST_GAP);

  const bands = stackBands(layers, index.portraits);
  const minX = units.length > 0 ? least(units.map(leftOf)) : 0;
  const { cards, card } = placeCards(layers, bands, index.portraits, minX);
  const { nodes, node } = joinSpouses(input.families, card);
  const lines = routeLines(edges, card, node, bands);
  bendApart(lines, bands);

  const rights = units.map((unit) => unit.cx + unit.width / 2);
  return {
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
  const layout = found?.layout ?? layoutFileGraph(model, scope);
  held.set(model, [{ key, layout }, ...list.filter((one) => one !== found)].slice(0, LAYOUTS_HELD));
  return layout;
}
