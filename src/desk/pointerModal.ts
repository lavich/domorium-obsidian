import { FuzzySuggestModal, type App } from "obsidian";

import { t } from "../i18n";
import type { PointerChoice } from "./detail/tree";
import type { VaultFileChoice } from "./mediaFile";

export class PointerModal extends FuzzySuggestModal<PointerChoice> {
  constructor(
    app: App,
    private readonly choices: PointerChoice[],
    private readonly chosen: (xref: string) => void,
  ) {
    super(app);
  }

  getItems(): PointerChoice[] {
    return this.choices;
  }

  getItemText(item: PointerChoice): string {
    return `${item.checked ? "✓ " : ""}${item.title}`;
  }

  onChooseItem(item: PointerChoice): void {
    this.chosen(item.xref);
  }
}

export class VaultFileModal extends FuzzySuggestModal<VaultFileChoice> {
  constructor(
    app: App,
    private readonly choices: VaultFileChoice[],
    private readonly chosen: (path: string) => void,
  ) {
    super(app);
    this.setPlaceholder(t("media.vaultPlaceholder"));
  }

  getItems(): VaultFileChoice[] {
    return this.choices;
  }

  getItemText(item: VaultFileChoice): string {
    return `${item.checked ? "✓ " : ""}${item.path}`;
  }

  onChooseItem(item: VaultFileChoice): void {
    this.chosen(item.path);
  }
}
