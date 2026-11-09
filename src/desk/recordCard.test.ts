// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { TreeSession } from "./detail/treeSession";
import { renderRecordCard, type CardTab, type CardView } from "./recordCard";

let container: HTMLElement;
let state: { record: string | null; fact: string | null; canBack: boolean; canForward: boolean; arrival: "history" | "other" };
let tab: CardTab;
let calls: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
  selectFact: ReturnType<typeof vi.fn<(key: string | null) => void>>;
  back: ReturnType<typeof vi.fn<() => void>>;
  forward: ReturnType<typeof vi.fn<() => void>>;
};
let view: {
  setIcon: ReturnType<typeof vi.fn<CardView["setIcon"]>>;
  openNote: ReturnType<typeof vi.fn<CardView["openNote"]>>;
  session: TreeSession;
  redraw: () => void;
};
const redraw = vi.fn<() => void>();
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
  state = { record: "@I1@", fact: null, canBack: false, canForward: false, arrival: "other" };
  calls = { select: vi.fn(), selectFact: vi.fn(), back: vi.fn(), forward: vi.fn() };
  tab = {
    filePath: () => "curie.ged",
    index: () => index,
    selection: () => ({ record: state.record, fact: state.fact }),
    mediaItems: (media) => media.map(({ at }) => ({ content: { kind: "missing", target: "" }, at })),
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
    arrivedBy: () => state.arrival,
  };
  view = {
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
    openNote: vi.fn(),
    session: new TreeSession(),
    redraw,
  };
  redraw.mockReset();
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
    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline or the list."]);

    state.record = "@I99@";
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline or the list."]);
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
    expect(texts(".gedcom-card-state")).toEqual(["Выберите запись на графе, в хронологии или в списке."]);
    index = indexOf("0 HEAD\n0 TRLR\n");
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["В файле нечего показывать."]);
  });
});

