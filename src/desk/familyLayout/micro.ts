import { least } from "../fileTimeline";
import { gapBetween, leftOf, type Block, type Indexed, type Marriages } from "./blocks";
import type { Geometry, GraphBand, GraphCard, GraphInput, RootAnalysis } from "./types";

/** A chain of spouses walked from an end, so someone married twice stands between two of them. */
export function walkBlock(start: string, spouses: ReadonlyMap<string, string[]>): string[] {
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

export function readsBetterIn(
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

export interface Measured {
  blocks: Block[];
  blockOf: Map<string, Block>;
  /** A member's place in its block, counted from the left. */
  place: Map<string, number>;
}

/** The blocks of a file with their real widths and the order of their spouses; nothing is placed yet. */
export function measureBlocks(
  input: GraphInput,
  index: Indexed,
  marriages: Marriages,
  analysis: RootAnalysis,
  g: Geometry,
): Measured {
  const { shown, layerOf } = index;
  const sexes = new Map(input.cards.map((one) => [one.id, one.sex]));
  const births = new Map(input.cards.map((one) => [one.id, one.born]));
  const readsBetter = readsBetterIn((id) => sexes.get(id) ?? "U", marriages);
  const childOf = new Map<string, string>();
  for (const family of input.families) {
    for (const child of family.children) {
      if (!childOf.has(child)) {
        childOf.set(child, family.id);
      }
    }
  }
  const rankOf = (id: string): number => analysis.rank.get(id) ?? 0;
  const blocks: Block[] = [];
  const blockOf = new Map<string, Block>();
  const place = new Map<string, number>();
  const ordered = [...shown].sort((a, b) => rankOf(a) - rankOf(b));
  for (const xref of ordered) {
    if (blockOf.has(xref)) {
      continue;
    }
    let members = walkBlock(xref, marriages.spouses);
    const reversed = [...members].reverse();
    if (readsBetter(reversed, members)) {
      members = reversed;
    }
    const [only] = members;
    const block: Block = {
      members,
      ...(members.length === 1 && only !== undefined && childOf.has(only) ? { family: childOf.get(only) } : {}),
      layer: layerOf(xref),
      width: members.length * g.across + (members.length - 1) * g.spouse,
      up: [],
      down: [],
      key: least(members.map(rankOf)),
      rank: least(members.map(rankOf)),
      lane: false,
      kin: new Map(
        members.flatMap((member) => {
          const family = childOf.get(member);
          return family === undefined ? [] : [[family, births.get(member)] as const];
        }),
      ),
      cx: 0,
      home: 0,
      pinned: false,
      dy: 0,
    };
    blocks.push(block);
    members.forEach((member, at) => {
      blockOf.set(member, block);
      place.set(member, at);
    });
  }
  return { blocks, blockOf, place };
}

/**
 * Each block of a row as near its wish as the room allows, without any two
 * touching, a pinned block staying where it is unless the others cannot fit
 * without it moving.
 */
export function resolveCollisions(g: Geometry, layer: Block[], want: readonly number[]): void {
  const n = layer.length;
  const low: number[] = [];
  const high: number[] = [];
  for (let at = 0; at < n; at += 1) {
    const block = layer[at];
    const before = layer[at - 1];
    if (!block) {
      continue;
    }
    const own = block.pinned ? block.home : -Infinity;
    low[at] = Math.max(own, before ? (low[at - 1] ?? -Infinity) + before.width / 2 + gapBetween(g, before, block) + block.width / 2 : -Infinity);
  }
  for (let at = n - 1; at >= 0; at -= 1) {
    const block = layer[at];
    const after = layer[at + 1];
    if (!block) {
      continue;
    }
    const own = block.pinned ? block.home : Infinity;
    high[at] = Math.min(own, after ? (high[at + 1] ?? Infinity) - after.width / 2 - gapBetween(g, block, after) - block.width / 2 : Infinity);
  }
  layer.forEach((block, at) => {
    const wish = block.pinned ? block.home : (want[at] ?? block.cx);
    const lo = low[at] ?? -Infinity;
    const hi = high[at] ?? Infinity;
    block.cx = lo > hi ? lo : Math.min(Math.max(wish, lo), hi);
  });
  const first = layer[0];
  if (first && !Number.isFinite(first.cx)) {
    first.cx = first.width / 2;
  }
  for (let at = 1; at < n; at += 1) {
    const block = layer[at];
    const before = layer[at - 1];
    if (block && before) {
      block.cx = Math.max(block.cx, before.cx + before.width / 2 + gapBetween(g, before, block) + block.width / 2);
    }
  }
}

/**
 * With slack granted, a block that the row would push far from its wish may
 * stand a step off the row's line instead, where it meets only the blocks that
 * stand there with it. Returns the step used, or 0.
 */
export function staggerRow(g: Geometry, layer: Block[], want: readonly number[], slack: number): number {
  const step = g.along + g.sibling;
  if (slack * (g.along + g.rowGap) < step) {
    return 0;
  }
  let used = 0;
  const edge = [-Infinity, -Infinity];
  const settled = layer.map((block) => block.cx);
  layer.forEach((block, at) => {
    const wish = block.pinned ? block.home : (want[at] ?? block.cx);
    const left = wish - block.width / 2;
    const onLine = left >= (edge[0] ?? -Infinity) + g.block;
    const off = left >= (edge[1] ?? -Infinity) + g.block;
    const pushed = Math.abs((settled[at] ?? wish) - wish) > g.across;
    if (onLine || block.pinned || block.lane || !off || !pushed) {
      const lowest = (edge[0] ?? -Infinity) + g.block + block.width / 2;
      block.cx = Math.max(onLine ? wish : (settled[at] ?? wish), lowest);
      block.dy = 0;
      edge[0] = block.cx + block.width / 2;
      return;
    }
    block.cx = wish;
    block.dy = step;
    used = step;
    edge[1] = wish + block.width / 2;
  });
  return used;
}

export function placeCards(
  g: Geometry,
  layers: Block[][],
  bands: readonly GraphBand[],
  minX: number,
): { cards: GraphCard[]; card: Map<string, GraphCard> } {
  const cards: GraphCard[] = [];
  const card = new Map<string, GraphCard>();
  layers.forEach((layer, row) => {
    const band = bands[row] ?? { top: 0, bottom: g.along };
    for (const block of layer) {
      block.cx -= minX;
      block.members.forEach((id, at) => {
        const placed = {
          id,
          row: block.layer,
          x: leftOf(block) + at * g.pitch,
          y: band.top + block.dy,
          width: g.across,
          height: g.along,
        };
        cards.push(placed);
        card.set(id, placed);
      });
    }
  });
  return { cards, card };
}
