// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { factsOf, renderPersonPage, type PageHost } from "./personPage";

let container: HTMLElement;
let host: ReturnType<typeof pageHost>;

function pageHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
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
  { index = curieIndex() }: { index?: GenealogyIndex } = {},
): void {
  const person = index.person(xref);
  if (!person) {
    throw new Error(`no person ${xref}`);
  }
  container.empty();
  renderPersonPage(container, person, index, {}, host);
}

const gedcom = (...lines: string[]): GenealogyIndex =>
  buildIndex(new GedcomLanguageService(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR", ""].join("\n")));

const citedBirth = gedcom(
  "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S2@", "1 DEAT", "1 OCCU Teacher", "1 BURI",
  "0 @S2@ SOUR", "1 TITL Register",
);

const treeRows = (): HTMLElement[] => [...container.querySelectorAll<HTMLElement>(".gedcom-tree-node:not(.is-root) > .gedcom-tree-row")];
const labelOf = (row: Element): string => row.querySelector(".gedcom-tree-label")?.textContent ?? "";
const treeRow = (label: string, at = 0): HTMLElement | undefined => treeRows().filter((row) => labelOf(row) === label)[at];
const summaryOf = (row: Element | undefined): string | undefined => row?.querySelector(".gedcom-tree-summary")?.textContent ?? undefined;

describe("the person card", () => {
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
  });

  it("marks with a dot only the closed nodes that cite a source, and says nothing of those that do not", () => {
    draw("@I1@", { index: citedBirth });

    expect(treeRows().filter((row) => row.querySelector(".gedcom-desk-source")).map(labelOf)).toEqual(["Birth"]);
    expect(container.querySelector(".gedcom-desk-source")?.getAttribute("aria-label")).toBe("1 source");
    expect(container.textContent).not.toContain("without a source");
  });

  it("draws no section of names, events, details, notes, related people, identifiers or other data", () => {
    draw("@I1@");

    expect(container.querySelector("h1, h2, h3")).toBeNull();
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

  it("draws the label of a fact as text that opens nothing, and keeps its place a link", () => {
    draw("@I1@");
    const birth = treeRow("Birth");

    expect(birth?.querySelector("button.gedcom-tree-label")).toBeNull();
    treeRow("Sex")?.querySelector<HTMLElement>(".gedcom-tree-label")?.click();
    expect(host.openRecord).not.toHaveBeenCalled();
    expect(birth?.querySelector(".gedcom-tree-summary .gedcom-desk-link")?.textContent).toBe("Warsaw, Congress Poland");
  });

  it("opens the place of a fact, and not the event, when the place is pressed", () => {
    draw("@I1@");
    container.querySelector<HTMLElement>(".gedcom-tree-summary .gedcom-desk-link")?.click();

    expect(host.openRecord.mock.calls).toEqual([["place:warsaw, congress poland"]]);
  });

  it("names facts and relationships in Russian, keeping what the file says", () => {
    setLanguage("ru");
    draw("@I1@");

    expect(labelOf(treeRows()[3] ?? container)).toBe("Рождение");
    expect(summaryOf(treeRows()[3])).toBe("7 NOV 1867 · Warsaw, Congress Poland");
  });

  it("is the tree of the record and nothing else", () => {
    draw("@I1@");

    expect([...container.children].map((child) => child.className)).toEqual(["gedcom-tree"]);
  });

  it("orders a person's own facts as the record writes them", () => {
    const marie = curieIndex().person("@I1@");
    const keys = marie ? factsOf(marie).map((fact) => fact.key) : [];

    expect(keys).toEqual(["p:0", "p:1", "p:2"]);
  });
});
