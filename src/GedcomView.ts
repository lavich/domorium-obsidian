import {
  closeLintPanel,
  diagnosticCount,
  nextDiagnostic,
  openLintPanel,
  previousDiagnostic,
} from "@codemirror/lint";
import { openSearchPanel } from "@codemirror/search";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import {
  applyWorkspaceEdit,
  canRenameReference,
  EditorLanguageService,
  findReferences,
  goToDefinition,
  getRecordPreviewRuns,
  goToNextReference,
  positionToOffset,
  renameReference,
  type DocumentLink,
  type Range,
  type RecordPreview,
  type WorkspaceEdit,
} from "@domorium/codemirror";
import {
  HoverPopover,
  Keymap,
  type Menu,
  normalizePath,
  Notice,
  TextFileView,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";

import { createGedcomComposition } from "./editor/composition";
import { previewGesture } from "./editor/previewGesture";
import { carryCursor } from "./editor/reload";
import { recordEntries, type GedcomRecord } from "./editor/records";
import type { GedcomSettings } from "./settingsData";
import {
  offsetFromPosition,
  parseEphemeralState,
  positionFromOffset,
} from "./editor/ephemeralState";
import { routeDocumentLink } from "./editor/service";
import { recordAtLine } from "./vault/protocolLink";
import { planRetarget } from "./vault/renamedMedia";
import type { GedcomStatus } from "./editor/status";
import { GEDCOM_ICON_ID } from "./icon";

export const GEDCOM_VIEW_TYPE = "domorium-gedcom";

export interface GedcomViewHost {
  fillMenu(menu: Menu, view: GedcomView): void;
  statusChanged(view: GedcomView): void;
}

export class GedcomView extends TextFileView {
  private editor: EditorView;
  private readonly language = new EditorLanguageService();
  private applyingData = false;
  private preview: HoverPopover | null = null;

  constructor(
    leaf: WorkspaceLeaf,
    private settings: GedcomSettings,
    private readonly host: GedcomViewHost,
  ) {
    super(leaf);
    this.contentEl.addClass("gedcom-gedcom-view");
    const editorEl = this.contentEl.createDiv({ cls: "gedcom-gedcom-editor" });
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
        this.hidePreview();
        const before = this.editor.state.doc;
        const head = this.editor.state.selection.main.head;
        const scroll = this.editor.scrollDOM.scrollTop;
        this.editor.dispatch({
          changes: { from: 0, to: before.length, insert: data },
        });
        this.editor.dispatch({
          selection: { anchor: carryCursor(before, this.editor.state.doc, head) },
        });
        this.editor.scrollDOM.scrollTop = scroll;
      }
      this.language.update(data);
    } finally {
      this.applyingData = false;
    }
    this.host.statusChanged(this);
  }

  clear(): void {
    this.language.clear();
    this.editor.setState(this.createState(""));
    this.host.statusChanged(this);
  }

  getStatus(): GedcomStatus {
    const { state } = this.editor;
    return {
      version: this.language.current(state.doc)?.getVersionResolution(),
      problems:
        (this.settings.diagnostics ?? true) ? diagnosticCount(state) : undefined,
    };
  }

  onPaneMenu(menu: Menu, source: string): void {
    super.onPaneMenu(menu, source);
    this.host.fillMenu(menu, this);
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

  applySettings(settings: GedcomSettings): void {
    this.settings = settings;
    this.refresh();
  }

  refresh(): void {
    // setState throws away the state whose update would have reported this.
    this.hidePreview();
    const data = this.getViewData();
    const selection = this.editor.state.selection;
    this.editor.setState(this.createState(data, selection.main.head));
    this.host.statusChanged(this);
  }

  goToDefinition(): boolean {
    const moved = goToDefinition(this.editor, this.language);
    if (moved) {
      this.editor.focus();
    }
    return moved;
  }

  records(): GedcomRecord[] {
    return recordEntries(
      this.language.update(this.editor.state.doc).getDocumentSymbols(),
    );
  }

  recordAtCursor(): GedcomRecord | undefined {
    const { doc, selection } = this.editor.state;
    return recordAtLine(this.records(), doc.lineAt(selection.main.head).number - 1);
  }

  goToXref(xref: string): boolean {
    const record = this.records().find((entry) => entry.identifier === xref);
    if (!record) {
      return false;
    }
    this.goToRecord(record);
    return true;
  }

  goToRecord(record: GedcomRecord): void {
    this.editor.dispatch({
      selection: {
        anchor: positionToOffset(this.editor.state.doc, record.start),
      },
      scrollIntoView: true,
    });
    this.editor.focus();
  }

  followRenamedFile(
    from: string,
    to: string,
  ): { count: number; stranded: number } {
    const documentPath = this.file?.path;
    if (!documentPath) {
      return { count: 0, stranded: 0 };
    }
    const { edit, stranded } = planRetarget(
      this.language.update(this.editor.state.doc),
      documentPath,
      from,
      to,
    );
    if (edit.edits.length === 0) {
      return { count: 0, stranded };
    }
    return {
      count: this.applyWorkspaceEdit(edit) ? edit.edits.length : 0,
      stranded,
    };
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

  problemCount(): number {
    return diagnosticCount(this.editor.state);
  }

  goToNextProblem(): boolean {
    const moved = nextDiagnostic(this.editor);
    if (moved) {
      this.editor.focus();
    }
    return moved;
  }

  goToPreviousProblem(): boolean {
    const moved = previousDiagnostic(this.editor);
    if (moved) {
      this.editor.focus();
    }
    return moved;
  }

  canShowProblems(): boolean {
    return this.settings.diagnostics ?? true;
  }

  toggleProblemsPanel(): void {
    const open = this.editor.dom.querySelector(".cm-panel-lint") !== null;
    if (open) {
      closeLintPanel(this.editor);
    } else {
      openLintPanel(this.editor);
    }
    this.editor.focus();
  }

  openSearch(): void {
    openSearchPanel(this.editor);
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

  private isDark(): boolean {
    return this.containerEl.ownerDocument.body.classList.contains("theme-dark");
  }

  private createState(data: string, cursor?: number): EditorState {
    return EditorState.create({
      doc: data,
      selection: cursor === undefined ? undefined : { anchor: cursor },
      extensions: [
        EditorState.lineSeparator.of(data.includes("\r\n") ? "\r\n" : "\n"),
        ...createGedcomComposition({
          language: this.language,
          settings: this.settings,
          dark: this.isDark(),
          gesture: previewGesture(this.settings.recordPreview, (event) =>
            Keymap.isModifier(event, "Mod"),
          ),
          actions: {
            applyWorkspaceEdit: (edit) => this.applyWorkspaceEdit(edit),
            openDocumentLink: (link) => this.openDocumentLink(link),
          },
          showPreview: (preview, _view, event) =>
            this.showPreview(preview, event.target as HTMLElement),
          hidePreview: () => this.hidePreview(),
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this.applyingData) {
            this.requestSave();
          }
          this.host.statusChanged(this);
        }),
      ],
    });
  }

  private showPreview(preview: RecordPreview, target: HTMLElement): void {
    this.preview = new HoverPopover(this.leaf, target);
    const block = this.preview.hoverEl.createEl("pre", {
      cls: "gedcom-record-preview",
    });
    for (const run of getRecordPreviewRuns(
      this.editor.state,
      this.language,
      preview,
    )) {
      if (run.className) {
        block.createSpan({ cls: run.className, text: run.text });
      } else {
        block.appendText(run.text);
      }
    }
    if (preview.truncated) {
      block.appendText("\n…");
    }
  }

  private hidePreview(): void {
    this.preview?.unload();
    this.preview = null;
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
