import { GedcomLanguageService } from "@domorium/language-service";
import { afterEach, describe, expect, it, vi } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import {
  describeRetarget,
  describeStranded,
  describeUnreadable,
  isGedcomPath,
  Move,
  moveClosedFile,
  MoveFollower,
  type MoveHost,
  planClosedMove,
  planMove,
  RenameBatch,
  type Rename,
  type Timers,
} from "./movedFiles";

function gedcom(dialect: "7.0" | "5.5.1", ...payloads: string[]): string {
  return [
    "0 HEAD",
    "1 GEDC",
    `2 VERS ${dialect}`,
    "0 @O1@ OBJE",
    ...payloads.map((payload) => `1 FILE ${payload}`),
    "0 TRLR",
    "",
  ].join("\n");
}

function file(from: string, to: string): Rename {
  return { from, to, folder: false };
}

function folder(from: string, to: string): Rename {
  return { from, to, folder: true };
}

class FakeTimers implements Timers {
  private pending = new Map<number, { callback: () => void; delay: number }>();
  private next = 1;

  setTimeout(callback: () => void, delay: number): number {
    const id = this.next++;
    this.pending.set(id, { callback, delay });
    return id;
  }

  clearTimeout(id: number): void {
    this.pending.delete(id);
  }

  delays(): number[] {
    return [...this.pending.values()].map(({ delay }) => delay);
  }

  run(): void {
    const due = [...this.pending.values()];
    this.pending.clear();
    for (const { callback } of due) {
      callback();
    }
  }
}

function batch(): { batch: RenameBatch; timers: FakeTimers; moves: Move[] } {
  const timers = new FakeTimers();
  const moves: Move[] = [];
  return {
    batch: new RenameBatch((move) => moves.push(move), timers),
    timers,
    moves,
  };
}

interface FakeFile {
  path: string;
  text: string;
}

function follower(
  files: FakeFile[],
  host: Partial<MoveHost<FakeFile>> = {},
): { follower: MoveFollower<FakeFile>; timers: FakeTimers; notices: string[] } {
  const timers = new FakeTimers();
  const notices: string[] = [];
  return {
    follower: new MoveFollower<FakeFile>(
      {
        files: () => files,
        openView: () => null,
        read: (moved) => Promise.resolve(moved.text),
        process: (moved, change) => {
          moved.text = change(moved.text);
          return Promise.resolve(moved.text);
        },
        notify: (message) => notices.push(message),
        ...host,
      },
      timers,
    ),
    timers,
    notices,
  };
}

function moveFile(
  moves: MoveFollower<FakeFile>,
  moved: FakeFile,
  to: string,
): void {
  const from = moved.path;
  moved.path = to;
  moves.add(file(from, to));
}

describe("a move", () => {
  it("takes a renamed file to its new path", () => {
    const move = new Move([file("photos/a.jpg", "photos/b.jpg")]);

    expect(move.after("photos/a.jpg")).toBe("photos/b.jpg");
    expect(move.after("photos/c.jpg")).toBe("photos/c.jpg");
  });

  it("takes everything under a renamed folder along with it", () => {
    const move = new Move([folder("media", "pics")]);

    expect(move.after("media/a.jpg")).toBe("pics/a.jpg");
    expect(move.after("media/old/b.jpg")).toBe("pics/old/b.jpg");
  });

  it("does not take a folder whose name only starts the same", () => {
    const move = new Move([folder("media", "pics")]);

    expect(move.after("media2/a.jpg")).toBe("media2/a.jpg");
    expect(move.after("media")).toBe("media");
  });

  it("follows nested folders renamed together", () => {
    const move = new Move([
      folder("family", "kin"),
      folder("family/photos", "kin/photos"),
      file("family/photos/a.jpg", "kin/photos/a.jpg"),
    ]);

    expect(move.after("family/photos/b.jpg")).toBe("kin/photos/b.jpg");
    expect(move.after("family/tree.ged")).toBe("kin/tree.ged");
  });

  it("takes the longest folder a path sits under", () => {
    const move = new Move([
      folder("media", "pics"),
      folder("media/old", "archive"),
    ]);

    expect(move.after("media/old/a.jpg")).toBe("archive/a.jpg");
    expect(move.after("media/new/a.jpg")).toBe("pics/new/a.jpg");
  });

  it("puts a file's own rename before its folder's", () => {
    const move = new Move([
      folder("media", "pics"),
      file("media/a.jpg", "elsewhere/a.jpg"),
    ]);

    expect(move.after("media/a.jpg")).toBe("elsewhere/a.jpg");
  });

  it("reads back from after to before", () => {
    const move = new Move([
      folder("media", "pics"),
      folder("media/old", "archive"),
      file("tree.ged", "family/tree.ged"),
    ]);

    for (const path of [
      "media/a.jpg",
      "media/old/a.jpg",
      "tree.ged",
      "untouched.jpg",
    ]) {
      expect(move.before(move.after(path))).toBe(path);
    }
  });
});

