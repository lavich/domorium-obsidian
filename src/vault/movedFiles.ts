import {
  encodeFileTarget,
  GedcomLanguageService,
  mentionsFile,
  relativeFilePath,
  resolveFileTarget,
  type Position,
  type TextEdit,
  type WorkspaceEdit,
} from "@domorium/language-service";

import { plural, t } from "../i18n";

const GEDCOM_EXTENSIONS = ["ged", "gedcom"];

export function isGedcomPath(path: string): boolean {
  const dot = path.lastIndexOf(".");
  return (
    dot > 0 && GEDCOM_EXTENSIONS.includes(path.slice(dot + 1).toLowerCase())
  );
}

export function applyEdits(text: string, edit: WorkspaceEdit): string {
  const lineStarts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "\n") {
      lineStarts.push(index + 1);
    }
  }
  const offsetOf = (position: Position): number =>
    (lineStarts[position.line] ?? text.length) + position.character;

  return [...edit.edits]
    .sort(
      (left, right) => offsetOf(right.range.start) - offsetOf(left.range.start),
    )
    .reduce(
      (result, { range, newText }) =>
        result.slice(0, offsetOf(range.start)) +
        newText +
        result.slice(offsetOf(range.end)),
      text,
    );
}

export interface Rename {
  from: string;
  to: string;
  folder: boolean;
}

function within(path: string, folder: string): boolean {
  return path.startsWith(`${folder}/`);
}

export class Move {
  private readonly files = new Map<string, string>();
  private readonly folders: Rename[];

  constructor(readonly renames: readonly Rename[]) {
    for (const rename of renames) {
      if (!rename.folder) {
        this.files.set(rename.from, rename.to);
      }
    }
    this.folders = renames.filter((rename) => rename.folder);
  }

  after(path: string): string {
    const file = this.files.get(path);
    if (file !== undefined) {
      return file;
    }
    const folder = this.longestFolder(path, "from");
    return folder ? folder.to + path.slice(folder.from.length) : path;
  }

  before(path: string): string {
    for (const [from, to] of this.files) {
      if (to === path) {
        return from;
      }
    }
    const folder = this.longestFolder(path, "to");
    return folder ? folder.from + path.slice(folder.to.length) : path;
  }

  private longestFolder(path: string, side: "from" | "to"): Rename | undefined {
    let longest: Rename | undefined;
    for (const folder of this.folders) {
      if (
        within(path, folder[side]) &&
        folder[side].length > (longest?.[side].length ?? -1)
      ) {
        longest = folder;
      }
    }
    return longest;
  }
}

export interface Timers {
  setTimeout(callback: () => void, delay: number): number;
  clearTimeout(id: number): void;
}

const FALLBACK_MS = 2000;

export class RenameBatch {
  private renames: Rename[] = [];
  private readonly expected = new Set<string>();
  private timer: number | null = null;

  constructor(
    private readonly flush: (move: Move) => void,
    private readonly timers: Timers,
  ) {}

  add(rename: Rename, descendants: readonly string[] = []): void {
    if (this.renames.length > 0 && !this.belongs(rename)) {
      this.flushNow();
    }
    this.expected.delete(rename.from);
    this.renames.push(rename);
    for (const path of descendants) {
      this.expected.add(path);
    }
    this.cancelTimer();
    // Obsidian reports a folder's entries after the folder, and on Linux or
    // through a symlink only after awaiting a new watcher, so a later task.
    this.timer = this.timers.setTimeout(
      () => {
        this.flushNow();
      },
      this.expected.size === 0 ? 0 : FALLBACK_MS,
    );
  }

  pending(): Move {
    return new Move(this.renames);
  }

  cancel(): void {
    this.cancelTimer();
    this.renames = [];
    this.expected.clear();
  }

  private belongs(rename: Rename): boolean {
    return (
      this.expected.has(rename.from) ||
      this.renames.some(
        (earlier) =>
          earlier.folder &&
          within(rename.from, earlier.from) &&
          within(rename.to, earlier.to),
      )
    );
  }

