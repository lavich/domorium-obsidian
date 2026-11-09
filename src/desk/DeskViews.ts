import { ItemView, setIcon, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import { t } from "../i18n";
import type { TreeSession } from "./detail/treeSession";
import { renderRecordCard } from "./recordCard";

export const RECORD_VIEW_TYPE = "domorium-record";

export interface DeskViewsHost {
  followed(): GedcomView | null;
  session(): TreeSession;
}

export class RecordCardView extends ItemView {
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
    renderRecordCard(this.contentEl, view, {
      setIcon: (element, icon) => {
        setIcon(element, icon);
      },
      session: this.host.session(),
    });
  }
}
