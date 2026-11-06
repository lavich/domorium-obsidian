// @vitest-environment happy-dom
import type { Range } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { buildFileTimeline, type FileTimeline } from "./fileTimeline";
import {
  FileTimelineBoard,
  readTimelineState,
  ROW,
  ZOOM,
  type FileTimelineHost,
  type TimelineScope,
} from "./fileTimelineView";

const NOW = 2026;
const BAR_HEIGHT = 22;
const SCOPE: TimelineScope = { up: 2, down: 2, zoom: ZOOM.initial };
const WHOLE = { top: 0, left: 0, width: 2000, height: 20 * ROW };

const curie = (): FileTimeline => buildFileTimeline(curieIndex(), NOW);
const withEvents = (): FileTimeline => buildFileTimeline(indexOf(curieWithEvents()), NOW);
const fromLines = (...lines: string[]): FileTimeline =>
  buildFileTimeline(indexOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR", ""].join("\n")), NOW);
const lived = (xref: string, name: string, born: number, died?: number): string[] => [
  `0 ${xref} INDI`,
  `1 NAME ${name}`,
  "1 BIRT",
  `2 DATE ${born}`,
  ...(died === undefined ? [] : ["1 DEAT", `2 DATE ${died}`]),
];

let container: HTMLElement;
let host: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  showInSource: ReturnType<typeof vi.fn<(range: Range) => void>>;
  scopeChanged: ReturnType<typeof vi.fn<(scope: TimelineScope) => void>>;
  setIcon: ReturnType<typeof vi.fn<(element: HTMLElement, icon: string) => void>>;
};

beforeAll(installObsidianDom);
afterEach(resetLanguage);
beforeEach(() => {
  container = document.createElement("div");
  document.body.replaceChildren(container);
  host = {
    select: vi.fn(),
    showInSource: vi.fn(),
    scopeChanged: vi.fn(),
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
  };
});

function board(model: FileTimeline = curie(), scope: Partial<TimelineScope> = {}) {
  const drawn = new FileTimelineBoard(container, host satisfies FileTimelineHost);
  drawn.show(model, { ...SCOPE, ...scope });
  drawn.draw(WHOLE);
  return drawn;
}

const all = (selector: string) => [...container.querySelectorAll(selector)];
const of = (selector: string, xref: string) => all(`${selector}[data-p="${xref}"]`);
const bars = (): string[] => all(".gedcom-ft-life").map((bar) => bar.getAttribute("data-p") ?? "");
const bar = (xref: string) => container.querySelector<SVGElement>(`.gedcom-ft-life[data-p="${xref}"]`);
const label = (xref: string) => container.querySelector<SVGElement>(`.gedcom-ft-label[data-p="${xref}"]`);
const rowOf = (xref: string) => (Number(bar(xref)?.getAttribute("y")) - (ROW - BAR_HEIGHT) / 2) / ROW;
const branchButtons = () => all("[data-branch]");
const press = (target: Element | null | undefined, key: string) =>
  target?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
const click = (target: Element | null | undefined) =>
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
const crowd = (count: number): FileTimeline =>
  fromLines(...Array.from({ length: count }, (_, at) => lived(`@C${at}@`, `Person /Crowd${at}/`, 1900, 1950)).flat());
const scopeText = () => container.querySelector(".gedcom-ft-scope")?.textContent ?? "";

function tap(target: Element | null | undefined): void {
  target?.dispatchEvent(Object.assign(new MouseEvent("pointerdown", { bubbles: true }), { pointerType: "touch" }));
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
}

