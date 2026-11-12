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
import {
  debounce,
  HoverPopover,
  Keymap,
  type Menu,
  normalizePath,
  Notice,
  Platform,
  Scope,
  setIcon,
  TextFileView,
  TFile,
  type ViewStateResult,
  type WorkspaceLeaf,
} from "obsidian";

import { createGedcomComposition } from "./editor/composition";
import { isDarkTheme } from "./editor/darkTheme";
import { mediaItemAt, mediaVaultOf } from "./editor/mediaItems";
import { PreviewPopovers } from "./editor/previewPopovers";
import { pushSearchScope } from "./editor/searchScope";
import { openVaultFile } from "./editor/vaultFile";
import { clearMediaPreview } from "./editor/mediaPreviewHover";
import type { AllowScope } from "./editor/mediaPreviewView";
import { hoverDelay, previewGesture } from "./editor/previewGesture";
import { carryCursor } from "./editor/reload";
import { recordEntries, type GedcomRecord } from "./editor/records";
import { plural, t } from "./i18n";
import { DESK_MODES, type GedcomSettings } from "./settingsData";
import {
  offsetFromPosition,
  parseEphemeralState,
  positionFromOffset,
} from "./editor/ephemeralState";
import { openSearch } from "./editor/searchPanel";
import type { SearchKeyBinding } from "./editor/searchKeys";
import { routeDocumentLink } from "./editor/service";
import {
  actionOrder,
  cursorInside,
  initialMode,
  rememberedMode,
  type ModeSource,
  isViewMode,
  modeButtons,
  modeLook,
  readDeskState,
  shownRange,
  followsCursor,
  routeRecord,
  type RecordTarget,
  type DeskMode,
  type Origin,
  type ViewKind,
} from "./desk/deskState";
import { listSelection } from "./desk/listRows";
import { FileViews, memoryToShow, type ViewMemory } from "./desk/fileViews";
import { originRules, TabModes } from "./desk/tabModes";
import type { MediaItem } from "./desk/media";
import { ConfirmModal } from "./desk/confirmModal";
import { addableAt, choicesAt, describes, holdsValueAt, pairedAt, pointerChoicesAt, proseAt, removableAt, type Choices } from "./desk/addableFields";
import {
  addAt,
  checkValue,
  commit,
  describeMoveAt,
  inLineBreak,
  moveAt,
  refusalText,
  removeAt,
  requiredBeneath,
  setValueAt,
  STALE,
  type EditTarget,
  type Refusal,
  type WriteOutcome,
} from "./desk/edits";
import { mediaFileEdit, type FileAt } from "./desk/mediaFile";
import type { CardTab } from "./desk/recordCard";
import { CursorFollow, shouldFollowCursor } from "./desk/followRules";
import { RevisionMemo } from "./editor/revisionMemo";
import { documentRef, type GenealogyIndex } from "./genealogy";
import type {
  GedcomLanguageService,
  MoveDescription,
  MoveTarget,
  PointerCandidate,
  Position,
  StructureFieldDescription,
  StructureInput,
  StructureValueInput,
} from "@domorium/language-service";
import { IndexCache } from "./genealogy/cache";
import { leafShowingFile } from "./vault/openTabs";
import { recordAtLine, xrefFromSubpath } from "./vault/protocolLink";
import { type Move, type Outcome, planMove } from "./vault/movedFiles";
import type { GedcomStatus } from "./editor/status";
import { GEDCOM_ICON_ID } from "./icon";

export const GEDCOM_VIEW_TYPE = "domorium-gedcom";

export interface GedcomViewHost {
  fillMenu(menu: Menu, view: GedcomView): void;
  statusChanged(view: GedcomView): void;
  /** Whether a remote image may be drawn: the setting, or the shorter answer. */
  remoteImages(): boolean;
  /** What the offer in the popover was answered with. */
  allowRemoteImages(scope: AllowScope): void;
  genealogyChanged(view: GedcomView): void;
  cardWanted(view: GedcomView, origin: Origin): void;
  lastMode(): DeskMode;
  modeChosen(mode: DeskMode): void;
}

