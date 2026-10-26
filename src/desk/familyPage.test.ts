// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { renderFamilyPage } from "./familyPage";
import type { FactKey, PageHost } from "./personPage";

let container: HTMLElement;
let host: ReturnType<typeof pageHost>;

function pageHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
    select: vi.fn<PageHost["select"]>(),
    showInSource: vi.fn<PageHost["showInSource"]>(),
    openEvidence: vi.fn<PageHost["openEvidence"]>(),
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
  { selected = null, index = curieIndex() }: { selected?: FactKey | null; index?: GenealogyIndex } = {},
): void {
  const family = index.family(xref);
  if (!family) {
    throw new Error(`no family ${xref}`);
  }
  renderFamilyPage(container, family, index, { selected, phone: false }, host);
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the family page", () => {
  it("is headed by the spouses with the marriage", () => {
    draw("@F3@");

    expect(texts(".gedcom-desk-title")).toEqual(["Pierre Curie and Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["Married 26 JUL 1895, Sceaux"]);
  });

  it("lists the family's facts with their source state", () => {
    draw("@F3@");

    expect(texts(".gedcom-desk-fact")).toEqual([
      "Marriage26 JUL 1895 · Sceaux, FranceNo source",
    ]);
  });

  it("shows the spouses by their roles and the children", () => {
    draw("@F3@");

    expect(texts(".gedcom-desk-kin-label")).toEqual(["Husband", "Wife", "Children"]);
    expect(texts(".gedcom-desk-person-name")).toEqual([
      "Pierre Curie", "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Ève Curie",
    ]);
  });

  it("opens a member's page", () => {
    draw("@F3@");
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-person")]
      .find((node) => node.textContent?.startsWith("Ève Curie"))
      ?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I13@");
  });

  it("selects a family fact, and shows it in the source", () => {
    const index = curieIndex();
    draw("@F3@", { index });
    container.querySelector<HTMLElement>(".gedcom-desk-fact")?.click();
    expect(host.select).toHaveBeenCalledWith("f:0");

    draw("@F3@", { index, selected: "f:0" });
    container.querySelector<HTMLElement>(".gedcom-desk-heading .gedcom-desk-link")?.click();
    expect(host.showInSource).toHaveBeenCalledWith(index.family("@F3@")?.events[0]?.range);
  });

  it("says when a family records no children", () => {
    draw("@F5@");

    expect(texts(".gedcom-desk-kin-label")).toEqual(["Husband", "Wife", "Children"]);
    expect(texts(".gedcom-desk-family .gedcom-desk-none")).toEqual(["Not recorded"]);
  });

  it("shows a member the file does not declare", () => {
    draw("@F1@", {
      index: buildIndex(new GedcomLanguageService([
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/",
        "0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I99@",
        "0 TRLR", "",
      ].join("\n"))),
    });

    expect(texts(".gedcom-desk-title")).toEqual(["Anna Nowak"]);
    expect(texts(".gedcom-desk-missing span")).toEqual(["Points to a record that is not in the file"]);
  });

  it("names the couple in Russian", () => {
    setLanguage("ru");
    draw("@F3@");

    expect(texts(".gedcom-desk-title")).toEqual(["Pierre Curie и Marie Skłodowska-Curie"]);
  });
});
