import type { Geometry, GraphInput, GraphInputFamily, LinkKind } from "./types";

/** What the macro stage moves: a chain of spouses standing in one row, a person alone, or a lane for a long line. */
export interface Block {
  members: string[];
  layer: number;
  width: number;
  up: BlockLink[];
  down: BlockLink[];
  key: number;
  lane: boolean;
  /** For a person standing alone: the family they are a child of, beside whose other children they stand closer. */
  family?: string;
  /** The families the block's members are children of, with the year each was born. */
  kin: Map<string, number | undefined>;
  cx: number;
  /** The rank the structure from the root gives the block, to order it where nothing else does. */
  rank: number;
  /** Where the block stood in the initial placement, or in the layout given as previous. */
  home: number;
  pinned: boolean;
  /** How far the block stands off its row's line, along the axis of generations. */
  dy: number;
}

export interface BlockLink {
  to: Block;
  /** The anchor's offset from the left of the block at the other end. */
  far: number;
  /** The anchor's offset from the left of this block. */
  near: number;
}

export interface Edge {
  family: string;
  parents: string[];
  child: string;
  lanes: Block[];
  relationship: LinkKind;
}

export interface Indexed {
  shown: string[];
  on: Set<string>;
  rowIndex: Map<string, number>;
  generations: number[];
  layerOf: (id: string) => number;
}

export interface Marriages {
  spouses: Map<string, string[]>;
  husbands: Set<string>;
  marriedAt: Map<string, number>;
}

export type Late = (budget: number) => boolean;

export const leftOf = (block: Block): number => block.cx - block.width / 2;

export const gapBetween = (g: Geometry, a: Block, b: Block): number =>
  a.lane || b.lane ? g.laneGap : a.family !== undefined && a.family === b.family ? g.sibling : g.block;

export function indexCards(input: GraphInput): Indexed {
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
  };
}

export function mapMarriages(families: readonly GraphInputFamily[], index: Indexed): Marriages {
  const { shown, on, layerOf } = index;
  const spouses = new Map<string, string[]>(shown.map((id) => [id, []]));
  const husbands = new Set<string>();
  const marriedAt = new Map<string, number>();
  families.forEach((family, at) => {
    const present = family.spouses.filter((id) => on.has(id));
    for (let from = 0; from < present.length; from += 1) {
      for (let to = from + 1; to < present.length; to += 1) {
        const a = present[from] ?? "";
        const b = present[to] ?? "";
        husbands.add(`${a}|${b}`);
        for (const key of [`${a}|${b}`, `${b}|${a}`]) {
          if (!marriedAt.has(key)) {
            marriedAt.set(key, at);
          }
        }
        if (layerOf(a) === layerOf(b) && !(spouses.get(a) ?? []).includes(b)) {
          spouses.get(a)?.push(b);
          spouses.get(b)?.push(a);
        }
      }
    }
  });
  return { spouses, husbands, marriedAt };
}

/** Each block at least its gap from the one before it. */
export function keepGaps(g: Geometry, layer: Block[]): void {
  layer.forEach((block, at) => {
    const before = layer[at - 1];
    if (before) {
      block.cx = Math.max(block.cx, before.cx + before.width / 2 + gapBetween(g, before, block) + block.width / 2);
    }
  });
}

/** Every stretch of x where no row has a block is shortened to `most`, the same for every row. */
export function squeeze(blocks: Block[], most: number): void {
  const spans = blocks.map((block) => [leftOf(block), block.cx + block.width / 2] as const).sort((a, b) => a[0] - b[0]);
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
  for (const block of blocks) {
    const left = leftOf(block);
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
    block.cx -= cuts[low - 1]?.by ?? 0;
  }
}

export function pack(g: Geometry, layer: Block[]): void {
  let x = 0;
  layer.forEach((block, at) => {
    const before = layer[at - 1];
    if (before) {
      x += gapBetween(g, before, block);
    }
    block.cx = x + block.width / 2;
    x += block.width;
  });
}
