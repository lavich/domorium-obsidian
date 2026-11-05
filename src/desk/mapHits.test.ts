import { describe, expect, it } from "vitest";

import { nearestMark, PlaceGrid } from "./mapHits";

const items = Array.from({ length: 5000 }, (_, i) => ({ key: `p${i}`, x: ((i * 7919) % 10007) / 10007, y: ((i * 104729) % 10009) / 10009 }));

describe("the place grid", () => {
  const grid = new PlaceGrid(items);

  it("answers a rectangle with only the places in it", () => {
    const found = grid.inRect(0.2, 0.2, 0.3, 0.3);

    expect(found.length).toBeGreaterThan(0);
    expect(found.length).toBeLessThan(items.length / 20);
    expect(found.every((one) => one.x >= 0.2 && one.x <= 0.3 && one.y >= 0.2 && one.y <= 0.3)).toBe(true);
    expect(found.length).toBe(items.filter((one) => one.x >= 0.2 && one.x <= 0.3 && one.y >= 0.2 && one.y <= 0.3).length);
  });

  it("finds the nearest place within a distance and none beyond", () => {
    const target = items[10];

    expect(grid.nearest(target.x + 1e-6, target.y, 0.001)?.key).toBe(target.key);
    expect(grid.nearest(2, 2, 0.001)).toBeUndefined();
  });
});

describe("hitting a mark", () => {
  it("picks the nearest mark within the target, not the one drawn last", () => {
    const marks = [{ id: "far", x: 20, y: 0 }, { id: "near", x: 8, y: 0 }, { id: "last", x: 10, y: 5 }];

    expect(nearestMark(marks, 7, 0)?.id).toBe("near");
  });

  it("finds nothing beyond 22 px", () => {
    expect(nearestMark([{ x: 100, y: 100 }], 0, 0)).toBeUndefined();
  });
});
