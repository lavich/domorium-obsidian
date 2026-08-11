import { Text } from "@codemirror/state";
import { EditorLanguageService } from "@domorium/codemirror";
import { describe, expect, it } from "vitest";

import { readRecordPreview } from "./recordPreview";

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

describe("XREF record preview", () => {
  it("reads the record a pointer names, not the line the pointer is on", () => {
    expect(readRecordPreview(service, doc, offsetAt(doc, 5, 8), 20)).toBe(
      ["0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@"].join("\n"),
    );
  });

  it("reads a record with nothing beneath it, which folding does not cover", () => {
    expect(readRecordPreview(service, doc, offsetAt(doc, 7, 8), 20)).toBe(
      "0 @I2@ INDI",
    );
  });

  it("declines the declaration itself: it is the line being hovered", () => {
    expect(readRecordPreview(service, doc, offsetAt(doc, 6, 3), 20)).toBeNull();
  });

  it("declines anything that is not a pointer", () => {
    expect(readRecordPreview(service, doc, offsetAt(doc, 4, 3), 20)).toBeNull();
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
      readRecordPreview(
        dangling.service,
        dangling.doc,
        offsetAt(dangling.doc, 4, 8),
        20,
      ),
    ).toBeNull();
  });

  it("marks a record cut short rather than filling the screen with it", () => {
    expect(readRecordPreview(service, doc, offsetAt(doc, 5, 8), 2)).toBe(
      ["0 @F1@ FAM", "1 HUSB @I2@", "…"].join("\n"),
    );
  });
});