  private flushNow(): void {
    const move = new Move(this.renames);
    this.cancel();
    this.flush(move);
  }

  private cancelTimer(): void {
    if (this.timer !== null) {
      this.timers.clearTimeout(this.timer);
      this.timer = null;
    }
  }
}

type Dialect = ReturnType<
  ReturnType<GedcomLanguageService["getDocument"]>["getDialect"]
>;
type Node = ReturnType<
  ReturnType<GedcomLanguageService["getDocument"]>["getNodes"]
>[number];

function continuedLines(service: GedcomLanguageService): Set<number> {
  const lines = new Set<number>();
  const visit = (node: Node): void => {
    for (const child of node.children) {
      const tag = child.tokens.TAG?.value;
      if (tag === "CONC" || tag === "CONT") {
        lines.add(node.range.start.line);
      }
      visit(child);
    }
  };
  service.getDocument().getNodes().forEach(visit);
  return lines;
}

function readsAs(
  payload: string,
  dialect: Dialect,
  documentPath: string,
  path: string,
): boolean {
  // The fragment option's dialect is not honored in 2.3.0, so a header names it.
  const links = new GedcomLanguageService(
    `0 HEAD\n1 GEDC\n2 VERS ${dialect ?? "7.0"}\n0 @O1@ OBJE\n1 FILE ${payload}\n`,
  ).getDocumentLinks();
  const [link] = links;
  return (
    links.length === 1 &&
    link?.kind === "file-relative" &&
    resolveFileTarget(documentPath, link.targetText, dialect) === path
  );
}

export interface MovePlan {
  edit: WorkspaceEdit;
  /** Payloads the move concerns that this document has no way to rewrite. */
  stranded: number;
}

export function planMove(
  service: GedcomLanguageService,
  documentPath: string,
  move: Move,
  version = 0,
): MovePlan {
  const dialect = service.getDocument().getDialect();
  const stoodAt = move.before(documentPath);
  const relative = service
    .getDocumentLinks()
    .filter((link) => link.kind === "file-relative");
  const continued = relative.length > 0 ? continuedLines(service) : new Set();
  const edits: TextEdit[] = [];
  let stranded = 0;

  for (const link of relative) {
    const named = resolveFileTarget(stoodAt, link.targetText, dialect);
    if (named === null) {
      continue;
    }
    const target = move.after(named);
    if (resolveFileTarget(documentPath, link.targetText, dialect) === target) {
      continue;
    }
    const payload = encodeFileTarget(
      relativeFilePath(documentPath, target),
      dialect,
    );
    if (
      continued.has(link.range.start.line) ||
      !readsAs(payload, dialect, documentPath, target)
    ) {
      stranded += 1;
      continue;
    }
    edits.push({ range: link.range, newText: payload });
  }
  return { edit: { version, edits }, stranded };
}

function lastSegment(path: string): string {
  return path.slice(path.lastIndexOf("/") + 1);
}

function mayConcern(text: string, documentPath: string, move: Move): boolean {
  if (
    move.before(documentPath) !== documentPath ||
    /%[0-9A-Fa-f]{2}/.test(text)
  ) {
    return true;
  }
  return move.renames.some(({ from, folder }) => {
    if (!folder) {
      return mentionsFile(text, from);
    }
    const name = lastSegment(from);
    return text.includes(`${name}/`) || text.includes(`${name}\\`);
  });
}

export interface ClosedMove {
  write: string | null;
  count: number;
  stranded: number;
}

export function planClosedMove(
  text: string,
  documentPath: string,
  move: Move,
): ClosedMove {
  if (!mayConcern(text, documentPath, move)) {
    return { write: null, count: 0, stranded: 0 };
  }
  const { edit, stranded } = planMove(
    new GedcomLanguageService(text),
    documentPath,
    move,
  );
  const count = edit.edits.length;
  return {
    write: count === 0 ? null : applyEdits(text, edit),
    count,
    stranded,
  };
}

