// @vitest-environment happy-dom
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { generated } from "../../tests/generated";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
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
  const field = query<HTMLInputElement>(".gedcom-list-search");
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
    expect(rows().find((one) => one.dataset.xref === "@F3@")?.textContent).toContain("Pierre Curie + Marie Skłodowska-Curie");
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

    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("");
    expect(rows()).toHaveLength(5);
  });

  it("clears on the first Escape and collapses the search on the second", () => {
    const made = board();
    made.focusFilter();
    type("joliot");
    const field = query<HTMLInputElement>(".gedcom-list-search");
    const find = query(".gedcom-list-find");

    expect(press("Escape", field).defaultPrevented).toBe(true);
    expect(field.value).toBe("");
    expect(rows()).toHaveLength(17);
    expect(find.classList.contains("is-open")).toBe(true);
    press("Escape", field);

    expect(find.classList.contains("is-open")).toBe(false);
  });

  it("opens from its icon, counts what it narrows to, clears with the cross and stays open, and hands the keyboard to the rows on Enter", () => {
    board();
    const find = query(".gedcom-list-find");
    click(query(".gedcom-list-find-toggle"));
    expect(find.classList.contains("is-open")).toBe(true);
    type("joliot");

    expect(text(".gedcom-list-find-count")).toBe("4 of 17 people");
    click(query(".gedcom-list-find-clear"));
    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("");
    expect(rows()).toHaveLength(17);
    expect(find.classList.contains("is-open")).toBe(true);
    press("Enter", query(".gedcom-list-search"));
    expect(document.activeElement).toBe(scroller());
  });

  it("has no arrows, since a list narrows and does not step", () => {
    board();

    expect(all(".gedcom-list-find-prev, .gedcom-list-find-next")).toHaveLength(0);
  });

  it("keeps the search open but empty when a selection from outside clears a filter that hides its row", () => {
    const made = board();
    made.focusFilter();
    type("joliot");

    made.select("@I1@", true);

    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("");
    expect(query(".gedcom-list-find").classList.contains("is-open")).toBe(true);
    expect(text(".gedcom-list-find-count")).toBe("");
  });

  it("says what matches nothing and what the search covers", () => {
    board();
    type("zzz");

    expect(text(".gedcom-list-none")).toBe("Nothing matches “zzz”. Search covers names, years and places.");
    expect(rows()).toHaveLength(0);
  });

  it("is opened, focused and selected by focusFilter", () => {
    const made = board();
    type("joliot");
    made.focusFilter();

    expect(query(".gedcom-list-find").classList.contains("is-open")).toBe(true);
    expect(document.activeElement).toBe(query(".gedcom-list-search"));
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
    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("curie");
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
    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("");
    expect(row("@I1@")?.classList.contains("is-selected")).toBe(true);
  });

  it("leaves a typed filter alone for a selection it has already marked", () => {
    const made = board();
    made.select("@I12@", true);
    type("joliot");

    made.select("@I12@", true);

    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("joliot");
    expect(rows()).toHaveLength(4);
  });

  it("does not clear a filter for a click in the list itself", () => {
    const made = board();
    type("joliot");

    click(row("@I14@"));
    made.select("@I14@", false);

    expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("joliot");
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

  it("names the grid, the filter and the sort select by hidden text, so no large element is a hover tooltip", () => {
    board();
    const named = (element: Element | null): string | undefined => {
      const id = element?.getAttribute("aria-labelledby");
      return id ? (document.getElementById(id)?.textContent ?? undefined) : undefined;
    };

    expect(named(scroller())).toBe("Records of the file");
    expect(named(query(".gedcom-list-search"))).toBe("Name, year, place…");
    expect(named(query(".gedcom-list-sort-select"))).toBe("Sort by");
    click(button(".gedcom-list-seg-button", "Families"));
    expect(named(query(".gedcom-list-search"))).toBe("Names, year, place…");
    for (const element of [scroller(), query(".gedcom-list"), query(".gedcom-list-search"), query(".gedcom-list-sort-select"), ...rows()]) {
      expect(element.hasAttribute("aria-label")).toBe(false);
    }
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
    expect(row("@I5@")?.querySelector(".gedcom-list-gap")?.getAttribute("aria-label")).toBe("No sources at all");
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


describe("the places", () => {
  const events = indexOf(curieWithEvents());
  const place = (key: string): HTMLElement | undefined => rows().find((one) => one.dataset.key === key);
  const open = (state = {}) => board({ kind: "places", ...state }, events);

  it("is the fourth kind, after the sources", () => {
    board();

    expect(all(".gedcom-list-seg-button").map((one) => one.textContent)).toEqual(["People", "Families", "Sources", "Places", "Events"]);
  });

  it("lists every place of the file, alphabetically, with its events and years", () => {
    open();

    expect(rows()).toHaveLength(10);
    expect(names()[0]).toBe("Montpellier, France");
    expect(text(".gedcom-list-count")).toBe("10 places");
    expect([1, 2].map((at) => cell(place("paris, france"), at))).toEqual(["11", "1855–1958"]);
    expect(all(".gedcom-list-headcell:not([hidden])").map((one) => one.textContent?.replace(/[↑↓]/u, ""))).toEqual(["Place", "Events", "Years"]);
  });

  it("keeps the order a column gives and cycles it in three presses", () => {
    open();

    click(button(".gedcom-list-sort", "Events"));
    expect(cell(rows()[0], 1)).toBe("1");
    click(button(".gedcom-list-sort", "Events"));
    expect(names()[0]).toBe("Warsaw, Congress Poland");
    click(button(".gedcom-list-sort", "Events"));
    expect(names()[0]).toBe("Montpellier, France");
    expect(host.changed).toHaveBeenLastCalledWith({ kind: "places" });
  });

  it("offers alphabetical in place of file order in the sort menu", () => {
    open();

    expect(query<HTMLSelectElement>(".gedcom-list-sort-select").options[0]?.textContent).toBe("Alphabetical");
  });

  it("narrows by place name in any case, without accents, and counts what is left", () => {
    open();

    type("PARIS");
    expect(names()).toEqual(["Paris, France"]);
    expect(text(".gedcom-list-count")).toBe("1 of 10 places");
    type("zzz");
    expect(text(".gedcom-list-none")).toBe("Nothing matches “zzz”. Search covers place names.");
    type("");
    expect(rows()).toHaveLength(10);
  });

  it("selects the place of a clicked row, as it does a record", () => {
    open();

    click(place("paris, france"));

    expect(place("paris, france")?.getAttribute("aria-selected")).toBe("true");
    expect(place("paris, france")?.classList.contains("is-selected")).toBe(true);
    expect(host.select).toHaveBeenCalledWith("place:paris, france");
  });

  it("selects the active row with Enter after moving with the arrows", () => {
    open();
    scroller().focus();
    press("ArrowDown");
    press("ArrowDown");
    press("Enter");

    expect(host.select).toHaveBeenCalledWith(`place:${rows()[2]?.dataset.key}`);
  });

  it("marks the selected place and keeps the sort of the saved state", () => {
    const made = open({ sort: { places: { by: "events", dir: "desc" } } });
    made.select("place:stockholm, sweden", true);

    expect(place("stockholm, sweden")?.getAttribute("aria-selected")).toBe("true");
    expect(names()[0]).toBe("Warsaw, Congress Poland");
  });

  it("switches from the people to the places to show a place selected elsewhere", () => {
    const made = board({}, events);
    made.select("place:paris, france", true);

    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["Places"]);
    expect(place("paris, france")?.getAttribute("aria-selected")).toBe("true");
  });

  it("unmarks the place when a record is selected elsewhere", () => {
    const made = open();
    made.select("place:paris, france", true);
    made.select("@I2@", true);

    expect(rows().some((one) => one.getAttribute("aria-selected") === "true")).toBe(false);
  });

  it("switches to the people for a person selected from the card, though the same person was selected before", () => {
    const made = open();
    made.select("@I2@", true);

    made.select("@I2@", true, true);

    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["People"]);
    expect(row("@I2@")?.getAttribute("aria-selected")).toBe("true");
  });

  it("stays on the places when a record is selected, and marks that record for the people", () => {
    const made = open();

    made.select("@I2@", true);

    expect(rows().every((one) => one.dataset.xref === undefined)).toBe(true);
    expect(host.changed).not.toHaveBeenCalled();
    click(button(".gedcom-list-seg-button", "People"));
    expect(row("@I2@")?.getAttribute("aria-selected")).toBe("true");
  });

  it("has no button but the kinds on the places", () => {
    open();

    expect(all(".gedcom-list-bar button").map((one) => one.textContent).filter((label) => label)).toEqual(["People", "Families", "Sources", "Places", "Events"]);
    expect(all(".gedcom-list-action")).toHaveLength(0);
  });

  it("spells out the events of a compact row", () => {
    box.width = 500;
    const made = open();
    made.resized();

    expect(cell(place("paris, france"), 1)).toBe("11 events");
  });

  it("says so when the file names no place", () => {
    board({ kind: "places" }, indexOf("0 HEAD\n0 TRLR"));

    expect(text(".gedcom-list-none")).toBe("The file names no places.");
  });
});

describe("the events", () => {
  const withEvents = indexOf(curieWithEvents());
  const open = (state = {}, source = index) => board({ kind: "events", ...state }, source);
  const id = (owner: string, tag: string): string => `event:${owner}:${tag}:0`;
  const eventRow = (owner: string, tag: string): HTMLElement | undefined => rows().find((one) => one.dataset.key === id(owner, tag));
  const marked = (): string[] => rows().filter((one) => one.getAttribute("aria-selected") === "true").map((one) => one.dataset.key ?? "");
  const column = (at: number): (string | undefined)[] => rows().map((one) => cell(one, at));

  it("is the fifth kind and lists every event of the file with the columns of the kind", () => {
    open();

    expect(text(".gedcom-list-count")).toBe("51 events");
    expect(all(".gedcom-list-headcell:not([hidden])").map((one) => one.textContent?.replace(/[↑↓]/u, ""))).toEqual(["Event", "Record", "Date", "Place"]);
  });

  it("reads Marie's birth with her record, its date and its place", () => {
    open();

    expect([0, 1, 2, 3].map((at) => cell(eventRow("@I1@", "BIRT"), at))).toEqual(["Birth", "Marie Skłodowska-Curie", "7 NOV 1867", "Warsaw, Congress Poland"]);
  });

  it("tells an occupation by its text and keeps the name of an event that has none", () => {
    open();

    expect(column(0)).toContain("Occupation · Physicist");
    expect(column(0)).toContain("Birth");
  });

  it("narrows by an event, a record, a date or a place, without marks, and counts what is left", () => {
    open();

    type("PHYSICIST");

    expect(column(0).every((one) => one?.toLowerCase().includes("physicist"))).toBe(true);
    expect(text(".gedcom-list-count")).toBe(`${rows().length} of 51 events`);
  });

  it("says so when nothing matches", () => {
    open();
    type("zzz");

    expect(text(".gedcom-list-none")).toBe("Nothing matches “zzz”. Search covers events, records, dates and places.");
  });

  it("says so when the file holds no events", () => {
    open({}, indexOf("0 HEAD\n0 TRLR"));

    expect(text(".gedcom-list-none")).toBe("The file holds no events.");
  });

  it("sorts by the first year of the date", () => {
    open();

    click(button(".gedcom-list-sort", "Date"));

    const years = column(2).map((one) => (one ? Number(/\d{4}/u.exec(one)?.[0]) : null));
    const dated = years.filter((one): one is number => one !== null && !Number.isNaN(one));
    expect(dated).toEqual([...dated].sort((a, b) => a - b));
  });

  it("returns to the order of the file on the third press", () => {
    open();
    const order = rows().map((one) => one.dataset.key);

    click(button(".gedcom-list-sort", "Record"));
    click(button(".gedcom-list-sort", "Record"));
    click(button(".gedcom-list-sort", "Record"));

    expect(rows().map((one) => one.dataset.key)).toEqual(order);
    expect(host.changed).toHaveBeenLastCalledWith({ kind: "events" });
  });

  it("selects the event of a clicked row under its id, and marks only that row", () => {
    open();

    click(eventRow("@I1@", "BIRT"));

    expect(host.select).toHaveBeenCalledWith(id("@I1@", "BIRT"));
    expect(marked()).toEqual([id("@I1@", "BIRT")]);
  });

  it("selects the focused row with Enter", () => {
    open();
    scroller().focus();
    press("ArrowDown");
    press("Enter");

    expect(host.select).toHaveBeenCalledWith(id("@I1@", "DEAT"));
    expect(marked()).toHaveLength(1);
  });

  it("marks the event selected elsewhere, and no row for a record", () => {
    const made = open();

    made.select(id("@I1@", "DEAT"), true);
    expect(marked()).toEqual([id("@I1@", "DEAT")]);

    made.select("@I1@", true);
    expect(marked()).toEqual([]);
  });

  it("stays on the events when a record or a source is selected elsewhere", () => {
    const made = open();

    made.select("@I2@", true);
    made.select("@S1@", true);

    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["Events"]);
    expect(marked()).toEqual([]);
  });

  it("switches to the places when a place is selected elsewhere, and back to the events for an event", () => {
    const made = open({}, withEvents);

    made.select("place:paris, france", true);
    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["Places"]);

    made.select(id("@I1@", "BIRT"), true);
    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["Events"]);
    expect(marked()).toEqual([id("@I1@", "BIRT")]);
  });

  it("switches from the people to the events for an event selected elsewhere", () => {
    const made = board({}, index);

    made.select(id("@I1@", "BIRT"), true);

    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["Events"]);
    expect(marked()).toEqual([id("@I1@", "BIRT")]);
  });

  describe("bringing an event into view", () => {
    const large = indexOf(generated(500));
    const position = (made: ListBoard, key: string): number => (made as unknown as { positions: Map<string, number> }).positions.get(key) as number;

    it("scrolls to an event selected from outside, and marks it", () => {
      const made = open({}, large);
      scroller().scrollTop = 0;

      made.select(id("@I400@", "BIRT"), true);

      expect(marked()).toEqual([id("@I400@", "BIRT")]);
      const top = position(made, id("@I400@", "BIRT")) * box.wide - scroller().scrollTop;
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(box.height);
    });

    it("clears a filter that hides the event", () => {
      const made = open({}, large);
      type("zzzzzz");
      expect(rows()).toHaveLength(0);

      made.select(id("@I400@", "BIRT"), true);

      expect(query<HTMLInputElement>(".gedcom-list-search").value).toBe("");
      expect(marked()).toEqual([id("@I400@", "BIRT")]);
    });

    it("leaves the scroll alone for a selection made from the list", () => {
      const made = open({}, large);
      scroller().scrollTop = 90;

      made.select(id("@I400@", "BIRT"), false);

      expect(scroller().scrollTop).toBe(90);
    });
  });

  it("switches to the people for a person selected from the card, and marks that person", () => {
    const made = open();

    made.select("@I2@", true, true);

    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["People"]);
    expect(row("@I2@")?.getAttribute("aria-selected")).toBe("true");
  });

  it("switches to the families for a family selected from the card", () => {
    const made = open();

    made.select("@F3@", true, true);

    expect(all(".gedcom-list-seg-button.is-active").map((one) => one.textContent)).toEqual(["Families"]);
    expect(row("@F3@")?.getAttribute("aria-selected")).toBe("true");
  });

  it("has no button but the kinds on the events", () => {
    open();

    expect(all(".gedcom-list-bar button").map((one) => one.textContent).filter((label) => label)).toEqual(["People", "Families", "Sources", "Places", "Events"]);
    expect(all(".gedcom-list-action")).toHaveLength(0);
  });

  it("reads the same rows in Russian", () => {
    setLanguage("ru");
    open();

    expect(text(".gedcom-list-count")).toBe("51 событие");
    expect(cell(eventRow("@I1@", "BIRT"), 0)).toBe("Рождение");
  });
});
