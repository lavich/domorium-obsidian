import { describe, expect, it } from "vitest";

import {
  describeRetarget,
  describeStranded,
  describeUnreadable,
  isGedcomPath,
  mayNameAFile,
  retargetMedia,
} from "./renamedMedia";

function file(dialect: "7.0" | "5.5.1", ...payloads: string[]): string {
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

describe("a media file that has been renamed", () => {
  it("repoints the payload that named it, and leaves the rest alone", () => {
    const text = file("7.0", "media/marie.jpg", "media/pierre.jpg");

    const { text: rewritten, count } = retargetMedia(
      text,
      "tree.ged",
      "media/marie.jpg",
      "media/marie-curie.jpg",
    );

    expect(count).toBe(1);
    expect(rewritten).toContain("1 FILE media/marie-curie.jpg");
    expect(rewritten).toContain("1 FILE media/pierre.jpg");
  });

  it("spells the new path from the folder the GEDCOM file sits in", () => {
    const text = file("5.5.1", "../media/marie.jpg");

    const { text: rewritten } = retargetMedia(
      text,
      "family/tree.ged",
      "media/marie.jpg",
      "photos/marie.jpg",
    );

    expect(rewritten).toContain("1 FILE ../photos/marie.jpg");
  });

  it("strands rather than writes a path GEDCOM 7 has no way to spell", () => {
    const text = file("7.0", "media/marie.jpg");

    const result = retargetMedia(
      text,
      "family/tree.ged",
      "family/media/marie.jpg",
      "photos/marie.jpg",
    );

    expect(result.text).toBe(text);
    expect(result.count).toBe(0);
    expect(result.stranded).toBe(1);
  });

  it("writes that same move in 5.5.1, where a payload is any string at all", () => {
    const text = file("5.5.1", "media/marie.jpg");

    const result = retargetMedia(
      text,
      "family/tree.ged",
      "family/media/marie.jpg",
      "photos/marie.jpg",
    );

    expect(result.text).toContain("1 FILE ../photos/marie.jpg");
    expect(result.stranded).toBe(0);
  });

  it("escapes a name a URI reference cannot carry literally, in GEDCOM 7", () => {
    const text = file("7.0", "media/marie.jpg");

    const { text: rewritten } = retargetMedia(
      text,
      "tree.ged",
      "media/marie.jpg",
      "media/marie curie.jpg",
    );

    expect(rewritten).toContain("1 FILE media/marie%20curie.jpg");
  });

  it("leaves the name as written in 5.5.1, where a payload is a plain string", () => {
    const text = file("5.5.1", "media/marie.jpg");

    const { text: rewritten } = retargetMedia(
      text,
      "tree.ged",
      "media/marie.jpg",
      "media/marie curie.jpg",
    );

    expect(rewritten).toContain("1 FILE media/marie curie.jpg");
  });

  it("finds a payload that spelled the old name with an escape", () => {
    const text = file("7.0", "media/marie%20curie.jpg");

    const { count } = retargetMedia(
      text,
      "tree.ged",
      "media/marie curie.jpg",
      "media/curie.jpg",
    );

    expect(count).toBe(1);
  });

  it("changes nothing, and says so, for a file that names no such media", () => {
    const text = file("7.0", "media/pierre.jpg");

    const result = retargetMedia(
      text,
      "tree.ged",
      "media/marie.jpg",
      "media/curie.jpg",
    );

    expect(result).toEqual({ text, count: 0, stranded: 0 });
  });

  it("keeps the line endings a file was written with", () => {
    const text = file("7.0", "media/marie.jpg").replaceAll("\n", "\r\n");

    const { text: rewritten } = retargetMedia(
      text,
      "tree.ged",
      "media/marie.jpg",
      "media/curie.jpg",
    );

    expect(rewritten).toBe(text.replace("media/marie.jpg", "media/curie.jpg"));
  });

  it("repoints every payload that named it, not only the first", () => {
    const text = file("7.0", "media/marie.jpg", "media/marie.jpg");

    const { count } = retargetMedia(
      text,
      "tree.ged",
      "media/marie.jpg",
      "media/curie.jpg",
    );

    expect(count).toBe(2);
  });
});

describe("which files are worth parsing at all", () => {
  it("takes a file that carries the tag a payload sits on", () => {
    expect(mayNameAFile(file("7.0", "media/marie.jpg"))).toBe(true);
  });

  it("declines an export with no media in it, whatever its size", () => {
    expect(
      mayNameAFile("0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n0 TRLR\n"),
    ).toBe(false);
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
