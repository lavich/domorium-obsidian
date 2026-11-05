import { ItemView, setIcon, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import { t } from "../i18n";
import type { NoteHit } from "./noteLinks";
import { renderRecordCard } from "./recordCard";

export const RECORD_VIEW_TYPE = "domorium-record";

/** The GEDCOM tab the card follows: the one most recently active. */
export interface DeskViewsHost {
  followed(): GedcomView | null;
  notesFor(path: string, xref: string): Promise<NoteHit[]>;
  openNote(path: string, line: number): void;
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
