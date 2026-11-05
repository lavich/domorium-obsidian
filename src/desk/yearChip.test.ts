// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { YearChip } from "./yearChip";
import type { YearRange } from "./yearRange";

beforeAll(installObsidianDom);

let chip: YearChip;
let changed: ReturnType<typeof vi.fn<(range: YearRange | null) => void>>;
let frames: (() => void)[];
let root: HTMLElement;

beforeEach(() => {
  root = document.createElement("div");
  document.body.replaceChildren(root);
  changed = vi.fn();
  frames = [];
  chip = new YearChip(root, { changed }, { frame: (callback) => frames.push(callback), cancel: () => undefined });
  chip.setBounds({ from: 1880, to: 1950 });
});

const button = (): HTMLButtonElement => root.querySelector<HTMLButtonElement>(".gedcom-map-years-chip")!;
const handle = (which: "from" | "to"): HTMLElement => root.querySelector<HTMLElement>(`.is-${which}[role=slider]`)!;
const key = (target: HTMLElement, name: string): void => {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: name, bubbles: true }));
};

describe("the years chip", () => {
  it("is collapsed and reads Years: all", () => {
    expect(button().textContent).toBe("Years: all");
    expect(button().getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelector<HTMLElement>(".gedcom-map-years-panel")?.style.display).toBe("none");
  });

  it("expands into two sliders with a name, a minimum, a maximum and a value read as a year", () => {
    button().click();

    expect(button().getAttribute("aria-expanded")).toBe("true");
    expect(handle("from").getAttribute("aria-valuemin")).toBe("1880");
    expect(handle("from").getAttribute("aria-valuemax")).toBe("1950");
    expect(handle("from").getAttribute("aria-valuenow")).toBe("1880");
    expect(handle("to").getAttribute("aria-valuetext")).toBe("1950");
    expect(root.querySelector(".gedcom-map-years-readout")?.textContent).toBe("1880–1950");
  });

  it("moves a year with Right and ten with Page Up, and never past the other handle", () => {
    button().click();
    key(handle("from"), "ArrowRight");
    key(handle("from"), "PageUp");
    expect(changed).toHaveBeenLastCalledWith({ from: 1891, to: 1950 });
    key(handle("to"), "Home");

    expect(changed).toHaveBeenLastCalledWith({ from: 1891, to: 1891 });
  });

  it("clears to Years: all and collapses", () => {
    button().click();
    key(handle("from"), "End");
    root.querySelector<HTMLButtonElement>(".gedcom-map-years-clear")?.click();

    expect(changed).toHaveBeenLastCalledWith(null);
    expect(button().textContent).toBe("Years: all");
    expect(button().getAttribute("aria-expanded")).toBe("false");
  });

  it("reads the range while collapsed", () => {
    chip.setRange({ from: 1890, to: 1900 });

    expect(button().textContent).toBe("Years: 1890–1900");
  });

  it("shows no chip where nothing has a year", () => {
    chip.setBounds(null);

    expect(chip.el.style.display).toBe("none");
  });

  it("pulls a range back where the bounds move", () => {
    chip.setRange({ from: 1890, to: 1950 });
    changed.mockClear();
    chip.setBounds({ from: 1867, to: 1934 });

    expect(chip.range()).toEqual({ from: 1890, to: 1934 });
    expect(changed).toHaveBeenCalledWith({ from: 1890, to: 1934 });
  });

  it("reports a drag once per frame", () => {
    button().click();
    vi.spyOn(root.querySelector(".gedcom-map-years-track")!, "getBoundingClientRect").mockReturnValue({ left: 0, width: 100 } as DOMRect);
    const node = handle("from");
    node.dispatchEvent(new PointerEvent("pointerdown", { pointerId: 1, bubbles: true }));
    for (const x of [10, 20, 30]) {
      node.dispatchEvent(new PointerEvent("pointermove", { pointerId: 1, clientX: x, bubbles: true }));
    }

    expect(frames).toHaveLength(1);
    frames[0]?.();
    expect(changed).toHaveBeenCalledTimes(1);
    expect(chip.range()).toEqual({ from: 1880 + Math.round(0.3 * 70), to: 1950 });
  });
});
