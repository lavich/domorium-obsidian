// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type GenealogyIndex, type RecordLine } from "../../genealogy";
import { installObsidianDom } from "../../testing/obsidianDom";
import { renderLine, renderLines, renderRest, type DetailContext } from "./lineView";

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

describe("the rest of a structure", () => {
  it("draws the children a section did not draw, and none of those it did", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 NAME A /B/", "2 TYPE BIRTH", "2 NICK Ab", "2 _SPELLING Polish"]);
    const name = record.children[0];
    renderRest(box.createDiv({ cls: "gedcom-detail" }), name, new Set(["TYPE", "NICK"]), ctx);

    expect(rows(".gedcom-detail-label")).toEqual(["_SPELLING"]);
  });

  it("draws one line on its own", () => {
    const { ctx, record } = make(["0 @I1@ INDI", "1 REFN 123", "2 TYPE user"]);
    renderLine(box.createDiv({ cls: "gedcom-detail" }), record.children[0], ctx);

    expect(rows(".gedcom-detail-label")).toEqual(["Reference number", "Type"]);
  });
});
