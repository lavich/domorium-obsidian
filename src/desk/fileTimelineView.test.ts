// @vitest-environment happy-dom
import type { Range } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { fileTimelineOf, type FileTimeline } from "./fileTimeline";
import {
  FileTimelineBoard,
  readTimelineState,
  ROW,
  ZOOM,
  type FileTimelineHost,
  type TimelineScope,
} from "./fileTimelineView";

const SCOPE: TimelineScope = { up: 2, down: 2, zoom: ZOOM.initial, others: true };
const WHOLE = { top: 0, left: 0, width: 2000, height: 20 * ROW };

let container: HTMLElement;
let host: {
  openPerson: ReturnType<typeof vi.fn<(xref: string) => void>>;
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
    openPerson: vi.fn(),
    showInSource: vi.fn(),
    scopeChanged: vi.fn(),
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
  };
});

function board(model: FileTimeline = fileTimelineOf(curieIndex()), scope: Partial<TimelineScope> = {}) {
  const drawn = new FileTimelineBoard(container, host satisfies FileTimelineHost);
  drawn.show(model, "curie.ged", { ...SCOPE, ...scope });
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

  it("says how many people have no dated event, and gives them a row", () => {
    board(fileTimelineOf(indexOf(curieWithEvents())));

    expect(names()).toHaveLength(18);
    expect(container.querySelector(".gedcom-ft-undated")?.textContent).toContain("Kazimierz Żorawski");
    expect(container.querySelector(".gedcom-ft-undated")?.textContent).toContain("1 person");
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

  it("lights a person under the pointer as it moves", () => {
    board();
    nameRow("@I2@")?.dispatchEvent(new MouseEvent("pointermove", { bubbles: true }));

    expect(nameRow("@I2@")?.classList.contains("is-hl")).toBe(true);
  });
});

describe("the year cursor", () => {
  it("shows the age everyone alive reached that year, and how many were alive", () => {
    const drawn = board();
    drawn.setYear(1906);

    const age = (xref: string) => container.querySelector(`.gedcom-ft-age[data-p="${xref}"] text`)?.textContent;
    expect(age("@I1@")).toBe("39");
    expect(age("@I12@")).toBe("9");
    expect(age("@I4@")).toBeUndefined();
    expect(container.querySelector(".gedcom-ft-alive")?.textContent).toBe("In 1906: 11 people alive");
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
    expect(container.querySelector(".gedcom-ft-alive")?.textContent).toBe("");
  });
});

describe("facts without a date", () => {
  const caption = (xref: string) => container.querySelector(`.gedcom-ft-caption[data-p="${xref}"]`)?.textContent;

  it("are written in the lifeline only once zoomed in far enough", () => {
    board();
    expect(caption("@I1@")).toBeUndefined();

    container.replaceChildren();
    board(fileTimelineOf(curieIndex()), { zoom: ZOOM.captions });
    expect(caption("@I1@")).toBe("Physicist and chemist");
  });

  it("are written in the lifeline of the person under the pointer", () => {
    board().highlight("@I1@");

    expect(container.querySelector(".gedcom-ft-hover .gedcom-ft-caption")?.textContent).toBe("Physicist and chemist");
  });
});

describe("the toolbar", () => {
  it("hides and shows the events other than births, marriages and deaths", () => {
    board(fileTimelineOf(indexOf(curieWithEvents())));
    const chip = container.querySelector<HTMLElement>(".gedcom-ft-chip");
    expect(all(".gedcom-ft-mark.is-other").length).toBeGreaterThan(0);

    chip?.click();
    expect(all(".gedcom-ft-mark.is-other")).toHaveLength(0);
    expect(all(".gedcom-ft-span")).toHaveLength(0);
    expect(chip?.getAttribute("aria-pressed")).toBe("false");
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ others: false }));

    chip?.click();
    expect(all(".gedcom-ft-mark.is-other").length).toBeGreaterThan(0);
  });

  it("widens the axis of years with the zoom", () => {
    board();
    const width = () => Number(container.querySelector(".gedcom-ft-chart")?.getAttribute("width"));
    const before = width();
    const zoom = container.querySelector<HTMLInputElement>(".gedcom-ft-zoom input");
    if (zoom) {
      zoom.value = "12";
      zoom.dispatchEvent(new Event("input"));
    }

    expect(width()).toBeGreaterThan(before * 1.9);
    expect(host.scopeChanged).toHaveBeenLastCalledWith(expect.objectContaining({ zoom: 12 }));
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

  it("opens on the branch a scope names, and says the cursor counts within it", () => {
    board(fileTimelineOf(curieIndex()), { focus: "@I12@" }).setYear(1930);

    expect(names()).toHaveLength(10);
    expect(container.querySelector(".gedcom-ft-alive")?.textContent).toContain("in this branch");
  });
});

