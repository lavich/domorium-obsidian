import {
  addIcon,
  type App,
  FuzzySuggestModal,
  type IconName,
  type Menu,
  Modal,
  Notice,
  Plugin,
  removeIcon,
  Setting,
  TFile,
} from "obsidian";

import { recordText, type GedcomRecord } from "./editor/records";
import { formatStatus } from "./editor/status";
import {
  describeRetarget,
  describeStranded,
  isGedcomPath,
  retargetMedia,
} from "./vault/renamedMedia";
import { GEDCOM_VIEW_TYPE, GedcomView, type GedcomViewHost } from "./GedcomView";
import { GEDCOM_ICON_ID, GEDCOM_ICON_SVG } from "./icon";
import { GedcomSettingTab } from "./settings";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  type GedcomSettings,
} from "./settingsData";

interface GedcomCommand {
  id: string;
  name: string;
  icon: IconName;
  isAvailable(view: GedcomView): boolean;
  run(plugin: GedcomPlugin, view: GedcomView): void;
}

const COMMANDS: GedcomCommand[] = [
  {
    id: "go-to-gedcom-record",
    name: "Go to record",
    icon: "list-tree",
    isAvailable: (view) => view.records().length > 0,
    run: (plugin, view) => {
      new RecordSwitcherModal(plugin.app, view.records(), (record) => {
        view.goToRecord(record);
      }).open();
    },
  },
  {
    id: "go-to-gedcom-definition",
    name: "Go to definition",
    icon: "arrow-right",
    isAvailable: () => true,
    run: (_plugin, view) => {
      view.goToDefinition();
    },
  },
  {
    id: "find-gedcom-references",
    name: "Find references",
    icon: "search",
    isAvailable: () => true,
    run: (_plugin, view) => {
      const referenceCount = view.goToNextReference();
      new Notice(
        referenceCount === 0
          ? "No GEDCOM references found"
          : `${referenceCount} GEDCOM reference(s); moved to next`,
      );
    },
  },
  {
    id: "rename-gedcom-reference",
    name: "Rename reference",
    icon: "pencil",
    isAvailable: (view) => view.canRenameReference(),
    run: (plugin, view) => {
      new RenameReferenceModal(plugin.app, (newName) => {
        if (!view.renameReference(newName)) {
          new Notice("GEDCOM reference could not be renamed");
        }
      }).open();
    },
  },
  {
    id: "go-to-next-gedcom-problem",
    name: "Go to next problem",
    icon: "chevron-down",
    isAvailable: (view) => view.problemCount() > 0,
    run: (_plugin, view) => {
      view.goToNextProblem();
    },
  },
  {
    id: "go-to-previous-gedcom-problem",
    name: "Go to previous problem",
    icon: "chevron-up",
    isAvailable: (view) => view.problemCount() > 0,
    run: (_plugin, view) => {
      view.goToPreviousProblem();
    },
  },
  {
    id: "toggle-gedcom-problems-panel",
    name: "Toggle problems panel",
    icon: "list-checks",
    isAvailable: (view) => view.canShowProblems(),
    run: (_plugin, view) => {
      view.toggleProblemsPanel();
    },
  },
  {
    id: "search-in-gedcom-file",
    name: "Search in file",
    icon: "text-search",
    isAvailable: () => true,
    run: (_plugin, view) => {
      view.openSearch();
    },
  },
];

