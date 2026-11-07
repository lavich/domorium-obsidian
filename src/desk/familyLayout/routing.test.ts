import { describe, expect, it } from "vitest";

import { tangled } from "../../../tests/generated";
import { curieIndex, indexOf } from "../../testing/curie";
import { buildFileTimeline } from "../fileTimeline";
import { graphInputOf } from "../fileGraph";
import { runLayout } from "./engine";
import { fixtures } from "./fixtures";
import type { FileGraphLayout, GraphInput } from "./types";

const all = (): { name: string; input: GraphInput }[] => [
  ...fixtures().map((one) => ({ name: one.name, input: one.input })),
  { name: "curie", input: graphInputOf(buildFileTimeline(curieIndex(), 2026), {}) },
  { name: "tangled", input: graphInputOf(buildFileTimeline(indexOf(tangled(150)), 2026), {}) },
];

function crossesCard(layout: FileGraphLayout, line: FileGraphLayout["lines"][number]): string[] {
  const own = new Set([line.child, ...line.parents]);
  const hit: string[] = [];
  line.points.forEach((point, at) => {
    const next = line.points[at + 1];
    if (!next) {
      return;
    }
    const [x0, x1] = [Math.min(point[0], next[0]), Math.max(point[0], next[0])];
    const [y0, y1] = [Math.min(point[1], next[1]), Math.max(point[1], next[1])];
    for (const card of layout.cards) {
      if (own.has(card.id)) {
        continue;
      }
      if (x0 < card.x + card.width && card.x < x1 && y0 < card.y + card.height && card.y < y1) {
        hit.push(card.id);
      }
    }
  });
  return hit;
}

describe("the lines of a layout", () => {
  it("turn only between rows, never leaving a row's cards sideways, and cross no card of another family's row", () => {
    for (const { name, input } of all()) {
      const layout = runLayout(input);
      for (const line of layout.lines) {
        line.points.forEach((point, at) => {
          const next = line.points[at + 1];
          if (next) {
            expect(next[1] >= point[1], `${name} ${line.id}`).toBe(true);
          }
        });
        expect(crossesCard(layout, line).length, `${name} ${line.id}`).toBeLessThanOrEqual(0);
      }
    }
  });

  it("start together for the children of one family and part only below their parents' row", () => {
    const layout = runLayout(graphInputOf(buildFileTimeline(curieIndex(), 2026), {}));
    const family = layout.lines.filter((line) => line.family === "@F3@");

    expect(family.length).toBeGreaterThan(1);
    const [first, ...rest] = family;
    for (const line of rest) {
      expect(line.points[0]).toEqual(first?.points[0]);
      expect(line.points[1]).toEqual(first?.points[1]);
    }
  });

  it("give every line an identifier of its own, and keep the kind of link each joins", () => {
    for (const { name, input } of all()) {
      const ids = runLayout(input).lines.map((line) => line.id);
      expect(new Set(ids).size, name).toBe(ids.length);
    }
    const adoption = fixtures().find((one) => one.name === "adoption");
    const lines = runLayout(adoption?.input as GraphInput).lines.filter((line) => line.child === "@K@");

    expect(lines.map((line) => [line.family, line.relationship]).sort()).toEqual([
      ["@FA@", "adopted"],
      ["@FB@", "birth"],
    ]);
  });

  it("run a line of a child several rows down through a lane where no card stands, and name it a reference", () => {
    const layout = runLayout(graphInputOf(buildFileTimeline(indexOf(tangled(400)), 2026), {}));
    const long = layout.lines.filter((line) => line.lanes.length > 0);

    expect(long.length).toBeGreaterThan(0);
    for (const line of long) {
      for (const lane of line.lanes) {
        const band = layout.bands[lane.row];
        const blocking = layout.cards.filter(
          (card) => card.row === lane.row && card.x < lane.x + 5 && lane.x - 5 < card.x + card.width,
        );
        expect(blocking, `${line.id} @ row ${lane.row} ${band?.top}`).toEqual([]);
      }
      expect(layout.links.some((link) => link.kind === "reference" && link.person === line.child)).toBe(true);
    }
  });

  it("is a reference too for a line to a family a child is not primarily in", () => {
    const adoption = runLayout(fixtures().find((one) => one.name === "adoption")?.input as GraphInput);

    expect(adoption.links.filter((link) => link.kind === "reference").map((link) => [link.person, link.from])).toContainEqual([
      "@K@",
      "@FA@",
    ]);
  });
});
