// @vitest-environment happy-dom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { generated } from "../../tests/generated";
import { resetLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { ListBoard, type ListHost } from "./fileList";

const box = { width: 1000, height: 600, wide: 36, compact: 56 };

beforeAll(() => {
  installObsidianDom();
  const proto = HTMLElement.prototype;
  Object.defineProperty(proto, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains("gedcom-list") ? box.width : 0;
    },
  });
  Object.defineProperty(proto, "clientHeight", {
    configurable: true,
    get(this: HTMLElement) {
      return this.classList.contains("gedcom-list-scroll") ? box.height : 0;
    },
  });
  proto.getBoundingClientRect = function (this: HTMLElement) {
    const compact = this.closest(".gedcom-list")?.classList.contains("is-compact") ?? false;
    const sized = this.classList.contains("gedcom-list-row") || this.classList.contains("gedcom-list-probe");
    const height = sized ? (compact ? box.compact : box.wide) : 0;
    return { height } as DOMRect;
  };
});
afterAll(() => {
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientWidth;
  delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
});
afterEach(resetLanguage);

let parent: HTMLElement;
let coarse = false;
let host: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  changed: ReturnType<typeof vi.fn<ListHost["changed"]>>;
  scrolled: ReturnType<typeof vi.fn<ListHost["scrolled"]>>;
  setIcon: ReturnType<typeof vi.fn<ListHost["setIcon"]>>;
  coarsePointer: () => boolean;
};

beforeEach(() => {
  box.width = 1000;
  box.height = 600;
  coarse = false;
  parent = document.createElement("div");
  document.body.replaceChildren(parent);
  host = {
    select: vi.fn(),
    changed: vi.fn(),
    scrolled: vi.fn(),
    setIcon: vi.fn(),
    coarsePointer: () => coarse,
  };
});

const index = curieIndex();
const board = (state = {}, source = index): ListBoard => {
  const made = new ListBoard(parent, host);
  made.show(source, state);
  return made;
};

const query = <T extends HTMLElement>(selector: string): T => parent.querySelector<T>(selector) as T;
const all = (selector: string): HTMLElement[] => [...parent.querySelectorAll<HTMLElement>(selector)];
const rows = (): HTMLElement[] => all(".gedcom-list-row");
const cell = (row: HTMLElement | undefined, position: number): string | undefined =>
  row?.querySelectorAll(".gedcom-list-cell")[position]?.textContent ?? undefined;
const names = (): (string | undefined)[] => rows().map((row) => cell(row, 0));
const xrefs = (): (string | undefined)[] => rows().map((row) => row.dataset.xref);
const row = (xref: string): HTMLElement | undefined => rows().find((one) => one.dataset.xref === xref);
const scroller = (): HTMLElement => query(".gedcom-list-scroll");
const text = (selector: string): string => query(selector).textContent ?? "";
const press = (key: string, target: HTMLElement = scroller()): KeyboardEvent => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
};
const type = (value: string): void => {
  const field = query<HTMLInputElement>(".gedcom-list-filter");
  field.value = value;
  field.dispatchEvent(new Event("input"));
};
const click = (target: Element | null | undefined): void => {
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
};
const button = (selector: string, label: string): HTMLElement | undefined =>
  all(selector).find((one) => one.textContent?.startsWith(label));
const active = (): string | null => scroller().getAttribute("aria-activedescendant");

describe("the people", () => {
  it("lists them in file order with Marie's years, place and sources, and marks who cites none", () => {
    board();

    expect(names()[0]).toBe("Marie Skłodowska-Curie");
    expect([1, 2, 3].map((at) => cell(rows()[0], at))).toEqual(["1867–1934", "Warsaw, Congress Poland", "2"]);
    expect(rows()).toHaveLength(17);
    const zofia = row("@I5@");
    expect(zofia?.querySelector(".gedcom-list-gap")?.getAttribute("aria-label")).toBe("No sources at all");
    expect(cell(zofia, 3)).toBe("");
    expect(text(".gedcom-list-count")).toBe("17 people");
  });

  it("has no chip that narrows the people to those who cite no source, and sorts them first by Sources", () => {
    board();
    expect(all(".gedcom-list-chip")).toHaveLength(0);

    click(button(".gedcom-list-sort", "Sources"));

    expect(rows()).toHaveLength(17);
    expect(xrefs().slice(0, 11).map((xref) => cell(row(xref ?? ""), 3))).toEqual(Array(11).fill(""));
    expect(xrefs().at(-1)).toBe("@I1@");
  });
});

