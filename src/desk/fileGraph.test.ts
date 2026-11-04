import { describe, expect, it } from "vitest";

import { tangled } from "../../tests/generated";
import { curieIndex, indexOf } from "../testing/curie";
import { buildFileTimeline, type FileTimeline } from "./fileTimeline";
import {
  CARD,
  countCrossings,
  fileGraphOf,
  LANE,
  layoutFileGraph,
  marriageDigits,
  ROW_PITCH,
  SWEEPS,
  type FileGraphLayout,
  type GraphCard,
} from "./fileGraph";

const WHOLE = { up: 2, down: 2 };

const curie = (): FileTimeline => buildFileTimeline(curieIndex(), 2026);

interface Family {
  id: string;
  husb?: string;
  wife?: string;
  children?: string[];
  date?: string;
}

/** People as `id:sex`, with the FAMC and FAMS links their families imply. */
function file(people: string[], families: Family[]): FileTimeline {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
  for (const one of people) {
    const [id = "", sex = "U"] = one.split(":");
    lines.push(`0 @${id}@ INDI`, `1 NAME ${id} /Test/`, `1 SEX ${sex}`);
    for (const family of families) {
      if (family.children?.includes(id)) {
        lines.push(`1 FAMC @${family.id}@`);
      }
      if (family.husb === id || family.wife === id) {
        lines.push(`1 FAMS @${family.id}@`);
      }
    }
  }
  for (const family of families) {
    lines.push(`0 @${family.id}@ FAM`);
    if (family.husb) {
      lines.push(`1 HUSB @${family.husb}@`);
    }
    if (family.wife) {
      lines.push(`1 WIFE @${family.wife}@`);
    }
    for (const child of family.children ?? []) {
      lines.push(`1 CHIL @${child}@`);
    }
    if (family.date) {
      lines.push("1 MARR", `2 DATE ${family.date}`);
    }
  }
  lines.push("0 TRLR", "");
  return buildFileTimeline(indexOf(lines.join("\n")), 2026);
}

const at = (layout: FileGraphLayout, xref: string): GraphCard => {
  const found = layout.card.get(xref);
  if (!found) {
    throw new Error(`no card for ${xref}`);
  }
  return found;
};

const leftOf = (layout: FileGraphLayout, one: string, other: string): boolean =>
  at(layout, one).row === at(layout, other).row && at(layout, one).x < at(layout, other).x;

function overlapping(layout: FileGraphLayout): string[] {
  const found: string[] = [];
  const byRow = new Map<number, GraphCard[]>();
  for (const card of layout.cards) {
    byRow.set(card.row, [...(byRow.get(card.row) ?? []), card]);
  }
  for (const row of byRow.values()) {
    const sorted = [...row].sort((a, b) => a.x - b.x);
    sorted.slice(1).forEach((card, index) => {
      const before = sorted[index];
      if (before && before.x + CARD.width > card.x) {
        found.push(`${before.xref}/${card.xref}`);
      }
    });
  }
  return found;
}

describe("the layout of curie.ged", () => {
  const layout = layoutFileGraph(curie(), WHOLE);

  it("has a card for each of 17 people in four rows, none overlapping", () => {
    expect(layout.cards).toHaveLength(17);
    expect(layout.rows).toBe(4);
    expect(new Set(layout.cards.map((card) => card.y))).toEqual(new Set([0, 1, 2, 3].map((row) => row * ROW_PITCH)));
    expect(overlapping(layout)).toEqual([]);
  });

  it("puts each husband left of his wife, and each side's family on its side", () => {
    expect(leftOf(layout, "@I2@", "@I1@")).toBe(true);
    expect(leftOf(layout, "@I11@", "@I2@")).toBe(true);
    for (const sister of ["@I5@", "@I6@", "@I7@", "@I8@"]) {
      expect(leftOf(layout, "@I1@", sister), sister).toBe(true);
    }
    for (const curie of ["@I9@", "@I10@"]) {
      for (const sklodowski of ["@I3@", "@I4@"]) {
        expect(leftOf(layout, curie, sklodowski), `${curie} ${sklodowski}`).toBe(true);
      }
    }
    expect(leftOf(layout, "@I14@", "@I12@")).toBe(true);
    expect(leftOf(layout, "@I15@", "@I13@")).toBe(true);
    expect(leftOf(layout, "@I16@", "@I17@")).toBe(true);
  });

  it("joins each couple by a node between them, with the year of the marriage or hollow", () => {
    const digits = layout.nodes.map((node) => [node.family, node.kind, node.year === null ? null : marriageDigits(node.year)]);

    expect(digits).toEqual([
      ["@F1@", "pair", "’60"],
      ["@F2@", "pair", null],
      ["@F3@", "pair", "’95"],
      ["@F4@", "pair", "’26"],
      ["@F5@", "pair", "’54"],
    ]);
    const curies = layout.node.get("@F3@");
    expect(curies?.x).toBeGreaterThan(at(layout, "@I2@").x + CARD.width);
    expect(curies?.x).toBeLessThan(at(layout, "@I1@").x);
    expect(curies?.y).toBe(at(layout, "@I1@").y + CARD.height / 2);
  });

  it("runs eleven lines from the families to the children's cards, none crossing", () => {
    expect(layout.lines).toHaveLength(11);
    expect(layout.crossings).toBe(0);
    const toIrene = layout.lines.find((line) => line.child === "@I12@");
    expect(toIrene?.points[0]).toEqual([layout.node.get("@F3@")?.x, layout.node.get("@F3@")?.y]);
    expect(toIrene?.points.at(-1)).toEqual([at(layout, "@I12@").x + CARD.width / 2, at(layout, "@I12@").y]);
    expect(toIrene?.points[1]?.[0]).toBe(layout.node.get("@F3@")?.x);
    expect(toIrene?.points[1]?.[1]).toBeGreaterThan(at(layout, "@I1@").y + CARD.height);
  });
});

