// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type GenealogyIndex, type RecordLine } from "../../genealogy";
import { resetLanguage, setLanguage } from "../../i18n";
import { CURIE, curieIndex } from "../../testing/curie";
import { installObsidianDom } from "../../testing/obsidianDom";
import { TextTab } from "../../testing/textTab";
import { addableAt, choicesAt, holdsValueAt, pairedAt, pointerChoicesAt, proseAt, removableAt } from "../addableFields";
import { addAt, checkValue, commit, describeMoveAt, moveAt, removeAt, requiredBeneath, setValueAt, STALE } from "../edits";
import { factsOf } from "../personPage";
import { factsByLine, renderTree, type FieldChoice, type TreeHost } from "./tree";
import { movedKeys, slotAt, slotsByBoundary, TreeDrag } from "./treeMove";
import { ephemeralTreeState, TreeSession, type TreeState } from "./treeSession";

beforeAll(installObsidianDom);
afterEach(resetLanguage);

const opened = vi.fn<(xref: string) => void>();
const shown = vi.fn<TreeHost["showInSource"]>();
let box: HTMLElement;

beforeEach(() => {
  opened.mockReset();
  shown.mockReset();
  box = document.createElement("div");
  document.body.replaceChildren(box);
});

const HEAD = {
  "7.0": ["0 HEAD", "1 GEDC", "2 VERS 7.0"],
  "5.5.1": ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8"],
};

interface Made {
  index: GenealogyIndex;
  service: GedcomLanguageService;
  record: RecordLine;
  xref: string;
}

function make(lines: string[], version: "7.0" | "5.5.1" = "7.0", xref = "@I1@"): Made {
  const service = new GedcomLanguageService([...HEAD[version], ...lines, "0 TRLR"].join("\n"));
  const index = buildIndex(service);
  const record = index.record(xref);
  if (!record) {
    throw new Error(`no record ${xref}`);
  }
  return { index, service, record, xref };
}

function draw(made: Made, state: TreeState = ephemeralTreeState(), parent: HTMLElement = box): void {
  const person = made.index.person(made.xref);
  const facts = person ? factsByLine(factsOf(person).filter((fact) => fact.key.startsWith("p:"))) : new Map();
  renderTree(parent, made.record, {
    index: made.index,
    host: { openRecord: opened, showInSource: shown },
    facts,
    state,
  });
}

type Asked = "chooseField" | "chooseValues" | "choosePointer" | "announce";
type EditingHost = Omit<TreeHost, Asked> & {
  chooseField: ReturnType<typeof vi.fn<NonNullable<TreeHost["chooseField"]>>>;
  chooseValues: ReturnType<typeof vi.fn<NonNullable<TreeHost["chooseValues"]>>>;
  choosePointer: ReturnType<typeof vi.fn<NonNullable<TreeHost["choosePointer"]>>>;
  announce: ReturnType<typeof vi.fn<NonNullable<TreeHost["announce"]>>>;
};

interface Editing {
  tab: TextTab;
  host: EditingHost;
  state: TreeState;
  draws: () => number;
}

/** A tree that writes through the real service into a text, and is drawn again from it after each write, as the card is. */
function editing(lines: string[], version: "7.0" | "5.5.1" = "7.0", xref = "@I1@", extra: Partial<Omit<TreeHost, Asked>> = {}, state = ephemeralTreeState()): Editing {
  return editingText([...HEAD[version], ...lines, "0 TRLR"].join("\n"), xref, extra, state);
}

function editingText(text: string, xref: string, extra: Partial<Omit<TreeHost, Asked>> = {}, state = ephemeralTreeState()): Editing {
  const tab = new TextTab(text);
  let drawn = tab.version;
  let draws = 0;
  const service = () => tab.service();
  const host: EditingHost = {
    openRecord: opened,
    showInSource: shown,
    addableAt: (at) => addableAt(service(), at),
    choicesAt: (at) => choicesAt(service(), at),
    proseAt: (at) => proseAt(service(), at),
    holdsValueAt: (at) => holdsValueAt(service(), at),
    removableAt: (at, tag) => removableAt(service(), at, tag),
    pointerChoicesAt: (at, tag) => pointerChoicesAt(service(), at, tag),
    pairedAt: (at, tag) => pairedAt(service(), at, tag),
    requiredBeneath: (field) => requiredBeneath(service(), field),
    checkValue: (at, tag, input, replacing) => checkValue(service(), at, tag, input, replacing),
    setValueAt: (at, input) => commit(tab, setValueAt(service(), at, drawn, input)),
    addAt: (at, tag, input) => commit(tab, addAt(service(), at, drawn, tag, input)),
    removeAt: (at, _nested, done) => {
      done(commit(tab, removeAt(service(), at, drawn)));
    },
    describeMoveAt: (at) => {
      const described = describeMoveAt(service(), at);
      return described.ok && described.version !== drawn ? { ok: false, code: STALE, message: "stale" } : described;
    },
    moveAt: (at, target) => commit(tab, moveAt(service(), at, drawn, target)),
    settle: () => {
      redraw();
    },
    chooseField: vi.fn(),
    chooseValues: vi.fn(),
    choosePointer: vi.fn(),
    announce: vi.fn(),
    ...extra,
  };
  const redraw = (): void => {
    drawn = tab.version;
    draws += 1;
    const index = buildIndex(service());
    const record = index.record(xref);
    if (!record) {
      throw new Error(`no record ${xref}`);
    }
    const person = index.person(xref);
    box.replaceChildren();
    renderTree(box, record, {
      index,
      host,
      facts: person ? factsByLine(factsOf(person)) : new Map(),
      state,
    });
  };
  redraw();
  return { tab, host, state, draws: () => draws };
}

const menu = (host: EditingHost): FieldChoice[] => host.chooseField.mock.calls.at(-1)?.[1] ?? [];
const menuEntry = (host: EditingHost, title: string): FieldChoice => {
  const found = menu(host).find((one) => one.title === title);
  if (!found) {
    throw new Error(`no entry ${title}; entries: ${menu(host).map((one) => one.title).join(", ")}`);
  }
  return found;
};
const fileLines = (tab: TextTab): string[] => tab.text.split("\n");
const settled = (): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, 0));

const rootRow = (): HTMLElement => {
  const found = box.querySelector<HTMLElement>(".gedcom-tree-node.is-root > .gedcom-tree-row");
  if (!found) {
    throw new Error("no root");
  }
  return found;
};
const rows = (): HTMLElement[] => [...box.querySelectorAll<HTMLElement>(".gedcom-tree-node:not(.is-root) > .gedcom-tree-row")];
const labelOf = (row: Element): string => row.querySelector(".gedcom-tree-label")?.textContent ?? "";
const rowNamed = (label: string, at = 0): HTMLElement => {
  const found = rows().filter((row) => labelOf(row) === label)[at];
  if (!found) {
    throw new Error(`no row ${label}; rows: ${rows().map(labelOf).join(", ")}`);
  }
  return found;
};
const chevron = (row: Element): HTMLButtonElement => {
  const found = row.querySelector<HTMLButtonElement>(".gedcom-tree-chevron");
  if (!found) {
    throw new Error("no chevron");
  }
  return found;
};
const open = (label: string, at = 0): void => {
  chevron(rowNamed(label, at)).click();
};
const summaryOf = (row: Element): string | undefined => row.querySelector(".gedcom-tree-summary")?.textContent ?? undefined;
const valuesOf = (row: Element): string[] =>
  [...row.querySelectorAll<HTMLElement>(".gedcom-field")].map((field) => field.getAttribute("data-value") ?? "");
const control = (name: string): HTMLElement => {
  const found = [...box.querySelectorAll<HTMLElement>(".gedcom-tree-control")].find((one) => one.textContent === name || one.getAttribute("aria-label") === name);
  if (!found) {
    throw new Error(`no control ${name}`);
  }
  return found;
};