describe("the kinds", () => {
  it("switches between people, families and sources, marking the one shown", () => {
    board();

    click(button(".gedcom-list-seg-button", "Families"));
    expect(button(".gedcom-list-seg-button", "Families")?.getAttribute("aria-pressed")).toBe("true");
    expect(button(".gedcom-list-seg-button", "People")?.getAttribute("aria-pressed")).toBe("false");
    expect(rows().find((one) => one.dataset.xref === "@F3@")?.textContent).toContain("Pierre Curie and Marie Skłodowska-Curie");
    expect([1, 2, 3].map((at) => cell(row("@F3@"), at))).toEqual(["1895", "Sceaux, France", "2"]);
    expect(text(".gedcom-list-count")).toBe("5 families");

    click(button(".gedcom-list-seg-button", "Sources"));
    expect(names()).toEqual([
      "The Nobel Prize in Physics 1903",
      "Parish registers of Warsaw",
      "The Nobel Prize in Chemistry 1911 and 1935",
    ]);
    expect([1, 2, 3].map((at) => cell(row("@S2@"), at))).toEqual(["", "State Archive in Warsaw", "2"]);
    expect(text(".gedcom-list-count")).toBe("3 sources");
    expect(host.changed).toHaveBeenLastCalledWith({ kind: "sources" });
  });

  it("says the file holds none of a kind it has none of", () => {
    board({}, indexOf("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 TRLR\n"));
    expect(text(".gedcom-list-none")).toBe("The file holds no people.");
    click(button(".gedcom-list-seg-button", "Sources"));
    expect(text(".gedcom-list-none")).toBe("The file holds no sources.");
  });
});

describe("the filter", () => {
  it("narrows as the reader types and counts what it shows", () => {
    board();
    type("joliot");

    expect(names()).toEqual(["Irène Joliot-Curie", "Frédéric Joliot", "Hélène Langevin-Joliot", "Pierre Joliot"]);
    expect(text(".gedcom-list-count")).toBe("4 of 17 people");
  });

  it("clears on switching the kind", () => {
    board();
    type("joliot");
    click(button(".gedcom-list-seg-button", "Families"));

    expect(query<HTMLInputElement>(".gedcom-list-filter").value).toBe("");
    expect(rows()).toHaveLength(5);
  });

  it("clears on the first Escape and gives the focus to the rows on the second", () => {
    board();
    type("joliot");
    const field = query<HTMLInputElement>(".gedcom-list-filter");

    expect(press("Escape", field).defaultPrevented).toBe(true);
    expect(field.value).toBe("");
    expect(rows()).toHaveLength(17);
    press("Escape", field);

    expect(document.activeElement).toBe(scroller());
  });

  it("says what matches nothing and what the search covers", () => {
    board();
    type("zzz");

    expect(text(".gedcom-list-none")).toBe("Nothing matches “zzz”. Search covers names, years and places.");
    expect(rows()).toHaveLength(0);
  });

  it("is a text field, which a first Escape does not swallow, and is focused and selected by focusFilter", () => {
    const made = board();
    type("joliot");
    made.focusFilter();

    expect(query<HTMLInputElement>(".gedcom-list-filter").getAttribute("type")).toBe("text");
    expect(document.activeElement).toBe(query(".gedcom-list-filter"));
  });
});

