// @vitest-environment happy-dom
import type { Range } from "@domorium/language-service";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { generated } from "../../tests/generated";
import { resetLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { HOVER_DELAY } from "./dom";
import { FileViews, type FileViewsHost } from "./fileViews";

const SIZE = { width: 1000, height: 600 };
const LAYOUT_KEYS = ["clientWidth", "offsetWidth", "clientHeight", "offsetHeight", "getClientRects"] as const;

function boxed(element: HTMLElement): boolean {
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    if (node.style.display === "none") {
      return false;
    }
  }
  return element.isConnected;
}

let parent: HTMLElement;
let host: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  showInSource: ReturnType<typeof vi.fn<(range: Range) => void>>;
  portrait: ReturnType<typeof vi.fn<FileViewsHost["portrait"]>>;
  changed: ReturnType<typeof vi.fn<() => void>>;
  setIcon: ReturnType<typeof vi.fn<(element: HTMLElement, icon: string) => void>>;
  coarsePointer: ReturnType<typeof vi.fn<() => boolean>>;
};

beforeAll(() => {
  installObsidianDom();
  for (const key of LAYOUT_KEYS) {
    Object.defineProperty(
      HTMLElement.prototype,
      key,
      key === "getClientRects"
        ? {
            configurable: true,
            value(this: HTMLElement) {
              return boxed(this) ? [{}] : [];
            },
          }
        : {
            configurable: true,
            get(this: HTMLElement) {
              return boxed(this) ? (key.endsWith("Width") ? SIZE.width : SIZE.height) : 0;
            },
          },
    );
  }
});
afterAll(() => {
  for (const key of LAYOUT_KEYS) {
    delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
  }
});
afterEach(() => {
  resetLanguage();
  vi.useRealTimers();
});
beforeEach(() => {
  parent = document.createElement("div");
  document.body.replaceChildren(parent);
  host = {
    select: vi.fn(),
    showInSource: vi.fn(),
    portrait: vi.fn(() => null),
    changed: vi.fn(),
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
    coarsePointer: vi.fn(() => false),
  };
});

const index = curieIndex();
const views = (): FileViews => new FileViews(parent, host satisfies FileViewsHost);
const root = (kind: "graph" | "timeline") => parent.querySelector<HTMLElement>(`.gedcom-views-root.is-${kind}`);
const shown = (kind: "graph" | "timeline") => root(kind) !== null && root(kind)?.style.display !== "none";
const all = (selector: string) => [...parent.querySelectorAll(selector)];
const cards = () => all(".gedcom-fg-person").map((card) => card.getAttribute("data-p"));
const selectedMarks = () => all(".is-selected");
const card = (xref: string) => parent.querySelector<SVGElement>(`.gedcom-fg-person[data-p="${xref}"]`);
const click = (target: Element | null | undefined) =>
  target?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));

