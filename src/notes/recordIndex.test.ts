import { describe, expect, it } from "vitest";

import { linkContext, recordList } from "./recordIndex";

describe("when a link being typed is asking for a record", () => {
  it("reads the file named and what has been typed after the hash", () => {
    expect(linkContext("see [[tree.ged#Ma")).toEqual({
      path: "tree.ged",
      query: "Ma",
      start: 15,
    });
  });

  it("asks as soon as the hash is typed", () => {
    expect(linkContext("[[tree.ged#")).toEqual({
      path: "tree.ged",
      query: "",
      start: 11,
    });
  });

  it("says nothing before the hash, where the file is still being named", () => {
    expect(linkContext("[[tree.ge")).toBeNull();
  });

  it("says nothing for a link that has been closed", () => {
    expect(linkContext("[[tree.ged#@I1@]] and then")).toBeNull();
  });

  it("says nothing where the author is writing their own text", () => {
    expect(linkContext("[[tree.ged#@I1@|Mar")).toBeNull();
  });

  it("takes the last link on the line", () => {
    expect(linkContext("[[a.ged#@I1@]] [[b.ged#")?.path).toBe("b.ged");
  });
});

describe("the records a file offers", () => {
  const records = recordList(
    "0 HEAD\n1 GEDC\n0 @I1@ INDI\n1 NAME Marie /Curie/\n0 @F1@ FAM\n0 TRLR\n",
  );

  it("offers every record that can be pointed at", () => {
    expect(records.map((record) => record.identifier)).toEqual([
      "@I1@",
      "@F1@",
    ]);
  });

  it("carries the name a reader knows the record by", () => {
    expect(records[0]?.label).toBe("Marie /Curie/");
  });
});
