import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import { buildIndex } from "../genealogy";
import { curieIndex } from "../testing/curie";
import {
  cursorInside,
  openFromIndex,
  pageKind,
  readDeskState,
  recordToShow,
  routeLink,
  shownRange,
} from "./deskState";

const CURIE = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 NAME Pierre /Curie/",
  "0 @F1@ FAM",
  "1 WIFE @I1@",
  "0 @N1@ SNOTE A shared note",
  "0 @O1@ OBJE",
  "1 FILE Media/marie.jpg",
  "2 FORM image/jpeg",
  "0 @S1@ SOUR",
  "1 TITL Parish registers",
  "0 TRLR",
  "",
].join("\n");

const index = (text = CURIE) =>
  buildIndex(new GedcomLanguageService(text));

describe("what a tab keeps of the desk", () => {
  it("reads a mode and a record it wrote", () => {
    expect(readDeskState({ file: "a.ged", mode: "source", record: "@I2@" }))
      .toEqual({ mode: "source", record: "@I2@" });
  });

  it("reads the view of a person page it wrote", () => {
    expect(readDeskState({ mode: "genealogy", record: "@I1@", view: "timeline" }))
      .toEqual({ mode: "genealogy", record: "@I1@", view: "timeline" });
    expect(readDeskState({ view: "map" })).toEqual({});
  });

  it("ignores what it does not recognise, so the setting decides", () => {
    expect(readDeskState({ mode: "reading", record: 7 })).toEqual({});
    expect(readDeskState(null)).toEqual({});
  });
});

describe("which record Genealogy mode shows", () => {
  it("takes the first preferred record that has a page", () => {
    expect(recordToShow(index(), ["@N1@", "@F1@", "@I1@"])).toBe("@F1@");
  });

  it("falls back to the first person the file declares", () => {
    expect(recordToShow(index(), [undefined, "@X9@"])).toBe("@I1@");
  });

  it("shows a source when the file declares no person", () => {
    const sourcesOnly = ["0 HEAD", "0 @S1@ SOUR", "1 TITL A", "0 TRLR", ""].join("\n");

    expect(recordToShow(index(sourcesOnly), [])).toBe("@S1@");
  });

  it("has nothing to show for a file of neither", () => {
    expect(recordToShow(index("0 HEAD\n0 TRLR\n"), [])).toBeNull();
  });

  it("gives a multimedia record a page", () => {
    expect(pageKind(index(), "@O1@")).toBe("media");
  });

  it("gives a person, a family and a source a page, and a note none", () => {
    expect(pageKind(index(), "@I1@")).toBe("person");
    expect(pageKind(index(), "@F1@")).toBe("family");
    expect(pageKind(index(), "@S1@")).toBe("source");
    expect(pageKind(index(), "@N1@")).toBeNull();
  });
});

describe("where a link into a record lands", () => {
  const declared = (xref: string) => ["@I1@", "@I2@", "@F1@", "@N1@", "@S1@"].includes(xref);

  it("opens a person's page", () => {
    expect(routeLink(index(), "@I1@", declared)).toEqual({ to: "page", xref: "@I1@" });
  });

  it("opens a family's page", () => {
    expect(routeLink(index(), "@F1@", declared)).toEqual({ to: "page", xref: "@F1@" });
  });

  it("sends a shared note to the source", () => {
    expect(routeLink(index(), "@N1@", declared)).toEqual({ to: "source", xref: "@N1@" });
  });

  it("goes nowhere for a record the file does not hold", () => {
    expect(routeLink(index(), "@I9@", declared)).toEqual({ to: "nowhere" });
  });
});

describe("a row of the index, activated", () => {
  const tab = (inSource: boolean) => ({
    inSource: () => inSource,
    goToXref: vi.fn(() => true),
    openRecord: vi.fn(),
  });

  it("opens the record's page from a tab in Genealogy mode", () => {
    const genealogy = tab(false);
    openFromIndex(genealogy, "@I2@");

    expect(genealogy.openRecord).toHaveBeenCalledWith("@I2@");
    expect(genealogy.goToXref).not.toHaveBeenCalled();
  });

  it("goes to the record's line in a tab in Source mode", () => {
    const source = tab(true);
    openFromIndex(source, "@F3@");

    expect(source.goToXref).toHaveBeenCalledWith("@F3@");
    expect(source.openRecord).not.toHaveBeenCalled();
  });
});

describe("where the source opens when the tab switches to it", () => {
  const curie = curieIndex();
  const marie = curie.person("@I1@");

  it("opens on the selected fact", () => {
    expect(shownRange(curie, "@I1@", "p:0")).toEqual(marie?.events[0]?.range);
  });

  it("opens on the whole record when no fact is selected", () => {
    expect(shownRange(curie, "@I1@", null)).toEqual(marie?.range);
  });

  it("opens on a family's fact, a source and a multimedia record too", () => {
    expect(shownRange(curie, "@F3@", "f:0")).toEqual(curie.family("@F3@")?.events[0]?.range);
    expect(shownRange(curie, "@S1@", null)).toEqual(curie.source("@S1@")?.range);
    expect(shownRange(curie, "@O5@", null)).toEqual(curie.media("@O5@")?.range);
  });

  it("leaves a cursor already inside the lines where it is", () => {
    const range = { start: { line: 14, character: 0 }, end: { line: 44, character: 7 } };

    expect(cursorInside(range, { line: 20, character: 3 })).toBe(true);
    expect(cursorInside(range, { line: 2, character: 0 })).toBe(false);
  });
});

