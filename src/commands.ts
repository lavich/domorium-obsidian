import type { GedcomRecord } from "./editor/records";
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
  name: string;
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
    host.notify("GEDCOM: no record with an identifier at the cursor");
    return;
  }
  void host.copy(write(view.file.path, identifier, recordLinkText(record))).then(
    () => {
      host.notify(`GEDCOM: link to ${identifier} copied`);
    },
    () => {
      host.notify("GEDCOM: the link could not be copied");
    },
  );
}

export const COMMANDS: GedcomCommand[] = [
  {
    id: "go-to-gedcom-record",
    name: "Go to record",
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
    name: "Copy link to record",
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
    name: "Copy Obsidian URL to record",
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
    name: "Go to definition",
    icon: "arrow-right",
    isAvailable: () => true,
    run: (_host, view) => {
      view.goToDefinition();
    },
  },
  {
    id: "find-gedcom-references",
    name: "Find references",
    icon: "search",
    isAvailable: () => true,
    run: (host, view) => {
      const referenceCount = view.goToNextReference();
      host.notify(
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
    run: (host, view) => {
      host.askForName((newName) => {
        if (!view.renameReference(newName)) {
          host.notify("GEDCOM reference could not be renamed");
        }
      });
    },
  },
  {
    id: "go-to-next-gedcom-problem",
    name: "Go to next problem",
    icon: "chevron-down",
    isAvailable: (view) => view.problemCount() > 0,
    run: (_host, view) => {
      view.goToNextProblem();
    },
  },
  {
    id: "go-to-previous-gedcom-problem",
    name: "Go to previous problem",
    icon: "chevron-up",
    isAvailable: (view) => view.problemCount() > 0,
    run: (_host, view) => {
      view.goToPreviousProblem();
    },
  },
  {
    id: "toggle-gedcom-problems-panel",
    name: "Toggle problems panel",
    icon: "list-checks",
    isAvailable: (view) => view.canShowProblems(),
    run: (_host, view) => {
      view.toggleProblemsPanel();
    },
  },
  {
    id: "search-in-gedcom-file",
    name: "Find...",
    icon: "file-search",
    section: "find",
    isAvailable: () => true,
    run: (_host, view) => {
      view.showSearch(false);
    },
  },
  {
    id: "replace-in-gedcom-file",
    name: "Replace...",
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
