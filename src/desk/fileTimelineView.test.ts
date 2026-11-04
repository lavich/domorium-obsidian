// @vitest-environment happy-dom
import type { Range } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { HOVER_DELAY } from "./dom";
import { fileTimelineOf, type FileTimeline } from "./fileTimeline";
import {
  FileTimelineBoard,
  readTimelineState,
  ROW,
  ZOOM,
  type FileTimelineHost,
  type TimelineScope,
} from "./fileTimelineView";

const SCOPE: TimelineScope = { up: 2, down: 2, zoom: ZOOM.initial };
const WHOLE = { top: 0, left: 0, width: 2000, height: 20 * ROW };

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

function board(model: FileTimeline = fileTimelineOf(curieIndex()), scope: Partial<TimelineScope> = {}) {
  const drawn = new FileTimelineBoard(container, host satisfies FileTimelineHost);
  drawn.show(model, { ...SCOPE, ...scope });
  drawn.draw(WHOLE);
  return drawn;
}

const names = (): string[] =>
  [...container.querySelectorAll(".gedcom-ft-name")].map((row) => row.getAttribute("data-p") ?? "");
const all = (selector: string) => [...container.querySelectorAll(selector)];
const of = (selector: string, xref: string) => all(`${selector}[data-p="${xref}"]`);
const nameRow = (xref: string) => container.querySelector<HTMLElement>(`.gedcom-ft-name[data-p="${xref}"]`);
const scopeText = () => container.querySelector(".gedcom-ft-scope")?.textContent ?? "";
const openButton = (xref: string) => nameRow(xref)?.querySelector<HTMLElement>(".gedcom-ft-name-open");

function tap(target: Element | null | undefined): void {
  target?.dispatchEvent(Object.assign(new MouseEvent("pointerdown", { bubbles: true }), { pointerType: "touch" }));
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
}

describe("drawing the timeline of a file", () => {
  it("draws a row for each person, a lifeline coloured by sex, and the years", () => {
    board();

    expect(container.querySelector('[class*="legend"]')).toBeNull();
    expect(names()).toHaveLength(17);
    expect(nameRow("@I1@")?.textContent).toContain("Marie Skłodowska-Curie");
    expect(nameRow("@I1@")?.querySelector(".gedcom-ft-name-years")?.textContent).toBe("1867–1934");
    expect(of(".gedcom-ft-life", "@I1@")[0]?.getAttribute("class")).toContain("is-f");
    expect(of(".gedcom-ft-life", "@I2@")[0]?.getAttribute("class")).toContain("is-m");
    expect(of(".gedcom-ft-life", "@I16@")[0]?.getAttribute("class")).toContain("is-open");
    expect(nameRow("@I16@")?.querySelector(".gedcom-ft-name-years")?.textContent).toBe("1927–");
  });

  it("joins Pierre's and Marie's rows at their marriage", () => {
    board();

    const marie = container.querySelector('.gedcom-ft-mark.is-marriage[data-p="@I1@"] circle')?.getAttribute("cx");
    const marriage = all(".gedcom-ft-marriage").find((line) => line.getAttribute("x1") === marie);
    expect(marie).toBe(String((1895 - 1820) * ZOOM.initial + 12));
    expect(Number(marriage?.getAttribute("y2")) - Number(marriage?.getAttribute("y1"))).toBe(ROW);
  });

  it("draws a period as a span, and an approximate birth as uncertain", () => {
    board(fileTimelineOf(indexOf(curieWithEvents())));

    const residence = of(".gedcom-ft-span", "@I2@")[0];
    expect(Number(residence?.getAttribute("width"))).toBe((1906 - 1895) * ZOOM.initial);
    expect(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I3@"]')?.getAttribute("class")).toContain(
      "is-uncertain",
    );
    expect(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]')?.getAttribute("class")).not.toContain(
      "is-uncertain",
    );
  });

  it("gives a person with no dated event a row", () => {
    board(fileTimelineOf(indexOf(curieWithEvents())));

    expect(names()).toHaveLength(18);
    const kazimierz = [...container.querySelectorAll(".gedcom-ft-name")].find((row) =>
      row.textContent?.includes("Kazimierz Żorawski"),
    );
    expect(kazimierz).toBeDefined();
    expect(of(".gedcom-ft-life", kazimierz?.getAttribute("data-p") ?? "")).toHaveLength(0);
  });

  it("draws only the rows in the window and one window around it", () => {
    const drawn = board();
    drawn.draw({ top: 0, left: 0, width: 2000, height: 2 * ROW });

    expect(names()).toHaveLength(4);
    expect(all(".gedcom-ft-life")).toHaveLength(4);
  });

  it("draws the next rows for a window past the drawn one, and nothing more", () => {
    const drawn = board();
    drawn.draw({ top: 0, left: 0, width: 2000, height: 2 * ROW });
    const past = { top: 10 * ROW, left: 0, width: 2000, height: 2 * ROW };

    expect(drawn.needsDraw(past)).toBe(true);
    drawn.draw(past);
    expect(names()).toHaveLength(6);
    expect(names()).not.toContain(fileTimelineOf(curieIndex()).rows[0]);
    expect(drawn.needsDraw({ ...past, top: 9 * ROW })).toBe(false);
  });

  it("builds the drawing as elements, with no markup handed in", () => {
    board();

    expect(container.querySelector("svg")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(container.querySelector(".gedcom-ft-mark circle")?.namespaceURI).toBe("http://www.w3.org/2000/svg");
  });
});