describe("the lines of a record as rows", () => {
  it("draws a custom line with its tag as written and nests its substructure beneath a node", () => {
    const made = make(["0 @I1@ INDI", "1 _MILITARY Cavalry", "2 _RANK Captain"]);
    draw(made);

    expect(rows().map(labelOf)).toEqual(["_MILITARY"]);
    expect(summaryOf(rowNamed("_MILITARY"))).toBe("Cavalry");
    open("_MILITARY");
    expect(rows().map(labelOf)).toEqual(["_MILITARY", "_RANK"]);
    expect(valuesOf(rowNamed("_MILITARY"))).toEqual(["Cavalry"]);
    expect(valuesOf(rowNamed("_RANK"))).toEqual(["Captain"]);
  });

  it("draws the lines in the order the file writes them, under no heading", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "1 NAME Maria /Curie/", "1 SEX F"]));

    expect(rows().map(labelOf)).toEqual(["Birth", "Name", "Sex"]);
    expect(box.querySelector("h1, h2, h3")).toBeNull();
  });

  it("offers a menu on every line that may hold lines, and on none where the card cannot write", () => {
    editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 1 JAN 1900", "1 SEX F"]);

    expect(rowNamed("Birth").querySelector(".gedcom-tree-add")?.getAttribute("aria-label")).toBe("Add a field");
    expect(rootRow().querySelector(".gedcom-tree-add")).not.toBeNull();
    box.replaceChildren();
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 DATE 1 JAN 1900"]));
    expect(box.querySelector(".gedcom-tree-add")).toBeNull();
  });

  it("lists the fields that can still be added, by name, when the plus is pressed", () => {
    const { host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/"]);
    rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-add")?.click();

    expect(host.chooseField).toHaveBeenCalledOnce();
    expect(menu(host)).toContainEqual(expect.objectContaining({ title: "Given names", disabled: false }));
  });

  it("lists a field that has no room left, disabled", () => {
    const { host } = editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 1 JAN 1900"]);
    rowNamed("Birth").querySelector<HTMLElement>(".gedcom-tree-add")?.click();

    expect(menu(host)).toContainEqual(expect.objectContaining({ title: "Date", disabled: true }));
  });

  it("draws a value the standard limits as a list of its values, the written one chosen", () => {
    editing(["0 @I1@ INDI", "1 SEX F"]);
    const select = rowNamed("Sex").querySelector<HTMLSelectElement>("select.gedcom-tree-choice");

    expect(select?.selectedOptions[0]?.textContent).toBe("Female");
    expect([...(select?.options ?? [])].map((one) => one.value)).toEqual(expect.arrayContaining(["M", "F"]));
  });

  it("opens a searchable list of the records a pointer may point at, the one it points at marked", () => {
    const { host } = editing(["0 @I1@ INDI", "1 ASSO @I2@", "2 ROLE FRIEND", "0 @I2@ INDI", "1 NAME Pierre /Curie/", "0 @I3@ INDI", "1 NAME Irène /Curie/"]);
    open("Associated person");
    rowNamed("Associated person").querySelector<HTMLElement>(".gedcom-tree-pick")?.click();

    expect(host.choosePointer).toHaveBeenCalledOnce();
    expect(host.choosePointer.mock.calls[0]?.[0]).toContainEqual({ title: "Pierre Curie", xref: "@I2@", checked: true });
    expect(host.choosePointer.mock.calls[0]?.[0]).toContainEqual({ title: "Irène Curie", xref: "@I3@", checked: false });
  });

  it("offers to remove a line that may go, with the number of lines beneath it, and a line the standard requires no trash", () => {
    const removeAt = vi.fn<NonNullable<TreeHost["removeAt"]>>();
    editing(["0 @I1@ INDI", "1 NAME Marie /Curie/", "2 GIVN Marie", "2 SURN Curie", "1 BIRT", "2 DATE 1 JAN 1900"], "7.0", "@I1@", { removeAt });
    rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-remove")?.click();

    expect(removeAt).toHaveBeenCalledWith(expect.objectContaining({ line: 4 }), 2, expect.any(Function));
    expect(rootRow().querySelector(".gedcom-tree-remove")).toBeNull();
  });

  it("draws the root alone, with its menu, for a record that states nothing beneath its opening line", () => {
    const { host, tab } = editing(["0 @I1@ INDI"]);

    expect(rows()).toHaveLength(0);
    expect(rootRow().querySelector(".gedcom-tree-label")?.textContent).toBe("Person");
    rootRow().querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Death").choose();
    expect(tab.text).toContain("0 @I1@ INDI\n1 DEAT Y");
    expect(rowNamed("Death")).toBeDefined();
  });

  it("draws a bare death with no value, no dash, no summary and no node", () => {
    draw(make(["0 @I1@ INDI", "1 DEAT Y"]));
    const row = rowNamed("Death");

    expect(row.querySelector(".gedcom-field")).toBeNull();
    expect(row.querySelector(".gedcom-tree-summary")).toBeNull();
    expect(row.querySelector(".gedcom-tree-chevron")).toBeNull();
    expect(row.textContent).not.toContain("—");
    expect(row.textContent).not.toContain("Y");
  });

  it("draws a line with no value without a value or a dash", () => {
    draw(make(["0 @I1@ INDI", "1 _EMPTY"]));
    const row = rowNamed("_EMPTY");

    expect(row.querySelector(".gedcom-tree-main")?.textContent).toBe("");
  });

  it("names a sex as a choice and a value as a field that cannot be changed", () => {
    draw(make(["0 @I1@ INDI", "1 SEX F", "1 _NOTE_X plain"]));
    const sex = rowNamed("Sex").querySelector<HTMLElement>(".gedcom-field");

    expect(sex?.getAttribute("data-kind")).toBe("choice");
    expect(sex?.getAttribute("data-value")).toBe("Female");
    const area = rowNamed("_NOTE_X").querySelector("textarea");
    expect(area?.hasAttribute("readonly")).toBe(true);
    expect(area?.getAttribute("tabindex")).toBe("-1");
  });

  it("lays a value written right to left out in its own direction", () => {
    draw(make(["0 @I1@ INDI", "1 _TEXT שלום עולם"]));

    expect(rowNamed("_TEXT").querySelector("textarea")?.getAttribute("dir")).toBe("auto");
  });

  it("joins a continued value to its line", () => {
    draw(make(["0 @I1@ INDI", "1 _TEXT first", "2 CONT second", "1 NOTE note", "2 CONC  more"]));

    expect(valuesOf(rowNamed("_TEXT"))).toEqual(["first\nsecond"]);
    expect(rowNamed("Note").querySelector(".gedcom-detail-text-body")?.textContent).toBe("note more");
  });

  it("shows an escaped at sign as one", () => {
    draw(make(["0 @I1@ INDI", "1 _MAIL write to me@@example.org"]));

    expect(valuesOf(rowNamed("_MAIL"))).toEqual(["write to me@example.org"]);
  });
});

describe("a pointer", () => {
  const family = ["0 @I1@ INDI", "1 FAMS @F1@", "0 @F1@ FAM", "1 HUSB @I1@"];

  it("is the name of the record it points at, as a link that selects it, and never its identifier", () => {
    draw(make(["0 @I1@ INDI", "1 ASSO @I2@", "0 @I2@ INDI", "1 NAME Pierre /Curie/"]));
    const link = rowNamed("Associated person").querySelector<HTMLButtonElement>("button.gedcom-desk-link");

    expect(link?.textContent).toBe("Pierre Curie");
    expect(box.textContent).not.toContain("@I2@");
    link?.click();
    expect(opened).toHaveBeenCalledWith("@I2@");
  });

  it("is a family's name in the row of the link to it", () => {
    draw(make(family));

    expect(rowNamed("Spouse in family").querySelector("button.gedcom-desk-link")).not.toBeNull();
  });

  it("is a pointer to a record that is not in the file with one way to the source, not two", () => {
    const made = make(["0 @I1@ INDI", "1 ASSO @I9@"]);
    draw(made);
    const row = rowNamed("Associated person");

    expect(row.textContent).toContain("Points to a record that is not in the file");
    const buttons = row.querySelectorAll<HTMLButtonElement>(".gedcom-desk-missing button");
    expect(buttons).toHaveLength(1);
    buttons[0]?.click();
    expect(shown).toHaveBeenCalledWith(made.record.children[0]?.range);
  });

  it("has a way to its line in the summary of a closed node that points to a record not in the file, and never two once it is open", () => {
    const made = make(["0 @I1@ INDI", "1 ASSO @I9@", "2 RELA friend"]);
    draw(made);
    const row = rowNamed("Associated person");
    const actions = (): HTMLButtonElement[] => [...row.querySelectorAll<HTMLButtonElement>("button.gedcom-desk-link")];

    expect(actions().map((one) => one.textContent)).toEqual(["Show in source"]);
    actions()[0]?.click();
    expect(shown).toHaveBeenCalledWith(made.record.children[0]?.range);
    open("Associated person");
    expect(actions()).toHaveLength(1);
    open("Associated person");
    expect(actions()).toHaveLength(1);
  });

  it("is the text of a shared note and the citation beneath it, drawn where the pointer is", () => {
    const made = make([
      "0 @I1@ INDI", "1 SNOTE @N1@",
      "0 @N1@ SNOTE The shared text", "1 SOUR @S1@", "2 PAGE p. 4",
      "0 @S1@ SOUR", "1 TITL Register",
    ]);
    draw(made);
    const row = rowNamed("Shared note");

    expect(row.querySelector(".gedcom-detail-text-body")?.textContent).toBe("The shared text");
    expect(row.textContent).toContain("Register");
    expect(row.textContent).toContain("p. 4");
  });

  it("is the text of a shared note in 5.5.1", () => {
    draw(make(["0 @I1@ INDI", "1 NOTE @N1@", "0 @N1@ NOTE The only person to have won"], "5.5.1"));

    expect(rowNamed("Note").querySelector(".gedcom-detail-text-body")?.textContent).toBe("The only person to have won");
  });
});

describe("a note", () => {
  const long = (name: string): string[] => [`1 NOTE ${name}`, ...Array.from({ length: 11 }, (_, at) => `2 CONT line ${at}`)];

  it("shows a short note in full with no control to show more", () => {
    draw(make(["0 @I1@ INDI", "1 NOTE Left Poland in 1891."]));

    expect(rowNamed("Note").querySelector(".gedcom-detail-text-body")?.textContent).toBe("Left Poland in 1891.");
    expect(rowNamed("Note").querySelector(".gedcom-detail-more")).toBeNull();
  });

  it("shows the first five lines of a long one and a control that shows the rest and folds it again", () => {
    draw(make(["0 @I1@ INDI", ...long("first")]));
    const row = rowNamed("Note");
    const body = (): string[] => (row.querySelector(".gedcom-detail-text-body")?.textContent ?? "").split("\n");
    const more = row.querySelector<HTMLButtonElement>(".gedcom-detail-more");

    expect(body()).toHaveLength(5);
    more?.click();
    expect(body()).toHaveLength(12);
    more?.click();
    expect(body()).toHaveLength(5);
  });
});

