import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { readingOf } from "./dates";

const documentOf = (head: string): GedcomLanguageService =>
  new GedcomLanguageService(`0 HEAD\n${head}0 TRLR\n`);

const v7 = documentOf("1 GEDC\n2 VERS 7.0\n");
const v551 = documentOf(
  "1 CHAR UTF-8\n1 GEDC\n2 VERS 5.5.1\n2 FORM LINEAGE-LINKED\n",
);
const undeclared = documentOf("");
const unsupported = documentOf("1 GEDC\n2 VERS 4.0\n");

const in7 = (payload: string) => readingOf(payload, v7.readDate(payload));
const in551 = (payload: string) => readingOf(payload, v551.readDate(payload));

describe("reading a year out of a GEDCOM date", () => {
  it("reads a plain date exactly", () => {
    expect(in7("7 NOV 1867")).toEqual({
      text: "7 NOV 1867",
      year: 1867,
      precision: "exact",
    });
  });

  it("reads a year standing alone exactly", () => {
    expect(in7("1867")).toEqual({ text: "1867", year: 1867, precision: "exact" });
  });

  it("marks an approximation as one", () => {
    for (const written of ["ABT 1867", "CAL 1867", "EST 1867"]) {
      expect(in7(written).year, written).toBe(1867);
      expect(in7(written).precision, written).toBe("approximate");
    }
  });

  it("marks a range by the end it took, and does not call it the year", () => {
    const reading = in7("BET 1867 AND 1870");

    expect(reading.year).toBe(1867);
    expect(reading.precision).toBe("range");
    expect(reading).not.toHaveProperty("birthYear");
  });

  it("marks a bound as a range too", () => {
    expect(in7("BEF 1870").precision).toBe("range");
    expect(in7("AFT 1867").precision).toBe("range");
    expect(in7("FROM 1867 TO 1870").year).toBe(1867);
    expect(in7("TO 1870").precision).toBe("range");
  });

  it("reads an interpreted date as exact", () => {
    expect(in551("INT 1867 (from a letter)").precision).toBe("exact");
  });

  it("reads a year of fewer than four digits", () => {
    expect(in7("ABT 950")).toEqual({
      text: "ABT 950",
      year: 950,
      precision: "approximate",
    });
  });

  it("reads no year from a date the diagnostics reject", () => {
    expect(in7("32 FEB 2020")).toEqual({ text: "32 FEB 2020" });
  });

  it("reads a year before the common era astronomically, in either dialect", () => {
    expect(in7("1401 BCE")).toEqual({
      text: "1401 BCE",
      year: -1400,
      precision: "exact",
    });
    expect(in551("1401 B.C.").year).toBe(-1400);
  });

  it("orders a year before the common era before year 1 and after the one before it", () => {
    const year = (payload: string) => in7(payload).year ?? Number.NaN;

    expect(year("1401 BCE")).toBeLessThan(year("1"));
    expect(year("1401 BCE")).toBeGreaterThan(year("1402 BCE"));
    expect(year("1 BCE")).toBe(year("1") - 1);
  });

  it("reads a Julian year as written, in either dialect", () => {
    expect(in7("JULIAN 3 MAR 1721")).toEqual({
      text: "JULIAN 3 MAR 1721",
      year: 1721,
      precision: "exact",
    });
    expect(in551("@#DJULIAN@ 3 MAR 1721").year).toBe(1721);
  });

  it("still reads a Gregorian date that names its calendar", () => {
    expect(in7("GREGORIAN 7 NOV 1867").year).toBe(1867);
  });

  it("reads the later of a dual year", () => {
    expect(in551("12 FEB 1750/51")).toEqual({
      text: "12 FEB 1750/51",
      year: 1751,
      precision: "exact",
    });
  });

  it("reads no year from a date in another calendar", () => {
    expect(in551("@#DHEBREW@ 5628")).toEqual({ text: "@#DHEBREW@ 5628" });
    expect(in7("ABT HEBREW 5761")).toEqual({ text: "ABT HEBREW 5761" });
    expect(in7("FRENCH_R 11 FLOR 1792").year).toBeUndefined();
  });

  it("reads no year from a range whose first end is in another calendar", () => {
    expect(in7("BET HEBREW 5500 AND 1750").year).toBeUndefined();
  });

  it("reads no year in an era an extension defines", () => {
    expect(in7("1867 _AUC")).toEqual({ text: "1867 _AUC" });
  });

  it("reads no year zero, which neither era numbers", () => {
    expect(in7("0")).toEqual({ text: "0" });
    expect(in7("0 BCE")).toEqual({ text: "0 BCE" });
  });

  it("reads no year from a phrase standing for a date", () => {
    expect(in551("(unknown)")).toEqual({ text: "(unknown)" });
  });

  it("reads a year in a document whose version cannot be determined", () => {
    expect(readingOf("7 NOV 1867", undeclared.readDate("7 NOV 1867"))).toEqual({
      text: "7 NOV 1867",
      year: 1867,
      precision: "exact",
    });
  });

  it("reads a year in a document of a version no schema describes", () => {
    expect(readingOf("7 NOV 1867", unsupported.readDate("7 NOV 1867"))).toEqual({
      text: "7 NOV 1867",
      year: 1867,
      precision: "exact",
    });
  });

  it("reads no year zero in a document whose version cannot be determined", () => {
    expect(readingOf("0", undeclared.readDate("0"))).toEqual({ text: "0" });
  });

  it("carries the payload through exactly as written, always", () => {
    for (const written of ["7 NOV 1867", "@#DHEBREW@ 5628", "  ABT 1867  ", ""]) {
      expect(in551(written).text).toBe(written);
    }
  });
});