describe("drawing the timeline of a file", () => {
  it("draws a bar for each person with the name written in it, no years and no column of names", () => {
    board();

    expect(container.querySelector('[class*="legend"]')).toBeNull();
    expect(container.querySelector(".gedcom-ft-names, .gedcom-ft-name, .gedcom-ft-axis-pad")).toBeNull();
    expect(bars()).toHaveLength(17);
    expect(label("@I1@")?.textContent).toBe("Marie Skłodowska-Curie");
    expect(container.querySelector(".gedcom-ft-board")?.textContent).not.toContain("1867–1934");
    expect(Number(bar("@I1@")?.getAttribute("width"))).toBe((1934 - 1867) * ZOOM.initial);
    expect(Number(bar("@I1@")?.getAttribute("x"))).toBe((1867 - 1820) * ZOOM.initial + 12);
  });

  it("draws a person who may be alive to the present with a straight end, and a lost death fading", () => {
    board(fromLines(...lived("@I1@", "Zoe /Young/", 1990), ...lived("@I2@", "Old /Man/", 1850)));

    expect(bar("@I1@")?.hasAttribute("mask")).toBe(false);
    expect(bar("@I1@")?.getAttribute("width")).toBe(String((2026 - 1990) * ZOOM.initial));
    expect(bar("@I2@")?.getAttribute("mask")).toContain("cfade");
  });

  it("draws an approximate start soft and an exact one sharp", () => {
    board(withEvents());

    expect(bar("@I3@")?.getAttribute("mask")).toContain("scut");
    expect(bar("@I1@")?.hasAttribute("mask")).toBe(false);
  });

  it("cuts a name wider than its bar with an ellipsis inside the bar", () => {
    board(fromLines(...lived("@I1@", "Alexandra Maria Theresia /Habsburg-Lothringen/", 1899, 1920)));

    const text = label("@I1@")?.textContent ?? "";
    expect(text.endsWith("…")).toBe(true);
    expect(text.length).toBeLessThan("Alexandra Maria Theresia Habsburg-Lothringen".length);
    expect("Alexandra Maria Theresia Habsburg-Lothringen".startsWith(text.slice(0, -1))).toBe(true);
    expect(bar("@I1@")?.getAttribute("aria-label")).toBe("Alexandra Maria Theresia Habsburg-Lothringen");
  });

  it("writes no name on a bar too short for even an ellipsis", () => {
    board(fromLines(...lived("@I1@", "Alexandra Maria Theresia /Habsburg-Lothringen/", 1899, 1901)));

    expect(label("@I1@")).toBeNull();
    expect(bar("@I1@")).not.toBeNull();
  });

  it("gives each person a row of their own, even where two lives never meet", () => {
    board(fromLines(
      ...lived("@A@", "Anna /Alpha/", 1840, 1905),
      ...lived("@B@", "Boris /Beta/", 1950, 2023),
    ));

    expect(rowOf("@A@")).not.toBe(rowOf("@B@"));
    expect(container.querySelector<SVGElement>(".gedcom-ft-chart")?.getAttribute("height")).toBe(String(2 * ROW));
  });

  it("stands the rows of a file in the order of its generations", () => {
    board();

    const rows = bars().map((xref) => rowOf(xref));
    expect(new Set(rows).size).toBe(rows.length);
    expect(rowOf("@I12@")).toBeGreaterThan(rowOf("@I1@"));
  });

  it("draws marks along the lower edge of the bar, below the name", () => {
    board(withEvents());

    const marks = of(".gedcom-ft-mark", "@I1@");
    expect(marks.length).toBeGreaterThan(3);
    const baseline = Number(label("@I1@")?.getAttribute("y"));
    for (const mark of marks) {
      const circle = mark.querySelector("circle");
      expect(Number(circle?.getAttribute("cy")) - Number(circle?.getAttribute("r"))).toBeGreaterThan(baseline);
      expect(Number(circle?.getAttribute("cy"))).toBeLessThanOrEqual(baseline + BAR_HEIGHT / 2);
    }
  });

  it("centres a person's bar on their row", () => {
    board();

    for (const xref of bars()) {
      const centre = Number(bar(xref)?.getAttribute("y")) + BAR_HEIGHT / 2;
      expect((centre - ROW / 2) % ROW).toBe(0);
    }
  });

  it("colours a bar by its surname and the same surname alike", () => {
    board(fromLines(
      ...lived("@A@", "Ivan /Лобанов/", 1900, 1950),
      ...lived("@B@", "Anna /Лобанова/", 1960, 2000),
      ...lived("@C@", "Nobody", 1900, 1950),
    ));
    const fill = (xref: string) => bar(xref)?.getAttribute("style") ?? "";

    expect(fill("@A@")).toContain("--gedcom-ft-fill-light:hsl(");
    expect(fill("@A@").split(";")[0]?.split(" ")[0]).toBe(fill("@B@").split(";")[0]?.split(" ")[0]);
    expect(fill("@C@")).toContain(" 0% ");
    expect(label("@A@")?.getAttribute("style")).toBe(fill("@A@"));
  });

  it("gives a person no bar and no mention where no event is dated", () => {
    board(withEvents());

    expect(withEvents().people.size).toBe(18);
    expect(bars()).toHaveLength(17);
    expect(container.textContent).not.toContain("Kazimierz Żorawski");
    expect(all("[data-p]").some((element) => element.getAttribute("data-p") === "@I18@")).toBe(false);
  });

  it("marks the marriage on each spouse's bar and joins no two bars while nobody is lit", () => {
    board();

    const at = String((1895 - 1820) * ZOOM.initial + 12);
    for (const xref of ["@I1@", "@I2@"]) {
      expect(container.querySelector(`.gedcom-ft-mark.is-marriage[data-p="${xref}"] circle`)?.getAttribute("cx")).toBe(at);
    }
    expect(all(".gedcom-ft-marriage")).toHaveLength(0);
  });

  it("draws a period as a span, and an approximate birth as uncertain", () => {
    board(withEvents());

    const residence = of(".gedcom-ft-span", "@I2@")[0];
    expect(Number(residence?.getAttribute("width"))).toBe((1906 - 1895) * ZOOM.initial);
    expect(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I3@"]')?.getAttribute("class")).toContain(
      "is-uncertain",
    );
    expect(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]')?.getAttribute("class")).not.toContain(
      "is-uncertain",
    );
  });

  it("draws only the rows in the window and one window around it", () => {
    const drawn = board(crowd(40));
    drawn.draw({ top: 0, left: 0, width: 2000, height: 2 * ROW });

    expect(bars()).toHaveLength(4);
    expect(all(".gedcom-ft-label")).toHaveLength(4);
  });

  it("draws the next rows for a window past the drawn one, and nothing more", () => {
    const drawn = board(crowd(40));
    drawn.draw({ top: 0, left: 0, width: 2000, height: 2 * ROW });
    const past = { top: 10 * ROW, left: 0, width: 2000, height: 2 * ROW };

    expect(drawn.needsDraw(past)).toBe(true);
    drawn.draw(past);
    expect(bars()).toHaveLength(6);
    expect(bars()).not.toContain("@C0@");
    expect(drawn.needsDraw({ ...past, top: 9 * ROW })).toBe(false);
  });

  it("builds the drawing as elements, with no markup handed in", () => {
    board();

    expect(container.querySelector("svg")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(container.querySelector(".gedcom-ft-mark circle")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});

describe("lighting a person", () => {
  it("lights Marie's parents, husband and daughters, and replaces nothing drawn", () => {
    const drawn = board();
    const before = all(".gedcom-ft-items > *");
    drawn.highlight("@I1@");

    const lit = new Set(all(".gedcom-ft-life.is-on").map((bar) => bar.getAttribute("data-p")));
    expect([...lit].sort()).toEqual(["@I1@", "@I12@", "@I13@", "@I2@", "@I3@", "@I4@"].sort());
    expect(bar("@I1@")?.classList.contains("is-hl")).toBe(true);
    expect(label("@I2@")?.classList.contains("is-on")).toBe(true);
    expect(bar("@I11@")?.classList.contains("is-on")).toBe(false);
    expect(container.querySelector(".gedcom-ft-board")?.classList.contains("has-hl")).toBe(true);
    expect(all(".gedcom-ft-items > *")).toEqual(before);
  });

  it("draws arrows from both of Marie's parents and to her daughters, and none from Pierre", () => {
    board().highlight("@I1@");

    const arrows = all(".gedcom-ft-kin").map((arrow) => [arrow.getAttribute("data-from"), arrow.getAttribute("data-to")]);
    expect(arrows).toEqual([
      ["@I3@", "@I1@"],
      ["@I4@", "@I1@"],
      ["@I1@", "@I12@"],
      ["@I1@", "@I13@"],
    ]);
    expect(arrows.some(([from]) => from === "@I2@")).toBe(false);
  });

  it("draws a dashed marriage line with a dot at each end, at the year of the marriage, for the lit person only", () => {
    board().highlight("@I1@");

    const lines = all(".gedcom-ft-marriage");
    expect(lines).toHaveLength(1);
    expect(lines[0]?.getAttribute("x1")).toBe(String((1895 - 1820) * ZOOM.initial + 12));
    expect(lines[0]?.getAttribute("y1")).not.toBe(lines[0]?.getAttribute("y2"));
    expect(all(".gedcom-ft-marriage-dot")).toHaveLength(2);
    expect(lines[0]?.getAttribute("marker-end")).toBeNull();
    const edges = [bar("@I1@"), bar("@I2@")]
      .map((one) => Number(one?.getAttribute("y")))
      .sort((a, b) => a - b);
    const dots = all(".gedcom-ft-marriage-dot").map((dot) => Number(dot.getAttribute("cy"))).sort((a, b) => a - b);
    expect(dots).toEqual([edges[0] + BAR_HEIGHT, (edges[1] ?? 0)]);
  });

  it("puts a marriage line at the first child's bar where the marriage is undated", () => {
    const undated = fromLines(
      "0 @I1@ INDI", "1 NAME Han /Solo/", "1 BIRT", "2 DATE 1870", "1 FAMS @F1@",
      "0 @I2@ INDI", "1 NAME Leia /Organa/", "1 BIRT", "2 DATE 1872", "1 FAMS @F1@",
      "0 @I3@ INDI", "1 NAME Ben /Solo/", "1 BIRT", "2 DATE 1900", "1 FAMC @F1@",
      "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I3@",
    );
    board(undated).highlight("@I2@");

    expect(all(".gedcom-ft-marriage")[0]?.getAttribute("x1")).toBe(String((1900 - 1860) * ZOOM.initial + 12));
  });

  it("tells the lines apart by more than colour: the kin solid with an arrowhead, the marriage dashed with dots", () => {
    board().highlight("@I1@");

    expect(all(".gedcom-ft-kin").every((line) => line.getAttribute("marker-end") !== null)).toBe(true);
    expect(all(".gedcom-ft-marriage").every((line) => line.getAttribute("marker-end") === null)).toBe(true);
    expect(all(".gedcom-ft-marriage-dot").length).toBeGreaterThan(0);
  });

  it("clears the arrows and the light when the light is put out", () => {
    const drawn = board();
    drawn.highlight("@I1@");
    drawn.unlight();

    expect(all(".gedcom-ft-kin, .gedcom-ft-marriage, .gedcom-ft-marriage-dot")).toHaveLength(0);
    expect(all(".is-on")).toHaveLength(0);
  });
});

describe("the light of a click", () => {
  const lit = () => all(".gedcom-ft-life.is-hl").map((element) => element.getAttribute("data-p"));
  const litBoard = () => container.querySelector(".gedcom-ft-board")?.classList.contains("has-hl");

  it("is not lit by the pointer, however long it rests", () => {
    vi.useFakeTimers();
    try {
      board();
      for (const xref of ["@I1@", "@I2@"]) {
        label(xref)?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
        bar(xref)?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
      }
      vi.advanceTimersByTime(1000);

      expect(all(".is-on, .is-hl, .gedcom-ft-kin, .gedcom-ft-marriage")).toHaveLength(0);
      expect(litBoard()).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is not lit by the focus arriving on a bar", () => {
    board();
    bar("@I2@")?.focus();

    expect(all(".is-on, .is-hl")).toHaveLength(0);
    expect(litBoard()).toBe(false);
  });

  it("is lit at once by a click on a bar or its name, and the person is selected", () => {
    board();
    click(label("@I1@"));

    expect(bar("@I1@")?.classList.contains("is-hl")).toBe(true);
    expect(bar("@I2@")?.classList.contains("is-on")).toBe(true);
    expect(bar("@I11@")?.classList.contains("is-on")).toBe(false);
    expect(litBoard()).toBe(true);
    expect(all(".gedcom-ft-kin")).toHaveLength(4);
    expect(all(".gedcom-ft-marriage")).toHaveLength(1);
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("moves to the next person clicked", () => {
    board();
    click(bar("@I1@"));
    click(bar("@I12@"));

    expect(bar("@I12@")?.classList.contains("is-hl")).toBe(true);
    expect(bar("@I1@")?.classList.contains("is-hl")).toBe(false);
    expect(bar("@I1@")?.classList.contains("is-on")).toBe(true);
  });

  it("is lit from the keyboard by Enter or Space on a focused bar, and Tab alone lights no one", () => {
    board();
    press(bar("@I12@"), "Enter");
    expect(bar("@I12@")?.classList.contains("is-hl")).toBe(true);
    expect(host.select).toHaveBeenCalledWith("@I12@");

    bar("@I1@")?.focus();
    expect(lit()).toEqual(["@I12@"]);
    press(bar("@I1@"), " ");
    expect(lit()).toEqual(["@I1@"]);
    expect(host.select).toHaveBeenLastCalledWith("@I1@");
  });

  it("is put out by a click on empty space, and leaves the host's selection alone", () => {
    board();
    click(bar("@I1@"));
    host.select.mockClear();
    container.querySelector(".gedcom-ft-chart")?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

    expect(all(".is-on, .is-hl, .gedcom-ft-kin, .gedcom-ft-marriage")).toHaveLength(0);
    expect(litBoard()).toBe(false);
    expect(host.select).not.toHaveBeenCalled();
  });

  it("is put out by Escape, which leaves the selection and Branch, and Escape with nothing lit does nothing", () => {
    const drawn = board();
    const escape = () => press(bar("@I1@"), "Escape");
    escape();
    click(bar("@I1@"));
    drawn.select("@I1@", false);
    expect(litBoard()).toBe(true);
    escape();

    expect(litBoard()).toBe(false);
    expect(all(".is-on, .gedcom-ft-kin, .gedcom-ft-marriage")).toHaveLength(0);
    expect(bar("@I1@")?.classList.contains("is-selected")).toBe(true);
    expect(branchButtons()).toHaveLength(1);
  });

  it("stays through a redraw of the rows, and is put out by a scope change", () => {
    const drawn = board();
    click(bar("@I1@"));
    drawn.draw({ ...WHOLE, top: 1 });
    expect(lit()).toContain("@I1@");

    drawn.select("@I12@", false);
    click(container.querySelector("[data-branch]"));
    expect(all(".is-on, .is-hl")).toHaveLength(0);
    expect(litBoard()).toBe(false);
  });

  it("is put out by the selection of another person and kept by that of the lit one", () => {
    const drawn = board();
    click(bar("@I1@"));
    drawn.select("@I1@", false);
    expect(litBoard()).toBe(true);

    drawn.select("@I2@", false);
    expect(litBoard()).toBe(false);
    expect(all(".is-on")).toHaveLength(0);
  });
});

describe("the year cursor", () => {
  it("shows the age everyone alive reached that year", () => {
    const drawn = board();
    drawn.setYear(1906);

    const age = (xref: string) => container.querySelector(`.gedcom-ft-age[data-p="${xref}"] text`)?.textContent;
    expect(age("@I1@")).toBe("39");
    expect(age("@I12@")).toBe("9");
    expect(age("@I4@")).toBeUndefined();
    expect(container.querySelector(".gedcom-ft-axis-cursor text")?.textContent).toBe("1906");
  });

  it("marks an age from an approximate birth as approximate", () => {
    board(withEvents()).setYear(1900);

    expect(container.querySelector('.gedcom-ft-age[data-p="@I3@"] text')?.textContent).toBe("≈68");
  });

  it("goes when the year is cleared", () => {
    const drawn = board();
    drawn.setYear(1906);
    drawn.setYear(null);

    expect(all(".gedcom-ft-age")).toHaveLength(0);
  });
});

describe("the timeline without a toolbar", () => {
  it("draws the events other than births, marriages and deaths, with no switch for them", () => {
    board(withEvents());

    expect(all(".gedcom-ft-mark.is-other").length).toBeGreaterThan(0);
    expect(all(".gedcom-ft-span").length).toBeGreaterThan(0);
    expect(container.querySelector(".gedcom-ft-chip, .gedcom-ft-tools, .gedcom-ft-alive")).toBeNull();
  });

  it("has no native tooltip on its buttons, and asks Obsidian's to stand clear of the bars and the group", () => {
    board(curie(), { focus: "@I12@" }).select("@I12@", false);
    const places: Record<string, string> = {
      "gedcom-ft-controls": "top",
      "gedcom-ft-find": "bottom",
      "gedcom-ft-overlay": "right",
      "gedcom-ft-scope": "bottom",
    };
    const buttons = [...container.querySelectorAll("button")].filter((one) => one.getAttribute("aria-label"));

    expect(buttons.length).toBeGreaterThan(8);
    for (const button of buttons) {
      expect(button.hasAttribute("title"), button.className).toBe(false);
      const group = Object.keys(places).find((cls) => button.closest(`.${cls}`));
      expect(button.getAttribute("data-tooltip-position"), `${button.className} in ${group}`).toBe(places[group ?? ""]);
    }
    expect(container.querySelector("[title]")).toBeNull();
  });

  it("widens and narrows the axis of years with the buttons, within the zoom range", () => {
    board();
    const width = () => Number(container.querySelector(".gedcom-ft-chart")?.getAttribute("width"));
    const press = (cls: string) => container.querySelector<HTMLElement>(`.gedcom-ft-${cls}`)?.click();
    const before = width();

    expect(container.querySelector("input[type=range]")).toBeNull();
    press("zoom-in");
    expect(width()).toBeGreaterThan(before);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 7.2 }));

    for (let i = 0; i < 40; i += 1) {
      press("zoom-out");
    }
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: ZOOM.min }));
    for (let i = 0; i < 40; i += 1) {
      press("zoom-in");
    }
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: ZOOM.max }));
  });

  it("fits the whole span of years to the width of the board", () => {
    board();
    container.querySelector<HTMLElement>(".gedcom-ft-fit")?.click();

    const width = Number(container.querySelector(".gedcom-ft-chart")?.getAttribute("width"));
    expect(Math.abs(width - 1600)).toBeLessThan(2);
  });

  it("opens the search from an icon over the board and keeps a query open", () => {
    board();
    const find = container.querySelector<HTMLElement>(".gedcom-ft-find");
    const input = container.querySelector<HTMLInputElement>(".gedcom-ft-search");

    expect(find?.parentElement?.classList.contains("gedcom-ft-stage")).toBe(true);
    expect(find?.classList.contains("is-open")).toBe(false);
    container.querySelector<HTMLElement>(".gedcom-ft-find-toggle")?.click();
    expect(find?.classList.contains("is-open")).toBe(true);
    if (input) {
      input.value = "joliot";
      input.dispatchEvent(new Event("input"));
    }
    container.querySelector<HTMLElement>(".gedcom-ft-find-clear")?.click();
    expect(input?.value).toBe("");
    expect(find?.classList.contains("is-open")).toBe(true);
    expect(all(".gedcom-ft-life.is-dim")).toHaveLength(0);
    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(find?.classList.contains("is-open")).toBe(false);
  });

  it("steps through the matches in the order of the rows with the arrows, marks the current bar and wraps", () => {
    board();
    const count = () => container.querySelector(".gedcom-ft-find-count")?.textContent;
    const current = () => all(".gedcom-ft-life.is-current").map((row) => row.getAttribute("data-p"));
    container.querySelector<HTMLElement>(".gedcom-ft-find-toggle")?.click();
    const input = container.querySelector<HTMLInputElement>(".gedcom-ft-search");
    if (input) {
      input.value = "joliot";
      input.dispatchEvent(new Event("input"));
    }
    expect(count()).toBe("4 matches");

    const next = container.querySelector<HTMLElement>(".gedcom-ft-find-next");
    const previous = container.querySelector<HTMLElement>(".gedcom-ft-find-prev");
    const seen: (string | null)[] = [];
    for (let step = 0; step < 4; step += 1) {
      next?.click();
      seen.push(...current());
    }
    expect(seen).toEqual(["@I12@", "@I14@", "@I16@", "@I17@"]);
    expect(count()).toBe("4 / 4");
    next?.click();
    expect(current()).toEqual(["@I12@"]);
    expect(count()).toBe("1 / 4");
    previous?.click();
    expect(current()).toEqual(["@I17@"]);
    expect(all(".gedcom-ft-life:not(.is-dim)")).toHaveLength(4);
    if (input) {
      input.value = "zzz";
      input.dispatchEvent(new Event("input"));
    }
    expect(count()).toBe("No results");
    expect(current()).toEqual([]);
  });

  it("fades the bars that do not match a search", () => {
    board();
    const search = container.querySelector<HTMLInputElement>(".gedcom-ft-search");
    if (search) {
      search.value = "joliot";
      search.dispatchEvent(new Event("input"));
    }

    const standing = all(".gedcom-ft-life:not(.is-dim)").map((row) => row.getAttribute("data-p")).sort();
    expect(standing).toEqual(["@I12@", "@I14@", "@I16@", "@I17@"].sort());
    expect(bar("@I1@")?.classList.contains("is-dim")).toBe(true);
    expect(bar("@I14@")?.classList.contains("is-dim")).toBe(false);
  });

  it("shows one person's branch from their Branch button, widens and narrows it, and returns to the whole file", () => {
    const drawn = board();
    drawn.select("@I12@", false);
    click(container.querySelector("[data-branch]"));

    expect(bars()).toHaveLength(10);
    expect(scopeText()).toContain("Irène Joliot-Curie");
    expect(scopeText()).toContain("10 of 17 people");
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ focus: "@I12@", up: 2 }));

    container.querySelector<HTMLElement>('[data-step="up:-1"]')?.click();
    expect(bars()).toHaveLength(6);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ up: 1 }));
    container.querySelector<HTMLElement>('[data-step="down:-1"]')?.click();
    expect(bars()).toHaveLength(6);
    container.querySelector<HTMLElement>('[data-step="down:-1"]')?.click();
    expect(bars()).toHaveLength(4);
    expect(container.querySelector('[data-step="down:-1"]')?.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector('[data-step="up:-1"]')?.getAttribute("data-icon")).toBe("minus");

    container.querySelector<HTMLElement>(".gedcom-ft-whole")?.click();
    expect(bars()).toHaveLength(17);
    expect(host.scopeChanged.mock.lastCall?.[0]).not.toHaveProperty("focus");
  });

  it("opens on the branch a scope names", () => {
    board(curie(), { focus: "@I12@" }).setYear(1930);

    expect(bars()).toHaveLength(10);
  });
});