describe("the root of the tree", () => {
  const root = (): HTMLElement => {
    const found = box.querySelector<HTMLElement>(".gedcom-tree-node.is-root > .gedcom-tree-row");
    if (!found) {
      throw new Error("no root");
    }
    return found;
  };
  const record = (xref: string, lines: string[]): Made => make(lines, "7.0", xref);

  it("is the opening line of a person, named Person, open at first, with no summary and no identifier", () => {
    draw(make(["0 @I1@ INDI", "1 NAME Maria /Curie/", "1 SEX F"]));

    expect(labelOf(root())).toBe("Person");
    expect(summaryOf(root())).toBeUndefined();
    expect(root().querySelector(".gedcom-tree-chevron")?.getAttribute("aria-expanded")).toBe("true");
    expect(rows().map(labelOf)).toEqual(["Name", "Sex"]);
    expect(box.textContent).not.toContain("@I1@");
  });

  it("shows the name of the person once it is closed, and hides every line beneath it", () => {
    draw(make(["0 @I1@ INDI", "1 NAME Maria /Curie/", "1 SEX F"]));
    chevron(root()).click();

    expect(summaryOf(root())).toBe("Maria Curie");
    expect(box.querySelector(".gedcom-tree-node.is-root > .gedcom-tree-children")?.hasAttribute("hidden")).toBe(true);
    chevron(root()).click();
    expect(summaryOf(root())).toBeUndefined();
  });

  it("is a family named Family with the spouses as its summary, and a source named Source with its title", () => {
    draw(record("@F1@", ["0 @I1@ INDI", "1 NAME Anna /Nowak/", "0 @I2@ INDI", "1 NAME Jan /Nowak/", "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@"]));
    expect(labelOf(root())).toBe("Family");
    chevron(root()).click();
    expect(summaryOf(root())).toBe("Jan Nowak ⚭ Anna Nowak");

    box.replaceChildren();
    draw(record("@S1@", ["0 @S1@ SOUR", "1 TITL The Register"]));
    expect(labelOf(root())).toBe("Source");
    chevron(root()).click();
    expect(summaryOf(root())).toBe("The Register");
  });

  it("is named Person in Russian", () => {
    const made = make(["0 @I1@ INDI", "1 NAME Maria /Curie/"]);
    draw(made);
    box.replaceChildren();
    setLanguage("ru");
    draw(made);
    expect(labelOf(root())).toBe("Человек");
  });

  it("is opened and closed by the toggle with the rest", () => {
    draw(make(["0 @I1@ INDI", "1 NAME A /B/", "2 NICK Ab"]));
    control("Open every node").click();
    expect(rows().map(labelOf)).toEqual(["Name", "Nickname"]);
    control("Close every node").click();
    expect(root().querySelector(".gedcom-tree-chevron")?.getAttribute("aria-expanded")).toBe("false");
    control("Open every node").click();
    expect(root().querySelector(".gedcom-tree-chevron")?.getAttribute("aria-expanded")).toBe("true");
  });

  it("keeps the focus keys of the root apart from those of its children", () => {
    draw(make(["0 @I1@ INDI", "1 NAME A /B/"]));
    const keys = [...box.querySelectorAll("[data-focus-key]")].map((one) => one.getAttribute("data-focus-key") ?? "");

    expect(keys).toEqual(expect.arrayContaining(["t:", "tree:toggle"]));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("a shared note in a node", () => {
  const made = (): Made =>
    make([
      "0 @I1@ INDI", "1 SNOTE @N1@", "2 _X y",
      "0 @N1@ SNOTE shared", ...Array.from({ length: 11 }, (_, at) => `1 CONT line ${at}`),
      "1 NOTE inside", ...Array.from({ length: 11 }, (_, at) => `2 CONT inner ${at}`),
    ]);

  it("stays shown in full when the node is closed and opened again", () => {
    draw(made());
    open("Shared note");
    const more = (): HTMLButtonElement[] => [...box.querySelectorAll<HTMLButtonElement>(".gedcom-detail-more")];
    more().forEach((button) => {
      button.click();
    });
    expect(more().map((button) => button.getAttribute("aria-expanded"))).toEqual(["true", "true"]);

    open("Shared note");
    open("Shared note");
    expect(more().map((button) => button.getAttribute("aria-expanded"))).toEqual(["true", "true"]);
    expect(more().map((button) => button.getAttribute("data-focus-key"))).toEqual(["note:SNOTE[0].0", "note:SNOTE[0].1"]);
  });
});

describe("a name", () => {
  const maria = ["0 @I1@ INDI", "1 NAME Maria /Skłodowska/", "2 TYPE BIRTH", "2 GIVN Maria"];

  it("is a node whose summary reads the name without its slashes, and whose type and parts show once it is opened", () => {
    draw(make(maria));

    expect(summaryOf(rowNamed("Name"))).toBe("Maria Skłodowska");
    open("Name");
    expect(rows().map(labelOf)).toEqual(["Name", "Type", "Given names"]);
    expect(valuesOf(rowNamed("Type"))).toEqual(["Birth"]);
    expect(rowNamed("Type").querySelector(".gedcom-field")?.getAttribute("data-kind")).toBe("choice");
    expect(valuesOf(rowNamed("Given names"))).toEqual(["Maria"]);
  });

  it("reads the type the same in a 5.5.1 file", () => {
    draw(make(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 TYPE married"], "5.5.1"));
    open("Name");

    expect(valuesOf(rowNamed("Type"))).toEqual(["Married"]);
  });

  it("reads the type in Russian", () => {
    setLanguage("ru");
    draw(make(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 TYPE MARRIED"]));
    open("Имя");

    expect(valuesOf(rowNamed("Тип"))).toEqual(["В браке"]);
  });

  it("shows the placeholder for a name that is only a placeholder", () => {
    draw(make(["0 @I1@ INDI", "1 NAME //", "2 NICK Manya"]));

    expect(summaryOf(rowNamed("Name"))).toBe("Unnamed");
  });

  it("names the chevrons of two names apart by their place among the siblings", () => {
    draw(make(["0 @I1@ INDI", "1 NAME A /B/", "2 NICK Ab", "1 NAME C /D/", "2 NICK Cd", "1 SEX F"]));

    expect(chevron(rowNamed("Name", 0)).getAttribute("aria-label")).toBe("Name 1");
    expect(chevron(rowNamed("Name", 1)).getAttribute("aria-label")).toBe("Name 2");
  });

  it("reads a type as written where it is not under a name", () => {
    draw(make(["0 @I1@ INDI", "1 EVEN Prize", "2 TYPE BIRTH"]));
    open("Event");

    expect(valuesOf(rowNamed("Type"))).toEqual(["BIRTH"]);
    expect(rowNamed("Type").querySelector(".gedcom-field")?.getAttribute("data-kind")).toBe("text");
  });
});

describe("the summary of a closed node", () => {
  it("is the date and the place of an event as the file writes them", () => {
    const made = { index: curieIndex(), xref: "@I1@" } as unknown as Made;
    made.record = made.index.record("@I1@") as RecordLine;
    draw(made);

    expect(summaryOf(rowNamed("Birth"))).toBe("7 NOV 1867 · Warsaw, Congress Poland");
    expect(summaryOf(rowNamed("Death"))).toBe("4 JUL 1934 · Passy, Haute-Savoie, France");
  });

  it("is the value, then the date, of an attribute, and the value alone once it is opened", () => {
    draw(make(["0 @I1@ INDI", "1 OCCU Physicist", "2 DATE 1900"]));

    expect(summaryOf(rowNamed("Occupation"))).toBe("Physicist · 1900");
    open("Occupation");
    expect(summaryOf(rowNamed("Occupation"))).toBeUndefined();
    expect(valuesOf(rowNamed("Occupation"))).toEqual(["Physicist"]);
    expect(valuesOf(rowNamed("Date"))).toEqual(["1900"]);
  });

  it("leaves out what the line does not state, with no dash", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 PLAC Warsaw"]));

    expect(summaryOf(rowNamed("Birth"))).toBe("Warsaw");
  });

  it("is the value alone for a line the page does not know as an event", () => {
    const made = make(["0 @S1@ SOUR", "1 TITL The Book", "2 DATE 1900", "2 PLAC Paris"], "7.0", "@S1@");
    draw(made);

    expect(summaryOf(rowNamed("Title"))).toBe("The Book");
  });

  it("is the first line of a value of several lines", () => {
    draw(make(["0 @I1@ INDI", "1 _TEXT first", "2 CONT second", "2 _X y"]));

    expect(summaryOf(rowNamed("_TEXT"))).toBe("first");
  });

  it("is the name of the record a pointer node names", () => {
    draw(make(["0 @I1@ INDI", "1 ASSO @I2@", "2 RELA friend", "0 @I2@ INDI", "1 NAME Pierre /Curie/"], "5.5.1"));

    expect(summaryOf(rowNamed("Associated person"))).toBe("Pierre Curie");
  });

  it("is nothing for a node with nothing to say, the label alone", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 _X y"]));

    expect(summaryOf(rowNamed("Birth"))).toBeUndefined();
  });

  it("is followed by a quiet dot that says how many sources it cites, and by none where it cites none", () => {
    draw(make([
      "0 @I1@ INDI", "1 BIRT", "2 DATE 1900", "2 SOUR @S1@", "2 SOUR @S2@", "1 DEAT", "2 DATE 1950",
      "0 @S1@ SOUR", "1 TITL A", "0 @S2@ SOUR", "1 TITL B",
    ]));

    expect(rowNamed("Birth").querySelector(".gedcom-desk-source")?.getAttribute("aria-label")).toBe("2 sources");
    expect(rowNamed("Death").querySelector(".gedcom-desk-source")).toBeNull();
    open("Birth");
    expect(rowNamed("Birth").querySelector(".gedcom-desk-source")).toBeNull();
    expect(rows().map(labelOf)).toContain("Source");
  });
});

describe("the nodes", () => {
  it("are keyed by their place in the record, and closed at first with their children not yet drawn", () => {
    draw(make(["0 @I1@ INDI", "1 NAME A /B/", "1 NAME C /D/", "2 TYPE MARRIED", "2 NICK Cd"]));

    expect(rows()).toHaveLength(2);
    const second = rowNamed("Name", 1);
    const button = chevron(second);
    const container = box.querySelector<HTMLElement>(`#${button.getAttribute("aria-controls")}`);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(container?.hasAttribute("hidden")).toBe(true);
    expect(container?.childElementCount).toBe(0);

    button.click();
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(container?.hasAttribute("hidden")).toBe(false);
    expect([...box.querySelectorAll<HTMLElement>(".gedcom-tree-node")].map((node) => node.getAttribute("data-key"))).toEqual([
      "", "NAME[0]", "NAME[1]", "NAME[1].TYPE[0]", "NAME[1].NICK[0]",
    ]);
  });

  it("keep what the reader opened through a redraw, however the notes were opened", () => {
    const made = make([
      "0 @I1@ INDI", "1 NOTE first", ...Array.from({ length: 11 }, (_, at) => `2 CONT a ${at}`),
      "1 NOTE second", ...Array.from({ length: 11 }, (_, at) => `2 CONT b ${at}`),
    ]);
    const state = new TreeSession().stateFor("rec");
    draw(made, state);
    const more = (): HTMLButtonElement[] => [...box.querySelectorAll<HTMLButtonElement>(".gedcom-detail-more")];
    more()[1]?.click();
    more()[0]?.click();

    box.replaceChildren();
    draw(made, state);
    expect(more().map((button) => button.getAttribute("aria-expanded"))).toEqual(["true", "true"]);
    expect(more().map((button) => button.getAttribute("data-focus-key"))).toEqual(["note:NOTE[0]", "note:NOTE[1]"]);
  });

  it("draw their children as open when the state says so", () => {
    const state = new TreeSession().stateFor("rec");
    state.setOpen("NAME[0]", true);
    draw(make(["0 @I1@ INDI", "1 NAME A /B/", "2 NICK Ab"]), state);

    expect(rows().map(labelOf)).toEqual(["Name", "Nickname"]);
  });

  it("carry the depth of their line", () => {
    draw(make(["0 @I1@ INDI", "1 _A x", "2 _B y", "3 _C z"]));
    control("Open every node").click();

    expect([...box.querySelectorAll(".gedcom-tree-node")].map((node) => node.getAttribute("data-depth"))).toEqual(["0", "1", "2", "3"]);
  });
});

describe("a fact", () => {
  const marie = (): Made => {
    const index = curieIndex();
    return { index, xref: "@I1@", record: index.record("@I1@") as RecordLine } as Made;
  };

  it("has a label that is text for every fact, and a press on a leaf's label opens nothing", () => {
    draw(marie());

    expect(box.querySelector("button.gedcom-tree-label, .is-fact")).toBeNull();
    rowNamed("Sex").querySelector(".gedcom-tree-label")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(opened).not.toHaveBeenCalled();
  });

  it("shows the place in the summary as text, and its row as a field with nothing beside it that opens a place", () => {
    draw(marie());
    const summary = rowNamed("Birth").querySelector<HTMLElement>(".gedcom-tree-summary");
    expect(summary?.querySelector(".is-place")?.textContent).toBe("Warsaw, Congress Poland");
    expect(summary?.querySelector("button, a, [role=button]")).toBeNull();

    open("Birth");
    expect(valuesOf(rowNamed("Place"))).toEqual(["Warsaw, Congress Poland"]);
    expect(rowNamed("Place").querySelector(".gedcom-tree-place")).toBeNull();
    expect(opened).not.toHaveBeenCalled();
  });

  it("shows the summary of a fact and its place as text while the label is text", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900", "2 PLAC Paris"]));

    expect(summaryOf(rowNamed("Birth"))).toBe("1900 · Paris");
    rowNamed("Birth").querySelector<HTMLElement>(".gedcom-tree-summary .is-place")?.click();
    expect(opened).not.toHaveBeenCalled();
  });

  it("is a residence whose place is text", () => {
    draw(make(["0 @I1@ INDI", "1 RESI", "2 PLAC Paris", "2 DATE 1895", "0 @I2@ INDI", "1 RESI", "2 PLAC Paris"]));

    expect(rowNamed("Residence").querySelector(".gedcom-tree-summary .is-place")?.textContent).toBe("Paris");
  });
});

describe("the controls", () => {
  it("are buttons that say whether their node is open and which part they control, and answer Enter and Space", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900", "1 SEX F"]));
    const arrow = chevron(rowNamed("Birth"));

    expect(arrow.tagName).toBe("DIV");
    expect(arrow.getAttribute("role")).toBe("button");
    expect(arrow.getAttribute("tabindex")).toBe("0");
    expect(arrow.getAttribute("aria-label")).toBe("Birth");
    expect(arrow.getAttribute("aria-expanded")).toBe("false");
    expect(box.querySelector(`#${arrow.getAttribute("aria-controls")}`)).not.toBeNull();
    arrow.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(arrow.getAttribute("aria-expanded")).toBe("true");
    arrow.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true }));
    expect(arrow.getAttribute("aria-expanded")).toBe("false");
    expect(box.querySelector(".gedcom-tree-source")).toBeNull();
  });

  it("mark a closed node and its arrow as collapsed, in step with every opening and closing, and draw the app's triangle", () => {
    const icons: string[] = [];
    const made = make(["0 @I1@ INDI", "1 _A x", "2 _B y", "1 _D w", "2 _E v"]);
    renderTree(box, made.record, {
      index: made.index,
      host: { openRecord: opened, showInSource: shown, setIcon: (_, icon) => icons.push(icon) },
      facts: new Map(),
      state: ephemeralTreeState(),
    });
    const collapsed = (label: string): boolean[] => {
      const row = rowNamed(label);
      return [row.closest(".tree-item")?.classList.contains("is-collapsed") ?? false, chevron(row).classList.contains("is-collapsed")];
    };

    expect(icons).toContain("right-triangle");
    expect(collapsed("_A")).toEqual([true, true]);
    chevron(rowNamed("_A")).click();
    expect(collapsed("_A")).toEqual([false, false]);
    expect(collapsed("_D")).toEqual([true, true]);
    control("Open every node").click();
    expect(collapsed("_D")).toEqual([false, false]);
    control("Close every node").click();
    expect(collapsed("_A")).toEqual([true, true]);
    expect(box.querySelector(".is-root")?.classList.contains("is-collapsed")).toBe(true);
  });

  it("have the toolbar first in the tree, and the arrow first in its row", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900"]));

    expect(box.querySelector(".gedcom-tree")?.firstElementChild?.className).toContain("gedcom-tree-bar");
    expect(rowNamed("Birth").firstElementChild?.className).toContain("gedcom-tree-chevron");
  });

  it("has an always shown header with one focusable icon button, as the file explorer has", () => {
    draw(make(["0 @I1@ INDI", "1 _A x", "2 _B y"]));
    const bar = box.querySelector(".gedcom-tree > .gedcom-tree-bar");
    const toggle = bar?.querySelector(".nav-buttons-container > div.gedcom-tree-toggle");

    expect(bar?.classList.contains("nav-header")).toBe(true);
    expect(toggle?.classList.contains("clickable-icon")).toBe(true);
    expect(toggle?.classList.contains("nav-action-button")).toBe(true);
    expect(toggle?.getAttribute("role")).toBe("button");
    expect(toggle?.getAttribute("tabindex")).toBe("0");
    expect(bar?.querySelectorAll("button, .gedcom-tree-control")).toHaveLength(1);
  });

  it("opens and closes every node from the keyboard with Enter and Space", () => {
    draw(make(["0 @I1@ INDI", "1 _A x", "2 _B y"]));
    const toggle = control("Open every node");
    const press = (key: string): void => {
      toggle.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    };

    press("Enter");
    expect(toggle.getAttribute("aria-label")).toBe("Close every node");
    expect(box.querySelectorAll('.gedcom-tree-chevron[aria-expanded="false"]')).toHaveLength(0);
    press(" ");
    expect(toggle.getAttribute("aria-label")).toBe("Open every node");
    press("a");
    expect(toggle.getAttribute("aria-label")).toBe("Open every node");
  });

  it("open every node of the record, drawing what is beneath each as it is opened, and close them again, the focus staying on the control", () => {
    draw(make(["0 @I1@ INDI", "1 _A x", "2 _B y", "3 _C z", "1 _D w", "2 _E v"]));
    const all = control("Open every node");
    all.focus();
    all.click();

    expect(rows().map(labelOf)).toEqual(["_A", "_B", "_C", "_D", "_E"]);
    expect(box.querySelectorAll('.gedcom-tree-chevron[aria-expanded="true"]')).toHaveLength(4);
    expect(document.activeElement).toBe(all);

    control("Close every node").click();
    expect(box.querySelectorAll('.gedcom-tree-chevron[aria-expanded="true"]')).toHaveLength(0);
    expect(box.querySelector('.gedcom-tree-node[data-key="_A[0]"] > .gedcom-tree-children')?.hasAttribute("hidden")).toBe(true);
  });

  it("is one icon that says what it will do now, and flips as nodes are opened and closed, one by one or all at once", () => {
    const icons: string[] = [];
    const made = make(["0 @I1@ INDI", "1 _A x", "2 _B y", "1 _D w", "2 _E v"]);
    renderTree(box, made.record, {
      index: made.index,
      host: { openRecord: opened, showInSource: shown, setIcon: (_, icon) => { if (icon.startsWith("chevrons")) { icons.push(icon); } } },
      facts: new Map(),
      state: ephemeralTreeState(),
    });
    const toggle = box.querySelector<HTMLElement>(".gedcom-tree-toggle");

    expect(toggle?.getAttribute("aria-label")).toBe("Open every node");
    expect(icons.at(-1)).toBe("chevrons-up-down");
    toggle?.click();
    expect(toggle?.getAttribute("aria-label")).toBe("Close every node");
    expect(icons.at(-1)).toBe("chevrons-down-up");
    chevron(rowNamed("_A")).click();
    expect(toggle?.getAttribute("aria-label")).toBe("Open every node");
    expect(icons.at(-1)).toBe("chevrons-up-down");
    chevron(rowNamed("_A")).click();
    expect(toggle?.getAttribute("aria-label")).toBe("Close every node");
    toggle?.click();
    expect(box.querySelectorAll('.gedcom-tree-chevron[aria-expanded="true"]')).toHaveLength(0);
    expect(toggle?.getAttribute("data-focus-key")).toBe("tree:toggle");
  });

  it("carry focus keys that are unique and never an identifier, and every row carries its line", () => {
    const index = curieIndex();
    draw({ index, xref: "@I1@", record: index.record("@I1@") as RecordLine } as Made);
    control("Open every node").click();
    const keys = [...box.querySelectorAll("[data-focus-key]")].map((one) => one.getAttribute("data-focus-key") ?? "");

    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => /^@[^@]+@$/u.test(key))).toEqual([]);
    expect(keys).toContain("tree:toggle");
    expect(keys.some((key) => key.startsWith("src:"))).toBe(false);
    expect(rows().every((row) => row.hasAttribute("data-line"))).toBe(true);
  });
});

