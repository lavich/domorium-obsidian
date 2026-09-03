import { EditorState } from "@codemirror/state";
import type { EditorLanguageService } from "@domorium/codemirror";
import type { MediaReference, Position } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { mediaSpans, spanAt } from "./mediaSpans";

const DOC = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @O1@ OBJE",
  "1 FILE media/family.jpg",
  "2 FORM image/jpeg",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 OBJE @O1@",
  "1 OBJE @O9@",
  "1 FAMS @F1@",
  "0 TRLR",
].join("\n");

function reference(): MediaReference {
  return {
    range: { start: { line: 5, character: 7 }, end: { line: 5, character: 24 } },
    targetText: "media/family.jpg",
    kind: "file-relative",
    mediaKind: "image",
  };
}

/**
 * Answers for the two lines that name media and refuses the pointer to a record
 * the document does not declare, and records every line it was asked about.
 *
 * `Position.line` counts from zero where CodeMirror counts from one, so the
 * lines named here are one less than the lines the document shows.
 */
function service(): { language: EditorLanguageService; asked: number[] } {
  const asked: number[] = [];
  const language = {
    update: () => ({
      getMediaAt: (position: Position) => {
        asked.push(position.line);
        return position.line === 4 || position.line === 8 ? reference() : null;
      },
    }),
  } as unknown as EditorLanguageService;
  return { language, asked };
}

const state = EditorState.create({ doc: DOC });
const whole = [{ from: 0, to: DOC.length }];

describe("which lines name media", () => {
  it("dresses the payload and leaves the tag its own colour", () => {
    const { language } = service();
    const span = mediaSpans(state, language, whole).find(
      (candidate) => state.doc.lineAt(candidate.from).number === 5,
    );
    const line = state.doc.line(5);
    expect(span?.tagFrom, "the F of FILE").toBe(line.from + 2);
    expect(span?.from, "the m of media/, past the tag").toBe(line.from + 7);
    expect(span?.to, "through the payload").toBe(line.to);
  });

  it("answers a multimedia link's line", () => {
    const { language } = service();
    const lines = mediaSpans(state, language, whole).map(
      (span) => state.doc.lineAt(span.from).number,
    );
    expect(lines).toEqual([5, 9]);
  });

  it("never asks about a line no tag of which can carry media", () => {
    const { language, asked } = service();
    mediaSpans(state, language, whole);
    expect(asked, "FILE and the two OBJE links, and nothing else").toEqual([
      4, 8, 9,
    ]);
  });

  it("leaves a pointer the document does not answer undressed", () => {
    const { language } = service();
    const lines = mediaSpans(state, language, whole).map(
      (span) => state.doc.lineAt(span.from).number,
    );
    expect(lines, "@O9@ names no record").not.toContain(10);
  });

  it("counts a line once when two visible ranges meet inside it", () => {
    const { language } = service();
    const line = state.doc.line(5);
    const spans = mediaSpans(state, language, [
      { from: line.from, to: line.from + 4 },
      { from: line.from + 4, to: line.to },
    ]);
    expect(spans).toHaveLength(1);
  });
});

describe("the span under the pointer", () => {
  const { language } = service();
  const spans = mediaSpans(state, language, whole);
  const line = state.doc.line(5);

  it("answers inside the dressed extent", () => {
    expect(spanAt(spans, line.from + 7)).not.toBeNull();
    expect(spanAt(spans, line.to)).not.toBeNull();
  });

  it("answers on the tag too, which is a wider target than the dressing", () => {
    expect(spanAt(spans, line.from + 2)).not.toBeNull();
  });

  it("refuses the level number that opens the line", () => {
    expect(spanAt(spans, line.from)).toBeNull();
  });

  it("refuses a line that names nothing", () => {
    expect(spanAt(spans, state.doc.line(8).from + 3)).toBeNull();
  });
});
