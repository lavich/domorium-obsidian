import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { buildIndex } from "../genealogy";
import { pageKind, readDeskState, recordToShow, routeLink } from "./deskState";

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
  "0 @S1@ SOUR",
  "1 TITL Parish registers",
  "0 TRLR",
  "",
].join("\n");

const index = (text = CURIE) =>
  buildIndex(new GedcomLanguageService(text).getDocumentSymbols());

describe("what a tab keeps of the desk", () => {
  it("reads a mode and a record it wrote", () => {
    expect(readDeskState({ file: "a.ged", mode: "source", record: "@I2@" }))
      .toEqual({ mode: "source", record: "@I2@" });
  });

  it("ignores what it does not recognise, so the setting decides", () => {
    expect(readDeskState({ mode: "reading", record: 7 })).toEqual({});
    expect(readDeskState(null)).toEqual({});
  });
});

describe("which record Genealogy mode shows", () => {
  it("takes the first preferred record that has a page", () => {
    expect(recordToShow(index(), ["@F1@", "@I2@", "@I1@"])).toBe("@I2@");
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

  it("names a person and a source as having pages, and a family not", () => {
    expect(pageKind(index(), "@I1@")).toBe("person");
    expect(pageKind(index(), "@S1@")).toBe("source");
    expect(pageKind(index(), "@F1@")).toBeNull();
  });
});

describe("where a link into a record lands", () => {
  const declared = (xref: string) => ["@I1@", "@I2@", "@F1@", "@S1@"].includes(xref);

  it("opens a person's page", () => {
    expect(routeLink(index(), "@I1@", declared)).toEqual({ to: "page", xref: "@I1@" });
  });

  it("sends a family to the source", () => {
    expect(routeLink(index(), "@F1@", declared)).toEqual({ to: "source", xref: "@F1@" });
  });

  it("goes nowhere for a record the file does not hold", () => {
    expect(routeLink(index(), "@I9@", declared)).toEqual({ to: "nowhere" });
  });
});
