import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";

import { EditorLanguageService, toCodeMirrorChanges } from "./service";

const text = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "0 @F1@ FAM",
  "1 HUSB @I1@",
  "0 TRLR",
].join("\n");

describe("reference editing adapters", () => {
  it("maps reference highlights and rename edits through one snapshot", () => {
    const language = new EditorLanguageService();
    language.update(text);

    expect(
      language.getDocumentHighlights({ line: 5, character: 9 }),
    ).toMatchObject([
      { kind: "write" },
      { kind: "read" },
    ]);
    const result = language.rename(
      { line: 5, character: 9 },
      "@I2@",
    );
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }
    const state = EditorState.create({ doc: text });
    expect(
      toCodeMirrorChanges(state.doc, result.edit, language.getVersion()),
    ).toEqual([
      { from: text.indexOf("@I1@"), to: text.indexOf("@I1@") + 4, insert: "@I2@" },
      {
        from: text.lastIndexOf("@I1@"),
        to: text.lastIndexOf("@I1@") + 4,
        insert: "@I2@",
      },
    ]);
  });

  it("rejects stale and overlapping edits without producing changes", () => {
    const state = EditorState.create({ doc: text });
    expect(
      toCodeMirrorChanges(
        state.doc,
        { version: 1, edits: [] },
        2,
      ),
    ).toBeNull();
    expect(
      toCodeMirrorChanges(
        state.doc,
        {
          version: 2,
          edits: [
            {
              range: {
                start: { line: 3, character: 2 },
                end: { line: 3, character: 6 },
              },
              newText: "@I2@",
            },
            {
              range: {
                start: { line: 3, character: 3 },
                end: { line: 3, character: 5 },
              },
              newText: "I3",
            },
          ],
        },
        2,
      ),
    ).toBeNull();
  });

  it("keeps the rename atomic so one undo restores the original text", () => {
    const state = EditorState.create({ doc: text });
    const language = new EditorLanguageService();
    language.update(text);
    const result = language.rename({ line: 5, character: 9 }, "@I2@");
    if (!result.ok) {
      throw new Error(result.message);
    }
    const changes = toCodeMirrorChanges(
      state.doc,
      result.edit,
      language.getVersion(),
    )!;
    const transaction = state.update({
      changes,
      userEvent: "input.domorium",
    });
    expect(transaction.state.doc.toString()).toContain("@I2@");
    expect(
      transaction.changes
        .invert(transaction.startState.doc)
        .apply(transaction.state.doc)
        .toString(),
    ).toBe(text);
  });
});