describe("activating", () => {
  it("selects a person from their name or their bar, and moves nothing", () => {
    board();
    label("@I12@")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    bar("@I1@")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.select.mock.calls).toEqual([["@I12@"], ["@I1@"]]);
    expect(container.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollTop).toBe(0);
  });

  it("shows a mark's event in the source", () => {
    const model = curie();
    board(model);
    container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"] circle')?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    expect(host.showInSource).toHaveBeenCalledWith(model.people.get("@I1@")?.marks[0]?.event.range);
  });

  it("on a touch, lights the person first and opens them on the second", () => {
    board();
    const touch = () => tap(bar("@I1@"));
    touch();
    expect(host.select).not.toHaveBeenCalled();
    expect(bar("@I1@")?.classList.contains("is-hl")).toBe(true);

    touch();
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch after a mark's, lights the person rather than opening them", () => {
    board();
    tap(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]'));
    tap(bar("@I1@"));

    expect(host.select).not.toHaveBeenCalled();
    tap(bar("@I1@"));
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch of empty space, puts the light out", () => {
    board();
    tap(bar("@I1@"));
    tap(container.querySelector(".gedcom-ft-chart"));

    expect(all(".is-hl")).toHaveLength(0);
    expect(container.querySelector(".gedcom-ft-board")?.classList.contains("has-hl")).toBe(false);
  });

  it("opens a person from the keyboard even after a touch", () => {
    board();
    tap(bar("@I2@"));
    press(bar("@I1@"), "Enter");

    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch, shows a mark's event with the way to its lines", () => {
    board();
    tap(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]'));

    const pop = container.querySelector(".gedcom-ft-pop");
    expect(pop?.classList.contains("is-shown")).toBe(true);
    expect(pop?.textContent).toContain("7 NOV 1867");
    expect(host.showInSource).not.toHaveBeenCalled();
    pop?.querySelector<HTMLElement>(".gedcom-ft-pop-source")?.click();
    expect(host.showInSource).toHaveBeenCalled();
  });
});

