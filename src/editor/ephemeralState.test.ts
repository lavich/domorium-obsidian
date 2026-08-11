import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import {
  offsetFromPosition,
  parseEphemeralState,
  positionFromOffset,
} from "./ephemeralState";

const document = Text.of(["0 HEAD", "1 SOUR Domorium", "0 TRLR"]);

describe("GEDCOM view ephemeral state", () => {
  it("round-trips a cursor between an offset and an Obsidian position", () => {
    const offset = document.line(2).from + 7;

    expect(positionFromOffset(document, offset)).toEqual({ line: 1, ch: 7 });
    expect(offsetFromPosition(document, { line: 1, ch: 7 })).toBe(offset);
  });

  it("clamps a line past the end: the file may have shrunk under the view", () => {
    expect(offsetFromPosition(document, { line: 400, ch: 0 })).toBe(
      document.line(3).from,
    );
  });

  it("clamps a character past the end of its line", () => {
    expect(offsetFromPosition(document, { line: 0, ch: 400 })).toBe(
      document.line(1).to,
    );
  });

  it("clamps a negative position rather than reading before the document", () => {
    expect(offsetFromPosition(document, { line: -1, ch: -5 })).toBe(0);
  });

  it("reads a cursor and a scroll offset out of stored state", () => {
    expect(parseEphemeralState({ cursor: { line: 2, ch: 3 }, scroll: 120 }))
      .toEqual({ cursor: { line: 2, ch: 3 }, scroll: 120 });
  });

  it("drops state that is not an object", () => {
    expect(parseEphemeralState(null)).toEqual({});
    expect(parseEphemeralState("0 HEAD")).toEqual({});
  });

  it("drops fields that are not finite numbers", () => {
    expect(
      parseEphemeralState({ cursor: { line: "2", ch: 3 }, scroll: Number.NaN }),
    ).toEqual({});
  });

  it("drops a negative scroll offset", () => {
    expect(parseEphemeralState({ scroll: -1 })).toEqual({});
  });
});
