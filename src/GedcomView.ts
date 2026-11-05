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
import { mediaItemAt, mediaItemsOf, mediaVaultOf, portraitOf } from "./editor/mediaItems";
import { PreviewPopovers } from "./editor/previewPopovers";
import { pushSearchScope } from "./editor/searchScope";
import { openVaultFile } from "./editor/vaultFile";
import { clearMediaPreview } from "./editor/mediaPreviewHover";
import type { AllowScope } from "./editor/mediaPreviewView";
import { hoverDelay, previewGesture } from "./editor/previewGesture";
import { carryCursor } from "./editor/reload";
import { recordEntries, type GedcomRecord } from "./editor/records";
import { currentLanguage, t } from "./i18n";
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
  pageKind,
  readDeskState,
  shownRange,
  routeLink,
  type DeskMode,
  type Origin,
  type ViewKind,
} from "./desk/deskState";
import { fileMapOf, groupByPlace, mapSelection } from "./desk/fileMap";
import type { TableState } from "./desk/fileMapView";
import { collatorFor, listSelection } from "./desk/listRows";
import { tileTemplate } from "./desk/mapProjection";
import { NO_TABLE, parsePlacesTable, placesTablePath, placesTableText } from "./desk/placesTable";
import { FileViews, memoryToShow, type ViewMemory } from "./desk/fileViews";
import { originRules, TabModes } from "./desk/tabModes";
import type { MediaItem } from "./desk/media";
import type { FactKey } from "./desk/personPage";
import type { CardTab } from "./desk/recordCard";
import { RecordHistory } from "./desk/recordHistory";
import { CursorFollow, shouldFollowCursor } from "./desk/followRules";
import { RevisionMemo } from "./editor/revisionMemo";
import { documentRef, type GenealogyIndex } from "./genealogy";
import type { Position } from "@domorium/language-service";
import { IndexCache } from "./genealogy/cache";
import { leafShowingFile } from "./vault/openTabs";
import { recordAtLine, xrefFromSubpath } from "./vault/protocolLink";
import { type Move, type Outcome, planMove } from "./vault/movedFiles";
import type { GedcomStatus } from "./editor/status";
import { GEDCOM_ICON_ID } from "./icon";
import type { PortraitContent } from "./desk/graphCanvas";

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
  readPlacesTable(path: string): Promise<string | null>;
  createPlacesTable(path: string, text: string): Promise<"created" | "exists">;
  openPlacesTable(path: string): Promise<void>;
  appendPlaces(path: string, names: string[]): Promise<void>;
}

