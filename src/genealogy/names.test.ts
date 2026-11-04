import { describe, expect, it } from "vitest";

import { UNNAMED, readName, readNameParts } from "./names";

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
    expect(UNNAMED.startsWith("@")).toBe(true);
  });
});

describe("the parts of a name", () => {
  it("takes the surname from between the slashes and the given names from around them", () => {
    expect(readNameParts("Marie /Skłodowska-Curie/")).toEqual({ given: "Marie", surname: "Skłodowska-Curie" });
    expect(readNameParts("Henry Richardson /Labouisse/")).toEqual({ given: "Henry Richardson", surname: "Labouisse" });
    expect(readNameParts("/Curie/ Marie")).toEqual({ given: "Marie", surname: "Curie" });
  });

  it("has no parts where the line writes no surname, or nothing else", () => {
    expect(readNameParts("John")).toBeUndefined();
    expect(readNameParts("/Curie/")).toBeUndefined();
    expect(readNameParts(undefined)).toBeUndefined();
  });
});
