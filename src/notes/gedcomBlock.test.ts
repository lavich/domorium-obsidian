import { describe, expect, it } from "vitest";

import { blockDialect, renderGedcomBlock } from "./gedcomBlock";

function text(block: ReturnType<typeof renderGedcomBlock>): string {
  return block.runs.map((run) => run.text).join("");
}

function classed(block: ReturnType<typeof renderGedcomBlock>, name: string) {
  return block.runs.filter((run) => run.className === name).map((r) => r.text);
}

describe("which specification a block is read by", () => {
  it("takes GEDCOM 7 when the fence says nothing", () => {
    expect(blockDialect("```gedcom")).toBe("7.0");
    expect(blockDialect(undefined)).toBe("7.0");
  });

  it("takes what the fence names", () => {
    expect(blockDialect("```gedcom 5.5.1")).toBe("5.5.1");
    expect(blockDialect("~~~~ gedcom 7.0")).toBe("7.0");
  });

  it("falls back rather than guessing at something it does not know", () => {
    expect(blockDialect("```gedcom 4.0")).toBe("7.0");
    expect(blockDialect("```gedcom nonsense")).toBe("7.0");
  });
});

describe("a GEDCOM block in a note", () => {
  const source = "0 @I1@ INDI\n1 NAME Marie /Curie/";

  it("gives back every character it was handed, in order", () => {
    expect(text(renderGedcomBlock(source, "7.0"))).toBe(source);
  });

  // A tag is the keyword of its line, an identifier a variable and a payload the
  // value — the meanings the token types carry since the legend was retyped.
  it("paints levels, pointers, tags and payloads the way the editor paints them", () => {
    const block = renderGedcomBlock(source, "7.0");

    expect(classed(block, "gedcom-token-comment")).toEqual(["0", "1"]);
    expect(classed(block, "gedcom-token-keyword")).toEqual(["INDI", "NAME"]);
    expect(classed(block, "gedcom-token-string")).toEqual(["Marie /Curie/"]);
  });

  it("sets a declaration apart from a reference to it", () => {
    const block = renderGedcomBlock("0 @I1@ INDI\n1 FAMS @F1@", "7.0");
    const declarations = block.runs
      .filter((run) => run.className?.includes("gedcom-token-declaration"))
      .map((run) => run.text);

    expect(declarations).toEqual(["@I1@"]);
  });

  it("does not ask a fragment for the header a fragment has no room for", () => {
    expect(renderGedcomBlock(source, "7.0").problems).toEqual([]);
  });

  it("still reports what is wrong with the lines it was given", () => {
    const problems = renderGedcomBlock(
      "0 @I1@ INDI\n1 NCHI abc",
      "7.0",
    ).problems;

    expect(problems).not.toHaveLength(0);
    expect(problems[0].line).toBe(2);
  });

  it("judges the same lines by the specification the fence named", () => {
    const block = "0 @I1@ INDI\n1 SEX Z";

    expect(renderGedcomBlock(block, "7.0").problems).toHaveLength(1);
    expect(renderGedcomBlock(block, "5.5.1").problems).toEqual([]);
  });

  it("has nothing to say about an empty block", () => {
    expect(renderGedcomBlock("", "7.0")).toEqual({ runs: [], problems: [] });
  });
});
