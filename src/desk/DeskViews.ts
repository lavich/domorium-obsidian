import { ItemView, Menu, setIcon, type WorkspaceLeaf } from "obsidian";

import type { GedcomView } from "../GedcomView";
import { t } from "../i18n";
import type { TreeSession } from "./detail/treeSession";
import { chooseDeviceFile } from "./deviceFile";
import { PointerModal, VaultFileModal } from "./pointerModal";
import { renderRecordCard } from "./recordCard";

export const RECORD_VIEW_TYPE = "domorium-record";

export interface DeskViewsHost {
  followed(): GedcomView | null;
  session(): TreeSession;
}

export class RecordCardView extends ItemView {
  private stale = false;
  private bar: HTMLElement | null = null;

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
    this.bar = this.containerEl.createDiv({ cls: ["gedcom-card-header", "nav-header"] });
    this.containerEl.prepend(this.bar);
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
      choosePointer: (choices, chosen) => {
        new PointerModal(this.app, choices, chosen).open();
      },
      chooseField: (at, fields) => {
        const menu = new Menu();
        for (const { title, icon, disabled, choose } of fields) {
          menu.addItem((item) => {
            item.setTitle(title).setDisabled(disabled).onClick(choose);
            if (icon !== undefined) {
              item.setIcon(icon);
            }
          });
        }
        menu.showAtPosition(at);
      },
      chooseValues: (at, values) => {
        const menu = new Menu();
        for (const { title, checked, toggle } of values) {
          menu.addItem((item) => item.setTitle(title).setChecked(checked).onClick(toggle));
        }
        menu.showAtPosition(at);
      },
      chooseVaultFile: (choices, chosen) => {
        new VaultFileModal(this.app, choices, chosen).open();
      },
      chooseDeviceFile: (chosen) => {
        chooseDeviceFile(this.contentEl.ownerDocument, chosen);
      },
      ...(this.bar ? { header: this.bar } : {}),
    });
  }
}