describe("the views of a tab", () => {
  it("puts nothing in the tab before the first show", () => {
    views();

    expect(parent.children).toHaveLength(0);
  });

  it("draws the graph in a root of its own, all 17 cards of the file", () => {
    views().show("graph", index, {});

    expect(shown("graph")).toBe(true);
    expect(root("timeline")).toBeNull();
    expect(cards()).toHaveLength(17);
  });

  it("leaves one root shown when the view changes, and each board's view and scope alone", () => {
    const tab = views();
    tab.show("graph", index, {});
    tab.show("timeline", index, {});
    expect(shown("graph")).toBe(false);
    expect(shown("timeline")).toBe(true);
    const graph = tab.memory().graph;

    tab.show("graph", index, tab.memory());

    expect(shown("graph")).toBe(true);
    expect(shown("timeline")).toBe(false);
    expect(tab.memory().graph).toEqual(graph);
    expect(all(".gedcom-ft-name")).toHaveLength(17);
  });

  it("lays the graph out once for one reading of the file", () => {
    const tab = views();
    tab.show("graph", index, {});
    const before = card("@I1@");

    tab.show("graph", index, tab.memory());

    expect(card("@I1@")).toBe(before);
  });

  it("takes a saved view at the first show of the graph and not at the second", () => {
    const tab = views();
    tab.show("graph", index, { graph: { up: 2, down: 2, view: { x: 500, y: 200, k: 0.8 } } });
    expect(tab.memory().graph?.view).toEqual({ x: 500, y: 200, k: 0.8 });

    tab.show("graph", index, { graph: { up: 2, down: 2, view: { x: 10, y: 10, k: 1.5 } } });

    expect(tab.memory().graph?.view).toEqual({ x: 500, y: 200, k: 0.8 });
  });

  it("opens a file of 2 000 people on the branch of the person the tab is on", () => {
    const tab = views();
    tab.show("graph", indexOf(generated(2000)), {}, "@I6@");

    expect(tab.memory().graph?.focus).toBe("@I6@");
    expect(all(".gedcom-fg-scope")[0]?.textContent).toContain("Branch of Person 6");
  });

  it("keeps a scope chosen on the whole of a large file across a hide and a show", () => {
    const large = indexOf(generated(2000));
    const tab = views();
    tab.show("graph", large, { graph: { up: 3, down: 1 } }, "@I6@");
    expect(tab.memory().graph).toMatchObject({ up: 3, down: 1 });
    expect(tab.memory().graph?.focus).toBeUndefined();

    tab.hide();
    tab.show("graph", large, tab.memory(), "@I6@");

    expect(tab.memory().graph?.focus).toBeUndefined();
    expect(tab.memory().graph).toMatchObject({ up: 3, down: 1 });
  });

  it("holds a memory for a view only once it was shown", () => {
    const tab = views();
    tab.show("graph", index, {});

    expect(tab.memory().graph).toBeDefined();
    expect(tab.memory().timeline).toBeUndefined();
  });

  it("keeps the memory of the graph and of the timeline apart", () => {
    const tab = views();
    tab.show("graph", index, {});
    tab.show("timeline", index, {});
    const memory = tab.memory();

    expect(memory.graph).not.toHaveProperty("zoom");
    expect(memory.timeline).toHaveProperty("zoom");
    expect(memory.graph?.view).toBeDefined();
  });

  it("does not move a view for a canvas that reads no size, as a hidden tab does", () => {
    const tab = views();
    tab.show("graph", index, {});
    const before = tab.memory().graph?.view;

    parent.toggle(false);
    tab.resized();
    parent.toggle(true);

    expect(tab.memory().graph?.view).toEqual(before);
  });

  it("does nothing on a resize before any board exists", () => {
    const tab = views();

    expect(() => tab.resized()).not.toThrow();
    expect(parent.children).toHaveLength(0);
  });

  it("draws the first board of a tab restored behind another once the tab has a box", () => {
    const tab = views();
    parent.toggle(false);
    tab.resized();
    expect(all(".gedcom-fg-person")).toHaveLength(0);

    parent.toggle(true);
    tab.show("graph", index, {});
    tab.resized();

    expect(cards()).toHaveLength(17);
  });

  it("records the scroll of the timeline when it is hidden, and puts it back when it is shown", () => {
    const tab = views();
    tab.show("timeline", index, {});
    const plot = parent.querySelector<HTMLElement>(".gedcom-ft-plot");
    if (!plot) {
      throw new Error("no plot");
    }
    plot.scrollTop = 120;
    plot.scrollLeft = 45;

    tab.hide();
    plot.scrollTop = 0;
    plot.scrollLeft = 0;
    expect(tab.memory().timeline?.scroll).toEqual({ top: 120, left: 45 });

    tab.show("timeline", index, tab.memory());
    expect(plot.scrollTop).toBe(120);
    expect(plot.scrollLeft).toBe(45);
  });

  it("records the scroll when the tab's content is hidden before the views are", () => {
    const tab = views();
    tab.show("timeline", index, {});
    const plot = parent.querySelector<HTMLElement>(".gedcom-ft-plot");
    if (!plot) {
      throw new Error("no plot");
    }
    plot.scrollTop = 500;

    parent.toggle(false);
    tab.hide();
    parent.toggle(true);

    expect(tab.memory().timeline?.scroll?.top).toBe(500);
  });

  it("keeps the last scroll it saw in sight for a tab that goes behind another with no hide", () => {
    const tab = views();
    tab.show("timeline", index, { timeline: { up: 2, down: 2, zoom: 6, scroll: { top: 100, left: 0 } } });
    const plot = parent.querySelector<HTMLElement>(".gedcom-ft-plot");
    if (!plot) {
      throw new Error("no plot");
    }
    plot.scrollTop = 500;
    expect(tab.memory().timeline?.scroll?.top).toBe(500);

    parent.toggle(false);
    plot.scrollTop = 0;

    expect(tab.memory().timeline?.scroll?.top).toBe(500);
  });

  it("takes the scroll a restored tab saved, at its first show of the timeline", () => {
    const tab = views();
    tab.show("timeline", index, { timeline: { up: 2, down: 2, zoom: 6, scroll: { top: 80, left: 30 } } });

    expect(parent.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollTop).toBe(80);
  });

  it("forgets the boards and the memory on reset, and opens the next file by the first-opening rule", () => {
    const tab = views();
    tab.show("graph", index, { graph: { up: 1, down: 1, view: { x: 1, y: 1, k: 1 } } });
    tab.reset();

    expect(parent.children).toHaveLength(0);
    expect(tab.memory()).toEqual({});

    tab.show("graph", indexOf(generated(2000)), {}, "@I6@");
    expect(tab.memory().graph).toMatchObject({ focus: "@I6@", up: 2, down: 2 });
  });
});

