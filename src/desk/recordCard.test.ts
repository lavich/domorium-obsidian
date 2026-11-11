// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { TextTab } from "../testing/textTab";
import { addableAt, describes, removableAt } from "./addableFields";
import { TreeSession } from "./detail/treeSession";
import { addAt, commit, removeAt, setValueAt } from "./edits";
import { renderRecordCard, type CardTab, type CardView } from "./recordCard";

let container: HTMLElement;
let state: { record: string | null };
let tab: CardTab;
let calls: {
  select: ReturnType<typeof vi.fn<(xref: string) => void>>;
};
let view: {
  setIcon: ReturnType<typeof vi.fn<CardView["setIcon"]>>;
  session: TreeSession;
  header?: HTMLElement;
  chooseField?: CardView["chooseField"];
};
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
  state = { record: "@I1@" };
  calls = { select: vi.fn() };
  tab = {
    filePath: () => "curie.ged",
    index: () => index,
    selection: () => ({ record: state.record }),
    mediaItem: () => null,
    select: (xref) => {
      calls.select(xref);
    },
    showInSource: vi.fn(),
    openFile: vi.fn(),
  };
  view = {
    setIcon: vi.fn((element: HTMLElement, icon: string) => {
      element.setAttribute("data-icon", icon);
    }),
    session: new TreeSession(),
  };
});

const draw = (): void => {
  renderRecordCard(container, tab, view);
};
const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");
const body = () => container.querySelector<HTMLElement>(".gedcom-card-body");

describe("the empty states of the card", () => {
  it("says no GEDCOM file is open without a tab", () => {
    renderRecordCard(container, null, view);

    expect(texts(".gedcom-card-state")).toEqual(["Open a GEDCOM file to see its records."]);
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
    renderRecordCard(container, null, view);
    expect(texts(".gedcom-card-state")).toEqual(["Откройте файл GEDCOM, чтобы увидеть его записи."]);

    state.record = null;
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["Выберите запись на графе, в хронологии или в списке."]);
    index = indexOf("0 HEAD\n0 TRLR\n");
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["В файле нечего показывать."]);
  });
});

