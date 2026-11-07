import { indexOf } from "../../testing/curie";
import { buildFileTimeline, type FileTimeline } from "../fileTimeline";
import { graphInputOf } from "../fileGraph";
import type { GraphInput, LinkKind } from "./types";

export interface Kin {
  id: string;
  husb?: string;
  wife?: string;
  /** Further partners, written as extra `HUSB` lines. */
  also?: string[];
  children?: string[];
  date?: string;
  links?: Record<string, LinkKind>;
}

/** People as `id:sex[:born]`, with the FAMC and FAMS links their families imply. */
export function gedcom(people: string[], families: Kin[]): string {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
  for (const one of people) {
    const [id = "", sex = "U", born] = one.split(":");
    lines.push(`0 @${id}@ INDI`, `1 NAME ${id} /Test/`, `1 SEX ${sex}`);
    if (born) {
      lines.push("1 BIRT", `2 DATE ${born}`);
    }
    for (const family of families) {
      if (family.children?.includes(id)) {
        lines.push(`1 FAMC @${family.id}@`);
        const kind = family.links?.[id];
        if (kind && kind !== "unstated") {
          lines.push(`2 PEDI ${kind.toUpperCase()}`);
        }
      }
      if (family.husb === id || family.wife === id || family.also?.includes(id)) {
        lines.push(`1 FAMS @${family.id}@`);
      }
    }
  }
  for (const family of families) {
    lines.push(`0 @${family.id}@ FAM`);
    for (const partner of [family.husb, family.wife, ...(family.also ?? [])]) {
      if (partner) {
        lines.push(`1 ${partner === family.wife ? "WIFE" : "HUSB"} @${partner}@`);
      }
    }
    for (const child of family.children ?? []) {
      lines.push(`1 CHIL @${child}@`);
    }
    if (family.date) {
      lines.push("1 MARR", `2 DATE ${family.date}`);
    }
  }
  return lines.join("\n");
}

export function modelOf(people: string[], families: Kin[]): FileTimeline {
  return buildFileTimeline(indexOf(gedcom(people, families)), 2026);
}

export interface Fixture {
  name: string;
  model: FileTimeline;
  input: GraphInput;
  /** The people every layout of the fixture must show, once each. */
  people: string[];
  /** Pairs `[parent, child]` the file states, which a layout must keep. */
  parentage: [string, string][];
}

function fixture(name: string, people: string[], families: Kin[], focus?: string): Fixture {
  const model = modelOf(people, families);
  const ids = people.map((one) => `@${one.split(":")[0]}@`);
  const input = graphInputOf(model, focus ? { focus: `@${focus}@` } : {});
  const parentage = families.flatMap((family) =>
    [family.husb, family.wife, ...(family.also ?? [])].flatMap((parent) =>
      parent ? (family.children ?? []).map((child): [string, string] => [`@${parent}@`, `@${child}@`]) : [],
    ),
  );
  return { name, model, input, people: ids, parentage };
}

function extended(): Fixture {
  const people: string[] = ["P0:M:1800", "Q0:F:1802"];
  const families: Kin[] = [{ id: "F0", husb: "P0", wife: "Q0", children: [] }];
  let open = ["F0"];
  let count = 0;
  for (let generation = 1; generation <= 4; generation += 1) {
    const next: string[] = [];
    for (const parent of open) {
      const family = families.find((one) => one.id === parent);
      for (let child = 0; child < 3 && family; child += 1) {
        const id = `C${count}`;
        const wife = `W${count}`;
        count += 1;
        people.push(`${id}:M:${1800 + generation * 25 + child * 2}`, `${wife}:F:${1802 + generation * 25 + child * 2}`);
        family.children?.push(id);
        const own = `F${count}`;
        families.push({ id: own, husb: id, wife, children: [] });
        next.push(own);
      }
    }
    open = next;
  }
  return fixture("a large extended family", people, families);
}