describe("sorting", () => {
  const header = (label: string): HTMLElement => button(".gedcom-list-sort", label) as HTMLElement;
  const sortOf = (label: string): string | null => header(label).parentElement?.getAttribute("aria-sort") ?? null;

  it("sorts on the first press, reverses on the second and restores the file's order on the third", () => {
    board();

    click(header("Name"));
    expect(names()[0]).toBe("Bronisława Boguska");
    expect(names().at(-1)).toBe("Helena Szalay");
    expect(sortOf("Name")).toBe("ascending");
    expect(sortOf("Years")).toBe("none");

    click(header("Name"));
    expect(names()[0]).toBe("Helena Szalay");
    expect(sortOf("Name")).toBe("descending");

    click(header("Name"));
    expect(names()[0]).toBe("Marie Skłodowska-Curie");
    expect(sortOf("Name")).toBe("none");
  });

  it("keeps ties in the file's order, descending too", () => {
    board();
    click(header("Years"));
    click(header("Years"));

    const order = xrefs();
    expect(order.indexOf("@I13@")).toBeLessThan(order.indexOf("@I15@"));
  });

  it("reports the sort and brings it back", () => {
    const made = board();
    click(header("Years"));
    const saved = made.state();
    expect(saved).toEqual({ sort: { people: { by: "years", dir: "asc" } } });

    document.body.replaceChildren((parent = document.createElement("div")));
    const again = board(saved);

    expect(again.state()).toEqual(saved);
    expect(sortOf("Years")).toBe("ascending");
  });

  it("keeps each kind's sort", () => {
    board();
    click(button(".gedcom-list-seg-button", "Families"));
    click(header("Children"));
    click(header("Children"));
    click(button(".gedcom-list-seg-button", "People"));
    click(button(".gedcom-list-seg-button", "Families"));

    expect(xrefs()).toEqual(["@F1@", "@F2@", "@F3@", "@F4@", "@F5@"]);
  });
});

describe("showing the same file again", () => {
  it("does not draw or sort again for the same reading and state, a resize included", () => {
    const made = board();
    type("curie");
    const before = rows();

    made.show(index, made.state());
    made.resized();

    expect(rows().map((one, at) => one === before[at])).not.toContain(false);
    expect(rows()).toHaveLength(before.length);
    expect(query<HTMLInputElement>(".gedcom-list-filter").value).toBe("curie");
  });

  it("keeps the filter across a new reading of the file", () => {
    const made = board();
    type("joliot");
    made.show(curieIndex(), {});

    expect(names()).toHaveLength(4);
  });
});

describe("selecting", () => {
  it("selects the record of a clicked row without scrolling the list", () => {
    board();
    scroller().scrollTop = 0;

    click(row("@I2@")?.querySelector(".gedcom-list-cell"));

    expect(host.select).toHaveBeenCalledWith("@I2@");
    expect(row("@I2@")?.getAttribute("aria-selected")).toBe("true");
    expect(scroller().scrollTop).toBe(0);
  });

  it("marks the row of a selection made elsewhere, and unmarks for none", () => {
    const made = board();

    made.select("@I9@", false);
    expect(all(".is-selected").map((one) => one.dataset.xref)).toEqual(["@I9@"]);
    expect(row("@I9@")?.getAttribute("aria-selected")).toBe("true");
    expect(row("@I1@")?.getAttribute("aria-selected")).toBe("false");

    made.select(null, false);
    expect(all(".is-selected")).toHaveLength(0);
  });

  it("changes nothing for a media record or a record the file does not hold", () => {
    const made = board();
    made.select("@I9@", true);
    type("");

    for (const xref of ["@O5@", "@I999@"]) {
      made.select(xref, true);
      expect(all(".is-selected")).toHaveLength(0);
      expect(text(".gedcom-list-count")).toBe("17 people");
    }
  });

  it("stays marked across filtering and sorting, and is marked when its row is drawn", () => {
    const made = board();
    made.select("@I9@", false);
    type("curie");
    click(button(".gedcom-list-sort", "Name"));

    expect(row("@I9@")?.getAttribute("aria-selected")).toBe("true");
    type("joliot");
    expect(all(".is-selected")).toHaveLength(0);
    type("");
    expect(row("@I9@")?.classList.contains("is-selected")).toBe(true);
  });

  it("switches to the kind of a record chosen from outside and clears a filter that hides it", () => {
    const made = board();

    made.select("@F3@", true);
    expect(row("@F3@")?.classList.contains("is-selected")).toBe(true);
    expect(button(".gedcom-list-seg-button", "Families")?.getAttribute("aria-pressed")).toBe("true");

    made.select("@I12@", true);
    type("zzz");
    made.select("@I1@", true);
    expect(query<HTMLInputElement>(".gedcom-list-filter").value).toBe("");
    expect(row("@I1@")?.classList.contains("is-selected")).toBe(true);
  });

  it("leaves a typed filter alone for a selection it has already marked", () => {
    const made = board();
    made.select("@I12@", true);
    type("joliot");

    made.select("@I12@", true);

    expect(query<HTMLInputElement>(".gedcom-list-filter").value).toBe("joliot");
    expect(rows()).toHaveLength(4);
  });

  it("does not clear a filter for a click in the list itself", () => {
    const made = board();
    type("joliot");

    click(row("@I14@"));
    made.select("@I14@", false);

    expect(query<HTMLInputElement>(".gedcom-list-filter").value).toBe("joliot");
  });

  describe("in a file of 500 people", () => {
    const large = indexOf(generated(500));
    const middle = (xref: string, made: ListBoard): void => {
      const top = (made as unknown as { positions: Map<string, number> }).positions.get(xref)! * box.wide - scroller().scrollTop;
      expect(top).toBeGreaterThanOrEqual(box.height / 4);
      expect(top).toBeLessThanOrEqual((3 * box.height) / 4);
    };

    it("scrolls the row of a new selection into the middle of the list, and draws it", () => {
      const made = board({}, large);

      made.select("@I400@", true);

      expect(row("@I400@")?.classList.contains("is-selected")).toBe(true);
      middle("@I400@", made);
    });

    it("scrolls nothing for a row already wholly in view", () => {
      const made = board({}, large);
      made.select("@I3@", true);
      scroller().scrollTop = 0;

      made.select("@I3@", true);

      expect(scroller().scrollTop).toBe(0);
    });

    it("centres a selection that is out of sight when the reader returns to it", () => {
      const made = board({}, large);
      made.select("@I400@", true);
      made.setScroll(0);

      made.select("@I400@", true);

      middle("@I400@", made);
    });

    it("puts back a saved scroll", () => {
      const made = board({}, large);
      made.setScroll(5000);

      expect(made.scroll()).toBe(5000);
    });
  });
});

