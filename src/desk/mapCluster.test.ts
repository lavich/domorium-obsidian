import { describe, expect, it } from "vitest";

import { clusterPlaces, COARSE_SPACING, type Placed, radius, separable } from "./mapCluster";

const at = (key: string, x: number, y: number, events = 1, lat = x, lon = y): Placed => ({ key, x, y, events, lat, lon });

describe("the size of a point", () => {
  it("is 5 for one event and never above 22", () => {
    expect(radius(1)).toBe(5);
    expect(radius(100)).toBeLessThanOrEqual(22);
    expect(radius(100000)).toBe(22);
  });

  it("never shrinks as events are added", () => {
    let last = 0;
    for (let n = 1; n < 200; n += 1) {
      expect(radius(n)).toBeGreaterThanOrEqual(last);
      last = radius(n);
    }
  });
});

describe("clustering", () => {
  it("joins places 6 px apart and leaves places 60 px apart", () => {
    expect(clusterPlaces([at("a", 0, 0), at("b", 6, 0)], new Set(), false)).toHaveLength(1);
    expect(clusterPlaces([at("a", 0, 0), at("b", 60, 0)], new Set(), false)).toHaveLength(2);
  });

  it("makes a ring that counts places, centred on the events", () => {
    const [mark] = clusterPlaces([at("a", 0, 0, 3), at("b", 8, 0, 1)], new Set(), false);

    expect(mark?.kind).toBe("cluster");
    expect(mark?.members).toHaveLength(2);
    expect(mark?.events).toBe(4);
    expect(mark?.x).toBeCloseTo(2, 6);
  });

  it("lets the larger place seed", () => {
    const [mark] = clusterPlaces([at("small", 0, 0, 1), at("large", 8, 0, 20)], new Set(), false);

    expect(mark?.members[0]?.key).toBe("large");
  });

  it("keeps a pinned place a point while its neighbours cluster", () => {
    const marks = clusterPlaces([at("a", 0, 0), at("b", 6, 0), at("c", 3, 0)], new Set(["c"]), false);

    expect(marks.find((mark) => mark.members.some((one) => one.key === "c"))?.kind).toBe("point");
    expect(marks.find((mark) => mark.members.length === 2)).toBeDefined();
  });

  it("gives the same clusters in another input order", () => {
    const places = [at("a", 0, 0), at("b", 6, 0), at("c", 100, 0), at("d", 104, 0, 4)];
    const shape = (list: Placed[]) =>
      clusterPlaces(list, new Set(), false)
        .map((mark) => mark.members.map((one) => one.key).sort().join("+"))
        .sort();

    expect(shape(places)).toEqual(shape([...places].reverse()));
  });

  it("keeps targets 22 px apart on a coarse pointer", () => {
    const places = [at("a", 0, 0), at("b", 15, 0)];

    expect(clusterPlaces(places, new Set(), false)).toHaveLength(2);
    expect(clusterPlaces(places, new Set(), true)).toHaveLength(1);
    expect(COARSE_SPACING).toBe(22);
  });

  it("does not separate places at the same coordinates", () => {
    const [same] = clusterPlaces([at("a", 0, 0, 1, 10, 10), at("b", 1, 0, 1, 10, 10)], new Set(), false);
    const [apart] = clusterPlaces([at("a", 0, 0, 1, 10, 10), at("b", 1, 0, 1, 10, 11)], new Set(), false);

    expect(separable(same)).toBe(false);
    expect(separable(apart)).toBe(true);
  });

  it("makes few marks of five thousand places spread over cities", () => {
    const centres = Array.from({ length: 40 }, (_, i) => [(i * 137) % 1300, (i * 71) % 800] as const);
    const places = Array.from({ length: 5000 }, (_, i) => {
      const [cx, cy] = centres[i % 40] ?? [0, 0];
      return at(`p${i}`, cx + (((i * 7919) % 97) - 48) * 0.4, cy + (((i * 104729) % 89) - 44) * 0.4);
    });
    const marks = clusterPlaces(places, new Set(), false);

    expect(marks.length).toBeLessThan(600);
    expect(marks.length).toBeLessThanOrEqual(Math.ceil(1400 / 10) * Math.ceil(900 / 10));
  });
});