describe("the state a timeline keeps", () => {
  it("reads its scope, zoom and scroll, and keeps each within bounds", () => {
    expect(
      readTimelineState({ focus: "@I12@", up: 3, down: 0, zoom: 12, others: false, scroll: { top: 40, left: 8 } }),
    ).toEqual({
      focus: "@I12@",
      up: 3,
      down: 0,
      zoom: 12,
      scroll: { top: 40, left: 8 },
    });
    expect(readTimelineState({ up: 40, down: -2, zoom: 1, focus: 7, scroll: { top: -5, left: 3 } })).toEqual({
      up: 9,
      down: 0,
      zoom: ZOOM.min,
      scroll: { top: 0, left: 3 },
    });
    expect(readTimelineState(null)).toEqual({ up: 2, down: 2, zoom: ZOOM.initial });
  });

  it("drops a scroll that is not a pair of numbers", () => {
    expect(readTimelineState({ scroll: { top: 4 } })).toEqual({ up: 2, down: 2, zoom: ZOOM.initial });
    expect(readTimelineState({ scroll: { top: "a", left: Infinity } })).toEqual({ up: 2, down: 2, zoom: ZOOM.initial });
    expect(readTimelineState({ scroll: 7 })).toEqual({ up: 2, down: 2, zoom: ZOOM.initial });
  });
});

