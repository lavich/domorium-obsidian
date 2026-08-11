import {
  addIcon,
  type App,
  Modal,
  Notice,
  Plugin,
  removeIcon,
  Setting,
} from "obsidian";

import { GEDCOM_VIEW_TYPE, GedcomView } from "./GedcomView";
import { GEDCOM_ICON_ID, GEDCOM_ICON_SVG } from "./icon";
import { GedcomSettingTab } from "./settings";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  type GedcomSettings,
} from "./settingsData";

export default class GedcomPlugin extends Plugin {
  settings: GedcomSettings = DEFAULT_SETTINGS;

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    addIcon(GEDCOM_ICON_ID, GEDCOM_ICON_SVG);
    this.registerView(
      GEDCOM_VIEW_TYPE,
      (leaf) => new GedcomView(leaf, this.settings),
    );
    this.registerExtensions(["ged", "gedcom"], GEDCOM_VIEW_TYPE);
    this.addSettingTab(new GedcomSettingTab(this.app, this));
    this.addCommand({
      id: "go-to-gedcom-definition",
      name: "Go to definition",
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
      name: "Find references",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view) {
          return false;
        }
        if (!checking) {
          const referenceCount = view.goToNextReference();
          new Notice(
            referenceCount === 0
              ? "No GEDCOM references found"
              : `${referenceCount} GEDCOM reference(s); moved to next`,
          );
        }
        return true;
      },
    });
    this.addCommand({
      id: "rename-gedcom-reference",
      name: "Rename reference",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view || !view.canRenameReference()) {
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
    this.addCommand({
      id: "go-to-next-gedcom-problem",
      name: "Go to next problem",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view || view.problemCount() === 0) {
          return false;
        }
        if (!checking) {
          view.goToNextProblem();
        }
        return true;
      },
    });
    this.addCommand({
      id: "go-to-previous-gedcom-problem",
      name: "Go to previous problem",
      checkCallback: (checking) => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        if (!view || view.problemCount() === 0) {
          return false;
        }
        if (!checking) {
          view.goToPreviousProblem();
        }
        return true;
      },
    });
  }

  onunload(): void {
    removeIcon(GEDCOM_ICON_ID);
  }

  async updateSettings(changes: Partial<GedcomSettings>): Promise<void> {
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
        button
          .setButtonText("Rename")
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(value);
          }),
      );
  }
}
