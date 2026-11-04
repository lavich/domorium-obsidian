import type { Range } from "@domorium/language-service";
import { ItemView, Platform, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import type { GenealogyIndex } from "../genealogy";
import { FILE_GRAPH_ICON, FILE_TIMELINE_ICON, GEDCOM_ICON_ID } from "../icon";
import { t } from "../i18n";
import { openFromIndex } from "./deskState";
import { renderEvidence } from "./evidence";
import { fileTimelineOf } from "./fileTimeline";
import { FileGraphBoard, readGraphState, type GraphState } from "./fileGraphView";
import type { PortraitContent } from "./graphCanvas";
import { FileTimelineBoard, readTimelineState, type TimelineScope, type TimelineState } from "./fileTimelineView";
import { INDEX_KINDS, IndexList, type IndexKind } from "./indexList";
import type { NoteHit } from "./noteLinks";

export const INDEX_VIEW_TYPE = "domorium-index";
export const EVIDENCE_VIEW_TYPE = "domorium-evidence";
export const FILE_TIMELINE_VIEW_TYPE = "domorium-file-timeline";
export const FILE_GRAPH_VIEW_TYPE = "domorium-file-graph";
export const OVERVIEW_VIEW_TYPES = [FILE_TIMELINE_VIEW_TYPE, FILE_GRAPH_VIEW_TYPE] as const;

/** The GEDCOM tab the sidebars follow: the one most recently active. */
export interface DeskViewsHost {
  followed(): GedcomView | null;
  notesFor(path: string, xref: string): Promise<NoteHit[]>;
  openNote(path: string, line: number): void;
}

export class IndexView extends ItemView {
  private list: IndexList | null = null;
  private kind: IndexKind = "people";

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: DeskViewsHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return INDEX_VIEW_TYPE;
  }

  getDisplayText(): string {
    return "Domorium";
  }

  getIcon(): string {
    return GEDCOM_ICON_ID;
  }

  getState(): Record<string, unknown> {
    return { ...super.getState(), kind: this.kind };
  }

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const kind = (state as { kind?: unknown } | null)?.kind;
    if (INDEX_KINDS.includes(kind as IndexKind)) {
      this.kind = kind as IndexKind;
      this.list?.showKind(this.kind);
    }
    await super.setState(state, result);
  }

  onOpen(): Promise<void> {
    this.list = new IndexList(this.contentEl, {
      open: (xref) => {
        const view = this.host.followed();
        if (view) {
          openFromIndex(view, xref);
        }
        if (Platform.isPhone) {
          this.app.workspace.leftSplit.collapse();
        }
      },
      kindChanged: (kind) => {
        this.kind = kind;
        this.app.workspace.requestSaveLayout();
      },
    });
    this.list.showKind(this.kind);
    this.redraw();
    return Promise.resolve();
  }

  redraw(): void {
    const view = this.host.followed();
    this.list?.show(
      view?.file
        ? { index: view.genealogy(), current: view.shownRecord() }
        : null,
    );
  }
}

export class EvidenceView extends ItemView {
  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: DeskViewsHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return EVIDENCE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("evidence.title");
  }

  getIcon(): string {
    return "file-check";
  }

  onOpen(): Promise<void> {
    this.redraw();
    return Promise.resolve();
  }

  private notes: { key: string; hits: NoteHit[] | null } | null = null;

  redraw(): void {
    const view = this.host.followed();
    const selection = view?.deskSelection() ?? null;
    const path = view?.file?.path;
    const key = selection && path ? `${path}#${selection.record}` : "";
    if (key && this.notes?.key !== key && selection && path) {
      const asked = { key, hits: null as NoteHit[] | null };
      this.notes = asked;
      void this.host.notesFor(path, selection.record).then((hits) => {
        if (this.notes === asked) {
          asked.hits = hits;
          this.redraw();
        }
      });
    }
    renderEvidence(
      this.contentEl,
      selection ? { ...selection, notes: this.notes?.key === key ? this.notes.hits : null } : null,
      {
        openRecord: (xref) => view?.openRecord(xref),
        showInSource: (range) => view?.showInSource(range),
        wholeRecord: () => view?.selectFact(null),
        openNote: (notePath, line) => this.host.openNote(notePath, line),
      },
    );
  }

  forgetNotes(): void {
    this.notes = null;
  }
}

/** An overview is bound to its own file, which no tab need be showing. */
export interface FileOverviewHost {
  /** Null where the vault holds no such file. */
  overviewIndex(path: string): Promise<GenealogyIndex | null>;
  /** A person or a family, shown in the file's tab. */
  openRecordIn(path: string, xref: string): Promise<void>;
  showSourceIn(path: string, range: Range): Promise<void>;
  overviewClosed(path: string, view: FileOverviewView): void;
  /** The picture a person's page in the file shows, where it can be shown. */
  portraitIn(path: string, xref: string): PortraitContent | null;
}

interface OverviewBoard {
  showGone(path: string): void;
  resized(): void;
  cancelHover(): void;
}

const fileName = (path: string): string => path.split("/").pop() ?? path;

/**
 * What the timeline and the graph of a file share: the file in `state.gedcom`
 * rather than `file`, so it is never taken for a tab of that file; reading it
 * only while in sight; and ignoring an answer that comes after it closed.
 */
export abstract class FileOverviewView extends ItemView {
  navigation = false;
  private board: OverviewBoard | null = null;
  private stale = true;
  private asked = 0;

