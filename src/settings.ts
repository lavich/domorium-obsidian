import {
  App,
  PluginSettingTab,
  Setting,
  type SettingDefinitionItem,
} from "obsidian";

import type GedcomPlugin from "./main";
import {
  SETTING_DEFINITIONS,
  type GedcomSettingDefinition,
} from "./settingDefinitions";
import { changedSetting, type GedcomSettings } from "./settingsData";

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
    return key in this.plugin.settings
      ? this.plugin.settings[key as keyof GedcomSettings]
      : undefined;
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    const change = changedSetting(key, value);
    return change ? this.plugin.updateSettings(change) : Promise.resolve();
  }

  /**
   * Deprecated since Obsidian 1.13.0 and not called when
   * `getSettingDefinitions` answers, but `minAppVersion` is 1.5.0, so this is
   * what an older app shows.
   */
  display(): void {
    this.containerEl.empty();
    for (const definition of SETTING_DEFINITIONS) {
      this.render(definition);
    }
  }

  private render(definition: GedcomSettingDefinition): void {
    const setting = new Setting(this.containerEl)
      .setName(definition.name)
      .setDesc(definition.desc);
    const { control } = definition;
    const change = (value: unknown): void => {
      void this.setControlValue(control.key, value);
    };

    if (control.type === "toggle") {
      setting.addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings[control.key] as boolean)
          .onChange(change),
      );
      return;
    }
    setting.addDropdown((dropdown) =>
      dropdown
        .addOptions(control.options)
        .setValue(this.plugin.settings[control.key] as string)
        .onChange(change),
    );
  }
}