describe("the families the Curies do not have", () => {
  it("leaves a family with one parent without a node, its lines from the parent's card", () => {
    const layout = layoutFileGraph(file(["A:M", "K:F"], [{ id: "F1", husb: "A", children: ["K"] }]), WHOLE);

    expect(layout.nodes).toEqual([]);
    expect(layout.lines[0]?.points[0]).toEqual([at(layout, "@A@").x + CARD.width / 2, CARD.height]);
  });

  it("puts the node of a marriage between spouses who are not neighbours below their block", () => {
    const layout = layoutFileGraph(
      file(
        ["A:M", "B:F", "C:F", "D:F", "K:F"],
        [
          { id: "F1", husb: "A", wife: "B" },
          { id: "F2", husb: "A", wife: "C" },
          { id: "F3", husb: "A", wife: "D", children: ["K"] },
        ],
      ),
      WHOLE,
    );
    const below = layout.nodes.filter((node) => node.kind === "below");

    expect(layout.nodes.filter((node) => node.kind === "pair")).toHaveLength(2);
    expect(below).toHaveLength(1);
    const [one = "", other = ""] = below[0]?.spouses ?? [];
    expect(below[0]?.y).toBeGreaterThan(CARD.height);
    expect(below[0]?.x).toBe((at(layout, one).x + at(layout, other).x + CARD.width) / 2);
    expect(below[0]?.joins).toHaveLength(2);
  });

  it("puts the node of spouses in different rows on the curve between them", () => {
    const layout = layoutFileGraph(
      file(
        ["M:M", "W:F", "C:M", "V:F", "G:F", "K:M"],
        [
          { id: "F1", husb: "M", wife: "W", children: ["C"] },
          { id: "F2", husb: "C", wife: "V", children: ["G"] },
          { id: "F3", husb: "M", wife: "G", children: ["K"] },
        ],
      ),
      WHOLE,
    );
    const node = layout.node.get("@F3@");
    const man = at(layout, "@M@");
    const wife = at(layout, "@G@");

    expect(man.row).not.toBe(wife.row);
    expect(node?.kind).toBe("across");
    expect(node?.spouses).toEqual(["@M@", "@G@"]);
    expect(node?.x).toBe((man.x + wife.x + CARD.width) / 2);
    expect(node?.y).toBe((man.y + CARD.height + wife.y) / 2);
    expect(layout.lines.find((line) => line.family === "@F3@")?.points[0]).toEqual([node?.x, node?.y]);
    expect(overlapping(layout)).toEqual([]);
  });

  it("fills the node of a marriage before the era, with no digits", () => {
    const layout = layoutFileGraph(file(["A:M", "B:F"], [{ id: "F1", husb: "A", wife: "B", date: "500 BCE" }]), WHOLE);

    expect(layout.node.get("@F1@")?.year).toBeLessThan(0);
    expect(marriageDigits(layout.node.get("@F1@")?.year ?? 0)).toBe("");
    expect(marriageDigits(1905)).toBe("’05");
  });

  it("takes the line to a man who married his sister's daughter through a lane in his sister's row", () => {
    const layout = layoutFileGraph(
      file(
        ["P:M", "Q:F", "S:F", "M:M", "H:M", "N:F"],
        [
          { id: "F1", husb: "P", wife: "Q", children: ["S", "M"] },
          { id: "F2", husb: "H", wife: "S", children: ["N"] },
          { id: "F3", husb: "M", wife: "N" },
        ],
      ),
      WHOLE,
    );
    const sister = at(layout, "@S@");
    const line = layout.lines.find((one) => one.child === "@M@");
    const laneX = line?.lanes[0]?.x ?? NaN;

    expect(at(layout, "@M@").row).toBe(sister.row + 1);
    expect(line?.lanes).toEqual([{ row: sister.row, x: laneX }]);
    const through = line?.points.filter((point) => point[1] >= sister.y && point[1] <= sister.y + CARD.height) ?? [];
    expect(through).toEqual([]);
    expect(line?.points.filter((point) => point[0] === laneX)).toHaveLength(2);
    const inRow = layout.cards.filter((card) => card.row === sister.row);
    expect(inRow.filter((card) => card.x < laneX + LANE / 2 && card.x + CARD.width > laneX - LANE / 2)).toEqual([]);
  });

  it("lays out five thousand people married in a chain without running out of stack", () => {
    const count = 5_000;
    const people = Array.from({ length: count }, (_, index) => `P${index}:${index % 2 === 0 ? "M" : "F"}`);
    const families = Array.from({ length: count - 1 }, (_, index) => {
      const [husb, wife] = index % 2 === 0 ? [`P${index}`, `P${index + 1}`] : [`P${index + 1}`, `P${index}`];
      return { id: `F${index}`, husb, wife };
    });
    const layout = layoutFileGraph(file(people, families), WHOLE);

    expect(layout.cards).toHaveLength(count);
    expect(layout.rows).toBe(1);
    expect(overlapping(layout)).toEqual([]);
  });
});

