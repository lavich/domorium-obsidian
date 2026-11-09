// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { factsOf, renderPersonPage, type FactKey, type PageHost } from "./personPage";

let container: HTMLElement;
let host: ReturnType<typeof pageHost>;

function pageHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
    select: vi.fn<PageHost["select"]>(),
    showInSource: vi.fn<PageHost["showInSource"]>(),
    openFile: vi.fn<PageHost["openFile"]>(),
  } satisfies PageHost;
}

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = pageHost();
});
afterEach(resetLanguage);

function draw(
  xref: string,
  { selected = null, index = curieIndex(), open }:
    { selected?: FactKey | null; index?: GenealogyIndex; open?: string[] } = {},
): void {
  const person = index.person(xref);
  if (!person) {
    throw new Error(`no person ${xref}`);
  }
  container.empty();
  renderPersonPage(container, person, index, { selected, ...(open ? { open: new Set(open) } : {}) }, host);
}

const bornIn = (date: string): GenealogyIndex =>
  buildIndex(new GedcomLanguageService([
    "0 HEAD", "1 GEDC", "2 VERS 7.0",
    "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", `2 DATE ${date}`,
    "0 TRLR", "",
  ].join("\n")));

const gedcom = (...lines: string[]): GenealogyIndex =>
  buildIndex(new GedcomLanguageService(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR", ""].join("\n")));

const citedBirth = gedcom(
  "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S2@", "1 DEAT", "1 OCCU Teacher", "1 BURI",
  "0 @S2@ SOUR", "1 TITL Register",
);
const marriedPerson = gedcom(
  "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 FAMS @F1@", "1 BIRT",
  "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 FAMS @F1@",
  "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR",
);

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

/** A row of facts as the reader reads it: its name, its date, what else it states, and whether it cites a source. */
const rowsOf = (selector: string, keep: (row: Element) => boolean = () => true): string[][] =>
  [...container.querySelectorAll(selector)].filter(keep).map((row) => {
    const part = (name: string) => row.querySelector(name)?.textContent ?? "";
    const dot = row.querySelector(".gedcom-desk-source")?.getAttribute("aria-label");
    return [
      part(".gedcom-desk-fact-name"),
      ...(row.classList.contains("is-event") ? [part(".gedcom-desk-fact-date")] : []),
      part(".gedcom-desk-fact-value"),
      ...(dot ? [dot] : []),
    ];
  });
const treeRows = (): HTMLElement[] => [...container.querySelectorAll<HTMLElement>(".gedcom-tree-node:not(.is-root) > .gedcom-tree-row")];
const labelOf = (row: Element): string => row.querySelector(".gedcom-tree-label")?.textContent ?? "";
const treeRow = (label: string, at = 0): HTMLElement | undefined => treeRows().filter((row) => labelOf(row) === label)[at];
const summaryOf = (row: Element | undefined): string | undefined => row?.querySelector(".gedcom-tree-summary")?.textContent ?? undefined;
const marriages = () => rowsOf(".gedcom-desk-union-events .gedcom-desk-fact");

describe("the person card", () => {
  it("heads the page with the name, the years and the places", () => {
    draw("@I1@");

    expect(texts(".gedcom-desk-title")).toEqual(["Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["Female · 1867–1934 · Warsaw → Passy"]);
  });

  it("heads the page with a year before the common era marked as one", () => {
    draw("@I1@", { index: bornIn("1401 BCE") });

    expect(texts(".gedcom-desk-subtitle")).toEqual(["1401 BCE–?"]);
  });

  it("marks an approximate year before the common era in Russian", () => {
    setLanguage("ru");
    draw("@I1@", { index: bornIn("ABT 1401 BCE") });

    expect(texts(".gedcom-desk-subtitle")).toEqual(["≈1401 до н. э.–?"]);
  });

  it("shows Marie's record as a tree of closed nodes with a summary each, and her marriage in her family", () => {
    draw("@I1@");

    expect(treeRows().map(labelOf)).toEqual([
      "Name", "Name", "Sex", "Birth", "Death", "Occupation", "Child in family", "Spouse in family", "Media", "Media",
      "Media", "Shared note", "Source", "Source",
    ]);
    expect(summaryOf(treeRow("Birth"))).toBe("7 NOV 1867 · Warsaw, Congress Poland");
    expect(summaryOf(treeRow("Death"))).toBe("4 JUL 1934 · Passy, Haute-Savoie, France");
    expect(treeRow("Occupation")?.querySelector(".gedcom-field")?.getAttribute("data-value")).toBe("Physicist and chemist");
    expect(container.querySelector(".gedcom-tree .gedcom-desk-source")).toBeNull();
    expect(marriages()).toEqual([["Marriage", "26 JUL 1895", "Sceaux, France"]]);
    expect(texts("h2").slice(0, 1)).toEqual(["Family"]);
  });

  it("marks with a dot only the closed nodes that cite a source, and says nothing of those that do not", () => {
    draw("@I1@", { index: citedBirth });

    expect(treeRows().filter((row) => row.querySelector(".gedcom-desk-source")).map(labelOf)).toEqual(["Birth"]);
    expect(container.querySelector(".gedcom-desk-source")?.getAttribute("aria-label")).toBe("1 source");
    expect(container.textContent).not.toContain("without a source");
  });

  it("marks a marriage of a family the person married into that cites a source, with a dot after its name in the family section", () => {
    const cited = gedcom(
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 FAMS @F1@",
      "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 FAMS @F1@",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR", "2 SOUR @S2@",
      "0 @S2@ SOUR", "1 TITL Register",
    );
    draw("@I1@", { index: cited });

    expect(marriages().length).toBeGreaterThan(0);
    expect(container.querySelector(".gedcom-desk-union-events .gedcom-desk-source")?.getAttribute("aria-label")).toBe("1 source");
    draw("@I1@", { index: marriedPerson });
    expect(container.querySelector(".gedcom-desk-union-events .gedcom-desk-source")).toBeNull();
  });

  it("draws no section of names, events, details, notes, related people, identifiers or other data", () => {
    draw("@I1@");

    expect(texts("h2")).not.toEqual(expect.arrayContaining(["Names"]));
    for (const name of ["Names", "Events", "Details", "Notes", "Related people", "Identifiers and record information", "Other data"]) {
      expect(texts("h2")).not.toContain(name);
    }
  });

  it("draws one plain name as one row, and nothing else, for a person who states nothing else", () => {
    draw("@I1@", { index: gedcom("0 @I1@ INDI", "1 NAME Anna /Nowak/") });

    expect(treeRows().map(labelOf)).toEqual(["Name"]);
    expect(container.textContent).not.toContain("no facts");
  });

  it("shows no dash for an event that states no date, and no empty date", () => {
    draw("@I1@", { index: gedcom("0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 PLAC Kraków", "1 DEAT", "2 DATE 1900") });

    expect([summaryOf(treeRow("Birth")), summaryOf(treeRow("Death"))]).toEqual(["Kraków", "1900"]);
    expect(container.querySelector(".gedcom-desk-fact-date")).toBeNull();
  });

  it("counts the sources an event cites itself", () => {
    const index = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S2@",
      "0 @S2@ SOUR", "1 TITL Register",
      "0 TRLR", "",
    ].join("\n")));
    draw("@I1@", { index });

    expect(container.querySelector(".gedcom-desk-source")?.getAttribute("aria-label")).toBe("1 source");
  });

  it("shows no identifier, level or tag anywhere", () => {
    draw("@I1@");

    expect(container.textContent).not.toMatch(/@[A-Z]+\d+@|\b(BIRT|DEAT|FAMS|INDI)\b/);
  });

  it("lists her other name, with its type once it is opened", () => {
    draw("@I1@");
    const second = treeRow("Name", 1);
    second?.querySelector<HTMLElement>(".gedcom-tree-chevron")?.click();

    expect(summaryOf(treeRow("Name", 0))).toBe("Marie Skłodowska-Curie");
    expect(second?.closest(".gedcom-tree-node")?.querySelector(".gedcom-tree-children .gedcom-field")?.getAttribute("data-value")).toBe("Birth");
  });

  it("shows her parents, siblings, husband with the marriage, and children", () => {
    draw("@I1@");

    expect(texts(".gedcom-desk-kin-label")).toEqual([
      "Parents", "Siblings", "Husband", "Children",
    ]);
    expect(texts(".gedcom-desk-person-name")).toEqual([
      "Władysław Skłodowski", "Bronisława Boguska",
      "Zofia Skłodowska", "Józef Skłodowski", "Bronisława Dłuska", "Helena Szalay",
      "Pierre Curie",
      "Irène Joliot-Curie", "Ève Curie",
    ]);
    expect(marriages()).toEqual([["Marriage", "26 JUL 1895", "Sceaux, France"]]);
  });

  it("leads from a marriage to the family's card", () => {
    draw("@I1@");
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-link")]
      .find((node) => node.textContent === "Family card")
      ?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@F3@");
  });

  it("selects a relative", () => {
    draw("@I1@");
    const pierre = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-person")]
      .find((node) => node.textContent?.startsWith("Pierre Curie"));
    pierre?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I2@");
  });

  it("opens the card of an event from the label of its row", () => {
    draw("@I1@");
    treeRow("Birth")?.querySelector<HTMLElement>("button.gedcom-tree-label")?.click();
    treeRow("Death")?.querySelector<HTMLElement>("button.gedcom-tree-label")?.click();

    expect(host.openRecord.mock.calls).toEqual([["event:@I1@:BIRT:0"], ["event:@I1@:DEAT:0"]]);
    expect(host.select).not.toHaveBeenCalled();
  });

  it("opens the card of an event of a family the person married into, under the family", () => {
    draw("@I1@");
    const marriage = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-fact")].find((row) => row.textContent?.includes("Marriage"));
    marriage?.click();

    expect(host.openRecord).toHaveBeenCalledWith("event:@F3@:MARR:0");
  });

  it("opens the place of a fact, and not the event, when the place is pressed", () => {
    draw("@I1@");
    container.querySelector<HTMLElement>(".gedcom-tree-summary .gedcom-desk-link")?.click();

    expect(host.openRecord.mock.calls).toEqual([["place:warsaw, congress poland"]]);
  });

  it("shows in source the selected fact, or else the whole record", () => {
    const index = curieIndex();
    const marie = index.person("@I1@");
    draw("@I1@", { index });
    container.querySelector<HTMLElement>(".gedcom-desk-heading .gedcom-desk-link")?.click();
    expect(host.showInSource).toHaveBeenLastCalledWith(marie?.range);

    draw("@I1@", { index, selected: "p:0" });
    container.querySelector<HTMLElement>(".gedcom-desk-heading .gedcom-desk-link")?.click();
    expect(host.showInSource).toHaveBeenLastCalledWith(marie?.events[0]?.range);
  });

  it("shows a parent the file does not declare, with the way to its line", () => {
    const index = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 FAMC @F1@",
      "0 @I2@ INDI", "1 NAME Jan /Nowak/",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I98@", "1 CHIL @I1@",
      "0 TRLR", "",
    ].join("\n")));
    draw("@I1@", { index });

    expect(texts(".gedcom-desk-person-name")).toEqual(["Jan Nowak"]);
    expect(texts(".gedcom-desk-missing span")).toEqual([
      "Points to a record that is not in the file",
    ]);
    container.querySelector<HTMLElement>(".gedcom-desk-missing .gedcom-desk-link")?.click();
    expect(host.showInSource.mock.calls[0]?.[0].start.line).toBe(10);
  });

  it("names facts and relationships in Russian, keeping what the file says", () => {
    setLanguage("ru");
    draw("@I1@");

    expect(labelOf(treeRows()[3] ?? container)).toBe("Рождение");
    expect(summaryOf(treeRows()[3])).toBe("7 NOV 1867 · Warsaw, Congress Poland");
    expect(texts("h2").slice(0, 1)).toEqual(["Семья"]);
    expect(texts(".gedcom-desk-kin-label")[0]).toBe("Родители");
  });

  it("orders a person's own facts as the record writes them, then each marriage", () => {
    const marie = curieIndex().person("@I1@");
    const keys = marie ? factsOf(marie).map((fact) => fact.key) : [];

    expect(keys).toEqual(["p:0", "p:1", "p:2", "u:0:0"]);
  });
});

