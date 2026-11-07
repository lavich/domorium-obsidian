// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type RecordLine } from "../../genealogy";
import { resetLanguage, setLanguage } from "../../i18n";
import { installObsidianDom } from "../../testing/obsidianDom";
import { INFO_TAGS, PERSON_CLAIMED, unclaimed } from "./claims";
import type { DetailContext } from "./lineView";
import { nameLines, needsNames, renderNames } from "./names";
import { noteLines, renderNotes } from "./notes";
import { renderOther, otherCount } from "./otherData";
import { relatedLines, renderRelated } from "./related";
import { infoLines, renderInfo } from "./recordInfo";

beforeAll(installObsidianDom);
afterEach(resetLanguage);

let box: HTMLElement;
const opened = vi.fn<(xref: string) => void>();
beforeEach(() => {
  opened.mockReset();
  box = document.createElement("div");
  document.body.replaceChildren(box);
});

function person(lines: string[], version = "7.0"): { record: RecordLine; ctx: DetailContext } {
  const text = ["0 HEAD", "1 GEDC", `2 VERS ${version}`, "0 @I1@ INDI", ...lines, "0 @I2@ INDI", "1 NAME Pierre /Curie/", "0 TRLR"].join("\n");
  const index = buildIndex(new GedcomLanguageService(text));
  const record = index.record("@I1@");
  if (!record) {
    throw new Error("no record");
  }
  return { record, ctx: { index, host: { openRecord: opened, showInSource: () => undefined } } };
}

const text = (selector: string) => [...box.querySelectorAll(selector)].map((one) => one.textContent);

describe("the names", () => {
  it("lists every name as written, with its type, and the parts of each in rows", () => {
    const { record, ctx } = person([
      "1 NAME Maria /Skłodowska/", "2 TYPE BIRTH", "2 GIVN Maria", "2 SURN Skłodowska", "2 NPFX Dr", "2 NSFX Jr", "2 NICK Manya", "2 SPFX von",
      "1 NAME Marie /Curie/", "2 TYPE MARRIED",
    ]);
    renderNames(box, nameLines(record), ctx);

    expect(text(".gedcom-name-text")).toEqual(["Maria Skłodowska", "Marie Curie"]);
    expect(text(".gedcom-name-type")).toEqual(["Birth", "Married"]);
    expect(text(".gedcom-detail-label")).toEqual(["Given names", "Surname", "Prefix", "Suffix", "Nickname", "Surname prefix"]);
    expect(box.querySelector("h2")?.getAttribute("data-count")).toBe("2");
  });

  it("shows a type the file worded itself, and a 5.5.1 type in lower case, as it should", () => {
    const { record, ctx } = person(["1 NAME A /B/", "2 TYPE Stage name", "1 NAME C /D/", "2 TYPE aka"], "5.5.1");
    renderNames(box, nameLines(record), ctx);

    expect(text(".gedcom-name-type")).toEqual(["Stage name", "Also known as"]);
  });

  it("shows a name's notes and sources and a line no row knows beneath that name", () => {
    const { record, ctx } = person(["1 NAME A /B/", "2 NOTE Spelled in Polish.", "2 SOUR @S1@", "3 PAGE 4", "2 _SPELLING Polish"]);
    renderNames(box, nameLines(record), ctx);

    expect(text(".gedcom-detail-label")).toEqual(expect.arrayContaining(["Note", "Source", "Page", "_SPELLING"]));
    expect(box.textContent).toContain("Spelled in Polish.");
  });

  it("shows a translation as a name of its own beneath, with its language", () => {
    const { record, ctx } = person(["1 NAME Maria /Curie/", "2 TRAN Мария Кюри", "3 LANG ru"]);
    renderNames(box, nameLines(record), ctx);

    expect(text(".gedcom-name-text")).toEqual(["Maria Curie", "Мария Кюри"]);
    expect(text(".gedcom-name-translation-label")).toEqual(["Translation"]);
    expect(text(".gedcom-detail-value")).toContain("ru");
  });

  it("is needed for two names or for one with something beneath it, and for one plain name not", () => {
    expect(needsNames(nameLines(person(["1 NAME A /B/"]).record))).toBe(false);
    expect(needsNames(nameLines(person(["1 NAME A /B/", "2 NICK Ab"]).record))).toBe(true);
    expect(needsNames(nameLines(person(["1 NAME A /B/", "1 NAME C /D/"]).record))).toBe(true);
  });
});

