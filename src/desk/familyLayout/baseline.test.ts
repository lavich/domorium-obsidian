import { describe, expect, it } from "vitest";

import { tangled } from "../../../tests/generated";
import { curieIndex, indexOf } from "../../testing/curie";
import { buildFileTimeline } from "../fileTimeline";
import { layoutFileGraph } from "../fileGraph";

/**
 * What the layered layout this engine replaced made of the same files, recorded
 * from `main` at 28b5730 (the file graph before the family layout). The engine
 * must cross no more lines, and be no wider, than these, give or take a little.
 */
const WAS = {
  t300: { crossings: 104, width: 37_304 },
  t600: { crossings: 1_518, width: 52_196 },
  t2000: { crossings: 13_718, width: 172_196 },
} as const;

describe("against the layered layout it replaced", () => {
  it("lays the Curie file out as before: four rows, eleven lines, none crossing", () => {
    const layout = layoutFileGraph(buildFileTimeline(curieIndex(), 2026), {});

    expect(layout.rows).toBe(4);
    expect(layout.lines).toHaveLength(11);
    expect(layout.crossings).toBe(0);
    expect(layout.width).toBeLessThan(1215 * 1.1);
    expect(layout.width).toBeGreaterThan(1215 * 0.8);
  });

  for (const [name, count] of [["t300", 300], ["t600", 600], ["t2000", 2000]] as const) {
    it(`crosses no more lines than it did, nor is much wider, on ${count} people`, () => {
      const layout = layoutFileGraph(buildFileTimeline(indexOf(tangled(count)), 2026), {});

      expect(layout.crossings).toBeLessThanOrEqual(WAS[name].crossings * 1.02);
      expect(layout.width).toBeLessThanOrEqual(WAS[name].width * 1.1);
    });
  }
});
