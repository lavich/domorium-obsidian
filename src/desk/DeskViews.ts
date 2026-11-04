import { ItemView, Platform, setIcon, type ViewStateResult, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import type { GenealogyIndex } from "../genealogy";
import { GEDCOM_ICON_ID } from "../icon";
import { t } from "../i18n";
import { openFromIndex } from "./deskState";
import { INDEX_KINDS, IndexList, type IndexKind } from "./indexList";
import type { NoteHit } from "./noteLinks";
import { renderRecordCard } from "./recordCard";

export const INDEX_VIEW_TYPE = "domorium-index";
export const RECORD_VIEW_TYPE = "domorium-record";

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
        if (Platform.isMobile) {
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

  private drawn: { view: GedcomView; index: GenealogyIndex } | null = null;

  onClose(): Promise<void> {
    this.drawn = null;
    return Promise.resolve();
  }

  redraw(): void {
    const view = this.host.followed();
    if (!view?.file) {
      this.drawn = null;
      this.list?.show(null);
      return;
    }
    const index = view.genealogy();
    if (this.drawn?.view === view && this.drawn.index === index) {
      this.list?.setCurrent(view.shownRecord());
      return;
    }
    this.drawn = { view, index };
    this.list?.show({ index, current: view.shownRecord() });
  }
}

export class RecordCardView extends ItemView {
  private notes: { key: string; hits: NoteHit[] | null } | null = null;
  private stale = false;

  constructor(
    leaf: WorkspaceLeaf,
    private readonly host: DeskViewsHost,
  ) {
    super(leaf);
  }

  getViewType(): string {
    return RECORD_VIEW_TYPE;
  }

  getDisplayText(): string {
    return t("card.title");
  }

  getIcon(): string {
    return "users";
  }

  onOpen(): Promise<void> {
    this.contentEl.addClass("gedcom-record-view");
    this.redraw();
    return Promise.resolve();
  }

  onResize(): void {
    if (this.stale) {
      this.redraw();
    }
  }

  redraw(): void {
    if (!this.contentEl.isShown()) {
      this.stale = true;
      return;
    }
    this.stale = false;
    const view = this.host.followed();
    const record = view?.shownRecord() ?? null;
    const path = view?.file?.path;
    const key = record && path ? `${path}#${record}` : "";
    if (key && this.notes?.key !== key && path && record) {
      const asked = { key, hits: null as NoteHit[] | null };
      this.notes = asked;
      void this.host.notesFor(path, record).then((hits) => {
        if (this.notes === asked) {
          asked.hits = hits;
          this.redraw();
        }
      });
    }
    renderRecordCard(this.contentEl, view, this.notes?.key === key ? (this.notes?.hits ?? null) : null, {
      setIcon: (element, icon) => {
        setIcon(element, icon);
      },
      openNote: (notePath, line) => {
        this.host.openNote(notePath, line);
      },
    });
  }

  refreshNotes(): void {
    const asked = this.notes;
    const view = this.host.followed();
    const path = view?.file?.path;
    const record = view?.shownRecord();
    if (!asked || !path || !record) {
      return;
    }
    void this.host.notesFor(path, record).then((hits) => {
      if (this.notes === asked && JSON.stringify(hits) !== JSON.stringify(asked.hits)) {
        asked.hits = hits;
        this.redraw();
      }
    });
  }
}
