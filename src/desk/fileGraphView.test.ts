// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { HOVER_DELAY } from "./dom";
import type { BranchScope } from "./branchScope";
import { CARD, fileGraphOf } from "./fileGraph";
import { fileTimelineOf, type FileTimeline } from "./fileTimeline";
import { GraphCanvas, type CanvasScene } from "./graphCanvas";
import {
  FileGraphBoard,
  fitText,
  readGraphState,
  ZOOM,
  type FileGraphHost,
  type GraphSettings,
  type GraphView,
} from "./fileGraphView";

const WIDE = { width: 1400, height: 900 };
const NARROW = { width: 390, height: 600 };
const WHOLE: BranchScope = {};

let container: HTMLElement;
let host: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  stateChanged: ReturnType<typeof vi.fn<FileGraphHost["stateChanged"]>>;
  setIcon: ReturnType<typeof vi.fn<(element: HTMLElement, icon: string) => void>>;
};

beforeAll(installObsidianDom);
afterEach(resetLanguage);
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  host = {
    select: vi.fn(),
    stateChanged: vi.fn(),
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
  };
});

const curie = (): FileTimeline => fileTimelineOf(curieIndex());

function board(
  model: FileTimeline = curie(),
  settings: Partial<GraphSettings> = {},
  size: { width: number; height: number } | null = WIDE,
): FileGraphBoard {
  const drawn = new FileGraphBoard(container, host satisfies FileGraphHost);
  drawn.show(model, { scope: WHOLE, ...settings });
  if (size) {
    drawn.resized(size);
  }
  return drawn;
}

const all = (selector: string) => [...container.querySelectorAll(selector)].filter((one) => !one.closest("[inert]"));
const drawnPeople = (): string[] => all(".gedcom-fg-person").map((card) => card.getAttribute("data-p") ?? "");
const person = (xref: string) => container.querySelector<SVGElement>(`.gedcom-fg-person[data-p="${xref}"]`);
const card = (xref: string) => container.querySelector<SVGElement>(`[data-card="${xref}"]`);
const pill = (xref: string) => container.querySelector<SVGElement>(`[data-branch="${xref}"]`);
const node = (family: string) => container.querySelector<SVGElement>(`[data-node="${family}"]`);
const scopeText = () => container.querySelector(".gedcom-fg-scope")?.textContent ?? "";

function centreOf(model: FileTimeline, xref: string, scope: BranchScope = WHOLE): [number, number] {
  const placed = fileGraphOf(model, scope).card.get(xref);
  return [(placed?.x ?? NaN) + CARD.width / 2, (placed?.y ?? NaN) + (placed?.height ?? NaN) / 2];
}

function expectCentredOn(view: GraphView | null, at: [number, number], k?: number): void {
  expect(view?.x).toBeCloseTo(at[0], 3);
  expect(view?.y).toBeCloseTo(at[1], 3);
  if (k !== undefined) {
    expect(view?.k).toBeCloseTo(k, 6);
  }
}

function pointer(type: string, target: Element | null | undefined, init: PointerEventInit = {}): void {
  target?.dispatchEvent(new PointerEvent(type, { bubbles: true, pointerId: 1, pointerType: "mouse", ...init }));
}

function click(target: Element | null | undefined, detail = 1): void {
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail }));
}

function tap(target: Element | null | undefined): void {
  pointer("pointerdown", target, { pointerType: "touch" });
  pointer("pointerup", target, { pointerType: "touch" });
  target?.dispatchEvent(Object.assign(new MouseEvent("click", { bubbles: true, detail: 1 }), { pointerType: "touch" }));
}

function key(target: Element | null | undefined, which: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: which });
  target?.dispatchEvent(event);
  return event;
}

const frame = () => new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));

