import {
  App,
  PluginSettingTab,
  Setting,
  type SettingDefinitionItem,
} from "obsidian";

import type DomoriumPlugin from "./main";
import { SETTING_DEFINITIONS } from "./settingDefinitions";
import type { DomoriumSettings } from "./settingsData";

export class DomoriumSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: DomoriumPlugin,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof DomoriumSettings>[] {
    return SETTING_DEFINITIONS;
  }

  getControlValue(key: string): unknown {
    if (key === "diagnostics" || key === "indentationHints") {
      return this.plugin.settings[key];
    }
    return undefined;
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    if (typeof value !== "boolean") {
      return Promise.resolve();
    }
    if (key === "diagnostics") {
      return this.plugin.updateSettings({ diagnostics: value });
    }
    if (key === "indentationHints") {
      return this.plugin.updateSettings({ indentationHints: value });
    }
    return Promise.resolve();
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
