// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GedcomLanguageService } from "@domorium/language-service";
import { buildIndex, type GenealogyIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import type { PageHost } from "./personPage";
import { renderSourcePage } from "./sourcePage";

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
  it("is the tree of the lines of the record and nothing else", () => {
    draw("@S2@");
    const labels = [...container.querySelectorAll(".gedcom-tree-node:not(.is-root) > .gedcom-tree-row .gedcom-tree-label")].map((node) => node.textContent);

    expect([...container.children].map((child) => child.className)).toEqual(["gedcom-tree"]);
    expect(labels).toEqual(expect.arrayContaining(["Title", "Repository"]));
    expect(texts("h2")).toEqual([]);
    expect(container.querySelector(".gedcom-desk-repository, .gedcom-desk-cited-by, .gedcom-desk-citer")).toBeNull();
    expect(container.querySelector(".gedcom-tree .gedcom-desk-fact")).toBeNull();
  });

  it("shows the repository as the name of the record the line points at, and no address", () => {
    draw("@S2@");
    const row = [...container.querySelectorAll(".gedcom-tree-row")].find((one) => one.querySelector(".gedcom-tree-label")?.textContent === "Repository");

    expect(row?.textContent).toContain("State Archive in Warsaw");
    expect(container.textContent).not.toContain("Krzywe Koło");
  });

  it("shows a repository the file does not declare as a pointer to a record that is not in the file", () => {
    draw("@S1@", buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @S1@ SOUR", "1 TITL Alone", "1 REPO @R9@", "0 TRLR", "",
    ].join("\n"))));

    expect(texts(".gedcom-desk-missing span")).toEqual(["Points to a record that is not in the file"]);
  });

  it("does not take a title for an event, whatever lies beneath it", () => {
    draw("@S1@", buildIndex(new GedcomLanguageService([
      "0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @S1@ SOUR", "1 TITL Register", "2 DATE 1900", "2 PLAC Paris", "0 TRLR", "",
    ].join("\n"))));

    expect(texts(".gedcom-tree-summary")).toEqual(["Register"]);
    expect(container.querySelector("button.gedcom-tree-label")).toBeNull();
  });

  it("lists no record that cites it, and says nothing of who does", () => {
    draw("@S3@");

    expect(container.textContent).not.toContain("Cited by");
    expect(container.querySelector(".gedcom-desk-person")).toBeNull();
  });
});
