import { describe, expect, it } from "vitest";

import { GAP, packLanes, type LaneBox } from "./timelineLanes";

const box = (xref: string, left: number, right: number): LaneBox => ({ xref, left, right });
const none = (): string[] => [];

describe("packing bars into lanes", () => {
  it("puts two lives that never meet in one lane", () => {
    const lanes = packLanes([box("a", 0, 100), box("b", 300, 400)], none);

    expect(lanes.get("a")).toBe(0);
    expect(lanes.get("b")).toBe(0);
  });

  it("puts two lives that overlap in different lanes", () => {
    const lanes = packLanes([box("a", 0, 100), box("b", 50, 150)], none);

    expect(lanes.get("a")).toBe(0);
    expect(lanes.get("b")).toBe(1);
  });

  it("counts the name written beyond a bar as part of the bar", () => {
    const lanes = packLanes([box("a", 0, 250), box("b", 200, 300)], none);

    expect(lanes.get("b")).toBe(1);
  });

  it("needs a gap between the end of one bar and the start of the next", () => {
    expect(packLanes([box("a", 0, 100), box("b", 100 + GAP - 1, 200)], none).get("b")).toBe(1);
    expect(packLanes([box("a", 0, 100), box("b", 100 + GAP, 200)], none).get("b")).toBe(0);
  });

  it("takes the free lane next to the mother, not the topmost", () => {
    const boxes = [box("a", 0, 500), box("other", 0, 40), box("mother", 0, 40), box("child", 100, 200)];
    const lanes = packLanes(boxes, (xref) => (xref === "child" ? ["mother"] : []));

    expect(lanes.get("mother")).toBe(2);
    expect(lanes.get("child")).toBe(2);
  });

  it("takes the topmost free lane where no relative is placed yet", () => {
    const lanes = packLanes([box("a", 0, 10), box("b", 0, 10), box("c", 100, 110)], (xref) => (xref === "c" ? ["gone"] : []));

    expect(lanes.get("c")).toBe(0);
  });

  it("takes people in the order the bars begin, the declared order breaking ties", () => {
    const lanes = packLanes([box("late", 100, 200), box("first", 0, 150), box("tied", 0, 150)], none);

    expect(lanes.get("first")).toBe(0);
    expect(lanes.get("tied")).toBe(1);
    expect(lanes.get("late")).toBe(2);
  });

  it("opens a lane only where none is free", () => {
    const lanes = packLanes([box("a", 0, 100), box("b", 10, 100), box("c", 120, 200), box("d", 120, 200)], none);

    expect(Math.max(...lanes.values())).toBe(1);
  });

  it("never overlaps two bars in a lane, over 10 000 people, and quickly", () => {
    let seed = 7;
    const random = (): number => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
    const boxes = Array.from({ length: 10_000 }, (_, at) => {
      const left = random() * 6000;
      return box(`p${at}`, left, left + 40 + random() * 400);
    });
    const started = performance.now();
    const lanes = packLanes(boxes, (xref) => [`p${Math.max(0, Number(xref.slice(1)) - 1)}`]);
    const took = performance.now() - started;

    const byLane = new Map<number, LaneBox[]>();
    for (const one of boxes) {
      const at = lanes.get(one.xref) ?? -1;
      byLane.set(at, [...(byLane.get(at) ?? []), one]);
    }
    for (const held of byLane.values()) {
      const sorted = [...held].sort((a, b) => a.left - b.left);
      sorted.slice(1).forEach((next, at) => {
        expect(next.left).toBeGreaterThanOrEqual((sorted[at]?.right ?? 0) + GAP);
      });
    }
    expect(took).toBeLessThan(1500);
  });
});