describe("drawing the graph of a file", () => {
  it("draws a card for each person in view, with the name and the years", () => {
    board();

    expect(drawnPeople()).toHaveLength(17);
    expect([...(card("@I1@")?.querySelectorAll(".gedcom-fg-card-name") ?? [])].map((line) => line.textContent)).toEqual([
      "Marie",
      "Skłodowska-Curie",
    ]);
    expect(card("@I1@")?.querySelector(".gedcom-fg-card-years")?.textContent).toBe("1867–1934");
    expect(card("@I15@")?.querySelector(".gedcom-fg-card-name")?.textContent).toBe("Henry Richardson");
    expect(card("@I15@")?.getAttribute("aria-label")).toBe("Henry Richardson Labouisse, 1904–1987");
    expect(container.querySelector("title")).toBeNull();
    expect(container.querySelector(".gedcom-fg-title, .gedcom-fg-summary, .gedcom-fg-head")).toBeNull();
  });

  it("draws no picture on a card, whatever media the person has", () => {
    board();

    expect(container.querySelector(".gedcom-fg-avatar, .gedcom-fg-avatar-holder, .gedcom-fg-card img")).toBeNull();
    expect(Number(card("@I1@")?.querySelector(".gedcom-fg-card-bg")?.getAttribute("height"))).toBe(CARD.height);
  });

  it("floats −, + and Fit over the canvas, right after the search, without starting a drag or a touch", () => {
    const drawn = board();
    const controls = container.querySelector(".gedcom-fg-dock > .gedcom-fg-controls");
    const k = drawn.view()?.k ?? 1;

    expect(container.querySelector(".gedcom-fg-canvas")?.firstElementChild).toBe(container.querySelector(".gedcom-fg-dock"));
    expect(container.querySelector(".gedcom-fg-dock")?.firstElementChild).toBe(container.querySelector(".gedcom-fg-find"));
    expect(container.querySelector(".gedcom-fg-find")?.nextElementSibling).toBe(controls);
    expect([...(controls?.querySelectorAll("button") ?? [])].map((one) => one.getAttribute("aria-label"))).toEqual([
      "Zoom out",
      "Zoom in",
      "Fit",
    ]);
    const zoomIn = controls?.querySelector<HTMLElement>(".gedcom-fg-zoom-in");
    pointer("pointerdown", zoomIn, { clientX: 10, clientY: 10 });
    pointer("pointermove", zoomIn, { buttons: 1, clientX: 60, clientY: 60 });
    pointer("pointerup", zoomIn);
    zoomIn?.click();
    expect(drawn.view()?.k).toBeCloseTo(k * 1.2, 6);
    expect(host.select).not.toHaveBeenCalled();
  });

  it("tints a card by its person's surname with no stripe, its lines centred", () => {
    board();

    expect(container.querySelector(".gedcom-fg-card-side")).toBeNull();
    const lines = [...(card("@I1@")?.querySelectorAll("text") ?? [])];
    expect(lines.map((line) => [line.getAttribute("x"), line.getAttribute("text-anchor")])).toEqual(
      lines.map(() => [String(CARD.width / 2), "middle"]),
    );
  });

  it("gives the cards of one surname the same tint, and of unlike surnames different ones", () => {
    board(fileTimelineOf(indexOf([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @A@ INDI", "1 NAME Ivan /Лобанов/", "0 @B@ INDI", "1 NAME Anna /Лобанова/", "0 @C@ INDI", "1 NAME Olga /Сидорова/",
      "0 @D@ INDI", "1 NAME John", "0 TRLR", "",
    ].join("\n"))));

    const fill = (xref: string) => person(xref)?.getAttribute("style")?.match(/--gedcom-surname-fill-light:\s*hsl\(([\d.]+)/u)?.[1];
    expect(Math.abs(Number(fill("@A@")) - Number(fill("@B@")))).toBeLessThan(3);
    expect(Math.abs(Number(fill("@A@")) - Number(fill("@C@")))).toBeGreaterThan(50);
    expect(person("@D@")?.getAttribute("style")).toContain("hsl(0 0%");
    expect(person("@A@")?.getAttribute("class")).not.toMatch(/is-[fmu]\b/u);
  });

  it("writes a name with no surname on one line", () => {
    board(fileTimelineOf(indexOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME John", "0 TRLR", ""].join("\n"))));

    expect([...(card("@I1@")?.querySelectorAll(".gedcom-fg-card-name") ?? [])].map((line) => line.textContent)).toEqual([
      "John",
    ]);
  });

  it("builds the drawing as elements, with no markup handed in", () => {
    board();

    expect(container.querySelector("svg")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(container.querySelector(".gedcom-fg-card-bg")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(all(".gedcom-fg-line")).toHaveLength(11);
    expect(node("@F3@")?.textContent).toBe("’95");
    expect(node("@F2@")?.getAttribute("class")).toContain("is-undated");
    expect(node("@F2@")?.textContent).toBe("");
  });

  it("draws only the cards meeting the window and one window around it", () => {
    const drawn = board();
    const window = { left: 0, top: 0, right: 300, bottom: 60 };
    drawn.draw(window);
    const layout = fileGraphOf(curie(), WHOLE);
    const expected = layout.cards
      .filter((one) => one.x <= 600 && one.x + CARD.width >= -300 && one.y <= 120 && one.y + CARD.height >= -60)
      .map((one) => one.id);

    expect(drawnPeople()).toEqual(expected);
    expect(expected.length).toBeLessThan(17);
  });

  it("keeps the element of a card still in range as the window moves", () => {
    const drawn = board();
    drawn.draw({ left: 0, top: 0, right: 400, bottom: 200 });
    const kept = person("@I9@");
    drawn.draw({ left: 100, top: 0, right: 500, bottom: 200 });

    expect(person("@I9@")).toBe(kept);
  });

  it("puts a card drawn later at its place in row order", () => {
    const drawn = board();
    const layout = fileGraphOf(curie(), WHOLE);
    drawn.draw({ left: 1600, top: 0, right: 1700, bottom: 10 });
    drawn.draw({ left: 0, top: 0, right: 2000, bottom: 500 });

    expect(drawnPeople()).toEqual(layout.cards.map((one) => one.id));
  });

  it("draws no text far out", () => {
    board(curie(), { view: { x: 900, y: 200, k: 0.2 } });

    expect(drawnPeople()).toHaveLength(17);
    expect(all(".gedcom-fg-items text")).toHaveLength(0);
    expect(all("[data-branch]")).toHaveLength(0);
  });

  it("shows no scope line for the whole file", () => {
    board();

    expect(container.querySelector('[class*="legend"]')).toBeNull();
    expect(scopeText()).toBe("");
    expect(container.querySelector<HTMLElement>(".gedcom-fg-scope")?.style.display).toBe("none");
    expect(container.querySelector(".gedcom-fg-tools")).toBeNull();
  });

  it("lights every card of Marie's branch, and no line or family node, replacing nothing", () => {
    const drawn = board();
    const before = all(".gedcom-fg-view *");
    drawn.highlight("@I1@");

    const lit = all(".gedcom-fg-person.is-on").map((one) => one.getAttribute("data-p"));
    expect(lit.sort()).toEqual(
      ["@I1@", "@I12@", "@I13@", "@I14@", "@I15@", "@I16@", "@I17@", "@I2@", "@I3@", "@I4@"].sort(),
    );
    expect(person("@I1@")?.classList.contains("is-hl")).toBe(true);
    expect(all(".gedcom-fg-line.is-on, .gedcom-fg-family.is-on")).toHaveLength(0);
    expect(container.querySelector(".gedcom-fg-svg")?.classList.contains("has-hl")).toBe(true);
    expect(all(".gedcom-fg-view *")).toEqual(before);
  });

  it("lights Hélène's ancestors and fades Ève", () => {
    const drawn = board();
    drawn.highlight("@I16@");

    const lit = all(".gedcom-fg-person.is-on").map((one) => one.getAttribute("data-p"));
    expect(lit.sort()).toEqual(["@I1@", "@I10@", "@I12@", "@I14@", "@I16@", "@I2@", "@I3@", "@I4@", "@I9@"].sort());
    expect(person("@I13@")?.classList.contains("is-on")).toBe(false);
  });

  it("lights a person once the pointer has rested, only the last of a sweep, and puts the light out after the same rest", () => {
    vi.useFakeTimers();
    try {
      board();
      pointer("pointermove", card("@I1@"));
      vi.advanceTimersByTime(HOVER_DELAY / 2);
      pointer("pointermove", card("@I2@"));
      vi.advanceTimersByTime(HOVER_DELAY - 1);
      expect(all(".is-on")).toHaveLength(0);

      vi.advanceTimersByTime(1);
      expect(person("@I2@")?.classList.contains("is-hl")).toBe(true);
      expect(person("@I1@")?.classList.contains("is-hl")).toBe(false);
      pointer("pointerleave", container.querySelector(".gedcom-fg-canvas"));
      expect(person("@I2@")?.classList.contains("is-hl")).toBe(true);
      vi.advanceTimersByTime(HOVER_DELAY);
      expect(all(".is-on")).toHaveLength(0);

      card("@I12@")?.focus();
      expect(person("@I12@")?.classList.contains("is-hl")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it("puts the light out as the pointer moves off a card within the canvas, or the focus leaves the cards", () => {
    board();
    pointer("pointermove", card("@I2@"));
    pointer("pointermove", container.querySelector(".gedcom-fg-svg"));

    expect(all(".is-on")).toHaveLength(0);
    card("@I1@")?.focus();
    card("@I2@")?.focus();
    expect(person("@I2@")?.classList.contains("is-hl")).toBe(true);
    container.querySelector<HTMLInputElement>(".gedcom-fg-search")?.focus();
    expect(all(".is-on")).toHaveLength(0);
  });

  it("shows a family node's spouses, marriage and children", () => {
    board();
    pointer("pointermove", node("@F3@")?.querySelector("circle"));
    const tip = container.querySelector(".gedcom-fg-tip");

    expect(tip?.classList.contains("is-shown")).toBe(true);
    expect(tip?.textContent).toContain("Pierre Curie ⚭ Marie Skłodowska-Curie");
    expect(tip?.textContent).toContain("Married 26 JUL 1895");
    expect(tip?.textContent).toContain("Sceaux, France");
    expect(tip?.textContent).toContain("2 children");

    pointer("pointermove", node("@F2@")?.querySelector("circle"));
    expect(tip?.textContent).toContain("No marriage date");
  });
});

describe("the view", () => {
  it("zooms between 0.05 and 3", () => {
    const drawn = board();
    drawn.zoomAt(1000, 0, 0);
    expect(drawn.view()?.k).toBe(ZOOM.max);
    drawn.zoomAt(0.00001, 0, 0);
    expect(drawn.view()?.k).toBe(ZOOM.min);
  });

  it("fits at most at 1.4, and at the floor stops centred on the scope", () => {
    const layout = fileGraphOf(curie(), WHOLE);
    const roomy = board(curie(), {}, { width: 20_000, height: 20_000 });
    roomy.fit();
    expectCentredOn(roomy.view(), [layout.width / 2, layout.height / 2], ZOOM.fit);

    const tiny = board(curie(), {}, { width: 60, height: 60 });
    tiny.fit();
    expectCentredOn(tiny.view(), [layout.width / 2, layout.height / 2], ZOOM.min);
  });

  it("opens fitted where that can be read, and waits for the canvas to have a size", () => {
    const drawn = board(curie(), {}, null);
    expect(drawn.view()).toBeNull();
    drawn.resized({ width: 0, height: 0 });
    expect(drawn.view()).toBeNull();
    drawn.resized(WIDE);

    const layout = fileGraphOf(curie(), WHOLE);
    expectCentredOn(drawn.view(), [layout.width / 2, layout.height / 2]);
    expect(drawn.view()?.k).toBeGreaterThanOrEqual(ZOOM.opens);
  });

  it("opens readable on the person of the tab, else the branch's person, else the first card of the top row", () => {
    const model = curie();
    expectCentredOn(board(model, { around: "@I1@" }, NARROW).view(), centreOf(model, "@I1@"), ZOOM.readable);

    const branch = { focus: "@I12@" };
    expectCentredOn(
      board(model, { scope: branch, around: "@F1@" }, { width: 300, height: 600 }).view(),
      centreOf(model, "@I12@", branch),
      ZOOM.readable,
    );
    const first = fileGraphOf(model, WHOLE).cards[0]?.id ?? "";
    expectCentredOn(board(model, {}, NARROW).view(), centreOf(model, first), ZOOM.readable);
  });

  it("restores a saved view as its centre and zoom", () => {
    const drawn = board(curie(), { view: { x: 500, y: 200, k: 0.8 } }, NARROW);

    expectCentredOn(drawn.view(), [500, 200], 0.8);
  });

  it("keeps the view for a new reading of the file with the same scope", () => {
    const drawn = board();
    drawn.zoomAt(1.5, 100, 100);
    drawn.panBy(40, -30);
    const before = drawn.view();
    drawn.show(fileTimelineOf(curieIndex()), { scope: WHOLE, around: "@I17@" });

    expect(drawn.view()).toEqual(before);
  });

  it("centres a new branch on its person, and the whole file on the person just left", () => {
    const model = curie();
    const drawn = board(model, { around: "@I1@" });
    pill("@I12@")?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    const branch = { focus: "@I12@" };
    expect(scopeText()).toContain("Branch of Irène Joliot-Curie · 10 of 17 people");
    expectCentredOn(drawn.view(), centreOf(model, "@I12@", branch), ZOOM.readable);
    expect(host.stateChanged.mock.lastCall?.[0].scope).toEqual(branch);
    expect(host.stateChanged.mock.lastCall?.[0].view?.k).toBeCloseTo(ZOOM.readable, 6);

    container.querySelector<HTMLElement>(".gedcom-fg-whole")?.click();
    expect(drawnPeople()).toHaveLength(17);
    expectCentredOn(drawn.view(), centreOf(model, "@I12@"), ZOOM.readable);
  });

  it("zooms at the pointer with a mouse wheel or Ctrl, and pans with a trackpad's scroll", () => {
    const drawn = board();
    const canvas = container.querySelector(".gedcom-fg-canvas");
    let time = 0;
    const wheel = ({ ctrlKey = false, ...init }: WheelEventInit, after = 1000) => {
      const event = Object.assign(new WheelEvent("wheel", { bubbles: true, cancelable: true, ...init }), {
        clientX: 200,
        clientY: 100,
        ctrlKey,
      });
      time += after;
      Object.defineProperty(event, "timeStamp", { value: time });
      canvas?.dispatchEvent(event);
      return event;
    };
    const before = drawn.view();
    const k = before?.k ?? 1;

    expect(wheel({ deltaY: 100 }).defaultPrevented).toBe(true);
    expect(drawn.view()?.k).toBeCloseTo(k / 1.12, 6);
    wheel({ deltaY: -100 });
    expect(drawn.view()?.k).toBeCloseTo(k, 6);
    expect(drawn.view()?.x).toBeCloseTo(before?.x ?? 0, 6);

    wheel({ deltaY: 10 });
    expect(drawn.view()?.k).toBeCloseTo(k, 6);
    expect(drawn.view()?.y).toBeCloseTo((before?.y ?? 0) + 10 / k, 6);
    wheel({ deltaX: 30, deltaY: 0 });
    expect(drawn.view()?.x).toBeCloseTo((before?.x ?? 0) + 30 / k, 6);

    wheel({ deltaY: -10, ctrlKey: true });
    expect(drawn.view()?.k).toBeGreaterThan(k);

    const scale = drawn.view()?.k ?? 1;
    wheel({ deltaY: 10 });
    wheel({ deltaY: 120 }, 20);
    expect(drawn.view()?.k).toBe(scale);
    wheel({ deltaY: 120 }, 400);
    expect(drawn.view()?.k).toBeLessThan(scale);
  });

  it("ends a drag whose button was let go outside the canvas, and drags with no other button", () => {
    const drawn = board();
    const target = card("@I1@");
    pointer("pointerdown", target, { clientX: 100, clientY: 100 });
    pointer("pointermove", target, { buttons: 1, clientX: 140, clientY: 100 });
    const dragged = drawn.view();
    pointer("pointermove", target, { buttons: 0, clientX: 300, clientY: 300 });

    expect(drawn.view()).toEqual(dragged);
    pointer("pointerdown", target, { button: 2, buttons: 2, clientX: 100, clientY: 100 });
    pointer("pointermove", target, { buttons: 2, clientX: 200, clientY: 200 });
    expect(drawn.view()).toEqual(dragged);
  });

  it("offers no stepper for a number of generations on the scope line", () => {
    board(curie(), { scope: { focus: "@I12@" } });

    expect(scopeText()).toContain("10 of 17 people");
    expect(container.querySelector("[data-step]")).toBeNull();
    expect(container.querySelectorAll(".gedcom-fg-scope button")).toHaveLength(1);
  });

  it("opens a saved state with numbers of generations on the branch of its focus, and saves it again without them", () => {
    const saved = readGraphState({ focus: "@I1@", up: 0, down: 0 });
    const drawn = board(curie(), { scope: saved });

    expect(scopeText()).toContain("Branch of Marie Skłodowska-Curie · 10 of 17 people");
    expect(drawnPeople()).toHaveLength(10);
    drawn.resized({ width: 1200, height: 900 });
    pill("@I1@")?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(drawnPeople()).toHaveLength(17);
    expect(JSON.stringify(host.stateChanged.mock.calls)).not.toMatch(/"(up|down)"/);
  });

  it("zooms around the middle of a pinch, and opens nothing after it", () => {
    const drawn = board();
    const target = card("@I1@");
    const k = drawn.view()?.k ?? 1;
    pointer("pointerdown", target, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 100 });
    pointer("pointerdown", target, { pointerId: 2, pointerType: "touch", clientX: 200, clientY: 100 });
    const graphAt = (x: number, y: number): [number, number] => {
      const view = drawn.view();
      const scale = view?.k ?? 1;
      return [(x - (WIDE.width / 2 - (view?.x ?? 0) * scale)) / scale, (y - (WIDE.height / 2 - (view?.y ?? 0) * scale)) / scale];
    };
    const under = graphAt(150, 100);
    pointer("pointermove", target, { pointerId: 2, pointerType: "touch", buttons: 1, clientX: 300, clientY: 100 });

    expect(drawn.view()?.k).toBeCloseTo(k * 2, 6);
    expect(graphAt(200, 100)[0]).toBeCloseTo(under[0], 6);
    expect(graphAt(200, 100)[1]).toBeCloseTo(under[1], 6);
    pointer("pointerup", target, { pointerId: 2, pointerType: "touch" });
    pointer("pointerup", target, { pointerId: 1, pointerType: "touch" });
    click(target);
    expect(host.select).not.toHaveBeenCalled();
    expect(person("@I1@")?.classList.contains("is-armed")).toBe(false);
  });

  it("reads a saved state, keeping its scope and view within bounds", () => {
    expect(readGraphState({ focus: "@I1@", up: 12, down: -3, view: { x: 1, y: 2, k: 9 } })).toEqual({
      focus: "@I1@",
      view: { x: 1, y: 2, k: ZOOM.max },
    });
    expect(readGraphState({ focus: "", view: { x: 1 } })).toEqual({});
  });
});

describe("the search", () => {
  it("fades the cards that do not match", () => {
    const drawn = board();
    drawn.setQuery("joliot");

    const kept = all(".gedcom-fg-person:not(.is-dim)").map((one) => one.getAttribute("data-p"));
    expect(kept.sort()).toEqual(["@I12@", "@I14@", "@I16@", "@I17@"]);
  });

  it("moves the view to each match in turn on Enter, drawing a card not drawn before", async () => {
    const model = curie();
    board(model, { view: { x: 0, y: 0, k: 2 } }, { width: 200, height: 150 });
    const search = container.querySelector<HTMLInputElement>(".gedcom-fg-search");
    if (search) {
      search.value = "joliot";
      search.dispatchEvent(new Event("input"));
    }
    expect(person("@I17@")).toBeNull();

    for (const xref of ["@I14@", "@I12@", "@I16@", "@I17@", "@I14@"]) {
      key(search, "Enter");
      await frame();
      expect(drawnPeopleCentre(), xref).toEqual(centreOf(model, xref).map((value) => Math.round(value)));
      expect(person(xref)?.classList.contains("is-hl"), xref).toBe(true);
    }
  });

  it("has no native tooltip on its buttons, and asks Obsidian's to stand clear of the group", () => {
    board();
    const buttons = [...container.querySelectorAll(".gedcom-fg-controls button, .gedcom-fg-find button, .gedcom-fg-pill")];

    expect(buttons.length).toBeGreaterThanOrEqual(7);
    for (const button of buttons.filter((one) => one.tagName === "BUTTON")) {
      expect(button.hasAttribute("title"), button.className).toBe(false);
      expect(button.getAttribute("aria-label"), button.className).toBeTruthy();
      expect(button.getAttribute("data-tooltip-position"), button.className).toBe(
        "bottom",
      );
    }
    expect(container.querySelector("title, [title]")).toBeNull();
  });

  describe("gliding to a match", () => {
    const view = () => container.querySelector<SVGElement>(".gedcom-fg-view");
    const gliding = () => view()?.classList.contains("is-gliding");
    const search = (text: string) => {
      container.querySelector<HTMLElement>(".gedcom-fg-find-toggle")?.click();
      const field = container.querySelector<HTMLInputElement>(".gedcom-fg-search");
      if (field) {
        field.value = text;
        field.dispatchEvent(new Event("input"));
      }
    };

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("moves by a transition for a step to a match, and stops where it is when a drag begins", () => {
      board(curie(), { view: { x: 0, y: 0, k: 0.6 } });
      expect(gliding()).toBe(false);
      search("joliot");
      container.querySelector<HTMLElement>(".gedcom-fg-find-next")?.click();

      expect(gliding()).toBe(true);
      expect(view()?.style.transform).toMatch(/^translate\(.+\) scale\(.+\)$/);
      pointer("pointerdown", container.querySelector(".gedcom-fg-canvas"), { clientX: 10, clientY: 10 });
      expect(gliding()).toBe(false);
    });

    it("jumps for a move too long to show, and for a drag, the wheel and a first view", () => {
      board(curie(), { view: { x: 0, y: 0, k: 0.6 } }, { width: 60, height: 40 });
      expect(gliding()).toBe(false);
      search("joliot");
      container.querySelector<HTMLElement>(".gedcom-fg-find-next")?.click();
      expect(gliding()).toBe(false);
    });

    it("does not glide when the reader asks for reduced motion", () => {
      vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
      board(curie(), { view: { x: 0, y: 0, k: 0.6 } });
      search("joliot");
      container.querySelector<HTMLElement>(".gedcom-fg-find-next")?.click();

      expect(gliding()).toBe(false);
    });
  });

  describe("the search over the canvas", () => {
    const find = () => container.querySelector<HTMLElement>(".gedcom-fg-find");
    const input = () => container.querySelector<HTMLInputElement>(".gedcom-fg-search");
    const type = (text: string) => {
      const field = input();
      if (field) {
        field.value = text;
        field.dispatchEvent(new Event("input"));
      }
    };
    const click = (selector: string) => container.querySelector<HTMLElement>(selector)?.click();

    it("floats inside the canvas, first in its order, as an icon that opens into a field", () => {
      board();

      expect(find()?.parentElement?.parentElement?.classList.contains("gedcom-fg-canvas")).toBe(true);
      expect(find()?.nextElementSibling?.classList.contains("gedcom-fg-controls")).toBe(true);
      expect(find()?.classList.contains("is-open")).toBe(false);
      expect(input()?.tabIndex).toBe(-1);
      click(".gedcom-fg-find-toggle");
      expect(find()?.classList.contains("is-open")).toBe(true);
      expect(input()?.tabIndex).toBe(0);
      const toggle = container.querySelector<HTMLElement>(".gedcom-fg-find-toggle");
      expect(toggle?.getAttribute("aria-expanded")).toBe("true");
      expect(toggle?.tabIndex).toBe(-1);
      expect(document.activeElement).toBe(input());
      key(input(), "Escape");
      expect(toggle?.getAttribute("aria-expanded")).toBe("false");
      expect(toggle?.tabIndex).toBe(0);
      expect(document.activeElement).toBe(toggle);
    });

    it("clears with the cross and stays open, then closes on the cross of an empty field", () => {
      board();
      click(".gedcom-fg-find-toggle");
      type("joliot");
      expect(all(".gedcom-fg-person:not(.is-dim)")).toHaveLength(4);

      click(".gedcom-fg-find-clear");
      expect(input()?.value).toBe("");
      expect(find()?.classList.contains("is-open")).toBe(true);
      expect(all(".gedcom-fg-person.is-dim")).toHaveLength(0);

      click(".gedcom-fg-find-clear");
      expect(find()?.classList.contains("is-open")).toBe(false);
    });

    it("clears on Escape, then closes on Escape of an empty field, and keeps a query open when focus leaves", async () => {
      board();
      click(".gedcom-fg-find-toggle");
      type("joliot");
      key(input(), "Escape");
      expect(input()?.value).toBe("");
      expect(find()?.classList.contains("is-open")).toBe(true);
      key(input(), "Escape");
      expect(find()?.classList.contains("is-open")).toBe(false);

      click(".gedcom-fg-find-toggle");
      type("joliot");
      input()?.blur();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      expect(find()?.classList.contains("is-open")).toBe(true);
      expect(all(".gedcom-fg-person:not(.is-dim)")).toHaveLength(4);
      type("");
      input()?.focus();
      input()?.blur();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      expect(find()?.classList.contains("is-open")).toBe(false);
    });

    it("counts the matches, steps with the arrows in the cards' order, wraps, and says when there are none", () => {
      board();
      const count = () => container.querySelector(".gedcom-fg-find-count")?.textContent;
      const next = container.querySelector<HTMLButtonElement>(".gedcom-fg-find-next");
      const previous = container.querySelector<HTMLButtonElement>(".gedcom-fg-find-prev");
      click(".gedcom-fg-find-toggle");
      expect(next?.disabled).toBe(true);

      type("joliot");
      expect(count()).toBe("4 matches");
      expect(next?.disabled).toBe(false);
      next?.click();
      expect(count()).toBe("1 / 4");
      expect(person("@I14@")?.classList.contains("is-current")).toBe(true);
      previous?.click();
      expect(count()).toBe("4 / 4");
      expect(person("@I17@")?.classList.contains("is-current")).toBe(true);
      expect(person("@I14@")?.classList.contains("is-current")).toBe(false);
      next?.click();
      expect(count()).toBe("1 / 4");
      expect(all(".gedcom-fg-person.is-current")).toHaveLength(1);
      expect(all(".gedcom-fg-person:not(.is-dim)")).toHaveLength(4);

      type("zzz");
      expect(count()).toBe("No results");
      expect(next?.disabled).toBe(true);
      expect(previous?.disabled).toBe(true);
      type("");
      expect(count()).toBe("");
    });

    it("goes back to the previous match on Shift+Enter", async () => {
      const model = curie();
      board(model, { view: { x: 0, y: 0, k: 2 } }, { width: 200, height: 150 });
      type("joliot");
      key(input(), "Enter");
      key(input(), "Enter");
      const back = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "Enter", shiftKey: true });
      input()?.dispatchEvent(back);
      await frame();

      expect(person("@I14@")?.classList.contains("is-hl")).toBe(true);
    });
  });

  function drawnPeopleCentre(): number[] {
    const changed = host.stateChanged.mock.lastCall?.[0].view;
    return [Math.round(changed?.x ?? NaN), Math.round(changed?.y ?? NaN)];
  }
});

describe("activating", () => {
  it("opens a person from their card and a family from its node, and shows a branch from its pill", () => {
    board();
    click(card("@I12@")?.querySelector(".gedcom-fg-card-bg"));
    click(node("@F3@")?.querySelector("circle"));

    expect(host.select.mock.calls).toEqual([["@I12@"], ["@F3@"]]);
    click(pill("@I12@")?.querySelector("rect"));
    expect(scopeText()).toContain("Branch of Irène Joliot-Curie");
    expect(drawnPeople()).toHaveLength(10);
  });

  it("drags from a card once it has moved four pixels, and opens nothing after the drag", () => {
    const drawn = board();
    const target = card("@I1@");
    const before = drawn.view();
    pointer("pointerdown", target, { clientX: 100, clientY: 100 });
    pointer("pointermove", target, { buttons: 1, clientX: 102, clientY: 101 });
    expect(drawn.view()).toEqual(before);
    pointer("pointermove", target, { buttons: 1, clientX: 130, clientY: 120 });
    pointer("pointerup", target, { clientX: 130, clientY: 120 });
    click(target);

    expect(drawn.view()?.x).toBeCloseTo((before?.x ?? 0) - 30 / (before?.k ?? 1), 6);
    expect(host.select).not.toHaveBeenCalled();

    pointer("pointerdown", target, { clientX: 100, clientY: 100 });
    pointer("pointermove", target, { buttons: 1, clientX: 102, clientY: 101 });
    pointer("pointerup", target, { clientX: 102, clientY: 101 });
    click(target);
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch, lights the person and offers the branch first, and opens them on the second", () => {
    board();
    tap(card("@I1@"));

    expect(person("@I1@")?.classList.contains("is-hl")).toBe(true);
    expect(person("@I1@")?.classList.contains("is-armed")).toBe(true);
    expect(host.select).not.toHaveBeenCalled();
    tap(card("@I1@"));
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("returns to the whole file on Branch again, centred on the person, by mouse, keyboard and touch", () => {
    const model = curie();
    const drawn = board(model);
    click(pill("@I12@")?.querySelector("rect"));
    expect(pill("@I12@")?.getAttribute("aria-pressed")).toBe("true");
    expect(pill("@I14@")?.getAttribute("aria-pressed")).toBe("false");

    click(pill("@I12@")?.querySelector("rect"));
    expect(drawnPeople()).toHaveLength(17);
    expect(scopeText()).toBe("");
    expectCentredOn(drawn.view(), centreOf(model, "@I12@"), ZOOM.readable);
    expect(host.stateChanged.mock.lastCall?.[0].scope).toEqual({});

    pill("@I12@")?.focus();
    key(pill("@I12@"), "Enter");
    expect(drawnPeople()).toHaveLength(10);
    key(document.activeElement, "Enter");
    expect(drawnPeople()).toHaveLength(17);
    expect(document.activeElement?.getAttribute("data-branch")).toBe("@I12@");

    click(pill("@I12@")?.querySelector("rect"));
    tap(pill("@I12@")?.querySelector("rect"));
    expect(drawnPeople()).toHaveLength(10);
    expect(person("@I12@")?.classList.contains("is-armed")).toBe(true);
    tap(pill("@I12@")?.querySelector("rect"));
    expect(drawnPeople()).toHaveLength(17);
  });

  it("on a touch, takes the hidden branch of a card not yet lit for the card", () => {
    board();
    tap(pill("@I12@")?.querySelector("rect"));

    expect(drawnPeople()).toHaveLength(17);
    expect(person("@I12@")?.classList.contains("is-armed")).toBe(true);
    tap(pill("@I12@")?.querySelector("rect"));
    expect(drawnPeople()).toHaveLength(10);
  });

  it("cuts a name too wide for its card by its measured width, between code points", () => {
    const measure = (text: string) => Array.from(text).length * 10;

    expect(fitText("Short", 100, measure)).toBe("Short");
    expect(fitText("ЖЖЖЖЖЖЖЖЖЖЖЖ", 100, measure)).toBe("ЖЖЖЖЖЖЖЖЖ…");
    expect(fitText("👪👪👪👪👪👪👪👪👪👪👪", 50, measure)).toBe("👪👪👪👪…");
  });

  it("on a touch of a family node, shows it with the way to the family's page", () => {
    board();
    tap(node("@F3@")?.querySelector("circle"));
    const pop = container.querySelector(".gedcom-fg-pop");

    expect(pop?.classList.contains("is-shown")).toBe(true);
    expect(pop?.textContent).toContain("Married 26 JUL 1895");
    expect(host.select).not.toHaveBeenCalled();
    container.querySelector<HTMLElement>(".gedcom-fg-pop-open")?.click();
    expect(host.select).toHaveBeenCalledWith("@F3@");
  });

  it("on a touch of empty space, puts the light out", () => {
    board();
    tap(card("@I1@"));
    tap(container.querySelector(".gedcom-fg-svg"));

    expect(all(".is-on")).toHaveLength(0);
    tap(card("@I1@"));
    expect(host.select).not.toHaveBeenCalled();
  });

  it("opens a person from a keyboard's click even after a touch", () => {
    board();
    tap(card("@I2@"));
    click(card("@I1@"), 0);

    expect(host.select).toHaveBeenCalledWith("@I1@");
  });
});

describe("the keyboard", () => {
  it("reaches cards, their branch and family nodes in row order, each node after its left spouse", () => {
    board();
    const order = all("[tabindex]").filter((one) => !one.closest(".gedcom-fg-find")).map(
      (one) =>
        one.getAttribute("data-card") ??
        (one.hasAttribute("data-branch") ? `branch ${one.getAttribute("data-branch")}` : one.getAttribute("data-node")),
    );
    const layout = fileGraphOf(curie(), WHOLE);
    const expected = layout.cards.flatMap((one) => [
      one.id,
      `branch ${one.id}`,
      ...layout.nodes.filter((family) => family.spouses[0] === one.id).map((family) => family.family),
    ]);

    expect(order).toEqual(expected);
    expect(order.indexOf("@F3@")).toBe(order.indexOf("branch @I2@") + 1);
    expect(card("@I1@")?.getAttribute("aria-label")).toBe("Marie Skłodowska-Curie, 1867–1934");
    expect(card("@I1@")?.getAttribute("role")).toBe("button");
    expect(node("@F3@")?.getAttribute("aria-label")).toBe(
      "Family of Pierre Curie ⚭ Marie Skłodowska-Curie, married in 1895",
    );
    expect(node("@F2@")?.getAttribute("aria-label")).toBe(
      "Family of Eugène Curie ⚭ Sophie-Claire Depouilly, no marriage date",
    );
  });

  it("places the node of a third marriage and of a marriage across rows after the left or upper spouse", () => {
    const people = (...ids: string[]) =>
      ids.flatMap((id) => {
        const [xref = "", sex = "", ...links] = id.split(" ");
        return [`0 @${xref}@ INDI`, `1 NAME ${xref} /T/`, `1 SEX ${sex}`, ...links.map((one) => `1 ${one.replace(":", " @")}@`)];
      });
    const families = (...ids: string[]) =>
      ids.flatMap((id) => {
        const [xref = "", husb = "", wife = "", ...children] = id.split(" ");
        return [`0 @${xref}@ FAM`, `1 HUSB @${husb}@`, `1 WIFE @${wife}@`, ...children.map((child) => `1 CHIL @${child}@`)];
      });
    const text = (...lines: string[]) => ["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR", ""].join("\n");
    const followsSpouse = (model: FileTimeline, kind: string): void => {
      container.replaceChildren();
      board(model);
      const found = fileGraphOf(model, WHOLE).nodes.find((family) => family.kind === kind);
      const order = all("[data-card], [data-node]").map((one) => one.getAttribute("data-card") ?? one.getAttribute("data-node"));
      const spouse = order.indexOf(found?.spouses[0] ?? "");
      const nextCard = order.findIndex((one, index) => index > spouse && one?.startsWith("@I"));
      expect(found, kind).toBeDefined();
      expect(order.slice(spouse + 1, nextCard < 0 ? undefined : nextCard), kind).toContain(found?.family);
    };

    followsSpouse(
      fileTimelineOf(
        indexOf(
          text(
            ...people("IA M FAMS:F1 FAMS:F2 FAMS:F3", "IB F FAMS:F1", "IC F FAMS:F2", "ID F FAMS:F3"),
            ...families("F1 IA IB", "F2 IA IC", "F3 IA ID"),
          ),
        ),
      ),
      "below",
    );
    followsSpouse(
      fileTimelineOf(
        indexOf(
          text(
            ...people("IM M FAMS:F1 FAMS:F3", "IW F FAMS:F1", "IC M FAMC:F1 FAMS:F2", "IV F FAMS:F2", "IG F FAMC:F2 FAMS:F3"),
            ...families("F1 IM IW IC", "F2 IC IV IG", "F3 IM IG"),
          ),
        ),
      ),
      "across",
    );
  });

  it("activates a focused card, branch or node on Enter or Space, without scrolling", () => {
    board();
    card("@I1@")?.focus();
    expect(key(card("@I1@"), "Enter").defaultPrevented).toBe(true);
    expect(key(node("@F3@"), " ").defaultPrevented).toBe(true);

    expect(host.select.mock.calls).toEqual([["@I1@"], ["@F3@"]]);
    pill("@I12@")?.focus();
    key(pill("@I12@"), " ");
    expect(drawnPeople()).toHaveLength(10);
    expect(document.activeElement?.getAttribute("data-branch")).toBe("@I12@");
  });

  it("lights the person whose card takes the focus, and keeps the focus through a redraw", () => {
    const drawn = board();
    card("@I1@")?.focus();

    expect(person("@I1@")?.classList.contains("is-hl")).toBe(true);
    drawn.draw({ left: 5000, top: 5000, right: 5100, bottom: 5100 });
    expect(document.activeElement?.getAttribute("data-card")).toBe("@I1@");
    drawn.zoomAt(0.1, 0, 0);
    drawn.draw(drawn.windowOf() ?? { left: 0, top: 0, right: 1, bottom: 1 });
    expect(document.activeElement?.getAttribute("data-card")).toBe("@I1@");
  });

  it("brings a focused card into view", () => {
    const model = curie();
    const placed = fileGraphOf(model, WHOLE).card.get("@I3@");
    const drawn = board(model, { view: { x: (placed?.x ?? 0) - 100, y: 100, k: 1 } }, { width: 400, height: 300 });
    expect(drawn.windowOf()?.right).toBeLessThan((placed?.x ?? 0) + CARD.width);
    card("@I3@")?.focus();
    const window = drawn.windowOf();

    expect(window?.right).toBeGreaterThanOrEqual((placed?.x ?? 0) + CARD.width);
    expect(window?.left).toBeLessThanOrEqual(placed?.x ?? 0);
  });
});

describe("the graph in Russian", () => {
  it("counts the branch's people and the family's children in the form the number takes", () => {
    setLanguage("ru");
    board(curie(), { scope: { focus: "@I12@" } });

    expect(scopeText()).toContain("10 из 17 человек");
    pointer("pointermove", node("@F3@")?.querySelector("circle"));
    expect(container.querySelector(".gedcom-fg-tip")?.textContent).toContain("2 ребёнка");
  });
});

describe("the selected card", () => {
  const selected = () => all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p"));

  it("marks one person's card and no other, and centres on it", () => {
    const model = curie();
    const drawn = board(model);
    drawn.select("@I2@", true);

    expect(selected()).toEqual(["@I2@"]);
    expectCentredOn(drawn.view(), centreOf(model, "@I2@"));
  });

  it("marks a card and leaves the view where it was when asked not to reveal, also after a resize", () => {
    const drawn = board();
    const before = drawn.view();
    drawn.select("@I2@", false);

    expect(selected()).toEqual(["@I2@"]);
    expect(drawn.view()).toEqual(before);
    const untouched = board();
    drawn.resized({ width: 1000, height: 700 });
    untouched.resized({ width: 1000, height: 700 });
    expect(drawn.view()).toEqual(untouched.view());
  });

  it("glides as before when asked to reveal", () => {
    const model = curie();
    const drawn = board(model);
    drawn.select("@I1@", false);
    drawn.select("@I2@", true);

    expectCentredOn(drawn.view(), centreOf(model, "@I2@"));
  });

  it("leaves a saved view alone when marked before the first draw without a reveal, and marks the card once drawn", () => {
    const saved = { x: 10, y: 20, k: 1 };
    const drawn = board(curie(), { view: saved }, null);
    drawn.select("@I2@", false);
    drawn.resized(WIDE);

    expect(drawn.view()).toEqual(saved);
    expect(selected()).toEqual(["@I2@"]);
  });

  it("changes no scope for a person outside the scope selected without a reveal, and marks nothing until the card is drawn", () => {
    const model = curie();
    const narrow = { focus: "@I15@" };
    const drawn = board(model, { scope: narrow });
    host.stateChanged.mockClear();

    drawn.select("@I2@", false);

    expect(host.stateChanged).not.toHaveBeenCalled();
    expect(selected()).toEqual([]);
    drawn.show(model, { scope: WHOLE });
    expect(selected()).toEqual(["@I2@"]);
  });

  it("is a mark of its own, kept through pointing at another and through a search, beside the search's ring", async () => {
    const drawn = board();
    drawn.select("@I2@", true);
    drawn.highlight("@I1@");
    expect(selected()).toEqual(["@I2@"]);
    expect(person("@I2@")?.classList.contains("is-hl")).toBe(false);

    container.querySelector<HTMLElement>(".gedcom-fg-find-toggle")?.click();
    const search = container.querySelector<HTMLInputElement>(".gedcom-fg-search");
    if (search) {
      search.value = "pierre";
      search.dispatchEvent(new Event("input"));
    }
    key(search, "Enter");
    await frame();

    expect(person("@I2@")?.classList.contains("is-current")).toBe(true);
    expect(selected()).toEqual(["@I2@"]);
  });

  it("is replaced by the next person selected, and ended by null", () => {
    const drawn = board();
    drawn.select("@I2@", true);
    drawn.select("@I12@", true);
    expect(selected()).toEqual(["@I12@"]);

    drawn.select(null, true);
    expect(selected()).toEqual([]);
  });

  it("is on a card that goes out of the drawn window and comes back", () => {
    const drawn = board(curie(), { view: { x: 0, y: 0, k: 2 } }, { width: 200, height: 150 });
    drawn.select("@I2@", true);
    drawn.panBy(100_000, 0);
    drawn.draw(drawn.windowOf() ?? { left: 0, top: 0, right: 1, bottom: 1 });
    expect(person("@I2@")).toBeNull();

    drawn.panBy(-100_000, 0);
    drawn.draw(drawn.windowOf() ?? { left: 0, top: 0, right: 1, bottom: 1 });
    expect(selected()).toEqual(["@I2@"]);
  });

  it("is on the card after a new reading of the file, and nowhere where the person is gone from it", () => {
    const drawn = board();
    drawn.select("@I2@", true);
    drawn.show(fileTimelineOf(curieIndex()), { scope: WHOLE });
    expect(selected()).toEqual(["@I2@"]);

    const small = fileTimelineOf(indexOf("0 HEAD\n0 @I1@ INDI\n1 NAME Marie /Curie/\n0 TRLR\n"));
    expect(() => drawn.show(small, { scope: WHOLE })).not.toThrow();
    expect(selected()).toEqual([]);
  });

  it("is on the card again once a scope narrowed by hand is widened", () => {
    const model = curie();
    const drawn = board(model);
    const narrow = { focus: "@I15@" };
    expect(fileGraphOf(model, narrow).card.has("@I2@")).toBe(false);
    drawn.select("@I2@", true);

    drawn.show(model, { scope: narrow });
    expect(selected()).toEqual([]);
    drawn.show(model, { scope: WHOLE });
    expect(selected()).toEqual(["@I2@"]);
  });

  it("changes the scope to the person's own branch where the branch shown does not hold them", () => {
    const model = curie();
    const narrow = { focus: "@I15@" };
    const drawn = board(model, { scope: narrow });
    expect(person("@I2@")).toBeNull();

    drawn.select("@I2@", true);

    expect(host.stateChanged.mock.lastCall?.[0].scope.focus).toBe("@I2@");
    expect(selected()).toEqual(["@I2@"]);
    expect(scopeText()).toContain("Branch of Pierre Curie");
  });

  it("keeps the view as it was where the canvas is told it has no size", () => {
    const drawn = board();
    const before = drawn.view();
    drawn.resized({ width: 0, height: 0 });

    expect(drawn.view()).toEqual(before);
  });

  describe("on the canvas", () => {
    function scene(): CanvasScene {
      const layout = fileGraphOf(curie(), WHOLE);
      return {
        layout,
        card: (id) => ({ name: id, years: "", paint: "" }),
        family: () => undefined,
        branch: () => new Set(),
        copies: (id) => (id === "@I2@" ? ["@I2@", "@I1@"] : [id]),
      };
    }

    it("marks every copy of a person drawn more than once", () => {
      const canvas = new GraphCanvas(container, { activateCard: vi.fn(), activateFamily: vi.fn(), viewChanged: vi.fn() });
      canvas.show(scene(), { open: undefined });
      canvas.resized(WIDE);
      canvas.select("@I2@", true);

      expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p")).sort()).toEqual(["@I1@", "@I2@"]);
    });

    it("centres on the person once the canvas has a size, when selected before it had one", () => {
      const canvas = new GraphCanvas(container, { activateCard: vi.fn(), activateFamily: vi.fn(), viewChanged: vi.fn() });
      canvas.show(scene(), { open: undefined });
      canvas.select("@I2@", true);
      canvas.resized(WIDE);

      const [x, y] = centreOf(curie(), "@I2@");
      expect(canvas.view()?.x).toBeCloseTo(x, 3);
      expect(canvas.view()?.y).toBeCloseTo(y, 3);
      expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p")).sort()).toEqual(["@I1@", "@I2@"]);
    });
  });
});

describe("a graph with more cards drawn than the light can fade", () => {
  const model = curie();
  const sceneOf = (): CanvasScene => ({
    layout: fileGraphOf(model, WHOLE),
    card: (id) => ({ name: id, years: "", paint: "" }),
    family: () => undefined,
    branch: (id) => model.branch(id),
  });
  const handlers = { activateCard: vi.fn(), activateFamily: vi.fn(), viewChanged: vi.fn() };
  const MARIE = ["@I1@", "@I12@", "@I13@", "@I14@", "@I15@", "@I16@", "@I17@", "@I2@", "@I3@", "@I4@"];
  const hasHl = () => container.querySelector(".gedcom-fg-svg")?.classList.contains("has-hl");

  function canvasWith(fade: { limit: number; back: number }): GraphCanvas {
    const canvas = new GraphCanvas(container, handlers, { fade });
    canvas.show(sceneOf(), { open: undefined });
    canvas.resized(WIDE);
    return canvas;
  }

  it("outlines the branch and fades no card, leaving the rest as they are", () => {
    const canvas = canvasWith({ limit: 10, back: 6 });
    canvas.highlight("@I1@");

    expect(all(".gedcom-fg-person.is-outlined").map((one) => one.getAttribute("data-p")).sort()).toEqual([...MARIE].sort());
    expect(all(".gedcom-fg-person.is-on")).toHaveLength(MARIE.length);
    expect(hasHl()).toBe(false);
    expect(person("@I11@")?.classList.contains("is-outlined")).toBe(false);
  });

  it("fades the others and outlines nothing at or below the limit", () => {
    const canvas = canvasWith({ limit: 17, back: 12 });
    canvas.highlight("@I1@");

    expect(hasHl()).toBe(true);
    expect(all(".is-outlined")).toHaveLength(0);
  });

  it("keeps the mode it had between the two limits, and fades again at the lower", () => {
    const fade = { limit: 10, back: 6 };
    const canvas = canvasWith(fade);
    canvas.highlight("@I1@");
    expect(hasHl()).toBe(false);

    Object.assign(fade, { limit: 20, back: 12 });
    canvas.highlight("@I2@");
    expect(hasHl()).toBe(false);
    expect(all(".is-outlined").length).toBeGreaterThan(0);

    Object.assign(fade, { limit: 20, back: 17 });
    canvas.highlight("@I1@");
    expect(hasHl()).toBe(true);
    expect(all(".is-outlined")).toHaveLength(0);
  });

  it("takes the outline away with the light", () => {
    const canvas = canvasWith({ limit: 10, back: 6 });
    canvas.highlight("@I1@");
    canvas.highlight(null);

    expect(all(".is-outlined, .is-on")).toHaveLength(0);
    expect(hasHl()).toBe(false);
  });

  it("does not lose the light a pointer is resting for when the view is drawn again", () => {
    vi.useFakeTimers();
    try {
      const drawn = board();
      pointer("pointermove", card("@I1@"));
      const window = drawn.windowOf();
      if (window) {
        drawn.draw(window);
      }
      vi.advanceTimersByTime(HOVER_DELAY);

      expect(person("@I1@")?.classList.contains("is-hl")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("what the graph keeps drawn as the view comes in", () => {
  const WIDEST = { left: -40_000, top: -40_000, right: 40_000, bottom: 40_000 };

  it("asks for a redraw once what is drawn is more than twice what the view needs, and not for a zoom step", () => {
    const drawn = board();
    drawn.draw(WIDEST);
    const view = drawn.windowOf();
    expect(view && drawn.needsDraw(view)).toBe(true);

    if (view) {
      drawn.draw(view);
    }
    expect(drawn.needsDraw(drawn.windowOf() ?? view ?? WIDEST)).toBe(false);
    drawn.zoomAt(1.12, 700, 450);
    expect(drawn.needsDraw(drawn.windowOf() ?? WIDEST)).toBe(false);
  });

  it("waits for a glide to end, and lets go of what it drew once it has", () => {
    const drawn = board();
    drawn.zoomBy(1.2);
    const view = container.querySelector(".gedcom-fg-view");
    expect(view?.classList.contains("is-gliding")).toBe(true);

    drawn.draw(WIDEST);
    expect(drawn.needsDraw(drawn.windowOf() ?? WIDEST)).toBe(false);

    view?.dispatchEvent(new Event("transitionend"));
    expect(view?.classList.contains("is-gliding")).toBe(false);
    expect(drawn.needsDraw(drawn.windowOf() ?? WIDEST)).toBe(true);
  });

  it("keeps the card holding the focus, and marks the selected one again when it is drawn back", () => {
    const drawn = board();
    drawn.select("@I2@", false);
    card("@I1@")?.focus();

    drawn.draw({ left: 90_000, top: 90_000, right: 91_400, bottom: 90_900 });
    expect(person("@I1@")).not.toBeNull();
    expect(person("@I2@")).toBeNull();

    const view = drawn.windowOf();
    if (view) {
      drawn.draw(view);
    }
    expect(person("@I2@")?.classList.contains("is-selected")).toBe(true);
  });

  it("keeps the shapes as a layer while the view moves, and lets it be painted again once it has rested", () => {
    vi.useFakeTimers();
    try {
      const drawn = board();
      const view = container.querySelector(".gedcom-fg-view");
      drawn.panBy(30, 0);
      expect(view?.classList.contains("is-moving")).toBe(true);

      vi.advanceTimersByTime(150);
      drawn.panBy(30, 0);
      vi.advanceTimersByTime(150);
      expect(view?.classList.contains("is-moving")).toBe(true);

      vi.advanceTimersByTime(60);
      expect(view?.classList.contains("is-moving")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("the search of the graph, opened from outside", () => {
  it("replaces the icon with a focused field", () => {
    const drawn = board();
    drawn.openSearch();

    expect(container.querySelector(".gedcom-fg-find")?.classList.contains("is-open")).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".gedcom-fg-search"));
  });

  it("keeps what is typed and takes the focus back, where it is open already", () => {
    const drawn = board();
    drawn.openSearch();
    const field = container.querySelector<HTMLInputElement>(".gedcom-fg-search");
    if (field) {
      field.value = "joliot";
      field.dispatchEvent(new Event("input"));
    }
    (document.activeElement as HTMLElement | null)?.blur();
    drawn.openSearch();

    expect(field?.value).toBe("joliot");
    expect(document.activeElement).toBe(field);
  });
});

describe("the path of a line", () => {
  it("turns a corner with a rounded bend and never an S", async () => {
    const { polyline } = await import("./cardRender");
    const d = polyline([[0, 0], [0, 100], [200, 100], [200, 300]]);

    expect(d).toBe("M0 0 L0 90 Q0 100 10 100 L190 100 Q200 100 200 110 L200 300");
    expect(d).not.toContain("C");
    expect(polyline([[5, 5], [5, 9]])).toBe("M5 5 L5 9");
  });
});

describe("a change of scope moves the cards", () => {
  interface Played {
    element: Element;
    keyframes: Record<string, unknown>;
    finish: { onfinish: (() => void) | null };
  }
  let played: Played[] = [];

  beforeEach(() => {
    played = [];
    vi.spyOn(window.Element.prototype, "animate").mockImplementation(function (
      this: Element,
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
    ) {
      const finish = { onfinish: null as (() => void) | null };
      played.push({ element: this, keyframes: keyframes as Record<string, unknown>, finish });
      return finish as unknown as Animation;
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const moved = () => played.filter((one) => Array.isArray(one.keyframes.transform));
  const leaving = () => [...container.querySelectorAll("[inert]")].map((one) => one.getAttribute("data-p"));
  const chooseIrene = () => pill("@I12@")?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

  it("moves nothing when the graph is first shown", () => {
    board(curie(), { around: "@I1@" });

    expect(played).toHaveLength(0);
    expect(leaving()).toEqual([]);
  });

  it("glides the cards that stay when Branch is chosen, and lets the others fade where they stood, out of reach", () => {
    const model = curie();
    board(model, { around: "@I1@" });
    chooseIrene();

    const branch = fileGraphOf(model, { focus: "@I12@" });
    const staying = new Set(branch.cards.map((one) => one.id));
    expect(moved().length).toBeGreaterThan(0);
    for (const one of moved()) {
      expect(staying.has(one.element.getAttribute("data-p") ?? "")).toBe(true);
    }
    expect(leaving().sort()).toEqual(fileGraphOf(model, WHOLE).cards.map((one) => one.id).filter((id) => !staying.has(id)).sort());
    expect(drawnPeople().sort()).toEqual([...staying].sort());

    for (const one of played.filter((fade) => fade.element.hasAttribute("inert"))) {
      one.finish.onfinish?.();
    }
    expect(leaving()).toEqual([]);
  });

  it("fades the cards back in, and glides those that stay, on returning to the whole file", () => {
    board(curie(), { around: "@I1@" });
    chooseIrene();
    played = [];
    container.querySelector<HTMLElement>(".gedcom-fg-whole")?.click();

    expect(drawnPeople()).toHaveLength(17);
    expect(moved().length).toBeGreaterThan(0);
    expect(played.filter((one) => Array.isArray(one.keyframes.opacity) && one.element.hasAttribute("data-p")).length).toBeGreaterThan(0);
  });

  it("changes at once, with nothing fading, where the reader asks for reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: query.includes("reduce"), media: query }));
    board(curie(), { around: "@I1@" });
    chooseIrene();

    expect(played).toHaveLength(0);
    expect(leaving()).toEqual([]);
    expect(drawnPeople()).toHaveLength(10);
  });
});
