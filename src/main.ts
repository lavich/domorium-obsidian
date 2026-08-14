import {
  addIcon,
  type App,
  FuzzySuggestModal,
  type Menu,
  Modal,
  normalizePath,
  Notice,
  Plugin,
  removeIcon,
  Setting,
  TFile,
} from "obsidian";

import { createGedcomApi, type GedcomApi, type VaultReader } from "./api";
import { COMMANDS, type CommandHost } from "./commands";
import { recordText, type GedcomRecord } from "./editor/records";
import { formatStatus } from "./editor/status";
import { registerRecordEmbeds } from "./notes/embedRegistry";
import { blockDialect, renderGedcomBlock } from "./notes/gedcomBlock";
import {
  namedLink,
  RecordNameIndex,
  splitSubpath,
} from "./notes/recordLinks";
import {
  parseGedcomLink,
  PROTOCOL_ACTION,
  stripEmbed,
  xrefFromSubpath,
  type GedcomLinkTarget,
} from "./vault/protocolLink";
import {
  describeRetarget,
  describeStranded,
  describeUnreadable,
  isGedcomPath,
  mayNameAFile,
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

export default class GedcomPlugin extends Plugin implements GedcomViewHost {
  settings: GedcomSettings = DEFAULT_SETTINGS;
  private readonly vault: VaultReader = {
    read: async (path) => {
      const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
      if (!(file instanceof TFile)) {
        return null;
      }
      return {
        text: await this.app.vault.cachedRead(file),
        revision: `${file.stat.mtime}:${file.stat.size}`,
      };
    },
  };
  /** Reachable as app.plugins.plugins["domorium"].api — see README. */
  readonly api: GedcomApi = createGedcomApi(this.vault);
  private readonly recordNames = new RecordNameIndex(this.vault);
  private statusBar: HTMLElement | undefined;

  async onload(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    addIcon(GEDCOM_ICON_ID, GEDCOM_ICON_SVG);
    this.registerView(
      GEDCOM_VIEW_TYPE,
      (leaf) => new GedcomView(leaf, this.settings, this),
    );
    this.registerExtensions(["ged", "gedcom"], GEDCOM_VIEW_TYPE);
    this.registerMarkdownCodeBlockProcessor("gedcom", (source, element, ctx) => {
      const section = ctx.getSectionInfo(element);
      const { runs, problems } = renderGedcomBlock(
        source,
        blockDialect(section?.text.split("\n")[section.lineStart]),
        this.settings.indentationHints,
      );
      const block = element.createEl("pre", { cls: "gedcom-note-block" });
      for (const run of runs) {
        if (run.className) {
          block.createSpan({ cls: run.className, text: run.text });
        } else {
          block.appendText(run.text);
        }
      }
      if (problems.length === 0) {
        return;
      }
      const list = element.createEl("ul", { cls: "gedcom-note-problems" });
      for (const problem of problems) {
        list.createEl("li", {
          cls: `gedcom-note-problem-${problem.level}`,
          text: `Line ${problem.line}: ${problem.message}`,
        });
      }
    });
    const unregisterEmbeds = registerRecordEmbeds(
      this.app,
      () => this.settings.indentationHints,
    );
    if (unregisterEmbeds) {
      this.register(unregisterEmbeds);
    }
    this.registerMarkdownPostProcessor((element, context) =>
      this.nameRecordLinks(element, context.sourcePath),
    );
    this.addSettingTab(new GedcomSettingTab(this.app, this));
    this.registerObsidianProtocolHandler(PROTOCOL_ACTION, (params) => {
      const target = parseGedcomLink(params);
      if (!target) {
        new Notice("GEDCOM: the link names no file");
        return;
      }
      void this.openGedcomLink(target);
    });
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
            command.run(this.commandHost(), view);
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
        if (file instanceof TFile) {
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
      menu.addItem((item) => {
        item
          .setTitle(command.name)
          .setIcon(command.icon)
          .onClick(() => {
            command.run(this.commandHost(), view);
          });
        if (command.section) {
          item.setSection(command.section);
        }
      });
    }
  }

  statusChanged(view: GedcomView): void {
    if (this.app.workspace.getActiveViewOfType(GedcomView) === view) {
      this.refreshStatusBar();
    }
  }

  /** data.json was rewritten elsewhere — a sync, or a hand editing it. */
  async onExternalSettingsChange(): Promise<void> {
    this.settings = parseSettings(await this.loadData());
    this.forEachView((view) => {
      view.applySettings(this.settings);
    });
    this.refreshStatusBar();
  }

  async updateSettings(changes: Partial<GedcomSettings>): Promise<void> {
    this.settings = { ...this.settings, ...changes };
    await this.saveData(this.settings);
    this.forEachView((view) => {
      view.applySettings(this.settings);
    });
  }

  /** A link written by hand reads as a path; the record has a name. */
  private async nameRecordLinks(
    element: HTMLElement,
    sourcePath: string,
  ): Promise<void> {
    await Promise.all(
      element.findAll("a.internal-link").map(async (link) => {
        const href = link.dataset.href ?? link.getAttr("href") ?? "";
        const { path, subpath } = splitSubpath(href);
        const xref = subpath ? xrefFromSubpath(subpath) : null;
        if (!xref || !isGedcomPath(path)) {
          return;
        }
        const file = this.app.metadataCache.getFirstLinkpathDest(
          path,
          sourcePath,
        );
        if (!file) {
          return;
        }
        const named = namedLink(
          href,
          link.textContent ?? "",
          await this.recordNames.nameOf(file.path, xref),
        );
        if (named) {
          link.setText(named);
        }
      }),
    );
  }

  private async openGedcomLink(target: GedcomLinkTarget): Promise<void> {
    const path = normalizePath(target.file);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`GEDCOM: ${path} is not in this vault`);
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    if (!target.xref) {
      return;
    }
    const view = leaf.view;
    if (!(view instanceof GedcomView) || !view.goToXref(target.xref)) {
      new Notice(`GEDCOM: ${target.xref} is not in ${file.name}`);
    }
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
    let unreadable = 0;
    for (const file of this.app.vault.getFiles()) {
      if (!isGedcomPath(file.path)) {
        continue;
      }
      const view = open.get(file.path);
      try {
        const result = view
          ? view.followRenamedFile(from, to)
          : await this.rewriteClosedFile(file, from, to);
        payloads += result.count;
        files += result.count > 0 ? 1 : 0;
        stranded += result.stranded;
      } catch (error) {
        console.error(`Domorium: ${file.path} could not be checked`, error);
        unreadable += 1;
      }
    }

    if (payloads > 0) {
      new Notice(describeRetarget(payloads, files));
    }
    if (stranded > 0) {
      new Notice(describeStranded(stranded));
    }
    if (unreadable > 0) {
      new Notice(describeUnreadable(unreadable));
    }
  }

  private async rewriteClosedFile(
    file: TFile,
    from: string,
    to: string,
  ): Promise<{ count: number; stranded: number }> {
    const text = await this.app.vault.read(file);
    if (!mayNameAFile(text)) {
      return { count: 0, stranded: 0 };
    }
    const planned = retargetMedia(text, file.path, from, to);
    if (planned.count === 0) {
      return { count: 0, stranded: planned.stranded };
    }
    // process writes whatever it is handed, so a file with nothing to change
    // is never given to it: every GEDCOM in the vault would be rewritten, and
    // its modification time is what Sync and the file list go by.
    await this.app.vault.process(file, (current) =>
      current === text
        ? planned.text
        : retargetMedia(current, file.path, from, to).text,
    );
    return { count: planned.count, stranded: planned.stranded };
  }

  private commandHost(): CommandHost {
    return {
      vaultName: () => this.app.vault.getName(),
      linkToRecord: (path, subpath, text) => {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
        if (!(file instanceof TFile)) {
          return "";
        }
        // A GEDCOM file is not markdown, so Obsidian spells a link to it as an
        // embed — and an embedded GEDCOM is a broken box in a note, not a link
        // anyone can follow. Its own image view drops the same "!".
        return stripEmbed(
          this.app.fileManager.generateMarkdownLink(file, "", subpath, text),
        );
      },
      notify: (message) => {
        new Notice(message);
      },
      copy: (text) => navigator.clipboard.writeText(text),
      chooseRecord: (records, chosen) => {
        new RecordSwitcherModal(this.app, records, chosen).open();
      },
      askForName: (entered) => {
        new RenameReferenceModal(this.app, entered).open();
      },
    };
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
