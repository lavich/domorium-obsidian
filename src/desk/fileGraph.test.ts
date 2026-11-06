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
  layoutGraph,
  marriageDigits,
  ROW_GAP,
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
        found.push(`${before.id}/${card.id}`);
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
    layout.bands.slice(1).forEach((band, at) => expect(band.top - (layout.bands[at]?.bottom ?? 0)).toBe(ROW_GAP));
    expect(layout.cards.every((card) => card.y + card.height === layout.bands[card.row]?.bottom)).toBe(true);
    expect(layout.cards.every((card) => card.height === CARD.height)).toBe(true);
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
    expect(curies?.y).toBe(at(layout, "@I1@").y + at(layout, "@I1@").height - CARD.height / 2);
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

  it("puts the node of spouses rows apart in the gap under the upper spouse, off every card", () => {
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
    expect(wife.row - man.row).toBeGreaterThan(1);
    expect(node?.x).toBe(man.x + CARD.width / 2);
    expect(node?.y).toBeGreaterThan(man.y + CARD.height);
    expect(node?.y).toBeLessThan(man.y + man.height + ROW_GAP);
    expect(node?.joins.at(-1)?.at(-1)).toEqual([wife.x + CARD.width / 2, wife.y]);
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
    expect(line?.points).toContainEqual([laneX, sister.y - 10]);
    expect(line?.points).toContainEqual([laneX, sister.y + CARD.height + 10]);
    const inRow = layout.cards.filter((card) => card.row === sister.row);
    expect(inRow.filter((card) => card.x < laneX + LANE / 2 && card.x + CARD.width > laneX - LANE / 2)).toEqual([]);
  });

  it("stands a man left of his wife by their roles where neither states a sex", () => {
    const layout = layoutFileGraph(file(["W:U", "H:U"], [{ id: "F1", husb: "H", wife: "W" }]), WHOLE);

    expect(leftOf(layout, "@H@", "@W@")).toBe(true);
  });

  it("keeps a first wife on the left of a man married twice, and each marriage's child beneath it", () => {
    const layout = layoutFileGraph(
      file(
        ["W:F", "M:M", "V:F", "A:F", "B:M"],
        [
          { id: "F1", husb: "M", wife: "V", children: ["A"] },
          { id: "F2", husb: "M", wife: "W", children: ["B"] },
        ],
      ),
      WHOLE,
    );

    expect(layout.cards.filter((card) => card.row === 0).map((card) => card.id)).toEqual(["@V@", "@M@", "@W@"]);
    expect(leftOf(layout, "@A@", "@B@")).toBe(true);
  });

  it("makes every row one card tall, its nodes at the text's middle", () => {
    const layout = layoutGraph({
      cards: [
        { id: "h", row: 0, sex: "M" },
        { id: "w", row: 0, sex: "F" },
        { id: "c", row: 1, sex: "F" },
      ],
      families: [{ id: "f", spouses: ["h", "w"], children: ["c"], year: 1900 }],
      focus: null,
    });
    const [husband, wife, child] = ["h", "w", "c"].map((id) => layout.card.get(id));

    expect(layout.bands[0]).toEqual({ top: 0, bottom: CARD.height });
    expect(husband).toMatchObject({ y: 0, height: CARD.height });
    expect(wife).toMatchObject({ y: 0, height: CARD.height });
    expect(child?.y).toBe(CARD.height + ROW_GAP);
    expect(layout.node.get("f")?.y).toBe(CARD.height / 2);
    expect(layout.lines[0]?.points.at(-1)).toEqual([(child?.x ?? 0) + CARD.width / 2, child?.y]);
    expect(layout.height).toBe(2 * CARD.height + ROW_GAP);
  });

  it("stands a man with no parents in the row above his daughter, beside his daughter's husband's father", () => {
    const layout = layoutFileGraph(
      file(
        ["N:M", "P:M", "V:M", "F:F", "M:M"],
        [
          { id: "F1", husb: "N", children: ["P"] },
          { id: "F2", husb: "P", children: ["V"] },
          { id: "F3", husb: "V", wife: "F" },
          { id: "F4", husb: "M", children: ["F"] },
        ],
      ),
      WHOLE,
    );
    const row = (id: string) => layout.card.get(`@${id}@`)?.row;

    expect([row("N"), row("P"), row("M"), row("V"), row("F")]).toEqual([0, 1, 1, 2, 2]);
    expect(layout.crossings).toBe(0);
  });

  it("stands brothers and sisters eldest first where no order crosses fewer lines", () => {
    const layout = layoutGraph({
      cards: [
        { id: "p", row: 0, sex: "M" },
        { id: "young", row: 1, sex: "M", born: 1914 },
        { id: "old", row: 1, sex: "M", born: 1901 },
        { id: "none", row: 1, sex: "F" },
      ],
      families: [{ id: "f", spouses: ["p"], children: ["young", "old", "none"], year: null }],
      focus: null,
    });
    const at = (id: string) => layout.card.get(id)?.x ?? NaN;

    expect(at("old")).toBeLessThan(at("young"));
    expect(at("young")).toBeLessThan(at("none"));
  });

  it("keeps the order that crosses fewer lines over the eldest at the left", () => {
    const layout = layoutGraph({
      cards: [
        { id: "q", row: 0, sex: "M" },
        { id: "p", row: 0, sex: "M" },
        { id: "young", row: 1, sex: "M", born: 1914 },
        { id: "old", row: 1, sex: "M", born: 1901 },
        { id: "wife", row: 1, sex: "F" },
      ],
      families: [
        { id: "f", spouses: ["p"], children: ["young", "old"], year: null },
        { id: "g", spouses: ["q"], children: ["wife"], year: null },
        { id: "m", spouses: ["old", "wife"], children: [], year: 1930 },
      ],
      focus: null,
    });

    expect(layout.crossings).toBe(0);
  });

  it("stands siblings with no spouse closer to each other than to anyone else", () => {
    const layout = layoutGraph({
      cards: [
        { id: "p", row: 0, sex: "M" },
        { id: "a", row: 1, sex: "M" },
        { id: "b", row: 1, sex: "F" },
        { id: "c", row: 1, sex: "F" },
      ],
      families: [{ id: "f", spouses: ["p"], children: ["a", "b", "c"], year: null }],
      focus: null,
    });
    const xs = ["a", "b", "c"].map((id) => layout.card.get(id)?.x ?? NaN);

    expect(xs[1] - xs[0]).toBe(CARD.width + 12);
    expect(xs[2] - xs[1]).toBe(CARD.width + 12);
  });

  it("lays out an input of its own, with cards that are not people", () => {
    const layout = layoutGraph({
      cards: [
        { id: "a", row: -1, sex: "M" },
        { id: "b", row: -1, sex: "F" },
        { id: "c", row: 0, sex: "U" },
        { id: "d", row: 0, sex: "U" },
      ],
      families: [{ id: "f", spouses: ["b", "a"], children: ["c", "d"], year: 1900 }],
      focus: "c",
    });

    expect(layout.cards.map((card) => [card.id, card.row])).toEqual([["a", 0], ["b", 0], ["c", 1], ["d", 1]]);
    expect(layout.node.get("f")?.spouses).toEqual(["a", "b"]);
    expect(layout.lines).toHaveLength(2);
  });

  it("draws no line up to a child who stands no lower than their parents, as a loop in the file makes", () => {
    const layout = layoutFileGraph(
      file(
        ["P:M", "Q:F", "A:M", "B:F"],
        [
          { id: "F1", husb: "P", wife: "Q", children: ["A"] },
          { id: "F2", husb: "A", wife: "B", children: ["P"] },
        ],
      ),
      WHOLE,
    );

    for (const line of layout.lines) {
      expect(line.points.at(-1)?.[1], line.child).toBeGreaterThan(line.points[0]?.[1] ?? Infinity);
    }
  });

  it("shares one lane per family and row, and lays out a deep line with many sons quickly", () => {
    const depth = 250;
    const sons = 500;
    const people: string[] = ["R:M", "S:F"];
    const families: Family[] = [];
    let parent = "R";
    for (let level = 0; level < depth; level += 1) {
      people.push(`C${level}:M`, `W${level}:F`);
      families.push({ id: `L${level}`, husb: parent, wife: level === 0 ? "S" : `W${level - 1}`, children: [`C${level}`] });
      parent = `C${level}`;
    }
    const founders = ["T:M", "U:F"];
    const daughters = Array.from({ length: sons }, (_, at) => `D${at}`);
    const boys = Array.from({ length: sons }, (_, at) => `B${at}`);
    people.push(...founders, ...daughters.map((one) => `${one}:F`), ...boys.map((one) => `${one}:M`));
    families.push({ id: "TOP", husb: "T", wife: "U", children: boys });
    families.push({ id: "BOTTOM", husb: parent, wife: `W${depth - 1}`, children: daughters });
    boys.forEach((boy, at) => families.push({ id: `M${at}`, husb: boy, wife: daughters[at] ?? "" }));
    const model = file(people, families);

    const started = performance.now();
    const layout = layoutFileGraph(model, WHOLE);
    const took = performance.now() - started;

    const lanes = new Set(layout.lines.flatMap((line) => line.lanes.map((lane) => `${line.family}|${lane.row}|${lane.x}`)));
    expect(lanes.size).toBeLessThanOrEqual(4 * layout.cards.length);
    expect(new Set(layout.lines.filter((line) => line.family === "@TOP@").flatMap((line) => line.lanes.map((lane) => lane.row))).size).toBe(
      layout.lines.find((line) => line.family === "@TOP@")?.lanes.length,
    );
    expect(took).toBeLessThan(5_000);
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

  it("keeps a tangled file not much wider than its widest row packed", () => {
    const layout = layoutFileGraph(buildFileTimeline(indexOf(tangled(300)), 2026), WHOLE);
    const widths = new Map<number, number>();
    for (const card of layout.cards) {
      widths.set(card.row, (widths.get(card.row) ?? 0) + CARD.width + 72);
    }

    expect(layout.width).toBeLessThan(1.5 * Math.max(...widths.values()));
  });

  it("bends the long lines of each family in a gap at a height of their own", () => {
    const layout = layoutFileGraph(buildFileTimeline(indexOf(tangled(300)), 2026), WHOLE);
    const heights = new Map<string, Set<number>>();
    for (const line of layout.lines) {
      line.points.forEach((point, at) => {
        const next = line.points[at + 1];
        if (next && next[1] - point[1] === 16 && Math.abs(next[0] - point[0]) > CARD.height + ROW_GAP) {
          const gap = layout.bands.findIndex((band) => band.bottom < point[1] && point[1] < band.bottom + ROW_GAP);
          heights.set(`${gap}|${line.family}`, (heights.get(`${gap}|${line.family}`) ?? new Set()).add(point[1]));
        }
      });
    }
    const byGap = new Map<number, number[]>();
    for (const [key, ys] of heights) {
      expect(ys.size, key).toBe(1);
      const gap = Number(key.split("|")[0]);
      byGap.set(gap, [...(byGap.get(gap) ?? []), ...ys]);
    }

    expect(byGap.size).toBeGreaterThan(0);
    for (const ys of byGap.values()) {
      expect(new Set(ys).size).toBe(Math.min(ys.length, 12));
    }
  });

  it("stops sweeping once the clock has run out, keeping the best order so far", () => {
    let now = 0;
    const layout = layoutFileGraph(buildFileTimeline(indexOf(tangled(600)), 2026), WHOLE, () => {
      now += SWEEPS.budget;
      return now;
    });

    expect(layout.sweeps).toBeLessThanOrEqual(1);
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

    expect(layout.cards.map((card) => [card.id, card.row])).toEqual([
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

  it("keeps the four last asked for", () => {
    const model = curie();
    const whole = fileGraphOf(model, WHOLE);
    const branch = (focus: string) => fileGraphOf(model, { focus, up: 1, down: 1 });
    for (const focus of ["@I1@", "@I2@", "@I3@"]) {
      branch(focus);
    }
    expect(fileGraphOf(model, WHOLE)).toBe(whole);
    branch("@I4@");
    branch("@I5@");
    expect(fileGraphOf(model, WHOLE)).toBe(whole);
    for (const focus of ["@I6@", "@I7@", "@I8@", "@I9@"]) {
      branch(focus);
    }
    expect(fileGraphOf(model, WHOLE)).not.toBe(whole);
  });
});
