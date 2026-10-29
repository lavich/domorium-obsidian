import { describe, expect, it } from "vitest";

import { Move, RenameBatch, type Rename, type Timers } from "./movedFiles";

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
