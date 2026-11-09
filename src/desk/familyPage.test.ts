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
  container.empty();
  renderFamilyPage(container, family, index, { selected }, host);
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the family page", () => {
  it("is headed by the spouses with the marriage", () => {
    draw("@F3@");

    expect(texts(".gedcom-desk-title")).toEqual(["Pierre Curie ⚭ Marie Skłodowska-Curie"]);
    expect(texts(".gedcom-desk-subtitle")).toEqual(["Married 26 JUL 1895, Sceaux"]);
  });

  it("shows the lines of the family's record as a tree, the marriage with its date and place and no mark", () => {
    draw("@F3@");
    const labels = [...container.querySelectorAll(".gedcom-tree-row .gedcom-tree-label")].map((node) => node.textContent);

    expect(labels).toEqual(["Husband", "Wife", "Child", "Child", "Marriage"]);
    expect(texts(".gedcom-tree-summary")).toEqual(["26 JUL 1895 · Sceaux, France"]);
    expect(container.querySelector(".gedcom-desk-source")).toBeNull();
    expect(container.querySelector(".gedcom-desk-fact")).toBeNull();
  });

  it("has the tree and a Family section, and none of events, notes, related people, identifiers or other data", () => {
    draw("@F3@");

    expect(texts("h2")).toEqual(["Family"]);
    expect(container.querySelector(".gedcom-desk-heading + .gedcom-tree")).not.toBeNull();
  });

  it("shows the spouses by their roles and the children", () => {
    draw("@F3@");

    expect(texts(".gedcom-desk-kin-label")).toEqual(["Husband", "Wife", "Children"]);
    expect(texts(".gedcom-desk-person-name")).toEqual([
      "Pierre Curie", "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Ève Curie",
    ]);
  });

  it("selects a member", () => {
    draw("@F3@");
    [...container.querySelectorAll<HTMLElement>(".gedcom-desk-person")]
      .find((node) => node.textContent?.startsWith("Ève Curie"))
      ?.click();

    expect(host.openRecord).toHaveBeenCalledWith("@I13@");
  });

  it("opens the card of a family's event from the label of its row, and shows the selected one in the source", () => {
    const index = curieIndex();
    draw("@F3@", { index });
    container.querySelector<HTMLElement>(".gedcom-tree-label.is-fact")?.click();
    expect(host.openRecord).toHaveBeenCalledWith("event:@F3@:MARR:0");

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
    expect(texts(".gedcom-desk-missing span")).toEqual([
      "Points to a record that is not in the file",
      "Points to a record that is not in the file",
    ]);
  });

  it("shows the number of children the file states beside the children it lists", () => {
    draw("@F1@", {
      index: buildIndex(new GedcomLanguageService([
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/", "0 @I2@ INDI", "1 NAME Jan /Nowak/", "0 @I3@ INDI", "1 NAME Eva /Nowak/",
        "0 @F1@ FAM", "1 WIFE @I1@", "1 NCHI 3", "1 CHIL @I2@", "1 CHIL @I3@",
        "0 TRLR", "",
      ].join("\n"))),
    });
    const row = [...container.querySelectorAll(".gedcom-tree-row")].find((one) => one.querySelector(".gedcom-tree-label")?.textContent === "Number of children");

    expect(row?.querySelector(".gedcom-field")?.getAttribute("data-value")).toBe("3");
    expect(texts(".gedcom-desk-person-name")).toEqual(["Anna Nowak", "Jan Nowak", "Eva Nowak"]);
  });

  it("shows a note of the family in its tree, and marks an adopted child in the children", () => {
    draw("@F1@", {
      index: buildIndex(new GedcomLanguageService([
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/", "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 FAMC @F1@", "2 PEDI ADOPTED",
        "0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I2@", "1 NOTE Married in the church.",
        "0 TRLR", "",
      ].join("\n"))),
    });

    expect(texts(".gedcom-detail-text-body")).toEqual(["Married in the church."]);
    expect(texts(".gedcom-desk-person-note")).toEqual(["Adopted"]);
  });

  it("names the couple in Russian", () => {
    setLanguage("ru");
    draw("@F3@");

    expect(texts(".gedcom-desk-title")).toEqual(["Pierre Curie ⚭ Marie Skłodowska-Curie"]);
  });
});
