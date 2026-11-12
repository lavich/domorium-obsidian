// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { TextTab } from "../testing/textTab";
import { addableAt, describes, removableAt } from "./addableFields";
import { TreeSession } from "./detail/treeSession";
import { addAt, commit, describeMoveAt, moveAt, removeAt, setValueAt } from "./edits";
import { mediaFileEdit } from "./mediaFile";
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
  chooseVaultFile?: CardView["chooseVaultFile"];
  chooseDeviceFile?: CardView["chooseDeviceFile"];
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

  it("says to select a record in a file of notes alone, and that a file of a header alone holds nothing", () => {
    state.record = null;
    index = indexOf("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @N1@ SNOTE A note\n0 TRLR\n");
    draw();
    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline or the list."]);

    index = indexOf("0 HEAD\n1 GEDC\n2 VERS 7.0\n1 NOTE Only a header\n0 TRLR\n");
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

  it("shows a note, a repository, a submitter, a record of the file's own and the header as their tree, rooted at their kind", () => {
    index = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 7.0", "1 SUBM @U1@",
        "0 @U1@ SUBM", "1 NAME Domorium",
        "0 @N1@ SNOTE First line", "1 CONT second line",
        "0 @R1@ REPO", "1 NAME Archive", "1 ADDR Street 7", "2 CITY Warsaw",
        "0 @P1@ _PLAN", "1 NAME Research plan",
        "0 TRLR",
      ].join("\n"),
    );
    const roots: [string, string][] = [];
    for (const record of ["@N1@", "@R1@", "@U1@", "@P1@", "header:"]) {
      state.record = record;
      draw();

      expect([...(body()?.children ?? [])].map((child) => child.className)).toEqual(["gedcom-tree"]);
      roots.push([
        container.querySelector(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-label")?.textContent ?? "",
        String(container.querySelectorAll(".gedcom-tree-node:not(.is-root)").length),
      ]);
    }

    expect(roots).toEqual([
      ["Shared note", "0"],
      ["Repository", "2"],
      ["Submitter", "1"],
      ["_PLAN", "1"],
      ["Header", "2"],
    ]);
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

  it("shows a multimedia record as the tree of its lines, rooted at Media, with no heading and no list of who links it", () => {
    state.record = "@O5@";
    draw();

    expect([...(body()?.children ?? [])].map((child) => child.className)).toEqual(["gedcom-tree"]);
    expect(container.querySelector(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-label")?.textContent).toBe("Media");
    expect(container.querySelector("h1, h2, .gedcom-desk-used-by, .gedcom-card-evidence")).toBeNull();
    expect(texts(".gedcom-tree-file-path")).toEqual(["Media/curie-family-1908.svg"]);
  });

  it("draws the picture of a medium's file in its row while the row is closed, as a control that opens the file", () => {
    const openFile = vi.fn();
    tab.openFile = openFile;
    tab.mediaItem = (at) => ({
      content: { kind: "image", url: "app://curie-family-1908.svg", name: "curie-family-1908.svg", title: "The Curie family, about 1908" },
      path: "Media/curie-family-1908.svg",
      at,
    });
    state.record = "@O5@";
    draw();
    const file = container.querySelector<HTMLElement>('[data-focus-key="t:FILE[0]:file"]');

    expect(file?.querySelector("img")?.getAttribute("src")).toBe("app://curie-family-1908.svg");
    expect(file?.closest(".gedcom-tree-node")?.classList.contains("is-collapsed")).toBe(true);
    expect(file?.getAttribute("aria-label")).toBe("Open The Curie family, about 1908");
    file?.click();
    expect(openFile).toHaveBeenCalledWith("Media/curie-family-1908.svg");
  });

  it("shows no card for an event id, and says to select a record", () => {
    state.record = "event:@I1@:BIRT:0";
    draw();

    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline or the list."]);
    expect(container.querySelector(".gedcom-tree, .gedcom-desk-title")).toBeNull();
  });

  it("shows no card for a place, which has none, and says to select a record", () => {
    state.record = "place:paris, france";
    draw();

    expect(texts(".gedcom-card-state")).toEqual(["Select a record in the graph, the timeline or the list."]);
    expect(container.querySelector(".gedcom-tree")).toBeNull();
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

  it("reads a note by the text of its row in the list, and the header as the file's header", () => {
    state.record = "@N1@";
    draw();
    expect(live()).toBe("Shown: The only person to have won a Nobel Prize in two different sciences:");

    state.record = "header:";
    draw();
    expect(live()).toBe("Shown: File header");
  });

  it("reads a medium by its title", () => {
    state.record = "@O5@";
    draw();
    expect(live()).toBe("Shown: The Curie family, about 1908");
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
      describeMoveAt: (at, version) => describeMoveAt(service(), at, version),
      moveAt: (at, target, version) => commit(doc, moveAt(service(), at, version, target)),
      settle: () => {
        draw();
      },
      fileEditAt: (at, path, version, type) => mediaFileEdit(service(), "curie.ged", at, path, version, type),
      writeFileAt: (at, path, version, type) => commit(doc, mediaFileEdit(service(), "curie.ged", at, path, version, type)),
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

  it("edits the header as any record: a copyright from its menu, its version refused, no field on its root", () => {
    view.chooseField = vi.fn();
    tab = writing(["0 @U1@ SUBM", "1 NAME Domorium"], [...HEAD, "1 SUBM @U1@", "1 NOTE About the file"]);
    state.record = "header:";
    draw();

    expect(container.querySelector(".gedcom-tree-note")).toBeNull();
    expect(container.querySelector('[data-focus-key="t::value"]')).toBeNull();
    container.querySelector<HTMLElement>('[data-focus-key="t::add"]')?.click();
    vi.mocked(view.chooseField).mock.calls[0]?.[1].find((one) => one.title === "Copyright")?.choose();
    const copyright = container.querySelector<HTMLTextAreaElement>(".is-unwritten textarea");
    copyright?.focus();
    if (copyright) {
      copyright.value = "Domorium";
      copyright.dispatchEvent(new Event("input"));
      copyright.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    }
    expect(doc.text).toContain("1 COPR Domorium");

    container.querySelector<HTMLElement>('[data-focus-key="t:GEDC[0]"]')?.click();
    const version = container.querySelector<HTMLTextAreaElement>('[data-focus-key="t:GEDC[0].VERS[0]:value"]');
    version?.focus();
    if (version) {
      version.value = "7.1";
      version.dispatchEvent(new Event("input"));
      version.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    }
    expect(doc.text).toContain("2 VERS 7.0");
    expect(texts(".gedcom-tree-message.is-error")).toEqual(["The standard does not allow this value here."]);

    [...container.querySelectorAll<HTMLElement>(".gedcom-tree button.gedcom-desk-link")].find((link) => link.textContent === "Domorium")?.click();
    expect(calls.select).toHaveBeenCalledWith("@U1@");
  });

  it("offers the vault and the device on a medium's file, and writes the file chosen from the vault with its format", () => {
    const chooseField = vi.fn<NonNullable<CardView["chooseField"]>>();
    view = {
      ...view,
      chooseField,
      chooseVaultFile: (choices, chosen) => {
        chosen(choices.find((one) => one.path === "Media/b.png")?.path ?? "");
      },
      chooseDeviceFile: vi.fn(),
    };
    tab = writing(["0 @O1@ OBJE", "1 FILE Media/a.svg", "2 FORM image/svg+xml"]);
    tab.vaultFiles = () => ["Media/a.svg", "Media/b.png"];
    tab.vaultHas = () => false;
    tab.copyIntoVault = () => Promise.resolve();
    state.record = "@O1@";
    draw();
    container.querySelector<HTMLElement>('[data-focus-key="t:FILE[0]:file"]')?.click();
    const [, choices] = chooseField.mock.calls[0] ?? [];

    expect(choices?.map((one) => one.title)).toEqual(["Choose from the vault", "Upload from device"]);
    choices?.[0]?.choose();
    expect(doc.text).toContain("1 FILE Media/b.png\n2 FORM image/png");
    expect(doc.writes).toBe(1);
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:FILE[0]:file");
  });

  it("edits a submitter, a repository and a note", () => {
    tab = writing(["0 @U1@ SUBM", "1 NAME Domorium", "1 WWW https://domorium.com/", "0 @R2@ REPO", "1 NAME Archive", "0 @N1@ SNOTE Text"]);
    for (const record of ["@U1@", "@R2@", "@N1@"]) {
      state.record = record;
      draw();

      expect(container.querySelector(".gedcom-tree-note"), record).toBeNull();
      expect(container.querySelector(".gedcom-tree-add"), record).not.toBeNull();
    }
    state.record = "@U1@";
    draw();
    const area = container.querySelector<HTMLTextAreaElement>('[data-focus-key="t:WWW[0]:value"]');
    area?.focus();
    if (area) {
      area.value = "https://example.org/";
      area.dispatchEvent(new Event("input"));
      area.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }));
    }

    expect(doc.text).toContain("0 @U1@ SUBM\n1 NAME Domorium\n1 WWW https://example.org/");
  });

  const gripOf = (label: string): HTMLElement | null =>
    [...container.querySelectorAll<HTMLElement>(".gedcom-tree-row")]
      .find((row) => row.querySelector(".gedcom-tree-label")?.textContent === label)
      ?.querySelector<HTMLElement>(".gedcom-tree-grip") ?? null;
  const pointer = (grip: HTMLElement | null, type: string, y: number): void => {
    grip?.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, isPrimary: true, clientY: y }));
  };
  const laidOut = (): void => {
    const nodes = [...container.querySelectorAll<HTMLElement>(".gedcom-tree-node.is-root > .gedcom-tree-children > .gedcom-tree-node")];
    nodes.forEach((node, at) => {
      const box = { x: 0, y: at * 30, top: at * 30, bottom: at * 30 + 26, left: 0, right: 300, width: 300, height: 26, toJSON: () => ({}) } as DOMRect;
      node.getBoundingClientRect = () => box;
      const row = node.querySelector<HTMLElement>(":scope > .gedcom-tree-row");
      if (row) {
        row.getBoundingClientRect = () => box;
      }
    });
  };

  it("moves a line by its grip and brings the grip into view only after the scroll it kept", async () => {
    tab = writing(["0 @I1@ INDI", "1 NAME Marie /Curie/", "1 SEX F"]);
    draw();
    const kept = body();
    if (kept) {
      kept.scrollTop = 120;
    }
    const seen: { key: string | null; scrollTop: number | undefined }[] = [];
    scrollIntoView.mockImplementation(function (this: HTMLElement) {
      seen.push({ key: this.getAttribute("data-focus-key"), scrollTop: body()?.scrollTop });
    });
    laidOut();
    const grip = gripOf("Sex");
    pointer(grip, "pointerdown", 43);
    pointer(grip, "pointermove", 4);
    pointer(grip, "pointerup", 4);
    await new Promise((resolve) => window.setTimeout(resolve, 0));

    expect(doc.text).toContain("1 SEX F\n1 NAME Marie /Curie/");
    expect(seen).toEqual([{ key: "t:SEX[0]:grip", scrollTop: 120 }]);
    expect(document.activeElement?.closest(".gedcom-tree-grip")).toBeNull();
    scrollIntoView.mockReset();
  });

  it("scrolls nothing into view for a redraw after the file changed", () => {
    tab = writing(["0 @I1@ INDI", "1 NAME Marie /Curie/", "1 SEX F"]);
    draw();
    container.querySelector<HTMLElement>('[data-focus-key="t:SEX[0]:value"]')?.focus();
    doc.replace(doc.text.replace("1 SEX F", "1 SEX M"));
    draw();

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:SEX[0]:value");
  });

  it("refuses a move described from a text that moved on since the card was drawn, and draws the card again", () => {
    const written = writing(["0 @I1@ INDI", "1 NAME Marie /Curie/", "1 SEX F"]);
    const asked = vi.fn((at: Parameters<NonNullable<CardTab["describeMoveAt"]>>[0], version: number) => describeMoveAt(doc.service(), at, version));
    tab = { ...written, describeMoveAt: asked };
    draw();
    const drawn = doc.version;
    const grip = gripOf("Sex");
    doc.replace(doc.text.replace("1 NAME Marie /Curie/", "1 NAME Maria /Curie/"));
    pointer(grip, "pointerdown", 43);
    pointer(grip, "pointermove", 4);

    expect(asked).toHaveBeenCalledWith(expect.anything(), drawn);
    expect(asked.mock.results[0]?.value).toMatchObject({ ok: false, code: "stale-document" });
    expect(doc.text).toContain("1 NAME Maria /Curie/\n1 SEX F");
    expect(doc.writes).toBe(0);
    expect(texts(".gedcom-tree-row .gedcom-tree-summary, .gedcom-tree-row .gedcom-field")).toEqual(expect.arrayContaining([expect.stringContaining("Maria")]));
  });

  it("offers no editing where the service has no dialect for the file, and says why", () => {
    tab = writing(["0 @I1@ INDI", "1 SEX F", "1 NAME Marie /Curie/"], []);
    draw();

    expect(container.querySelector(".gedcom-tree-note")?.textContent).toContain("cannot be edited here");
    expect(container.querySelectorAll(".gedcom-tree-add, .gedcom-tree-remove, .gedcom-tree-grip, textarea:not([readonly]), select")).toHaveLength(0);
  });
});
