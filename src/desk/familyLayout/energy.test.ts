import { describe, expect, it } from "vitest";

import type { Block } from "./blocks";
import { buildClusters } from "./clusters";
import { crossingsOf, energyOf, familiesOf, moveDelta, swapDelta, type EnergyInput } from "./energy";
import { fixtures } from "./fixtures";
import { initialPlacement, linkFamilies, stackLayers } from "./macro";
import { indexCards, mapMarriages } from "./blocks";
import { measureBlocks } from "./micro";
import { analyseRoot } from "./rootAnalysis";
import { DEFAULT_OPTIONS, DEFAULT_WEIGHTS, geometryOf } from "./types";

const g = geometryOf(DEFAULT_OPTIONS);

function stateOf(name: string): EnergyInput & { blocks: Block[] } {
  const one = fixtures().find((fixture) => fixture.name === name);
  if (!one) {
    throw new Error(name);
  }
  const { input } = one;
  const graph = buildClusters(input);
  const analysis = analyseRoot(input, graph, input.focus);
  const index = indexCards(input);
  const { blocks, blockOf, place } = measureBlocks(input, index, mapMarriages(input.families, index), analysis, g);
  const edges = linkFamilies(g, input.families, index, blocks, blockOf, place);
  const layers = stackLayers(blocks, index.generations.length);
  initialPlacement(g, layers, undefined);
  return {
    blocks,
    layers,
    families: familiesOf(graph, blockOf),
    weights: DEFAULT_WEIGHTS,
    g,
    descents: edges.flatMap((edge) => {
      const [from, to] = [blockOf.get(edge.parents[0] ?? ""), blockOf.get(edge.child)];
      return from && to ? [{ from, to, ambiguous: false }] : [];
    }),
    bandStart: (at) => at * (g.along + g.rowGap),
  };
}

const NAMES = ["a large extended family", "siblings with independent families", "pedigree collapse", "multiple marriages"];

describe("the terms of the energy", () => {
  it("are zero for a layout with nothing wrong, and the total is their weighted sum", () => {
    const state = stateOf("a couple with two children");
    const terms = energyOf(state);

    expect(terms.overlap).toBe(0);
    expect(terms.crossings).toBe(0);
    expect(terms.generation).toBe(0);
    expect(terms.displacement).toBe(0);
    const w = DEFAULT_WEIGHTS;
    expect(terms.total).toBeCloseTo(
      w.distance * terms.distance + w.crossings * terms.crossings + w.overlap * terms.overlap +
        w.generation * terms.generation + w.cluster * terms.cluster + w.displacement * terms.displacement,
    );
  });

  it("grow when the layout is made to break them", () => {
    const state = stateOf("a large extended family");
    const base = energyOf(state);
    const second = state.layers.find((layer) => layer.length > 1);
    if (!second?.[0] || !second[1]) {
      throw new Error("no row to break");
    }
    const keep = second[1].cx;
    second[1].cx = second[0].cx;
    expect(energyOf(state).overlap).toBeGreaterThan(base.overlap);
    expect(energyOf(state).displacement).toBeGreaterThan(base.displacement);
    second[1].cx = keep;

    expect(energyOf({ ...state, bandStart: () => 0 }).generation).toBeGreaterThan(base.generation);
    const [child] = state.families[0]?.children ?? [];
    if (child) {
      const was = child.cx;
      child.cx += 5000;
      expect(energyOf(state).distance).toBeGreaterThan(base.distance);
      child.cx = was;
    }
    const family = state.families.find((one) => new Set(one.children.map((block) => block.layer)).size === 1);
    const at = family?.children[0]?.layer ?? 0;
    const row = state.layers[at] ?? [];
    const stranger = row.find((block) => !family?.children.includes(block));
    if (family && stranger) {
      const without = row.filter((block) => block !== stranger);
      without.splice(Math.min(...family.children.map((block) => without.indexOf(block))) + 1, 0, stranger);
      state.layers[at] = without;
      expect(energyOf(state).cluster).toBeGreaterThan(base.cluster);
      state.layers[at] = row;
    }
  });

  it("count the crossings of a swap exactly as the layouts before and after do, on every neighbouring pair", () => {
    for (const name of NAMES) {
      const state = stateOf(name);
      for (const layer of state.layers) {
        for (let at = 0; at < layer.length - 1; at += 1) {
          const [one, other] = [layer[at], layer[at + 1]];
          const before = crossingsOf(state.layers);
          const delta = swapDelta(one, other);
          const [oneX, otherX] = [one.cx, other.cx];
          const left = oneX - one.width / 2;
          other.cx = left + other.width / 2;
          one.cx = left + other.width + g.block + one.width / 2;
          const after = crossingsOf(state.layers);
          one.cx = oneX;
          other.cx = otherX;

          expect(after - before, `${name} ${at}`).toBe(delta);
        }
      }
    }
  });

  it("measure a move of one block as the whole distance term changes", () => {
    const dead = g.block + g.across;
    for (const name of NAMES) {
      const state = stateOf(name);
      for (const block of state.blocks.slice(0, 40)) {
        const before = energyOf(state).distance;
        const delta = moveDelta(block, block.cx + 137, dead);
        block.cx += 137;
        const after = energyOf(state).distance;
        block.cx -= 137;

        expect(after - before, name).toBeCloseTo(delta, 6);
      }
    }
  });
});
