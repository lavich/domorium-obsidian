import { least, most } from "../fileTimeline";
import type { Edge } from "./blocks";
import type {
  Geometry,
  GraphBand,
  GraphCard,
  GraphInputFamily,
  GraphLine,
  GraphNode,
  Point,
} from "./types";

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

/**
 * Gives every line square corners: a stretch that changes x between rows turns
 * into a drop, a run across and a drop. The lines of one family run across at one
 * height, a bus they share; families whose runs would overlap in one gap run at
 * heights of their own, so that a bundle of them can be told apart.
 */
export function squareOff(g: Geometry, lines: GraphLine[], bands: readonly GraphBand[]): void {
  const found = new Map<number, { line: GraphLine; at: number }[]>();
  for (const line of lines) {
    line.points.forEach((point, at) => {
      const next = line.points[at + 1];
      if (next && next[0] !== point[0] && next[1] > point[1]) {
        const gap = bandAt(bands, point[1]);
        found.set(gap, [...(found.get(gap) ?? []), { line, at }]);
      }
    });
  }
  const added = new Map<GraphLine, Map<number, Point[]>>();
  for (const [gap, segments] of found) {
    const top = (bands[gap]?.bottom ?? 0) + g.clear;
    const bottom = (bands[gap + 1]?.top ?? top + g.rowGap) - g.clear;
    const families = new Map<string, { left: number; right: number }>();
    for (const { line, at } of segments) {
      const xs = [line.points[at]?.[0] ?? 0, line.points[at + 1]?.[0] ?? 0];
      const own = families.get(line.family);
      const [left, right] = [Math.min(...xs), Math.max(...xs)];
      families.set(
        line.family,
        own ? { left: Math.min(own.left, left), right: Math.max(own.right, right) } : { left, right },
      );
    }
    const ordered = [...families.entries()].sort((a, b) => a[1].left - b[1].left || (a[0] < b[0] ? -1 : 1));
    const ends: number[] = [];
    const levelOf = new Map<string, number>();
    for (const [family, span] of ordered) {
      let level = ends.findIndex((end) => end + g.sibling < span.left);
      if (level < 0) {
        level = ends.length;
      }
      ends[level] = span.right;
      levelOf.set(family, level);
    }
    const room = Math.max(1, Math.min(ends.length, Math.floor((bottom - top) / g.bendStep)));
    for (const { line, at } of segments) {
      const [x0 = 0, y0 = 0] = line.points[at] ?? [];
      const [x1 = 0, y1 = 0] = line.points[at + 1] ?? [];
      const level = (levelOf.get(line.family) ?? 0) % room;
      const y = Math.min(Math.max(top + ((bottom - top) * (level + 0.5)) / room, y0), y1);
      const own = added.get(line) ?? new Map<number, Point[]>();
      own.set(at, [[x0, y], [x1, y]]);
      added.set(line, own);
    }
  }
  for (const [line, at] of added) {
    line.points = line.points.flatMap((point, index) => [point, ...(at.get(index) ?? [])]);
  }
}

/** Down, then across, so that a join to a node has square corners. */
function elbow(from: Point, to: Point): Point[] {
  return from[0] === to[0] ? [from, to] : [from, [from[0], to[1]], to];
}

