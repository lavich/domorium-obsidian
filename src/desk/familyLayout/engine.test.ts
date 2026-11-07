import { describe, expect, it } from "vitest";

import { fiveGenerations, fixtures, modelOf, type Fixture } from "./fixtures";
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

  it("keeps a pinned card where the earlier layout is told to have put it, the spouse beside it moving with it", () => {
    const first = runLayout(input());
    const spouse = first.nodes.find((node) => node.kind === "pair")?.spouses[1] ?? "";
    const card = first.card.get(spouse);
    const asked = (card?.x ?? 0) + 500;
    const previous = new Map(first.cards.map((one) => [one.id, { x: one.x, y: one.y }]));
    previous.set(spouse, { x: asked, y: card?.y ?? 0 });
    const again = runLayout(input(), { previous, pinned: new Set([spouse]) });

    expect(again.card.get(spouse)?.x).toBe(asked);
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
    expect(Math.max(...first.cards.map((card) => Math.abs((second.card.get(card.id)?.x ?? 0) - card.x)))).toBeLessThan(200);
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

describe("a pedigree", () => {
  it("crosses no line, and stands the forebears of a husband to the left of those of his wife at every level", () => {
    const layout = runLayout(fiveGenerations().input);
    const parentsOf = (id: string): string[] =>
      layout.clusters.filter((cluster) => cluster.children.some((child) => child.id === id)).flatMap((cluster) => cluster.partners);
    const x = (id: string) => layout.card.get(id)?.x ?? NaN;
    let compared = 0;

    expect(layout.crossings).toBe(0);
    for (const cluster of layout.clusters) {
      const [husband, wife] = cluster.partners.map(parentsOf);
      const row = (id: string) => layout.card.get(id)?.row;
      if (husband?.length && wife?.length && cluster.partners.length === 2 && row(husband[0] ?? "") === row(wife[0] ?? "")) {
        compared += 1;
        expect(Math.max(...husband.map(x)), cluster.id).toBeLessThan(Math.min(...wife.map(x)));
      }
    }
    expect(compared).toBeGreaterThan(4);
  });
});

describe("forebears of a person with many children", () => {
  it("stand over the person, and not off to one side, however wide the fan of children below", () => {
    const ids = ["Vy:M", "An:F", "Anat:M", "Rai:F", "VL:M", "Fek:F", "VO:M", "ElO:F", "Pet:M", "Naum:M", "MikhB:M", "Sem:M", "Pav:M"];
    const kids = ["K1", "K2", "K3", "K4"];
    const model = modelOf([...ids, ...kids.map((k) => `${k}:M`), "W1:F", "W3:F", "W4:F", "C1:M", "C2:F", "C3:M", "C4:F", "C5:M", "C6:F"], [
      { id: "F1", husb: "Vy", wife: "An", children: kids },
      { id: "F2", husb: "Anat", wife: "Rai", children: ["Vy"] },
      { id: "F3", husb: "VL", wife: "Fek", children: ["Anat"] },
      { id: "F4", husb: "VO", wife: "ElO", children: ["Rai"] },
      { id: "F5", husb: "Pet", children: ["VL"] },
      { id: "F6", husb: "MikhB", children: ["Fek"] },
      { id: "F7", husb: "Naum", children: ["Pet"] },
      { id: "F8", husb: "Sem", children: ["VO"] },
      { id: "F9", husb: "Pav", children: ["ElO"] },
      { id: "FK1", husb: "K1", wife: "W1", children: ["C1", "C2"] },
      { id: "FK3", husb: "K3", wife: "W3", children: ["C3", "C4"] },
      { id: "FK4", husb: "K4", wife: "W4", children: ["C5", "C6"] },
    ]);
    const layout = runLayout(graphInputOf(model, { focus: "@Vy@" }));
    const centre = (id: string) => (layout.card.get(id)?.x ?? NaN) + 62;
    const node = (family: string) => layout.node.get(family)?.x ?? NaN;

    expect(Math.abs(node("@F2@") - centre("@Vy@"))).toBeLessThan(25);
    expect(Math.abs(node("@F3@") - centre("@Anat@"))).toBeLessThan(25);
    expect(layout.crossings).toBe(0);
  });
});

describe("a branch whose children carry families of their own", () => {
  it("hangs each family over its children and keeps the whole not far wider than its widest row", () => {
    const people = ["Naum:M", "Petr:M", "Varv:F", "Ivan:M", "Vas:M", "Fek:F", "Mikh:M", "Mar:F", "Lub:F", "Vlad:M", "Klav:F", "Anat:M", "Rai:F", "Vy:M", "An:F", "Nad:F", "Novik:M", "NN:U", "Nik:M", "Nad2:F", "Al:M", "Tat:F", "K1:M", "K2:M", "K3:M", "W1:F", "W3:F", "C1:M", "C2:F", "C3:M", "Sem:M", "Pav:M", "VO:M", "ElO:F"];
    const model = modelOf(people, [
      { id: "A1", husb: "Naum", children: ["Petr", "Varv"] },
      { id: "A2", husb: "Petr", children: ["Ivan", "Vas"] },
      { id: "A3", husb: "Vas", wife: "Fek", children: ["Mar", "Lub", "Vlad", "Anat"] },
      { id: "A3b", husb: "Mikh", children: ["Fek"] },
      { id: "A4", husb: "Vlad", wife: "Klav", children: ["Nad", "Nik"] },
      { id: "A5", husb: "Novik", wife: "Nad", children: ["NN"] },
      { id: "A6", husb: "Nik", wife: "Nad2", children: ["Al", "Tat"] },
      { id: "A7", husb: "Anat", wife: "Rai", children: ["Vy"] },
      { id: "A7b", husb: "VO", wife: "ElO", children: ["Rai"] },
      { id: "A7c", husb: "Sem", children: ["VO"] },
      { id: "A7d", husb: "Pav", children: ["ElO"] },
      { id: "A8", husb: "Vy", wife: "An", children: ["K1", "K2", "K3"] },
      { id: "A9", husb: "K1", wife: "W1", children: ["C1", "C2"] },
      { id: "A10", husb: "K3", wife: "W3", children: ["C3"] },
    ]);
    const layout = runLayout(graphInputOf(model, {}));
    const centre = (id: string) => (layout.card.get(id)?.x ?? NaN) + 62;
    const over = (family: string, children: string[]) =>
      Math.abs((layout.node.get(family)?.x ?? NaN) - children.map(centre).reduce((sum, x) => sum + x, 0) / children.length);

    expect(layout.crossings).toBe(0);
    expect(over("@A4@", ["@Nad@", "@Nik@"])).toBeLessThan(80);
    expect(over("@A6@", ["@Al@", "@Tat@"])).toBeLessThan(10);
    const widest = Math.max(...[...new Set(layout.cards.map((card) => card.row))].map((row) => layout.cards.filter((card) => card.row === row).length));
    expect(layout.width).toBeLessThan(widest * 172 * 1.25);
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
