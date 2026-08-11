import { Text } from "@codemirror/state";
import { EditorLanguageService } from "@domorium/codemirror";
import { describe, expect, it } from "vitest";

import { findRecordPreview, toPreviewRuns } from "./recordPreview";

function load(lines: string[]) {
  const doc = Text.of(lines);
  return { doc, service: new EditorLanguageService().update(doc) };
}

function offsetAt(doc: Text, line: number, character: number) {
  return doc.line(line + 1).from + character;
}

const { doc, service } = load([
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 FAMS @F1@",
  "0 @F1@ FAM",
  "1 HUSB @I2@",
  "1 WIFE @I1@",
  "0 @I2@ INDI",
  "0 TRLR",
]);

describe("locating the record an XREF points at", () => {
  it("spans the record a pointer names, not the line the pointer is on", () => {
    expect(findRecordPreview(service, doc, offsetAt(doc, 5, 8), 20)).toEqual({
      from: doc.line(7).from,
      to: doc.line(9).to,
      truncated: false,
      pointer: { from: offsetAt(doc, 5, 7), to: offsetAt(doc, 5, 11) },
    });
  });

  it("spans a record with nothing beneath it, which folding does not cover", () => {
    expect(findRecordPreview(service, doc, offsetAt(doc, 7, 8), 20)).toMatchObject({
      from: doc.line(10).from,
      to: doc.line(10).to,
      truncated: false,
    });
  });

  it("declines the declaration itself: it is the line being hovered", () => {
    expect(findRecordPreview(service, doc, offsetAt(doc, 6, 3), 20)).toBeNull();
  });

  it("declines anything that is not a pointer", () => {
    expect(findRecordPreview(service, doc, offsetAt(doc, 4, 3), 20)).toBeNull();
  });

  it("declines a pointer that names no record", () => {
    const dangling = load([
      "0 HEAD",
      "1 GEDC",
      "2 VERS 7.0",
      "0 @I1@ INDI",
      "1 FAMS @NOPE@",
      "0 TRLR",
    ]);
    expect(
      findRecordPreview(
        dangling.service,
        dangling.doc,
        offsetAt(dangling.doc, 4, 8),
        20,
      ),
    ).toBeNull();
  });

  it("reports a record cut short rather than spanning the whole of it", () => {
    expect(findRecordPreview(service, doc, offsetAt(doc, 5, 8), 2)).toMatchObject({
      from: doc.line(7).from,
      to: doc.line(8).to,
      truncated: true,
    });
  });
});

describe("splitting a record into highlighted runs", () => {
  const from = doc.line(7).from;
  const to = doc.line(9).to;

  function describeRuns(runs: { text: string; tokenType: number | null }[]) {
    return runs.map((run) => `${run.tokenType ?? "-"}:${run.text}`);
  }

  it("keeps the text between tokens, so the record reads as it is written", () => {
    const runs = toPreviewRuns(doc, from, to, service.getSemanticTokens({ from, to }));

    expect(runs.map((run) => run.text).join("")).toBe(doc.sliceString(from, to));
    expect(describeRuns(runs).slice(0, 6)).toEqual([
      "0:0",
      "-: ",
      "1:@F1@",
      "-: ",
      "2:FAM",
      "-:\n",
    ]);
  });

  it("clips a token that runs past the end of a record cut short", () => {
    const runs = toPreviewRuns(doc, from, from + 4, [
      { startOffset: from, endOffset: from + 1, tokenType: 0 },
      { startOffset: from + 2, endOffset: from + 6, tokenType: 1 },
    ]);

    expect(describeRuns(runs)).toEqual(["0:0", "-: ", "1:@F"]);
  });

  it("ignores a token that falls outside the record entirely", () => {
    const runs = toPreviewRuns(doc, from, from + 1, [
      { startOffset: from + 20, endOffset: from + 24, tokenType: 1 },
    ]);

    expect(describeRuns(runs)).toEqual(["-:0"]);
  });
});