describe("the tags", () => {
  it("are never shown for a tag the standard names, nor a level number, nor an identifier, and a custom tag is its own label", () => {
    draw(make(["0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "1 _X y"]));

    expect(box.querySelector(".gedcom-tree-tag")).toBeNull();
    expect(box.textContent).not.toMatch(/NAME|BIRT|INDI|@I1@/u);
    expect(rows().map(labelOf)).toEqual(["Name", "Birth", "_X"]);
    expect([...box.querySelectorAll(".gedcom-tree-control")].map((one) => one.className)).toHaveLength(1);
  });
});

describe("the tree changes nothing", () => {
  it("leaves the document as it was after opening, closing, pressing and opening every node", () => {
    const made = make(["0 @I1@ INDI", "1 NAME A /B/", "2 NICK Ab", "1 ASSO @I2@", "1 SEX F", "0 @I2@ INDI", "1 NAME P /C/"]);
    const before = JSON.stringify(made.service.getDocumentSymbols());
    draw(made);
    open("Name");
    chevron(rowNamed("Name")).click();
    rowNamed("Associated person").querySelector<HTMLButtonElement>("button.gedcom-desk-link")?.click();
    control("Open every node").click();
    rowNamed("Sex").querySelector("textarea")?.dispatchEvent(new Event("input", { bubbles: true }));

    expect(JSON.stringify(made.service.getDocumentSymbols())).toBe(before);
    expect(box.querySelectorAll("textarea:not([readonly])")).toHaveLength(0);
    expect(shown).not.toHaveBeenCalled();
  });
});

const fieldOf = (row: Element): HTMLTextAreaElement => {
  const found = row.querySelector<HTMLTextAreaElement>("textarea.gedcom-field-input");
  if (!found) {
    throw new Error("no field");
  }
  return found;
};
const type = (area: HTMLTextAreaElement, text: string): void => {
  area.focus();
  area.value = text;
  area.dispatchEvent(new Event("input", { bubbles: true }));
};
const press = (area: HTMLElement, key: string, init: KeyboardEventInit = {}): void => {
  area.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));
};
const messageOf = (control: Element): string | undefined => {
  const id = control.getAttribute("aria-describedby");
  return id === null ? undefined : (document.getElementById(id)?.textContent ?? undefined);
};

describe("a value in its field", () => {
  it("is written on Enter, and the row shows it", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"]);
    open("Name");
    const area = fieldOf(rowNamed("Given names"));

    type(area, "Marie");
    press(area, "Enter");

    expect(fileLines(tab)).toContain("2 GIVN Marie");
    expect(valuesOf(rowNamed("Given names"))).toEqual(["Marie"]);
  });

  it("holds a name with its slashes while it has the focus, and leaving it untouched writes nothing", async () => {
    const { tab } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/"]);
    const area = fieldOf(rowNamed("Name"));

    expect(area.value).toBe("Maria Curie");
    area.focus();
    expect(area.value).toBe("Maria /Curie/");
    area.blur();
    await settled();
    expect(tab.writes).toBe(0);
    expect(area.value).toBe("Maria Curie");
  });

  it("holds a 5.5.1 sex as the letter the file writes, and leaving it untouched writes nothing", async () => {
    const { tab } = editing(["0 @I1@ INDI", "1 SEX F"], "5.5.1");
    const area = fieldOf(rowNamed("Sex"));

    expect(area.value).toBe("Female");
    area.focus();
    expect(area.value).toBe("F");
    area.blur();
    await settled();
    expect(tab.writes).toBe(0);
  });

  it("is written once for Enter and then leaving the field", async () => {
    const tab = new TextTab([...HEAD["7.0"], "0 @I1@ INDI", "1 _MILITARY Cavalry", "0 TRLR"].join("\n"));
    const index = buildIndex(tab.service());
    renderTree(box, index.record("@I1@") as RecordLine, {
      index,
      host: { openRecord: opened, showInSource: shown, setValueAt: (at, input) => commit(tab, setValueAt(tab.service(), at, tab.version, input)) },
      facts: new Map(),
      state: ephemeralTreeState(),
    });
    const area = fieldOf(rowNamed("_MILITARY"));

    type(area, "Hussar");
    press(area, "Enter");
    area.blur();
    await settled();
    expect(tab.writes).toBe(1);
    expect(fileLines(tab)).toContain("1 _MILITARY Hussar");
  });

  it("is not written by the Enter that confirms a composed character", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const area = fieldOf(rowNamed("_MILITARY"));

    type(area, "騎兵");
    press(area, "Enter", { isComposing: true });
    expect(tab.writes).toBe(0);
    press(area, "Enter");
    expect(fileLines(tab)).toContain("1 _MILITARY 騎兵");
  });

  it("sends a pasted line break in a date to the service, which refuses it and says why", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900"]);
    open("Birth");
    const area = fieldOf(rowNamed("Date"));

    type(area, "1 JAN\n1900");
    press(area, "Enter");
    expect(tab.writes).toBe(0);
    expect(area.value).toBe("1 JAN\n1900");
    expect(messageOf(area)).toBe("A line break is not allowed in this value: it keeps to one line.");
  });

  it("writes an occupation on Enter, where a line break is not the ordinary case", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 OCCU Physicist"]);
    const area = fieldOf(rowNamed("Occupation"));

    type(area, "Chemist");
    press(area, "Enter");
    expect(fileLines(tab)).toContain("1 OCCU Chemist");
  });

  it("writes an emptied given name as the service writes it", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"]);
    open("Name");
    const area = fieldOf(rowNamed("Given names"));

    type(area, "");
    press(area, "Enter");
    expect(fileLines(tab)).toEqual(expect.arrayContaining(["1 NAME /Curie/", "2 GIVN"]));
  });

  it("takes Enter as a new line in a note, and is written with a continuation when it is left", async () => {
    const { tab } = editing(["0 @I1@ INDI", "1 NOTE first"]);
    const area = fieldOf(rowNamed("Note"));

    type(area, "one\ntwo");
    press(area, "Enter");
    expect(tab.writes).toBe(0);
    area.blur();
    await settled();
    expect(fileLines(tab)).toEqual(expect.arrayContaining(["1 NOTE one", "2 CONT two"]));
  });

  it("puts back the value the file holds on Escape, writes nothing, and keeps the focus", async () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const area = fieldOf(rowNamed("_MILITARY"));

    type(area, "Hussar");
    press(area, "Escape");
    expect(area.value).toBe("Cavalry");
    expect(document.activeElement).toBe(area);
    area.blur();
    await settled();
    expect(tab.writes).toBe(0);
  });

  it("has a control that puts back the file's value, for a phone, where there is no Escape", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const area = fieldOf(rowNamed("_MILITARY"));

    type(area, "Hussar");
    const revert = rowNamed("_MILITARY").querySelector<HTMLElement>(".gedcom-field-revert");
    expect(revert?.getAttribute("aria-label")).toBe("Put back the value the file holds");
    expect(area.closest(".gedcom-field")?.classList.contains("is-changed")).toBe(true);
    revert?.click();
    expect(area.value).toBe("Cavalry");
    expect(tab.writes).toBe(0);
  });

  it("sends an emptied field to the service, which refuses an empty sex and says why under it", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 SEX F"], "5.5.1");
    const area = fieldOf(rowNamed("Sex"));

    type(area, "");
    press(area, "Enter");

    expect(tab.writes).toBe(0);
    expect(messageOf(area)).toBe("The standard requires a value here.");
    expect(area.getAttribute("aria-invalid")).toBe("true");
    expect(host.announce).toHaveBeenCalledWith("The standard requires a value here.");
    type(area, "M");
    expect(messageOf(area)).toBeUndefined();
  });

  it("folds a long note until the focus is put in it", () => {
    editing(["0 @I1@ INDI", "1 NOTE first", ...Array.from({ length: 7 }, (_, at) => `2 CONT line ${at}`)]);
    const area = fieldOf(rowNamed("Note"));

    expect(area.closest(".gedcom-field")?.classList.contains("is-folded")).toBe(true);
    area.focus();
    expect(area.closest(".gedcom-field")?.classList.contains("is-folded")).toBe(false);
  });

  it("is not a field for a shared note's text, nor for the Y of an event", () => {
    editing(["0 @I1@ INDI", "1 SNOTE @N1@", "1 DEAT Y", "0 @N1@ SNOTE The shared text"]);

    expect(rowNamed("Shared note").querySelector("textarea:not([readonly])")).toBeNull();
    expect(rowNamed("Death").querySelector("textarea")).toBeNull();
  });

  it("writes a value refused for not being in the list nowhere, and says why", () => {
    const setValueAt = vi.fn<NonNullable<TreeHost["setValueAt"]>>(() => ({ ok: false, code: "value-not-in-enum", message: "Value for X should be in set" }));
    editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"], "7.0", "@I1@", { setValueAt });
    const area = fieldOf(rowNamed("_MILITARY"));

    type(area, "Hussar");
    press(area, "Enter");
    expect(messageOf(area)).toBe("This value is not one of those the standard lists here.");
    expect(area.value).toBe("Hussar");
  });

  it("says that a date does not exist, in English and in Russian", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 7 NOV 1867"]);
    open("Birth");
    const area = fieldOf(rowNamed("Date"));

    type(area, "31 NOV 1867");
    press(area, "Enter");
    expect(tab.writes).toBe(0);
    expect(messageOf(area)).toBe("There is no November 31: November has 30 days.");
    setLanguage("ru");
    press(area, "Enter");
    expect(messageOf(area)).toBe("Даты «31 ноября» не бывает: ноябрь длится 30 дней.");
  });

  it("shows a warning that came with a written value under its field, through the redraw", () => {
    const { host } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const area = fieldOf(rowNamed("_MILITARY"));

    type(area, "Hussar");
    press(area, "Enter");
    const after = fieldOf(rowNamed("_MILITARY"));
    expect(messageOf(after)).toContain("_MILITARY");
    expect(after.getAttribute("aria-invalid")).toBeNull();
    expect(host.announce).toHaveBeenCalledWith(expect.stringContaining("_MILITARY"));
  });

  it("keeps what was typed and says the file changed where the text moved since the card was drawn", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const area = fieldOf(rowNamed("_MILITARY"));
    tab.replace(tab.text.replace("0 @I1@ INDI", "0 @I1@ INDI\n1 SEX F"));

    type(area, "Hussar");
    press(area, "Enter");

    expect(fileLines(tab)).toContain("1 _MILITARY Cavalry");
    const after = fieldOf(rowNamed("_MILITARY"));
    expect(after.value).toBe("Hussar");
    expect(messageOf(after)).toContain("The file changed");
  });
});

