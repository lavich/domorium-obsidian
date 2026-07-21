import { App, PluginSettingTab, Setting } from "obsidian";

import type DomoriumPlugin from "./main";

export class DomoriumSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: DomoriumPlugin,
  ) {
    super(app, plugin);
  }

  display(): void {
    this.containerEl.empty();

    new Setting(this.containerEl)
      .setName("Diagnostics")
      .setDesc("Underline GEDCOM errors and warnings in the editor.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.diagnostics).onChange(async (value) => {
          await this.plugin.updateSettings({ diagnostics: value });
        }),
      );

    new Setting(this.containerEl)
      .setName("Indentation hints")
      .setDesc("Visually indent nested GEDCOM records without changing the file.")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.indentationHints)
          .onChange(async (value) => {
            await this.plugin.updateSettings({ indentationHints: value });
          }),
      );
  }
}