function nodeOf(g: Geometry, family: GraphInputFamily, placed: GraphCard[]): GraphNode {
  const { year } = family;
  const [one, other, ...rest] = placed;
  if (!one || !other) {
    throw new Error("a family node needs two cards");
  }
  const bottom = (at: GraphCard): Point => [at.x + g.across / 2, at.y + at.height];
  const top = (at: GraphCard): Point => [at.x + g.across / 2, at.y];
  const others = rest.map((card) => card.id);
  const sameRow = placed.every((card) => card.row === one.row);
  if (sameRow && placed.length > 2) {
    const centres = placed.map((card) => card.x + g.across / 2);
    const x = (least(centres) + most(centres)) / 2;
    const y = most(placed.map((card) => card.y + card.height)) + g.below;
    return {
      family: family.id,
      kind: "below",
      x,
      y,
      year,
      spouses: [one.id, other.id],
      others,
      joins: placed.map((card) => elbow(bottom(card), [x, y])),
    };
  }
  let node: GraphNode;
  if (one.row === other.row) {
    const [a, b] = one.x <= other.x ? [one, other] : [other, one];
    const neighbours = Math.abs(b.x - a.x - g.pitch) < 0.5 && a.y === b.y;
    if (neighbours) {
      const y = a.y + a.height - g.along / 2;
      node = {
        family: family.id,
        kind: "pair",
        x: (a.x + g.across + b.x) / 2,
        y,
        year,
        spouses: [a.id, b.id],
        others,
        joins: [[[a.x + g.across, y], [b.x, y]]],
      };
    } else {
      const x = (a.x + b.x + g.across) / 2;
      const y = Math.max(a.y + a.height, b.y + b.height) + g.below;
      node = {
        family: family.id,
        kind: "below",
        x,
        y,
        year,
        spouses: [a.id, b.id],
        others,
        joins: [elbow(bottom(a), [x, y]), elbow(bottom(b), [x, y])],
      };
    }
  } else {
    const [upper, lower] = one.row < other.row ? [one, other] : [other, one];
    const from = bottom(upper);
    const to = top(lower);
    const next = lower.row - upper.row === 1;
    const at: Point = next ? [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2] : [from[0], from[1] + g.below];
    const across = (to[1] - at[1]) / 2 + at[1];
    node = {
      family: family.id,
      kind: "across",
      x: at[0],
      y: at[1],
      year,
      spouses: [upper.id, lower.id],
      others,
      joins: next
        ? [from[0] === to[0] ? [from, to] : [from, [from[0], at[1]], [to[0], at[1]], to]]
        : [[from, at], from[0] === to[0] ? [at, to] : [at, [at[0], across], [to[0], across], to]],
    };
  }
  for (const card of rest) {
    node.joins.push(elbow(card.y + card.height <= node.y ? bottom(card) : top(card), [node.x, node.y]));
  }
  return node;
}

export function joinSpouses(
  g: Geometry,
  families: readonly GraphInputFamily[],
  card: ReadonlyMap<string, GraphCard>,
): { nodes: GraphNode[]; node: Map<string, GraphNode> } {
  const nodes: GraphNode[] = [];
  const node = new Map<string, GraphNode>();
  for (const family of families) {
    const placed = family.spouses
      .map((id) => card.get(id))
      .filter((one): one is GraphCard => one !== undefined);
    if (placed.length < 2) {
      continue;
    }
    const made = nodeOf(g, family, placed);
    nodes.push(made);
    node.set(family.id, made);
  }
  return { nodes, node };
}

/**
 * The line of each family to each child: from the family's node, or its one
 * parent's card, straight down out of the parents' row, through a lane in
 * every row between, and into the child's card, so that it turns only between
 * rows. Lines of one family start together and part near the children.
 */
export function routeLines(
  g: Geometry,
  edges: readonly Edge[],
  card: ReadonlyMap<string, GraphCard>,
  node: ReadonlyMap<string, GraphNode>,
  bands: readonly GraphBand[],
): GraphLine[] {
  const lines: GraphLine[] = [];
  const ids = new Map<string, number>();
  for (const edge of edges) {
    const child = card.get(edge.child);
    const parent = card.get(edge.parents[0] ?? "");
    const familyNode = node.get(edge.family);
    if (!child || !parent) {
      continue;
    }
    const start: Point = familyNode
      ? [familyNode.x, familyNode.y]
      : [parent.x + g.across / 2, parent.y + parent.height];
    const joined = edge.parents.includes(edge.child);
    const end: Point = [child.x + g.across / 2 + (joined ? 2 * g.bend : 0), child.y];
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
      step([start[0], own.bottom + g.clear]);
    }
    const lanes = edge.lanes.filter((lane) => (bands[lane.layer]?.top ?? 0) - g.clear > y);
    for (const lane of lanes) {
      const top = (bands[lane.layer]?.top ?? 0) - g.clear;
      const bottom = (bands[lane.layer]?.bottom ?? 0) + g.clear;
      step([lane.cx, top]);
      step([lane.cx, bottom]);
    }
    step([end[0], end[1] - g.clear]);
    points.push(end);
    const base = `${edge.family}|${edge.child}|${edge.relationship}`;
    const seen = ids.get(base) ?? 0;
    ids.set(base, seen + 1);
    lines.push({
      id: seen === 0 ? base : `${base}#${seen}`,
      family: edge.family,
      child: edge.child,
      parents: edge.parents,
      relationship: edge.relationship,
      lanes: lanes.map((lane) => ({ row: lane.layer, x: lane.cx })),
      points,
    });
  }
  return lines;
}
