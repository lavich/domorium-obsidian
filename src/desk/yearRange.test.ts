import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import type { MapEvent } from "./fileMap";
import { boundsOf, chipText, clampRange, keeps, readout, stepHandle, valueText } from "./yearRange";

afterEach(resetLanguage);

const event = (from?: number, to = from): MapEvent => ({
  record: "@I1@",
  family: false,
  kind: "other",
  tag: "EVEN",
  place: "X",
  order: 0,
  ...(from === undefined || to === undefined ? {} : { year: from, span: [from, to] as [number, number] }),
});

const bounds = { from: 1880, to: 1950 };

describe("the bounds of the years", () => {
  it("run from the earliest to the latest dated event", () => {
    expect(boundsOf([event(1890), event(1934), event(), event(1867, 1870)])).toEqual({ from: 1867, to: 1934 });
  });

  it("are none where nothing is dated", () => {
    expect(boundsOf([event(), event()])).toBeNull();
  });
});

describe("moving a handle", () => {
  it("steps a year with Right and ten earlier with Page Down", () => {
    expect(stepHandle({ from: 1900, to: 1920 }, "from", "ArrowRight", bounds).from).toBe(1901);
    expect(stepHandle({ from: 1900, to: 1920 }, "from", "PageDown", bounds).from).toBe(1890);
  });

  it("goes to the ends with Home and End but never past the other handle", () => {
    expect(stepHandle({ from: 1900, to: 1920 }, "from", "Home", bounds).from).toBe(1880);
    expect(stepHandle({ from: 1900, to: 1920 }, "from", "End", bounds).from).toBe(1920);
    expect(stepHandle({ from: 1900, to: 1920 }, "to", "Home", bounds).to).toBe(1900);
  });

  it("stays within the bounds", () => {
    expect(stepHandle({ from: 1880, to: 1950 }, "to", "PageUp", bounds).to).toBe(1950);
    expect(stepHandle({ from: 1880, to: 1950 }, "from", "ArrowLeft", bounds).from).toBe(1880);
  });
});

describe("which events a range keeps", () => {
  it("keeps a period that overlaps and drops one that does not", () => {
    expect(keeps(event(1891, 1894), { from: 1893, to: 1900 })).toBe(true);
    expect(keeps(event(1891, 1894), { from: 1895, to: 1900 })).toBe(false);
  });

  it("keeps a BET … AND … while it overlaps", () => {
    expect(keeps(event(1880, 1890), { from: 1885, to: 1886 })).toBe(true);
  });

  it("treats an approximate date as a point", () => {
    expect(keeps(event(1890), { from: 1890, to: 1890 })).toBe(true);
    expect(keeps(event(1890), { from: 1891, to: 1900 })).toBe(false);
  });

  it("hides an undated event while a range is set and shows it with none", () => {
    expect(keeps(event(), { from: 1800, to: 2000 })).toBe(false);
    expect(keeps(event(), null)).toBe(true);
  });
});

describe("keeping a range in bounds", () => {
  it("pulls a range back where an edit moves the bounds", () => {
    expect(clampRange({ from: 1890, to: 1950 }, { from: 1867, to: 1934 })).toEqual({ from: 1890, to: 1934 });
  });

  it("drops a range where nothing has a year", () => {
    expect(clampRange({ from: 1890, to: 1950 }, null)).toBeNull();
  });
});

describe("the words of the chip", () => {
  it("reads all, and a range", () => {
    expect(chipText(null)).toBe("Years: all");
    expect(chipText({ from: 1880, to: 1920 })).toBe("Years: 1880–1920");
    expect(readout({ from: 1880, to: 1920 })).toBe("1880–1920");
  });

  it("writes a year before the common era as the plugin does", () => {
    expect(valueText(-43)).toBe("44 BCE");
  });

  it("speaks Russian", () => {
    setLanguage("ru");

    expect(chipText(null)).toBe("Годы: все");
  });
});
