// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { renderRecordCard, type CardTab, type CardView } from "./recordCard";

let container: HTMLElement;
let state: { record: string | null; fact: string | null; canBack: boolean; canForward: boolean };
let tab: CardTab;
let calls: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  selectFact: ReturnType<typeof vi.fn<(key: string | null) => void>>;
  back: ReturnType<typeof vi.fn<() => void>>;
  forward: ReturnType<typeof vi.fn<() => void>>;
};
let view: { setIcon: ReturnType<typeof vi.fn<CardView["setIcon"]>>; openNote: ReturnType<typeof vi.fn<CardView["openNote"]>> };
let index: GenealogyIndex;
const scrollIntoView = vi.fn();

beforeAll(() => {
  installObsidianDom();
  Element.prototype.scrollIntoView = scrollIntoView;
});
afterEach(resetLanguage);
beforeEach(() => {
  scrollIntoView.mockClear();
  container = document.createElement("div");
  document.body.replaceChildren(container);
  index = curieIndex();
  state = { record: "@I1@", fact: null, canBack: false, canForward: false };
  calls = { select: vi.fn(), selectFact: vi.fn(), back: vi.fn(), forward: vi.fn() };
  tab = {
    filePath: () => "curie.ged",
    index: () => index,
    selection: () => ({ record: state.record, fact: state.fact }),
    mediaItems: () => [],
    mediaItem: () => null,
    portrait: () => null,
    select: (xref) => {
      calls.select(xref);
    },
    selectFact: (key) => {
      calls.selectFact(key);
    },
    showInSource: vi.fn(),
    openFile: vi.fn(),
    history: () => ({ canBack: state.canBack, canForward: state.canForward }),
    back: () => {
      calls.back();
    },
    forward: () => {
      calls.forward();
    },
  };
  view = {
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
    openNote: vi.fn(),
  };
});

const draw = (notes: Parameters<typeof renderRecordCard>[2] = []): void => {
  renderRecordCard(container, tab, notes, view);
};
const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");
const body = () => container.querySelector<HTMLElement>(".gedcom-card-body");
const nav = (label: string) => container.querySelector<HTMLButtonElement>(`.gedcom-card-nav[aria-label="${label}"]`);

describe("the empty states of the card", () => {
  it("says no GEDCOM file is open without a tab", () => {
    renderRecordCard(container, null, null, view);

    expect(texts(".gedcom-card-state")).toEqual(["Open a GEDCOM file to see its records."]);
    expect(container.querySelector(".gedcom-card-head")).toBeNull();
  });

  it("says to select a record where the tab has none selected, or a selected one the file lacks", () => {
    state.record = null;
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline, the list or the map."]);

    state.record = "@I99@";
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline, the list or the map."]);
  });

  it("says the file holds nothing to show where it declares no person, family or source", () => {
    index = indexOf("0 HEAD\n0 TRLR\n");
    state.record = null;
    draw();

    expect(texts(".gedcom-card-state")).toEqual(["The file holds nothing to show."]);
  });

  it("speaks Russian", () => {
    setLanguage("ru");
    renderRecordCard(container, null, null, view);
    expect(texts(".gedcom-card-state")).toEqual(["Откройте файл GEDCOM, чтобы увидеть его записи."]);

    state.record = null;
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["Выберите запись на графе, в хронологии, в списке или на карте."]);
    index = indexOf("0 HEAD\n0 TRLR\n");
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["В файле нечего показывать."]);
  });
});