describe("pointing at a person", () => {
  it("lights Marie's parents, husband and daughters, and replaces nothing drawn", () => {
    const drawn = board();
    const before = all(".gedcom-ft-items > *");
    drawn.highlight("@I1@");

    const lit = new Set(all(".gedcom-ft-name.is-on").map((row) => row.getAttribute("data-p")));
    expect([...lit].sort()).toEqual(["@I1@", "@I12@", "@I13@", "@I2@", "@I3@", "@I4@"].sort());
    expect(nameRow("@I1@")?.classList.contains("is-hl")).toBe(true);
    expect(of(".gedcom-ft-life", "@I2@")[0]?.classList.contains("is-on")).toBe(true);
    expect(of(".gedcom-ft-life", "@I11@")[0]?.classList.contains("is-on")).toBe(false);
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

  it("clears the arrows and the light when the pointer leaves", () => {
    const drawn = board();
    drawn.highlight("@I1@");
    drawn.highlight(null);

    expect(all(".gedcom-ft-kin")).toHaveLength(0);
    expect(all(".is-on")).toHaveLength(0);
    expect(container.querySelector(".gedcom-ft-row-hl")).toBeNull();
  });

  it("lights a person once the pointer has rested on them, and only the last of a sweep", () => {
    vi.useFakeTimers();
    try {
      board();
      nameRow("@I1@")?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
      vi.advanceTimersByTime(HOVER_DELAY / 2);
      nameRow("@I2@")?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));
      vi.advanceTimersByTime(HOVER_DELAY - 1);
      expect(container.querySelectorAll(".is-hl")).toHaveLength(0);

      vi.advanceTimersByTime(1);
      expect(nameRow("@I2@")?.classList.contains("is-hl")).toBe(true);
      expect(nameRow("@I1@")?.classList.contains("is-hl")).toBe(false);
      container.querySelector(".gedcom-ft-board")?.dispatchEvent(new MouseEvent("pointerleave"));
      expect(nameRow("@I2@")?.classList.contains("is-hl")).toBe(true);
      vi.advanceTimersByTime(HOVER_DELAY);
      expect(container.querySelectorAll(".is-hl")).toHaveLength(0);

      nameRow("@I12@")?.querySelector<HTMLElement>(".gedcom-ft-name-open")?.focus();
      expect(nameRow("@I12@")?.classList.contains("is-hl")).toBe(true);
    } finally {
      vi.useRealTimers();
    }
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
    board(fileTimelineOf(indexOf(curieWithEvents()))).setYear(1900);

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
    board(fileTimelineOf(indexOf(curieWithEvents())));

    expect(all(".gedcom-ft-mark.is-other").length).toBeGreaterThan(0);
    expect(all(".gedcom-ft-span").length).toBeGreaterThan(0);
    expect(container.querySelector(".gedcom-ft-chip, .gedcom-ft-tools, .gedcom-ft-alive")).toBeNull();
  });

  it("has no native tooltip on its buttons, and asks Obsidian's to stand clear of the rows and the group", () => {
    board(fileTimelineOf(curieIndex()), { focus: "@I12@" });
    const places: Record<string, string> = {
      "gedcom-ft-controls": "top",
      "gedcom-ft-find": "bottom",
      "gedcom-ft-name": "right",
      "gedcom-ft-scope": "bottom",
    };
    const buttons = [...container.querySelectorAll("button")].filter((one) => one.getAttribute("aria-label"));

    expect(buttons.length).toBeGreaterThan(20);
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
    expect(all(".gedcom-ft-name.is-dim")).toHaveLength(0);
    input?.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(find?.classList.contains("is-open")).toBe(false);
  });

  it("steps through the matches in row order with the arrows, marks the current row and wraps", () => {
    board();
    const count = () => container.querySelector(".gedcom-ft-find-count")?.textContent;
    const current = () => all(".gedcom-ft-name.is-current").map((row) => row.getAttribute("data-p"));
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
    expect(of(".gedcom-ft-life.is-current", "@I17@")).toHaveLength(1);
    expect(all(".gedcom-ft-name:not(.is-dim)")).toHaveLength(4);
    if (input) {
      input.value = "zzz";
      input.dispatchEvent(new Event("input"));
    }
    expect(count()).toBe("No results");
    expect(current()).toEqual([]);
  });

  it("fades the rows that do not match a search", () => {
    board();
    const search = container.querySelector<HTMLInputElement>(".gedcom-ft-search");
    if (search) {
      search.value = "joliot";
      search.dispatchEvent(new Event("input"));
    }

    const standing = all(".gedcom-ft-name:not(.is-dim)").map((row) => row.getAttribute("data-p")).sort();
    expect(standing).toEqual(["@I12@", "@I14@", "@I16@", "@I17@"].sort());
    expect(of(".gedcom-ft-life", "@I1@")[0]?.classList.contains("is-dim")).toBe(true);
    expect(of(".gedcom-ft-life", "@I14@")[0]?.classList.contains("is-dim")).toBe(false);
  });

  it("shows one person's branch, widens and narrows it, and returns to the whole file", () => {
    board();
    nameRow("@I12@")?.querySelector<HTMLElement>(".gedcom-ft-branch")?.click();

    expect(names()).toHaveLength(10);
    expect(scopeText()).toContain("Irène Joliot-Curie");
    expect(scopeText()).toContain("10 of 17 people");
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ focus: "@I12@", up: 2 }));

    container.querySelector<HTMLElement>('[data-step="up:-1"]')?.click();
    expect(names()).toHaveLength(6);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ up: 1 }));
    container.querySelector<HTMLElement>('[data-step="down:-1"]')?.click();
    expect(names()).toHaveLength(6);
    container.querySelector<HTMLElement>('[data-step="down:-1"]')?.click();
    expect(names()).toHaveLength(4);
    expect(container.querySelector('[data-step="down:-1"]')?.hasAttribute("disabled")).toBe(true);
    expect(container.querySelector('[data-step="up:-1"]')?.getAttribute("data-icon")).toBe("minus");

    container.querySelector<HTMLElement>(".gedcom-ft-whole")?.click();
    expect(names()).toHaveLength(17);
    expect(host.scopeChanged.mock.lastCall?.[0]).not.toHaveProperty("focus");
  });

  it("opens on the branch a scope names", () => {
    board(fileTimelineOf(curieIndex()), { focus: "@I12@" }).setYear(1930);

    expect(names()).toHaveLength(10);
  });
});

