import { ItemView, Platform, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import { GEDCOM_ICON_ID } from "../icon";
import { t } from "../i18n";
import { openFromIndex } from "./deskState";
import { renderEvidence } from "./evidence";
import { IndexList } from "./indexList";
import type { NoteHit } from "./noteLinks";

export const INDEX_VIEW_TYPE = "domorium-index";
export const EVIDENCE_VIEW_TYPE = "domorium-evidence";

/** The GEDCOM tab the sidebars follow: the one most recently active. */
export interface DeskViewsHost {
  followed(): GedcomView | null;
  notesFor(path: string, xref: string): Promise<NoteHit[]>;
  openNote(path: string, line: number): void;
}

export class IndexView extends ItemView {
  private list: IndexList | null = null;

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
    });
    this.redraw();
    return Promise.resolve();
  }

  redraw(): void {
    const view = this.host.followed();
    this.list?.show(
      view?.file
        ? {
            name: view.file.name,
            index: view.genealogy(),
            version: view.getStatus().version?.version ?? "?",
            current: view.shownRecord(),
          }
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

  /** The notes are read again the next time the panel is drawn for this record. */
  forgetNotes(): void {
    this.notes = null;
  }
}