describe("the renames of one action", () => {
  it("gives one move for a folder and its entries, the media first", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("family", "kin"), [
      "family/photos",
      "family/photos/a.jpg",
      "family/tree.ged",
    ]);
    renames.add(folder("family/photos", "kin/photos"));
    renames.add(file("family/photos/a.jpg", "kin/photos/a.jpg"));
    renames.add(file("family/tree.ged", "kin/tree.ged"));
    timers.run();

    expect(moves).toHaveLength(1);
    expect(moves[0]?.renames).toHaveLength(4);
  });

  it("gives one move for a folder and its entries, the GEDCOM file first", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("family", "kin"), [
      "family/tree.ged",
      "family/photos",
      "family/photos/a.jpg",
    ]);
    renames.add(file("family/tree.ged", "kin/tree.ged"));
    renames.add(folder("family/photos", "kin/photos"));
    renames.add(file("family/photos/a.jpg", "kin/photos/a.jpg"));
    timers.run();

    expect(moves).toHaveLength(1);
    expect(moves[0]?.renames).toHaveLength(4);
  });

  it("waits for entries reported in a later task", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("family", "kin"), ["family/tree.ged"]);
    expect(timers.delays()).toEqual([2000]);

    renames.add(file("family/tree.ged", "kin/tree.ged"));
    expect(timers.delays()).toEqual([0]);
    timers.run();

    expect(moves).toHaveLength(1);
    expect(moves[0]?.renames).toHaveLength(2);
  });

  it("flushes after the fallback when an entry is never reported", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("family", "kin"), ["family/tree.ged"]);
    timers.run();

    expect(moves).toHaveLength(1);
    expect(moves[0]?.after("family/tree.ged")).toBe("kin/tree.ged");
  });

  it("flushes the waiting batch first when an unrelated rename arrives", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("family", "kin"), ["family/tree.ged"]);
    renames.add(file("notes/a.jpg", "notes/b.jpg"));

    expect(moves).toHaveLength(1);
    expect(moves[0]?.renames).toEqual([folder("family", "kin")]);

    timers.run();
    expect(moves).toHaveLength(2);
    expect(moves[1]?.renames).toEqual([file("notes/a.jpg", "notes/b.jpg")]);
  });

  it("gives two moves for a folder renamed twice in a row", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("media", "pics"), []);
    timers.run();
    renames.add(folder("pics", "img"), []);
    timers.run();

    expect(moves).toHaveLength(2);
  });

  it("keeps the second of two back-to-back renames out of the first", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(folder("media", "pics"), []);
    renames.add(folder("pics", "img"), []);
    timers.run();

    expect(moves.map((move) => move.renames)).toEqual([
      [folder("media", "pics")],
      [folder("pics", "img")],
    ]);
  });

  it("drops a pending batch when cancelled", () => {
    const { batch: renames, timers, moves } = batch();

    renames.add(file("a.jpg", "b.jpg"));
    renames.cancel();
    timers.run();

    expect(moves).toEqual([]);
    expect(timers.delays()).toEqual([]);
  });
});

