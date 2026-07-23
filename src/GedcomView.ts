import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  normalizePath,
  Notice,
  TextFileView,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";
import type {
  DocumentLink,
  Range,
  WorkspaceEdit,
} from "@domorium/language-service";

import { createEditorExtensions } from "./editor/extensions";
import type { GedcomEditorSettings } from "./editor/extensions";
import { toOffset, toPosition } from "./editor/positions";
import {
  EditorLanguageService,
  resolveVaultRelativePath,
  toCodeMirrorChanges,
} from "./editor/service";

export const GEDCOM_VIEW_TYPE = "domorium-gedcom";

export class GedcomView extends TextFileView {
  private editor: EditorView;
  private readonly language = new EditorLanguageService();
  private applyingData = false;

  constructor(
    leaf: WorkspaceLeaf,
    private settings: GedcomEditorSettings,
  ) {
    super(leaf);
    this.contentEl.addClass("domorium-gedcom-view");
    const editorEl = this.contentEl.createDiv({ cls: "domorium-gedcom-editor" });
    this.editor = new EditorView({
      parent: editorEl,
      state: this.createState(""),
    });
  }

  getViewType(): string {
    return GEDCOM_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file?.name ?? "GEDCOM";
  }

  getIcon(): string {
    return "file-code-2";
  }

  getViewData(): string {
    return this.editor.state.sliceDoc();
  }

  setViewData(data: string, clear: boolean): void {
    this.applyingData = true;
    try {
      if (clear) {
        this.editor.setState(this.createState(data));
      } else if (data !== this.getViewData()) {
        this.editor.dispatch({
          changes: { from: 0, to: this.editor.state.doc.length, insert: data },
        });
      }
      this.language.update(data);
    } finally {
      this.applyingData = false;
    }
  }

  clear(): void {
    this.language.clear();
    this.editor.setState(this.createState(""));
  }

  applySettings(settings: GedcomEditorSettings): void {
    const data = this.getViewData();
    const selection = this.editor.state.selection;
    this.settings = settings;
    this.editor.setState(this.createState(data, selection.main.head));
  }

  goToDefinition(): boolean {
    const { state } = this.editor;
    const position = toPosition(state.doc, state.selection.main.head);
    const definition = this.language
      .update(state.sliceDoc())
      .getDefinitionRanges(position)[0];
    if (!definition) {
      return false;
    }
    const from = toOffset(state.doc, definition.start);
    this.editor.dispatch({ selection: { anchor: from }, scrollIntoView: true });
    this.editor.focus();
    return true;
  }

  findReferences(): Range[] {
    const { state } = this.editor;
    return this.language
      .update(state.sliceDoc())
      .getReferences(toPosition(state.doc, state.selection.main.head), {
        includeDeclaration: true,
      });
  }

  goToNextReference(): number {
    const references = this.findReferences();
    if (references.length === 0) {
      return 0;
    }
    const current = this.editor.state.selection.main.head;
    const offsets = references.map((range) =>
      toOffset(this.editor.state.doc, range.start),
    );
    const target = offsets.find((offset) => offset > current) ?? offsets[0];
    this.editor.dispatch({
      selection: { anchor: target },
      scrollIntoView: true,
    });
    this.editor.focus();
    return references.length;
  }

  canRenameReference(): boolean {
    const { state } = this.editor;
    this.language.update(state.sliceDoc());
    return this.language.prepareRename(
      toPosition(state.doc, state.selection.main.head),
    ).ok;
  }

  renameReference(newName: string): boolean {
    const { state } = this.editor;
    this.language.update(state.sliceDoc());
    const result = this.language.rename(
      toPosition(state.doc, state.selection.main.head),
      newName,
    );
    return result.ok && this.applyWorkspaceEdit(result.edit);
  }

  applyWorkspaceEdit(edit: WorkspaceEdit): boolean {
    const { state } = this.editor;
    this.language.update(state.sliceDoc());
    const changes = toCodeMirrorChanges(
      state.doc,
      edit,
      this.language.getVersion(),
    );
    if (!changes) {
      return false;
    }
    this.editor.dispatch({
      changes,
      userEvent: "input.domorium",
    });
    return true;
  }

  onClose(): Promise<void> {
    this.editor.destroy();
    return Promise.resolve();
  }

  private createState(data: string, cursor?: number): EditorState {
    return EditorState.create({
      doc: data,
      selection: cursor === undefined ? undefined : { anchor: cursor },
      extensions: [
        EditorState.lineSeparator.of(data.includes("\r\n") ? "\r\n" : "\n"),
        ...createEditorExtensions(this.language, this.settings, {
          applyWorkspaceEdit: (edit) => this.applyWorkspaceEdit(edit),
          openDocumentLink: (link) => this.openDocumentLink(link),
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this.applyingData) {
            this.data = update.state.sliceDoc();
            this.requestSave();
          }
        }),
      ],
    });
  }

  private openDocumentLink(link: DocumentLink): void {
    if (link.kind === "http") {
      void this.app.workspace.openLinkText(
        link.targetText,
        this.file?.path ?? "",
        true,
      );
      return;
    }
    if (link.kind !== "file-relative") {
      new Notice("Absolute file links are not opened automatically");
      return;
    }
    const relativePath = this.file
      ? resolveVaultRelativePath(this.file.path, link.targetText)
      : null;
    if (!relativePath) {
      new Notice("File link points outside the vault");
      return;
    }
    const path = normalizePath(relativePath);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`Vault file not found: ${path}`);
      return;
    }
    void this.app.workspace.getLeaf(false).openFile(file);
  }
}