describe("the page of each kind of record", () => {
  it("shows a person, a family and a source as their tree and nothing else", () => {
    for (const record of ["@I1@", "@F3@", "@S3@"]) {
      state.record = record;
      draw();

      expect([...(body()?.children ?? [])].map((child) => child.className)).toEqual(["gedcom-tree"]);
    }
  });

  it("has no header: no bar, no Back or Forward control, and the record's name only in the live region", () => {
    draw();

    expect(container.querySelector(".gedcom-card-head, .gedcom-card-nav, .gedcom-card-head-name")).toBeNull();
    expect(container.querySelector('[data-focus-key="card.back"], [data-focus-key="card.forward"]')).toBeNull();
    expect(container.firstElementChild?.firstElementChild?.classList.contains("gedcom-card-live")).toBe(true);
    const card = container.querySelector(".gedcom-card");
    expect(card?.children[1]?.classList.contains("nav-header")).toBe(true);
    expect(card?.children[2]?.classList.contains("gedcom-card-body")).toBe(true);
    expect(card?.querySelectorAll(".gedcom-card-body .nav-header")).toHaveLength(0);
    expect(container.querySelector("h1")).toBeNull();
  });

  it("fills a toolbar the host keeps outside the card, and hides it where there is no tree", () => {
    const bar = document.createElement("div");
    view = { ...view, header: bar };
    draw();

    expect(bar.querySelector(".gedcom-tree-toggle")).not.toBeNull();
    expect(bar.hidden).toBe(false);
    expect(container.querySelector(".gedcom-card .nav-header")).toBeNull();
  });

  it("shows a multimedia record with no Evidence section and no notes of the vault", () => {
    state.record = "@O5@";
    draw();

    expect(texts(".gedcom-desk-title")).toEqual(["The Curie family, about 1908"]);
    expect(container.querySelector(".gedcom-card-evidence, .gedcom-desk-note")).toBeNull();
  });

  it("shows no card for an event id, and says to select a record", () => {
    state.record = "event:@I1@:BIRT:0";
    draw();

    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline or the list."]);
    expect(container.querySelector(".gedcom-tree, .gedcom-desk-title")).toBeNull();
  });

  it("shows a place with its events, whose names open nothing, and opens the record of an event through the tab", () => {
    state.record = "place:paris, france";
    draw();
    container.querySelector<HTMLElement>(".gedcom-desk-place-occurrences .gedcom-desk-fact-name")?.click();
    container.querySelector<HTMLElement>(".gedcom-desk-place-occurrences .gedcom-desk-fact-value .gedcom-desk-link")?.click();

    expect(texts(".gedcom-desk-title")).toEqual(["Paris, France"]);
    expect(calls.select).toHaveBeenCalledTimes(1);
    expect(calls.select.mock.calls[0]?.[0]).not.toMatch(/^event:/u);
  });

  it("selects a record through a pointer of the tree", () => {
    draw();
    [...container.querySelectorAll<HTMLElement>(".gedcom-tree button.gedcom-desk-link")]
      .find((node) => node.textContent?.includes("Curie"))
      ?.click();

    expect(calls.select).toHaveBeenCalled();
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

  it("keeps the focus on the toggle of every node when another record is shown, and flips its icon with the state", () => {
    draw();
    const toggle = (): HTMLElement | null => container.querySelector<HTMLElement>('[data-focus-key="tree:toggle"]');
    expect(toggle()?.getAttribute("data-icon")).toBe("chevrons-up-down");
    toggle()?.focus();
    toggle()?.click();
    expect(toggle()?.getAttribute("data-icon")).toBe("chevrons-down-up");
    state.record = "@I2@";
    draw();

    expect(document.activeElement).toBe(toggle());
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

  it("does not scroll the card for a link to the record it already shows", () => {
    draw();
    const first = body();
    if (first) {
      first.scrollTop = 200;
    }
    draw();

    expect(body()?.scrollTop).toBe(200);
  });

  it("shows no tree for a card of a place or a media record", () => {
    state.record = "place:paris, france";
    draw();

    expect(container.querySelector(".gedcom-tree")).toBeNull();
  });
});

describe("what a card remembers", () => {
  it("does not spend a slot of the twenty on the card of a place", () => {
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
    }
    state.record = "@I1@";
    draw();

    expect(container.querySelector<HTMLElement>(key)?.getAttribute("aria-expanded")).toBe("true");
  });
});

describe("a card that writes", () => {
  const HEAD = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
  let doc: TextTab;
  let asked: (() => void) | null;

  const writing = (lines: string[], head = HEAD): CardTab => {
    doc = new TextTab([...head, ...lines, "0 TRLR"].join("\n"));
    asked = null;
    let read = { version: 0, index: curieIndex() };
    const service = () => doc.service();
    return {
      ...tab,
      index: () => {
        if (read.version !== doc.version) {
          read = { version: doc.version, index: buildIndex(service()) };
        }
        return read.index;
      },
      version: () => doc.version,
      describes: (at) => describes(service(), at),
      addableAt: (at) => addableAt(service(), at),
      removableAt: (at, tag) => removableAt(service(), at, tag),
      setValueAt: (at, input, version) => commit(doc, setValueAt(service(), at, version, input)),
      addAt: (at, tag, input, version) => commit(doc, addAt(service(), at, version, tag, input)),
      removeAt: (at, nested, version, done) => {
        const go = (): void => {
          done(commit(doc, removeAt(service(), at, version)));
        };
        if (nested === 0) {
          go();
        } else {
          asked = go;
        }
      },
      settle: () => {
        draw();
      },
    };
  };
  const removeOf = (label: string): HTMLElement | null =>
    [...container.querySelectorAll<HTMLElement>(".gedcom-tree-row")]
      .find((row) => row.querySelector(".gedcom-tree-label")?.textContent === label)
      ?.querySelector<HTMLElement>(".gedcom-tree-remove") ?? null;

  it("removes one line for two presses on its removal before the card is drawn again, and none after it", () => {
    tab = writing(["0 @I1@ INDI", "1 SEX F", "1 NAME Marie /Curie/", "1 NAME Manya /Skłodowska/"]);
    draw();
    const remove = removeOf("Sex");

    remove?.click();
    remove?.click();
    expect(doc.text).not.toContain("1 SEX F");
    expect(doc.text).toContain("1 NAME Marie /Curie/");
    expect(doc.writes).toBe(1);
  });

  it("draws the card again from the new text right after a write", () => {
    tab = writing(["0 @I1@ INDI", "1 SEX F", "1 _MILITARY Cavalry"]);
    draw();
    removeOf("Sex")?.click();

    expect(texts(".gedcom-tree-label")).not.toContain("Sex");
  });

  it("removes nothing when the file changed while the question was open, and draws the card from the new text", () => {
    tab = writing(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900", "2 PLAC Paris"]);
    draw();
    removeOf("Birth")?.click();
    doc.replace(doc.text.replace("0 @I1@ INDI", "0 @I1@ INDI\n1 SEX F"));
    asked?.();

    expect(doc.text).toContain("1 BIRT");
    expect(texts(".gedcom-tree-label")).toContain("Sex");
  });

  it("keeps the focus on a field it wrote", () => {
    tab = writing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    draw();
    const area = container.querySelector<HTMLTextAreaElement>('[data-focus-key="t:_MILITARY[0]:value"]');
    area?.focus();
    if (area) {
      area.value = "Hussar";
      area.dispatchEvent(new Event("input"));
      area.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    }

    expect(doc.text).toContain("1 _MILITARY Hussar");
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:_MILITARY[0]:value");
    expect(document.activeElement).not.toBe(area);
  });

  it("puts the focus on the new line's menu after adding a death, not back where it was", () => {
    view.chooseField = vi.fn();
    tab = writing(["0 @I1@ INDI", "1 SEX F"]);
    draw();
    const add = container.querySelector<HTMLElement>('[data-focus-key="t::add"]');
    add?.focus();
    add?.click();
    vi.mocked(view.chooseField).mock.calls[0]?.[1].find((one) => one.title === "Death")?.choose();

    expect(doc.text).toContain("1 DEAT Y");
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:DEAT[0]:add");
  });

  it("offers no editing where the service has no dialect for the file, and says why", () => {
    tab = writing(["0 @I1@ INDI", "1 SEX F"], []);
    draw();

    expect(container.querySelector(".gedcom-tree-note")?.textContent).toContain("cannot be edited here");
    expect(container.querySelectorAll(".gedcom-tree-add, .gedcom-tree-remove, textarea:not([readonly]), select")).toHaveLength(0);
  });
});