describe("a GEDCOM file's payloads after a move", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("escapes a photograph renamed with a space, in GEDCOM 7", () => {
    const planned = planClosedMove(
      gedcom("7.0", "photos/a.jpg"),
      "tree.ged",
      new Move([file("photos/a.jpg", "photos/new photo.jpg")]),
    );

    expect(planned.count).toBe(1);
    expect(planned.write).toContain("1 FILE photos/new%20photo.jpg\n");
  });

  it("strands a photograph moved above a GEDCOM 7 file", () => {
    const text = gedcom("7.0", "photos/a.jpg");

    const planned = planClosedMove(
      text,
      "family/tree.ged",
      new Move([file("family/photos/a.jpg", "a.jpg")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 1 });
  });

  it("climbs to a photograph moved above a GEDCOM 5.5.1 file", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "photos/a.jpg"),
      "family/tree.ged",
      new Move([file("family/photos/a.jpg", "a.jpg")]),
    );

    expect(planned.write).toContain("1 FILE ../a.jpg\n");
  });

  it("neither parses nor writes a closed file that names no such photograph", () => {
    const parse = vi.spyOn(GedcomLanguageService.prototype, "update");

    const planned = planClosedMove(
      gedcom("7.0", "photos/b.jpg", "scans/c.jpg"),
      "tree.ged",
      new Move([file("photos/a.jpg", "photos/renamed.jpg")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 0 });
    expect(parse).not.toHaveBeenCalled();
  });

  it("does not write a closed file whose payload names another file of that name", () => {
    const planned = planClosedMove(
      gedcom("7.0", "scans/a.jpg"),
      "tree.ged",
      new Move([file("photos/a.jpg", "photos/renamed.jpg")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 0 });
  });

  it("rewrites a closed file naming the photograph percent-escaped", () => {
    const planned = planClosedMove(
      gedcom("7.0", "photos/my%20photo.jpg"),
      "tree.ged",
      new Move([file("photos/my photo.jpg", "photos/b.jpg")]),
    );

    expect(planned.write).toContain("1 FILE photos/b.jpg\n");
  });

  it("climbs out of the folder a GEDCOM 5.5.1 file moved into", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "media/a.jpg", "media\\c.jpg"),
      "family/tree.ged",
      new Move([file("tree.ged", "family/tree.ged")]),
    );

    expect(planned.count).toBe(2);
    expect(planned.write).toContain("1 FILE ../media/a.jpg\n");
    expect(planned.write).toContain("1 FILE ../media/c.jpg\n");
  });

  it("names the folder a GEDCOM 7 file moved out of", () => {
    const planned = planClosedMove(
      gedcom("7.0", "photos/a.jpg"),
      "tree.ged",
      new Move([file("family/tree.ged", "tree.ged")]),
    );

    expect(planned.write).toContain("1 FILE family/photos/a.jpg\n");
  });

  it("strands the payloads of a GEDCOM 7 file moved into a folder", () => {
    const planned = planClosedMove(
      gedcom("7.0", "media/a.jpg"),
      "family/tree.ged",
      new Move([file("tree.ged", "family/tree.ged")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 1 });
  });

  it("leaves a folder holding a GEDCOM file and its media alone, whatever order its entries come in", () => {
    const text = gedcom("7.0", "photos/a.jpg");
    const entries = [
      file("family/tree.ged", "kin/tree.ged"),
      folder("family/photos", "kin/photos"),
      file("family/photos/a.jpg", "kin/photos/a.jpg"),
    ];

    for (const order of [entries, [...entries].reverse(), []]) {
      const move = new Move([folder("family", "kin"), ...order]);

      expect(planClosedMove(text, "kin/tree.ged", move)).toEqual({
        write: null,
        count: 0,
        stranded: 0,
      });
    }
  });

  it("follows a renamed folder of media", () => {
    const planned = planClosedMove(
      gedcom("7.0", "media/a.jpg", "media/x%20y.jpg"),
      "tree.ged",
      new Move([folder("media", "pics")]),
    );

    expect(planned.count).toBe(2);
    expect(planned.write).toContain("1 FILE pics/a.jpg\n");
    expect(planned.write).toContain("1 FILE pics/x%20y.jpg\n");
  });

  it("keeps a missing file named from a moved GEDCOM file", () => {
    const planned = planClosedMove(
      gedcom("7.0", "gone/z.jpg"),
      "tree.ged",
      new Move([file("a/tree.ged", "tree.ged")]),
    );

    expect(planned.write).toContain("1 FILE a/gone/z.jpg\n");
  });

  it("follows a missing file in a renamed folder named percent-escaped", () => {
    const planned = planClosedMove(
      gedcom("7.0", "my%20photos/gone.jpg"),
      "tree.ged",
      new Move([folder("my photos", "pics")]),
    );

    expect(planned.write).toContain("1 FILE pics/gone.jpg\n");
  });

  it("strands a new place that would read as a pointer", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "photos/a.jpg"),
      "tree.ged",
      new Move([folder("photos", "@fam@")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 1 });
  });

  it("strands a new name GEDCOM 5.5.1 would read back as a folder", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "photos/a.jpg"),
      "tree.ged",
      new Move([file("photos/a.jpg", "photos/a\\b.jpg")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 1 });
  });

  it("strands a payload continued on the next line", () => {
    const text = [
      "0 HEAD",
      "1 GEDC",
      "2 VERS 5.5.1",
      "0 @O1@ OBJE",
      "1 FILE photos/my",
      "2 CONC  photo.jpg",
      "0 TRLR",
      "",
    ].join("\n");

    const planned = planClosedMove(
      text,
      "tree.ged",
      new Move([file("family/tree.ged", "tree.ged")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 1 });
  });

  it("follows two renames one after the other", () => {
    const first = planClosedMove(
      gedcom("7.0", "media/a.jpg"),
      "tree.ged",
      new Move([folder("media", "pics")]),
    );
    const second = planClosedMove(
      first.write ?? "",
      "tree.ged",
      new Move([folder("pics", "img")]),
    );

    expect(second.write).toContain("1 FILE img/a.jpg\n");
  });

  it("leaves a spelling that still names its file", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "./photos/a.jpg"),
      "kin/tree.ged",
      new Move([
        folder("family", "kin"),
        file("family/tree.ged", "kin/tree.ged"),
        file("family/photos/a.jpg", "kin/photos/a.jpg"),
      ]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 0 });
  });

  it("keeps the line endings a file was written with", () => {
    const text = gedcom("7.0", "media/a.jpg").replaceAll("\n", "\r\n");

    const planned = planClosedMove(
      text,
      "tree.ged",
      new Move([file("media/a.jpg", "media/b.jpg")]),
    );

    expect(planned.write).toBe(text.replace("media/a.jpg", "media/b.jpg"));
  });

  it("carries the version of the service that read the links", () => {
    const service = new GedcomLanguageService(gedcom("7.0", "media/a.jpg"), 7);

    const { edit } = planMove(
      service,
      "tree.ged",
      new Move([file("media/a.jpg", "media/b.jpg")]),
      7,
    );

    expect(edit.version).toBe(7);
    expect(edit.edits.map(({ newText }) => newText)).toEqual(["media/b.jpg"]);
  });
});

