import { Modal, Setting, type App } from "obsidian";

export class ConfirmModal extends Modal {
  private answered = false;

  constructor(
    app: App,
    private readonly message: string,
    private readonly action: string,
    private readonly confirmed: () => void,
    private readonly declined?: () => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.contentEl.createEl("p", { text: this.message });
    new Setting(this.contentEl).addButton((button) => {
      button.buttonEl.addClass("mod-warning");
      button
        .setButtonText(this.action)
        .onClick(() => {
          this.answered = true;
          this.close();
          this.confirmed();
        });
    });
  }

  onClose(): void {
    this.contentEl.empty();
    if (!this.answered) {
      this.declined?.();
    }
  }
}
