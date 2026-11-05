import { describe, expect, it } from "vitest";

import { curieWithMap, indexOf, SCEAUX_MAP } from "../testing/curie";
import { fileMapOf } from "./fileMap";
import { markSelection, sliceRange, sliceScope } from "./mapScope";

const index = indexOf(curieWithMap(SCEAUX_MAP));
const model = fileMapOf(index);
const whole = { up: 2, down: 2 };

describe("the slices of a file the map draws", () => {
  it("takes the whole file for no focus and bounds the years of the places it can draw", () => {
    const slice = sliceScope(index, model, whole);

    expect(slice.events).toHaveLength(model.events.length);
    expect(slice.bounds?.from).toBeLessThan(1900);
    expect(slice.bounds?.to).toBeGreaterThan(1930);
  });

  it("narrows to a branch", () => {
    const branch = sliceScope(index, model, { focus: "@I1@", up: 0, down: 0 });

    expect(branch.events.length).toBeGreaterThan(0);
    expect(branch.events.length).toBeLessThan(model.events.length);
  });

  it("splits the places a range leaves into those with coordinates and those without", () => {
    const { events } = sliceScope(index, model, whole);
    const all = sliceRange(model, events, null);

    expect(all.mapped.map((group) => group.place.key)).toContain("sceaux, france");
    expect(all.unmapped.map((group) => group.place.key)).toContain("mulhouse, france");
    expect(sliceRange(model, events, { from: 1930, to: 1940 }).mapped.length).toBeLessThan(all.mapped.length);
  });

  it("keeps the places with no coordinates whatever the range", () => {
    const { events } = sliceScope(index, model, whole);

    expect(sliceRange(model, events, { from: 1, to: 2 }).unmapped).toHaveLength(sliceRange(model, events, null).unmapped.length);
  });

  it("marks the places and the route of a selected person, none for nothing selected", () => {
    const marked = markSelection(index, model, "@I1@", null);

    expect(marked.highlighted.size).toBe(5);
    expect(marked.route.stops).toHaveLength(5);
    expect(markSelection(index, model, null, null).highlighted.size).toBe(0);
    expect(markSelection(index, fileMapOf(indexOf(curieWithMap())), "@I1@", null).route.stops).toHaveLength(4);
  });

  it("marks only what the range keeps", () => {
    expect(markSelection(index, model, "@I1@", { from: 1930, to: 1940 }).highlighted).toEqual(new Set(["passy, haute-savoie, france"]));
  });
});