export class GedcomView extends TextFileView implements CardTab {
  private editor: EditorView;
  private readonly language = new EditorLanguageService();
  private applyingData = false;
  private readonly popovers: PreviewPopovers;
  private readonly modes: TabModes;
  private readonly views: FileViews;
  private memory: ViewMemory = {};
  private placesTable: TableState = { status: "unread" };
  private placesLoadedFor: string | null = null;
  private selectedFact: FactKey | null = null;
  private readonly recordHistory = new RecordHistory();
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
      portrait: (xref) => this.portrait(xref),
      changed: () => {
        this.memory = { ...this.memory, ...this.views.memory() };
        this.app.workspace.requestSaveLayout();
      },
      setIcon: (element, icon) => setIcon(element, icon),
      coarsePointer: () => Platform.isMobile || window.matchMedia("(pointer: coarse)").matches,
      places: () => this.placesTable,
      placesAction: () => void this.placesAction(),
      addMissingPlaces: (names) => void this.addMissingPlaces(names),
      tiles: () => {
        const template = tileTemplate(this.settings.tileUrl);
        return {
          enabled: this.settings.mapTiles,
          template,
          invalid: this.settings.tileUrl.trim() !== "" && template === null,
          attribution: this.settings.tileAttribution,
        };
      },
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
      this.language.update(data);
    } finally {
      this.applyingData = false;
    }
    this.modes.loaded = true;
    this.host.statusChanged(this);
    this.dropGoneSelection();
    this.seedHistory();
    this.drawViews();
    this.host.genealogyChanged(this);
  }

  clear(): void {
    this.revision += 1;
    this.modes.loaded = false;
    this.selectedFact = null;
    this.recordHistory.reset();
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
      this.selectedFact = null;
      this.recordHistory.reset();
    }
    this.memory = {
      ...this.memory,
      ...(desk.graph ? { graph: desk.graph } : {}),
      ...(desk.timeline ? { timeline: desk.timeline } : {}),
      ...(desk.list ? { list: desk.list } : {}),
      ...(desk.map ? { map: desk.map } : {}),
    };
    const restored = this.modes.applyState(desk).selectionChanged;
    if (restored) {
      this.selectedFact = null;
    }
    await super.setState(state, result);
    if (restored && this.modes.loaded) {
      this.dropGoneSelection();
      const selected = this.modes.shownRecord();
      if (selected !== null) {
        this.recordHistory.visit(selected);
      }
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
    this.views.refreshTiles();
    if (interfaceChanged) {
      if (this.modes.interfaceChanged(settings.genealogyInterface).selectionCleared) {
        this.selectedFact = null;
        this.recordHistory.reset();
        this.clearViewSelections();
      }
      this.seedHistory();
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
    const range = shownRange(this.genealogy(), record, this.selectedFact);
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

  selection(): { record: string | null; fact: FactKey | null } {
    return { record: this.modes.shownRecord(), fact: this.selectedFact };
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
    this.selectedFact = null;
    if (rules.addsStep === "visit") {
      this.recordHistory.visit(xref);
    } else if (rules.addsStep === "follow") {
      this.recordHistory.follow(xref);
    }
    this.markInViews(rules.revealsView);
    if (this.modes.shown === "source" && rules.cursorToRecord) {
      const record = this.records().find((entry) => entry.identifier === xref);
      if (record) {
        this.placeCursor(positionToOffset(this.editor.state.doc, record.start), rules.editorFocus);
      }
    }
    this.app.workspace.requestSaveLayout();
    this.host.genealogyChanged(this);
    if (rules.placesCard) {
      this.host.cardWanted(this, origin);
    }
    return true;
  }

  history(): { canBack: boolean; canForward: boolean } {
    const exists = (xref: string): boolean => this.has(xref);
    return { canBack: this.recordHistory.canBack(exists), canForward: this.recordHistory.canForward(exists) };
  }

  select(xref: string): void {
    this.selectRecord(xref, "card");
  }

  selectFact(fact: FactKey | null): void {
    this.selectedFact = fact;
    this.host.genealogyChanged(this);
  }

  back(): void {
    this.stepHistory(this.recordHistory.back((xref) => this.has(xref)));
  }

  forward(): void {
    this.stepHistory(this.recordHistory.forward((xref) => this.has(xref)));
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
    if (this.settings.genealogyInterface && pageKind(this.genealogy(), xref)) {
      return this.selectRecord(xref, "link");
    }
    if (this.modes.shown !== "source") {
      const route = routeLink(this.genealogy(), xref, (wanted) =>
        this.records().some((entry) => entry.identifier === wanted),
      );
      if (route.to === "nowhere") {
        return false;
      }
      this.setMode("source");
    }
    const record = this.records().find((entry) => entry.identifier === xref);
    if (!record) {
      return false;
    }
    this.goToRecord(record);
    return true;
  }

  goToRecord(record: GedcomRecord): void {
    if (record.identifier && this.settings.genealogyInterface && pageKind(this.genealogy(), record.identifier)) {
      this.selectRecord(record.identifier, "link");
      return;
    }
    if (this.modes.shown !== "source") {
      this.setMode("source");
    }
    this.placeCursor(positionToOffset(this.editor.state.doc, record.start), true);
  }

  private has(xref: string): boolean {
    return pageKind(this.genealogy(), xref) !== null;
  }

  private stepHistory(xref: string | null): void {
    if (xref !== null) {
      this.selectRecord(xref, "history");
    }
  }

  private markInViews(reveal: boolean): void {
    const selected = this.modes.shownRecord();
    const person = selected !== null && this.genealogy().person(selected) ? selected : null;
    this.views.select("graph", person, reveal);
    this.views.select("timeline", person, reveal);
    this.views.select("list", listSelection(this.genealogy(), selected), reveal);
    this.views.select("map", mapSelection(this.genealogy(), selected), reveal);
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
    const selected = this.modes.shownRecord();
    if (change.selectionChanged && selected !== null) {
      this.selectedFact = null;
      this.recordHistory.follow(selected);
    }
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
      if (mode === "map") {
        this.loadPlacesTable();
      }
      this.drawViews();
    }
  }

  private tablePath(): string | null {
    return this.file === null ? null : placesTablePath(this.file.path);
  }

  private loadPlacesTable(): void {
    const path = this.tablePath();
    if (path === null) {
      this.placesTable = { status: "absent" };
      this.placesLoadedFor = null;
      return;
    }
    if (this.placesTable.status !== "unread" && this.placesLoadedFor === path) {
      return;
    }
    this.placesLoadedFor = path;
    void this.host.readPlacesTable(path).then((text) => {
      if (this.tablePath() !== path) {
        return;
      }
      this.placesTable = text === null ? { status: "absent" } : { status: "read", table: parsePlacesTable(text) };
      this.views.refreshPlaces();
      if (this.modes.shown === "map") {
        this.drawViews();
      }
    });
  }

  placesFileTouched(path: string, oldPath?: string): void {
    const table = this.tablePath();
    if (table === null || (path !== table && oldPath !== table && this.placesLoadedFor === table)) {
      return;
    }
    this.placesTable = { status: "unread" };
    if (this.modes.shown === "map") {
      this.loadPlacesTable();
    }
  }

  private async placesAction(): Promise<void> {
    const path = this.tablePath();
    if (path === null) {
      return;
    }
    if (this.placesTable.status !== "read") {
      const map = fileMapOf(this.genealogy(), NO_TABLE);
      const names = groupByPlace(map, map.events)
        .filter((group) => group.place.coordinates === undefined)
        .map((group) => group.place.name);
      const note = t("map.table.note", { file: this.file?.name ?? "" });
      await this.host.createPlacesTable(path, placesTableText(names, collatorFor(currentLanguage()), note));
    }
    await this.host.openPlacesTable(path);
  }

  private async addMissingPlaces(names: string[]): Promise<void> {
    const path = this.tablePath();
    if (path !== null && names.length > 0) {
      await this.host.appendPlaces(path, names);
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
        : mode === "map"
          ? mapSelection(this.genealogy(), selected)
          : selected !== null && this.genealogy().person(selected)
            ? selected
            : null;
    this.views.select(mode, xref, reveal);
  }

  private clearViewSelections(): void {
    this.views.select("graph", null, false);
    this.views.select("timeline", null, false);
    this.views.select("list", null, false);
    this.views.select("map", null, false);
  }

  private dropGoneSelection(): void {
    if (this.modes.selected !== null && this.modes.textChanged(this.genealogy()).selectionCleared) {
      this.selectedFact = null;
      this.clearViewSelections();
    }
  }

  private seedHistory(): void {
    const selected = this.modes.shownRecord();
    if (selected !== null && this.recordHistory.current() === null) {
      this.recordHistory.visit(selected);
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

  /** The picture a person's page shows, for a card: the first of their media that can be drawn. */
  portrait(xref: string): PortraitContent | null {
    const person = this.genealogy().person(xref);
    return person ? portraitOf(this.mediaItems(person.media)) : null;
  }

  mediaItems(media: { at: Position; record?: string }[]): MediaItem[] {
    return mediaItemsOf(media, (at) => this.mediaItem(at));
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