export interface Outcome {
  count: number;
  stranded: number;
}

export interface ClosedFile {
  read(): Promise<string>;
  process(change: (current: string) => string): Promise<unknown>;
}

export async function moveClosedFile(
  file: ClosedFile,
  documentPath: () => string,
  move: Move,
): Promise<Outcome> {
  const text = await file.read();
  const plannedAt = documentPath();
  const { write, count, stranded } = planClosedMove(text, plannedAt, move);
  // process writes whatever it is handed, so a file with nothing to change
  // is never given to it: every GEDCOM in the vault would be rewritten, and
  // its modification time is what Sync and the file list go by.
  if (write === null) {
    return { count: 0, stranded };
  }
  await file.process((current) => {
    const at = documentPath();
    return current === text && at === plannedAt
      ? write
      : (planClosedMove(current, at, move).write ?? current);
  });
  return { count, stranded };
}

export interface MovedFile {
  readonly path: string;
}

export interface OpenDocument {
  followMove(move: Move, documentPath: string): Outcome;
}

export interface MoveHost<F extends MovedFile> {
  files(): readonly F[];
  openView(file: F): OpenDocument | null;
  read(file: F): Promise<string>;
  process(file: F, change: (current: string) => string): Promise<unknown>;
  notify(message: string): void;
}

export class MoveFollower<F extends MovedFile> {
  private readonly batch: RenameBatch;
  private readonly unfollowed: Move[] = [];
  private chain: Promise<void> = Promise.resolve();
  private stopped = false;

  constructor(
    private readonly host: MoveHost<F>,
    timers: Timers,
  ) {
    this.batch = new RenameBatch((move) => {
      this.unfollowed.push(move);
      this.chain = this.chain
        .then(() => this.follow(move))
        .catch((error: unknown) => {
          console.error("Domorium: a move could not be followed", error);
        })
        .then(() => {
          this.unfollowed.splice(this.unfollowed.indexOf(move), 1);
        });
    }, timers);
  }

  add(rename: Rename, descendants: readonly string[] = []): void {
    this.batch.add(rename, descendants);
  }

  stop(): void {
    this.stopped = true;
    this.batch.cancel();
  }

  idle(): Promise<void> {
    return this.chain;
  }

  /**
   * Obsidian has already moved the file for every rename it reported since,
   * including those of a batch still open, so they are undone, newest first.
   */
  private standing(move: Move, file: F): string {
    const later = [
      ...this.unfollowed.slice(this.unfollowed.indexOf(move) + 1),
      this.batch.pending(),
    ];
    return later.reduceRight((path, since) => since.before(path), file.path);
  }

  private async follow(move: Move): Promise<void> {
    let payloads = 0;
    let files = 0;
    let stranded = 0;
    let unreadable = 0;
    for (const file of this.host.files()) {
      if (this.stopped) {
        return;
      }
      if (!isGedcomPath(file.path)) {
        continue;
      }
      try {
        const view = this.host.openView(file);
        const result = view
          ? view.followMove(move, this.standing(move, file))
          : await moveClosedFile(
              {
                read: () => this.host.read(file),
                process: (change) => this.host.process(file, change),
              },
              () => this.standing(move, file),
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

    if (this.stopped) {
      return;
    }
    if (payloads > 0) {
      this.host.notify(describeRetarget(payloads, files));
    }
    if (stranded > 0) {
      this.host.notify(describeStranded(stranded));
    }
    if (unreadable > 0) {
      this.host.notify(describeUnreadable(unreadable));
    }
  }
}

export function describeRetarget(payloads: number, files: number): string {
  return t("notice.retargeted", {
    links: plural("count.mediaLinks", payloads),
    files: plural("count.filesIn", files),
  });
}

export function describeUnreadable(files: number): string {
  return t("notice.unreadable", { files: plural("count.files", files) });
}

export function describeStranded(payloads: number): string {
  return t("notice.stranded", {
    links: plural("count.mediaLinks", payloads),
  });
}
