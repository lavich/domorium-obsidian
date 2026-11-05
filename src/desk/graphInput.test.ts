// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { GraphInput, type GraphInputHost } from "./graphInput";

type View = { x: number; y: number; k: number };

let el: HTMLElement;
let applied: View[];
let zoomed: [number, number, number][];
let panned: [number, number][];

function input(limits: { min: number; max: number }, view: View = { x: 0, y: 0, k: 1 }): GraphInput {
  const host: GraphInputHost = {
    el,
    transform: () => view,
    apply: (at) => applied.push(at),
    limits: () => limits,
    stopGlide: vi.fn(),
    zoomAt: (factor, x, y) => zoomed.push([factor, x, y]),
    panBy: (dx, dy) => panned.push([dx, dy]),
    hideTip: vi.fn(),
    onControls: () => false,
    hovered: vi.fn(),
    left: vi.fn(),
  };
  const made = new GraphInput(host);
  made.listen();
  return made;
}

const pointer = (type: string, id: number, x: number, y: number, buttons = 1): void => {
  el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: y, button: 0, buttons, pointerType: "touch", bubbles: true }));
};

beforeAll(installObsidianDom);
beforeEach(() => {
  el = document.createElement("div");
  document.body.replaceChildren(el);
  applied = [];
  zoomed = [];
  panned = [];
});

describe("the input of a canvas", () => {
  it("cannot pinch past the limits the host names", () => {
    input({ min: 1, max: 4 });
    pointer("pointerdown", 1, 100, 100);
    pointer("pointerdown", 2, 200, 100);
    pointer("pointermove", 2, 2000, 100);
    pointer("pointermove", 2, 101, 100);

    expect(applied.map((view) => view.k)).toEqual([4, 1]);
  });

  it("pans on a drag past four pixels and not before", () => {
    input({ min: 0.05, max: 3 });
    pointer("pointerdown", 1, 100, 100);
    pointer("pointermove", 1, 102, 100);
    expect(applied).toEqual([]);
    pointer("pointermove", 1, 130, 110);

    expect(applied).toEqual([{ x: 30, y: 10, k: 1 }]);
  });

  it("pinches about the midpoint of two pointers", () => {
    input({ min: 0.05, max: 3 });
    pointer("pointerdown", 1, 100, 100);
    pointer("pointerdown", 2, 200, 100);
    pointer("pointermove", 2, 300, 100);

    const [view] = applied;
    expect(view?.k).toBeCloseTo(2, 6);
    expect(150 * view.k + view.x).toBeCloseTo(200, 6);
  });

  it("zooms on a mouse wheel", () => {
    input({ min: 0.05, max: 3 });
    el.dispatchEvent(new WheelEvent("wheel", { deltaY: -120, deltaMode: 1, clientX: 10, clientY: 10 }));

    expect(zoomed[0]?.[0]).toBeCloseTo(1.12, 6);
  });

  it("pans on a trackpad delta", () => {
    input({ min: 0.05, max: 3 });
    el.dispatchEvent(new WheelEvent("wheel", { deltaY: 8, deltaX: 3, deltaMode: 0 }));

    expect(panned).toEqual([[-3, -8]]);
  });
});