describe("the page of each kind of record, with its evidence", () => {
  it("shows Marie's sections in order, ending with Evidence", () => {
    draw();

    expect(texts(".gedcom-card-body h2")).toEqual(["Family", "Media", "Timeline", "Evidence"]);
    expect(container.querySelector(".gedcom-card-body .gedcom-tree")).not.toBeNull();
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

    expect(texts(".gedcom-desk-title")).toEqual(["Pierre Curie ⚭ Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-card-body h2").at(-1)).toBe("Evidence");
  });

  it("shows a source with the notes section last", () => {
    state.record = "@S3@";
    draw([]);

    expect(texts(".gedcom-desk-title")).toEqual(["The Nobel Prize in Chemistry 1911 and 1935"]);
    expect(texts(".gedcom-card-body h2").at(-1)).toBe("Notes in the vault");
    expect(container.querySelector(".gedcom-card-evidence")).toBeNull();
  });

  it("shows a multimedia record with the notes section last", () => {
    state.record = "@O5@";
    draw([]);

    expect(texts(".gedcom-desk-title")).toEqual(["The Curie family, about 1908"]);
    expect(texts(".gedcom-card-body h2").at(-1)).toBe("Notes in the vault");
  });

  it("lists the notes of the vault in Marie's evidence", () => {
    draw([{ path: "Notes/Radium.md", name: "Radium", lines: [{ line: 1, before: "by ", link: "Marie", after: "" }] }]);
    container.querySelector<HTMLElement>(".gedcom-desk-note-line")?.click();

    expect(texts(".gedcom-desk-note-name")).toEqual(["Radium"]);
    expect(view.openNote).toHaveBeenCalledWith("Notes/Radium.md", 1);
  });

  it("lists no note and none of the record's sources on the card of an event", () => {
    state.record = "event:@I1@:BIRT:0";
    draw([{ path: "Notes/Radium.md", name: "Radium", lines: [{ line: 1, before: "by ", link: "Marie", after: "" }] }]);

    expect(container.querySelector(".gedcom-desk-note")).toBeNull();
    expect(container.querySelector(".gedcom-desk-cite")).toBeNull();
    expect(texts(".gedcom-card-body h2")).toEqual(["Evidence"]);
  });

  it("opens the card of an event from a place's card", () => {
    state.record = "place:paris, france";
    draw();
    container.querySelector<HTMLElement>(".gedcom-desk-place-occurrences .gedcom-desk-fact-name")?.click();

    expect(calls.select.mock.calls[0]?.[0]).toMatch(/^event:/u);
  });

  it("shows a place with its events, and opens the record of an event through the tab", () => {
    state.record = "place:paris, france";
    draw();
    container.querySelector<HTMLElement>(".gedcom-desk-place-occurrences .gedcom-desk-fact-value .gedcom-desk-link")?.click();

    expect(texts(".gedcom-desk-title")).toEqual(["Paris, France"]);
    expect(texts(".gedcom-card-head-name")).toEqual(["Paris, France"]);
    expect(container.querySelector(".gedcom-card-evidence")).toBeNull();
    expect(calls.select).toHaveBeenCalledTimes(1);
  });

  it("shows an event with its record, date and place as links, and its evidence below", () => {
    state.record = "event:@I1@:BIRT:0";
    draw();
    container.querySelector<HTMLElement>(".gedcom-desk-event-owner .gedcom-desk-link")?.click();
    container.querySelector<HTMLElement>(".gedcom-desk-subtitle .gedcom-desk-link")?.click();

    expect(texts(".gedcom-desk-event-kind")).toEqual(["Person"]);
    expect(texts(".gedcom-desk-event-owner .gedcom-desk-link")).toEqual(["Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-title")).toEqual(["Birth"]);
    expect(texts(".gedcom-card-head-name")).toEqual(["Birth · Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["7 NOV 1867 · Warsaw, Congress Poland"]);
    expect(container.querySelector(".gedcom-desk-event-details")).toBeNull();
    expect(container.querySelector(".gedcom-desk-evidence-head")).toBeNull();
    expect(calls.select.mock.calls).toEqual([["@I1@"], ["place:warsaw, congress poland"]]);
  });

  it("opens the lines of an event through the tab", () => {
    const show = vi.fn<(range: unknown) => void>();
    tab.showInSource = (range) => {
      show(range);
    };
    state.record = "event:@I1@:BIRT:0";
    draw();
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-heading .gedcom-desk-link")].find((node) => node.textContent === "Show in source")?.click();

    expect(show).toHaveBeenCalledWith(index.person("@I1@")?.events[0]?.range);
  });

  it("says an event with no date, place or source states none", () => {
    index = indexOf("0 HEAD\n0 @I1@ INDI\n1 NAME A /B/\n1 OCCU Cooper\n0 TRLR");
    state.record = "event:@I1@:OCCU:0";
    draw();

    expect(texts(".gedcom-desk-title")).toEqual(["Occupation · Cooper"]);
    expect(texts(".gedcom-desk-none")).toContain("This event states no date, place or source.");
  });

  it("links a cited source record, and shows an inline citation as text", () => {
    index = indexOf(
      ["0 HEAD", "0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 SOUR @S1@", "2 SOUR An inline note", "0 @S1@ SOUR", "1 TITL Parish registers", "0 TRLR"].join("\n"),
    );
    state.record = "event:@I1@:BIRT:0";
    draw();
    container.querySelector<HTMLElement>("button.gedcom-desk-cite")?.click();

    expect(texts(".gedcom-desk-cite-title")).toEqual(["Parish registers"]);
    expect(texts(".gedcom-desk-cite-inline")).toEqual(["An inline note"]);
    expect(calls.select).toHaveBeenCalledWith("@S1@");
  });

  it("marks a citation of a source the file does not declare as missing", () => {
    index = indexOf(["0 HEAD", "0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 SOUR @S9@", "0 TRLR"].join("\n"));
    state.record = "event:@I1@:BIRT:0";
    draw();

    expect(container.querySelectorAll(".gedcom-desk-missing")).toHaveLength(1);
  });

  it("names a family as the owner of a family event", () => {
    state.record = "event:@F3@:MARR:0";
    draw();

    expect(texts(".gedcom-desk-event-kind")).toEqual(["Family"]);
  });

  it("draws no date and place line for an event that states neither", () => {
    index = indexOf("0 HEAD\n0 @I1@ INDI\n1 NAME A /B/\n1 OCCU Cooper\n0 TRLR");
    state.record = "event:@I1@:OCCU:0";
    draw();

    expect(container.querySelector(".gedcom-desk-subtitle")).toBeNull();
  });

  it("speaks Russian on an event's card", () => {
    setLanguage("ru");
    state.record = "event:@I1@:BIRT:0";
    draw();

    expect(texts(".gedcom-desk-title")).toEqual(["Рождение"]);
    expect(texts(".gedcom-desk-event-kind")).toEqual(["Человек"]);
  });

  it("selects a relative through the tab", () => {
    draw();
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-person")]
      .find((node) => node.textContent?.startsWith("Pierre Curie"))
      ?.click();

    expect(calls.select).toHaveBeenCalledWith("@I2@");
  });
});

describe("the folds of a person card", () => {
  const timelineOpen = (): string | null | undefined =>
    container.querySelector(".gedcom-desk-fold-button")?.getAttribute("aria-expanded");

  it("stay open while the card shows the same record, and close for another", () => {
    draw();
    container.querySelector<HTMLElement>(".gedcom-desk-fold-button")?.click();
    draw();
    expect(timelineOpen()).toBe("true");

    state.record = "@I2@";
    draw();
    state.record = "@I1@";
    draw();
    expect(timelineOpen()).toBe("false");
  });

  it("keep the focus on the heading that was pressed", () => {
    draw();
    const button = container.querySelector<HTMLElement>(".gedcom-desk-fold-button");
    button?.focus();
    button?.click();
    draw();

    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("fold:timeline");
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

  it("keeps the focus on the same control of the tree where the focus was in the card", () => {
    draw();
    container.querySelector<HTMLElement>('[data-focus-key="t:BIRT[0]"]')?.focus();
    draw();

    expect(document.activeElement).toBe(container.querySelector('[data-focus-key="t:BIRT[0]"]'));
  });

  it("puts the focus on the body, not on a control of the same key, when another record is shown", () => {
    draw();
    container.querySelector<HTMLElement>('[data-focus-key="t:NAME[0]"]')?.focus();
    state.record = "@I2@";
    draw();

    expect(container.querySelector('[data-focus-key="t:NAME[0]"]')).not.toBeNull();
    expect(document.activeElement).toBe(body());
  });

  it("keeps the focus on a control of the card itself when another record is shown", () => {
    state.canBack = true;
    draw();
    nav("Back")?.focus();
    state.record = "@I2@";
    draw();

    expect(document.activeElement).toBe(nav("Back"));
  });

  it("keeps the focus on a control that the reader pressed to open a node", () => {
    draw();
    const chevron = container.querySelector<HTMLElement>('[data-focus-key="t:BIRT[0]"]');
    chevron?.focus();
    chevron?.click();
    draw();

    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:BIRT[0]");
    expect(document.activeElement?.getAttribute("aria-expanded")).toBe("true");
  });

  it("does not take the focus from outside the card", () => {
    const outside = document.body.createEl("input");
    draw();
    outside.focus();
    draw();

    expect(document.activeElement).toBe(outside);
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

describe("the tree of a record on the card", () => {
  const chevron = (key: string): HTMLElement | null => container.querySelector<HTMLElement>(`[data-focus-key="${key}"]`);
  const toggled = (key: string): string | null | undefined => chevron(key)?.getAttribute("aria-expanded");

  it("keeps a node the reader opened open after the card shows Pierre Curie and Marie again, and for a redraw", () => {
    draw();
    chevron("t:BIRT[0]")?.click();
    draw();
    expect(toggled("t:BIRT[0]")).toBe("true");

    state.record = "@I2@";
    draw();
    state.record = "@I1@";
    draw();
    expect(toggled("t:BIRT[0]")).toBe("true");
  });

  it("restores the scroll of a record the reader returns to by Back, and not one reached by a link", () => {
    draw();
    const first = body();
    if (first) {
      first.scrollTop = 300;
    }
    state.record = "@I2@";
    draw();
    state.arrival = "history";
    state.record = "@I1@";
    draw();
    expect(body()?.scrollTop).toBe(300);

    const again = body();
    if (again) {
      again.scrollTop = 120;
    }
    state.arrival = "other";
    state.record = "@I2@";
    draw();
    expect(body()?.scrollTop).toBe(0);
    state.record = "@I1@";
    draw();
    expect(body()?.scrollTop).toBe(0);
  });

  it("does not scroll the card for a link to the record it already shows", () => {
    draw();
    const first = body();
    if (first) {
      first.scrollTop = 200;
    }
    draw();

    expect(body()?.scrollTop).toBe(200);
  });

  it("holds the tags on another record and in another tab, and tells every card to redraw", () => {
    draw();
    [...container.querySelectorAll<HTMLElement>(".gedcom-tree-control")].find((one) => one.textContent === "Show GEDCOM tags")?.click();
    expect(redraw).toHaveBeenCalledTimes(1);

    state.record = "@I2@";
    draw();
    expect(container.querySelector(".gedcom-tree-tag")).not.toBeNull();

    const other = document.createElement("div");
    document.body.append(other);
    renderRecordCard(other, { ...tab, filePath: () => "other.ged" }, [], view);
    expect(other.querySelector(".gedcom-tree-tag")).not.toBeNull();
  });

  it("shows no tree for a card of an event, a place or a media record", () => {
    state.record = "event:@I1@:BIRT:0";
    draw();

    expect(container.querySelector(".gedcom-tree")).toBeNull();
  });
});

describe("what a card remembers", () => {
  it("does not spend a slot of the twenty on the card of a place or an event", () => {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 DATE 1900"];
    for (let at = 0; at < 25; at += 1) {
      lines.push(`1 RESI`, `2 PLAC Town ${at}`);
    }
    index = indexOf([...lines, "0 TRLR"].join("\n"));
    const key = '[data-focus-key="t:BIRT[0]"]';
    draw();
    container.querySelector<HTMLElement>(key)?.click();
    for (let at = 0; at < 25; at += 1) {
      state.record = `place:town ${at}`;
      draw();
      state.record = `event:@I1@:RESI:${at}`;
      draw();
    }
    state.record = "@I1@";
    draw();

    expect(container.querySelector<HTMLElement>(key)?.getAttribute("aria-expanded")).toBe("true");
  });
});