  constructor(
    leaf: WorkspaceLeaf,
    protected readonly host: FileOverviewHost,
  ) {
    super(leaf);
  }

  abstract gedcom(): string | null;

  protected abstract readState(state: unknown): void;

  protected abstract createBoard(parent: HTMLElement): OverviewBoard;

  protected abstract present(index: GenealogyIndex): void;

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const before = this.gedcom();
    this.readState(state);
    if (before !== null && before !== this.gedcom()) {
      this.host.overviewClosed(before, this);
    }
    this.stale = true;
    await super.setState(state, result);
    await this.refresh();
  }

  onOpen(): Promise<void> {
    this.contentEl.empty();
    this.board = this.createBoard(this.contentEl);
    return this.refresh();
  }

  onClose(): Promise<void> {
    this.asked += 1;
    this.board?.cancelHover();
    this.board = null;
    const path = this.gedcom();
    if (path) {
      this.host.overviewClosed(path, this);
    }
    return Promise.resolve();
  }

  /** Called as the tab is brought forward, which is when an overview that went stale out of sight catches up. */
  onResize(): void {
    this.refreshIfStale();
    this.board?.resized();
  }

  /** Read again now if it is in sight, else as soon as it is. */
  markStale(): void {
    this.stale = true;
    this.refreshIfStale();
  }

  refreshIfStale(): void {
    if (this.stale && this.containerEl.isShown()) {
      void this.refresh();
    }
  }

  protected openRecord(xref: string): void {
    const path = this.gedcom();
    if (path) {
      void this.host.openRecordIn(path, xref);
    }
  }

  private async refresh(): Promise<void> {
    const path = this.gedcom();
    const board = this.board;
    if (!path || !board || !this.containerEl.isShown()) {
      return;
    }
    this.stale = false;
    const asked = (this.asked += 1);
    const index = await this.host.overviewIndex(path);
    if (asked !== this.asked) {
      return;
    }
    if (!index) {
      board.showGone(path);
      return;
    }
    this.present(index);
  }
}

export class FileTimelineView extends FileOverviewView {
  private state: TimelineState = readTimelineState(null);
  private timeline: FileTimelineBoard | null = null;

  getViewType(): string {
    return FILE_TIMELINE_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.state.gedcom
      ? t("fileTimeline.title", { name: fileName(this.state.gedcom) })
      : t("fileTimeline.name");
  }

  getIcon(): string {
    return FILE_TIMELINE_ICON;
  }

  gedcom(): string | null {
    return this.state.gedcom;
  }

  getState(): Record<string, unknown> {
    const { gedcom, ...scope } = this.state;
    return { ...super.getState(), ...(gedcom === null ? {} : { gedcom }), ...scope };
  }

  protected readState(state: unknown): void {
    this.state = readTimelineState(state);
  }

  protected createBoard(parent: HTMLElement): FileTimelineBoard {
    this.timeline = new FileTimelineBoard(parent, {
      openPerson: (xref) => this.openRecord(xref),
      showInSource: (range) => {
        if (this.state.gedcom) {
          void this.host.showSourceIn(this.state.gedcom, range);
        }
      },
      scopeChanged: (scope: TimelineScope) => {
        this.state = { gedcom: this.state.gedcom, ...scope };
        this.app.workspace.requestSaveLayout();
      },
      setIcon,
    });
    return this.timeline;
  }

  protected present(index: GenealogyIndex): void {
    this.timeline?.show(fileTimelineOf(index), this.state);
  }
}

export class FileGraphView extends FileOverviewView {
  private state: GraphState = readGraphState(null);
  private graph: FileGraphBoard | null = null;

  getViewType(): string {
    return FILE_GRAPH_VIEW_TYPE;
  }

  getDisplayText(): string {
    return this.state.gedcom ? t("fileGraph.title", { name: fileName(this.state.gedcom) }) : t("fileGraph.name");
  }

  getIcon(): string {
    return FILE_GRAPH_ICON;
  }

  gedcom(): string | null {
    return this.state.gedcom;
  }

  getState(): Record<string, unknown> {
    const { gedcom, ...rest } = this.state;
    return { ...super.getState(), ...(gedcom === null ? {} : { gedcom }), ...rest };
  }

  protected readState(state: unknown): void {
    this.state = readGraphState(state);
  }

  protected createBoard(parent: HTMLElement): FileGraphBoard {
    this.graph = new FileGraphBoard(parent, {
      openRecord: (xref) => this.openRecord(xref),
      portrait: (xref) => (this.state.gedcom ? this.host.portraitIn(this.state.gedcom, xref) : null),
      stateChanged: ({ scope, view }) => {
        const { gedcom, around } = this.state;
        const kept = view ?? this.state.view;
        this.state = { gedcom, ...(around === undefined ? {} : { around }), ...scope, ...(kept ? { view: kept } : {}) };
        this.app.workspace.requestSaveLayout();
      },
      setIcon,
    });
    return this.graph;
  }

  protected present(index: GenealogyIndex): void {
    const board = this.graph;
    if (!board) {
      return;
    }
    const { focus, up, down, around, view } = this.state;
    board.show(fileTimelineOf(index), {
      scope: { ...(focus === undefined ? {} : { focus }), up, down },
      ...(around === undefined ? {} : { around }),
      ...(view === undefined ? {} : { view }),
    });
    board.resized();
  }
}
