import { describe, expect, it } from "vitest";

import {
  defaultLinkText,
  namedLink,
  recordNames,
  splitSubpath,
} from "./recordLinks";

describe("reading a link the way Obsidian wrote it", () => {
  it("splits the record off the file", () => {
    expect(splitSubpath("tree.ged#@I1@")).toEqual({
      path: "tree.ged",
      subpath: "#@I1@",
    });
    expect(splitSubpath("tree.ged")).toEqual({ path: "tree.ged", subpath: "" });
  });

  it("spells the text a link shows where its author wrote none", () => {
    expect(defaultLinkText("tree.ged#@I1@")).toBe("tree.ged > @I1@");
    expect(defaultLinkText("tree.ged")).toBe("tree.ged");
  });
});

describe("what a link to a record is called in a note", () => {
  it("takes the name of the record over a path and an identifier", () => {
    expect(
      namedLink("tree.ged#@I1@", "tree.ged > @I1@", "Marie /Curie/"),
    ).toBe("Marie /Curie/");
  });

  it("leaves the author's own words alone", () => {
    expect(namedLink("tree.ged#@I1@", "the discoverer", "Marie /Curie/")).toBe(
      null,
    );
  });

  it("leaves the link as written where the record has no name", () => {
    expect(namedLink("tree.ged#@I1@", "tree.ged > @I1@", undefined)).toBe(null);
  });
});

describe("the names a file answers to", () => {
  const names = recordNames(
    "0 @I1@ INDI\n1 NAME Marie /Curie/\n0 @S1@ SOUR\n1 TITL Register\n0 @F1@ FAM\n",
  );

  it("reads a record by its identifier", () => {
    expect(names.get("@I1@")).toBe("Marie /Curie/");
    expect(names.get("@S1@")).toBe("Register");
  });

  it("says nothing for a record the format names none for", () => {
    expect(names.has("@F1@")).toBe(false);
  });
});