describe("moves followed one after another", () => {
  it("plans move A from where the GEDCOM file stood after it, though B has moved it since", async () => {
    const tree = { path: "tree.ged", text: gedcom("5.5.1", "media/a.jpg") };
    const { follower: moves, timers } = follower([tree]);

    moves.add(file("media/a.jpg", "media/b.jpg"));
    moveFile(moves, tree, "family/tree.ged");
    timers.run();
    await moves.idle();

    expect(tree.text).toBe(gedcom("5.5.1", "../media/b.jpg"));
  });

  it("keeps a payload that a folder and its GEDCOM file both moved under, one action after the other", async () => {
    for (const dialect of ["5.5.1", "7.0"] as const) {
      const tree = { path: "tree.ged", text: gedcom(dialect, "photos/a.jpg") };
      const { follower: moves, timers, notices } = follower([tree]);

      moves.add(folder("photos", "family/photos"), ["photos/a.jpg"]);
      moves.add(file("photos/a.jpg", "family/photos/a.jpg"));
      moveFile(moves, tree, "family/tree.ged");
      await moves.idle();
      timers.run();
      await moves.idle();

      expect(tree.text).toBe(gedcom(dialect, "photos/a.jpg"));
      expect(notices.filter((notice) => notice.includes("left"))).toEqual([]);
    }
  });

  it("hands an open GEDCOM file the path it stood at after the move", async () => {
    const tree = { path: "tree.ged", text: gedcom("7.0", "media/a.jpg") };
    const planned: string[] = [];
    const { follower: moves, timers } = follower([tree], {
      openView: () => ({
        followMove: (_move, documentPath) => {
          planned.push(documentPath);
          return { count: 0, stranded: 0 };
        },
      }),
    });

    moves.add(file("media/a.jpg", "media/b.jpg"));
    moveFile(moves, tree, "family/tree.ged");
    timers.run();
    await moves.idle();

    expect(planned).toEqual(["tree.ged", "family/tree.ged"]);
  });
});

