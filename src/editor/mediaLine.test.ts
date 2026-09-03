import { EditorState } from "@codemirror/state";
import type { EditorLanguageService } from "@domorium/codemirror";
import type { MediaReference, Position } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { mediaLineAt } from "./mediaLine";

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
const file = state.doc.line(5);

describe("the media a line names", () => {
  it("answers a FILE payload, keyed by the line it was read from", () => {
    const { language } = service();
    expect(mediaLineAt(state, language, file.from + 7)).toEqual({
      number: 5,
      media: reference(),
    });
  });

  it("answers a multimedia link's pointer", () => {
    const { language } = service();
    const link = state.doc.line(9);
    expect(mediaLineAt(state, language, link.from + 7)?.number).toBe(9);
  });

  it("asks the service at the payload, not at the tag", () => {
    const { language, asked } = service();
    mediaLineAt(state, language, file.from + 2);
    expect(asked, "the payload is where a reference is answered").toEqual([4]);
  });

  it("never asks about a line no tag of which can carry media", () => {
    const { language, asked } = service();
    const family = state.doc.line(11);
    expect(mediaLineAt(state, language, family.from + 3)).toBeNull();
    expect(asked, "FAMS is settled by the tag alone").toEqual([]);
  });

  it("answers nothing for a pointer the document does not answer", () => {
    const { language } = service();
    const broken = state.doc.line(10);
    expect(mediaLineAt(state, language, broken.from + 7), "@O9@").toBeNull();
  });
});

describe("where on the line the gesture is answered", () => {
  it("answers on the tag, which is a wider target than the dressing", () => {
    const { language } = service();
    expect(mediaLineAt(state, language, file.from + 2)).not.toBeNull();
  });

  it("answers through the end of the payload", () => {
    const { language } = service();
    expect(mediaLineAt(state, language, file.to)).not.toBeNull();
  });

  it("refuses the level number that opens the line", () => {
    const { language, asked } = service();
    expect(mediaLineAt(state, language, file.from)).toBeNull();
    expect(asked, "and settles it without asking").toEqual([]);
  });
});
