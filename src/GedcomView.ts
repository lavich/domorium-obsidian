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
    return this.editor.state.doc.toString();
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
      .update(state.doc.toString())
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
      .update(state.doc.toString())
      .getReferences(toPosition(state.doc, state.selection.main.head), {
        includeDeclaration: true,
      });
  }

  renameReference(newName: string): boolean {
    const { state } = this.editor;
    this.language.update(state.doc.toString());
    const result = this.language.rename(
      toPosition(state.doc, state.selection.main.head),
      newName,
    );
    return result.ok && this.applyWorkspaceEdit(result.edit);
  }

  applyWorkspaceEdit(edit: WorkspaceEdit): boolean {
    const { state } = this.editor;
    this.language.update(state.doc.toString());
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
        ...createEditorExtensions(this.language, this.settings, {
          applyWorkspaceEdit: (edit) => this.applyWorkspaceEdit(edit),
          openDocumentLink: (link) => this.openDocumentLink(link),
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this.applyingData) {
            this.data = update.state.doc.toString();
            this.requestSave();
          }
        }),
      ],
    });
  }

  private openDocumentLink(link: DocumentLink): void {
    if (link.kind === "http") {
      window.open(link.targetText, "_blank", "noopener,noreferrer");
      return;
    }
    if (link.kind !== "file-relative") {
      new Notice("Absolute file links are not opened automatically");
      return;
    }
    const path = normalizePath(link.targetText);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`Vault file not found: ${path}`);
      return;
    }
    void this.app.workspace.getLeaf(false).openFile(file);
  }
}
