// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { factsOf, renderPersonPage, type FactKey, type PageHost } from "./personPage";
import { renderGonePage } from "./sourcePage";

let container: HTMLElement;
let host: ReturnType<typeof pageHost>;

function pageHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
    select: vi.fn<PageHost["select"]>(),
    showInSource: vi.fn<PageHost["showInSource"]>(),
    openEvidence: vi.fn<PageHost["openEvidence"]>(),
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
  { selected = null, phone = false, index = curieIndex() }:
    { selected?: FactKey | null; phone?: boolean; index?: GenealogyIndex } = {},
): void {
  const person = index.person(xref);
  if (!person) {
    throw new Error(`no person ${xref}`);
  }
  renderPersonPage(container, person, index, { selected, phone }, host);
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

const facts = (): string[][] =>
  [...container.querySelectorAll(".gedcom-desk-fact")].map((row) =>
    [...row.children].map((part) => part.textContent ?? ""),
  );

describe("the person page", () => {
  it("heads the page with the name, the years and the places", () => {
    draw("@I1@");

    expect(texts(".gedcom-desk-title")).toEqual(["Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["1867–1934 · Warsaw → Passy"]);
  });

  it("lists Marie's facts, her marriage among them, none citing a source", () => {
    draw("@I1@");

    expect(facts()).toEqual([
      ["Birth", "7 NOV 1867 · Warsaw, Congress Poland", "No source"],
      ["Death", "4 JUL 1934 · Passy, Haute-Savoie, France", "No source"],
      ["Occupation", "Physicist and chemist", "No source"],
      ["Marriage", "26 JUL 1895 · Sceaux, France · with Pierre Curie", "No source"],
    ]);
  });

  it("counts the sources a fact cites itself", () => {
    const index = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S2@",
      "0 @S2@ SOUR", "1 TITL Register",
      "0 TRLR", "",
    ].join("\n")).getDocumentSymbols());
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

  it("opens a relative's page", () => {
    draw("@I1@");
    const pierre = [...container.querySelectorAll<HTMLElement>(".gedcom-desk-person")]
      .find((node) => node.textContent?.startsWith("Pierre Curie"));
    pierre?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I2@");
  });

  it("selects a fact, and lets go of it when it is chosen again", () => {
    draw("@I1@");
    container.querySelector<HTMLElement>(".gedcom-desk-fact")?.click();
    expect(host.select).toHaveBeenCalledWith("p:0");

    draw("@I1@", { selected: "p:0" });
    const selected = container.querySelector<HTMLElement>(".gedcom-desk-fact.is-selected");
    selected?.click();
    expect(host.select).toHaveBeenLastCalledWith(null);
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

  it("unfolds a tapped fact on a phone, and only there", () => {
    draw("@I1@", { selected: "p:0" });
    expect(container.querySelector(".gedcom-desk-unfold")).toBeNull();

    draw("@I1@", { selected: "p:0", phone: true });
    expect(texts(".gedcom-desk-unfold-none")).toEqual(["No source of its own"]);
    const [allEvidence] = container.querySelectorAll<HTMLElement>(".gedcom-desk-unfold .gedcom-desk-link");
    allEvidence?.click();
    expect(host.openEvidence).toHaveBeenCalled();
  });

  it("shows a parent the file does not declare, with the way to its line", () => {
    const index = buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 FAMC @F1@",
      "0 @I2@ INDI", "1 NAME Jan /Nowak/",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I98@", "1 CHIL @I1@",
      "0 TRLR", "",
    ].join("\n")).getDocumentSymbols());
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

    expect(facts()[0]).toEqual(["Рождение", "7 NOV 1867 · Warsaw, Congress Poland", "Без источника"]);
    expect(texts(".gedcom-desk-kin-label")[0]).toBe("Родители");
  });

  it("orders a person's own facts as the record writes them, then each marriage", () => {
    const marie = curieIndex().person("@I1@");
    const keys = marie ? factsOf(marie).map((fact) => fact.key) : [];

    expect(keys).toEqual(["p:0", "p:1", "p:2", "u:0:0"]);
  });
});

describe("a page whose record has gone", () => {
  it("says so and offers the first person and the source", () => {
    const showFirst = vi.fn();
    const openSource = vi.fn();
    renderGonePage(container, { showFirst, openSource });

    expect(container.textContent).toContain("This record is no longer in the file");
    const [first, source] = container.querySelectorAll<HTMLElement>(".gedcom-desk-link");
    first?.click();
    source?.click();
    expect(showFirst).toHaveBeenCalled();
    expect(openSource).toHaveBeenCalled();
  });
});
