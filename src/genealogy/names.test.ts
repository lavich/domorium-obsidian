import { describe, expect, it } from "vitest";

import { UNNAMED, readName } from "./names";

describe("reading a personal name as GEDCOM writes it", () => {
  it("removes the slashes that mark a surname", () => {
    expect(readName("Marie /Skłodowska-Curie/")).toBe("Marie Skłodowska-Curie");
  });

  it("reads a surname standing alone", () => {
    expect(readName("/Curie/")).toBe("Curie");
  });

  it("reads a name that marks no surname at all", () => {
    expect(readName("John")).toBe("John");
  });

  it("keeps the order the line writes, including a surname first", () => {
    expect(readName("/Curie/ Marie")).toBe("Curie Marie");
    expect(readName("Jan /van der/ Berg")).toBe("Jan van der Berg");
  });

  it("collapses the space the slashes leave behind", () => {
    expect(readName("Marie  /Curie/  ")).toBe("Marie Curie");
  });

  it("names a person the record leaves unnamed", () => {
    expect(readName("")).toBe(UNNAMED);
    expect(readName(undefined)).toBe(UNNAMED);
    expect(readName("   ")).toBe(UNNAMED);
    expect(readName("//")).toBe(UNNAMED);
  });

  it("is not a reader-facing string of its own", () => {
    // The placeholder is a marker the caller names in the reader's language;
    // the model carries no language.
    expect(UNNAMED.startsWith("@")).toBe(true);
  });
});
