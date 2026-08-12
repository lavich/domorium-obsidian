import {
  App,
  PluginSettingTab,
  Setting,
  type SettingDefinitionItem,
} from "obsidian";

import type GedcomPlugin from "./main";
import {
  RECORD_PREVIEW_OPTIONS,
  SETTING_DEFINITIONS,
} from "./settingDefinitions";
import { isRecordPreviewTrigger, type GedcomSettings } from "./settingsData";

export class GedcomSettingTab extends PluginSettingTab {
  constructor(
    app: App,
    private readonly plugin: GedcomPlugin,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof GedcomSettings>[] {
    return SETTING_DEFINITIONS;
  }

  getControlValue(key: string): unknown {
    if (
      key === "diagnostics" ||
      key === "indentationHints" ||
      key === "recordPreview"
    ) {
      return this.plugin.settings[key];
    }
    return undefined;
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    if (key === "recordPreview") {
      return isRecordPreviewTrigger(value)
        ? this.plugin.updateSettings({ recordPreview: value })
        : Promise.resolve();
    }
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

    new Setting(this.containerEl)
      .setName("Record preview")
      .setDesc(
        "Show the record a cross-reference points at when the pointer is over it.",
      )
      .addDropdown((dropdown) =>
        dropdown
          .addOptions(RECORD_PREVIEW_OPTIONS)
          .setValue(this.plugin.settings.recordPreview)
          .onChange(async (value) => {
            await this.setControlValue("recordPreview", value);
          }),
      );
  }
}
