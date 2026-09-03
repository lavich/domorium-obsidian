import {
  closeLintPanel,
  diagnosticCount,
  nextDiagnostic,
  openLintPanel,
  previousDiagnostic,
} from "@codemirror/lint";
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
import type { MediaReference } from "@domorium/language-service";
import {
  HoverPopover,
  Keymap,
  type Menu,
  normalizePath,
  Notice,
  setIcon,
  TextFileView,
  TFile,
  type WorkspaceLeaf,
} from "obsidian";

import { createGedcomComposition } from "./editor/composition";
import { mediaPreviewContent, previewBounds } from "./editor/media";
import { clearMediaPreview } from "./editor/mediaPreviewHover";
import { renderMediaPreview } from "./editor/mediaPreviewView";
import { hoverDelay, previewGesture } from "./editor/previewGesture";
import { carryCursor } from "./editor/reload";
import { recordEntries, type GedcomRecord } from "./editor/records";
import type { GedcomSettings } from "./settingsData";
import {
  offsetFromPosition,
  parseEphemeralState,
  positionFromOffset,
} from "./editor/ephemeralState";
import { openSearch } from "./editor/searchPanel";
import { routeDocumentLink } from "./editor/service";
import { leafShowingFile } from "./vault/openTabs";
import { recordAtLine, xrefFromSubpath } from "./vault/protocolLink";
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
  private mediaPreview: HoverPopover | null = null;

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
        this.hidePreviews();
        this.editor.setState(this.createState(data));
      } else if (data !== this.getViewData()) {
        this.hidePreviews();
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
    this.hidePreviews();
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
    const { cursor, scroll, subpath } = parseEphemeralState(state);
    const xref = subpath === undefined ? null : xrefFromSubpath(subpath);
    if (xref && this.goToXref(xref)) {
      return;
    }
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
    this.hidePreviews();
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
    const anchor = positionToOffset(this.editor.state.doc, record.start);
    this.editor.dispatch({
      selection: { anchor },
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
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

  openSearch(replace = false): void {
    openSearch(this.editor, replace);
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
          mediaGesture: previewGesture(this.settings.mediaPreview, (event) =>
            Keymap.isModifier(event, "Mod"),
          ),
          modifierHeld: (event) => Keymap.isModifier(event, "Mod"),
          delay: hoverDelay(this.settings.recordPreview),
          mediaDelay: hoverDelay(this.settings.mediaPreview),
          setIcon,
          actions: {
            applyWorkspaceEdit: (edit) => this.applyWorkspaceEdit(edit),
            openDocumentLink: (link) => this.openDocumentLink(link),
          },
          showPreview: (preview, _view, event) =>
            this.showPreview(preview, event.target as HTMLElement),
          hidePreview: () => this.hidePreview(),
          showMedia: (media, _view, event) =>
            this.showMediaPreview(media, event.target as HTMLElement),
          hideMedia: () => this.hideMediaPreview(),
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
    // Moving from one XREF to the next asks to show without asking to hide.
    this.hidePreview();
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

  /**
   * Both previews, wherever the state they were opened from is replaced rather
   * than edited: a `setState` reports no update, so the extension that would
   * have closed them never hears about it. The media one goes through its
   * session, which is keyed by the line — closed any other way it would answer
   * the next movement over that line with "keep" and show nothing at all.
   */
  private hidePreviews(): void {
    this.hidePreview();
    clearMediaPreview(this.editor);
  }

  private hidePreview(): void {
    this.preview?.unload();
    this.preview = null;
  }

  private showMediaPreview(media: MediaReference, target: HTMLElement): void {
    // Moving between two rectangles of one photograph reopens rather than keeps.
    this.hideMediaPreview();
    const popover = new HoverPopover(this.leaf, target);
    // Otherwise a fixed width with its overflow hidden, which cuts a picture
    // off at the edge rather than scaling it. See styles.css.
    popover.hoverEl.classList.add("gedcom-media-popover");
    this.mediaPreview = popover;
    const content = mediaPreviewContent(media, {
      documentPath: this.file?.path ?? "",
      resolve: (path) => {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
        return file instanceof TFile ? this.app.vault.getResourcePath(file) : null;
      },
    });
    renderMediaPreview(content, {
      container: popover.hoverEl,
      bounds: previewBounds(
        this.contentEl.clientWidth,
        this.contentEl.clientHeight,
      ),
      setIcon,
      isCurrent: () => this.mediaPreview === popover,
    });
  }

  private hideMediaPreview(): void {
    this.mediaPreview?.unload();
    this.mediaPreview = null;
  }

  /**
   * `iterateRootLeaves`, not `iterateAllLeaves`: a sidebar leaf holding the
   * same file would be found and then not shown, because `setActiveLeaf` will
   * not uncollapse a sidebar, and the reader's click would come to nothing. The
   * main area and the popouts are where a tab of its own would have gone.
   */
  private leafShowing(path: string): WorkspaceLeaf | null {
    return leafShowingFile(path, (visit) =>
      this.app.workspace.iterateRootLeaves(visit),
    );
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
        // Where it already is, or else a tab of its own: replacing this one
        // loses the reader's place in the file the link was followed from. Not
        // `'window'`, which the mobile app has no popout for.
        const open = this.leafShowing(path);
        if (open) {
          // Not `revealLeaf`, which also uncollapses a sidebar but wants
          // Obsidian 1.7.2. See "The minimum app version, and what it costs"
          // in CLAUDE.md.
          this.app.workspace.setActiveLeaf(open, { focus: true });
          return;
        }
        void this.app.workspace.getLeaf("tab").openFile(file);
      },
    });
    if (!routed) {
      new Notice("File link cannot be opened safely");
    }
  }
}
