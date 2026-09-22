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
} from "obsidian";

import { createGedcomApi, type GedcomApi, type VaultReader } from "./api";
import { IndexCache } from "./genealogy/cache";
import { documentRef, type DocumentRef, type PersonRef } from "./genealogy";
import { PeopleView, PEOPLE_VIEW_TYPE, type PeopleViewHost } from "./people/PeopleView";
import {
  PersonView,
  PERSON_VIEW_TYPE,
  type PersonViewHost,
} from "./person/PersonView";
import { COMMANDS, type CommandHost } from "./commands";
import { recordText, type GedcomRecord } from "./editor/records";
import { formatStatus } from "./editor/status";
import { setLanguage, t } from "./i18n";
import { registerRecordEmbeds } from "./notes/embedRegistry";
import { blockDialect, renderGedcomBlock } from "./notes/gedcomBlock";
import { RecordIndex } from "./notes/recordIndex";
import { RecordSuggest } from "./notes/recordSuggest";
import { leafShowingFile } from "./vault/openTabs";
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
  mayNameAFile,
  retargetMedia,
} from "./vault/renamedMedia";
import { GEDCOM_VIEW_TYPE, GedcomView, type GedcomViewHost } from "./GedcomView";
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

export default class GedcomPlugin extends Plugin implements GedcomViewHost {
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
  /** One reading per revision of a document, shared by every view that reads. */
  private readonly genealogy = new IndexCache();

  async onload(): Promise<void> {
    setLanguage(getLanguage());
    this.settings = parseSettings(await this.loadData());
    addIcon(GEDCOM_ICON_ID, GEDCOM_ICON_SVG);
    this.registerView(
      GEDCOM_VIEW_TYPE,
      (leaf) => new GedcomView(leaf, this.settings, this),
    );
    this.registerExtensions(["ged", "gedcom"], GEDCOM_VIEW_TYPE);
    this.registerView(
      PEOPLE_VIEW_TYPE,
      (leaf) => new PeopleView(leaf, this.peopleHost()),
    );
    this.registerView(
      PERSON_VIEW_TYPE,
      (leaf) => new PersonView(leaf, this.personHost()),
    );
    this.addCommand({
      id: "open-people",
      name: t("people.command"),
      callback: () => {
        void this.revealPeople();
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
        this.forEachPeopleView((view) => {
          view.refresh();
        });
        this.forEachPersonView((view) => {
          view.refresh();
        });
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

  /**
   * The people list, revealed rather than opened a second time. A reader who
   * runs the command with the view already in a collapsed sidebar wants that
   * one brought forward.
   */
  private async revealPeople(): Promise<void> {
    const existing = this.app.workspace.getLeavesOfType(PEOPLE_VIEW_TYPE)[0];
    if (existing) {
      await this.app.workspace.revealLeaf(existing);
      return;
    }
    const leaf = this.app.workspace.getLeftLeaf(false);
    if (!leaf) {
      return;
    }
    await leaf.setViewState({ type: PEOPLE_VIEW_TYPE, active: true });
    await this.app.workspace.revealLeaf(leaf);
  }

  private peopleHost(): PeopleViewHost {
    return {
      activeDocument: () => {
        const view = this.app.workspace.getActiveViewOfType(GedcomView);
        const path = view?.file?.path;
        if (!view || !path) {
          return null;
        }
        return {
          document: documentRef(path),
          revision: view.documentRevision(),
        };
      },
      symbolsOf: (document: DocumentRef) =>
        this.gedcomViewOf(document)?.documentSymbols() ?? [],
      openPerson: (person: PersonRef, name?: string) => {
        void this.openPerson(person, name);
      },
      shownPerson: () => {
        let found: PersonRef | null = null;
        this.forEachPersonView((view) => {
          found = found ?? view.showing();
        });
        return found;
      },
      indexes: () => this.genealogy,
    };
  }

  /** The open view showing a document, where one is open. */
  private gedcomViewOf(document: DocumentRef): GedcomView | undefined {
    let found: GedcomView | undefined;
    this.forEachView((view) => {
      if (found === undefined && view.file?.path === document.path) {
        found = view;
      }
    });
    return found;
  }

  /**
   * One Person view, reused. Choosing a second person shows them in the tab
   * the first was in, which is also what makes Back walk the trail.
   */
  private async openPerson(person: PersonRef, name?: string): Promise<void> {
    const named = name === undefined ? {} : { name };
    const existing = this.app.workspace.getLeavesOfType(PERSON_VIEW_TYPE)[0];
    const leaf = existing ?? this.app.workspace.getLeaf("tab");
    await leaf.setViewState({
      type: PERSON_VIEW_TYPE,
      active: true,
      state: { path: person.document.path, xref: person.xref, ...named },
    });
    await this.app.workspace.revealLeaf(leaf);
    this.forEachPeopleView((view) => {
      view.markShownPerson();
    });
  }

  private personHost(): PersonViewHost {
    return {
      read: (person) => {
        const view = this.gedcomViewOf(person.document);
        if (!view) {
          return null;
        }
        const index = this.genealogy.at(
          person.document,
          view.documentRevision(),
          () => view.documentSymbols(),
        );
        return index.person(person.xref) ?? null;
      },
      openSource: (person) => {
        void this.openRecord(person);
      },
      // A vault file only. A web address answers nothing, which is how the
      // page keeps its promise not to fetch one: that question is the media
      // preview's, with a setting of its own, and is not answered twice.
      openPicture: (target) => {
        void this.openPicture(target);
      },
      resolveMedia: (target) => {
        if (/^[a-z][a-z0-9+.-]*:/iu.test(target)) {
          return null;
        }
        const file = this.app.vault.getAbstractFileByPath(normalizePath(target));
        return file instanceof TFile ? this.app.vault.getResourcePath(file) : null;
      },
    };
  }

  /**
   * The record behind a person. The same path an `obsidian://` link already
   * takes: open or reveal the file, then put the cursor on the record.
   */
  /**
   * The picture itself, whole. A tab rather than a popout window: the mobile
   * app has no popout, which is the same reason `GedcomView` opens a vault
   * file in a tab.
   */
  private async openPicture(target: string): Promise<void> {
    const path = normalizePath(target);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(t("notice.vaultFileNotFound", { path }));
      return;
    }
    const open = leafShowingFile(path, (visit) =>
      this.app.workspace.iterateAllLeaves(visit),
    );
    if (open) {
      await this.app.workspace.revealLeaf(open);
      return;
    }
    await this.app.workspace.getLeaf("tab").openFile(file);
  }

  private async openRecord(person: PersonRef): Promise<void> {
    const path = normalizePath(person.document.path);
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(t("person.notInVault", { path }));
      return;
    }
    const open = leafShowingFile(path, (visit) =>
      this.app.workspace.iterateAllLeaves(visit),
    );
    if (open) {
      await this.app.workspace.revealLeaf(open);
    } else {
      await this.app.workspace.getLeaf("tab").openFile(file);
    }
    const view = this.gedcomViewOf(person.document);
    if (!view?.goToXref(person.xref)) {
      new Notice(t("notice.xrefNotInFile", { xref: person.xref, file: file.name }));
    }
  }

  private forEachPersonView(run: (view: PersonView) => void): void {
    this.app.workspace.getLeavesOfType(PERSON_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof PersonView) {
        run(leaf.view);
      }
    });
  }

  private forEachPeopleView(run: (view: PeopleView) => void): void {
    this.app.workspace.getLeavesOfType(PEOPLE_VIEW_TYPE).forEach((leaf) => {
      if (leaf.view instanceof PeopleView) {
        run(leaf.view);
      }
    });
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