describe("a file with very many dated events", () => {
  it("still draws it", () => {
    const base = curie();
    const marie = base.people.get("@I1@");
    if (!marie) {
      throw new Error("no Marie");
    }
    const many = Array.from({ length: 5_000 }, (_, at) => ({
      ...marie.marks[0],
      kind: "other" as const,
      event: marie.marks[0].event,
      year: 1867 + (at % 60),
      uncertain: false,
      period: false,
    }));
    const model: FileTimeline = {
      ...base,
      people: new Map([...base.people].map(([xref, person]) =>
        [xref, xref === "@I1@" ? { ...person, marks: [...person.marks, ...many] } : person])),
    };
    board(model);

    expect(bars()).toHaveLength(17);
  });
});

describe("drawing only what is near the window, sideways", () => {
  it("leaves out the marks and lifelines beyond a narrow window", () => {
    const drawn = board();
    drawn.draw({ top: 0, left: 0, width: 60, height: 20 * ROW });

    expect(all(".gedcom-ft-mark.is-birth").map((mark) => mark.getAttribute("data-p")).sort()).toEqual(
      ["@I10@", "@I3@", "@I4@", "@I9@"].sort(),
    );
    expect(all(".gedcom-ft-mark.is-death")).toHaveLength(0);
    expect(of(".gedcom-ft-life", "@I1@")).toHaveLength(0);
    expect(of(".gedcom-ft-life", "@I9@")).toHaveLength(1);
  });
});

