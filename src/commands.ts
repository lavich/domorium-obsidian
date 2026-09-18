import type { GedcomRecord } from "./editor/records";
import { plural, t, type MessageKey } from "./i18n";
import {
  gedcomLinkUrl,
  recordLinkText,
  recordSubpath,
} from "./vault/protocolLink";

export interface CommandView {
  readonly file: { path: string } | null;
  records(): GedcomRecord[];
  recordAtCursor(): GedcomRecord | undefined;
  canRenameReference(): boolean;
  problemCount(): number;
  canShowProblems(): boolean;
  goToRecord(record: GedcomRecord): void;
  goToDefinition(): boolean;
  goToNextReference(): number;
  renameReference(newName: string): boolean;
  goToNextProblem(): boolean;
  goToPreviousProblem(): boolean;
  toggleProblemsPanel(): void;
  showSearch(replace: boolean): void;
}

/** Everything outside the view, which is where `obsidian` stays. */
export interface CommandHost {
  vaultName(): string;
  /** A link the vault indexes, spelt the way this user's settings spell one. */
  linkToRecord(path: string, subpath: string, text: string): string;
  notify(message: string): void;
  copy(text: string): Promise<void>;
  chooseRecord(
    records: GedcomRecord[],
    chosen: (record: GedcomRecord) => void,
  ): void;
  askForName(entered: (newName: string) => void): void;
}

/** Obsidian's own `Hotkey`, spelt here so `obsidian` stays out of this file. */
export interface CommandHotkey {
  modifiers: ("Mod" | "Ctrl" | "Meta" | "Shift" | "Alt")[];
  key: string;
}

export interface GedcomCommand {
  id: string;
  name: MessageKey;
  icon: string;
  section?: string;
  /** The default binding, which differs by platform where Obsidian's own do. */
  hotkeys?: (mac: boolean) => CommandHotkey[];
  isAvailable(view: CommandView): boolean;
  run(host: CommandHost, view: CommandView): void;
}

const identifiedRecord = (view: CommandView): boolean =>
  view.file !== null && view.recordAtCursor()?.identifier !== undefined;

function copyRecordLink(
  host: CommandHost,
  view: CommandView,
  write: (path: string, identifier: string, text: string) => string,
): void {
  const record = view.recordAtCursor();
  const identifier = record?.identifier;
  if (!record || !identifier || !view.file) {
    host.notify(t("notice.noRecordAtCursor"));
    return;
  }
  void host.copy(write(view.file.path, identifier, recordLinkText(record))).then(
    () => {
      host.notify(t("notice.linkCopied", { identifier }));
    },
    () => {
      host.notify(t("notice.linkNotCopied"));
    },
  );
}

export const COMMANDS: GedcomCommand[] = [
  {
    id: "go-to-gedcom-record",
    name: "command.goToRecord",
    icon: "list-tree",
    isAvailable: (view) => view.records().length > 0,
    run: (host, view) => {
      host.chooseRecord(view.records(), (record) => {
        view.goToRecord(record);
      });
    },
  },
  {
    id: "copy-gedcom-record-wikilink",
    name: "command.copyLink",
    icon: "link",
    section: "copy",
    isAvailable: identifiedRecord,
    run: (host, view) =>
      copyRecordLink(host, view, (path, identifier, text) =>
        host.linkToRecord(path, recordSubpath(identifier), text),
      ),
  },
  {
    id: "copy-gedcom-record-link",
    name: "command.copyUrl",
    icon: "globe",
    section: "copy",
    isAvailable: identifiedRecord,
    run: (host, view) =>
      copyRecordLink(host, view, (path, identifier) =>
        gedcomLinkUrl(host.vaultName(), path, identifier),
      ),
  },
  {
    id: "go-to-gedcom-definition",
    name: "command.goToDefinition",
    icon: "arrow-right",
    isAvailable: () => true,
    run: (_host, view) => {
      view.goToDefinition();
    },
  },
  {
    id: "find-gedcom-references",
    name: "command.findReferences",
    icon: "search",
    isAvailable: () => true,
    run: (host, view) => {
      const referenceCount = view.goToNextReference();
      host.notify(
        referenceCount === 0
          ? t("notice.noReferences")
          : plural("notice.references", referenceCount),
      );
    },
  },
  {
    id: "rename-gedcom-reference",
    name: "command.renameReference",
    icon: "pencil",
    isAvailable: (view) => view.canRenameReference(),
    run: (host, view) => {
      host.askForName((newName) => {
        if (!view.renameReference(newName)) {
          host.notify(t("notice.renameFailed"));
        }
      });
    },
  },
  {
    id: "go-to-next-gedcom-problem",
    name: "command.nextProblem",
    icon: "chevron-down",
    isAvailable: (view) => view.problemCount() > 0,
    run: (_host, view) => {
      view.goToNextProblem();
    },
  },
  {
    id: "go-to-previous-gedcom-problem",
    name: "command.previousProblem",
    icon: "chevron-up",
    isAvailable: (view) => view.problemCount() > 0,
    run: (_host, view) => {
      view.goToPreviousProblem();
    },
  },
  {
    id: "toggle-gedcom-problems-panel",
    name: "command.toggleProblems",
    icon: "list-checks",
    isAvailable: (view) => view.canShowProblems(),
    run: (_host, view) => {
      view.toggleProblemsPanel();
    },
  },
  {
    id: "search-in-gedcom-file",
    name: "command.find",
    icon: "file-search",
    section: "find",
    isAvailable: () => true,
    run: (_host, view) => {
      view.showSearch(false);
    },
  },
  {
    id: "replace-in-gedcom-file",
    name: "command.replace",
    icon: "file-search",
    section: "find",
    // Find needs no default: Obsidian's own editor:open-search finds the view
    // by its showSearch. Its replace command cannot — the gate there wants a
    // markdown editor — so this is the one key the plugin claims itself.
    hotkeys: (mac) => [
      mac
        ? { modifiers: ["Mod", "Alt"], key: "F" }
        : { modifiers: ["Mod"], key: "H" },
    ],
    isAvailable: () => true,
    run: (_host, view) => {
      view.showSearch(true);
    },
  },
];
