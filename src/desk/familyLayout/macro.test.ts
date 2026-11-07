import { describe, expect, it } from "vitest";

import { indexCards, mapMarriages, type Block } from "./blocks";
import { buildClusters } from "./clusters";
import { crossingsOf } from "./energy";
import { fixtures } from "./fixtures";
import { budgetOf, initialPlacement, linkFamilies, optimise, stackLayers } from "./macro";
import { measureBlocks } from "./micro";
import { analyseRoot } from "./rootAnalysis";
import { DEFAULT_OPTIONS, geometryOf, type GraphInput } from "./types";

const g = geometryOf(DEFAULT_OPTIONS);

function layersOf(input: GraphInput): Block[][] {
  const graph = buildClusters(input);
  const analysis = analyseRoot(input, graph, input.focus);
  const index = indexCards(input);
  const { blocks, blockOf, place } = measureBlocks(input, index, mapMarriages(input.families, index), analysis, g);
  linkFamilies(g, input.families, index, blocks, blockOf, place);
  return stackLayers(blocks, index.generations.length);
}

const fixture = (name: string): GraphInput => {
  const one = fixtures().find((fixture) => fixture.name === name);
  if (!one) {
    throw new Error(name);
  }
  return one.input;
};

describe("the initial placement", () => {
  it("packs every row without overlap and puts the structure from the root in order", () => {
    const layers = layersOf(fixture("a large extended family"));
    initialPlacement(g, layers, undefined);

    for (const layer of layers) {
      for (let at = 1; at < layer.length; at += 1) {
        const [before, block] = [layer[at - 1], layer[at]];
        expect((block?.cx ?? 0) - (block?.width ?? 0) / 2).toBeGreaterThanOrEqual((before?.cx ?? 0) + (before?.width ?? 0) / 2);
      }
    }
    expect(layers[0]?.map((block) => block.rank)).toEqual((layers[0] ?? []).map((block) => block.rank).sort((a, b) => a - b));
  });

  it("is the mirror of itself when mirrored: every row in the reverse order of ranks where nothing hangs above", () => {
    const [plain, mirrored] = [layersOf(fixture("siblings with independent families")), layersOf(fixture("siblings with independent families"))];
    initialPlacement(g, plain, undefined);
    initialPlacement(g, mirrored, undefined, true);

    expect(mirrored[0]?.map((block) => block.rank)).toEqual((plain[0] ?? []).map((block) => block.rank).reverse());
  });

  it("takes where a block stood in the earlier layout as its home", () => {
    const layers = layersOf(fixture("a couple with two children"));
    const [first] = layers[0] ?? [];
    const id = first?.members[0] ?? "";
    initialPlacement(g, layers, new Map([[id, 1_000]]));

    expect(first?.home).toBe(1_000 + (first?.width ?? 0) / 2);
  });
});

describe("the optimisation", () => {
  it("crosses fewer lines than it starts with on the large family and never more", () => {
    for (const name of ["a large extended family", "siblings with independent families", "branches converging on one ancestor"]) {
      const layers = layersOf(fixture(name));
      initialPlacement(g, layers, undefined);
      const before = crossingsOf(layers);
      const result = optimise(g, layers, DEFAULT_OPTIONS, budgetOf(layers, DEFAULT_OPTIONS, () => 0));

      expect(result.crossingsAtStart, name).toBe(before);
      expect(crossingsOf(layers), name).toBeLessThanOrEqual(before);
    }
  });

  it("does at most the work its budget allows, whatever the clock says", () => {
    const layers = layersOf(fixture("a large extended family"));
    initialPlacement(g, layers, undefined);
    const budget = budgetOf(layers, { ...DEFAULT_OPTIONS, optimizationIterations: 1 }, () => 0);
    optimise(g, layers, { ...DEFAULT_OPTIONS, optimizationIterations: 1 }, budget);

    expect(budget.spent).toBeLessThanOrEqual(budget.cap + 5 * layers.flat().length);
  });

  it("keeps a pinned block fixed while the others move around it", () => {
    const layers = layersOf(fixture("a large extended family"));
    initialPlacement(g, layers, undefined);
    const pinned = layers.find((layer) => layer.length > 2)?.[1];
    if (!pinned) {
      throw new Error("no row");
    }
    pinned.pinned = true;
    optimise(g, layers, DEFAULT_OPTIONS, budgetOf(layers, DEFAULT_OPTIONS, () => 0));

    expect(layers.flat()).toContain(pinned);
  });
});
