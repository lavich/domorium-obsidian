import type { GedcomRecord } from "./editor/records";
import { gedcomLinkUrl } from "./vault/protocolLink";

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
  openSearch(replace: boolean): void;
}

/** Everything outside the view, which is where `obsidian` stays. */
export interface CommandHost {
  vaultName(): string;
  notify(message: string): void;
  copy(text: string): Promise<void>;
  chooseRecord(
    records: GedcomRecord[],
    chosen: (record: GedcomRecord) => void,
  ): void;
  askForName(entered: (newName: string) => void): void;
}

export interface GedcomCommand {
  id: string;
  name: string;
  icon: string;
  isAvailable(view: CommandView): boolean;
  run(host: CommandHost, view: CommandView): void;
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
    id: "copy-gedcom-record-link",
    name: "Copy link to record",
    icon: "link",
    isAvailable: (view) =>
      view.file !== null && view.recordAtCursor()?.identifier !== undefined,
    run: (host, view) => {
      const identifier = view.recordAtCursor()?.identifier;
      if (!identifier || !view.file) {
        host.notify("GEDCOM: no record with an identifier at the cursor");
        return;
      }
      const url = gedcomLinkUrl(host.vaultName(), view.file.path, identifier);
      void host.copy(url).then(
        () => {
          host.notify(`GEDCOM: link to ${identifier} copied`);
        },
        () => {
          host.notify("GEDCOM: the link could not be copied");
        },
      );
    },
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
    name: "Search in file",
    icon: "text-search",
    isAvailable: () => true,
    run: (_host, view) => {
      view.openSearch(false);
    },
  },
  {
    id: "replace-in-gedcom-file",
    name: "Search and replace in file",
    icon: "replace",
    isAvailable: () => true,
    run: (_host, view) => {
      view.openSearch(true);
    },
  },
];