describe("a value from a list", () => {
  it("writes the standard's value of the chosen one", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 SEX F"]);
    const select = rowNamed("Sex").querySelector<HTMLSelectElement>("select");
    if (!select) {
      throw new Error("no select");
    }

    select.value = "M";
    select.dispatchEvent(new Event("change"));
    expect(fileLines(tab)).toContain("1 SEX M");
    expect(rowNamed("Sex").querySelector<HTMLSelectElement>("select")?.selectedOptions[0]?.textContent).toBe("Male");
  });

  it("is a menu of checked values where the line may hold several, written as the standard's list", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 RESN CONFIDENTIAL"]);
    const button = rowNamed("Restriction").querySelector<HTMLElement>(".gedcom-tree-several");

    expect(button?.textContent).toBe("CONFIDENTIAL");
    button?.click();
    const values = host.chooseValues.mock.calls[0]?.[1] ?? [];
    expect(values.map((one) => [one.title, one.checked])).toEqual([["CONFIDENTIAL", true], ["LOCKED", false], ["PRIVACY", false]]);
    values[2]?.toggle();
    expect(fileLines(tab)).toContain("1 RESN CONFIDENTIAL, PRIVACY");
  });
});

describe("a pointer pointed at another record", () => {
  it("writes the record chosen in the list", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 ASSO @I2@", "2 ROLE FRIEND", "0 @I2@ INDI", "1 NAME Pierre /Curie/", "0 @I3@ INDI", "1 NAME Irène /Curie/"]);
    open("Associated person");
    rowNamed("Associated person").querySelector<HTMLElement>(".gedcom-tree-pick")?.click();
    host.choosePointer.mock.calls[0]?.[1]("@I3@");

    expect(fileLines(tab)).toContain("1 ASSO @I3@");
    expect(rowNamed("Associated person").querySelector("button.gedcom-desk-link")?.textContent).toBe("Irène Curie");
  });

  it("offers no list for a pointer the standard pairs, and says it is changed on the other record", () => {
    editing(["0 @I1@ INDI", "1 FAMS @F1@", "0 @F1@ FAM", "1 WIFE @I1@", "0 @F2@ FAM"]);
    const row = rowNamed("Spouse in family");

    expect(row.querySelector(".gedcom-tree-pick")).toBeNull();
    expect(row.querySelector(".gedcom-tree-paired")?.textContent).toBe("This link is changed on the other record.");
  });
});

describe("a place", () => {
  it("is a field that writes the place, as any value", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 BIRT", "2 PLAC Paris", "0 @I2@ INDI", "1 BIRT", "2 PLAC Paris"]);
    open("Birth");
    expect(rowNamed("Place").querySelector(".gedcom-tree-place")).toBeNull();

    const area = fieldOf(rowNamed("Place"));
    type(area, "Paris, France");
    press(area, "Enter");
    expect(fileLines(tab)).toContain("2 PLAC Paris, France");
  });
});

