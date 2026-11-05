import {
  App,
  PluginSettingTab,
  Setting,
  type SettingDefinitionItem,
} from "obsidian";

import type GedcomPlugin from "./main";
import {
  settingDefinitions,
  type GedcomSettingDefinition,
} from "./settingDefinitions";
import { changedSetting, type GedcomSettings } from "./settingsData";
import { DeferredCommit, noteFor, wireTextRow } from "./settingTextRow";

export class GedcomSettingTab extends PluginSettingTab {
  private readonly deferred = new DeferredCommit(
    (key, value) => {
      const change = changedSetting(key, value);
      if (change) {
        void this.plugin.updateSettings(change);
      }
    },
    {
      set: (callback, ms) => window.setTimeout(callback, ms),
      clear: (id) => window.clearTimeout(id),
    },
  );

  constructor(
    app: App,
    private readonly plugin: GedcomPlugin,
  ) {
    super(app, plugin);
  }

  getSettingDefinitions(): SettingDefinitionItem<keyof GedcomSettings>[] {
    return settingDefinitions();
  }

  getControlValue(key: string): unknown {
    return key in this.plugin.settings
      ? this.plugin.settings[key as keyof GedcomSettings]
      : undefined;
  }

  setControlValue(key: string, value: unknown): Promise<void> {
    if (typeof value === "string" && settingDefinitions().some((one) => one.control.type === "text" && one.control.key === key)) {
      this.deferred.type(key, value);
      return Promise.resolve();
    }
    const change = changedSetting(key, value);
    return change ? this.plugin.updateSettings(change) : Promise.resolve();
  }

  /**
   * Deprecated since Obsidian 1.13.0 and not called when
   * `getSettingDefinitions` answers, but `minAppVersion` is 1.8.7, so this is
   * what an older app shows. See "The minimum app version, and what it costs"
   * in CLAUDE.md.
   */
  display(): void {
    this.containerEl.empty();
    for (const definition of settingDefinitions()) {
      this.render(definition);
    }
  }

  hide(): void {
    this.deferred.flush();
  }

  private render(definition: GedcomSettingDefinition): void {
    const setting = new Setting(this.containerEl)
      .setName(definition.name)
      .setDesc(definition.desc);
    const { control } = definition;
    const change = (value: unknown): void => {
      void this.setControlValue(control.key, value);
    };

    if (control.type === "text") {
      const note = setting.descEl.createDiv({ cls: "gedcom-setting-note" });
      setting.addText((text) => {
        text
          .setPlaceholder(control.placeholder ?? "")
          .setValue(this.plugin.settings[control.key] as string);
        note.setText(noteFor(control.key, text.getValue()));
        wireTextRow(
          {
            onInput: (listener) => {
              text.onChange(listener);
            },
            onBlur: (listener) => text.inputEl.addEventListener("blur", listener),
            onEnter: (listener) =>
              text.inputEl.addEventListener("keydown", (event) => {
                if (event.key === "Enter") {
                  listener();
                }
              }),
            setNote: (message) => note.setText(message),
          },
          control.key,
          this.deferred,
        );
      });
      return;
    }
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