describe("the sections of a person card", () => {
  it("run the lines of the record, Family, Media and Timeline, with no tab bar and no drawing of the family", () => {
    const person = curieIndex().person("@I1@");
    if (!person) {
      throw new Error("no Marie");
    }
    renderPersonPage(
      container,
      person,
      curieIndex(),
      { selected: null, media: person.media.map(({ at }) => ({ content: { kind: "missing" as const, target: "marie.jpg" }, at })) },
      host,
    );

    expect(container.firstElementChild?.nextElementSibling?.classList.contains("gedcom-tree")).toBe(true);
    expect(texts("h2")).toEqual(["Family", "Media", "Timeline"]);
    expect(container.querySelector(".gedcom-fg-canvas")).toBeNull();
  });

  it("folds the timeline, closed, with its count", () => {
    draw("@I1@");
    const buttons = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-fold-button")];

    expect(buttons.map((button) => button.textContent)).toEqual(["Timeline"]);
    expect(buttons.map((button) => button.getAttribute("data-count"))).toEqual(["18"]);
    expect(buttons.map((button) => button.getAttribute("aria-expanded"))).toEqual(["false"]);
    expect([...container.querySelectorAll(".gedcom-desk-fold-body")].map((body) => body.hasAttribute("hidden"))).toEqual([true]);
    expect(container.querySelector(".gedcom-tree")?.closest("[hidden]")).toBeNull();
  });

  it("opens a fold on its heading, and tells which one", () => {
    const folded = vi.fn<(id: string, open: boolean) => void>();
    const index = curieIndex();
    const person = index.person("@I1@");
    if (!person) {
      throw new Error("no Marie");
    }
    renderPersonPage(container, person, index, { selected: null, folded }, host);
    container.querySelector<HTMLElement>(".gedcom-desk-fold-button")?.click();

    expect(container.querySelector(".gedcom-desk-fold-body")?.hasAttribute("hidden")).toBe(false);
    expect(container.querySelector(".gedcom-desk-fold-button")?.getAttribute("aria-expanded")).toBe("true");
    expect(folded).toHaveBeenCalledWith("timeline", true);
  });

  it("draws a fold open where the reader had opened it", () => {
    const index = curieIndex();
    const person = index.person("@I1@");
    if (!person) {
      throw new Error("no Marie");
    }
    renderPersonPage(container, person, index, { selected: null, open: new Set(["timeline"]) }, host);

    expect([...container.querySelectorAll(".gedcom-desk-fold-body")].map((body) => body.hasAttribute("hidden"))).toEqual([false]);
  });

  it("lists seventeen dated entries from 1860 to 1934 and the undated Occupation in the timeline", () => {
    draw("@I1@", { open: ["timeline"] });
    const dated = [...container.querySelectorAll(".gedcom-desk-timeline")][0];
    const years = [...(dated?.querySelectorAll(".gedcom-desk-moment-year") ?? [])].map((node) => node.textContent);

    expect(years).toHaveLength(17);
    expect(years[0]).toBe("1860");
    expect(years.at(-1)).toBe("1934");
    expect(texts("h3")).toEqual(["Undated"]);
    const undated = [...container.querySelectorAll(".gedcom-desk-timeline")][1];
    expect([...(undated?.querySelectorAll(".gedcom-desk-moment-what") ?? [])].map((node) => node.textContent)).toEqual([
      "Occupation",
    ]);
  });

  it("opens the card of an event from the timeline, and a relative's entry opens the relative", () => {
    draw("@I1@", { open: ["timeline"] });
    const entries = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-moment-what")];
    entries.find((node) => node.textContent === "Birth")?.click();
    entries.find((node) => node.textContent === "Death of husband Pierre Curie")?.click();

    expect(host.openRecord.mock.calls).toEqual([["event:@I1@:BIRT:0"], ["@I2@"]]);
  });

  it("opens the place of a timeline entry", () => {
    draw("@I1@", { open: ["timeline"] });
    container.querySelector<HTMLElement>(".gedcom-desk-moment-detail .gedcom-desk-link")?.click();

    expect(host.openRecord).toHaveBeenCalledWith(expect.stringMatching(/^place:/u));
  });
});
