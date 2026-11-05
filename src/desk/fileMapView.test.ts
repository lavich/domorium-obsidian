// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { CURIE as CURIE_TEXT, curieWithMap, indexOf, SCEAUX_MAP } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { type FileMapHost, MapBoard, type MapEnv, type MapState, type TileSettings } from "./fileMapView";

beforeAll(installObsidianDom);
afterEach(resetLanguage);

const WIDE = { width: 1400, height: 900 };
const index = indexOf(curieWithMap(SCEAUX_MAP));
const bare = indexOf(curieWithMap());

let root: HTMLElement;
let clock: number;
let frames: (() => void)[];
let timers: { cb: () => void; at: number }[];
let reduced: boolean;
let host: FileMapHost;
let mocks: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  stateChanged: ReturnType<typeof vi.fn<(state: MapState) => void>>;
  showPlaces: ReturnType<typeof vi.fn<() => void>>;
};
let tiles: TileSettings;

const env = (): MapEnv => ({
  frame: (cb) => frames.push(cb),
  cancel: () => undefined,
  now: () => clock,
  set: (cb, ms) => timers.push({ cb, at: clock + ms }),
  clear: () => undefined,
  reduced: () => reduced,
  outline: () => "M0 0Z",
});

function advance(ms: number): void {
  clock += ms;
  for (const timer of timers.splice(0).filter((one) => one.at <= clock)) {
    timer.cb();
  }
}

function board(state: MapState = { up: 2, down: 2 }, doc = index, size = WIDE): MapBoard {
  root = document.createElement("div");
  document.body.replaceChildren(root);
  const made = new MapBoard(root, host, env());
  made.show(doc, state);
  made.resized(size);
  return made;
}

beforeEach(() => {
  clock = 0;
  frames = [];
  timers = [];
  reduced = true;
  tiles = { enabled: false, template: null, invalid: false, attribution: "" };
  mocks = { select: vi.fn(), stateChanged: vi.fn(), showPlaces: vi.fn() };
  host = { ...mocks, setIcon: () => undefined, coarsePointer: () => false, tiles: () => tiles };
});

const marks = (): Element[] => Array.from(root.querySelectorAll(".gedcom-map-mark"));
const mark = (key: string): Element => root.querySelector(`.gedcom-map-mark[data-key="${key}"]`)!;
const at = (key: string): [number, number] => {
  const [x = 0, y = 0] = (mark(key).getAttribute("transform") ?? "").match(/-?\d+(?:\.\d+)?/gu)?.map(Number) ?? [];
  return [x, y];
};
const click = (x: number, y: number): void => {
  root.querySelector(".gedcom-map-plot")?.dispatchEvent(new MouseEvent("click", { clientX: x, clientY: y, bubbles: true }));
};
const clickPlace = (key: string): void => click(...at(key));
const text = (cls: string): string => root.querySelector(cls)?.textContent ?? "";
const pressKey = (key: string): void => {
  const plot = root.querySelector(".gedcom-map-plot")!;
  plot.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
};

describe("the places of the map", () => {
  it("draws one point per mapped place and none for a place without coordinates", () => {
    board(undefined, bare);
    const keys = marks().map((one) => one.getAttribute("data-key"));

    expect(keys.sort()).toEqual(["paris, france", "passy, haute-savoie, france", "stockholm, sweden", "warsaw, congress poland"]);
    expect(keys).not.toContain("mulhouse, france");
  });

  it("says what it draws and what it cannot, in English and in Russian", () => {
    board(undefined, bare);
    expect(text(".gedcom-map-counts")).toMatch(/^4 places · \d+ events$/u);
    expect(text(".gedcom-map-counter")).toBe("6 places have no coordinates");
    setLanguage("ru");
    board(undefined, bare);

    expect(text(".gedcom-map-counts")).toMatch(/^4 места · \d+ событи/u);
    expect(text(".gedcom-map-counter")).toBe("У 6 мест нет координат");
  });

  it("sends the reader to the places of the list from the counter, and draws no panel of its own", () => {
    board(undefined, bare);
    root.querySelector<HTMLElement>(".gedcom-map-counter")?.click();

    expect(mocks.showPlaces).toHaveBeenCalledOnce();
    expect(root.querySelector("[class*='gedcom-map-panel']")).toBeNull();
  });

  it("sizes a point by its events and colours it by their kind, grey with the number where kinds differ", () => {
    board(undefined, bare);

    expect(mark("passy, haute-savoie, france").getAttribute("class")).toContain("is-death");
    expect(mark("paris, france").getAttribute("class")).toContain("is-mixed");
    expect(Number(mark("warsaw, congress poland").querySelector(".gedcom-map-disc")?.getAttribute("r"))).toBeGreaterThan(
      Number(mark("passy, haute-savoie, france").querySelector(".gedcom-map-disc")?.getAttribute("r")),
    );
  });

  it("draws nothing again for the same inputs", () => {
    const made = board();
    const before = marks()[0];
    made.show(index, { up: 2, down: 2 });

    expect(marks()[0]).toBe(before);
  });

  it("changes nothing for a tab of no size", () => {
    const made = board();
    const before = at("paris, france");
    made.resized({ width: 0, height: 0 });

    expect(at("paris, france")).toEqual(before);
  });
});