describe("the keyboard", () => {
  it("makes one bar the tab stop, the selected one else the first, and the rest reachable by arrows", () => {
    const drawn = board();
    const stops = () => all('.gedcom-ft-life[tabindex="0"]').map((one) => one.getAttribute("data-p"));
    const first = bars()[0];

    expect(stops()).toEqual([first]);
    expect(all('.gedcom-ft-life[tabindex="-1"]')).toHaveLength(16);
    drawn.select("@I12@", false);
    expect(stops()).toEqual(["@I12@"]);
    drawn.draw({ ...WHOLE, top: 1 });
    expect(stops()).toEqual(["@I12@"]);
  });

  it("steps the focus to the next bar by the right and down arrows and to the previous by the left and up arrows, in the order of the rows", () => {
    board();
    const order = bars();
    const focused = () => document.activeElement?.getAttribute("data-p");
    bar(order[3] ?? "")?.focus();

    press(bar(order[3] ?? ""), "ArrowRight");
    expect(focused()).toBe(order[4]);
    press(bar(order[4] ?? ""), "ArrowDown");
    expect(focused()).toBe(order[5]);
    press(bar(order[5] ?? ""), "ArrowLeft");
    expect(focused()).toBe(order[4]);
    press(bar(order[4] ?? ""), "ArrowUp");
    expect(focused()).toBe(order[3]);
    bar(order[0] ?? "")?.focus();
    press(bar(order[0] ?? ""), "ArrowLeft");
    expect(focused()).toBe(order[0]);
    const last = order[order.length - 1] ?? "";
    bar(last)?.focus();
    press(bar(last), "ArrowRight");
    expect(focused()).toBe(last);
  });

  it("steps the focus on to a bar that is not drawn, skipping no one, and the tab stop follows the focus", () => {
    const drawn = board(crowd(40));
    drawn.draw({ top: 0, left: 0, width: 2000, height: 2 * ROW });
    expect(bars()).toHaveLength(4);
    const fourth = bars()[3] ?? "";
    bar(fourth)?.focus();
    press(bar(fourth), "ArrowRight");

    expect(document.activeElement?.getAttribute("data-p")).toBe("@C4@");
    expect(all('.gedcom-ft-life[tabindex="0"]').map((one) => one.getAttribute("data-p"))).toEqual(["@C4@"]);
  });

  it("gives each bar a role and the person's name, in the order of the rows", () => {
    board();

    expect(bar("@I1@")?.getAttribute("tabindex")).toBe("-1");
    expect(bar("@I1@")?.getAttribute("role")).toBe("button");
    expect(bar("@I1@")?.getAttribute("aria-label")).toBe("Marie Skłodowska-Curie");
    expect(all(".gedcom-ft-label").every((name) => name.getAttribute("aria-hidden") === "true")).toBe(true);
    expect(bar("@I1@")?.querySelector("button")).toBeNull();
    const heights = bars().map((xref) => rowOf(xref));
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });

  it("keeps the focus on a bar through a redraw, and on Branch", () => {
    const drawn = board();
    bar("@I1@")?.focus();
    drawn.draw({ ...WHOLE, top: 1 });
    expect(document.activeElement?.getAttribute("data-p")).toBe("@I1@");

    drawn.select("@I1@", false);
    container.querySelector<HTMLElement>("[data-branch]")?.focus();
    drawn.draw({ ...WHOLE, top: 2 });
    expect(document.activeElement?.hasAttribute("data-branch")).toBe(true);
  });

  it("keeps the focus on a stepper as it steps, and on its other button at the end", () => {
    board(curie(), { focus: "@I12@" });
    const step = (which: string) => container.querySelector<HTMLElement>(`[data-step="${which}"]`);
    step("up:-1")?.focus();
    step("up:-1")?.click();

    expect(document.activeElement?.getAttribute("data-step")).toBe("up:-1");
    step("up:-1")?.click();
    expect(document.activeElement?.getAttribute("data-step")).toBe("up:1");
  });

  it("shows no scope line for the whole file, says whose branch it shows, and stops each stepper at zero and nine", () => {
    board();
    expect(scopeText()).toBe("");
    expect(container.querySelector<HTMLElement>(".gedcom-ft-scope")?.style.display).toBe("none");
    expect(bars()).toHaveLength(17);

    container.replaceChildren();
    board(curie(), { focus: "@I12@", up: 9, down: 0 });
    const disabled = (which: string) => container.querySelector(`[data-step="${which}"]`)?.hasAttribute("disabled");
    expect(scopeText()).toContain("Branch of Irène Joliot-Curie · 8 of 17 people");
    expect([disabled("up:1"), disabled("up:-1"), disabled("down:-1"), disabled("down:1")]).toEqual([
      true,
      false,
      true,
      false,
    ]);
  });

  it("returns to the whole file on Branch again, the button pressed while the branch is shown", () => {
    const drawn = board();
    drawn.select("@I12@", false);
    expect(branchButtons()[0]?.getAttribute("aria-pressed")).toBe("false");
    click(branchButtons()[0]);

    expect(bars()).toHaveLength(10);
    expect(branchButtons()).toHaveLength(1);
    expect(branchButtons()[0]?.getAttribute("aria-pressed")).toBe("true");
    click(branchButtons()[0]);
    expect(bars()).toHaveLength(17);
    expect(host.scopeChanged.mock.lastCall?.[0]).not.toHaveProperty("focus");
    expect(container.querySelector(".gedcom-ft-plot")?.scrollTop).toBe(rowOf("@I12@") * ROW + ROW / 2);
  });

  it("names each stepper's buttons for what they widen or narrow", () => {
    board(curie(), { focus: "@I12@" });
    const labels = all("[data-step]").map((button) => button.getAttribute("aria-label"));

    expect(new Set(labels).size).toBe(4);
  });
});

describe("the timeline in Russian", () => {
  it("counts the branch's people in the form the number takes", () => {
    setLanguage("ru");
    board(curie(), { focus: "@I12@" });

    expect(scopeText()).toContain("10 из 17 человек");
    expect(scopeText()).not.toContain("человека");
  });
});

describe("the ages under the cursor and a search", () => {
  it("fades the ages of the people who do not match", () => {
    const drawn = board();
    drawn.setYear(1906);
    drawn.setQuery("joliot");

    expect(container.querySelector('.gedcom-ft-age[data-p="@I1@"]')?.classList.contains("is-dim")).toBe(true);
    expect(container.querySelector('.gedcom-ft-age[data-p="@I12@"]')?.classList.contains("is-dim")).toBe(false);
  });
});

