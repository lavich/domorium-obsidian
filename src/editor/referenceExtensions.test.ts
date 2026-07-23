import { history, undo } from "@codemirror/commands";
import {
  EditorState,
  Transaction,
  type TransactionSpec,
} from "@codemirror/state";
import { describe, expect, it, vi } from "vitest";

import {
  applyWorkspaceEditToTarget,
  EditorLanguageService,
  resolveVaultRelativePath,
  routeDocumentLink,
  toCodeMirrorChanges,
} from "./service";
import {
  getDiagnosticActions,
  getReferenceHighlightSpecs,
} from "./extensions";

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
                start: { line: 99, character: 0 },
                end: { line: 99, character: 0 },
              },
              newText: "unsafe",
            },
          ],
        },
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
                start: { line: 3, character: 6 },
                end: { line: 3, character: 2 },
              },
              newText: "@I2@",
            },
          ],
        },
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
    let state = EditorState.create({ doc: text, extensions: [history()] });
    const language = new EditorLanguageService();
    language.update(text);
    const result = language.rename({ line: 5, character: 9 }, "@I2@");
    if (!result.ok) {
      throw new Error(result.message);
    }
    const target = {
      get state() {
        return state;
      },
      dispatch(transaction: Transaction | TransactionSpec) {
        state =
          transaction instanceof Transaction
            ? transaction.state
            : state.update(transaction).state;
      },
    };
    expect(
      applyWorkspaceEditToTarget(
        target,
        result.edit,
        language.getVersion(),
      ),
    ).toBe(true);
    expect(state.doc.toString()).toContain("@I2@");
    expect(undo(target)).toBe(true);
    expect(state.doc.toString()).toBe(text);
  });

  it("preserves CRLF through the editor-state line separator", () => {
    const source = "0 HEAD\r\n0 TRLR\r\n";
    const state = EditorState.create({
      doc: source,
      extensions: [EditorState.lineSeparator.of("\r\n")],
    });
    expect(state.sliceDoc()).toBe(source);
  });

  it("resolves local links from the GEDCOM file directory and stays in vault", () => {
    expect(
      resolveVaultRelativePath("family/tree.ged", "media/photo.jpg"),
    ).toBe("family/media/photo.jpg");
    expect(
      resolveVaultRelativePath("family/tree.ged", "../shared/photo.jpg"),
    ).toBe("shared/photo.jpg");
    expect(
      resolveVaultRelativePath("tree.ged", "../outside/photo.jpg"),
    ).toBeNull();
  });

  it("routes HTTP externally and vault files through the resolved path", () => {
    const openExternal = vi.fn();
    const openVaultFile = vi.fn();
    const router = { openExternal, openVaultFile };

    expect(
      routeDocumentLink(
        {
          kind: "http",
          targetText: "https://example.com",
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
        },
        "family/tree.ged",
        router,
      ),
    ).toBe(true);
    expect(openExternal).toHaveBeenCalledWith("https://example.com");

    expect(
      routeDocumentLink(
        {
          kind: "file-relative",
          targetText: "media/photo.jpg",
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 1 },
          },
        },
        "family/tree.ged",
        router,
      ),
    ).toBe(true);
    expect(openVaultFile).toHaveBeenCalledWith("family/media/photo.jpg");
  });

  it("recomputes reference specs from selection and wires lint actions", () => {
    const language = new EditorLanguageService();
    let state = EditorState.create({
      doc: text.replace("0 TRLR", "1 WIFE @I9@\n0 TRLR"),
    });
    const declaration = text.indexOf("@I1@");
    state = state.update({ selection: { anchor: declaration + 1 } }).state;
    expect(getReferenceHighlightSpecs(state, language)).toMatchObject([
      { kind: "write" },
      { kind: "read" },
    ]);

    const diagnostic = language.service
      .getDiagnostics()
      .find(({ code }) => code === "unresolved-xref")!;
    const apply = vi.fn(() => true);
    const actions = getDiagnosticActions(language, diagnostic, apply);
    expect(actions.map(({ name }) => name)).toEqual(
      expect.arrayContaining([
        "Replace @I9@ with @I1@",
        "Create INDI record @I9@",
      ]),
    );
    actions[0].apply();
    expect(apply).toHaveBeenCalledOnce();
  });
});
