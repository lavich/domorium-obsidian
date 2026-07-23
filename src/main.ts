import { type App, Modal, Notice, Plugin, Setting } from "obsidian";

import { GEDCOM_VIEW_TYPE, GedcomView } from "./GedcomView";
import { DomoriumSettingTab } from "./settings";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  type DomoriumSettings,
} from "./settingsData";

export default class DomoriumPlugin extends Plugin {
  settings: DomoriumSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
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
        if (!view) {
          return false;
        }
        if (!checking) {
          view.goToDefinition();
        }
        return true;
      },
    });
    this.addCommand({
      id: "find-gedcom-references",
      name: "Find GEDCOM references",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view) {
          return false;
        }
        if (!checking) {
          const references = view.findReferences();
          new Notice(
            references.length === 0
              ? "No GEDCOM references found"
              : `${references.length} GEDCOM reference(s) found`,
          );
        }
        return true;
      },
    });
    this.addCommand({
      id: "rename-gedcom-reference",
      name: "Rename GEDCOM reference",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view) {
          return false;
        }
        if (!checking) {
          new RenameReferenceModal(this.app, (newName) => {
            if (!view.renameReference(newName)) {
              new Notice("GEDCOM reference could not be renamed");
            }
          }).open();
        }
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

class RenameReferenceModal extends Modal {
  constructor(
    app: App,
    private readonly onSubmit: (newName: string) => void,
  ) {
    super(app);
  }

  onOpen(): void {
    this.setTitle("Rename GEDCOM reference");
    let value = "";
    new Setting(this.contentEl)
      .setName("New identifier")
      .addText((text) => {
        text.setPlaceholder("@i2@").onChange((nextValue) => {
          value = nextValue;
        });
        text.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "Enter") {
            this.close();
            this.onSubmit(value);
          }
        });
      })
      .addButton((button) =>
        button.setButtonText("Rename").setCta().onClick(() => {
          this.close();
          this.onSubmit(value);
        }),
      );
  }
}
