// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { renderFamilyPage } from "./familyPage";
import type { PageHost } from "./personPage";

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

function draw(
  xref: string,
  { index = curieIndex() }: { index?: GenealogyIndex } = {},
): void {
  const family = index.family(xref);
  if (!family) {
    throw new Error(`no family ${xref}`);
  }
  container.empty();
  renderFamilyPage(container, family, index, {}, host);
}

const texts = (selector: string): string[] =>
  [...container.querySelectorAll(selector)].map((node) => node.textContent ?? "");

describe("the family page", () => {
  it("is the tree of the lines of the record and nothing else", () => {
    draw("@F3@");
    const labels = [...container.querySelectorAll(".gedcom-tree-node:not(.is-root) > .gedcom-tree-row .gedcom-tree-label")].map((node) => node.textContent);

    expect(labels).toEqual(["Husband", "Wife", "Child", "Child", "Marriage"]);
    expect([...container.children].map((child) => child.className)).toEqual(["gedcom-tree"]);
    expect(texts(".gedcom-tree-summary")).toEqual(["26 JUL 1895 · Sceaux, France"]);
    expect(container.querySelector(".gedcom-desk-source")).toBeNull();
  });

  it("links the husband, the wife and the children in the tree, and a press selects that person", () => {
    draw("@F3@");
    const links = [...container.querySelectorAll<HTMLElement>(".gedcom-tree button.gedcom-desk-link")];

    expect(links.map((link) => link.textContent)).toEqual(["Pierre Curie", "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Ève Curie"]);
    links.find((link) => link.textContent === "Ève Curie")?.click();
    expect(host.openRecord).toHaveBeenCalledWith("@I13@");
  });

  it("draws the label of the marriage as text that opens nothing", () => {
    draw("@F3@");
    container.querySelector<HTMLElement>(".gedcom-tree-label")?.click();
    expect(container.querySelector("button.gedcom-tree-label")).toBeNull();
    expect(host.openRecord).not.toHaveBeenCalled();
  });

  it("shows a spouse and a child the file does not declare as pointers to records that are not in the file", () => {
    draw("@F1@", {
      index: buildIndex(new GedcomLanguageService([
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/",
        "0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I99@",
        "0 TRLR", "",
      ].join("\n"))),
    });

    expect(texts(".gedcom-desk-missing span")).toEqual(["Points to a record that is not in the file"]);
    container.querySelector<HTMLElement>(".gedcom-desk-missing .gedcom-desk-link")?.click();
    expect(host.showInSource).toHaveBeenCalled();
  });

  it("shows the number of children the file states beside the children it names", () => {
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
    expect(texts(".gedcom-tree button.gedcom-desk-link")).toEqual(["Anna Nowak", "Jan Nowak", "Eva Nowak"]);
  });

  it("shows a note of the family and the pointer of an adopted child in its tree, with no mark of its own", () => {
    draw("@F1@", {
      index: buildIndex(new GedcomLanguageService([
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/", "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 FAMC @F1@", "2 PEDI ADOPTED",
        "0 @F1@ FAM", "1 WIFE @I1@", "1 CHIL @I2@", "1 NOTE Married in the church.",
        "0 TRLR", "",
      ].join("\n"))),
    });

    expect(texts(".gedcom-detail-text-body")).toEqual(["Married in the church."]);
    expect(container.textContent).not.toContain("Adopted");
  });
});
