import type { Range } from "@domorium/language-service";
import { ItemView, Platform, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import type { GenealogyIndex } from "../genealogy";
import { GEDCOM_ICON_ID } from "../icon";
import { t } from "../i18n";
import { openFromIndex } from "./deskState";
import { renderEvidence } from "./evidence";
import { fileTimelineOf } from "./fileTimeline";
import { FileTimelineBoard, readTimelineState, type TimelineScope, type TimelineState } from "./fileTimelineView";
import { INDEX_KINDS, IndexList, type IndexKind } from "./indexList";
import type { NoteHit } from "./noteLinks";

export const INDEX_VIEW_TYPE = "domorium-index";
export const EVIDENCE_VIEW_TYPE = "domorium-evidence";
export const FILE_TIMELINE_VIEW_TYPE = "domorium-file-timeline";
export const FILE_TIMELINE_ICON = "calendar-range";

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

/** A timeline is bound to its own file, which no tab need be showing. */
export interface FileTimelineViewHost {
  /** Null where the vault holds no such file. */
  timelineIndex(path: string): Promise<GenealogyIndex | null>;
  openPersonIn(path: string, xref: string): Promise<void>;
  showSourceIn(path: string, range: Range): Promise<void>;
  timelineClosed(path: string, view: FileTimelineView): void;
}

const fileName = (path: string): string => path.split("/").pop() ?? path;

export class FileTimelineView extends ItemView {
  navigation = false;
  private state: TimelineState = readTimelineState(null);
  private board: FileTimelineBoard | null = null;
  private stale = true;
  private asked = 0;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: FileTimelineViewHost,
  ) {
    super(leaf);
  }

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

  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const before = this.state.gedcom;
    this.state = readTimelineState(state);
    if (before !== null && before !== this.state.gedcom) {
      this.host.timelineClosed(before, this);
    }
    this.stale = true;
    await super.setState(state, result);
    await this.refresh();
  }

  onOpen(): Promise<void> {
    this.contentEl.empty();
    this.board = new FileTimelineBoard(this.contentEl, {
      openPerson: (xref) => {
        if (this.state.gedcom) {
          void this.host.openPersonIn(this.state.gedcom, xref);
        }
      },
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
    return this.refresh();
  }

  onClose(): Promise<void> {
    if (this.state.gedcom) {
      this.host.timelineClosed(this.state.gedcom, this);
    }
    return Promise.resolve();
  }

  onResize(): void {
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

  private async refresh(): Promise<void> {
    const path = this.state.gedcom;
    const board = this.board;
    if (!path || !board || !this.containerEl.isShown()) {
      return;
    }
    this.stale = false;
    const asked = (this.asked += 1);
    const index = await this.host.timelineIndex(path);
    if (asked !== this.asked) {
      return;
    }
    if (!index) {
      board.showGone(path);
      return;
    }
    board.show(fileTimelineOf(index), fileName(path), this.state);
  }
}
