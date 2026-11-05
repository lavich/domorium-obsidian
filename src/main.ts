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
  View,
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
import { RETIRED_VIEW_TYPES, type Origin } from "./desk/deskState";
import { originRules } from "./desk/tabModes";
import { sidePanelPlan, type SidePanelPlan } from "./desk/sidePanels";
import { adoptsFollow, fallbackFollowed, noteChangeMatters } from "./desk/followRules";
import {
  parseGedcomLink,
  PROTOCOL_ACTION,
  stripEmbed,
  type GedcomLinkTarget,
} from "./vault/protocolLink";
import { MoveFollower } from "./vault/movedFiles";
import { GEDCOM_VIEW_TYPE, GedcomView, type GedcomViewHost } from "./GedcomView";
import {
  INDEX_VIEW_TYPE,
  IndexView,
  RECORD_VIEW_TYPE,
  RecordCardView,
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
  private ribbonIcon: HTMLElement | undefined;
  private followedView: GedcomView | null = null;
  /** Placed once a session, so a card the reader closes stays closed. */
  private cardPlaced = false;
  private notesCache = new Map<string, Promise<NoteLinks[]>>();
  private linkingNotes = new Map<string, Set<string>>();
  private recentViews: GedcomView[] = [];
  private readonly moves = new MoveFollower<TFile>(
    {
      files: () => this.app.vault.getFiles(),
      openView: (file) =>
        this.app.workspace
          .getLeavesOfType(GEDCOM_VIEW_TYPE)
          .map((leaf) => leaf.view)
          .find(
            (view): view is GedcomView =>
              view instanceof GedcomView && view.file === file,
          ) ?? null,
      read: (file) => this.app.vault.read(file),
      process: (file, change) => this.app.vault.process(file, change),
      notify: (message) => {
        new Notice(message);
      },
    },
    window,
  );

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
    this.registerView(RECORD_VIEW_TYPE, (leaf) => new RecordCardView(leaf, this));
    this.addCommand({
      id: "open-gedcom-index",
      name: t("command.openIndex"),
      checkCallback: (checking) => {
        if (!this.settings.genealogyInterface) {
          return false;
        }
        if (!checking) {
          void this.openIndex();
        }
        return true;
      },
    });
    this.addCommand({
      id: "open-gedcom-record-card",
      name: t("command.openRecordCard"),
      checkCallback: (checking) => {
        if (!this.settings.genealogyInterface) {
          return false;
        }
        if (!checking) {
          void this.focusCard();
        }
        return true;
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
        if (active) {
          this.recentViews = [active, ...this.recentViews.filter((view) => view !== active)];
        }
        if (active && active !== this.followedView) {
          this.followedView = active;
          this.redrawDesk();
        }
      }),
    );
    this.registerEvent(
      this.app.metadataCache.on("changed", (file) => {
        this.notesMayHaveChanged(file.path);
      }),
    );
    this.registerEvent(
      this.app.workspace.on("layout-change", () => {
        this.sweepRetiredViews();
        if (!this.settings.genealogyInterface) {
          this.syncInterface();
        }
        for (const leaf of this.app.workspace.getLeavesOfType(RECORD_VIEW_TYPE)) {
          if (leaf.view instanceof RecordCardView) {
            leaf.view.onResize();
          }
        }
        this.recentViews = this.recentViews.filter((view) => this.isOpen(view));
        if (this.followedView && !this.isOpen(this.followedView)) {
          this.followedView = fallbackFollowed(this.recentViews, (view) => this.isOpen(view));
          this.redrawDesk();
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const descendants = file instanceof TFolder ? descendantPaths(file) : [];
        this.moves.add(
          { from: oldPath, to: file.path, folder: file instanceof TFolder },
          descendants,
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
    this.syncInterface();
    // A saved layout restores the panels after onload.
    this.app.workspace.onLayoutReady(() => {
      this.sweepRetiredViews();
      this.syncInterface();
    });
  }

  onunload(): void {
    this.moves.stop();
    removeIcon(GEDCOM_ICON_ID);
  }

  fillMenu(menu: Menu, view: GedcomView): void {
    for (const command of COMMANDS) {
      if (command.menu === false || !command.isAvailable(view)) {
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
    if (adoptsFollow(this.followedView, view, this.app.workspace.getActiveViewOfType(GedcomView))) {
      this.followedView = view;
      this.redrawDesk();
    }
  }

  cardWanted(_view: GedcomView, origin: Origin): void {
    if (!this.settings.genealogyInterface) {
      return;
    }
    const { workspace } = this.app;
    const plan = sidePanelPlan({
      enabled: this.settings.openPanelsOnSelect,
      mobile: Platform.isMobile,
      origin,
      index: {
        open: workspace.getLeavesOfType(INDEX_VIEW_TYPE).length > 0,
        collapsed: workspace.leftSplit.collapsed,
      },
      card: {
        open: workspace.getLeavesOfType(RECORD_VIEW_TYPE).length > 0,
        collapsed: workspace.rightSplit.collapsed,
      },
    });
    if (plan.index === "open" || plan.card === "open") {
      void this.openSidePanels(plan);
      return;
    }
    if (originRules(origin, Platform.isMobile).opensDrawer) {
      void this.revealCardDrawer();
      return;
    }
    void this.placeCard();
  }

  async notesFor(path: string, xref: string): Promise<NoteHit[]> {
    const { metadataCache } = this.app;
    let asked = this.notesCache.get(path);
    if (!asked) {
      const fresh = this.noteLinksTo(path);
      asked = fresh;
      this.notesCache.set(path, fresh);
      void fresh.then(
        (notes) => {
          this.linkingNotes.set(path, new Set(notes.map((note) => note.path)));
        },
        () => {
          if (this.notesCache.get(path) === fresh) {
            this.notesCache.delete(path);
          }
        },
      );
    }
    return notesLinking(
      await asked,
      { path, xref },
      (linkPath, from) => metadataCache.getFirstLinkpathDest(linkPath, from)?.path ?? null,
    );
  }

  private notesMayHaveChanged(changed: string): void {
    const { resolvedLinks } = this.app.metadataCache;
    const stale = [...this.notesCache.keys()].filter(
      (path) =>
        noteChangeMatters(changed, [path], this.linkingNotes.get(path) ?? new Set()) ||
        path in (resolvedLinks[changed] ?? {}),
    );
    if (stale.length === 0) {
      return;
    }
    for (const path of stale) {
      this.notesCache.delete(path);
      this.linkingNotes.delete(path);
    }
    for (const leaf of this.app.workspace.getLeavesOfType(RECORD_VIEW_TYPE)) {
      if (leaf.view instanceof RecordCardView) {
        leaf.view.refreshNotes();
      }
    }
  }

  private async noteLinksTo(path: string): Promise<NoteLinks[]> {
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
    return notes;
  }

  openNote(path: string, line: number): void {
    void this.app.workspace.openLinkText(path, "", "tab", { eState: { line } });
  }

  private syncInterface(): void {
    const { workspace } = this.app;
    if (this.settings.genealogyInterface) {
      this.ribbonIcon ??= this.addRibbonIcon(
        GEDCOM_ICON_ID,
        t("command.openIndex"),
        () => {
          void this.openIndex();
        },
      );
      return;
    }
    this.ribbonIcon?.remove();
    this.ribbonIcon = undefined;
    this.cardPlaced = false;
    this.followedView = null;
    workspace.detachLeavesOfType(INDEX_VIEW_TYPE);
    workspace.detachLeavesOfType(RECORD_VIEW_TYPE);
  }

  /** Obsidian keeps a leaf of a view type nobody registers, as a pane that says it does not know what it is. */
  private sweepRetiredViews(): void {
    for (const type of RETIRED_VIEW_TYPES) {
      this.app.workspace.detachLeavesOfType(type);
    }
  }

  private async placeCard(): Promise<void> {
    if (!this.settings.genealogyInterface || this.cardPlaced) {
      return;
    }
    const { workspace } = this.app;
    if (workspace.getLeavesOfType(RECORD_VIEW_TYPE).length > 0) {
      this.cardPlaced = true;
      return;
    }
    const leaf = workspace.getRightLeaf(false);
    if (!leaf) {
      return;
    }
    this.cardPlaced = true;
    await leaf.setViewState({ type: RECORD_VIEW_TYPE, active: false });
  }

  private async openSidePanels(plan: SidePanelPlan): Promise<void> {
    const { workspace } = this.app;
    const previous = workspace.getActiveViewOfType(View)?.leaf;
    const opened: Promise<unknown>[] = [];
    if (plan.index === "open") {
      opened.push(this.revealSideLeaf(INDEX_VIEW_TYPE, "left"));
    }
    if (plan.card === "open") {
      this.cardPlaced = true;
      opened.push(this.revealSideLeaf(RECORD_VIEW_TYPE, "right"));
    }
    await Promise.allSettled(opened);
    if (previous && workspace.getActiveViewOfType(View)?.leaf !== previous) {
      workspace.setActiveLeaf(previous, { focus: true });
    }
  }

  private async revealSideLeaf(type: string, side: "left" | "right"): Promise<void> {
    const leaf = await this.app.workspace.ensureSideLeaf(type, side, { active: false, reveal: true });
    await leaf.loadIfDeferred();
  }

  private async revealCardDrawer(): Promise<void> {
    this.cardPlaced = true;
    const leaf = await this.app.workspace.ensureSideLeaf(RECORD_VIEW_TYPE, "right", {
      active: false,
      reveal: true,
    });
    await leaf.loadIfDeferred();
  }

  private async focusCard(): Promise<void> {
    if (!this.settings.genealogyInterface) {
      return;
    }
    this.cardPlaced = true;
    const { workspace } = this.app;
    const leaf = await workspace.ensureSideLeaf(RECORD_VIEW_TYPE, "right", { active: true, reveal: true });
    await leaf.loadIfDeferred();
    workspace.setActiveLeaf(leaf, { focus: true });
  }

  private async openIndex(): Promise<void> {
    await this.revealSidebarView(INDEX_VIEW_TYPE, "left");
  }

  private async revealSidebarView(type: string, side: "left" | "right"): Promise<void> {
    if (!this.settings.genealogyInterface) {
      return;
    }
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
    for (const leaf of this.app.workspace.getLeavesOfType(RECORD_VIEW_TYPE)) {
      if (leaf.view instanceof RecordCardView) {
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
    this.syncInterface();
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
    this.syncInterface();
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
