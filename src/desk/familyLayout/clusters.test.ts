import { describe, expect, it } from "vitest";

import { buildClusters } from "./clusters";
import { fixtures } from "./fixtures";
import type { GraphInput } from "./types";

const named = (name: string) => {
  const one = fixtures().find((fixture) => fixture.name === name);
  if (!one) {
    throw new Error(name);
  }
  return one;
};

const people = (ids: string[]): GraphInput["cards"] => ids.map((id, at) => ({ id, row: at, sex: "U" }));

describe("the clusters of a file", () => {
  it("makes one cluster of a couple and their two children, each child's link unstated", () => {
    const { clusters } = buildClusters(named("a couple with two children").input);

    expect(clusters).toHaveLength(1);
    expect(clusters[0]?.partners).toEqual(["@H@", "@W@"]);
    expect(clusters[0]?.children).toEqual([
      { id: "@A@", kind: "unstated" },
      { id: "@B@", kind: "unstated" },
    ]);
  });

  it("joins the clusters of a child's own family and of the family they come from by descent, through that one person", () => {
    const graph = buildClusters(named("three generations").input);

    expect(graph.links.filter((link) => link.kind === "descent")).toEqual([
      { kind: "descent", person: "@P@", from: "@F1@", to: "@F2@", fromKind: "unstated" },
    ]);
    expect(graph.childOf.get("@P@")).toEqual(["@F1@"]);
    expect(graph.partnerIn.get("@P@")).toEqual(["@F2@"]);
  });

  it("joins the families of a man married three times by remarriage through him", () => {
    const graph = buildClusters(named("multiple marriages").input);

    expect(graph.clusters).toHaveLength(3);
    expect(graph.links.filter((link) => link.kind === "remarriage").map((link) => [link.person, link.from, link.to])).toEqual([
      ["@M@", "@F1@", "@F2@"],
      ["@M@", "@F2@", "@F3@"],
    ]);
  });

  it("holds every partner of a family of three, and of two of one sex", () => {
    const input: GraphInput = {
      cards: people(["a", "b", "c", "k"]),
      families: [{ id: "f", spouses: ["a", "b", "c"], children: ["k"], year: null }],
      focus: null,
    };

    expect(buildClusters(input).clusters[0]?.partners).toEqual(["a", "b", "c"]);
  });

  it("makes a cluster of children with no partner, and invents no parent", () => {
    const graph = buildClusters(named("unknown parents").input);
    const orphans = graph.cluster.get("@F1@");

    expect(orphans?.partners).toEqual([]);
    expect(orphans?.children.map((child) => child.id)).toEqual(["@A@", "@B@"]);
    expect(graph.childOf.get("@C@")).toBeUndefined();
  });

  it("joins the birth family and the adoptive family of one child as alternate parents, with the kind of each", () => {
    const graph = buildClusters(named("adoption").input);

    expect(graph.links.filter((link) => link.kind === "alternate-parents")).toEqual([
      { kind: "alternate-parents", person: "@K@", from: "@FB@", to: "@FA@", fromKind: "birth", toKind: "adopted" },
    ]);
    expect(graph.cluster.get("@FA@")?.children.map((child) => child.kind)).toEqual(["adopted", "foster"]);
  });

  it("keeps what the file writes oddly and reports it", () => {
    const graph = buildClusters(named("incomplete and contradictory data").input);
    const kinds = graph.anomalies.map((one) => one.kind);

    expect(kinds).toContain("self-parent");
    expect(kinds).toContain("cycle");
    expect(graph.cluster.get("@F3@")?.children.map((child) => child.id)).toEqual(["@S@"]);
    expect(graph.cyclic.has("@F1@")).toBe(true);
    expect(graph.cyclic.has("@F2@")).toBe(true);
  });

  it("keeps a person listed twice in a family once, and reports the second", () => {
    const input: GraphInput = {
      cards: people(["a", "b", "k"]),
      families: [{ id: "f", spouses: ["a", "b", "a"], children: ["k", "k"], year: null }],
      focus: null,
    };
    const graph = buildClusters(input);

    expect(graph.clusters[0]?.partners).toEqual(["a", "b"]);
    expect(graph.clusters[0]?.children).toHaveLength(1);
    expect(graph.anomalies.filter((one) => one.kind === "duplicate-member").map((one) => one.person)).toEqual(["a", "k"]);
  });

  it("adds no cluster for a family none of whose people is shown", () => {
    const input: GraphInput = {
      cards: people(["a"]),
      families: [{ id: "f", spouses: ["x", "y"], children: ["z"], year: null }],
      focus: null,
    };

    expect(buildClusters(input).clusters).toEqual([]);
  });

  it("walks a chain of five thousand generations without running out of stack", () => {
    const count = 5_000;
    const input: GraphInput = {
      cards: people(Array.from({ length: count }, (_, at) => `p${at}`)),
      families: Array.from({ length: count - 1 }, (_, at) => ({
        id: `f${at}`,
        spouses: [`p${at}`],
        children: [`p${at + 1}`],
        year: null,
      })),
      focus: null,
    };
    const graph = buildClusters(input);

    expect(graph.clusters).toHaveLength(count - 1);
    expect(graph.anomalies).toEqual([]);
  });
});
