import { describe, expect, it } from "vitest";

import { tangled } from "../../../tests/generated";
import { indexOf } from "../../testing/curie";
import { buildFileTimeline } from "../fileTimeline";
import { graphInputOf } from "../fileGraph";
import { runLayout } from "./engine";
import type { FileGraphLayout, GraphInput } from "./types";

const inputOf = (count: number): GraphInput => graphInputOf(buildFileTimeline(indexOf(tangled(count)), 2026), {});

function overlapping(layout: FileGraphLayout): number {
  let found = 0;
  const rows = new Map<number, typeof layout.cards>();
  for (const card of layout.cards) {
    rows.set(card.row, [...(rows.get(card.row) ?? []), card]);
  }
  for (const cards of rows.values()) {
    cards.sort((a, b) => a.x - b.x);
    cards.slice(1).forEach((card, at) => {
      const before = cards[at];
      if (before && card.x < before.x + before.width) {
        found += 1;
      }
    });
  }
  return found;
}

describe("larger and larger files", () => {
  for (const [count, limit] of [[1_000, 1_500], [5_000, 3_000], [10_000, 4_000]] as const) {
    it(`lays out ${count} people in under ${limit} ms, each once and none overlapping`, () => {
      const input = inputOf(count);
      const started = performance.now();
      const layout = runLayout(input);
      const took = performance.now() - started;

      expect(layout.cards).toHaveLength(input.cards.length);
      expect(new Set(layout.cards.map((card) => card.id)).size).toBe(input.cards.length);
      expect(overlapping(layout)).toBe(0);
      expect(took).toBeLessThan(limit);
    });
  }

  it("gives the same layout whatever the clock says, as long as the work allowed finishes", () => {
    const input = inputOf(2_000);
    const slow = runLayout(input, {}, () => 0);
    const real = runLayout(input);

    expect(real.cards.map((card) => [card.id, card.x, card.y])).toEqual(slow.cards.map((card) => [card.id, card.x, card.y]));
  });

  it("stops early on a clock that has run out, still returning a layout with each person once", () => {
    const input = inputOf(2_000);
    let now = 0;
    const layout = runLayout(input, {}, () => (now += 1_000));

    expect(layout.cards).toHaveLength(input.cards.length);
    expect(overlapping(layout)).toBe(0);
  });

  it("finishes a ladder of forty generations in which every generation marries within the family", () => {
    const cards: GraphInput["cards"] = [];
    const list: GraphInput["families"] = [];
    for (let generation = 0; generation < 40; generation += 1) {
      for (const side of ["a", "b"]) {
        const id = `${side}${generation}`;
        cards.push({ id, row: generation, sex: side === "a" ? "M" : "F" });
      }
      if (generation > 0) {
        const parents = [`a${generation - 1}`, `b${generation - 1}`];
        list.push({ id: `p${generation}`, spouses: parents, children: [`a${generation}`, `b${generation}`], year: null });
      }
      list.push({ id: `m${generation}`, spouses: [`a${generation}`, `b${generation}`], children: [], year: null });
    }
    const layout = runLayout({ cards, families: list, focus: `a39` });

    expect(layout.cards).toHaveLength(80);
    expect(layout.anomalies.filter((one) => one.kind === "cycle")).toEqual([]);
  });
});

describe("a row of a hundred and thirty thousand people", () => {
  it("is laid out without running out of stack on spread arguments", () => {
    const cards: GraphInput["cards"] = Array.from({ length: 130_000 }, (_, at) => ({ id: `p${at}`, row: 0, sex: "U" }));
    const layout = runLayout({ cards, families: [], focus: null });

    expect(layout.cards).toHaveLength(130_000);
  });
});