describe("the selected bar", () => {
  const selectedLives = () => all(".gedcom-ft-life.is-selected").map((life) => life.getAttribute("data-p"));

  it("marks one person's bar and no other, with no band across the row", () => {
    const drawn = board();
    drawn.select("@I12@", true);

    expect(selectedLives()).toEqual(["@I12@"]);
    expect(container.querySelector(".gedcom-ft-row-selected, .gedcom-ft-row-hl")).toBeNull();
  });

  it("leaves the scroll of the plot where it was when asked not to reveal", () => {
    const drawn = board();
    const plot = container.querySelector<HTMLElement>(".gedcom-ft-plot");
    drawn.setScroll({ top: 0, left: 0 });
    drawn.select("@I12@", false);

    expect(selectedLives()).toEqual(["@I12@"]);
    expect(plot?.scrollTop).toBe(0);
  });

  it("brings the row into view when asked to reveal", () => {
    const drawn = board();
    const plot = container.querySelector<HTMLElement>(".gedcom-ft-plot");
    drawn.setScroll({ top: 0, left: 0 });
    drawn.select("@I12@", true);

    expect(plot?.scrollTop).toBeGreaterThan(0);
  });

  it("changes no scope for a person outside it when asked not to reveal", () => {
    const drawn = board(curie(), { focus: "@I12@", up: 0, down: 0 });
    host.scopeChanged.mockClear();

    drawn.select("@I2@", false);

    expect(host.scopeChanged).not.toHaveBeenCalled();
  });

  it("survives the light and a search, and is replaced by the next selection", () => {
    const drawn = board();
    drawn.select("@I12@", true);
    drawn.highlight("@I1@");
    drawn.setQuery("curie");
    drawn.stepMatch(1);
    expect(selectedLives()).toEqual(["@I12@"]);

    drawn.select("@I2@", true);
    expect(selectedLives()).toEqual(["@I2@"]);

    drawn.select(null, true);
    expect(selectedLives()).toEqual([]);
    expect(branchButtons()).toHaveLength(0);
  });

  it("is on a bar that leaves the drawn rows and comes back", () => {
    const drawn = board(crowd(40));
    drawn.select("@C1@", true);
    drawn.draw({ top: 30 * ROW, left: 0, width: 2000, height: ROW });
    expect(bar("@C1@")).toBeNull();
    expect(branchButtons()).toHaveLength(0);

    drawn.draw(WHOLE);
    expect(selectedLives()).toEqual(["@C1@"]);
    expect(branchButtons()).toHaveLength(1);
  });

  it("is on the bar after a new reading of the file and after a scope narrowed and widened", () => {
    const drawn = board();
    drawn.select("@I2@", true);
    drawn.show(curie(), SCOPE);
    drawn.draw(WHOLE);
    expect(selectedLives()).toEqual(["@I2@"]);

    drawn.show(curie(), { ...SCOPE, focus: "@I12@", up: 0, down: 0 });
    drawn.draw(WHOLE);
    expect(selectedLives()).toEqual([]);
    drawn.show(curie(), SCOPE);
    drawn.draw(WHOLE);
    expect(selectedLives()).toEqual(["@I2@"]);
  });

  it("changes the scope to the person's own branch where the branch shown does not hold them", () => {
    const drawn = board(curie(), { focus: "@I12@", up: 0, down: 0 });
    expect(bar("@I2@")).toBeNull();

    drawn.select("@I2@", true);

    expect(host.scopeChanged.mock.lastCall?.[0].focus).toBe("@I2@");
    expect(selectedLives()).toEqual(["@I2@"]);
  });

  it("marks nothing and moves nothing for a person with no bar", () => {
    const drawn = board(withEvents());
    host.scopeChanged.mockClear();
    drawn.setScroll({ top: 0, left: 0 });
    drawn.select("@I18@", true);

    expect(selectedLives()).toEqual([]);
    expect(branchButtons()).toHaveLength(0);
    expect(container.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollTop).toBe(0);
    expect(host.scopeChanged).not.toHaveBeenCalled();
  });

  it("reads the scroll of the plot and puts it back", () => {
    const drawn = board();
    drawn.setScroll({ top: 120, left: 45 });
    expect(drawn.scroll()).toEqual({ top: 120, left: 45 });

    const other = board();
    other.setScroll(drawn.scroll());
    expect(other.scroll()).toEqual({ top: 120, left: 45 });
  });
});

describe("the people a search and a scope count", () => {
  it("does not find a person with no bar, and says so", () => {
    board(withEvents());
    container.querySelector<HTMLElement>(".gedcom-ft-find-toggle")?.click();
    const input = container.querySelector<HTMLInputElement>(".gedcom-ft-search");
    if (input) {
      input.value = "żorawski";
      input.dispatchEvent(new Event("input"));
    }

    expect(container.querySelector(".gedcom-ft-find-count")?.textContent).toBe("No results");
  });

  it("counts the people with a bar in the scope line", () => {
    board(withEvents(), { focus: "@I12@" });

    expect(scopeText()).toContain("of 17 people");
  });
});

describe("Branch on the selected bar", () => {
  it("is offered on the selected person's bar and on no other", () => {
    const drawn = board();
    drawn.select("@I1@", false);

    expect(branchButtons().map((button) => button.getAttribute("data-branch"))).toEqual(["@I1@"]);
    drawn.select("@I2@", false);
    expect(branchButtons().map((button) => button.getAttribute("data-branch"))).toEqual(["@I2@"]);
  });

  it("stands just past the end of the bar, level with it, where the view has room", () => {
    const drawn = board();
    const plot = container.querySelector<HTMLElement>(".gedcom-ft-plot");
    Object.defineProperty(plot, "clientWidth", { value: 2000, configurable: true });
    drawn.select("@I1@", false);

    const button = container.querySelector<HTMLElement>("[data-branch]");
    const end = Number(bar("@I1@")?.getAttribute("x")) + Number(bar("@I1@")?.getAttribute("width"));
    expect(Number.parseFloat(button?.style.left ?? "0")).toBe(end + 3.5 + 8);
    expect(Number.parseFloat(button?.style.top ?? "-1")).toBe(Number(bar("@I1@")?.getAttribute("y")));
  });

  it("stays inside the view, over the end of the bar, where the view ends before the bar does", () => {
    const drawn = board();
    const plot = container.querySelector<HTMLElement>(".gedcom-ft-plot");
    Object.defineProperty(plot, "clientWidth", { value: 300, configurable: true });
    drawn.select("@I1@", false);

    const left = Number.parseFloat(container.querySelector<HTMLElement>("[data-branch]")?.style.left ?? "0");
    const start = Number(bar("@I1@")?.getAttribute("x"));
    expect(left).toBeGreaterThanOrEqual(start + 8);
    expect(left).toBeLessThan(start + Number(bar("@I1@")?.getAttribute("width")));
  });

  it("shows the branch from the command with the bar out of the part drawn, and again returns to the whole file", () => {
    const drawn = board(crowd(40));
    drawn.select("@C1@", false);
    drawn.draw({ top: 30 * ROW, left: 0, width: 2000, height: ROW });
    expect(bar("@C1@")).toBeNull();

    expect(drawn.canBranch()).toBe(true);
    drawn.branchOfSelected();
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ focus: "@C1@" }));
    drawn.branchOfSelected();
    expect(host.scopeChanged.mock.lastCall?.[0]).not.toHaveProperty("focus");
  });

  it("is not available with nobody selected or a person with no bar selected", () => {
    const drawn = board(withEvents());

    expect(drawn.canBranch()).toBe(false);
    drawn.select("@I18@", false);
    expect(drawn.canBranch()).toBe(false);
    drawn.branchOfSelected();
    expect(host.scopeChanged).not.toHaveBeenCalled();
  });
});

