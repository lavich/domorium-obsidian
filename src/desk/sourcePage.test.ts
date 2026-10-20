// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import type { PageHost } from "./personPage";
import { renderEmptyPage, renderSourcePage } from "./sourcePage";

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

function draw(xref: string, index: GenealogyIndex = curieIndex()): void {
  const source = index.source(xref);
  if (!source) {
    throw new Error(`no source ${xref}`);
  }
  renderSourcePage(container, source, index, host);
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the source page", () => {
  it("heads the page with the title, author and publication", () => {
    draw("@S1@");

    expect(texts(".gedcom-desk-title")).toEqual(["The Nobel Prize in Physics 1903"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["Nobel Prize Outreach · nobelprize.org"]);
  });

  it("shows the repository with its address", () => {
    draw("@S2@");

    expect(texts(".gedcom-desk-repository div")).toEqual([
      "State Archive in Warsaw",
      "Krzywe Koło 7, Warsaw, Poland",
    ]);
  });

  it("lists every record citing it, with the page each states", () => {
    draw("@S3@");

    expect(texts(".gedcom-desk-person-name")).toEqual([
      "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Frédéric Joliot",
    ]);
    expect(texts(".gedcom-desk-citer-where")).toEqual([
      "Whole record — Nobel Prize in Chemistry 1911",
      "Whole record — Nobel Prize in Chemistry 1935, shared with Frédéric Joliot",
      "Whole record — Nobel Prize in Chemistry 1935",
    ]);
  });

  it("names the event a citation sits under", () => {
    draw("@S1@", buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 SOUR @S1@", "3 PAGE entry 88",
      "0 @S1@ SOUR", "1 TITL Register",
      "0 TRLR", "",
    ].join("\n")).getDocumentSymbols()));

    expect(texts(".gedcom-desk-citer-where")).toEqual(["Birth — entry 88"]);
  });

  it("opens a citing family's page", () => {
    draw("@S1@", buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @I1@ INDI", "1 NAME Anna /Nowak/",
      "0 @I2@ INDI", "1 NAME Jan /Nowak/",
      "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR", "2 SOUR @S1@",
      "0 @S1@ SOUR", "1 TITL Register",
      "0 TRLR", "",
    ].join("\n")).getDocumentSymbols()));
    container.querySelector<HTMLElement>(".gedcom-desk-person")?.click();

    expect(texts(".gedcom-desk-person-name")).toEqual(["Jan Nowak and Anna Nowak"]);
    expect(texts(".gedcom-desk-citer-where")).toEqual(["Marriage"]);
    expect(host.openRecord).toHaveBeenCalledWith("@F1@");
  });

  it("opens a citing person's page", () => {
    draw("@S3@");
    container.querySelector<HTMLElement>(".gedcom-desk-person")?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I1@");
  });

  it("says when nothing cites it", () => {
    draw("@S1@", buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @S1@ SOUR", "1 TITL Alone", "0 TRLR", "",
    ].join("\n")).getDocumentSymbols()));

    expect(texts(".gedcom-desk-cited-by .gedcom-desk-none")).toEqual(["No record cites it."]);
  });
});

describe("a file with nothing to show", () => {
  it("says it holds no people and offers the source", () => {
    const openSource = vi.fn();
    renderEmptyPage(container, openSource);
    container.querySelector<HTMLElement>(".gedcom-desk-link")?.click();

    expect(container.textContent).toContain("The file holds no people");
    expect(openSource).toHaveBeenCalled();
  });
});
