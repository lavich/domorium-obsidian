import { ItemView, Platform, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import { GEDCOM_ICON_ID } from "../icon";
import { t } from "../i18n";
import { openFromIndex } from "./deskState";
import { renderEvidence } from "./evidence";
import { IndexList } from "./indexList";

export const INDEX_VIEW_TYPE = "domorium-index";
export const EVIDENCE_VIEW_TYPE = "domorium-evidence";

/** The GEDCOM tab the sidebars follow: the one most recently active. */
export interface DeskViewsHost {
  followed(): GedcomView | null;
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

  redraw(): void {
    const view = this.host.followed();
    renderEvidence(this.contentEl, view?.deskSelection() ?? null, {
      openRecord: (xref) => view?.openRecord(xref),
      showInSource: (range) => view?.showInSource(range),
      wholeRecord: () => view?.selectFact(null),
    });
  }
}