describe("hovering while the views come and go", () => {
  function restOn(xref: string): void {
    card(xref)?.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, pointerId: 1, pointerType: "mouse" }),
    );
  }

  it("cancels the hover of a hidden view, so a timer cannot light a card out of sight", () => {
    vi.useFakeTimers();
    const tab = views();
    tab.show("graph", index, {});
    restOn("@I1@");
    tab.hide();
    vi.advanceTimersByTime(HOVER_DELAY + 50);

    expect(all(".gedcom-fg-person.is-hl")).toHaveLength(0);
  });

  it("cancels the hover on dispose", () => {
    vi.useFakeTimers();
    const tab = views();
    tab.show("graph", index, {});
    const held = root("graph");
    restOn("@I1@");
    tab.dispose();
    vi.advanceTimersByTime(HOVER_DELAY + 50);

    expect(held?.querySelectorAll(".gedcom-fg-person.is-hl")).toHaveLength(0);
    expect(parent.children).toHaveLength(0);
  });
});

describe("the timeline's light while the views come and go", () => {
  it("is put out when the timeline is hidden", () => {
    const tab = views();
    tab.show("timeline", index, {});
    root("timeline")
      ?.querySelector('.gedcom-ft-name[data-p="@I1@"]')
      ?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
    expect(root("timeline")?.querySelectorAll(".is-hl").length).toBeGreaterThan(0);
    tab.hide();

    expect(root("timeline")?.querySelectorAll(".is-hl")).toHaveLength(0);
  });
});

describe("selecting in a view", () => {
  it("is on the card when the graph is first drawn, for a selection made before any show", () => {
    const tab = views();
    tab.select("graph", "@I2@", true);
    expect(parent.children).toHaveLength(0);

    tab.show("graph", index, {});

    expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p"))).toEqual(["@I2@"]);
  });

  it("is there when the views are shown again, for a selection made while they were hidden", () => {
    const tab = views();
    tab.show("graph", index, {});
    tab.hide();
    tab.select("graph", "@I12@", true);
    expect(selectedMarks()).toHaveLength(0);

    tab.show("graph", index, tab.memory());

    expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p"))).toEqual(["@I12@"]);
  });

  it("marks that card and not another, at once where the view is in sight", () => {
    const tab = views();
    tab.show("graph", index, {});
    tab.select("graph", "@I2@", true);
    tab.select("graph", "@I12@", true);

    expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p"))).toEqual(["@I12@"]);
  });

  it("leaves no mark anywhere once both views are told nobody is selected, whichever were drawn", () => {
    const tab = views();
    tab.show("graph", index, {});
    tab.select("graph", "@I2@", true);
    tab.show("timeline", index, {});
    tab.select("timeline", "@I12@", true);
    tab.show("graph", index, tab.memory());
    expect(selectedMarks().length).toBeGreaterThan(0);

    tab.select("graph", null, true);
    tab.select("timeline", null, true);

    expect(selectedMarks()).toHaveLength(0);
  });

  describe("moving to the selection", () => {
    function viewAfter(run: (tab: FileViews) => void): unknown {
      parent = document.createElement("div");
      document.body.replaceChildren(parent);
      const tab = views();
      tab.show("graph", index, {});
      tab.hide();
      run(tab);
      tab.show("graph", index, tab.memory());
      return tab.memory().graph?.view;
    }

    it("centres on a person selected with a reveal while the views were hidden", () => {
      const resting = viewAfter(() => undefined);

      expect(viewAfter((tab) => tab.select("graph", "@I2@", true))).not.toEqual(resting);
    });

    it("keeps the reveal through a later hand-over of the same person without one", () => {
      const revealed = viewAfter((tab) => tab.select("graph", "@I2@", true));

      expect(
        viewAfter((tab) => {
          tab.select("graph", "@I2@", true);
          tab.select("graph", "@I2@", false);
        }),
      ).toEqual(revealed);
    });

    it("does not centre on a person only ever selected without a reveal, and marks the card", () => {
      const resting = viewAfter(() => undefined);

      expect(viewAfter((tab) => tab.select("graph", "@I2@", false))).toEqual(resting);
      expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p"))).toEqual(["@I2@"]);
    });

    it("takes the saved view at the first show for a selection without a reveal, and marks the card", () => {
      const tab = views();
      tab.select("graph", "@I2@", false);

      tab.show("graph", index, { graph: { up: 2, down: 2, view: { x: 500, y: 200, k: 0.8 } } });

      expect(tab.memory().graph?.view).toEqual({ x: 500, y: 200, k: 0.8 });
      expect(all(".gedcom-fg-person.is-selected").map((one) => one.getAttribute("data-p"))).toEqual(["@I2@"]);
    });
  });

  it("is on the timeline's row too", () => {
    const tab = views();
    tab.select("timeline", "@I2@", true);
    tab.show("timeline", index, {});

    expect(all(".gedcom-ft-name.is-selected").map((one) => one.getAttribute("data-p"))).toEqual(["@I2@"]);
  });
});

