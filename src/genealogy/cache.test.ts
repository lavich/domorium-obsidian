import type { DocumentSymbol } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import { IndexCache } from "./cache";
import { documentRef } from "./personRef";

const symbol = (xref: string): DocumentSymbol => ({
  name: "INDI",
  detail: xref,
  kind: 19,
  range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  selectionRange: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
  children: [],
});

describe("reading paid for once per revision", () => {
  it("reads once while the revision holds", () => {
    const read = vi.fn(() => [symbol("@I1@")]);
    const cache = new IndexCache();
    const tree = documentRef("tree.ged");

    cache.at(tree, "r1", read);
    cache.at(tree, "r1", read);
    cache.at(tree, "r1", read);

    expect(read).toHaveBeenCalledTimes(1);
  });

  it("reads again when the revision changes", () => {
    const read = vi.fn(() => [symbol("@I1@")]);
    const cache = new IndexCache();
    const tree = documentRef("tree.ged");

    cache.at(tree, "r1", read);
    cache.at(tree, "r2", read);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it("answers for the revision it was asked about", () => {
    const cache = new IndexCache();
    const tree = documentRef("tree.ged");

    const first = cache.at(tree, "r1", () => [symbol("@I1@")]);
    const second = cache.at(tree, "r2", () => [symbol("@I9@")]);

    expect(first.people[0]?.xref).toBe("@I1@");
    expect(second.people[0]?.xref).toBe("@I9@");
  });

  it("keeps two documents apart, whatever their identifiers", () => {
    const cache = new IndexCache();
    const one = cache.at(documentRef("one.ged"), "r1", () => [symbol("@I1@")]);
    const two = cache.at(documentRef("two.ged"), "r1", () => [symbol("@I1@")]);

    expect(one).not.toBe(two);
    expect(cache.at(documentRef("one.ged"), "r1", () => [])).toBe(one);
  });

  it("forgets a document it is told to forget", () => {
    const read = vi.fn(() => [symbol("@I1@")]);
    const cache = new IndexCache();
    const tree = documentRef("tree.ged");

    cache.at(tree, "r1", read);
    cache.forget(tree);
    cache.at(tree, "r1", read);

    expect(read).toHaveBeenCalledTimes(2);
  });

  it("holds one revision per document, not a growing pile", () => {
    const cache = new IndexCache();
    const tree = documentRef("tree.ged");

    for (let i = 0; i < 50; i++) {
      cache.at(tree, `r${i}`, () => [symbol("@I1@")]);
    }

    expect(cache.size).toBe(1);
  });
});

describe("a reading already held", () => {
  it("is answered without a revision, for a caller that has none", () => {
    const cache = new IndexCache();
    const tree = documentRef("tree.ged");
    cache.at(tree, "r1", () => [symbol("@I1@")]);

    expect(cache.held(tree)?.person("@I1@")?.xref).toBe("@I1@");
  });

  it("is nothing for a document never read", () => {
    expect(new IndexCache().held(documentRef("tree.ged"))).toBeNull();
  });
});