describe("the first view", () => {
  it("is fitted to the places and is not saved until the reader moves it", () => {
    const made = board();

    expect(made.state().view).toBeUndefined();
    const [x, y] = at("warsaw, congress poland");
    expect(x).toBeGreaterThan(0);
    expect(x).toBeLessThan(WIDE.width);
    expect(y).toBeGreaterThan(0);
    expect(y).toBeLessThan(WIDE.height);
  });

  it("opens where a saved view puts it", () => {
    const made = board({ up: 2, down: 2, view: { lat: 48.85, lon: 2.35, zoom: 9 } });
    const [x, y] = at("paris, france");

    expect(made.state().view).toEqual({ lat: 48.85, lon: 2.35, zoom: 9 });
    expect(Math.abs(x - WIDE.width / 2)).toBeLessThan(6);
    expect(Math.abs(y - WIDE.height / 2)).toBeLessThan(6);
  });

  it("is fitted again by the Fit button and the 0 key, and the move before it is saved", () => {
    const made = board();
    root.querySelector<HTMLButtonElement>(".gedcom-map-zoom-in")?.click();
    advance(1000);
    expect(made.state().view).toBeDefined();
    pressKey("0");

    expect(made.state().view).toBeUndefined();
  });
});

describe("selecting by a point", () => {
  it("selects the record where a place holds the events of one", () => {
    board();
    clickPlace("passy, haute-savoie, france");

    expect(mocks.select).toHaveBeenCalledWith("@I1@");
  });

  it("lists the events where a place holds those of several records, and selects the record of a row", () => {
    board();
    clickPlace("warsaw, congress poland");
    const rows = root.querySelectorAll<HTMLButtonElement>(".gedcom-map-popup-row");

    expect(rows.length).toBeGreaterThan(1);
    expect(mocks.select).not.toHaveBeenCalled();
    rows[1]?.click();
    expect(mocks.select).toHaveBeenCalledTimes(1);
    expect(root.querySelector<HTMLElement>(".gedcom-map-popup")?.style.display).toBe("none");
  });

  it("selects nothing and moves nothing for a hover", () => {
    board(undefined, bare);
    const [x, y] = at("paris, france");
    root.querySelector(".gedcom-map-plot")?.dispatchEvent(new PointerEvent("pointermove", { clientX: x, clientY: y, pointerType: "mouse", bubbles: true }));

    expect(mocks.select).not.toHaveBeenCalled();
    expect(text(".gedcom-map-tip")).toMatch(/^Paris, France · \d+ events$/u);
  });
});

