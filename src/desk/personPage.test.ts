// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { factsOf, renderFactList, renderPersonPage, type FactKey, type PageHost } from "./personPage";

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
  { selected = null, index = curieIndex() }:
    { selected?: FactKey | null; index?: GenealogyIndex } = {},
): void {
  const person = index.person(xref);
  if (!person) {
    throw new Error(`no person ${xref}`);
  }
  container.empty();
  renderPersonPage(container, person, index, { selected }, host);
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
const citedEvery = gedcom(
  "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S2@", "1 DEAT", "2 SOUR @S2@",
  "0 @S2@ SOUR", "1 TITL Register",
);
const marriedPerson = gedcom(
  "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 FAMS @F1@", "1 BIRT",
  "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 FAMS @F1@",
  "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR",
);

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

const facts = (): string[][] =>
  [...container.querySelectorAll(".gedcom-desk-fact")].map((row) =>
    [...row.children].map((part) => part.textContent ?? ""),
  );

describe("the person card", () => {
  it("heads the page with the name, the years and the places", () => {
    draw("@I1@");

    expect(texts(".gedcom-desk-title")).toEqual(["Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["1867–1934 · Warsaw → Passy"]);
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

  it("lists Marie's facts, her marriage among them, with no mark on any, and says none cites a source", () => {
    draw("@I1@");

    expect(facts()).toEqual([
      ["Birth", "7 NOV 1867 · Warsaw, Congress Poland"],
      ["Death", "4 JUL 1934 · Passy, Haute-Savoie, France"],
      ["Occupation", "Physicist and chemist"],
      ["Marriage", "26 JUL 1895 · Sceaux, France · with Pierre Curie"],
    ]);
    expect(texts(".gedcom-desk-unsourced")).toEqual(["Facts without a source: 4 of 4"]);
  });

  it("counts the facts without a source and marks only those that cite one", () => {
    draw("@I1@", { index: citedBirth });

    expect(texts(".gedcom-desk-unsourced")).toEqual(["Facts without a source: 3 of 4"]);
    expect(facts().map((row) => row.length)).toEqual([3, 2, 2, 2]);
  });

  it("draws no line where every fact cites a source", () => {
    draw("@I1@", { index: citedEvery });

    expect(container.querySelector(".gedcom-desk-unsourced")).toBeNull();
  });

  it("counts a fact of a family the person married into", () => {
    draw("@I1@", { index: marriedPerson });

    expect(texts(".gedcom-desk-unsourced")).toEqual(["Facts without a source: 2 of 2"]);
  });

  it("puts the line above the facts, not in the list", () => {
    draw("@I1@");
    const line = container.querySelector(".gedcom-desk-unsourced");

    expect(line?.closest(".gedcom-desk-facts")).toBeNull();
    expect(line?.nextElementSibling?.classList.contains("gedcom-desk-facts")).toBe(true);
  });

  it("counts the sources a fact cites itself", () => {
    const index = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S2@",
      "0 @S2@ SOUR", "1 TITL Register",
      "0 TRLR", "",
    ].join("\n")));
    draw("@I1@", { index });

    expect(facts()[0]?.[2]).toBe("1 source");
  });

  it("shows no identifier, level or tag anywhere", () => {
    draw("@I1@");

    expect(container.textContent).not.toMatch(/@[A-Z]+\d+@|\b(BIRT|DEAT|FAMS|INDI)\b/);
  });

  it("lists her other name", () => {
    draw("@I1@");

    expect(texts(".gedcom-desk-name")).toEqual(["Maria Salomea Skłodowska"]);
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
    expect(texts(".gedcom-desk-person-note")).toEqual(["Married 26 JUL 1895, Sceaux"]);
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

  it("opens the card of an event when its fact is chosen, by the row and by its name", () => {
    draw("@I1@");
    const rows = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-fact")];
    rows[0]?.click();
    rows[1]?.querySelector<HTMLElement>(".gedcom-desk-fact-name")?.click();

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
    container.querySelector<HTMLElement>(".gedcom-desk-fact .gedcom-desk-fact-value .gedcom-desk-link")?.click();

    expect(host.openRecord.mock.calls).toEqual([["place:warsaw, congress poland"]]);
  });

  it("gives a fact of a record with no identifier an inert row and a disabled name", () => {
    const index = buildIndex(new GedcomLanguageService(["0 HEAD", "0 INDI", "1 NAME A /B/", "1 BIRT", "0 TRLR", ""].join("\n")));
    const person = index.people[0];
    container.empty();
    if (person) {
      renderFactList(container, [{ key: "p:0", event: { tag: "BIRT", citations: [], range: { start: { line: 3, character: 0 }, end: { line: 3, character: 6 } } } }], index, { selected: null }, host);
    }

    expect(container.querySelector(".gedcom-desk-fact")?.classList.contains("is-inert")).toBe(true);
    expect(container.querySelector(".gedcom-desk-fact-name")?.hasAttribute("disabled")).toBe(true);
    container.querySelector<HTMLElement>(".gedcom-desk-fact")?.click();
    expect(host.openRecord).not.toHaveBeenCalled();
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

    expect(facts()[0]).toEqual(["Рождение", "7 NOV 1867 · Warsaw, Congress Poland"]);
    expect(texts(".gedcom-desk-unsourced")).toEqual(["Фактов без источника: 4 из 4"]);
    expect(texts(".gedcom-desk-kin-label")[0]).toBe("Родители");
  });

  it("orders a person's own facts as the record writes them, then each marriage", () => {
    const marie = curieIndex().person("@I1@");
    const keys = marie ? factsOf(marie).map((fact) => fact.key) : [];

    expect(keys).toEqual(["p:0", "p:1", "p:2", "u:0:0"]);
  });
});

describe("the sections of a person card", () => {
  it("run Facts, Other names, Family, Media and Timeline, with no tab bar and no tree", () => {
    const person = curieIndex().person("@I1@");
    if (!person) {
      throw new Error("no Marie");
    }
    renderPersonPage(
      container,
      person,
      curieIndex(),
      { selected: null, media: [{ content: { kind: "missing", target: "marie.jpg" }, at: { line: 1, character: 0 } }] },
      host,
    );

    expect(texts("h2")).toEqual(["Facts", "Other names", "Family", "Media", "Timeline"]);
    expect(container.querySelector(".gedcom-fg-canvas")).toBeNull();
  });

  it("folds the timeline, closed, with its count", () => {
    draw("@I1@");
    const buttons = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-fold-button")];

    expect(buttons.map((button) => button.textContent)).toEqual(["Timeline"]);
    expect(buttons.map((button) => button.getAttribute("data-count"))).toEqual(["18"]);
    expect(buttons.map((button) => button.getAttribute("aria-expanded"))).toEqual(["false"]);
    expect([...container.querySelectorAll(".gedcom-desk-fold-body")].map((body) => body.hasAttribute("hidden"))).toEqual([true]);
    expect(container.querySelector(".gedcom-desk-names")?.closest("[hidden]")).toBeNull();
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
    draw("@I1@");
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
    draw("@I1@");
    const entries = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-moment-what")];
    entries.find((node) => node.textContent === "Birth")?.click();
    entries.find((node) => node.textContent === "Death of husband Pierre Curie")?.click();

    expect(host.openRecord.mock.calls).toEqual([["event:@I1@:BIRT:0"], ["@I2@"]]);
  });

  it("opens the place of a timeline entry", () => {
    draw("@I1@");
    container.querySelector<HTMLElement>(".gedcom-desk-moment-detail .gedcom-desk-link")?.click();

    expect(host.openRecord).toHaveBeenCalledWith(expect.stringMatching(/^place:/u));
  });
});
