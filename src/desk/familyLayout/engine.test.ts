import { describe, expect, it } from "vitest";

import { fixtures, modelOf, type Fixture } from "./fixtures";
import { runLayout } from "./engine";
import { graphInputOf } from "../fileGraph";
import type { Direction, FileGraphLayout, GraphInput } from "./types";

function overlapping(layout: FileGraphLayout): string[] {
  const found: string[] = [];
  const sorted = [...layout.cards].sort((a, b) => a.x - b.x);
  sorted.forEach((one, at) => {
    for (const other of sorted.slice(at + 1)) {
      if (other.x >= one.x + one.width) {
        break;
      }
      if (other.y < one.y + one.height && one.y < other.y + other.height) {
        found.push(`${one.id}/${other.id}`);
      }
    }
  });
  return found;
}

const shape = (layout: FileGraphLayout): unknown => ({
  cards: layout.cards.map((card) => [card.id, card.x, card.y]),
  nodes: layout.nodes.map((node) => [node.family, node.x, node.y]),
  lines: layout.lines.map((line) => [line.id, line.points]),
});

describe("every fixture of the brief", () => {
  for (const one of fixtures()) {
    describe(one.name, () => {
      const layout = runLayout(one.input);

      it("shows each person once and overlaps none", () => {
        expect(layout.cards.map((card) => card.id).sort()).toEqual([...one.people].sort());
        expect(overlapping(layout)).toEqual([]);
      });

      it("keeps every parent above the child the file gives them, where the generations are not in doubt", () => {
        const doubtful = new Set(layout.anomalies.filter((one) => one.kind === "ambiguous-generation").map((a) => a.person));
        for (const [parent, child] of one.parentage) {
          const [upper, lower] = [layout.card.get(parent), layout.card.get(child)];
          if (!upper || !lower || doubtful.has(child)) {
            continue;
          }
          expect(lower.row, `${parent} > ${child}`).toBeGreaterThanOrEqual(upper.row);
        }
      });

      it("draws a line for every parent-child link it can place, and only those", () => {
        const placed = new Set(layout.lines.map((line) => `${line.family}|${line.child}`));
        expect(placed.size).toBe(layout.lines.filter((line) => !line.id.includes("#")).length);
        for (const line of layout.lines) {
          expect(layout.card.has(line.child)).toBe(true);
          expect(line.points.length).toBeGreaterThanOrEqual(2);
        }
      });

      it("is the same twice", () => {
        expect(shape(runLayout(one.input))).toEqual(shape(layout));
      });

      it("ends with no more crossings than it starts with and no overlap", () => {
        expect(layout.crossings).toBeLessThanOrEqual(layout.crossingsAtStart);
        expect(layout.energy.end.overlap).toBe(0);
      });

      it("holds each cluster's partners and children as the file writes them", () => {
        for (const cluster of layout.clusters) {
          for (const id of [...cluster.partners, ...cluster.children.map((child) => child.id)]) {
            expect(layout.card.has(id)).toBe(true);
          }
        }
      });
    });
  }
});

describe("the same file with its children in another order", () => {
  it("places every card where it was, to within a pixel, on every fixture", () => {
    const at = (layout: FileGraphLayout) =>
      layout.cards.map((card) => [card.id, Math.round(card.x), Math.round(card.y)]).sort();
    for (const one of fixtures()) {
      const reversed: GraphInput = {
        ...one.input,
        families: one.input.families.map((family) => ({ ...family, children: [...family.children].reverse() })),
      };
      expect(at(runLayout(reversed)), one.name).toEqual(at(runLayout(one.input)));
    }
  });
});

describe("the four directions", () => {
  const one = fixtures().find((fixture): fixture is Fixture => fixture.name === "siblings with independent families");
  const make = (direction: Direction) => runLayout(one?.input ?? { cards: [], families: [], focus: null }, { direction });
  const rowOrder = (layout: FileGraphLayout, direction: Direction): string[][] => {
    const turned = direction === "LR" || direction === "RL";
    const rows = new Map<number, typeof layout.cards>();
    for (const card of layout.cards) {
      rows.set(card.row, [...(rows.get(card.row) ?? []), card]);
    }
    return [...rows.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, cards]) => cards.sort((a, b) => (turned ? a.y - b.y : a.x - b.x)).map((card) => card.id));
  };

  it("keeps the order of each generation and overlaps nothing in any of them", () => {
    const base = rowOrder(make("TB"), "TB");
    for (const direction of ["BT", "LR", "RL"] as const) {
      const layout = make(direction);
      expect(rowOrder(layout, direction), direction).toEqual(base);
      expect(overlapping(layout), direction).toEqual([]);
    }
  });

  it("runs the generations along the axis asked for", () => {
    const first = (layout: FileGraphLayout, row: number) => layout.cards.find((card) => card.row === row);
    const lr = make("LR");
    const rl = make("RL");
    const bt = make("BT");
    expect(first(lr, 0)?.x).toBeLessThan(first(lr, 1)?.x ?? -1);
    expect(first(rl, 0)?.x).toBeGreaterThan(first(rl, 1)?.x ?? Infinity);
    expect(first(bt, 0)?.y).toBeGreaterThan(first(bt, 1)?.y ?? Infinity);
    expect(first(lr, 0)?.width).toBe(124);
    expect(first(lr, 0)?.height).toBe(58);
    const band = lr.bands[0];
    expect((band?.bottom ?? 0) - (band?.top ?? 0)).toBe(124);
  });
});

