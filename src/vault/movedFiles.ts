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
