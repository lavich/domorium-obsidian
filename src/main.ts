import {
  addIcon,
  type App,
  FuzzySuggestModal,
  getLanguage,
  type Menu,
  Modal,
  normalizePath,
  Notice,
  Platform,
  Plugin,
  removeIcon,
  Setting,
  TFile,
  TFolder,
} from "obsidian";

import { createGedcomApi, type GedcomApi, type VaultReader } from "./api";
import { COMMANDS, type CommandHost } from "./commands";
import { recordText, type GedcomRecord } from "./editor/records";
import { formatStatus } from "./editor/status";
import { setLanguage, t } from "./i18n";
import { registerRecordEmbeds } from "./notes/embedRegistry";
import { blockDialect, renderGedcomBlock } from "./notes/gedcomBlock";
import { RecordIndex } from "./notes/recordIndex";
import { RecordSuggest } from "./notes/recordSuggest";
import { notesLinking, type NoteHit, type NoteLinks } from "./desk/noteLinks";
import {
  parseGedcomLink,
  PROTOCOL_ACTION,
  stripEmbed,
  type GedcomLinkTarget,
} from "./vault/protocolLink";
import {
  describeRetarget,
  describeStranded,
  describeUnreadable,
  isGedcomPath,
  moveClosedFile,
  type Move,
  RenameBatch,
} from "./vault/movedFiles";
import { GEDCOM_VIEW_TYPE, GedcomView, type GedcomViewHost } from "./GedcomView";
import {
  EVIDENCE_VIEW_TYPE,
  EvidenceView,
  INDEX_VIEW_TYPE,
  IndexView,
  type DeskViewsHost,
} from "./desk/DeskViews";
import type { AllowScope } from "./editor/mediaPreviewView";
import { GEDCOM_ICON_ID, GEDCOM_ICON_SVG } from "./icon";
import { GedcomSettingTab } from "./settings";
import {
  DEFAULT_SETTINGS,
  parseSettings,
  type GedcomSettings,
} from "./settingsData";

/** Not in `obsidian.d.ts`: only the method that appends to it is. */
interface SuggestRegistry {
  suggests: unknown[];
  removeSuggest(suggest: unknown): void;
}