describe("the page of each kind of record, with its evidence", () => {
  it("shows Marie's sections in order, ending with Evidence", () => {
    draw();

    expect(texts(".gedcom-card-body h2")).toEqual(["Facts", "Other names", "Family", "Timeline", "Places", "Evidence"]);
    expect(texts(".gedcom-desk-title")).toEqual(["Marie Skłodowska-Curie"]);
  });

  it("names the record in the header, hidden from assistive technology, beside the page's own heading", () => {
    draw();

    expect(texts(".gedcom-card-head-name")).toEqual(["Marie Skłodowska-Curie"]);
    expect(container.querySelector(".gedcom-card-head-name")?.getAttribute("aria-hidden")).toBe("true");
    expect(texts("h1")).toEqual(["Marie Skłodowska-Curie"]);
  });

  it("shows the Curies' family with its evidence", () => {
    state.record = "@F3@";
    draw();

    expect(texts(".gedcom-desk-title")).toEqual(["Pierre Curie and Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-card-body h2").at(-1)).toBe("Evidence");
  });

  it("shows a source with the notes section last", () => {
    state.record = "@S3@";
    draw([]);

    expect(texts(".gedcom-desk-title")).toEqual(["The Nobel Prize in Chemistry 1911 and 1935"]);
    expect(texts(".gedcom-card-body h2").at(-1)).toBe("Notes in the vault · 0");
    expect(container.querySelector(".gedcom-card-evidence")).toBeNull();
  });

  it("shows a multimedia record with the notes section last", () => {
    state.record = "@O5@";
    draw([]);

    expect(texts(".gedcom-desk-title")).toEqual(["The Curie family, about 1908"]);
    expect(texts(".gedcom-card-body h2").at(-1)).toBe("Notes in the vault · 0");
  });

  it("lists the notes of the vault in Marie's evidence", () => {
    draw([{ path: "Notes/Radium.md", name: "Radium", lines: [{ line: 1, before: "by ", link: "Marie", after: "" }] }]);
    container.querySelector<HTMLElement>(".gedcom-desk-note-line")?.click();

    expect(texts(".gedcom-desk-note-name")).toEqual(["Radium"]);
    expect(view.openNote).toHaveBeenCalledWith("Notes/Radium.md", 1);
  });

  it("selects a relative through the tab", () => {
    draw();
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-person")]
      .find((node) => node.textContent?.startsWith("Pierre Curie"))
      ?.click();

    expect(calls.select).toHaveBeenCalledWith("@I2@");
  });
});

describe("Back and Forward", () => {
  it("are disabled where there is nowhere to go, and enabled by the tab's history", () => {
    draw();
    expect(nav("Back")?.disabled).toBe(true);
    expect(nav("Forward")?.disabled).toBe(true);

    state.canBack = true;
    state.canForward = true;
    draw();
    expect(nav("Back")?.disabled).toBe(false);
    expect(nav("Forward")?.disabled).toBe(false);
    expect(nav("Back")?.getAttribute("data-icon")).toBe("chevron-left");
  });

  it("step through the tab", () => {
    state.canBack = true;
    state.canForward = true;
    draw();
    nav("Back")?.click();
    nav("Forward")?.click();

    expect(calls.back).toHaveBeenCalledTimes(1);
    expect(calls.forward).toHaveBeenCalledTimes(1);
  });

  it("are named in Russian", () => {
    setLanguage("ru");
    draw();

    expect(nav("Назад")).not.toBeNull();
    expect(nav("Вперёд")).not.toBeNull();
  });
});

describe("redrawing the card", () => {
  it("keeps the scroll for the same record and goes to the top for another", () => {
    draw();
    const first = body();
    if (first) {
      first.scrollTop = 240;
    }
    draw();
    expect(body()?.scrollTop).toBe(240);

    state.record = "@I2@";
    draw();
    expect(body()?.scrollTop).toBe(0);
  });

  it("keeps the focus on the selected fact's row where the focus was in the card", () => {
    state.fact = "p:1";
    draw();
    container.querySelector<HTMLElement>('[data-focus-key="p:1"]')?.focus();

    state.fact = "p:2";
    draw();
    container.querySelector<HTMLElement>('[data-focus-key="p:2"]')?.focus();
    draw();

    expect(document.activeElement).toBe(container.querySelector('[data-focus-key="p:2"]'));
  });

  it("does not take the focus from outside the card", () => {
    const outside = document.body.createEl("input");
    draw();
    outside.focus();
    draw();

    expect(document.activeElement).toBe(outside);
  });
});

describe("All evidence and selecting a fact", () => {
  it("scrolls the Evidence heading into view, and selecting a fact does not", () => {
    state.fact = "p:0";
    draw();
    container.querySelector<HTMLElement>(".gedcom-desk-fact")?.click();
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(calls.selectFact).toHaveBeenCalled();

    container.querySelector<HTMLElement>(".gedcom-desk-unfold .gedcom-desk-link")?.click();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});

describe("the live region", () => {
  const live = () => container.querySelector(".gedcom-card-live")?.textContent;

  it("reads the record's name when it changes, and not when it stays", () => {
    draw();
    expect(live()).toBe("Shown: Marie Skłodowska-Curie");
    const region = container.querySelector(".gedcom-card-live");

    state.record = "@I2@";
    draw();
    expect(live()).toBe("Shown: Pierre Curie");
    expect(container.querySelector(".gedcom-card-live")).toBe(region);
  });

  it("speaks Russian", () => {
    setLanguage("ru");
    draw();

    expect(live()).toBe("Показано: Marie Skłodowska-Curie");
  });
});
