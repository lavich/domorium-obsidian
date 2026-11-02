import { GedcomLanguageService, type Range } from "@domorium/language-service";
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
  type TAbstractFile,
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
import { openFromIndex } from "./desk/deskState";
import { initialFocus } from "./desk/fileTimeline";
import { buildIndex, documentRef, type GenealogyIndex } from "./genealogy";
import { IndexCache } from "./genealogy/cache";
import { leafShowingFile } from "./vault/openTabs";
import {
  parseGedcomLink,
  PROTOCOL_ACTION,
  stripEmbed,
  type GedcomLinkTarget,
} from "./vault/protocolLink";
import { MoveFollower } from "./vault/movedFiles";
import { GEDCOM_VIEW_TYPE, GedcomView, type GedcomViewHost } from "./GedcomView";
import {
  EVIDENCE_VIEW_TYPE,
  EvidenceView,
  FILE_TIMELINE_VIEW_TYPE,
  FileTimelineView,
  INDEX_VIEW_TYPE,
  IndexView,
  type DeskViewsHost,
  type FileTimelineViewHost,
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
  implements GedcomViewHost, DeskViewsHost, FileTimelineViewHost
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
  /** Placed once a session, so a panel the reader closes stays closed. */
  private evidencePlaced = false;
  /**
   * Readings for a timeline whose file no tab has open. The revision is a count
   * of the vault's changes to the path, not the file's time or size, which an
   * edit within the same second and of the same length would leave unchanged.
   */
  private readonly closedReads = new IndexCache();
  private readonly closedRevisions = new Map<string, number>();
  private readonly closedReadAt = new Map<string, number>();
  /** Never reset, so a revision taken before a path was forgotten cannot match one after. */
  private revisions = 0;
  private readonly opening = new Set<string>();
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
    this.registerView(EVIDENCE_VIEW_TYPE, (leaf) => new EvidenceView(leaf, this));
    this.registerView(FILE_TIMELINE_VIEW_TYPE, (leaf) => new FileTimelineView(leaf, this));
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
      id: "open-gedcom-evidence",
      name: t("command.openEvidence"),
      checkCallback: (checking) => {
        if (!this.settings.genealogyInterface) {
          return false;
        }
        if (!checking) {
          this.openEvidence();
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
        if (active && active !== this.followedView) {
          this.followedView = active;
          this.redrawDesk();
        }
        this.forEachTimeline((timeline) => timeline.refreshIfStale());
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
        if (!this.settings.genealogyInterface) {
          this.syncInterface();
        }
        if (this.followedView && !this.isOpen(this.followedView)) {
          this.followedView = null;
          this.redrawDesk();
        }
        this.forEachTimeline((timeline) => timeline.refreshIfStale());
      }),
    );
    this.registerEvent(
      this.app.vault.on("rename", (file, oldPath) => {
        const descendants = file instanceof TFolder ? descendantPaths(file) : [];
        this.moves.add(
          { from: oldPath, to: file.path, folder: file instanceof TFolder },
          descendants,
        );
        this.followTimelines(oldPath, file.path, descendants);
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", (file) => {
        if (!this.timelineShows(file.path)) {
          return;
        }
        this.closedRevisions.set(file.path, (this.revisions += 1));
        this.markTimelinesStale((path) => path === file.path);
      }),
    );
    const appearedOrWent = (file: TAbstractFile): void => {
      const under = (path: string): boolean =>
        path === file.path || (file instanceof TFolder && path.startsWith(`${file.path}/`));
      for (const path of [...this.closedReadAt.keys(), ...this.closedRevisions.keys()]) {
        if (under(path)) {
          this.forgetClosed(path);
        }
      }
      this.markTimelinesStale(under);
    };
    this.registerEvent(this.app.vault.on("delete", appearedOrWent));
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
      // Before the layout is ready the vault announces every file it loads as created.
      this.registerEvent(this.app.vault.on("create", appearedOrWent));
      this.syncInterface();
    });
  }

  onunload(): void {
    this.moves.stop();
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
    const path = view.file?.path;
    if (path !== undefined) {
      this.markTimelinesStale((shown) => shown === path);
    }
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
    this.evidencePlaced = false;
    this.followedView = null;
    workspace.detachLeavesOfType(INDEX_VIEW_TYPE);
    workspace.detachLeavesOfType(EVIDENCE_VIEW_TYPE);
    workspace.detachLeavesOfType(FILE_TIMELINE_VIEW_TYPE);
  }

  openFileTimeline(view: GedcomView): void {
    if (view.file) {
      void this.openTimelineOf(view.file.path, view.recordAtCursor()?.identifier);
    }
  }

  /** Matched on the saved state, so a timeline still deferred since a restart is found too. */
  private async openTimelineOf(path: string, around: string | undefined): Promise<void> {
    if (!this.settings.genealogyInterface) {
      return;
    }
    const { workspace } = this.app;
    const open = workspace
      .getLeavesOfType(FILE_TIMELINE_VIEW_TYPE)
      .find((leaf) => leaf.getViewState().state?.gedcom === path);
    if (open) {
      await workspace.revealLeaf(open);
      // revealLeaf only selects the tab, and a timeline that went stale while hidden waits to be made active.
      workspace.setActiveLeaf(open, { focus: true });
      return;
    }
    this.opening.add(path);
    try {
      const index = await this.timelineIndex(path);
      if (!index) {
        new Notice(t("notice.vaultFileNotFound", { path }));
        return;
      }
      const focus = initialFocus(index, around);
      const leaf = workspace.getLeaf("tab");
      await leaf.setViewState({
        type: FILE_TIMELINE_VIEW_TYPE,
        active: true,
        state: { gedcom: path, ...(focus === undefined ? {} : { focus }) },
      });
      await workspace.revealLeaf(leaf);
    } finally {
      this.opening.delete(path);
    }
  }

  /**
   * An open tab's reading, which holds what is typed and not yet saved; the
   * vault's only where no tab of the file is open.
   */
  async timelineIndex(path: string): Promise<GenealogyIndex | null> {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      return null;
    }
    const tab = this.openTab(path);
    if (tab) {
      return tab.genealogy();
    }
    const document = documentRef(path);
    const revision = this.closedRevisions.get(path) ?? (this.revisions += 1);
    this.closedRevisions.set(path, revision);
    const held = this.closedReads.held(document);
    if (held && this.closedReadAt.get(path) === revision) {
      return held;
    }
    const text = await this.app.vault.cachedRead(file);
    if (!this.timelineShows(path) && !this.opening.has(path)) {
      return buildIndex(new GedcomLanguageService(text));
    }
    this.closedReadAt.set(path, revision);
    return this.closedReads.at(document, String(revision), () => new GedcomLanguageService(text));
  }

  timelineClosed(path: string, view: FileTimelineView): void {
    if (!this.timelineShows(path, view)) {
      this.forgetClosed(path);
    }
  }

  private forgetClosed(path: string): void {
    this.closedReads.forget(documentRef(path));
    this.closedReadAt.delete(path);
    this.closedRevisions.delete(path);
  }

  private timelineShows(path: string, except?: FileTimelineView): boolean {
    return this.app.workspace
      .getLeavesOfType(FILE_TIMELINE_VIEW_TYPE)
      .some((leaf) => leaf.view !== except && leaf.getViewState().state?.gedcom === path);
  }

  async openPersonIn(path: string, xref: string): Promise<void> {
    const tab = await this.bringFileTab(path);
    if (tab) {
      openFromIndex(tab, xref);
    }
  }

  async showSourceIn(path: string, range: Range): Promise<void> {
    (await this.bringFileTab(path))?.showInSource(range);
  }

  /** The timeline covers the main area, so the tab it leads into is brought in front of it. */
  private async bringFileTab(path: string): Promise<GedcomView | null> {
    const { workspace } = this.app;
    let leaf = leafShowingFile(path, (visit) => {
      workspace.getLeavesOfType(GEDCOM_VIEW_TYPE).forEach(visit);
    });
    if (!leaf) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (!(file instanceof TFile)) {
        new Notice(t("notice.vaultFileNotFound", { path }));
        return null;
      }
      leaf = workspace.getLeaf("tab");
      await leaf.openFile(file);
    }
    await leaf.loadIfDeferred();
    await workspace.revealLeaf(leaf);
    workspace.setActiveLeaf(leaf, { focus: true });
    return leaf.view instanceof GedcomView ? leaf.view : null;
  }

  /** Two tabs of one file can differ by what is typed and unsaved, so the one last worked in answers. */
  private openTab(path: string): GedcomView | null {
    if (this.followedView?.file?.path === path && this.isOpen(this.followedView)) {
      return this.followedView;
    }
    for (const leaf of this.app.workspace.getLeavesOfType(GEDCOM_VIEW_TYPE)) {
      if (leaf.view instanceof GedcomView && leaf.view.file?.path === path) {
        return leaf.view;
      }
    }
    return null;
  }

  private forEachTimeline(run: (view: FileTimelineView) => void): void {
    for (const leaf of this.app.workspace.getLeavesOfType(FILE_TIMELINE_VIEW_TYPE)) {
      if (leaf.view instanceof FileTimelineView) {
        run(leaf.view);
      }
    }
  }

  private markTimelinesStale(shows: (path: string) => boolean): void {
    this.forEachTimeline((timeline) => {
      const path = timeline.gedcom();
      if (path !== null && shows(path)) {
        timeline.markStale();
      }
    });
  }

  /** Rewritten in the saved state too, which is all a timeline still deferred since a restart has. */
  private followTimelines(from: string, to: string, descendants: string[]): void {
    const moved = new Map<string, string>([
      [from, to],
      ...descendants.map((path): [string, string] => [`${from}${path.slice(to.length)}`, path]),
    ]);
    for (const leaf of this.app.workspace.getLeavesOfType(FILE_TIMELINE_VIEW_TYPE)) {
      const { type, state } = leaf.getViewState();
      const gedcom = state?.gedcom;
      const next = typeof gedcom === "string" ? moved.get(gedcom) : undefined;
      if (next !== undefined) {
        void leaf.setViewState({ type, state: { ...state, gedcom: next } });
      }
    }
  }

  private async placeEvidence(): Promise<void> {
    if (!this.settings.genealogyInterface || this.evidencePlaced) {
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
      openFileTimeline: (path, around) => {
        void this.openTimelineOf(path, around);
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
