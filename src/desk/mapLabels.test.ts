import { describe, expect, it } from "vitest";

import { type LabelInput, placeLabels } from "./mapLabels";

const measure = (text: string): number => text.length * 7;
const at = (key: string, x: number, y: number, events = 1, kept = false): LabelInput => ({ key, x, y, radius: 5, text: key, events, kept });

describe("placing labels", () => {
  it("puts a label that fits to the right of its marker", () => {
    expect(placeLabels([at("Paris", 100, 100)], measure, 400).placed.get("Paris")).toMatchObject({ side: "right", x: 109 });
  });

  it("puts a label near the right edge to the left", () => {
    expect(placeLabels([at("Warsaw", 390, 100)], measure, 400).placed.get("Warsaw")?.side).toBe("left");
  });

  it("keeps the label of the place with more events where two collide", () => {
    const { placed } = placeLabels([at("Small", 10, 100, 1), at("Large", 10, 106, 4)], measure, 800);

    expect(placed.has("Large")).toBe(true);
    expect(placed.has("Small")).toBe(false);
  });

  it("keeps a kept place's label over a larger one", () => {
    const { placed } = placeLabels([at("Chosen", 10, 100, 1, true), at("Large", 10, 106, 9)], measure, 800);

    expect(placed.has("Chosen")).toBe(true);
    expect(placed.has("Large")).toBe(false);
  });

  it("hides a label that would cover another point", () => {
    const { placed } = placeLabels([at("Label", 100, 100), { ...at("Right", 120, 100), text: "" }, { ...at("Left", 80, 100), text: "" }], measure, 800);

    expect(placed.has("Label")).toBe(false);
  });

  it("lets labels return as the points part", () => {
    const crowded = placeLabels([at("A", 10, 100, 2), at("B", 10, 106, 1)], measure, 800).placed;
    const apart = placeLabels([at("A", 10, 100, 2), at("B", 10, 160, 1)], measure, 800).placed;

    expect(crowded.size).toBe(1);
    expect(apart.size).toBe(2);
  });

  it("gives the same result for the same input in another order", () => {
    const inputs = [at("A", 10, 10, 2), at("B", 18, 10, 2), at("C", 200, 50, 1)];

    expect([...placeLabels(inputs, measure, 800).placed.keys()].sort()).toEqual(
      [...placeLabels([...inputs].reverse(), measure, 800).placed.keys()].sort(),
    );
  });

  it("compares a bounded number of boxes for five thousand inputs", () => {
    const inputs = Array.from({ length: 5000 }, (_, i) => at(`p${i}`, (i * 7919) % 1400, (i * 104729) % 900, (i % 5) + 1));
    const { comparisons } = placeLabels(inputs, measure, 1400);

    expect(comparisons).toBeLessThan(inputs.length * 200);
  });
});
