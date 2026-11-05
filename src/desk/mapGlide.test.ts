import { describe, expect, it } from "vitest";

import { GLIDE_MS } from "./graphCanvas";
import { MapGlide } from "./mapGlide";
import { type MapView, viewOf } from "./mapProjection";

const size = { width: 1400, height: 900 };

function setup(reduced = false) {
  let clock = 0;
  let queued: (() => void) | null = null;
  const applied: MapView[] = [];
  const glide = new MapGlide((view) => applied.push(view), {
    size: () => size,
    now: () => clock,
    frame: (callback) => {
      queued = callback;
      return 1;
    },
    cancel: () => {
      queued = null;
    },
    reduced: () => reduced,
  });
  const advance = (ms: number): void => {
    clock += ms;
    const run = queued;
    queued = null;
    run?.();
  };
  return { glide, applied, advance, pending: () => queued !== null };
}

const from = viewOf({ lat: 48, lon: 2, zoom: 4 }, size);
const near = viewOf({ lat: 50, lon: 8, zoom: 6 }, size);

describe("the glide of the map", () => {
  it("ends exactly on the target, never going backwards in zoom", () => {
    const { glide, applied, advance } = setup();
    glide.to(from, near);
    for (let i = 0; i < 4; i += 1) {
      advance(GLIDE_MS / 4);
    }

    expect(applied.at(-1)).toEqual(near);
    const ks = applied.map((view) => view.k);
    expect(ks).toEqual([...ks].sort((a, b) => a - b));
    expect(glide.active).toBe(false);
  });

  it("jumps in one step where the reader asks for reduced motion", () => {
    const { glide, applied } = setup(true);
    glide.to(from, near);

    expect(applied).toEqual([near]);
  });

  it("jumps a move of more than two and a half screens", () => {
    const { glide, applied } = setup();
    const far = viewOf({ lat: 48, lon: 170, zoom: 4 }, size);
    glide.to(viewOf({ lat: 48, lon: -170, zoom: 4 }, size), far);

    expect(applied).toEqual([far]);
  });

  it("stops where a drag takes over and moves no more", () => {
    const { glide, applied, advance, pending } = setup();
    glide.to(from, near);
    advance(100);
    glide.stop();
    const count = applied.length;
    advance(1000);

    expect(pending()).toBe(false);
    expect(applied).toHaveLength(count);
    expect(glide.active).toBe(false);
  });
});