describe("the keyboard", () => {
  it("moves the virtual focus with the arrows, Home, End and the page keys, and selects nothing", () => {
    board();
    press("Home");
    expect(active()).toMatch(/-r0$/);
    press("ArrowDown");
    press("ArrowDown");
    expect(active()).toMatch(/-r2$/);
    expect(rows().find((one) => one.classList.contains("is-focused"))?.id).toBe(active());
    press("End");
    expect(active()).toMatch(/-r16$/);
    press("PageUp");
    expect(Number(active()?.split("-r")[1])).toBeLessThan(16);
    expect(host.select).not.toHaveBeenCalled();
  });

  it("does not wrap at the first and last rows", () => {
    board();
    press("Home");
    press("ArrowUp");
    expect(active()).toMatch(/-r0$/);
    press("End");
    press("ArrowDown");
    expect(active()).toMatch(/-r16$/);
  });

  it("selects with Enter and Space, keeps the focus, and stops the page from scrolling on Space", () => {
    board();
    press("Home");
    press("ArrowDown");

    press("Enter");
    expect(host.select).toHaveBeenLastCalledWith("@I2@");
    expect(active()).toMatch(/-r1$/);

    expect(press(" ").defaultPrevented).toBe(true);
    expect(host.select).toHaveBeenCalledTimes(2);
    expect(active()).toMatch(/-r1$/);
  });

  it("names a drawn row after a key, a filter and a sort", () => {
    board();
    press("End");
    const named = (): boolean => {
      const id = active();
      return id !== null && document.getElementById(id) !== null;
    };
    expect(named()).toBe(true);
    type("joliot");
    expect(active() === null || named()).toBe(true);
    click(button(".gedcom-list-sort", "Name"));
    expect(active() === null || named()).toBe(true);
    type("zzz");
    expect(active()).toBeNull();
  });

  it("does not draw the rows again when the list takes the focus, so a click that began with it still lands", () => {
    board();
    const before = rows();

    scroller().dispatchEvent(new Event("focus"));

    expect(rows().map((one, at) => one === before[at])).not.toContain(false);
    expect(rows()).toHaveLength(before.length);
    expect(active()).toMatch(/-r0$/);
  });

  it("has the roles of a grid", () => {
    board();

    expect(scroller().getAttribute("role")).toBe("grid");
    expect(scroller().getAttribute("aria-rowcount")).toBe("18");
    expect(query(".gedcom-list-head").getAttribute("aria-rowindex")).toBe("1");
    expect(query(".gedcom-list-spacer").getAttribute("role")).toBe("rowgroup");
    expect(all("[role=columnheader]")).toHaveLength(4);
    expect(rows()[0]?.getAttribute("role")).toBe("row");
    expect(rows()[0]?.getAttribute("aria-rowindex")).toBe("2");
    expect(rows()[0]?.querySelector("[role=gridcell]")).not.toBeNull();
    expect(scroller().getAttribute("tabindex")).toBe("0");
    expect(query(".gedcom-list-sort-mark").getAttribute("aria-hidden")).toBe("true");
  });

  it("gives two boards on one file no row id in common", () => {
    board();
    const other = document.createElement("div");
    document.body.append(other);
    new ListBoard(other, host).show(index, {});

    const ids = [...document.querySelectorAll(".gedcom-list-row")].map((one) => one.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("a narrow tab and a touch device", () => {
  it("is wide at 1000 pixels with a header row and no sort selector", () => {
    board();

    expect(query(".gedcom-list").classList.contains("is-compact")).toBe(false);
    expect(query(".gedcom-list-head").style.display).not.toBe("none");
    expect(query(".gedcom-list-sortbar").style.display).toBe("none");
  });

  it("is compact below 640 pixels, with the selector in place of the header", () => {
    box.width = 600;
    const made = board();
    made.resized();

    expect(query(".gedcom-list").classList.contains("is-compact")).toBe(true);
    expect(query(".gedcom-list-head").style.display).toBe("none");
    expect(query(".gedcom-list-sortbar").style.display).not.toBe("none");
  });

  it("is compact on a coarse pointer at any width", () => {
    coarse = true;
    board();

    expect(query(".gedcom-list").classList.contains("is-compact")).toBe(true);
    expect(query(".gedcom-list").classList.contains("is-touch")).toBe(true);
  });

  it("changes nothing at a width of zero", () => {
    const made = board();
    box.width = 0;
    made.resized();

    expect(query(".gedcom-list").classList.contains("is-compact")).toBe(false);
  });

  it("flips with a margin, so a tab at 650 does not flip back", () => {
    const made = board();
    box.width = 600;
    made.resized();
    box.width = 650;
    made.resized();
    expect(query(".gedcom-list").classList.contains("is-compact")).toBe(true);
    box.width = 700;
    made.resized();
    expect(query(".gedcom-list").classList.contains("is-compact")).toBe(false);
  });

  it("keeps the first visible row when the layout flips", () => {
    const made = board({}, indexOf(generated(500)));
    made.setScroll(100 * box.wide);
    const first = Math.floor(scroller().scrollTop / box.wide);

    box.width = 500;
    made.resized();

    expect(scroller().scrollTop).toBe(first * box.compact);
  });

  it("sorts by the selector and turns the direction", () => {
    box.width = 500;
    const made = board();
    made.resized();
    const select = query<HTMLSelectElement>(".gedcom-list-sort-select");
    expect(query<HTMLButtonElement>(".gedcom-list-direction").disabled).toBe(true);

    select.value = "years";
    select.dispatchEvent(new Event("change"));
    expect(xrefs()[0]).toBe("@I9@");
    click(query(".gedcom-list-direction"));

    expect(xrefs()[0]).toBe("@I17@");
    expect(made.state()).toEqual({ sort: { people: { by: "years", dir: "desc" } } });
  });
});

describe("a file of twenty thousand people", () => {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
  for (let at = 1; at <= 20_000; at += 1) {
    lines.push(`0 @I${at}@ INDI`, `1 NAME Person${at} /Family${at % 97}/`, "1 BIRT", `2 DATE ${1700 + (at % 300)}`);
  }
  lines.push("0 TRLR", "");
  const big = indexOf(lines.join("\n"));

  it("draws a window of rows over a spacer as tall as all of them, and the window follows a scroll", () => {
    const made = board({}, big);

    expect(rows().length).toBeLessThan(100);
    expect(query(".gedcom-list-spacer").style.getPropertyValue("height")).toBe(`${20_000 * box.wide}px`);

    made.setScroll(10_000 * box.wide);
    expect(row("@I10001@")).toBeDefined();
    expect(row("@I1@")).toBeUndefined();
    expect(rows().length).toBeLessThan(100);
  });

  it("draws the last row for End, and only a window", () => {
    board({}, big);

    press("End");

    expect(row("@I20000@")).toBeDefined();
    expect(row("@I20000@")?.id).toBe(active());
    expect(rows().length).toBeLessThan(100);
  });

  it("still draws only a window after typing and after a sort", () => {
    board({}, big);

    type("family13");
    expect(rows().length).toBeGreaterThan(0);
    expect(rows().length).toBeLessThan(100);
    type("");
    click(button(".gedcom-list-sort", "Name"));

    expect(rows().length).toBeLessThan(100);
    expect(names()[0]).toBe("Person97 Family0");
  });
});

describe("a change of the selection that the tab must hear of", () => {
  it("reports a kind switched by a selection from outside", () => {
    const made = board();
    host.changed.mockClear();

    made.select("@F3@", true);

    expect(host.changed).toHaveBeenLastCalledWith({ kind: "families" });
  });

  it("reports nothing for a selection that changes no state", () => {
    const made = board();
    host.changed.mockClear();

    made.select("@I2@", true);
    made.select("@I3@", false);

    expect(host.changed).not.toHaveBeenCalled();
  });
});

describe("the keyboard focus on the controls", () => {
  it("stays on a header button through a sort", () => {
    board();
    const header = button(".gedcom-list-sort", "Name") as HTMLElement;
    header.focus();
    click(header);
    expect(document.activeElement).toBe(header);
    click(header);
    expect(document.activeElement).toBe(header);
    expect(header.parentElement?.getAttribute("aria-sort")).toBe("descending");
    click(header);
    expect(header.parentElement?.getAttribute("aria-sort")).toBe("none");
  });

  it("leaves Enter and Space on a header button to the button", () => {
    board();
    const header = button(".gedcom-list-sort", "Name") as HTMLElement;

    expect(press("Enter", header).defaultPrevented).toBe(false);
    expect(press(" ", header).defaultPrevented).toBe(false);
    expect(host.select).not.toHaveBeenCalled();
  });

  it("keeps the same header buttons when the kind changes", () => {
    board();
    const before = all(".gedcom-list-sort");

    click(button(".gedcom-list-seg-button", "Families"));

    expect(all(".gedcom-list-sort")).toEqual(before);
    expect(all(".gedcom-list-sort-label").map((one) => one.textContent)).toEqual(["Spouses", "Marriage", "Place", "Children"]);
  });
});

describe("what the row height follows", () => {
  it("is read again from the style on a resize, and the rows move with it", () => {
    const made = board();
    box.wide = 50;

    made.resized();

    expect(query(".gedcom-list-spacer").style.getPropertyValue("height")).toBe(`${17 * 50}px`);
    expect(rows()[1]?.style.getPropertyValue("top")).toBe("50px");
  });

  it("labels the counts of a compact row so they are not read as part of the years", () => {
    box.width = 500;
    const made = board();
    made.resized();

    expect(cell(row("@I1@"), 3)).toBe("2 sources");
    expect(row("@I5@")?.querySelector(".gedcom-list-gap")?.getAttribute("title")).toBe("No sources at all");
    expect(cell(row("@I5@"), 3)).toBe(" 0 sources");
    click(button(".gedcom-list-seg-button", "Families"));
    expect(cell(row("@F3@"), 3)).toBe("2 children");
    click(button(".gedcom-list-seg-button", "Sources"));
    expect(cell(row("@S2@"), 3)).toBe("Cited by 2");
  });
});

describe("the scroll the board reports", () => {
  it("tells the host of a scroll the reader made and of one the board made", () => {
    const made = board({}, indexOf(generated(500)));
    host.scrolled.mockClear();

    scroller().scrollTop = 90;
    scroller().dispatchEvent(new Event("scroll"));
    expect(host.scrolled).toHaveBeenLastCalledWith(90);

    made.select("@I400@", true);
    expect(host.scrolled.mock.lastCall?.[0]).toBeGreaterThan(90);
  });
});

