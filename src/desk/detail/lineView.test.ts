// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, HEADER_ID, type GenealogyIndex, type RecordLine } from "../../genealogy";
import { curieIndex } from "../../testing/curie";
import { installObsidianDom } from "../../testing/obsidianDom";
import { recordTitle, renderLines, type DetailContext } from "./lineView";

beforeAll(installObsidianDom);

const shown = vi.fn<(xref: string) => void>();
const opened = vi.fn<(xref: string) => void>();
let box: HTMLElement;

beforeEach(() => {
  shown.mockReset();
  opened.mockReset();
  box = document.createElement("div");
  document.body.replaceChildren(box);
});

function make(lines: string[]): { index: GenealogyIndex; ctx: DetailContext; record: RecordLine } {
  const index = buildIndex(new GedcomLanguageService(["0 HEAD", "1 GEDC", "2 VERS 7.0", ...lines, "0 TRLR"].join("\n")));
  const ctx: DetailContext = {
    index,
    host: { openRecord: opened, showInSource: () => shown("line") },
  };
  const record = index.record("@I1@");
  if (!record) {
    throw new Error("no record");
  }
  return { index, ctx, record };
}

const rows = (selector: string) => [...box.querySelectorAll(selector)].map((one) => one.textContent);

describe("a line as the file writes it", () => {
  it("draws every line of a custom structure, nested as the file nests it, with its tag as written", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 _TRIBE Highlander", "2 _CLAN Sas", "3 _SINCE 1800"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);

    expect(rows(".gedcom-detail-label")).toEqual(["_TRIBE", "_CLAN", "_SINCE"]);
    expect(box.querySelector(".gedcom-detail .gedcom-detail .gedcom-detail .gedcom-detail-value")?.textContent).toBe("1800");
  });

  it("names a standard tag in the reader's language and gives every row the number of its line", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 SEX F", "1 CAUS Illness"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);

    expect(rows(".gedcom-detail-label")).toEqual(["Sex", "Cause"]);
    expect(rows(".gedcom-detail-value")).toEqual(["Female", "Illness"]);
    expect([...box.querySelectorAll("[data-line]")].map((one) => one.getAttribute("data-line"))).toEqual(
      record.children.map((child) => String(child.range.start.line)),
    );
  });

  it("shows an escaped at sign as one, and a continued text as the file continues it", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 _MAIL write to me@@example.org", "1 _TEXT first", "2 CONT second"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);

    expect(rows(".gedcom-detail-value")).toEqual(["write to me@example.org", "first\nsecond"]);
  });
});

describe("a pointer", () => {
  const person = ["0 @I1@ INDI", "1 ASSO @I2@", "0 @I2@ INDI", "1 NAME Pierre /Curie/"];

  it("is the name of the record it points at, which selects it, and never its identifier", () => {
    const { ctx, record } = make(person);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);
    const link = box.querySelector<HTMLButtonElement>("button.gedcom-desk-link");

    expect(link?.textContent).toBe("Pierre Curie");
    expect(box.textContent).not.toContain("@I2@");
    link?.click();
    expect(opened).toHaveBeenCalledWith("@I2@");
  });

  it("is a pointer to a record that is not in the file, with the way to its line, where the file declares none", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 ASSO @I9@"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);

    expect(box.querySelector(".gedcom-desk-missing")?.textContent).toContain("Points to a record that is not in the file");
    box.querySelector<HTMLButtonElement>(".gedcom-desk-missing button")?.click();
    expect(shown).toHaveBeenCalledWith("line");
  });

  it("names no record where the file writes @VOID@, and offers no way to a line", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 ASSO @VOID@"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);

    expect(box.querySelector(".gedcom-desk-missing")).toBeNull();
    expect(box.textContent).toContain("Names no record");
  });

  it("is the text of a shared note, folded where it is long, where it names one", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 SNOTE @N1@", "0 @N1@ SNOTE The note text"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);

    expect(box.querySelector(".gedcom-detail-text-body")?.textContent).toBe("The note text");
  });
});

describe("a pointer to a record that has a card", () => {
  it("is a link to a repository and to a submitter, named as the list names them, that selects it", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 _REPO @R1@", "1 _SUBM @U1@", "0 @R1@ REPO", "1 NAME Archive", "0 @U1@ SUBM", "1 NAME Domorium"]);
    renderLines(box.createDiv({ cls: "gedcom-detail" }), record.children, ctx);
    const links = [...box.querySelectorAll<HTMLElement>("button.gedcom-desk-link")];

    expect(links.map((link) => link.textContent)).toEqual(["Archive", "Domorium"]);
    links[0]?.click();
    expect(opened).toHaveBeenCalledWith("@R1@");
  });
});

describe("the one name of every record", () => {
  const curie = curieIndex();

  it("names a person, a family, a source, a medium, a note, a repository, a submitter and the header, and no place", () => {
    expect(
      ["@I1@", "@F3@", "@S2@", "place:paris, france", "@O5@", "@N1@", "@R2@", "@U1@", HEADER_ID].map((xref) => recordTitle(curie, xref)),
    ).toEqual([
      "Marie Skłodowska-Curie",
      "Pierre Curie ⚭ Marie Skłodowska-Curie",
      "Parish registers of Warsaw",
      undefined,
      "The Curie family, about 1908",
      "The only person to have won a Nobel Prize in two different sciences:",
      "State Archive in Warsaw",
      "Domorium",
      "File header",
    ]);
  });

  it("names a medium with no title by the base name of its file", () => {
    const { index } = make(["0 @O1@ OBJE", "1 FILE scans/letter.jpg", "0 @I1@ INDI"]);

    expect(recordTitle(index, "@O1@")).toBe("letter.jpg");
  });

  it("names a note by its first line that is not empty", () => {
    const { index } = make(["0 @N1@ SNOTE", "1 CONT", "1 CONT Second", "0 @I1@ INDI"]);

    expect(recordTitle(index, "@N1@")).toBe("Second");
  });

  it("names a record of the file's own by its name, its title, its own value, its first value, or its kind", () => {
    const { index } = make([
      "0 @P1@ _PLAN Custom value", "1 TITL A title", "1 NAME Research plan",
      "0 @P2@ _PLAN Custom value", "1 TITL A title",
      "0 @P3@ _PLAN Custom value", "1 _STEP First step",
      "0 @P4@ _PLAN", "1 _STEP First step",
      "0 @X2@ _LOG",
      "0 @I1@ INDI",
    ]);

    expect(["@P1@", "@P2@", "@P3@", "@P4@", "@X2@"].map((xref) => recordTitle(index, xref))).toEqual([
      "Research plan", "A title", "Custom value", "First step", "_LOG",
    ]);
  });

  it("names nothing the file does not declare", () => {
    expect(recordTitle(curie, "@X9@")).toBeUndefined();
  });
});