describe("activating", () => {
  it("opens a person from their name or their lifeline", () => {
    board();
    nameRow("@I12@")?.click();
    of(".gedcom-ft-life", "@I1@")[0]?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(host.openPerson.mock.calls).toEqual([["@I12@"], ["@I1@"]]);
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
    expect(host.openPerson).not.toHaveBeenCalled();
    expect(nameRow("@I1@")?.classList.contains("is-hl")).toBe(true);

    touch();
    expect(host.openPerson).toHaveBeenCalledWith("@I1@");
  });

  it("on a touch after a mark's, lights the person rather than opening them", () => {
    board();
    tap(container.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]'));
    tap(of(".gedcom-ft-life", "@I1@")[0]);

    expect(host.openPerson).not.toHaveBeenCalled();
    tap(of(".gedcom-ft-life", "@I1@")[0]);
    expect(host.openPerson).toHaveBeenCalledWith("@I1@");
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

    expect(host.openPerson).toHaveBeenCalledWith("@I1@");
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
  it("reads its file, scope and zoom, and keeps each within bounds", () => {
    expect(readTimelineState({ gedcom: "curie.ged", focus: "@I12@", up: 3, down: 0, zoom: 12, others: false })).toEqual({
      gedcom: "curie.ged",
      focus: "@I12@",
      up: 3,
      down: 0,
      zoom: 12,
      others: false,
    });
    expect(readTimelineState({ up: 40, down: -2, zoom: 1, focus: 7 })).toEqual({
      gedcom: null,
      up: 9,
      down: 0,
      zoom: ZOOM.min,
      others: true,
    });
    expect(readTimelineState(null)).toEqual({ gedcom: null, up: 2, down: 2, zoom: ZOOM.initial, others: true });
  });
});

describe("a file that is gone", () => {
  it("says so", () => {
    const drawn = board();
    drawn.showGone("curie.ged");

    expect(container.querySelector(".gedcom-ft-gone")?.textContent).toContain("curie.ged");
    expect(container.querySelector(".gedcom-ft")?.classList.contains("is-gone")).toBe(true);
  });
});

describe("a file with very many dated events", () => {
  it("still summarises and draws it", () => {
    const base = fileTimelineOf(curieIndex());
    const marie = base.people.get("@I1@");
    if (!marie) {
      throw new Error("no Marie");
    }
    const many = Array.from({ length: 200_000 }, (_, at) => ({
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
    board(model, { others: false });

    expect(container.querySelector(".gedcom-ft-summary")?.textContent).toContain("1827–2007");
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
    expect(host.openPerson).toHaveBeenCalledWith("@I1@");
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

  it("says whether it shows the whole file or a branch, and stops each stepper at zero and nine", () => {
    board();
    expect(scopeText()).toBe(
      "Whole file · 17 people. Choose the branch on a person's row to see only their ancestors and descendants.",
    );

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

describe("what has no mark on the line", () => {
  it("counts the facts without a year, by kind", () => {
    board();

    expect(container.querySelector(".gedcom-ft-undated")?.textContent).toContain("facts without a year");
    expect(container.querySelector(".gedcom-ft-undated")?.textContent).toContain("occupation");
  });
});
