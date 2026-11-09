// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { buildIndex, type RecordLine } from "../../genealogy";
import { resetLanguage, setLanguage } from "../../i18n";
import { installObsidianDom } from "../../testing/obsidianDom";
import { eventAt } from "../eventRows";
import { renderEventPage } from "../eventPage";
import type { DetailContext } from "./lineView";
import { NOTE_TAGS, renderNotes } from "./notes";
import { renderOther, otherCount } from "./otherData";
import { renderRelated } from "./related";

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

const noteLines = (record: RecordLine): RecordLine[] => record.children.filter((line) => NOTE_TAGS.has(line.tag));
const relatedLines = (record: RecordLine): RecordLine[] => record.children.filter((line) => line.tag === "ASSO" || line.tag === "ALIA");

const text = (selector: string) => [...box.querySelectorAll(selector)].map((one) => one.textContent);

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

describe("the other data of an event", () => {
  it("shows a custom structure nested as the file nests it, and counts every line", () => {
    const { record, ctx } = person(["1 _TRIBE Highlander", "2 _CLAN Sas", "3 _SINCE 1800"]);
    renderOther(box, record.children, ctx);

    expect(text(".gedcom-detail-label")).toEqual(["_TRIBE", "_CLAN", "_SINCE"]);
    expect(otherCount(record.children)).toBe(3);
  });
});

describe("the card of an event", () => {
  it("still draws its notes, its related people and its other data", () => {
    const index = buildIndex(
      new GedcomLanguageService(
        [
          "0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 NOTE Born at home.", "2 ASSO @I2@", "3 ROLE WITN",
          "2 _WEATHER Rain", "0 @I2@ INDI", "1 NAME Pierre /Curie/", "0 TRLR",
        ].join("\n"),
      ),
    );
    const target = eventAt(index, "event:@I1@:BIRT:0");
    if (!target) {
      throw new Error("no event");
    }
    renderEventPage(box, target, index, {
      openRecord: opened,
      select: vi.fn(),
      showInSource: vi.fn(),
      openFile: vi.fn(),
    });

    expect(text("h2")).toEqual(expect.arrayContaining(["Notes", "Related people"]));
    expect(box.textContent).toContain("Born at home.");
    expect(text(".gedcom-related-role")).toEqual(["Witness"]);
    expect(text(".gedcom-desk-fold-button")).toEqual(["Other data"]);
  });
});