describe("finding in a view", () => {
  it("expands the search and focuses it, and again only focuses it", () => {
    const tab = views();
    tab.show("graph", index, {});
    tab.openSearch("graph");
    const field = parent.querySelector<HTMLInputElement>(".gedcom-fg-search");
    expect(parent.querySelector(".gedcom-fg-find")?.classList.contains("is-open")).toBe(true);
    expect(document.activeElement).toBe(field);

    if (field) {
      field.value = "joliot";
      field.dispatchEvent(new Event("input"));
    }
    field?.blur();
    tab.openSearch("graph");

    expect(field?.value).toBe("joliot");
    expect(document.activeElement).toBe(field);
  });
});

describe("what a click in a view asks of the tab", () => {
  it("selects the record of a card and of a family node", () => {
    const tab = views();
    tab.show("graph", index, {});
    click(parent.querySelector('[data-card="@I12@"]'));
    const family = parent.querySelector<SVGElement>("[data-node]");
    click(family);

    expect(host.select).toHaveBeenNthCalledWith(1, "@I12@");
    expect(host.select).toHaveBeenNthCalledWith(2, family?.getAttribute("data-node"));
  });

  it("shows the lines of a mark in the source", () => {
    const tab = views();
    tab.show("timeline", index, {});
    click(parent.querySelector('.gedcom-ft-mark.is-birth[data-p="@I1@"]'));

    const range = host.showInSource.mock.lastCall?.[0];
    expect([range?.start.line, range?.end.line]).toEqual([21, 23]);
  });

  it("selects the person of a timeline row", () => {
    const tab = views();
    tab.show("timeline", index, {});
    click(parent.querySelector('.gedcom-ft-name[data-p="@I12@"] .gedcom-ft-name-open'));

    expect(host.select).toHaveBeenCalledWith("@I12@");
  });

  it("asks for the layout to be saved as a view reports a change", () => {
    const tab = views();
    tab.show("graph", index, {});

    expect(host.changed).toHaveBeenCalled();
  });
});