describe("a follower that has been stopped", () => {
  it("follows nothing it had already been handed", async () => {
    const tree = { path: "tree.ged", text: gedcom("7.0", "media/a.jpg") };
    const { follower: moves, timers, notices } = follower([tree]);

    moves.add(file("media/a.jpg", "media/b.jpg"));
    timers.run();
    moves.stop();
    await moves.idle();

    expect(tree.text).toBe(gedcom("7.0", "media/a.jpg"));
    expect(notices).toEqual([]);
  });

  it("goes no further than the file it was on, and says nothing", async () => {
    const first = { path: "a.ged", text: gedcom("7.0", "media/a.jpg") };
    const second = { path: "b.ged", text: gedcom("7.0", "media/a.jpg") };
    const read = vi.fn();
    const { follower: moves, timers, notices } = follower([first, second], {
      read: (moved) => {
        read(moved.path);
        moves.stop();
        return Promise.resolve(moved.text);
      },
    });

    moves.add(file("media/a.jpg", "media/b.jpg"));
    timers.run();
    await moves.idle();

    expect(read).toHaveBeenCalledExactlyOnceWith("a.ged");
    expect(second.text).toBe(gedcom("7.0", "media/a.jpg"));
    expect(notices).toEqual([]);
  });
});

describe("a closed GEDCOM file rewritten after a move", () => {
  it("re-plans the move when its text changed between read and write", async () => {
    const read = gedcom("7.0", "media/a.jpg");
    const changed = gedcom("7.0", "media/a.jpg", "media/b.jpg");
    let written: string | null = null;

    const result = await moveClosedFile(
      {
        read: () => Promise.resolve(read),
        process: (change) => {
          written = change(changed);
          return Promise.resolve(written);
        },
      },
      () => "tree.ged",
      new Move([folder("media", "pics")]),
    );

    expect(result).toEqual({ count: 2, stranded: 0 });
    expect(written).toBe(gedcom("7.0", "pics/a.jpg", "pics/b.jpg"));
  });

  it("counts what the re-plan left behind, not what the first plan did", async () => {
    const { stranded } = await moveClosedFile(
      {
        read: () => Promise.resolve(gedcom("5.5.1", "media/a.jpg")),
        process: (change) =>
          Promise.resolve(change(gedcom("5.5.1", "media/a.jpg", "media/b.jpg"))),
      },
      () => "tree.ged",
      new Move([folder("media", "@fam@"), file("media/a.jpg", "pics/a.jpg")]),
    );

    expect(stranded).toBe(1);
  });

  it("is never handed to process when nothing in it changes", async () => {
    const process = vi.fn();

    await moveClosedFile(
      { read: () => Promise.resolve(gedcom("7.0", "scans/c.jpg")), process },
      () => "tree.ged",
      new Move([file("photos/a.jpg", "photos/b.jpg")]),
    );

    expect(process).not.toHaveBeenCalled();
  });
});