describe("the notes", () => {
  it("shows an inline note and a shared note of either dialect, and a note's own lines", () => {
    const seven = person(["1 NOTE Left Poland in 1891.", "2 SOUR @S1@", "1 SNOTE @N1@"]);
    const index = buildIndex(
      new GedcomLanguageService(
        ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NOTE Left Poland in 1891.", "2 SOUR @S1@", "1 SNOTE @N1@", "0 @N1@ SNOTE The shared text", "0 TRLR"].join("\n"),
      ),
    );
    const record = index.record("@I1@") as RecordLine;
    renderNotes(box, noteLines(record), { ...seven.ctx, index });

    expect(text(".gedcom-detail-text-body")).toEqual(["Left Poland in 1891.", "The shared text"]);
    expect(text(".gedcom-detail-label")).toEqual(["Source"]);
    expect(box.querySelector("h2")?.getAttribute("data-count")).toBe("2");
  });

  it("reads a note of 5.5.1 that points at a shared NOTE record", () => {
    const index = buildIndex(
      new GedcomLanguageService(
        ["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "1 CHAR UTF-8", "0 @I1@ INDI", "1 NOTE @N1@", "0 @N1@ NOTE Shared in the old way", "0 TRLR"].join("\n"),
      ),
    );
    const record = index.record("@I1@") as RecordLine;
    renderNotes(box, noteLines(record), { index, host: { openRecord: opened, showInSource: () => undefined } });

    expect(text(".gedcom-detail-text-body")).toEqual(["Shared in the old way"]);
  });

  it("folds a long note", () => {
    const { record, ctx } = person(["1 NOTE one", ...Array.from({ length: 10 }, (_, at) => `2 CONT more ${at}`)]);
    renderNotes(box, noteLines(record), ctx);

    expect(box.querySelector("button")?.textContent).toBe("Show more");
    expect(text(".gedcom-detail-text-body")[0]?.split("\n")).toHaveLength(5);
  });
});

describe("the related people", () => {
  it("names a godparent by ROLE in 7.0 and by RELA in 5.5.1, in the reader's language", () => {
    const seven = person(["1 ASSO @I2@", "2 ROLE GODP"]);
    renderRelated(box, relatedLines(seven.record), seven.ctx);
    expect(text(".gedcom-related-role")).toEqual(["Godparent"]);
    expect(text("button.gedcom-desk-link")).toEqual(["Pierre Curie"]);

    box.replaceChildren();
    const old = person(["1 ASSO @I2@", "2 RELA godp"], "5.5.1");
    renderRelated(box, relatedLines(old.record), old.ctx);
    expect(text(".gedcom-related-role")).toEqual(["Godparent"]);
    setLanguage("ru");
    box.replaceChildren();
    renderRelated(box, relatedLines(old.record), old.ctx);
    expect(text(".gedcom-related-role")).toEqual(["Крёстный родитель"]);
  });

  it("shows the phrase of a role the file worded itself, and the lines of an association that no row knows", () => {
    const { record, ctx } = person(["1 ASSO @I2@", "2 ROLE OTHER", "3 PHRASE Landlord", "2 NOTE A neighbour.", "2 _FIELD x"]);
    renderRelated(box, relatedLines(record), ctx);

    expect(text(".gedcom-related-role")).toEqual(["Landlord"]);
    expect(text(".gedcom-detail-label")).toEqual(["Note", "_FIELD"]);
  });

  it("lists another record of the same person as such, and a void pointer as naming no record", () => {
    const { record, ctx } = person(["1 ALIA @I2@", "1 ASSO @VOID@"]);
    renderRelated(box, relatedLines(record), ctx);

    expect(text(".gedcom-related-kind")).toEqual(["Same person as"]);
    expect(box.textContent).toContain("Names no record");
  });

  it("keeps the key of its link apart from the key of a relative's", () => {
    const { record, ctx } = person(["1 ASSO @I2@"]);
    renderRelated(box, relatedLines(record), ctx);

    expect(box.querySelector("button")?.getAttribute("data-focus-key")).toBe("assoc:@I2@");
  });
});

describe("the identifiers and the other data", () => {
  it("shows two reference numbers with their types, an external identifier, and the last change", () => {
    const { record, ctx } = person([
      "1 REFN 123", "2 TYPE user", "1 REFN 456", "1 EXID 4711", "2 TYPE https://example.org/", "1 RESN LOCKED",
      "1 CREA", "2 DATE 1 JAN 2019", "1 CHAN", "2 DATE 1 JAN 2020", "3 TIME 10:00", "1 UID abc",
    ]);
    renderInfo(box, infoLines(record), ctx);

    expect(text(".gedcom-detail-label")).toEqual([
      "Reference number", "Type", "Reference number", "External identifier", "Type", "Restriction", "Created", "Date",
      "Last changed", "Date", "Time", "Unique identifier",
    ]);
    expect(text(".gedcom-detail-value")).toContain("10:00");
  });

  it("claims the lines a person card draws itself and sends the rest, a custom structure among them, to Other data", () => {
    const { record, ctx } = person(["1 NAME A /B/", "1 REFN 1", "1 _TRIBE Highlander", "2 _CLAN Sas", "3 _SINCE 1800", "1 FACT x", "2 TYPE y"]);
    const rest = unclaimed(record, PERSON_CLAIMED);
    renderOther(box, rest, ctx);

    expect(text(".gedcom-detail-label")).toEqual(["_TRIBE", "_CLAN", "_SINCE"]);
    expect(otherCount(rest)).toBe(3);
    expect(INFO_TAGS.has("REFN")).toBe(true);
  });
});