/** The twelve files of the brief, by name. */
export function fixtures(): Fixture[] {
  return [
    fixture("a couple with two children", ["H:M", "W:F", "A:M", "B:F"], [
      { id: "F1", husb: "H", wife: "W", children: ["A", "B"], date: "1900" },
    ]),
    fixture("three generations", ["G1:M", "G2:F", "P:M", "Q:F", "K1:M", "K2:F"], [
      { id: "F1", husb: "G1", wife: "G2", children: ["P"] },
      { id: "F2", husb: "P", wife: "Q", children: ["K1", "K2"] },
    ], "P"),
    fixture("siblings with independent families", ["H:M", "W:F", "A:M", "B:F", "C:M", "AW:F", "BH:M", "CW:F", "A1:M", "B1:F", "C1:M", "C2:F"], [
      { id: "F0", husb: "H", wife: "W", children: ["A", "B", "C"] },
      { id: "FA", husb: "A", wife: "AW", children: ["A1"] },
      { id: "FB", husb: "BH", wife: "B", children: ["B1"] },
      { id: "FC", husb: "C", wife: "CW", children: ["C1", "C2"] },
    ]),
    fixture("multiple marriages", ["M:M", "W1:F", "W2:F", "W3:F", "A:M", "B:F", "C:M"], [
      { id: "F1", husb: "M", wife: "W1", children: ["A"], date: "1900" },
      { id: "F2", husb: "M", wife: "W2", children: ["B"], date: "1910" },
      { id: "F3", husb: "M", wife: "W3", children: ["C"], date: "1920" },
    ]),
    fixture("children from different partners", ["W:F", "H1:M", "H2:M", "A:M:1900", "B:F:1905", "C:M:1915"], [
      { id: "F1", husb: "H1", wife: "W", children: ["A", "B"] },
      { id: "F2", husb: "H2", wife: "W", children: ["C"] },
    ]),
    extended(),
    fixture("unknown parents", ["A:M", "B:F", "C:M", "D:F", "K:M"], [
      { id: "F1", children: ["A", "B"] },
      { id: "F2", husb: "C", wife: "D", children: ["K"] },
    ]),
    fixture("adoption", ["BH:M", "BW:F", "AH:M", "AW:F", "K:M", "S:F"], [
      { id: "FB", husb: "BH", wife: "BW", children: ["K"], links: { K: "birth" } },
      { id: "FA", husb: "AH", wife: "AW", children: ["K", "S"], links: { K: "adopted", S: "foster" } },
    ]),
    fixture("pedigree collapse", ["GP:M", "GM:F", "A:M", "B:F", "AW:F", "BH:M", "X:M", "Y:F", "K:M"], [
      { id: "F0", husb: "GP", wife: "GM", children: ["A", "B"] },
      { id: "FA", husb: "A", wife: "AW", children: ["X"] },
      { id: "FB", husb: "BH", wife: "B", children: ["Y"] },
      { id: "FX", husb: "X", wife: "Y", children: ["K"] },
    ], "K"),
    fixture("a consanguineous marriage", ["P:M", "Q:F", "U:M", "S:F", "N:F", "K:M"], [
      { id: "F0", husb: "P", wife: "Q", children: ["U", "S"] },
      { id: "FS", wife: "S", children: ["N"] },
      { id: "FU", husb: "U", wife: "N", children: ["K"] },
    ]),
    fixture("branches converging on one ancestor", ["R:M", "RW:F", "A:M", "B:M", "AW:F", "BW:F", "A1:F", "B1:M", "J:M", "K:F", "L:M"], [
      { id: "F0", husb: "R", wife: "RW", children: ["A", "B"] },
      { id: "FA", husb: "A", wife: "AW", children: ["A1"] },
      { id: "FB", husb: "B", wife: "BW", children: ["B1"] },
      { id: "FJ", husb: "J", wife: "A1", children: ["K"] },
      { id: "FL", husb: "B1", wife: "K", children: ["L"] },
    ], "L"),
    fixture("incomplete and contradictory data", ["P:M", "Q:F", "A:M", "B:F", "S:M", "Z:U"], [
      { id: "F1", husb: "P", wife: "Q", children: ["A", "A"] },
      { id: "F2", husb: "A", wife: "B", children: ["P"] },
      { id: "F3", husb: "S", children: ["S"] },
    ]),
  ];
}
