// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type GenealogyIndex, type RecordLine } from "../../genealogy";
import { resetLanguage, setLanguage } from "../../i18n";
import { curieIndex } from "../../testing/curie";
import { installObsidianDom } from "../../testing/obsidianDom";
import { factsOf } from "../personPage";
import { factsByLine, renderTree, type TreeHost } from "./tree";
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
const control = (name: string): HTMLButtonElement => {
  const found = [...box.querySelectorAll<HTMLButtonElement>(".gedcom-tree-control")].find((one) => one.textContent === name || one.getAttribute("aria-label") === name);
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

  it("draws nothing for a record that states nothing beneath its opening line", () => {
    draw(make(["0 @I1@ INDI"]));

    expect(box.querySelector(".gedcom-tree")).toBeNull();
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

  it("opens its card from its label, and a sex does not", () => {
    draw(marie());
    const birth = rowNamed("Birth").querySelector<HTMLButtonElement>("button.gedcom-tree-label");
    birth?.click();

    expect(opened).toHaveBeenCalledTimes(1);
    expect(opened.mock.calls[0]?.[0]).toMatch(/^event:@I1@:BIRT:/u);
    expect(rowNamed("Sex").querySelector("button.gedcom-tree-label")).toBeNull();
    rowNamed("Sex").querySelector(".gedcom-tree-label")?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(opened).toHaveBeenCalledTimes(1);
  });

  it("opens the card of the place from the summary and, once opened, from the place line", () => {
    draw(marie());
    const summaryPlace = rowNamed("Birth").querySelector<HTMLButtonElement>(".gedcom-tree-summary button");
    expect(summaryPlace?.textContent).toBe("Warsaw, Congress Poland");
    summaryPlace?.click();
    expect(opened).toHaveBeenLastCalledWith("place:warsaw, congress poland");

    open("Birth");
    const line = rowNamed("Place").querySelector<HTMLButtonElement>("button.gedcom-desk-link");
    line?.click();
    expect(opened).toHaveBeenLastCalledWith("place:warsaw, congress poland");
    expect(valuesOf(rowNamed("Place"))).toEqual([]);
  });

  it("has a label that does not act where the event has no identifier", () => {
    const made = make(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900"]);
    const person = made.index.person("@I1@");
    renderTree(box, made.record, {
      index: made.index,
      host: { openRecord: opened, showInSource: shown },
      facts: factsByLine((person ? factsOf(person) : []).map(({ eventId: _unused, ...fact }) => fact)),
      state: ephemeralTreeState(),
    });

    expect(rowNamed("Birth").querySelector("button.gedcom-tree-label")).toBeNull();
    expect(summaryOf(rowNamed("Birth"))).toBe("1900");
  });

  it("is a residence whose place is a link", () => {
    draw(make(["0 @I1@ INDI", "1 RESI", "2 PLAC Paris", "2 DATE 1895", "0 @I2@ INDI", "1 RESI", "2 PLAC Paris"]));

    expect(rowNamed("Residence").querySelector<HTMLButtonElement>(".gedcom-tree-summary button")?.textContent).toBe("Paris");
  });
});

describe("the controls", () => {
  it("are real buttons that say whether their node is open and which part they control", () => {
    draw(make(["0 @I1@ INDI", "1 BIRT", "2 DATE 1900", "1 SEX F"]));
    const arrow = chevron(rowNamed("Birth"));

    expect(arrow.tagName).toBe("BUTTON");
    expect(arrow.getAttribute("aria-label")).toBe("Birth");
    expect(arrow.getAttribute("aria-expanded")).toBe("false");
    expect(box.querySelector(`#${arrow.getAttribute("aria-controls")}`)).not.toBeNull();
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
    const toggle = box.querySelector<HTMLButtonElement>(".gedcom-tree-toggle");

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