describe("the menu of a line", () => {
  it("adds a nickname as an unwritten row, written with what is typed on Enter", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"]);
    open("Name");
    rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Nickname").choose();

    expect(tab.writes).toBe(0);
    const area = document.activeElement as HTMLTextAreaElement;
    expect(area.closest(".is-unwritten")?.textContent).toContain("Nickname");
    type(area, "Manya");
    press(area, "Enter");
    expect(fileLines(tab)).toContain("2 NICK Manya");
    expect(box.querySelector(".is-unwritten")).toBeNull();
    expect(document.activeElement).toBe(fieldOf(rowNamed("Nickname")));
  });

  it("adds a death at once as Y, opens it, and puts the focus on its menu", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/"]);
    rootRow().querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Death").choose();

    expect(fileLines(tab)).toContain("1 DEAT Y");
    expect(document.activeElement).toBe(rowNamed("Death").querySelector(".gedcom-tree-add"));
  });

  it("adds a source to a birth through the list of records", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 1867", "0 @S1@ SOUR", "1 TITL Register"]);
    rowNamed("Birth").querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Source").choose();

    expect(host.choosePointer.mock.calls[0]?.[0]).toEqual([{ title: "Register", xref: "@S1@", checked: false }]);
    host.choosePointer.mock.calls[0]?.[1]("@S1@");
    expect(fileLines(tab)).toContain("2 SOUR @S1@");
  });

  it("writes an associated person only once the role it requires is given, the two together", () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 NAME Marie /Curie/", "0 @I2@ INDI", "1 NAME Pierre /Curie/"]);
    rootRow().querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Associated person").choose();
    host.choosePointer.mock.calls[0]?.[1]("@I2@");

    expect(tab.writes).toBe(0);
    const unwritten = box.querySelector<HTMLElement>(".is-unwritten");
    expect(unwritten?.textContent).toContain("Pierre Curie");
    const role = unwritten?.querySelector<HTMLSelectElement>("select");
    if (!role) {
      throw new Error("no role");
    }
    role.value = "FRIEND";
    role.dispatchEvent(new Event("change"));
    expect(fileLines(tab)).toEqual(expect.arrayContaining(["1 ASSO @I2@", "2 ROLE FRIEND"]));
  });

  it("drops a field left empty and writes nothing", async () => {
    const { tab, host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"]);
    open("Name");
    rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Surname").choose();
    (document.activeElement as HTMLElement).blur();
    await settled();

    expect(box.querySelector(".is-unwritten")).toBeNull();
    expect(tab.writes).toBe(0);
  });

  it("offers a 5.5.1 note as a text and as a record", () => {
    const { host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "0 @N1@ NOTE Shared"], "5.5.1");
    rootRow().querySelector<HTMLElement>(".gedcom-tree-add")?.click();

    expect(menu(host).map((one) => one.title)).toEqual(expect.arrayContaining(["Note as text", "Note as a record"]));
  });

  it("shows a field there may be only one of, and a pointer there is no record for, disabled", () => {
    const { host } = editing(["0 @I1@ INDI", "1 SEX F"]);
    rootRow().querySelector<HTMLElement>(".gedcom-tree-add")?.click();

    expect(menuEntry(host, "Sex").disabled).toBe(true);
    expect(menuEntry(host, "Source").disabled).toBe(true);
    expect(menuEntry(host, "Spouse in family").disabled).toBe(true);
    expect(menuEntry(host, "Death").disabled).toBe(false);
  });

  it("opens at its control when the keyboard opens it, and at the pointer otherwise", () => {
    const { host } = editing(["0 @I1@ INDI", "1 SEX F"]);
    const add = rootRow().querySelector<HTMLElement>(".gedcom-tree-add");
    if (!add) {
      throw new Error("no menu");
    }
    add.getBoundingClientRect = () => ({ left: 40, bottom: 70, right: 60, top: 50, width: 20, height: 20, x: 40, y: 50, toJSON: () => ({}) });

    press(add, "Enter");
    expect(host.chooseField.mock.calls[0]?.[0]).toEqual({ x: 40, y: 70 });
    add.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1, clientX: 12, clientY: 34 }));
    expect(host.chooseField.mock.calls[1]?.[0]).toEqual({ x: 12, y: 34 });
  });
});

describe("an unwritten row", () => {
  it("survives a redraw while its line reads as it did, and is dropped once that line is gone", () => {
    const state = ephemeralTreeState();
    const { tab, host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria", "1 NAME Manya /Skłodowska/", "2 GIVN Manya"], "7.0", "@I1@", {}, state);
    open("Name", 1);
    rowNamed("Name", 1).querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Nickname").choose();
    host.settle?.();
    expect(box.querySelectorAll(".is-unwritten")).toHaveLength(1);

    tab.replace(tab.text.replace("1 NAME Maria /Curie/\n2 GIVN Maria\n", ""));
    host.settle?.();
    expect(box.querySelector(".is-unwritten")).toBeNull();
    expect(state.unwrittenParents()).toEqual([]);
  });
});

describe("removing a line", () => {
  it("puts the focus on the menu of the line it was under, not on a sibling that took its place", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "1 NAME Manya /Skłodowska/"]);
    const remove = rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-remove");
    remove?.focus();
    if (remove) {
      press(remove, "Enter");
    }

    expect(fileLines(tab)).not.toContain("1 NAME Maria /Curie/");
    expect(document.activeElement).toBe(rootRow().querySelector(".gedcom-tree-add"));
  });

  it("writes the value being typed first when another control is pressed, and then acts on the card drawn from it", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry", "1 SEX F"]);
    const area = fieldOf(rowNamed("_MILITARY"));
    type(area, "Hussar");
    const remove = rowNamed("Sex").querySelector<HTMLElement>(".gedcom-tree-remove");

    remove?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
    remove?.click();

    expect(fileLines(tab)).toContain("1 _MILITARY Hussar");
    expect(fileLines(tab)).not.toContain("1 SEX F");
    expect(tab.writes).toBe(2);
  });

  it("ignores the leaving of a field the card itself took away", async () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const area = fieldOf(rowNamed("_MILITARY"));
    type(area, "Hussar");
    box.replaceChildren();
    area.blur();
    await settled();

    expect(tab.writes).toBe(0);
  });
});

describe("a record the card cannot write", () => {
  it("has no editing control, and one line says why", () => {
    draw(make(["0 @I1@ INDI", "1 SEX F", "1 BIRT", "2 DATE 1900"]), ephemeralTreeState());
    box.replaceChildren();
    const made = make(["0 @I1@ INDI", "1 SEX F", "1 BIRT", "2 DATE 1900"]);
    renderTree(box, made.record, { index: made.index, host: { openRecord: opened, showInSource: shown, uneditable: true }, facts: new Map(), state: ephemeralTreeState() });

    expect(box.querySelector(".gedcom-tree-note")?.textContent).toBe(
      "This file names no GEDCOM version the plugin can check, so its records cannot be edited here.",
    );
    expect(box.querySelectorAll(".gedcom-tree-add, .gedcom-tree-remove, .gedcom-tree-pick, textarea:not([readonly]), select")).toHaveLength(0);
  });

  it("keeps a field and a removal on a custom line, and no menu", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 _MILITARY Cavalry"]);
    const row = rowNamed("_MILITARY");

    expect(row.querySelector(".gedcom-tree-add")).toBeNull();
    row.querySelector<HTMLElement>(".gedcom-tree-remove")?.click();
    expect(fileLines(tab)).not.toContain("1 _MILITARY Cavalry");
  });
});

describe("a field left for another", () => {
  it("leaves the field the reader went on to the one a press writes first, while a refused one is left behind", async () => {
    const { tab } = editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 7 NOV 1867", "1 OCCU Physicist", "1 SEX F"]);
    open("Birth");
    const date = fieldOf(rowNamed("Date"));
    type(date, "31 NOV 1867");
    press(date, "Enter");
    type(fieldOf(rowNamed("Occupation")), "Chemist");
    await settled();
    rowNamed("Sex").querySelector<HTMLElement>(".gedcom-tree-remove")?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));

    expect(fileLines(tab)).toContain("1 OCCU Chemist");
    expect(fileLines(tab)).not.toContain("1 SEX F");
  });

  it("draws an unwritten row chosen from a menu the card has since drawn again", () => {
    const { host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria"]);
    open("Name");
    rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    host.settle?.();
    menuEntry(host, "Nickname").choose();

    expect(box.querySelectorAll(".is-unwritten")).toHaveLength(1);
  });
});

describe("the value of a record's own opening line", () => {
  const rootField = (): HTMLTextAreaElement | null => rootRow().querySelector<HTMLTextAreaElement>("textarea.gedcom-field-input:not([readonly])");

  it("shows a shared note's text on its root, its continuation joined as a second line and no CONT row", () => {
    draw(make(["0 @N1@ SNOTE The only person", "1 CONT physics and chemistry", "0 @I1@ INDI"], "7.0", "@N1@"));

    expect(labelOf(rootRow())).toBe("Shared note");
    expect(rootRow().querySelector(".gedcom-detail-text-body")?.textContent).toBe("The only person\nphysics and chemistry");
    expect(rows().map(labelOf)).not.toContain("CONT");
  });

  it("shows the described value of a record of the file's own as a field, its tag as written, and names it by its name once closed", () => {
    draw(make(["0 @P1@ _PLAN Custom value", "1 NAME Research plan", "0 @I1@ INDI"], "7.0", "@P1@"));

    expect(labelOf(rootRow())).toBe("_PLAN");
    expect(valuesOf(rootRow())).toEqual(["Custom value"]);
    chevron(rootRow()).click();
    expect(summaryOf(rootRow())).toBe("Research plan");
  });

  it("shows no value on a repository, a person or the header", () => {
    draw(make(["0 @R1@ REPO", "1 NAME Archive", "0 @I1@ INDI"], "7.0", "@R1@"));
    expect(valuesOf(rootRow())).toEqual([]);

    box.replaceChildren();
    editing(["0 @I1@ INDI", "1 SEX F"]);
    expect(rootField()).toBeNull();

    box.replaceChildren();
    editing(["0 @I1@ INDI"], "7.0", "header:");
    expect(rootField()).toBeNull();
  });

  it("replaces a 7.0 shared note of one line, and of two lines with a continuation", async () => {
    const { tab } = editing(["0 @N1@ SNOTE First", "0 @I1@ INDI"], "7.0", "@N1@");
    const area = rootField();
    expect(area?.value).toBe("First");

    if (area) {
      type(area, "Replaced");
      area.blur();
    }
    await settled();
    expect(fileLines(tab)).toContain("0 @N1@ SNOTE Replaced");

    const again = rootField();
    if (again) {
      type(again, "One\nTwo");
      again.blur();
    }
    await settled();
    expect(fileLines(tab)).toEqual(expect.arrayContaining(["0 @N1@ SNOTE One", "1 CONT Two"]));
  });

  it("replaces a 5.5.1 note record continued with CONC and CONT, and keeps the source beneath it", async () => {
    const { tab } = editing(["0 @N1@ NOTE Te", "1 CONC xt", "1 CONT more", "1 SOUR @S1@", "0 @S1@ SOUR", "0 @I1@ INDI"], "5.5.1", "@N1@");
    const area = rootField();
    expect(area?.value).toBe("Text\nmore");

    if (area) {
      type(area, "New text");
      area.blur();
    }
    await settled();
    const lines = fileLines(tab);
    expect(lines).toContain("0 @N1@ NOTE New text");
    expect(lines).not.toContain("1 CONC xt");
    expect(lines).not.toContain("1 CONT more");
    expect(lines[lines.indexOf("0 @N1@ NOTE New text") + 1]).toBe("1 SOUR @S1@");
  });

  it("replaces the value of a record of the file's own", () => {
    const { tab } = editing(["0 @P1@ _PLAN Custom value", "1 NAME Research plan", "0 @I1@ INDI"], "7.0", "@P1@");
    const area = rootField();

    if (area) {
      type(area, "Another value");
      press(area, "Enter");
    }

    expect(fileLines(tab)).toEqual(expect.arrayContaining(["0 @P1@ _PLAN Another value", "1 NAME Research plan"]));
  });

  it("shows a shared note's text as read where the card does not write", () => {
    draw(make(["0 @N1@ SNOTE Read only", "0 @I1@ INDI"], "7.0", "@N1@"));

    expect(rootField()).toBeNull();
    expect(rootRow().querySelector(".gedcom-detail-text-body")?.textContent).toBe("Read only");
  });
});

