import { SearchQuery } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { countMatches, describeMatches } from "./searchMatches";

const DOC = "0 @I1@ INDI\n1 NAME Marie\n0 @I2@ INDI\n1 NAME Pierre\n0 TRLR";

function state(cursor = 0, doc = DOC) {
  return EditorState.create({ doc, selection: { anchor: cursor } });
}

const find = (search: string, config = {}) =>
  new SearchQuery({ search, ...config });

describe("how many matches there are, and which one we are on", () => {
  it("counts every match, and says nothing about which when off one", () => {
    expect(countMatches(state(), find("INDI"))).toEqual({
      index: 0,
      total: 2,
      capped: false,
    });
  });

  it("names the match the selection sits on", () => {
    expect(countMatches(state(DOC.indexOf("INDI")), find("INDI")).index).toBe(1);
    expect(
      countMatches(state(DOC.lastIndexOf("INDI")), find("INDI")).index,
    ).toBe(2);
  });

  it("answers nothing for a query that cannot be run", () => {
    expect(countMatches(state(), find(""))).toEqual({
      index: 0,
      total: 0,
      capped: false,
    });
    expect(countMatches(state(), find("[", { regexp: true })).total).toBe(0);
  });

  it("honours case, whole word and regexp the way the search does", () => {
    expect(countMatches(state(), find("indi")).total).toBe(2);
    expect(countMatches(state(), find("indi", { caseSensitive: true })).total).toBe(0);
    expect(countMatches(state(), find("NAM", { wholeWord: true })).total).toBe(0);
    expect(countMatches(state(), find("@I\\d@", { regexp: true })).total).toBe(2);
  });

  it("stops counting rather than walking a large file to the end", () => {
    const many = state(0, "0 INDI\n".repeat(50));

    expect(countMatches(many, find("INDI"), 10)).toEqual({
      index: 0,
      total: 10,
      capped: true,
    });
  });
});

describe("what the count reads as", () => {
  it("says nothing when there is nothing to say", () => {
    expect(describeMatches({ index: 0, total: 0, capped: false })).toBe("");
  });

  it("gives the total alone before a match is chosen", () => {
    expect(describeMatches({ index: 0, total: 7, capped: false })).toBe("7");
  });

  it("gives the position within the total once one is", () => {
    expect(describeMatches({ index: 3, total: 7, capped: false })).toBe("3/7");
  });

  it("owns up to having stopped counting", () => {
    expect(describeMatches({ index: 2, total: 1000, capped: true })).toBe(
      "2/1000+",
    );
  });
});