describe("stability", () => {
  const input = (): GraphInput => fixtures().find((one) => one.name === "a large extended family")?.input as GraphInput;

  it("keeps a pinned card at the place it was given", () => {
    const first = runLayout(input());
    const card = first.cards[3];
    const again = runLayout(input(), {
      previous: new Map(first.cards.map((one) => [one.id, { x: one.x, y: one.y }])),
      pinned: new Set(card ? [card.id] : []),
    });
    expect(again.card.get(card?.id ?? "")?.x).toBe(card?.x);
    expect(overlapping(again)).toEqual([]);
  });

  it("moves few cards when a child is added and the old positions are given back", () => {
    const people = ["H:M", "W:F", "A:M", "B:F", "C:M", "D:F", "E:M"];
    const before = modelOf(people, [
      { id: "F1", husb: "H", wife: "W", children: ["A", "B", "C"] },
      { id: "F2", husb: "E", wife: "D", children: [] },
    ]);
    const first = runLayout(graphInputOf(before, {}));
    const after = modelOf([...people, "X:M"], [
      { id: "F1", husb: "H", wife: "W", children: ["A", "B", "C", "X"] },
      { id: "F2", husb: "E", wife: "D", children: [] },
    ]);
    const second = runLayout(graphInputOf(after, {}), {
      previous: new Map(first.cards.map((one) => [one.id, { x: one.x, y: one.y }])),
    });
    const moved = first.cards.filter((card) => Math.abs((second.card.get(card.id)?.x ?? 0) - card.x) > 200);
    expect(moved.map((card) => card.id)).toEqual([]);
  });

  it("lets a card stand off its line only when slack is granted, and then overlaps none", () => {
    const plain = runLayout(input());
    const loose = runLayout(input(), { generationSlack: 1 });
    expect(plain.cards.every((card) => plain.bands[card.row]?.bottom === card.y + card.height)).toBe(true);
    expect(overlapping(loose)).toEqual([]);
    for (const card of loose.cards) {
      const band = loose.bands[card.row];
      expect(card.y).toBeGreaterThanOrEqual(band?.top ?? 0);
      expect(card.y + card.height).toBeLessThanOrEqual(band?.bottom ?? 0);
    }
  });
});

describe("the energy", () => {
  it("is no worse at the end than at the start in distance and in the separation of a family, on the large family", () => {
    const one = fixtures().find((fixture) => fixture.name === "a large extended family");
    const { start, end } = runLayout(one?.input as GraphInput).energy;

    expect(end.distance).toBeLessThanOrEqual(start.distance);
    expect(end.cluster).toBeLessThanOrEqual(start.cluster);
    expect(end.overlap).toBe(0);
  });
});

describe("generation", () => {
  it("stands an uncle born after his nephew in his own generation, the nephew's father's", () => {
    const model = modelOf(["G:M:1800", "A:M:1830", "B:M:1960", "N:M:1950"], [
      { id: "F0", husb: "G", children: ["A", "B"] },
      { id: "F1", husb: "A", children: ["N"] },
    ]);
    const layout = runLayout(graphInputOf(model, {}));

    expect(layout.card.get("@B@")?.row).toBe(layout.card.get("@A@")?.row);
    expect(layout.card.get("@N@")?.row).toBeGreaterThan(layout.card.get("@B@")?.row ?? Infinity);
  });
});

describe("the weights", () => {
  it("keeps the generations in order and overlaps nothing however much distance weighs", () => {
    const one = fixtures().find((fixture) => fixture.name === "a large extended family");
    const layout = runLayout(one?.input as GraphInput, { weights: { distance: 1_000_000 } });
    expect(overlapping(layout)).toEqual([]);
    for (const line of layout.lines) {
      const [parent, child] = [layout.card.get(line.parents[0] ?? ""), layout.card.get(line.child)];
      expect(child?.row ?? 0).toBeGreaterThan(parent?.row ?? 0);
    }
  });
});