describe("the list of a tab", () => {
  const large = indexOf(generated(500));
  const listRoot = () => parent.querySelector<HTMLElement>(".gedcom-views-root.is-list");
  const rows = () => all(".gedcom-list-row");
  const row = (xref: string) => parent.querySelector<HTMLElement>(`.gedcom-list-row[data-xref="${xref}"]`);
  const scroller = () => parent.querySelector<HTMLElement>(".gedcom-list-scroll") as HTMLElement;
  const type = (value: string) => {
    const field = parent.querySelector<HTMLInputElement>(".gedcom-list-filter") as HTMLInputElement;
    field.value = value;
    field.dispatchEvent(new Event("input"));
  };
  const inMiddle = (xref: string) => {
    const at = Number(row(xref)?.dataset.pos);
    const top = at * 36 - scroller().scrollTop;
    return top >= SIZE.height / 4 && top <= (3 * SIZE.height) / 4;
  };

  it("is made on its first show, in a root of its own, and only one root is shown", () => {
    const tab = views();
    expect(listRoot()).toBeNull();

    tab.show("list", index, {});

    expect(listRoot()?.style.display).not.toBe("none");
    expect(rows()).toHaveLength(17);
    tab.show("graph", index, {});
    expect(listRoot()?.style.display).toBe("none");
    expect(shown("graph")).toBe(true);
  });

  it("keeps the kind, the sort, the filter and the scroll across a switch to the graph and back", () => {
    const tab = views();
    tab.show("list", large, {});
    type("person 4");
    parent.querySelectorAll<HTMLElement>(".gedcom-list-sort")[0]?.click();
    scroller().scrollTop = 72;
    const saved = tab.memory();

    tab.show("graph", large, tab.memory());
    tab.show("list", large, tab.memory());

    expect(parent.querySelector<HTMLInputElement>(".gedcom-list-filter")?.value).toBe("person 4");
    expect(tab.memory().list).toEqual(saved.list);
    expect(saved.list?.sort?.people?.by).toBe("name");
    expect(scroller().scrollTop).toBe(72);
  });

  it("applies a selection made while the list was hidden, with its reveal, on the next show", () => {
    const tab = views();
    tab.show("list", large, {});
    tab.show("graph", large, {});
    tab.select("list", "@I400@", true);
    expect(row("@I400@")).toBeNull();

    tab.show("list", large, tab.memory());

    expect(row("@I400@")?.classList.contains("is-selected")).toBe(true);
    expect(inMiddle("@I400@")).toBe(true);
  });

  it("centres a selection restored before the first show", () => {
    const tab = views();
    tab.select("list", "@I400@", false);

    tab.show("list", large, {});

    expect(row("@I400@")?.classList.contains("is-selected")).toBe(true);
    expect(inMiddle("@I400@")).toBe(true);
  });

  it("keeps a reveal through a later hand-over of the same record without one", () => {
    const tab = views();
    tab.select("list", "@I400@", true);
    tab.select("list", "@I400@", false);

    tab.show("list", large, {});

    expect(inMiddle("@I400@")).toBe(true);
  });

  it("parks a drawn list for the timeline and back without a call a list lacks", () => {
    const tab = views();
    tab.show("list", index, {});

    expect(() => {
      tab.show("timeline", index, {});
      tab.hide();
      tab.show("list", index, tab.memory());
    }).not.toThrow();
    expect(rows()).toHaveLength(17);
  });

  it("focuses the filter for the search of the list", () => {
    const tab = views();
    tab.show("list", index, {});

    tab.openSearch("list");

    expect(document.activeElement).toBe(parent.querySelector(".gedcom-list-filter"));
  });

  it("forgets the list on reset, and holds a memory of it only once shown", () => {
    const tab = views();
    expect(tab.memory().list).toBeUndefined();
    tab.show("list", index, {});
    expect(tab.memory().list).toEqual({});

    tab.reset();

    expect(listRoot()).toBeNull();
    expect(tab.memory().list).toBeUndefined();
  });

  it("restores the state it reported to a board of a new tab", () => {
    const tab = views();
    tab.show("list", index, {});
    (parent.querySelectorAll(".gedcom-list-seg-button")[1] as HTMLElement).click();
    const saved = tab.memory();
    expect(saved.list).toEqual({ kind: "families" });

    parent.replaceChildren();
    const next = views();
    next.show("list", index, saved);

    expect(rows()).toHaveLength(5);
    expect(host.changed).toHaveBeenCalled();
  });

  it("selects a family and a source through the host", () => {
    const tab = views();
    tab.show("list", index, { list: { kind: "families" } });
    row("@F3@")?.click();
    tab.show("list", index, { list: { kind: "sources" } });
    row("@S2@")?.click();

    expect(host.select).toHaveBeenNthCalledWith(1, "@F3@");
    expect(host.select).toHaveBeenNthCalledWith(2, "@S2@");
  });
});