export default class GedcomPlugin
  extends Plugin
  implements GedcomViewHost, DeskViewsHost
{
  settings: GedcomSettings = DEFAULT_SETTINGS;
  /**
   * The offer's shorter answer. A reader who says yes to one face in a group
   * photograph has answered for the other four, and unloading is what forgets
   * it: nothing about reaching the network belongs in a file on disk unasked.
   */
  private allowedOnce = false;
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
  private statusBar: HTMLElement | undefined;
  private followedView: GedcomView | null = null;
  /** Placed once a session, so a panel the reader closes stays closed. */
  private evidencePlaced = false;
  private moves: Promise<void> = Promise.resolve();
  private readonly renames = new RenameBatch((move) => {
    this.moves = this.moves
      .then(() => this.followMove(move))
      .catch((error: unknown) => {
        console.error("Domorium: a move could not be followed", error);
      });
  }, window);

  async onload(): Promise<void> {
    setLanguage(getLanguage());
    this.settings = parseSettings(await this.loadData());
    addIcon(GEDCOM_ICON_ID, GEDCOM_ICON_SVG);
    this.registerView(
      GEDCOM_VIEW_TYPE,
      (leaf) => new GedcomView(leaf, this.settings, this),
    );
    this.registerExtensions(["ged", "gedcom"], GEDCOM_VIEW_TYPE);
    this.registerView(INDEX_VIEW_TYPE, (leaf) => new IndexView(leaf, this));
    this.registerView(EVIDENCE_VIEW_TYPE, (leaf) => new EvidenceView(leaf, this));
    this.addRibbonIcon(GEDCOM_ICON_ID, t("command.openIndex"), () => {
      void this.openIndex();
    });
    this.addCommand({
      id: "open-gedcom-index",
      name: t("command.openIndex"),
      callback: () => {
        void this.openIndex();
      },
    });
    this.addCommand({
      id: "open-gedcom-evidence",
      name: t("command.openEvidence"),
      callback: () => {
        this.openEvidence();
      },
    });
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
          text: t("note.problemLine", {
            line: problem.line,
            message: problem.message,
          }),
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
    this.registerRecordSuggest();
    this.addSettingTab(new GedcomSettingTab(this.app, this));
    this.registerObsidianProtocolHandler(PROTOCOL_ACTION, (params) => {
      const target = parseGedcomLink(params);
      if (!target) {
        new Notice(t("notice.linkNamesNoFile"));
        return;
      }
      void this.openGedcomLink(target);
    });
    for (const command of COMMANDS) {
      this.addCommand({
        id: command.id,
        name: t(command.name),
        hotkeys: command.hotkeys?.(Platform.isMacOS),
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
        const active = this.app.workspace.getActiveViewOfType(GedcomView);
        if (active && active !== this.followedView) {
          this.followedView = active;
          this.redrawDesk();
        }
      }),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", () => {
        for (const leaf of this.app.workspace.getLeavesOfType(EVIDENCE_VIEW_TYPE)) {
          if (leaf.view instanceof EvidenceView) {
            leaf.view.forgetNotes();
            leaf.view.redraw();
          }
        }
      }),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        if (this.followedView && !this.isOpen(this.followedView)) {
          this.followedView = null;
          this.redrawDesk();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        this.renames.add(
          { from: oldPath, to: file.path, folder: file instanceof TFolder },
          file instanceof TFolder ? descendantPaths(file) : [],
        );
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
    this.renames.cancel();
    removeIcon(GEDCOM_ICON_ID);
  }

  fillMenu(menu: Menu, view: GedcomView): void {
    for (const command of COMMANDS) {
      if (!command.isAvailable(view)) {
        continue;
      }
      menu.addItem((item) => {
        item
          .setTitle(t(command.name))
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

  followed(): GedcomView | null {
    return this.followedView;
  }

  genealogyChanged(view: GedcomView): void {
    if (this.followedView === null || this.followedView === view) {
      this.followedView = view;
      this.redrawDesk();
    }
    if (view.shownRecord() !== null) {
      void this.placeEvidence();
    }
  }

  async notesFor(path: string, xref: string): Promise<NoteHit[]> {
    const { metadataCache, vault } = this.app;
    const notes: NoteLinks[] = [];
    for (const [source, targets] of Object.entries(metadataCache.resolvedLinks)) {
      if (!(path in targets)) {
        continue;
      }
      const file = vault.getAbstractFileByPath(source);
      if (!(file instanceof TFile)) {
        continue;
      }
      const cache = metadataCache.getFileCache(file);
      const links = [...(cache?.links ?? []), ...(cache?.embeds ?? [])].map((one) => ({
        link: one.link,
        start: one.position.start.offset,
        end: one.position.end.offset,
      }));
      if (links.length > 0) {
        notes.push({ path: source, name: file.basename, text: await vault.cachedRead(file), links });
      }
    }
    return notesLinking(
      notes,
      { path, xref },
      (linkPath, from) => metadataCache.getFirstLinkpathDest(linkPath, from)?.path ?? null,
    );
  }

  openNote(path: string, line: number): void {
    void this.app.workspace.openLinkText(path, "", "tab", { eState: { line } });
  }

  private async placeEvidence(): Promise<void> {
    if (this.evidencePlaced) {
      return;
    }
    this.evidencePlaced = true;
    const { workspace } = this.app;
    if (workspace.getLeavesOfType(EVIDENCE_VIEW_TYPE).length > 0) {
      return;
    }
    await workspace.getRightLeaf(false)?.setViewState({ type: EVIDENCE_VIEW_TYPE, active: false });
  }

  openEvidence(): void {
    void this.revealSidebarView(EVIDENCE_VIEW_TYPE, "right");
  }

  private async openIndex(): Promise<void> {
    await this.revealSidebarView(INDEX_VIEW_TYPE, "left");
  }

  private async revealSidebarView(type: string, side: "left" | "right"): Promise<void> {
    const { workspace } = this.app;
    const leaf =
      workspace.getLeavesOfType(type)[0] ??
      (side === "left" ? workspace.getLeftLeaf(false) : workspace.getRightLeaf(false));
    if (!leaf) {
      return;
    }
    if (leaf.view.getViewType() !== type) {
      await leaf.setViewState({ type, active: true });
    }
    await workspace.revealLeaf(leaf);
  }

  private redrawDesk(): void {
    for (const leaf of this.app.workspace.getLeavesOfType(INDEX_VIEW_TYPE)) {
      if (leaf.view instanceof IndexView) {
        leaf.view.redraw();
      }
    }
    for (const leaf of this.app.workspace.getLeavesOfType(EVIDENCE_VIEW_TYPE)) {
      if (leaf.view instanceof EvidenceView) {
        leaf.view.redraw();
      }
    }
  }

  private isOpen(view: GedcomView): boolean {
    return this.app.workspace
      .getLeavesOfType(GEDCOM_VIEW_TYPE)
      .some((leaf) => leaf.view === view);
  }

  statusChanged(view: GedcomView): void {
    if (this.app.workspace.getActiveViewOfType(GedcomView) === view) {
      this.refreshStatusBar();
    }
  }

  remoteImages(): boolean {
    return this.settings.remoteImages || this.allowedOnce;
  }

  allowRemoteImages(scope: AllowScope): void {
    if (scope === "always") {
      void this.updateSettings({ remoteImages: true });
      return;
    }
    this.allowedOnce = true;
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
    // The setting is the stronger answer: turned off, it takes the shorter one
    // with it rather than leaving a reader wondering why the row did not return.
    if (!this.settings.remoteImages) {
      this.allowedOnce = false;
    }
    await this.saveData(this.settings);
    this.forEachView((view) => {
      view.applySettings(this.settings);
    });
  }

  /**
   * Obsidian's own suggester answers for everything inside `[[`, and the
   * manager takes the first that answers, so appending puts this out of reach.
   */
  private registerRecordSuggest(): void {
    const suggest = new RecordSuggest(this.app, new RecordIndex(this.vault));
    const registry = (
      this.app.workspace as unknown as { editorSuggest?: SuggestRegistry }
    ).editorSuggest;
    if (!Array.isArray(registry?.suggests)) {
      this.registerEditorSuggest(suggest);
      return;
    }
    registry.suggests.unshift(suggest);
    this.register(() => {
      registry.removeSuggest(suggest);
    });
  }

  private async openGedcomLink(target: GedcomLinkTarget): Promise<void> {
    const path = normalizePath(target.file);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(t("notice.fileNotInVault", { path }));
      return;
    }
    const leaf = this.app.workspace.getLeaf(false);
    await leaf.openFile(file);
    if (!target.xref) {
      return;
    }
    const view = leaf.view;
    if (!(view instanceof GedcomView) || !view.goToXref(target.xref)) {
      new Notice(
        t("notice.xrefNotInFile", { xref: target.xref, file: file.name }),
      );
    }
  }

  private async followMove(move: Move): Promise<void> {
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
          ? view.followMove(move)
          : await moveClosedFile(
              {
                read: () => this.app.vault.read(file),
                process: (change) => this.app.vault.process(file, change),
              },
              file.path,
              move,
            );
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

  private commandHost(): CommandHost {
    return {
      vaultName: () => this.app.vault.getName(),
      linkToRecord: (path, subpath, text) => {
        const file = this.app.vault.getAbstractFileByPath(normalizePath(path));
        if (!(file instanceof TFile)) {
          return "";
        }
        // Obsidian spells a link to a file that is not markdown as an embed.
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

function descendantPaths(folder: TFolder): string[] {
  return folder.children.flatMap((child) =>
    child instanceof TFolder
      ? [child.path, ...descendantPaths(child)]
      : [child.path],
  );
}

class RecordSwitcherModal extends FuzzySuggestModal<GedcomRecord> {
  constructor(
    app: App,
    private readonly records: GedcomRecord[],
    private readonly onChoose: (record: GedcomRecord) => void,
  ) {
    super(app);
    this.setPlaceholder(t("switcher.placeholder"));
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
    this.setTitle(t("rename.title"));
    let value = "";
    new Setting(this.contentEl)
      .setName(t("rename.field"))
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
          .setButtonText(t("rename.button"))
          .setCta()
          .onClick(() => {
            this.close();
            this.onSubmit(value);
          }),
      );
  }
}
