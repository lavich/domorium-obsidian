import { describe, expect, it } from "vitest";

import { leftOf, type Block } from "./blocks";
import { fixtures } from "./fixtures";
import { runLayout } from "./engine";
import { resolveCollisions, staggerRow } from "./micro";
import { geometryOf, DEFAULT_OPTIONS, type GraphInput } from "./types";

const fixtureInput = (name: string): GraphInput => {
  const one = fixtures().find((fixture) => fixture.name === name);
  if (!one) {
    throw new Error(name);
  }
  return one.input;
};

const rowOf = (input: GraphInput, row: number): string[] => {
  const layout = runLayout(input);
  return layout.cards
    .filter((card) => card.row === row)
    .sort((a, b) => a.x - b.x)
    .map((card) => card.id);
};

const g = geometryOf(DEFAULT_OPTIONS);

function block(width: number, cx: number, extra: Partial<Block> = {}): Block {
  return {
    members: ["x"],
    layer: 0,
    width,
    up: [],
    down: [],
    key: 0,
    rank: 0,
    lane: false,
    kin: new Map(),
    cx,
    home: cx,
    pinned: false,
    dy: 0,
    ...extra,
  };
}

describe("people inside their blocks", () => {
  it("stands a husband to the left of his wife", () => {
    expect(rowOf(fixtureInput("a couple with two children"), 0)).toEqual(["@H@", "@W@"]);
  });

  it("stands a man married three times between two of his wives, all in one row", () => {
    const row = rowOf(fixtureInput("multiple marriages"), 0);

    expect(row).toHaveLength(4);
    expect(row.indexOf("@M@")).toBeGreaterThan(0);
    expect(row.indexOf("@M@")).toBeLessThan(3);
  });

  it("stands the two husbands of a family of two of one sex beside each other with room between", () => {
    const input: GraphInput = {
      cards: [
        { id: "a", row: 0, sex: "M" },
        { id: "b", row: 0, sex: "M" },
        { id: "k", row: 1, sex: "U" },
      ],
      families: [{ id: "f", spouses: ["a", "b"], children: ["k"], year: null }],
      focus: null,
    };
    const layout = runLayout(input);
    const [a, b] = [layout.card.get("a"), layout.card.get("b")];

    expect(Math.abs((a?.x ?? 0) - (b?.x ?? 0))).toBe(g.pitch);
    expect(layout.node.get("f")?.spouses.slice().sort()).toEqual(["a", "b"]);
  });

  it("joins a family of three partners to each with a line of its own", () => {
    const input: GraphInput = {
      cards: [
        { id: "a", row: 0, sex: "M" },
        { id: "b", row: 0, sex: "F" },
        { id: "c", row: 0, sex: "F" },
        { id: "k", row: 1, sex: "U" },
      ],
      families: [{ id: "f", spouses: ["a", "b", "c"], children: ["k"], year: 1900 }],
      focus: null,
    };
    const node = runLayout(input).node.get("f");

    expect(node?.spouses).toHaveLength(2);
    expect(node?.others).toHaveLength(1);
    expect(node?.joins).toHaveLength(3);
  });

  it("keeps the twelve children of one family together under their parents, with another family beside", () => {
    const kids = Array.from({ length: 12 }, (_, at) => `k${at}`);
    const input: GraphInput = {
      cards: [
        { id: "p", row: 0, sex: "M" },
        { id: "q", row: 0, sex: "F" },
        { id: "r", row: 0, sex: "M" },
        ...kids.map((id) => ({ id, row: 1, sex: "U" as const })),
        { id: "solo", row: 1, sex: "U" },
      ],
      families: [
        { id: "big", spouses: ["p", "q"], children: kids, year: null },
        { id: "small", spouses: ["r"], children: ["solo"], year: null },
      ],
      focus: null,
    };
    const row = rowOf(input, 1);
    const at = kids.map((id) => row.indexOf(id)).sort((a, b) => a - b);

    expect(at[11]).toBe((at[0] ?? 0) + 11);
  });
});

describe("collisions in a row", () => {
  it("pushes blocks apart to their gap, never reordering them", () => {
    const row = [block(100, 50), block(100, 60), block(100, 70)];
    resolveCollisions(g, row, [50, 60, 70]);

    expect(row.map((one) => one.cx)).toEqual(row.map((one) => one.cx).slice().sort((a, b) => a - b));
    for (let at = 1; at < row.length; at += 1) {
      const [before, one] = [row[at - 1], row[at]];
      expect(leftOf(one) - ((before).cx + (before).width / 2)).toBeGreaterThanOrEqual(g.block);
    }
  });

  it("keeps a pinned block where it is and moves its neighbours", () => {
    const row = [block(100, 0), block(100, 500, { pinned: true }), block(100, 10)];
    resolveCollisions(g, row, [0, 500, 10]);

    expect(row[1]?.cx).toBe(500);
    expect((row[0]?.cx ?? 0) + 50 + g.block).toBeLessThanOrEqual(500 - 50);
    expect((row[2]?.cx ?? 0) - 50).toBeGreaterThanOrEqual(500 + 50 + g.block);
  });

  it("lets a block stand off the row's line only when slack is granted and the row would push it far", () => {
    const wide = (): Block[] => [block(300, 150), block(300, 200), block(300, 250)];
    const none = wide();
    expect(staggerRow(g, none, [150, 200, 250], 0)).toBe(0);
    const row = wide();
    resolveCollisions(g, row, [150, 200, 250]);
    const step = staggerRow(g, row, [150, 200, 250], 1);

    expect(step).toBeGreaterThan(0);
    expect(row.some((one) => one.dy > 0)).toBe(true);
    const onLine = row.filter((one) => one.dy === 0);
    for (let at = 1; at < onLine.length; at += 1) {
      const [before, one] = [onLine[at - 1], onLine[at]];
      expect(leftOf(one)).toBeGreaterThanOrEqual(before.cx + before.width / 2);
    }
  });
});
