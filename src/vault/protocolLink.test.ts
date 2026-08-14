import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { recordEntries } from "../editor/records";
import {
  gedcomLinkUrl,
  normalizeXref,
  parseGedcomLink,
  recordAtLine,
  recordSubpath,
  xrefFromSubpath,
} from "./protocolLink";

describe("the identifier a link carries", () => {
  it("takes the delimiters the format writes", () => {
    expect(normalizeXref("@I47@")).toBe("@I47@");
  });

  it("takes one written without them, which is what a hand types", () => {
    expect(normalizeXref("I47")).toBe("@I47@");
  });
});

describe("reading a link", () => {
  it("wants a file, and answers nothing without one", () => {
    expect(parseGedcomLink({ action: "domorium" })).toBeNull();
    expect(parseGedcomLink({ action: "domorium", file: "  " })).toBeNull();
  });

  it("opens a file with no record named", () => {
    expect(parseGedcomLink({ action: "domorium", file: "tree.ged" })).toEqual({
      file: "tree.ged",
    });
  });

  it("carries the record through", () => {
    expect(
      parseGedcomLink({ action: "domorium", file: "tree.ged", xref: "I47" }),
    ).toEqual({ file: "tree.ged", xref: "@I47@" });
  });
});

describe("writing a link", () => {
  it("names the vault, the file and the record, and escapes all three", () => {
    expect(gedcomLinkUrl("My Family", "trees/a b.ged", "@I47@")).toBe(
      "obsidian://domorium?vault=My+Family&file=trees%2Fa+b.ged&xref=%40I47%40",
    );
  });

  it("reads back what it wrote", () => {
    const url = new URL(gedcomLinkUrl("Family", "tree.ged", "@I47@"));

    expect(
      parseGedcomLink(Object.fromEntries(url.searchParams) as Record<string, string>),
    ).toEqual({ file: "tree.ged", xref: "@I47@" });
  });
});

describe("the record a link carries after the hash", () => {
  it("writes the identifier the file contains", () => {
    expect(recordSubpath("@I47@")).toBe("#@I47@");
    expect(recordSubpath("I47"), "and takes one written by hand").toBe("#@I47@");
  });

  it("reads it back, with or without the hash", () => {
    expect(xrefFromSubpath("#@I47@")).toBe("@I47@");
    expect(xrefFromSubpath("@I47@")).toBe("@I47@");
    expect(xrefFromSubpath("#I47")).toBe("@I47@");
  });

  it("answers nothing for a link that named no record", () => {
    expect(xrefFromSubpath("#")).toBeNull();
    expect(xrefFromSubpath("")).toBeNull();
    expect(xrefFromSubpath("#  ")).toBeNull();
  });
});

describe("which record a cursor is in", () => {
  const records = recordEntries(
    new GedcomLanguageService(
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 NAME Marie\n0 @F1@ FAM\n0 TRLR\n",
    ).getDocumentSymbols(),
  );

  it("takes the record declared above the line", () => {
    expect(recordAtLine(records, 4)?.identifier).toBe("@I1@");
  });

  it("takes the declaration line itself", () => {
    expect(recordAtLine(records, 5)?.identifier).toBe("@F1@");
  });

  it("answers with the header for a line inside it", () => {
    expect(recordAtLine(records, 1)?.tag).toBe("HEAD");
  });

  it("answers nothing for a file with no records at all", () => {
    expect(recordAtLine([], 0)).toBeUndefined();
  });
});
