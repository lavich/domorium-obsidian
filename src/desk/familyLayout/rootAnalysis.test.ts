import { describe, expect, it } from "vitest";

import { buildClusters } from "./clusters";
import { fixtures } from "./fixtures";
import { analyseRoot } from "./rootAnalysis";
import type { GraphInput } from "./types";

function analyse(name: string, root: string | null) {
  const one = fixtures().find((fixture) => fixture.name === name);
  if (!one) {
    throw new Error(name);
  }
  const input = { ...one.input, focus: root };
  return analyseRoot(input, buildClusters(input), root);
}

describe("the structure seen from a root", () => {
  it("puts the root's families at distance zero, and the parents' above", () => {
    const analysis = analyse("three generations", "@P@");

    expect(analysis.info.get("@F2@")).toMatchObject({ role: "root", distance: 0, layer: 0 });
    expect(analysis.info.get("@F1@")).toMatchObject({ role: "ancestor", distance: 1, layer: 0 });
  });

  it("makes the family of a brother a collateral in the layer after the lineage, attached where it branches", () => {
    const analysis = analyse("siblings with independent families", "@A@");

    expect(analysis.info.get("@FA@")?.role).toBe("root");
    expect(analysis.info.get("@F0@")?.role).toBe("ancestor");
    expect(analysis.info.get("@FB@")).toMatchObject({ role: "collateral", layer: 1, branchPerson: "@B@", branchFrom: "@F0@" });
    expect(analysis.links.filter((link) => link.kind === "branch").map((link) => link.to).sort()).toEqual(["@FB@", "@FC@"]);
  });

  it("gives another root another structure of the same file", () => {
    const [a, c] = [analyse("siblings with independent families", "@A@"), analyse("siblings with independent families", "@C@")];

    expect(c.info.get("@FC@")?.role).toBe("root");
    expect(c.info.get("@FA@")?.role).toBe("collateral");
    expect(a.info.get("@FA@")?.role).toBe("root");
    expect([...c.layerOf.keys()].sort()).toEqual([...a.layerOf.keys()].sort());
    expect(c.layerOf.get("@A@")).toBe(1);
    expect(a.layerOf.get("@A@")).toBe(0);
  });

  it("finds the grandparents of two cousins who marry reached by two paths, and joins both to them", () => {
    const analysis = analyse("pedigree collapse", "@K@");

    expect(analysis.collapsed.get("@GP@")).toBe(2);
    expect(analysis.collapsed.get("@GM@")).toBe(2);
    expect(analysis.collapsed.get("@X@")).toBeUndefined();
    expect(analysis.links.filter((link) => link.kind === "convergence").map((link) => link.to)).toEqual(["@F0@"]);
  });

  it("finds two branches that converge on one ancestor, and a marriage between kin", () => {
    expect(analyse("branches converging on one ancestor", "@L@").links.some((link) => link.kind === "convergence")).toBe(true);
    expect(analyse("a consanguineous marriage", "@K@").collapsed.get("@P@")).toBe(2);
  });

  it("ends on a file in which a person is their own ancestor", () => {
    const analysis = analyse("incomplete and contradictory data", "@A@");

    expect(analysis.info.size).toBeGreaterThan(0);
    expect(analysis.order).toHaveLength(6);
  });

  it("takes the first person as the root where none is given, and lays out a separate family from its own first person after the main one", () => {
    const input: GraphInput = {
      cards: ["a", "b", "x", "y", "z"].map((id, at) => ({ id, row: at % 2, sex: "U" })),
      families: [
        { id: "f1", spouses: ["a"], children: ["b"], year: null },
        { id: "f2", spouses: ["x", "y"], children: ["z"], year: null },
      ],
      focus: null,
    };
    const analysis = analyseRoot(input, buildClusters(input), null);

    expect(analysis.root).toBe("a");
    expect(analysis.info.get("f1")?.component).toBe(0);
    expect(analysis.info.get("f2")).toMatchObject({ component: 1, role: "root", distance: 0 });
    expect(analysis.order.indexOf("a")).toBeLessThan(analysis.order.indexOf("x"));
  });

  it("reports a child standing no lower than a parent as an ambiguous generation, and invents no order", () => {
    const input: GraphInput = {
      cards: [
        { id: "p", row: 1, sex: "U" },
        { id: "c", row: 1, sex: "U" },
      ],
      families: [{ id: "f", spouses: ["p"], children: ["c"], year: null }],
      focus: null,
    };
    const analysis = analyseRoot(input, buildClusters(input), null);

    expect(analysis.anomalies).toEqual([{ kind: "ambiguous-generation", family: "f", person: "c", people: ["p"] }]);
  });

  it("orders people by structure from the root and, among equals, by birth and then by identifier", () => {
    const input: GraphInput = {
      cards: [
        { id: "r", row: 0, sex: "U" },
        { id: "z", row: 1, sex: "U", born: 1900 },
        { id: "m", row: 1, sex: "U", born: 1910 },
        { id: "a", row: 1, sex: "U" },
      ],
      families: [{ id: "f", spouses: ["r"], children: ["m", "a", "z"], year: null }],
      focus: "r",
    };
    const analysis = analyseRoot(input, buildClusters(input), "r");

    expect(analysis.order).toEqual(["r", "z", "m", "a"]);
  });
});