describe("opening a shared note from a pointer to it", () => {
  const noteControl = (row: Element): HTMLElement | null => row.querySelector<HTMLElement>(".gedcom-tree-open-note");

  it("is a control beside the note's text, reached by the keyboard, that selects the note", () => {
    draw(make(["0 @I1@ INDI", "1 SNOTE @N1@", "0 @N1@ SNOTE The shared text"]));
    const control = noteControl(rowNamed("Shared note"));

    expect(control?.getAttribute("role")).toBe("button");
    expect(control?.getAttribute("tabindex")).toBe("0");
    expect(control?.getAttribute("aria-label")).toBe("Open note");
    expect(control?.getAttribute("data-focus-key")).toBe("t:SNOTE[0]:note");
    control?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(opened).toHaveBeenCalledWith("@N1@");
  });

  it("stands before the lines of the note, beside its text", () => {
    draw(make(["0 @I1@ INDI", "1 SNOTE @N1@", "0 @N1@ SNOTE The shared text", "1 LANG en"]));
    const main = rowNamed("Shared note").querySelector(".gedcom-tree-main");

    expect([...(main?.children ?? [])].map((child) => child.className.split(" ")[0])).toEqual(["gedcom-detail-text", "gedcom-tree-open-note", "gedcom-detail"]);
  });

  it("is not in the closed summary of a pointer with a citation beneath it, and once opened it leaves the node open", () => {
    draw(make(["0 @I1@ INDI", "1 SNOTE @N1@", "2 SOUR @S1@", "0 @N1@ SNOTE First line", "1 CONT second", "0 @S1@ SOUR", "1 TITL Register"]));
    const row = rowNamed("Shared note");

    expect(summaryOf(row)).toBe("First line");
    expect(noteControl(row)).toBeNull();
    open("Shared note");
    const control = noteControl(rowNamed("Shared note"));
    control?.click();

    expect(opened).toHaveBeenCalledWith("@N1@");
    expect(chevron(rowNamed("Shared note")).getAttribute("aria-expanded")).toBe("true");
  });

  it("is in Russian", () => {
    setLanguage("ru");
    draw(make(["0 @I1@ INDI", "1 SNOTE @N1@", "0 @N1@ SNOTE The shared text"]));

    expect(noteControl(rowNamed("Общая заметка"))?.getAttribute("aria-label")).toBe("Открыть заметку");
  });

  it("is not offered on a pointer to another record, and a pointer to a repository or a submitter is a link", () => {
    draw(make(["0 @S1@ SOUR", "1 REPO @R1@", "1 _SUBM @U1@", "0 @R1@ REPO", "1 NAME Archive", "0 @U1@ SUBM", "1 NAME Domorium", "0 @I1@ INDI"], "7.0", "@S1@"));

    expect(box.querySelector(".gedcom-tree-open-note")).toBeNull();
    const links = [...box.querySelectorAll<HTMLElement>("button.gedcom-desk-link")].map((link) => link.textContent);
    expect(links).toEqual(expect.arrayContaining(["Archive", "Domorium"]));
  });
});

describe("the file of a medium", () => {
  const picture = { kind: "image" as const, url: "app://photo.jpg", name: "photo.jpg" };
  const fileControl = (): HTMLElement | null => box.querySelector<HTMLElement>(".gedcom-tree-file");
  const drawWith = (made: Made, host: Partial<TreeHost>, state: TreeState = ephemeralTreeState()): void => {
    renderTree(box, made.record, { index: made.index, host: { openRecord: opened, showInSource: shown, ...host }, facts: new Map(), state });
  };

  it("shows the picture of a multimedia record's file while its node is closed, with no field", () => {
    const made = make(["0 @O1@ OBJE", "1 FILE Media/photo.jpg", "2 FORM image/jpeg", "0 @I1@ INDI"], "7.0", "@O1@");
    const asked: (string | undefined)[] = [];
    drawWith(made, {
      mediaFileAt: (line) => {
        asked.push(line.text);
        return { content: picture, path: "Media/photo.jpg", at: line.valueAt ?? { line: 0, character: 0 } };
      },
    });

    expect(asked).toEqual(["Media/photo.jpg"]);
    expect(fileControl()?.querySelector("img")?.getAttribute("src")).toBe("app://photo.jpg");
    expect(chevron(rowNamed("File")).getAttribute("aria-expanded")).toBe("false");
    expect(rowNamed("File").querySelector("textarea, .gedcom-tree-summary")).toBeNull();
  });

  it("shows a file icon and the path where the file is not a picture it can draw", () => {
    const made = make(["0 @I1@ INDI", "1 OBJE", "2 FILE scans/letter.pdf", "2 TITL Letter"], "5.5.1");
    drawWith(made, { mediaFileAt: () => null, setIcon: (element, icon) => element.setAttribute("data-icon", icon) });
    open("Media");

    expect(fileControl()?.querySelector(".gedcom-tree-file-icon")?.getAttribute("data-icon")).toBe("file");
    expect(fileControl()?.querySelector(".gedcom-tree-file-path")?.textContent).toBe("scans/letter.pdf");
    expect(fileControl()?.getAttribute("role")).toBeNull();
  });

  it("leaves the header's file of 5.5.1 a value like any other", () => {
    const made = make(["1 FILE tree.ged", "0 @I1@ INDI"], "5.5.1", "header:");
    const mediaFileAt = vi.fn(() => null);
    drawWith(made, { mediaFileAt });

    expect(fileControl()).toBeNull();
    expect(mediaFileAt).not.toHaveBeenCalled();
    expect(rowNamed("File").querySelector("textarea")?.value).toBe("tree.ged");
  });

  it("opens the file where the card does not write", () => {
    const made = make(["0 @O1@ OBJE", "1 FILE Media/photo.jpg", "0 @I1@ INDI"], "7.0", "@O1@");
    const openFile = vi.fn();
    drawWith(made, { openFile, mediaFileAt: (line) => ({ content: picture, path: "Media/photo.jpg", at: line.range.start }) });
    fileControl()?.dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));

    expect(openFile).toHaveBeenCalledWith("Media/photo.jpg");
    expect(fileControl()?.getAttribute("aria-label")).toBe("Open photo.jpg");
  });

  it("offers the choices where the card writes, without opening or closing the node, and draws the card again once written", () => {
    const replaceFile = vi.fn<NonNullable<TreeHost["replaceFile"]>>();
    const { host, draws } = editing(["0 @O1@ OBJE", "1 FILE Media/a.jpg", "2 FORM image/jpeg"], "7.0", "@O1@", { replaceFile, mediaFileAt: () => null });
    fileControl()?.click();

    expect(fileControl()?.getAttribute("data-focus-key")).toBe("t:FILE[0]:file");
    expect(fileControl()?.getAttribute("aria-label")).toBe("Change the file Media/a.jpg");
    expect(replaceFile.mock.calls[0]?.[1].text).toBe("Media/a.jpg");
    expect(chevron(rowNamed("File")).getAttribute("aria-expanded")).toBe("false");
    const before = draws();
    replaceFile.mock.calls[0]?.[2]({ ok: true, line: 4, warnings: [] });
    expect(draws()).toBe(before + 1);
    expect(host.announce).not.toHaveBeenCalled();
  });

  it("says under the file why it was not changed, and where a copy was left", () => {
    setLanguage("en");
    const replaceFile = vi.fn<NonNullable<TreeHost["replaceFile"]>>();
    const { host } = editing(["0 @O1@ OBJE", "1 FILE Media/a.jpg", "2 FORM jpg"], "5.5.1", "@O1@", { replaceFile, mediaFileAt: () => null });
    fileControl()?.click();
    replaceFile.mock.calls[0]?.[2]({ ok: false, code: "value-not-in-enum", message: "no" });

    expect(box.querySelector(".gedcom-tree-message.is-error")?.textContent).toBe("This value is not one of those the standard lists here.");
    expect(fileControl()?.getAttribute("aria-invalid")).toBe("true");

    fileControl()?.click();
    replaceFile.mock.calls[1]?.[2]({ ok: false, code: "stale-document", message: "changed", copied: "Media/photo.png" });
    expect(box.querySelector(".gedcom-tree-message.is-error")?.textContent).toBe(
      "The file changed, so nothing was written. The card now shows the file as it is. The copy of the file stays in the vault at Media/photo.png.",
    );
    expect(host.announce).toHaveBeenCalledTimes(2);
  });

  it("speaks Russian", () => {
    setLanguage("ru");
    editing(["0 @O1@ OBJE", "1 FILE Media/a.jpg", "2 FORM image/jpeg"], "7.0", "@O1@", { replaceFile: vi.fn(), mediaFileAt: () => null });

    expect(fileControl()?.getAttribute("aria-label")).toBe("Сменить файл Media/a.jpg");
  });
});

const gripOf = (row: Element): HTMLElement | null => row.querySelector<HTMLElement>(".gedcom-tree-grip");
const grip = (label: string, at = 0): HTMLElement => {
  const found = gripOf(rowNamed(label, at));
  if (!found) {
    throw new Error(`no grip on ${label}`);
  }
  return found;
};
const pointer = (target: EventTarget, type: string, x = 0, y = 0): void => {
  target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX: x, clientY: y }));
};
const dragged = (): Element[] => [...document.querySelectorAll(".drag-reorder-ghost, .drop-indicator, .drag-ghost-hidden, body.is-grabbing")];
const marie = (extra: Partial<Omit<TreeHost, Asked>> = {}, state = ephemeralTreeState()): Editing => editingText(CURIE, "@I1@", extra, state);

describe("the keys of a moved line", () => {
  it("stay where a line moves among lines of other tags", () => {
    expect(movedKeys("", ["NAME", "NAME", "SEX", "BIRT"], 2, 0)).toEqual(new Map());
  });

  it("swap for a name moved past another name, and nothing else is renamed", () => {
    expect(movedKeys("", ["NAME", "SEX", "NAME"], 2, 0)).toEqual(new Map([["NAME[1]", "NAME[0]"], ["NAME[0]", "NAME[1]"]]));
  });

  it("follow a line moved to the end, beneath its parent's key", () => {
    expect(movedKeys("BIRT[0]", ["SOUR", "SOUR", "DATE", "SOUR"], 0, 4)).toEqual(
      new Map([["BIRT[0].SOUR[0]", "BIRT[0].SOUR[2]"], ["BIRT[0].SOUR[1]", "BIRT[0].SOUR[0]"], ["BIRT[0].SOUR[2]", "BIRT[0].SOUR[1]"]]),
    );
  });
});

describe("the place a dragged line would go", () => {
  const boxes = [
    { top: 0, middle: 10, bottom: 20 },
    { top: 24, middle: 34, bottom: 90 },
    { top: 94, middle: 104, bottom: 114 },
  ];

  it("is before a sibling above the middle of its row, and after it anywhere lower in its box, the lines beneath it included", () => {
    expect([5, 15, 30, 40, 80, 100, 110].map((y) => slotAt(boxes, y))).toEqual([0, 1, 1, 2, 2, 2, 3]);
  });

  it("is none outside the band of the siblings", () => {
    expect([slotAt(boxes, -1), slotAt(boxes, 115), slotAt([], 0)]).toEqual([null, null, null]);
  });

  it("is the description's slot matched by line, the end after the last row that has one, and none before a row with no tag", () => {
    const at = (line: number) => ({ line, character: 0 });
    const slots = [
      { target: { before: at(4) }, changesOrder: true },
      { target: { before: at(6) }, changesOrder: false },
      { target: { end: true as const }, changesOrder: false },
    ];

    const placed = slotsByBoundary([4, 5, 6], slots);

    expect([...placed.keys()]).toEqual([0, 2, 3]);
    expect(placed.get(1)).toBeUndefined();
    expect(placed.get(3)).toBe(slots[2]);
  });
});

