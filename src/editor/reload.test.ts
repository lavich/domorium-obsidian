import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { carryCursor } from "./reload";

const doc = (text: string) => Text.of(text.split("\n"));

describe("a caret when the file is rewritten under it", () => {
  it("stays where it was when nothing about its line moved", () => {
    const before = doc("0 HEAD\n0 @I1@ INDI\n0 TRLR");
    const after = doc("0 HEAD\n0 @I1@ INDI\n0 @F1@ FAM\n0 TRLR");
    const head = before.line(2).from + 2;

    expect(carryCursor(before, after, head)).toBe(after.line(2).from + 2);
  });

  it("comes back onto the line when the line got shorter", () => {
    const before = doc("0 @I1@ INDI\n1 NAME Marie /Curie/");
    const after = doc("0 @I1@ INDI\n1 NAME");

    expect(carryCursor(before, after, before.length)).toBe(after.length);
  });

  it("comes back into the file when the line is gone altogether", () => {
    const before = doc("0 HEAD\n0 @I1@ INDI\n0 TRLR");
    const after = doc("0 HEAD");

    expect(carryCursor(before, after, before.length)).toBe(after.length);
  });

  it("survives the file being emptied", () => {
    expect(carryCursor(doc("0 HEAD\n0 TRLR"), doc(""), 8)).toBe(0);
  });
});
