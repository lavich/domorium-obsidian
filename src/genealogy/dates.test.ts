import { describe, expect, it } from "vitest";

import { readDate } from "./dates";

describe("reading a year out of a GEDCOM date", () => {
  it("reads a plain date exactly", () => {
    expect(readDate("7 NOV 1867")).toEqual({
      text: "7 NOV 1867",
      year: 1867,
      precision: "exact",
    });
  });

  it("reads a year standing alone exactly", () => {
    expect(readDate("1867")).toEqual({ text: "1867", year: 1867, precision: "exact" });
  });

  it("marks an approximation as one", () => {
    for (const written of ["ABT 1867", "CAL 1867", "EST 1867"]) {
      expect(readDate(written).year, written).toBe(1867);
      expect(readDate(written).precision, written).toBe("approximate");
    }
  });

  it("marks a range by the end it took, and does not call it the year", () => {
    const reading = readDate("BET 1867 AND 1870");

    expect(reading.year).toBe(1867);
    expect(reading.precision).toBe("range");
    expect(reading).not.toHaveProperty("birthYear");
  });

  it("marks a bound as a range too", () => {
    expect(readDate("BEF 1870").precision).toBe("range");
    expect(readDate("AFT 1867").precision).toBe("range");
    expect(readDate("FROM 1867 TO 1870").year).toBe(1867);
  });

  it("refuses a year stated in another calendar", () => {
    const reading = readDate("@#DHEBREW@ 5628");

    expect(reading.year).toBeUndefined();
    expect(reading.precision).toBeUndefined();
    expect(reading.text).toBe("@#DHEBREW@ 5628");
  });

  it("refuses a year a 7.0 date states in another calendar by name", () => {
    for (const payload of ["ABT HEBREW 5761", "JULIAN 3 MAR 1721", "FRENCH_R 11 FLOR 1792"]) {
      expect(readDate(payload).year, payload).toBeUndefined();
      expect(readDate(payload).text).toBe(payload);
    }
  });

  it("refuses a year before the common era", () => {
    for (const payload of ["1401 BCE", "12 AUG 1401 BCE", "1401 B.C."]) {
      expect(readDate(payload).year, payload).toBeUndefined();
    }
  });

  it("still reads a Gregorian date that names its calendar, and a name like a calendar's elsewhere", () => {
    expect(readDate("GREGORIAN 7 NOV 1867").year).toBe(1867);
    expect(readDate("BET 1860 AND 1870").year).toBe(1860);
  });

  it("refuses a date that states two years for one day", () => {
    expect(readDate("12 FEB 1867/68").year).toBeUndefined();
  });

  it("refuses a date stating no four-digit year", () => {
    expect(readDate("NOV").year).toBeUndefined();
    expect(readDate("").year).toBeUndefined();
    expect(readDate(undefined).year).toBeUndefined();
  });

  it("carries the payload through exactly as written, always", () => {
    for (const written of ["7 NOV 1867", "@#DHEBREW@ 5628", "  ABT 1867  ", ""]) {
      expect(readDate(written).text).toBe(written);
    }
  });
});