describe("the grip of a line", () => {
  it("is on every line with a tagged sibling, never on the root, the type alone under a name, or a card that does not write", () => {
    marie();
    open("Name", 1);
    open("Birth");

    expect(gripOf(rootRow())).toBeNull();
    expect(gripOf(rowNamed("Type"))).toBeNull();
    expect([gripOf(rowNamed("Date")), gripOf(rowNamed("Place")), gripOf(rowNamed("Sex"))].every((one) => one !== null)).toBe(true);

    box.replaceChildren();
    draw(make(["0 @I1@ INDI", "1 NAME Maria /Curie/", "1 SEX F"]));
    expect(box.querySelector(".gedcom-tree-grip")).toBeNull();
  });

  it("is the last control of the group, which counts it", () => {
    marie();
    const row = rowNamed("Name");

    expect([...(row.querySelector(".gedcom-tree-actions")?.children ?? [])].map((one) => one.classList[0])).toEqual([
      "gedcom-tree-remove",
      "gedcom-tree-add",
      "gedcom-tree-grip",
    ]);
    expect(row.getAttribute("data-actions")).toBe("3");
  });

  it("stands alone in the group of a line the standard requires and that takes no field", () => {
    editing(["0 @U1@ SUBM", "1 NAME Domorium", "1 WWW https://example.org/"], "7.0", "@U1@");
    const row = rowNamed("Name");

    expect(row.querySelector(".gedcom-tree-actions")?.children).toHaveLength(1);
    expect(gripOf(row)).not.toBeNull();
    expect(row.getAttribute("data-actions")).toBe("1");
  });

  it("is on no line written as a level with no tag, which is not counted as a sibling", () => {
    editing(["0 @I1@ INDI", "1 SEX F", "1", "1 NAME Maria /Curie/"]);

    expect(rows().map((row) => gripOf(row) !== null)).toEqual([true, false, true]);
  });

  it("is a button named for its row and the keys that move it, as a Macintosh names them there", () => {
    marie();
    const named = grip("Name", 1);

    expect(named.getAttribute("role")).toBe("button");
    expect(named.getAttribute("tabindex")).toBe("0");
    expect(named.getAttribute("aria-keyshortcuts")).toBe("Alt+ArrowUp Alt+ArrowDown");
    expect(named.getAttribute("data-ignore-swipe")).toBe("true");
    expect(named.getAttribute("data-focus-key")).toBe("t:NAME[1]:grip");
    expect(named.getAttribute("aria-label")).toBe("Move Name 2: drag, or press Alt+↑ / Alt+↓");

    marie({ macKeys: true });
    expect(grip("Sex").getAttribute("aria-label")).toBe("Move Sex: drag, or press ⌥↑ / ⌥↓");
  });

  it("writes nothing and opens nothing for Enter, Space and a click", () => {
    const { tab } = marie();
    const birth = grip("Birth");
    press(birth, "Enter");
    press(birth, " ");
    birth.click();

    expect(tab.writes).toBe(0);
    expect(rowNamed("Birth").parentElement?.classList.contains("is-open")).toBe(false);
  });
});

describe("a line moved by the keyboard", () => {
  it("goes up one place with Alt+↑, keeps the focus on its grip and says its new place", () => {
    const { tab, host } = marie();
    const sex = grip("Sex");
    sex.focus();
    press(sex, "ArrowUp", { altKey: true });

    const lines = fileLines(tab);
    expect(lines.indexOf("1 SEX F")).toBe(lines.indexOf("1 NAME Maria Salomea /Skłodowska/") - 1);
    expect(tab.writes).toBe(1);
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:SEX[0]:grip");
    expect(host.announce).toHaveBeenCalledWith("Sex moved to place 2 of 14");
  });

  it("goes down one place with Alt+↓, and the second name then reads as the first", () => {
    const { tab } = marie();
    press(grip("Name"), "ArrowDown", { altKey: true });

    const lines = fileLines(tab);
    expect(lines.indexOf("1 NAME Maria Salomea /Skłodowska/")).toBeLessThan(lines.indexOf("1 NAME Marie /Skłodowska-Curie/"));
    expect(document.activeElement?.getAttribute("data-focus-key")).toBe("t:NAME[1]:grip");
  });

  it("writes nothing at the first place", () => {
    const { tab } = marie();
    const first = grip("Name");
    first.focus();
    press(first, "ArrowUp", { altKey: true });

    expect(tab.writes).toBe(0);
    expect(document.activeElement).toBe(first);
  });

  it("does nothing with another modifier held, or without Alt", () => {
    const { tab } = marie();
    press(grip("Sex"), "ArrowUp", { altKey: true, shiftKey: true });
    press(grip("Sex"), "ArrowUp", { altKey: true, ctrlKey: true });
    press(grip("Sex"), "ArrowUp");

    expect(tab.writes).toBe(0);
  });

  it("takes an opened name with it, and leaves the name it passed closed", () => {
    marie();
    open("Name", 1);
    press(grip("Name", 1), "ArrowUp", { altKey: true });

    expect(rowNamed("Name", 0).parentElement?.classList.contains("is-open")).toBe(true);
    expect(rowNamed("Name", 1).parentElement?.classList.contains("is-open")).toBe(false);
    expect(rows().map(labelOf).slice(0, 3)).toEqual(["Name", "Type", "Name"]);
  });

  it("is refused where the file would be read otherwise, and says why under its row in Russian", () => {
    setLanguage("ru");
    const { tab, host } = editing(["0 @I1@ INDI", "1 BIRT", "3 DATE 1900", "2 PLAC x"]);
    const before = tab.text;
    open("Рождение");
    const place = grip("Место");
    press(place, "ArrowUp", { altKey: true });

    expect(tab.text).toBe(before);
    const said = "Со строкой на этом месте файл читался бы иначе, поэтому ничего не записано.";
    expect(messageOf(place)).toBe(said);
    expect(rowNamed("Место").nextElementSibling?.textContent).toBe(said);
    expect(host.announce).toHaveBeenCalledWith(said);
  });

  it("is refused for a description of a text that moved on, and the card is drawn again", () => {
    const { tab, draws } = editing(["0 @I1@ INDI", "1 SEX F", "1 NAME Maria /Curie/"]);
    tab.replace(tab.text.replace("1 SEX F", "1 SEX M"));
    const drawnBefore = draws();
    press(grip("Name"), "ArrowUp", { altKey: true });

    expect(fileLines(tab).indexOf("1 SEX M")).toBeLessThan(fileLines(tab).indexOf("1 NAME Maria /Curie/"));
    expect(draws()).toBe(drawnBefore + 1);
  });
});

describe("a line dragged by its grip", () => {
  it("writes nothing and adds nothing for a press without movement", () => {
    const { tab } = marie();
    const sex = grip("Sex");
    pointer(sex, "pointerdown");
    pointer(sex, "pointermove", 2, 2);
    pointer(sex, "pointerup", 2, 2);

    expect(tab.writes).toBe(0);
    expect(dragged()).toEqual([]);
    expect([...document.body.children]).toEqual([box]);
  });

  it("lifts a copy of the row with no identifier or focus key, and leaves nothing once Escape ends it", () => {
    const { tab } = marie();
    const sex = grip("Sex");
    pointer(sex, "pointerdown");
    pointer(sex, "pointermove", 0, 20);

    const ghost = document.querySelector(".drag-reorder-ghost");
    expect(ghost?.getAttribute("aria-hidden")).toBe("true");
    expect(ghost?.hasAttribute("inert")).toBe(true);
    expect(ghost?.querySelector(".mod-dragged-item .gedcom-tree-label")?.textContent).toBe("Sex");
    expect(ghost?.querySelectorAll("[id], [data-focus-key]")).toHaveLength(0);
    expect(document.body.classList.contains("is-grabbing")).toBe(true);
    expect(rowNamed("Sex").parentElement?.classList.contains("drag-ghost-hidden")).toBe(true);
    expect(box.querySelectorAll(".gedcom-tree .drop-indicator")).toHaveLength(1);

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    pointer(sex, "pointerup", 0, 20);

    expect(dragged()).toEqual([]);
    expect(tab.writes).toBe(0);
  });

  it("ends once for every way it can end", () => {
    marie();
    const sex = grip("Sex");
    const node = rowNamed("Sex").parentElement as HTMLElement;
    const drop = vi.fn();
    const drag = new TreeDrag(new PointerEvent("pointerdown", { pointerId: 7, cancelable: true }), {
      grip: sex,
      node,
      describe: () => ({ ok: true, version: 1, range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, subtreeRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }, slots: [] }),
      refused: vi.fn(),
      drop,
    });
    sex.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 7, clientY: 30 }));
    drag.end();
    drag.end();
    sex.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, clientY: 30 }));

    expect(dragged()).toEqual([]);
    expect(drop).not.toHaveBeenCalled();
  });

  it("ends without writing when the pointer is cancelled", () => {
    const { tab } = marie();
    const sex = grip("Sex");
    pointer(sex, "pointerdown");
    pointer(sex, "pointermove", 0, 20);
    pointer(sex, "pointercancel", 0, 20);

    expect(dragged()).toEqual([]);
    expect(tab.writes).toBe(0);
  });

  it("writes a value being typed first and starts no drag", () => {
    const { tab } = marie();
    type(fieldOf(rowNamed("Occupation")), "Physicist");
    const sex = grip("Sex");
    pointer(sex, "pointerdown");
    pointer(sex, "pointermove", 0, 20);

    expect(fileLines(tab)).toContain("1 OCCU Physicist");
    expect(dragged()).toEqual([]);
  });

  it("starts no drag where a value being typed is refused, and the focus stays in its field", () => {
    const { tab } = editing(["0 @I1@ INDI", "1 BIRT", "2 DATE 7 NOV 1867", "1 DEAT Y", "1 SEX F"]);
    open("Birth");
    const date = fieldOf(rowNamed("Date"));
    type(date, "31 NOV 1867");
    const death = grip("Death");
    pointer(death, "pointerdown");
    pointer(death, "pointermove", 0, 20);

    expect(tab.writes).toBe(0);
    expect(dragged()).toEqual([]);
    expect(document.activeElement).toBe(date);
    expect(messageOf(date)).toBeDefined();
  });

  it("leaves the focus in an empty unwritten row, which stays", async () => {
    const { host } = editing(["0 @I1@ INDI", "1 NAME Maria /Curie/", "2 GIVN Maria", "1 SEX F"]);
    open("Name");
    rowNamed("Name").querySelector<HTMLElement>(".gedcom-tree-add")?.click();
    menuEntry(host, "Nickname").choose();
    const area = document.activeElement;
    const sex = grip("Sex");
    pointer(sex, "pointerdown");
    pointer(sex, "pointerup");
    await settled();

    expect(document.activeElement).toBe(area);
    expect(box.querySelectorAll(".is-unwritten")).toHaveLength(1);
  });
});
