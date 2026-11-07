// @vitest-environment happy-dom
import { GedcomLanguageService } from "@domorium/language-service";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { buildIndex, type RecordLine } from "../../genealogy";
import { installObsidianDom } from "../../testing/obsidianDom";
import type { DetailContext } from "./lineView";
import { eventLine, renderEventMedia, renderEventRows, splitEvent } from "./eventDetails";

beforeAll(installObsidianDom);

let box: HTMLElement;
beforeEach(() => {
  box = document.createElement("div");
  document.body.replaceChildren(box);
});

function event(lines: string[], owner = "INDI"): { line: RecordLine; ctx: DetailContext; parts: ReturnType<typeof splitEvent> } {
  const text = ["0 HEAD", "1 GEDC", "2 VERS 7.0", `0 @R1@ ${owner}`, ...lines, "0 @I2@ INDI", "1 NAME Pierre /Curie/", "0 TRLR"].join("\n");
  const index = buildIndex(new GedcomLanguageService(text));
  const line = index.record("@R1@")?.children[0];
  if (!line) {
    throw new Error("no event");
  }
  const ctx: DetailContext = { index, host: { openRecord: () => undefined, showInSource: () => undefined } };
  return { line, ctx, parts: splitEvent(line, false) };
}

const labels = () => [...box.querySelectorAll(".gedcom-detail-label")].map((one) => one.textContent);
const values = () => [...box.querySelectorAll(".gedcom-detail-value")].map((one) => one.textContent);

describe("what an event states beyond its date and place", () => {
  it("draws the age, the cause and the agency as rows, in the order the event writes them", () => {
    const { parts, ctx } = event(["1 BIRT", "2 DATE 7 NOV 1867", "2 AGE 0y", "2 CAUS Natural", "2 AGNC Registry office"]);
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Age", "Cause", "Agency"]);
    expect(values()).toEqual(["0y", "Natural", "Registry office"]);
  });

  it("draws an address of two lines in one row, with its parts beneath it", () => {
    const { parts, ctx } = event(["1 RESI", "2 ADDR 1 Street", "3 CONT Town", "3 CITY Warsaw"]);
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Address", "City"]);
    expect(box.querySelector(".gedcom-detail-value")?.firstChild?.textContent).toBe("1 Street\nTown");
  });

  it("draws the contacts of an event", () => {
    const { parts, ctx } = event(["1 RESI", "2 PHON 123", "2 EMAIL a@@b.c", "2 FAX 456", "2 WWW https://x.y"]);
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Phone", "Email", "Fax", "Web address"]);
    expect(values()).toContain("a@b.c");
  });

  it("draws what the place itself states: its form, its latitude and longitude, its translation", () => {
    const { parts, ctx } = event(["1 BIRT", "2 PLAC Warsaw", "3 FORM City, Country", "3 MAP", "4 LATI N52.2", "4 LONG E21.0", "3 TRAN Варшава", "4 LANG ru"]);
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Format", "Map", "Latitude", "Longitude", "Translation", "Language"]);
    expect(values()).toContain("N52.2");
  });

  it("draws the time and the phrase of a date", () => {
    const { parts, ctx } = event(["1 BIRT", "2 DATE 7 NOV 1867", "3 TIME 10:00", "3 PHRASE in the morning"]);
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Time", "Phrase"]);
  });

  it("draws the age of each spouse of an event of a family, and what else is beneath them", () => {
    const { parts, ctx } = event(["1 MARR", "2 HUSB", "3 AGE 28y", "3 _NOTE x", "2 WIFE", "3 AGE 27y"], "FAM");
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Husband's age", "_NOTE", "Wife's age"]);
    expect(values()[0]).toContain("28y");
  });

  it("draws the temple and the status of an ordinance", () => {
    const { parts, ctx } = event(["1 BAPL", "2 TEMP SLAKE", "2 STAT COMPLETED"]);
    renderEventRows(box, parts.rows, ctx);

    expect(labels()).toEqual(["Temple", "Status"]);
  });

  it("sends the notes, the associates and the media to sections of their own, the sources to Evidence, and the rest to Other data", () => {
    const { parts } = event(["1 BIRT", "2 NOTE n", "2 SNOTE @N1@", "2 ASSO @I2@", "2 OBJE @O1@", "2 SOUR @S1@", "2 _WEATHER Rain", "2 TYPE x"]);

    expect(parts.notes.map((line) => line.tag)).toEqual(["NOTE", "SNOTE"]);
    expect(parts.related.map((line) => line.tag)).toEqual(["ASSO"]);
    expect(parts.media.map((line) => line.tag)).toEqual(["OBJE"]);
    expect(parts.other.map((line) => line.tag)).toEqual(["_WEATHER"]);
    expect(parts.rows.map((line) => line.tag)).toEqual(["TYPE"]);
  });

  it("leaves TYPE to the title where the title uses it", () => {
    const { line } = event(["1 EVEN", "2 TYPE Voyage"]);

    expect(splitEvent(line, true).rows).toEqual([]);
  });

  it("draws the media of an event as links to their records", () => {
    const { parts, ctx } = event(["1 BIRT", "2 OBJE @I2@"]);
    renderEventMedia(box, parts.media, ctx);

    expect(box.querySelector("h2")?.getAttribute("data-count")).toBe("1");
    expect(box.querySelector("button")?.textContent).toBe("Pierre Curie");
  });

  it("finds the line of an event by where it stands in its record", () => {
    const text = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 BIRT", "2 DATE 1900", "1 BIRT", "2 DATE 1901", "0 TRLR"].join("\n");
    const index = buildIndex(new GedcomLanguageService(text));
    const events = index.person("@I1@")?.events ?? [];

    expect(eventLine(index, "@I1@", events[1])?.children[0]?.text).toBe("1901");
  });
});