describe("the order of the rows", () => {
  function seeded(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
      return state / 2_147_483_648;
    };
  }

  it("counts crossings as a comparison of every pair of lines would", () => {
    const random = seeded(3);
    for (let round = 0; round < 50; round += 1) {
      const segments = Array.from({ length: 2 + Math.floor(random() * 60) }, (): [number, number] => [
        Math.floor(random() * 12),
        Math.floor(random() * 12),
      ]);
      let pairwise = 0;
      segments.forEach((one, index) => {
        for (const other of segments.slice(index + 1)) {
          if ((one[0] - other[0]) * (one[1] - other[1]) < 0) {
            pairwise += 1;
          }
        }
      });
      expect(countCrossings(segments)).toBe(pairwise);
    }
  });

  it("ends a tangled file with fewer crossings than it starts with", () => {
    const layout = layoutFileGraph(buildFileTimeline(indexOf(tangled(600)), 2026), WHOLE);

    expect(layout.crossingsAtStart).toBeGreaterThan(0);
    expect(layout.crossings).toBeLessThan(layout.crossingsAtStart);
    expect(layout.sweeps).toBeLessThanOrEqual(SWEEPS.most);
    expect(overlapping(layout)).toEqual([]);
  });

  it("stops after the first sweep once the clock has run out, keeping the best order so far", () => {
    let now = 0;
    const layout = layoutFileGraph(buildFileTimeline(indexOf(tangled(600)), 2026), WHOLE, () => {
      now += SWEEPS.budget;
      return now;
    });

    expect(layout.sweeps).toBe(1);
    expect(layout.crossings).toBeLessThanOrEqual(layout.crossingsAtStart);
  });
});

describe("a branch", () => {
  it("shows Irène's ten people in four rows", () => {
    const layout = layoutFileGraph(curie(), { focus: "@I12@", up: 2, down: 2 });

    expect(layout.cards).toHaveLength(10);
    expect(layout.rows).toBe(4);
    expect(layout.focus).toBe("@I12@");
    expect(overlapping(layout)).toEqual([]);
  });

  it("shows Marie with no ancestors and no descendants in one row, beside Pierre", () => {
    const layout = layoutFileGraph(curie(), { focus: "@I1@", up: 0, down: 0 });

    expect(layout.cards.map((card) => [card.xref, card.row])).toEqual([
      ["@I2@", 0],
      ["@I1@", 0],
    ]);
  });
});

describe("the layouts held for a model", () => {
  it("answers one layout for the whole file whatever the steps, and for a focus it does not know", () => {
    const model = curie();
    const whole = fileGraphOf(model, WHOLE);

    expect(fileGraphOf(model, { up: 5, down: 0 })).toBe(whole);
    expect(fileGraphOf(model, { focus: "@I99@", up: 1, down: 1 })).toBe(whole);
    expect(fileGraphOf(model, { focus: "@I12@", up: 2, down: 2 })).not.toBe(whole);
    expect(fileGraphOf(model, { focus: "@I12@", up: 2, down: 2 })).toBe(
      fileGraphOf(model, { focus: "@I12@", up: 2, down: 2 }),
    );
    expect(fileGraphOf(curie(), WHOLE)).not.toBe(whole);
  });

  it("keeps the last four", () => {
    const model = curie();
    const whole = fileGraphOf(model, WHOLE);
    for (const focus of ["@I1@", "@I2@", "@I3@"]) {
      fileGraphOf(model, { focus, up: 1, down: 1 });
    }
    expect(fileGraphOf(model, WHOLE)).toBe(whole);
    fileGraphOf(model, { focus: "@I4@", up: 1, down: 1 });
    fileGraphOf(model, { focus: "@I5@", up: 1, down: 1 });
    expect(fileGraphOf(model, WHOLE)).not.toBe(whole);
  });
});