describe("a selected record", () => {
  it("draws Marie's line through five stops with arrows and numbers, and dims the rest", () => {
    const made = board();
    made.select("@I1@", false);

    expect(root.querySelectorAll(".gedcom-map-arrow")).toHaveLength(4);
    expect(Array.from(root.querySelectorAll(".gedcom-map-number")).map((one) => one.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    expect(marks().filter((one) => one.getAttribute("class")?.includes("is-highlighted")).length).toBe(5);
  });

  it("dims the points of other records", () => {
    const made = board(undefined, bare);
    made.select("@I2@", false);

    expect(mark("paris, france").getAttribute("class")).toContain("is-highlighted");
    expect(mark("passy, haute-savoie, france").getAttribute("class")).toContain("is-dimmed");
  });

  it("clears the line and the dimming when nothing is selected", () => {
    const made = board();
    made.select("@I1@", false);
    made.select(null, false);

    expect(root.querySelectorAll(".gedcom-map-arrow")).toHaveLength(0);
    expect(root.querySelectorAll(".is-dimmed")).toHaveLength(0);
  });

  it("draws a family's own events", () => {
    const made = board({ up: 2, down: 2, view: { lat: 48.8, lon: 2.3, zoom: 9 } });
    made.select("@F3@", false);

    expect(mark("sceaux, france").getAttribute("class")).toContain("is-highlighted");
    expect(root.querySelectorAll(".gedcom-map-arrow")).toHaveLength(0);
  });

  it("says that none of a person's places is on the map where none is", () => {
    const made = board(undefined, indexOf("0 HEAD\n0 @I1@ INDI\n1 NAME A /B/\n1 BIRT\n2 PLAC Nowhere\n0 TRLR\n"));
    made.select("@I1@", false);

    expect(text(".gedcom-map-status")).toBe("None of the selected record's places is on the map");
  });

  it("marks a selection made elsewhere and glides to hold its points only when asked to", () => {
    const made = board({ up: 2, down: 2, view: { lat: 0, lon: 0, zoom: 2 } });
    const before = JSON.stringify(made.state());
    made.select("@I1@", false);
    expect(JSON.stringify(made.state())).toBe(before);
    made.select("@I1@", true);

    expect(JSON.stringify(made.state())).not.toBe(before);
  });

  it("ignores a source", () => {
    const made = board();
    made.select("@S1@", true);

    expect(root.querySelectorAll(".is-highlighted")).toHaveLength(0);
  });
});

describe("the years range", () => {
  it("narrows points and counts and leaves the selection and the view alone", () => {
    const made = board(undefined, bare);
    made.select("@I1@", false);
    const view = made.state();
    const before = text(".gedcom-map-counts");
    root.querySelector<HTMLButtonElement>(".gedcom-map-years-chip")?.click();
    root.querySelector(".gedcom-map-years-handle.is-from")?.dispatchEvent(new KeyboardEvent("keydown", { key: "End", bubbles: true }));

    expect(text(".gedcom-map-counts")).not.toBe(before);
    expect(marks().length).toBeLessThan(4);
    expect(made.state()).toEqual(view);
    expect(root.querySelectorAll(".gedcom-map-number").length).toBeLessThanOrEqual(1);
  });
});

describe("the scope", () => {
  it("offers Branch of the selected person, disabled with a family or nothing, and fits the branch", () => {
    const made = board();
    const button = root.querySelector<HTMLButtonElement>(".gedcom-map-branch")!;
    expect(button.disabled).toBe(true);
    made.select("@F3@", false);
    expect(button.disabled).toBe(true);
    made.select("@I1@", false);
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe("Branch of Marie Skłodowska-Curie");
    button.click();

    expect(made.state().focus).toBe("@I1@");
    expect(root.querySelector(".gedcom-map-scope")?.textContent).toContain("Branch of Marie Skłodowska-Curie");
    expect(mocks.stateChanged).toHaveBeenCalled();
  });

  it("returns to the whole file", () => {
    const made = board({ up: 1, down: 1, focus: "@I1@" });
    root.querySelector<HTMLButtonElement>("[data-whole]")?.click();

    expect(made.state().focus).toBeUndefined();
    expect(root.querySelector<HTMLButtonElement>(".gedcom-map-branch")?.style.display).not.toBe("none");
  });
});

describe("the keyboard and the search", () => {
  it("steps through places and names each in the live region", () => {
    board(undefined, bare);
    pressKey("ArrowRight");

    expect(text(".gedcom-map-live")).toMatch(/^Paris, France, \d+ events?, \d{4} to \d{4}$/u);
    expect(mark("paris, france").getAttribute("class")).toContain("is-focused");
    pressKey("ArrowRight");
    expect(text(".gedcom-map-live")).toMatch(/^Passy/u);
  });

  it("names the plot as one stop with the number of places", () => {
    board();

    const plot = root.querySelector(".gedcom-map-plot");
    expect(plot?.hasAttribute("aria-label")).toBe(false);
    expect(root.querySelector(`#${plot?.getAttribute("aria-labelledby")}`)?.textContent).toBe("Map of places, 5 places");
    expect(root.querySelector(".gedcom-map-plot")?.getAttribute("tabindex")).toBe("0");
  });

  it("dims places that do not match and rings the one stepped to", () => {
    const made = board(undefined, bare);
    made.openSearch();
    const input = root.querySelector<HTMLInputElement>("input[type=search]")!;
    input.value = "WARSAW";
    input.dispatchEvent(new Event("input"));
    root.querySelector<HTMLButtonElement>(".gedcom-map-find-next")?.click();

    expect(marks().filter((one) => one.getAttribute("class")?.includes("is-dimmed")).length).toBe(marks().length - 1);
    expect(mark("warsaw, congress poland").getAttribute("class")).toContain("is-current");
    expect(mocks.select).not.toHaveBeenCalled();
  });
});

describe("a map with no place to draw", () => {
  const plain = indexOf(CURIE_TEXT.replace(/^[34] (?:MAP|LATI|LONG).*\n/gmu, ""));

  it("says why and shows the MAP lines, with no button", () => {
    board(undefined, plain);
    const empty = root.querySelector<HTMLElement>(".gedcom-map-empty")!;

    expect(empty.style.display).not.toBe("none");
    expect(empty.querySelector("h3")?.textContent).toBe("No place has coordinates yet");
    expect(empty.querySelector("p")?.textContent).toBe("A place gets a position from a MAP with LATI and LONG under its PLAC in the file.");
    expect(empty.querySelector("pre")?.textContent).toContain("3 MAP");
    expect(empty.querySelector("button")).toBeNull();
  });

  it("is not shown where one place has coordinates", () => {
    board();

    expect(root.querySelector<HTMLElement>(".gedcom-map-empty")?.style.display).toBe("none");
  });
});

describe("tiles", () => {
  it("says the address is not valid and draws no tile", () => {
    tiles = { enabled: true, template: null, invalid: true, attribution: "" };
    board();

    expect(text(".gedcom-map-status")).toBe("The tile server address is not valid");
    expect(root.querySelectorAll("img")).toHaveLength(0);
  });

  it("requests tiles of the planned numbers after the view settles", () => {
    tiles = { enabled: true, template: "https://tiles.example/{z}/{x}/{y}.png", invalid: false, attribution: "" };
    board();
    advance(200);
    const srcs = Array.from(root.querySelectorAll("img")).map((img) => img.getAttribute("src") ?? "");

    expect(srcs.length).toBeGreaterThan(0);
    expect(srcs.every((src) => /^https:\/\/tiles\.example\/\d+\/\d+\/\d+\.png$/u.test(src))).toBe(true);
    expect(text(".gedcom-map-credit")).toBe("tiles.example");
  });
});

describe("a file of five thousand places", () => {
  function file(place: (i: number) => [number, number]): MapBoard {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let i = 0; i < 5000; i += 1) {
      const [lat, lon] = place(i);
      lines.push(`0 @I${i}@ INDI`, "1 NAME A /B/", "1 BIRT", `2 PLAC P${i}`, "3 MAP", `4 LATI ${lat < 0 ? "S" : "N"}${Math.abs(lat).toFixed(3)}`, `4 LONG ${lon < 0 ? "W" : "E"}${Math.abs(lon).toFixed(3)}`);
    }
    lines.push("0 TRLR");
    return board(undefined, indexOf(lines.join("\n")));
  }

  it("holds under 600 marks for places gathered round cities, at the world zoom and after a pan", () => {
    const made = file((i) => [((i % 40) * 37) % 110 - 40 + ((i * 7919) % 100) / 100, ((i % 40) * 89) % 320 - 160 + ((i * 104729) % 100) / 100]);

    expect(marks().length).toBeLessThan(600);
    root.querySelector(".gedcom-map-plot")?.dispatchEvent(new WheelEvent("wheel", { deltaX: 40, deltaY: 10, deltaMode: 0, bubbles: true }));
    expect(marks().length).toBeLessThan(600);
    expect(made.state()).toBeDefined();
  });

  it("holds under the cells of the viewport for places spread evenly", () => {
    file((i) => [((i * 7919) % 12000) / 100 - 60, ((i * 104729) % 34000) / 100 - 170]);

    expect(marks().length).toBeLessThanOrEqual(Math.ceil(WIDE.width / 10) * Math.ceil(WIDE.height / 10));
  });
});