describe("a media file that has been renamed", () => {
  it("repoints every payload that named it, and leaves the rest alone", () => {
    const planned = planClosedMove(
      gedcom("7.0", "media/marie.jpg", "media/pierre.jpg", "media/marie.jpg"),
      "tree.ged",
      new Move([file("media/marie.jpg", "media/marie-curie.jpg")]),
    );

    expect(planned.count).toBe(2);
    expect(planned.write).toBe(
      gedcom(
        "7.0",
        "media/marie-curie.jpg",
        "media/pierre.jpg",
        "media/marie-curie.jpg",
      ),
    );
  });

  it("spells the new path from the folder the GEDCOM file sits in", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "../media/marie.jpg"),
      "family/tree.ged",
      new Move([file("media/marie.jpg", "photos/marie.jpg")]),
    );

    expect(planned.write).toContain("1 FILE ../photos/marie.jpg\n");
  });

  it("strands a move above its folder in a document with no version, read as GEDCOM 7", () => {
    const planned = planClosedMove(
      "0 HEAD\n0 @O1@ OBJE\n1 FILE media/marie.jpg\n0 TRLR\n",
      "family/tree.ged",
      new Move([file("family/media/marie.jpg", "photos/marie.jpg")]),
    );

    expect(planned).toEqual({ write: null, count: 0, stranded: 1 });
  });

  it("leaves the name as written in 5.5.1, where a payload is a plain string", () => {
    const planned = planClosedMove(
      gedcom("5.5.1", "media/marie.jpg"),
      "tree.ged",
      new Move([file("media/marie.jpg", "media/marie curie.jpg")]),
    );

    expect(planned.write).toContain("1 FILE media/marie curie.jpg\n");
  });
});

describe("which vault files are ours to rewrite", () => {
  it("takes both extensions the plugin registers, whatever their case", () => {
    expect(isGedcomPath("family/tree.ged")).toBe(true);
    expect(isGedcomPath("family/tree.GEDCOM")).toBe(true);
  });

  it("leaves everything else to Obsidian", () => {
    expect(isGedcomPath("note.md")).toBe(false);
    expect(isGedcomPath("media/marie.jpg")).toBe(false);
    expect(isGedcomPath("ged")).toBe(false);
  });
});

describe("what the notice says", () => {
  it("counts one of a thing without an s on it", () => {
    expect(describeRetarget(1, 1)).toBe(
      "GEDCOM: repointed 1 media link in 1 file",
    );
  });

  it("counts more than one with one", () => {
    expect(describeRetarget(3, 2)).toBe(
      "GEDCOM: repointed 3 media links in 2 files",
    );
  });

  it("owns up to a file it could not read rather than passing over it", () => {
    expect(describeUnreadable(1)).toBe(
      "GEDCOM: could not check 1 file for links to the renamed file",
    );
  });

  it("says what was left behind, and why nothing could be written", () => {
    expect(describeStranded(2)).toContain("left 2 media links");
    expect(describeStranded(2)).toContain("outside the folder");
  });
});

describe("what the notice says in Russian", () => {
  afterEach(resetLanguage);

  it("declines each noun by its own count", () => {
    setLanguage("ru");
    expect(describeRetarget(1, 1)).toBe(
      "GEDCOM: новый путь записан в 1 медиассылке в 1 файле",
    );
    expect(describeRetarget(3, 2)).toBe(
      "GEDCOM: новый путь записан в 3 медиассылках в 2 файлах",
    );
    expect(describeRetarget(5, 5)).toBe(
      "GEDCOM: новый путь записан в 5 медиассылках в 5 файлах",
    );
  });

  it("declines a file it could not check in the accusative", () => {
    setLanguage("ru");
    expect(describeUnreadable(1)).toContain("проверить 1 файл на");
    expect(describeUnreadable(3)).toContain("проверить 3 файла на");
    expect(describeUnreadable(5)).toContain("проверить 5 файлов на");
  });

  it("keeps GEDCOM 7 in the reason", () => {
    setLanguage("ru");
    expect(describeStranded(1)).toContain("в 1 медиассылке");
    expect(describeStranded(1)).toContain("GEDCOM 7");
  });
});