describe("activating", () => {
  it("selects a person from their name or their lifeline, and moves nothing", () => {
    board();
    nameRow("@I12@")?.click();
    of(".gedcom-ft-life", "@I1@")[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.select.mock.calls).toEqual([["@I12@"], ["@I1@"]]);
    expect(container.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollTop).toBe(0);
  });

  it("shows a mark's event in the source", () => {
    const model = fileTimelineOf(curieIndex());
    board(model);
    container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"] circle')?.dispatchEvent(
      new MouseEvent("click", { bubbles: true }),
    );

    expect(host.showInSource).toHaveBeenCalledWith(model.people.get("@I1@")?.marks[0]?.event.range);
  });

  it("on a touch, lights the person first and opens them on the second", () => {
    board();
    const life = of(".gedcom-ft-life", "@I1@")[0];
    const touch = () => tap(life);
    touch();
    expect(host.select).not.toHaveBeenCalled();
    expect(nameRow("@I1@")?.classList.contains("is-hl")).toBe(true);

    touch();
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch after a mark's, lights the person rather than opening them", () => {
    board();
    tap(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]'));
    tap(of(".gedcom-ft-life", "@I1@")[0]);

    expect(host.select).not.toHaveBeenCalled();
    tap(of(".gedcom-ft-life", "@I1@")[0]);
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch of empty space, puts the light out", () => {
    board();
    tap(of(".gedcom-ft-life", "@I1@")[0]);
    tap(container.querySelector(".gedcom-ft-chart"));

    expect(all(".is-hl")).toHaveLength(0);
    expect(container.querySelector(".gedcom-ft-board")?.classList.contains("has-hl")).toBe(false);
  });

  it("opens a person from the keyboard even after a touch", () => {
    board();
    tap(of(".gedcom-ft-life", "@I2@")[0]);
    openButton("@I1@")?.click();

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
    const base = fileTimelineOf(curieIndex());
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

    expect(names()).toHaveLength(17);
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
  it("opens a person from a real button, with the branch beside it rather than inside", () => {
    board();
    const open = openButton("@I1@");

    expect(open?.tagName).toBe("BUTTON");
    expect(open?.querySelector("button")).toBeNull();
    expect(nameRow("@I1@")?.hasAttribute("role")).toBe(false);
    open?.click();
    expect(host.select).toHaveBeenCalledWith("@I1@");
  });

  it("lights the person whose row takes the focus", () => {
    board();
    openButton("@I2@")?.focus();

    expect(nameRow("@I2@")?.classList.contains("is-hl")).toBe(true);
  });

  it("keeps the focus on a row through a redraw", () => {
    const drawn = board();
    nameRow("@I1@")?.querySelector<HTMLElement>(".gedcom-ft-branch")?.focus();
    drawn.draw({ ...WHOLE, top: 1 });

    expect(document.activeElement?.closest(".gedcom-ft-name")?.getAttribute("data-p")).toBe("@I1@");
    expect(document.activeElement?.hasAttribute("data-branch")).toBe(true);
  });

  it("keeps the focus on a stepper as it steps, and on its other button at the end", () => {
    board(fileTimelineOf(curieIndex()), { focus: "@I12@" });
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
    expect(names()).toHaveLength(17);

    container.replaceChildren();
    board(fileTimelineOf(curieIndex()), { focus: "@I12@", up: 9, down: 0 });
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
    board();
    nameRow("@I12@")?.querySelector<HTMLElement>(".gedcom-ft-branch")?.click();

    expect(names()).toHaveLength(10);
    expect(nameRow("@I12@")?.querySelector(".gedcom-ft-branch")?.getAttribute("aria-pressed")).toBe("true");
    expect(nameRow("@I14@")?.querySelector(".gedcom-ft-branch")?.getAttribute("aria-pressed")).toBe("false");
    nameRow("@I12@")?.querySelector<HTMLElement>(".gedcom-ft-branch")?.click();
    expect(names()).toHaveLength(17);
    expect(host.scopeChanged.mock.lastCall?.[0]).not.toHaveProperty("focus");
    const irene = fileTimelineOf(curieIndex()).rows.indexOf("@I12@");
    expect(container.querySelector(".gedcom-ft-plot")?.scrollTop).toBe(irene * ROW + ROW / 2);
  });

  it("names each stepper's buttons for what they widen or narrow", () => {
    board(fileTimelineOf(curieIndex()), { focus: "@I12@" });
    const labels = all("[data-step]").map((button) => button.getAttribute("aria-label"));

    expect(new Set(labels).size).toBe(4);
  });
});

describe("the timeline in Russian", () => {
  it("counts the branch's people in the form the number takes", () => {
    setLanguage("ru");
    board(fileTimelineOf(curieIndex()), { focus: "@I12@" });

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

describe("the selected row", () => {
  const selectedNames = () => all(".gedcom-ft-name.is-selected").map((row) => row.getAttribute("data-p"));
  const selectedLives = () => all(".gedcom-ft-life.is-selected").map((life) => life.getAttribute("data-p"));
  const bands = () => all(".gedcom-ft-row-selected");

  it("marks one person's row, lifeline and band, and no other", () => {
    const drawn = board();
    drawn.select("@I12@", true);

    expect(selectedNames()).toEqual(["@I12@"]);
    expect(selectedLives()).toEqual(["@I12@"]);
    expect(bands()).toHaveLength(1);
  });

  it("marks a row and leaves the scroll of the plot where it was when asked not to reveal", () => {
    const drawn = board();
    const plot = container.querySelector<HTMLElement>(".gedcom-ft-plot");
    drawn.setScroll({ top: 0, left: 0 });
    drawn.select("@I12@", false);

    expect(selectedNames()).toEqual(["@I12@"]);
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
    const drawn = board(fileTimelineOf(curieIndex()), { focus: "@I12@", up: 0, down: 0 });
    host.scopeChanged.mockClear();

    drawn.select("@I2@", false);

    expect(host.scopeChanged).not.toHaveBeenCalled();
  });

  it("survives the light of a hover and a search, and is replaced by the next selection", () => {
    const drawn = board();
    drawn.select("@I12@", true);
    drawn.highlight("@I1@");
    drawn.setQuery("curie");
    drawn.stepMatch(1);
    expect(selectedNames()).toEqual(["@I12@"]);

    drawn.select("@I2@", true);
    expect(selectedNames()).toEqual(["@I2@"]);
    expect(selectedLives()).toEqual(["@I2@"]);
    expect(bands()).toHaveLength(1);

    drawn.select(null, true);
    expect(selectedNames()).toEqual([]);
    expect(bands()).toHaveLength(0);
  });

  it("is on a row that leaves the drawn rows and comes back", () => {
    const drawn = board();
    drawn.select("@I2@", true);
    drawn.draw({ top: 18 * ROW, left: 0, width: 2000, height: ROW });
    expect(nameRow("@I2@")).toBeNull();

    drawn.draw(WHOLE);
    expect(selectedNames()).toEqual(["@I2@"]);
  });

  it("is on the row after a new reading of the file and after a scope narrowed and widened", () => {
    const drawn = board();
    drawn.select("@I2@", true);
    drawn.show(fileTimelineOf(curieIndex()), SCOPE);
    drawn.draw(WHOLE);
    expect(selectedNames()).toEqual(["@I2@"]);

    drawn.show(fileTimelineOf(curieIndex()), { ...SCOPE, focus: "@I12@", up: 0, down: 0 });
    drawn.draw(WHOLE);
    expect(selectedNames()).toEqual([]);
    drawn.show(fileTimelineOf(curieIndex()), SCOPE);
    drawn.draw(WHOLE);
    expect(selectedNames()).toEqual(["@I2@"]);
  });

  it("changes the scope to the person's own branch where the branch shown does not hold them", () => {
    const drawn = board(fileTimelineOf(curieIndex()), { focus: "@I12@", up: 0, down: 0 });
    expect(nameRow("@I2@")).toBeNull();

    drawn.select("@I2@", true);

    expect(host.scopeChanged.mock.lastCall?.[0].focus).toBe("@I2@");
    expect(selectedNames()).toEqual(["@I2@"]);
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
