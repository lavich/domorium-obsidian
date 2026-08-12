import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { recordEntries, recordText } from "./records";

const SAMPLE = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "0 @S1@ SOUR",
  "1 TITL Parish register",
  "0 TRLR",
  "",
].join("\n");

function records(text: string) {
  return recordEntries(new GedcomLanguageService(text).getDocumentSymbols());
}

describe("the records a file offers to jump to", () => {
  it("lists every top-level record and nothing beneath one", () => {
    expect(records(SAMPLE).map((record) => record.tag)).toEqual([
      "HEAD",
      "INDI",
      "FAM",
      "SOUR",
      "TRLR",
    ]);
  });

  it("carries the identifier and the name the language service reads", () => {
    const [, individual] = records(SAMPLE);

    expect(individual).toEqual({
      tag: "INDI",
      identifier: "@I1@",
      label: "Marie /Curie/",
      start: { line: 3, character: 0 },
    });
  });

  it("leaves a record the format gives no name unlabelled", () => {
    const [, , family] = records(SAMPLE);

    expect(family.label).toBeUndefined();
    expect(family.identifier).toBe("@F1@");
  });

  it("is empty for a file with nothing in it", () => {
    expect(records("")).toEqual([]);
  });
});

describe("the text a record is searched by", () => {
  it("puts the name first, so typing a name finds a person", () => {
    expect(recordText(records(SAMPLE)[1])).toBe("Marie /Curie/ @I1@ INDI");
  });

  it("matches a tag, so typing INDI narrows the list to individuals", () => {
    expect(records(SAMPLE).filter((record) => recordText(record).includes("INDI"))).toHaveLength(1);
  });

  it("names a record the format leaves unnamed by its identifier", () => {
    expect(recordText(records(SAMPLE)[2])).toBe("@F1@ FAM");
  });

  it("falls back to the tag alone where there is no identifier either", () => {
    expect(recordText(records(SAMPLE)[0])).toBe("HEAD");
  });
});