export default class GedcomPlugin extends Plugin implements GedcomViewHost {
  settings: GedcomSettings = DEFAULT_SETTINGS;
  private statusBar: HTMLElement | undefined;

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    addIcon(GEDCOM_ICON_ID, GEDCOM_ICON_SVG);
    this.registerView(
      GEDCOM_VIEW_TYPE,
      (leaf) => new GedcomView(leaf, this.settings, this),
    );
    this.registerExtensions(["ged", "gedcom"], GEDCOM_VIEW_TYPE);
    this.addSettingTab(new GedcomSettingTab(this.app, this));
    for (const command of COMMANDS) {
      this.addCommand({
        id: command.id,
        name: command.name,
        checkCallback: (checking) => {
          const view = this.app.workspace.getActiveViewOfType(GedcomView);
          if (!view || !command.isAvailable(view)) {
            return false;
          }
          if (!checking) {
            command.run(this, view);
          }
          return true;
        },
      });
    }
    this.statusBar = this.addStatusBarItem();
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.refreshStatusBar();
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        if (file instanceof TFile && !isGedcomPath(file.path)) {
          void this.followRenamedFile(oldPath, file.path);
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on("css-change", () => {
        this.forEachView((view) => {
          view.refresh();
        });
      }),
    );
    this.refreshStatusBar();
  }

  onunload(): void {
    removeIcon(GEDCOM_ICON_ID);
  }

  fillMenu(menu: Menu, view: GedcomView): void {
    for (const command of COMMANDS) {
      if (!command.isAvailable(view)) {
        continue;
      }
      menu.addItem((item) =>
        item
          .setTitle(command.name)
          .setIcon(command.icon)
          .onClick(() => {
            command.run(this, view);
          }),
      );
    }
  }

  statusChanged(view: GedcomView): void {
    if (this.app.workspace.getActiveViewOfType(GedcomView) === view) {
      this.refreshStatusBar();
    }
  }

  async updateSettings(changes: Partial<GedcomSettings>): Promise<void> {
    this.settings = { ...this.settings, ...changes };
    await this.saveData(this.settings);
    this.forEachView((view) => {
      view.applySettings(this.settings);
    });
  }

  private async followRenamedFile(from: string, to: string): Promise<void> {
    const open = new Map<string, GedcomView>();
    this.forEachView((view) => {
      if (view.file) {
        open.set(view.file.path, view);
      }
    });

    let payloads = 0;
    let files = 0;
    let stranded = 0;
    for (const file of this.app.vault.getFiles()) {
      if (!isGedcomPath(file.path)) {
        continue;
      }
      const view = open.get(file.path);
      const result = view
        ? view.followRenamedFile(from, to)
        : await this.rewriteClosedFile(file, from, to);
      payloads += result.count;
      files += result.count > 0 ? 1 : 0;
      stranded += result.stranded;
    }

    if (payloads > 0) {
      new Notice(describeRetarget(payloads, files));
    }
    if (stranded > 0) {
      new Notice(describeStranded(stranded));
    }
  }

  private async rewriteClosedFile(
    file: TFile,
    from: string,
    to: string,
  ): Promise<{ count: number; stranded: number }> {
    let count = 0;
    let stranded = 0;
    await this.app.vault.process(file, (text) => {
      const result = retargetMedia(text, file.path, from, to);
      count = result.count;
      stranded = result.stranded;
      return result.text;
    });
    return { count, stranded };
  }

  private forEachView(run: (view: GedcomView) => void): void {
    this.app.workspace.getLeavesOfType(GEDCOM_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof GedcomView) {
        run(leaf.view);
      }
    });
  }

  private refreshStatusBar(): void {
    const view = this.app.workspace.getActiveViewOfType(GedcomView);
    this.statusBar?.toggle(view !== null);
    if (view) {
      this.statusBar?.setText(formatStatus(view.getStatus()));
    }
  }
}

class RecordSwitcherModal extends FuzzySuggestModal<GedcomRecord> {
  constructor(
    app: App,
    private readonly records: GedcomRecord[],
    private readonly onChoose: (record: GedcomRecord) => void,
  ) {
    super(app);
    this.setPlaceholder("Find a record by name, identifier or tag");
  }

  getItems(): GedcomRecord[] {
    return this.records;
  }

  getItemText(record: GedcomRecord): string {
    return recordText(record);
  }

  onChooseItem(record: GedcomRecord): void {
    this.onChoose(record);
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
