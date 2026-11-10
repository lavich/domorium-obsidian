import { FuzzySuggestModal, type App } from "obsidian";

import type { PointerChoice } from "./detail/tree";

export class PointerModal extends FuzzySuggestModal<PointerChoice> {
  constructor(
    app: App,
    private readonly choices: PointerChoice[],
  ) {
    super(app);
  }

  getItems(): PointerChoice[] {
    return this.choices;
  }

  getItemText(item: PointerChoice): string {
    return `${item.checked ? "✓ " : ""}${item.title}`;
  }

  onChooseItem(): void {}
}