export class GedcomView extends TextFileView implements CardTab {
  private editor: EditorView;
  private readonly language = new EditorLanguageService();
  private applyingData = false;
  private readonly popovers: PreviewPopovers;
  private readonly modes: TabModes;
  private readonly views: FileViews;
  private memory: ViewMemory = {};
  private revision = 0;
  private readonly genealogyCache = new IndexCache();
  private readonly editorEl: HTMLElement;
  private readonly viewsEl: HTMLElement;
  private readonly modeActions = new Map<DeskMode, HTMLElement>();
  // Edits come a keystroke at a time; the index and the panel need the text
  // once it has settled.
  private readonly announceEdit = debounce(() => this.editsSettled(), 300, true);
  private readonly followCursor = new CursorFollow(window, () => this.cursorSettled());
  private readonly recordsMemo = new RevisionMemo<GedcomRecord[]>();

  constructor(
    leaf: WorkspaceLeaf,
    private settings: GedcomSettings,
    private readonly host: GedcomViewHost,
  ) {
    super(leaf);
    this.contentEl.addClass("gedcom-gedcom-view");
    this.modes = new TabModes(
      initialMode(undefined, host.lastMode(), settings.genealogyInterface),
      settings.genealogyInterface,
    );
    this.editorEl = this.contentEl.createDiv({ cls: "gedcom-gedcom-editor" });
    this.viewsEl = this.contentEl.createDiv({ cls: "gedcom-gedcom-views" });
    this.views = new FileViews(this.viewsEl, {
      select: (xref) => {
        this.selectRecord(xref, "view");
      },
      showInSource: (range) => this.showInSource(range),
      changed: () => {
        this.memory = { ...this.memory, ...this.views.memory() };
        this.app.workspace.requestSaveLayout();
      },
      setIcon: (element, icon) => setIcon(element, icon),
      coarsePointer: () => Platform.isMobile || window.matchMedia("(pointer: coarse)").matches,
    });
    this.popovers = new PreviewPopovers({
      open: (target) => new HoverPopover(this.leaf, target),
      clearMediaSession: () => clearMediaPreview(this.editor),
      mediaVault: () => {
        const service = this.language.update(this.editor.state.doc);
        return mediaVaultOf(service, this.file?.path ?? "", (path) =>
          this.resolveVaultResource(path),
        );
      },
      remoteImages: () => this.host.remoteImages(),
      allowRemoteImages: (scope) => this.host.allowRemoteImages(scope),
      setIcon: (element, icon) => setIcon(element, icon),
      contentSize: () => ({
        width: this.contentEl.clientWidth,
        height: this.contentEl.clientHeight,
      }),
    });
    this.editor = new EditorView({
      parent: this.editorEl,
      state: this.createState(""),
    });
    for (const mode of actionOrder(DESK_MODES)) {
      const { icon, title } = modeLook(mode);
      const action = this.addAction(icon, t(title), () => {
        this.setMode(mode, "reader");
      });
      action.addClass("gedcom-mode-action");
      action.setAttribute("data-tooltip-position", "bottom");
      this.modeActions.set(mode, action);
    }
    this.renderMode();
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
    this.revision += 1;
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
      this.language.update(this.editor.state.doc);
    } finally {
      this.applyingData = false;
    }
    this.modes.loaded = true;
    this.host.statusChanged(this);
    this.dropGoneSelection();
    this.drawViews();
    this.host.genealogyChanged(this);
  }

  clear(): void {
    this.revision += 1;
    this.modes.loaded = false;
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

  getState(): Record<string, unknown> {
    return {
      ...super.getState(),
      mode: this.modes.mode,
      ...(this.modes.selected === null ? {} : { selected: this.modes.selected }),
      ...this.memory,
      ...this.views.memory(),
    };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const desk = readDeskState(state);
    const file = (state as { file?: unknown } | null)?.file;
    const sameFile = file === undefined || file === this.file?.path;
    if (!sameFile) {
      this.modes.fileChanged(
        initialMode(desk.mode, this.host.lastMode(), this.settings.genealogyInterface),
      );
      this.views.reset();
      this.memory = {};
    }
    this.memory = {
      ...this.memory,
      ...(desk.graph ? { graph: desk.graph } : {}),
      ...(desk.timeline ? { timeline: desk.timeline } : {}),
      ...(desk.list ? { list: desk.list } : {}),
    };
    const restored = this.modes.applyState(desk).selectionChanged;
    await super.setState(state, result);
    if (restored && this.modes.loaded) {
      this.dropGoneSelection();
    }
    this.renderMode();
    this.host.genealogyChanged(this);
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
    const before = this.modes.shown;
    const interfaceChanged =
      settings.genealogyInterface !== this.settings.genealogyInterface;
    this.settings = settings;
    this.refresh();
    if (interfaceChanged) {
      if (this.modes.interfaceChanged(settings.genealogyInterface).selectionCleared) {
        this.clearViewSelections();
      }
      this.renderMode();
    }
    if (this.modes.shown !== before) {
      this.host.genealogyChanged(this);
    }
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
    return this.recordsMemo.get(this.revision, () =>
      recordEntries(this.language.update(this.editor.state.doc).getDocumentSymbols()),
    );
  }

  recordAtCursor(): GedcomRecord | undefined {
    const mode = this.modes.shown;
    if (mode === "source") {
      return this.sourceRecordAtCursor();
    }
    const xref = this.modes.recordAtCursorFor(mode, undefined);
    return xref === undefined ? undefined : this.records().find((entry) => entry.identifier === xref);
  }

  inSource(): boolean {
    return this.modes.shown === "source";
  }

  inView(): boolean {
    return this.modes.inView();
  }

  mode(): DeskMode {
    return this.modes.shown;
  }

  showMode(mode: DeskMode): void {
    this.setMode(mode, "reader");
  }

  genealogyInterface(): boolean {
    return this.settings.genealogyInterface;
  }

  toggleMode(): void {
    this.setMode(this.modes.toggleTarget(), "reader");
  }

  private moveCursorToShown(): void {
    const record = this.modes.shownRecord();
    if (record === null) {
      return;
    }
    const range = shownRange(this.genealogy(), record);
    const { doc, selection } = this.editor.state;
    const line = doc.lineAt(selection.main.head).number - 1;
    if (!range || cursorInside(range, { line, character: 0 })) {
      return;
    }
    this.placeCursor(positionToOffset(doc, range.start), true);
  }

  private placeCursor(anchor: number, focus: boolean): void {
    this.editor.dispatch({
      selection: { anchor },
      effects: EditorView.scrollIntoView(anchor, { y: "center" }),
    });
    if (focus) {
      this.editor.focus();
    }
  }

  /** One reading of the text this tab holds now, typed but unsaved included. */
  genealogy(): GenealogyIndex {
    return this.genealogyCache.at(
      documentRef(this.file?.path ?? ""),
      String(this.revision),
      () => this.language.update(this.editor.state.doc),
    );
  }

  filePath(): string | null {
    return this.file?.path ?? null;
  }

  index(): GenealogyIndex {
    return this.genealogy();
  }

  selection(): { record: string | null } {
    return { record: this.modes.shownRecord() };
  }

  shownRecord(): string | null {
    return this.modes.shownRecord();
  }

  /** The only way a record is selected: `origin` says where the gesture came from, and with it what the views, the editor and the card do. */
  selectRecord(xref: string, origin: Origin): boolean {
    if (!this.modes.select(xref, this.genealogy())) {
      return false;
    }
    this.followCursor.selected(origin);
    const rules = originRules(origin, Platform.isMobile);
    this.markInViews(rules.revealsView, origin === "card");
    if (this.modes.shown === "source" && rules.cursorToRecord) {
      const start = shownRange(this.genealogy(), xref)?.start;
      if (start) {
        this.placeCursor(positionToOffset(this.editor.state.doc, start), rules.editorFocus);
      }
    }
    this.app.workspace.requestSaveLayout();
    this.host.genealogyChanged(this);
    if (rules.placesCard) {
      this.host.cardWanted(this, origin);
    }
    return true;
  }

  select(xref: string): void {
    this.selectRecord(xref, "card");
  }

  openFile(path: string): void {
    this.openVaultFile(path);
  }

  showInSource(range: Range): void {
    this.setMode("source");
    const { doc } = this.editor.state;
    const from = positionToOffset(doc, range.start);
    const to = positionToOffset(doc, range.end);
    this.editor.dispatch({
      selection: { anchor: from, head: to },
      effects: EditorView.scrollIntoView(from, { y: "center" }),
    });
    this.editor.focus();
  }

  goToXref(xref: string): boolean {
    return this.goTo(xref);
  }

  goToRecord(record: GedcomRecord): void {
    this.goTo(record);
  }

  private goTo(target: RecordTarget): boolean {
    const route = routeRecord(
      this.genealogy(),
      target,
      (wanted) => this.records().find((entry) => entry.identifier === wanted)?.start,
      this.settings.genealogyInterface,
    );
    if (route.to === "select") {
      return this.selectRecord(route.id, "link");
    }
    if (route.to === "nowhere") {
      return false;
    }
    if (this.modes.shown !== "source") {
      this.setMode("source");
    }
    this.placeCursor(positionToOffset(this.editor.state.doc, route.at), true);
    return true;
  }

  private has(xref: string): boolean {
    return followsCursor(this.genealogy(), xref);
  }

  private markInViews(reveal: boolean, fromCard = false): void {
    const selected = this.modes.shownRecord();
    const person = selected !== null && this.genealogy().person(selected) ? selected : null;
    this.views.select("graph", person, reveal);
    this.views.select("timeline", person, reveal);
    this.views.select("list", listSelection(this.genealogy(), selected), reveal, fromCard);
  }

  followMove(move: Move, documentPath: string): Outcome {
    const { edit, stranded } = planMove(
      this.language.update(this.editor.state.doc),
      documentPath,
      move,
      this.language.getVersion(),
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

  /**
   * The name Obsidian's own editor:open-search looks for: it dispatches by duck
   * type on this method rather than on a class, which is how Mod+F reaches a
   * GEDCOM view without a hotkey of ours claiming the key app-wide.
   */
  showSearch(replace = false): void {
    const mode = this.modes.shown;
    if (mode === "source") {
      openSearch(this.editor, replace);
    } else if (isViewMode(mode) && !replace) {
      this.drawViews();
      this.views.openSearch(mode);
    }
  }

  canBranchSelected(): boolean {
    return this.views.canBranchSelected();
  }

  branchSelected(): void {
    this.views.branchSelected();
  }

  canRenameReference(): boolean {
    return canRenameReference(this.editor.state, this.language);
  }

  renameReference(newName: string): boolean {
    return renameReference(this.editor, this.language, newName);
  }

  applyWorkspaceEdit(edit: WorkspaceEdit): boolean {
    this.language.update(this.editor.state.doc);
    return applyWorkspaceEdit(this.editor, inLineBreak(edit, this.editor.state.lineBreak), this.language.getVersion());
  }

  onClose(): Promise<void> {
    this.announceEdit.cancel();
    this.followCursor.cancel();
    this.views.dispose();
    this.editor.destroy();
    return Promise.resolve();
  }

  private pushScope(bindings: SearchKeyBinding[]): () => void {
    return pushSearchScope(bindings, {
      createScope: () => new Scope(this.app.scope),
      push: (scope) => this.app.keymap.pushScope(scope),
      pop: (scope) => this.app.keymap.popScope(scope),
      isActive: () => this.app.workspace.getActiveViewOfType(GedcomView) === this,
      onActiveChange: (callback) => this.app.workspace.on("active-leaf-change", callback),
      offActiveChange: (ref) => this.app.workspace.offref(ref),
    });
  }

  private sourceRecordAtCursor(): GedcomRecord | undefined {
    const { doc, selection } = this.editor.state;
    return recordAtLine(this.records(), doc.lineAt(selection.main.head).number - 1);
  }

  private setMode(mode: DeskMode, source: ModeSource = "program"): void {
    if (this.settings.genealogyInterface) {
      this.host.modeChosen(rememberedMode(this.host.lastMode(), mode, source));
    }
    const change = this.modes.setMode(mode, {
      cursorRecord:
        this.modes.mode === "source" ? this.sourceRecordAtCursor()?.identifier : undefined,
      index: () => this.genealogy(),
    });
    if (!change.changed) {
      return;
    }
    this.followCursor.cancel();
    this.renderMode(true);
    if (change.moveCursor) {
      this.moveCursorToShown();
    }
    this.app.workspace.requestSaveLayout();
    this.host.genealogyChanged(this);
  }

  private renderMode(switched = false): void {
    const mode = this.modes.shown;
    for (const button of modeButtons(mode)) {
      const action = this.modeActions.get(button.mode);
      action?.toggle(this.settings.genealogyInterface);
      action?.toggleClass("gedcom-mode-active", button.active);
      action?.setAttribute("aria-pressed", String(button.active));
    }
    if (!isViewMode(mode)) {
      this.views.hide();
    }
    this.editorEl.toggle(mode === "source");
    this.viewsEl.toggle(isViewMode(mode));
    if (mode !== "source") {
      this.hidePreviews();
    }
    if (isViewMode(mode)) {
      this.handSelectionOver(mode, switched);
      this.drawViews();
    }
  }

  private drawViews(): void {
    const mode = this.modes.shown;
    if (!isViewMode(mode) || !this.modes.needsDraw(this.containerEl.isShown() && this.viewsEl.isShown())) {
      return;
    }
    this.views.show(mode, this.genealogy(), memoryToShow(this.views.memory(), this.memory), this.modes.selected ?? undefined);
  }

  onResize(): void {
    this.drawViews();
  }

  private handSelectionOver(mode: ViewKind, reveal: boolean): void {
    const selected = this.modes.shownRecord();
    const xref =
      mode === "list"
        ? listSelection(this.genealogy(), selected)
        : selected !== null && this.genealogy().person(selected)
          ? selected
          : null;
    this.views.select(mode, xref, reveal);
  }

  private clearViewSelections(): void {
    this.views.select("graph", null, false);
    this.views.select("timeline", null, false);
    this.views.select("list", null, false);
  }

  private dropGoneSelection(): void {
    if (this.modes.selected !== null && this.modes.textChanged(this.genealogy()).selectionCleared) {
      this.clearViewSelections();
    }
  }

  private cursorSettled(): void {
    const xref = this.sourceRecordAtCursor()?.identifier;
    if (
      xref &&
      shouldFollowCursor({
        interfaceOn: this.settings.genealogyInterface,
        mode: this.modes.shown,
        selected: this.modes.selected,
        atCursor: xref,
        hasCard: this.has(xref),
      })
    ) {
      this.selectRecord(xref, "cursor");
    }
  }

  private editsSettled(): void {
    this.dropGoneSelection();
    this.drawViews();
    this.host.genealogyChanged(this);
  }

  private service(): GedcomLanguageService {
    return this.language.update(this.editor.state.doc);
  }

  private readonly editTarget: EditTarget = {
    service: () => this.service(),
    apply: (edit) => this.applyWorkspaceEdit(edit),
  };

  private wrote(outcome: WriteOutcome): WriteOutcome {
    if (outcome.ok) {
      this.announceEdit.cancel();
    } else if (outcome.code === STALE) {
      new Notice(refusalText(outcome));
    }
    return outcome;
  }

  version(): number {
    this.service();
    return this.language.getVersion();
  }

  describes(at: Position): boolean {
    return describes(this.service(), at);
  }

  setValueAt(at: Position, input: StructureValueInput, version: number): WriteOutcome {
    return this.wrote(commit(this.editTarget, setValueAt(this.service(), at, version, input)));
  }

  addAt(parent: Position, tag: string, input: StructureInput, version: number): WriteOutcome {
    return this.wrote(commit(this.editTarget, addAt(this.service(), parent, version, tag, input)));
  }

  describeMoveAt(at: Position, version: number): MoveDescription | Refusal {
    const described = describeMoveAt(this.service(), at, version);
    if (!described.ok) {
      this.wrote(described);
    }
    return described;
  }

  moveAt(at: Position, target: MoveTarget, version: number): WriteOutcome {
    return this.wrote(commit(this.editTarget, moveAt(this.service(), at, version, target)));
  }

  removeAt(at: Position, nested: number, version: number, done: (outcome: WriteOutcome) => void): void {
    const remove = (): void => {
      done(this.wrote(commit(this.editTarget, removeAt(this.service(), at, version))));
    };
    if (nested === 0) {
      remove();
    } else {
      new ConfirmModal(this.app, plural("tree.removeNested", nested), t("tree.removeField"), remove).open();
    }
  }

  settle(): void {
    this.announceEdit.cancel();
    this.editsSettled();
  }

  removableAt(parent: Position, tag: string): boolean {
    return removableAt(this.service(), parent, tag);
  }

  pointerChoicesAt(parent: Position, tag: string): PointerCandidate[] {
    return pointerChoicesAt(this.service(), parent, tag);
  }

  pairedAt(parent: Position, tag: string): boolean {
    return pairedAt(this.service(), parent, tag);
  }

  choicesAt(at: Position): Choices | null {
    return choicesAt(this.service(), at);
  }

  proseAt(at: Position): boolean {
    return proseAt(this.service(), at);
  }

  holdsValueAt(at: Position): boolean {
    return holdsValueAt(this.service(), at);
  }

  addableAt(at: Position): StructureFieldDescription[] {
    return addableAt(this.service(), at);
  }

  requiredBeneath(field: StructureFieldDescription): StructureFieldDescription[] {
    return requiredBeneath(this.service(), field);
  }

  checkValue(at: Position, tag: string, input: StructureValueInput, replacing: boolean): Refusal | null {
    return checkValue(this.service(), at, tag, input, replacing);
  }

  mediaItem(at: Position): MediaItem | null {
    return mediaItemAt(
      this.language.update(this.editor.state.doc),
      at,
      this.file?.path ?? "",
      (path) => this.resolveVaultResource(path),
      this.host.remoteImages(),
    );
  }

  vaultFiles(): string[] {
    return this.app.vault.getFiles().map((file) => file.path);
  }

  vaultHas(path: string): boolean {
    return this.app.vault.getAbstractFileByPath(normalizePath(path)) !== null;
  }

  async copyIntoVault(path: string, data: ArrayBuffer): Promise<void> {
    const folder = path.slice(0, Math.max(0, path.lastIndexOf("/")));
    if (folder !== "" && !this.vaultHas(folder)) {
      await this.app.vault.createFolder(normalizePath(folder));
    }
    await this.app.vault.createBinary(normalizePath(path), data);
  }

  fileEditAt(at: FileAt, vaultPath: string, version: number, deviceType?: string): ReturnType<typeof mediaFileEdit> {
    return mediaFileEdit(this.service(), this.file?.path ?? "", at, vaultPath, version, deviceType);
  }

  writeFileAt(at: FileAt, vaultPath: string, version: number, deviceType?: string): WriteOutcome {
    return this.wrote(commit(this.editTarget, this.fileEditAt(at, vaultPath, version, deviceType)));
  }

  private resolveVaultResource(path: string): string | null {
    const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
    return file instanceof TFile ? this.app.vault.getResourcePath(file) : null;
  }

  private openVaultFile(relativePath: string): void {
    openVaultFile<TFile, WorkspaceLeaf>(relativePath, {
      normalize: normalizePath,
      find: (path) => {
        const file = this.app.vault.getAbstractFileByPath(path);
        return file instanceof TFile ? file : null;
      },
      leafShowing: (path) => this.leafShowing(path),
      reveal: (leaf) => {
        void this.app.workspace.revealLeaf(leaf);
      },
      openInTab: (file) => {
        void this.app.workspace.getLeaf("tab").openFile(file);
      },
      notFound: (path) => {
        new Notice(t("notice.vaultFileNotFound", { path }));
      },
    });
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
          dark: isDarkTheme(this.containerEl),
          gesture: previewGesture(this.settings.recordPreview, (event) =>
            Keymap.isModifier(event, "Mod"),
          ),
          mediaGesture: previewGesture(this.settings.mediaPreview, (event) =>
            Keymap.isModifier(event, "Mod"),
          ),
          modifierHeld: (event) => Keymap.isModifier(event, "Mod"),
          delay: hoverDelay(this.settings.recordPreview),
          mediaDelay: hoverDelay(this.settings.mediaPreview),
          panel: {
            setIcon,
            pushScope: (bindings) => this.pushScope(bindings),
            mac: Platform.isMacOS,
          },
          actions: {
            applyWorkspaceEdit: (edit) => this.applyWorkspaceEdit(edit),
            openDocumentLink: (link) => this.openDocumentLink(link),
          },
          showPreview: (preview, _view, event) =>
            this.showPreview(preview, event.target as HTMLElement),
          hidePreview: () => this.popovers.hideRecord(),
          showMedia: (media, _view, event) =>
            this.popovers.showMedia(media, event.target as HTMLElement),
          hideMedia: () => this.popovers.hideMedia(),
          mediaHolds: (node) => this.popovers.mediaHolds(node as Node),
        }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && !this.applyingData) {
            this.revision += 1;
            this.requestSave();
            this.announceEdit();
          }
          if (
            update.selectionSet &&
            this.settings.genealogyInterface &&
            update.transactions.some((transaction) => transaction.isUserEvent("select"))
          ) {
            this.followCursor.rested();
          }
          this.host.statusChanged(this);
        }),
      ],
    });
  }

  private showPreview(preview: RecordPreview, target: HTMLElement): void {
    this.popovers.showRecord(
      getRecordPreviewRuns(this.editor.state, this.language, preview),
      preview.truncated,
      target,
    );
  }

  /**
   * Both previews, wherever the state they were opened from is replaced rather
   * than edited: a `setState` reports no update, so the extension that would
   * have closed them never hears about it. The media one goes through its
   * session, which is keyed by the line and would otherwise answer the next
   * movement over that line with "keep".
   */
  private hidePreviews(): void {
    this.popovers.hideAll();
  }

  private leafShowing(path: string): WorkspaceLeaf | null {
    return leafShowingFile(path, (visit) =>
      this.app.workspace.iterateAllLeaves(visit),
    );
  }

  private openDocumentLink(link: DocumentLink): void {
    const routed = routeDocumentLink(
      link,
      this.file?.path ?? "",
      this.language.update(this.editor.state.doc).getDocument().getDialect(),
      {
        openExternal: (url) => {
          this.contentEl.ownerDocument.defaultView?.open(
            url,
            "_blank",
            "noopener,noreferrer",
          );
        },
        openVaultFile: (relativePath) => this.openVaultFile(relativePath),
      },
    );
    if (!routed) {
      new Notice(t("notice.unsafeFileLink"));
    }
  }
}
