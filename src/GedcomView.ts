import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  applyWorkspaceEdit,
  canRenameReference,
  createGedcomExtensions,
  EditorLanguageService,
  findReferences,
  goToDefinition,
  goToNextReference,
  renameReference,
  type DocumentLink,
  type GedcomEditorSettings,
  type Range,
  type WorkspaceEdit,
} from "@domorium/codemirror";
import {
  HoverPopover,
  Keymap,
  normalizePath,
  Notice,
  TextFileView,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";

import {
  offsetFromPosition,
  parseEphemeralState,
  positionFromOffset,
} from "./editor/ephemeralState";
import { createHostEditorExtensions } from "./editor/hostExtensions";
import { readRecordPreview } from "./editor/recordPreview";
import { routeDocumentLink } from "./editor/service";
import { GEDCOM_ICON_ID } from "./icon";

export const GEDCOM_VIEW_TYPE = "domorium-gedcom";

const PREVIEW_MAX_LINES = 24;

export class GedcomView extends TextFileView {
  private editor: EditorView;
  private readonly language = new EditorLanguageService();
  private applyingData = false;
  private previewed: string | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private settings: GedcomEditorSettings,
  ) {
    super(leaf);
    this.contentEl.addClass("gedcom-gedcom-view");
    const editorEl = this.contentEl.createDiv({ cls: "gedcom-gedcom-editor" });
    this.editor = new EditorView({
      parent: editorEl,
      state: this.createState(""),
    });
    this.registerDomEvent(editorEl, "mousemove", (event) => {
      this.previewRecord(event);
    });
  }

  getViewType(): string {
    return GEDCOM_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.file?.name ?? "GEDCOM";
  }

  getIcon(): string {
    return GEDCOM_ICON_ID;
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

  getEphemeralState(): Record<string, unknown> {
    const { doc, selection } = this.editor.state;
    return {
      cursor: positionFromOffset(doc, selection.main.head),
      scroll: this.editor.scrollDOM.scrollTop,
    };
  }

  setEphemeralState(state: unknown): void {
    const { cursor, scroll } = parseEphemeralState(state);
    if (cursor) {
      this.editor.dispatch({
        selection: {
          anchor: offsetFromPosition(this.editor.state.doc, cursor),
        },
        // Scrolling the cursor into view would fight the stored scroll below.
        scrollIntoView: scroll === undefined,
      });
    }
    if (scroll !== undefined) {
      this.editor.scrollDOM.scrollTop = scroll;
    }
  }

  applySettings(settings: GedcomEditorSettings): void {
    const data = this.getViewData();
    const selection = this.editor.state.selection;
    this.settings = settings;
    this.editor.setState(this.createState(data, selection.main.head));
  }

  goToDefinition(): boolean {
    const moved = goToDefinition(this.editor, this.language);
    if (moved) {
      this.editor.focus();
    }
    return moved;
  }

  findReferences(): Range[] {
    return findReferences(this.editor.state, this.language);
  }

  goToNextReference(): number {
    const referenceCount = goToNextReference(this.editor, this.language);
    if (referenceCount > 0) {
      this.editor.focus();
    }
    return referenceCount;
  }

  canRenameReference(): boolean {
    return canRenameReference(this.editor.state, this.language);
  }

  renameReference(newName: string): boolean {
    return renameReference(this.editor, this.language, newName);
  }

  applyWorkspaceEdit(edit: WorkspaceEdit): boolean {
    this.language.update(this.editor.state.sliceDoc());
    return applyWorkspaceEdit(this.editor, edit, this.language.getVersion());
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
        ...createHostEditorExtensions(this.settings),
        ...createGedcomExtensions({
          language: this.language,
          settings: this.settings,
          actions: {
            applyWorkspaceEdit: (edit) => this.applyWorkspaceEdit(edit),
            openDocumentLink: (link) => this.openDocumentLink(link),
          },
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

  private previewRecord(event: MouseEvent): void {
    if (!Keymap.isModifier(event, "Mod")) {
      this.previewed = null;
      return;
    }
    const offset = this.editor.posAtCoords({
      x: event.clientX,
      y: event.clientY,
    });
    const doc = this.editor.state.doc;
    const preview =
      offset === null
        ? null
        : readRecordPreview(
            this.language.update(doc),
            doc,
            offset,
            PREVIEW_MAX_LINES,
          );
    if (preview === null || preview === this.previewed) {
      this.previewed = preview;
      return;
    }
    this.previewed = preview;
    const popover = new HoverPopover(this.leaf, event.target as HTMLElement);
    popover.hoverEl.createEl("pre", {
      cls: "gedcom-record-preview",
      text: preview,
    });
  }

  private openDocumentLink(link: DocumentLink): void {
    const routed = routeDocumentLink(link, this.file?.path ?? "", {
      openExternal: (url) => {
        this.contentEl.ownerDocument.defaultView?.open(
          url,
          "_blank",
          "noopener,noreferrer",
        );
      },
      openVaultFile: (relativePath) => {
        const path = normalizePath(relativePath);
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) {
          new Notice(`Vault file not found: ${path}`);
          return;
        }
        void this.app.workspace.getLeaf(false).openFile(file);
      },
    });
    if (!routed) {
      new Notice("File link cannot be opened safely");
    }
  }
}