describe("the tooltip of a bar", () => {
  const tip = () => container.querySelector<HTMLElement>(".gedcom-ft-tip");
  const point = (target: Element | null | undefined) =>
    target?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));

  it("holds the person's name and nothing else", () => {
    board();
    point(bar("@I1@"));

    expect(tip()?.classList.contains("is-shown")).toBe(true);
    expect(tip()?.textContent).toBe("Marie Skłodowska-Curie");
    point(container.querySelector(".gedcom-ft-chart"));
    expect(tip()?.classList.contains("is-shown")).toBe(false);
  });

  it("is the whole name on a bar that cuts it", () => {
    board(fromLines(...lived("@I1@", "Alexandra Maria Theresia /Habsburg-Lothringen/", 1899, 1920)));
    point(bar("@I1@"));

    expect(tip()?.textContent).toBe("Alexandra Maria Theresia Habsburg-Lothringen");
  });

  it("gives way to the tooltip of a mark, which has no name in it", () => {
    board();
    point(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"] circle'));

    expect(tip()?.textContent).toContain("7 NOV 1867");
    expect(tip()?.textContent).not.toContain("Marie");
  });

  it("is shown by a first touch and closed by a touch on empty space", () => {
    board();
    tap(bar("@I1@"));
    expect(tip()?.classList.contains("is-shown")).toBe(true);
    expect(tip()?.textContent).toBe("Marie Skłodowska-Curie");

    tap(container.querySelector(".gedcom-ft-chart"));
    expect(tip()?.classList.contains("is-shown")).toBe(false);
  });
});

describe("the age ruler of the selected person", () => {
  const flag = () => container.querySelector(".gedcom-ft-axis-cursor text")?.textContent;

  it("gives the selected person's age on the cursor's label, and the year alone before the birth", () => {
    const drawn = board();
    drawn.select("@I1@", false);
    drawn.setYear(1906);
    expect(flag()).toBe("1906 · 39");

    drawn.setYear(1850);
    expect(flag()).toBe("1850");
    drawn.setYear(1950);
    expect(flag()).toBe("1950");
  });

  it("gives an approximate age for an approximate birth, and none where the bar begins at another event", () => {
    const drawn = board(withEvents());
    drawn.select("@I3@", false);
    drawn.setYear(1900);
    expect(flag()).toBe("1900 · ≈68");

    const other = board(fromLines("0 @I1@ INDI", "1 NAME Mill /Er/", "1 RESI", "2 DATE 1850"));
    other.select("@I1@", false);
    other.setYear(1860);
    expect(container.querySelectorAll(".gedcom-ft-axis-cursor text")[1]?.textContent).toBe("1860");
  });

  it("stays after Escape and goes with the selection", () => {
    const drawn = board();
    drawn.select("@I1@", false);
    drawn.setYear(1906);
    click(bar("@I1@"));
    press(bar("@I1@"), "Escape");
    expect(flag()).toBe("1906 · 39");

    drawn.select("@I2@", false);
    expect(flag()).toBe("1906 · 47");
    drawn.select(null, false);
    expect(flag()).toBe("1906");
  });

  it("names no one but the selected person", () => {
    const drawn = board();
    drawn.select("@I1@", false);
    drawn.setYear(1906);

    expect(flag()).not.toContain("Marie");
  });
});

describe("a pinch", () => {
  const fingers = (...touches: [number, number][]) =>
    touches.map(([clientX, clientY]) => ({ clientX, clientY }));
  const touch = (target: Element | null, type: string, ...touches: [number, number][]) => {
    const event = Object.assign(new Event(type, { bubbles: true, cancelable: true }), { touches: fingers(...touches) });
    target?.dispatchEvent(event);
    return event;
  };
  const plot = () => container.querySelector<HTMLElement>(".gedcom-ft-plot");
  const pinch = (from: number, to: number) => {
    touch(plot(), "touchstart", [100, 50], [100 + from, 50]);
    touch(plot(), "touchmove", [100, 50], [100 + (from + to) / 2, 50]);
    touch(plot(), "touchmove", [100, 50], [100 + to, 50]);
    touch(plot(), "touchend", [100, 50]);
  };

  it("takes the page's own handling away once a second finger is down, and not for one finger", () => {
    board();

    expect(touch(plot(), "touchstart", [100, 50]).defaultPrevented).toBe(false);
    touch(plot(), "touchend");
    expect(touch(plot(), "touchstart", [100, 50], [200, 50]).defaultPrevented).toBe(true);
    expect(touch(plot(), "touchmove", [100, 50], [250, 50]).defaultPrevented).toBe(true);
    touch(plot(), "touchend");
  });

  it("widens the axis once as the fingers lift, not while they move", () => {
    board();
    host.scopeChanged.mockClear();
    touch(plot(), "touchstart", [100, 50], [200, 50]);
    touch(plot(), "touchmove", [100, 50], [250, 50]);
    touch(plot(), "touchmove", [100, 50], [300, 50]);

    expect(host.scopeChanged).not.toHaveBeenCalled();
    expect(container.querySelector<SVGElement>(".gedcom-ft-chart")?.style.transform).toBe("scaleX(2)");
    touch(plot(), "touchend", [100, 50]);
    expect(host.scopeChanged).toHaveBeenCalledTimes(1);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: ZOOM.initial * 2 }));
    expect(container.querySelector<SVGElement>(".gedcom-ft-chart")?.style.transform).toBe("");
  });

  it("narrows the axis as the fingers come together", () => {
    board();
    pinch(200, 100);

    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: ZOOM.initial / 2 }));
  });

  it("stops where the zoom buttons would", () => {
    board();
    pinch(10, 1000);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: ZOOM.max }));
    pinch(1000, 10);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: ZOOM.min }));
  });

  it("keeps the year under the midpoint under it", () => {
    board();
    const view = plot();
    if (view) {
      view.scrollLeft = 120;
    }
    const before = (120 + 150 - 12) / ZOOM.initial;
    pinch(100, 200);

    const zoom = ZOOM.initial * 2;
    expect((Number(view?.scrollLeft) + 150 - 12) / zoom).toBeCloseTo(before, 5);
  });

  it("does nothing for a pinch that changes nothing", () => {
    board();
    host.scopeChanged.mockClear();
    pinch(100, 100);

    expect(host.scopeChanged).not.toHaveBeenCalled();
  });
});

describe("the search of the timeline, opened from outside", () => {
  it("replaces the icon with a focused field", () => {
    const drawn = board();
    drawn.openSearch();

    expect(container.querySelector(".gedcom-ft-find")?.classList.contains("is-open")).toBe(true);
    expect(document.activeElement).toBe(container.querySelector(".gedcom-ft-search"));
  });

  it("keeps what is typed and takes the focus back, where it is open already", () => {
    const drawn = board();
    drawn.openSearch();
    const field = container.querySelector<HTMLInputElement>(".gedcom-ft-search");
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
