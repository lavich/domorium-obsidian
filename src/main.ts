import { Plugin } from "obsidian";

import { GEDCOM_VIEW_TYPE, GedcomView } from "./GedcomView";
import { DomoriumSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type DomoriumSettings } from "./settingsData";

export default class DomoriumPlugin extends Plugin {
  settings: DomoriumSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
    this.registerView(
      GEDCOM_VIEW_TYPE,
      (leaf) => new GedcomView(leaf, this.settings),
    );
    this.registerExtensions(["ged", "gedcom"], GEDCOM_VIEW_TYPE);
    this.addSettingTab(new DomoriumSettingTab(this.app, this));
    this.addCommand({
      id: "go-to-gedcom-definition",
      name: "Go to GEDCOM definition",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view) return false;
        if (!checking) view.goToDefinition();
        return true;
      },
    });
  }

  async updateSettings(changes: Partial<DomoriumSettings>): Promise<void> {
    this.settings = { ...this.settings, ...changes };
    await this.saveData(this.settings);
    this.app.workspace.getLeavesOfType(GEDCOM_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof GedcomView) {
        leaf.view.applySettings(this.settings);
      }
    });
  }
}
