import { describe, expect, it } from "vitest";

import { notesLinking, type CachedLink, type NoteLinks } from "./noteLinks";

function note(path: string, text: string): NoteLinks {
  const links: CachedLink[] = [];
  for (const match of text.matchAll(/!?\[\[((?:[^\]\\]|\\.)+?)\]\]/gu)) {
    const inner = match[1] ?? "";
    links.push({
      link: inner.split(/\\?\|/u)[0] ?? inner,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return { path, name: path.replace(/^.*\//u, "").replace(/\.md$/u, ""), text, links };
}

const TREE = "curie.ged";
const resolve = (linkPath: string): string | null =>
  linkPath === "curie.ged" ? TREE : linkPath === "other.ged" ? "other.ged" : null;

const RADIUM = note("Notes/Radium.md", [
  "Isolated from pitchblende at the École de physique et de chimie in Paris,",
  "announced in December 1898 by [[curie.ged#@I1@|Marie Skłodowska-Curie]] and",
  "[[curie.ged#@I2@|Pierre Curie]].",
].join("\n"));

const NOBEL = note("Notes/Nobel Prizes in the family.md", [
  "| Year | Field | Laureates |",
  "| 1903 | Physics | [[curie.ged#@I2@\\|Pierre Curie]] and [[curie.ged#@I1@\\|Marie Skłodowska-Curie]] |",
  "| 1911 | Chemistry | [[curie.ged#@I1@\\|Marie Skłodowska-Curie]] |",
].join("\n"));

describe("the notes that link a record", () => {
  it("shows the line around the link, with the link read as its alias", () => {
    const [hit] = notesLinking([RADIUM], { path: TREE, xref: "@I1@" }, resolve);

    expect(hit?.name).toBe("Radium");
    expect(hit?.lines).toEqual([
      {
        line: 1,
        before: "announced in December 1898 by ",
        link: "Marie Skłodowska-Curie",
        after: " and",
      },
    ]);
  });

  it("lists a note once, with each line that links the record", () => {
    const [hit] = notesLinking([NOBEL], { path: TREE, xref: "@I1@" }, resolve);

    expect(hit?.lines.map((line) => [line.line, line.link])).toEqual([
      [1, "Marie Skłodowska-Curie"],
      [2, "Marie Skłodowska-Curie"],
    ]);
    expect(hit?.lines[0]?.before).toBe("| 1903 | Physics | Pierre Curie and ");
  });

  it("reads a table's escaped pipe as the alias it introduces", () => {
    const escaped = { ...NOBEL, links: NOBEL.links.map((one) => ({ ...one, link: `${one.link}\\` })) };

    expect(notesLinking([escaped], { path: TREE, xref: "@I2@" }, resolve)[0]?.lines[0]?.link)
      .toBe("Pierre Curie");
  });

  it("counts an embed", () => {
    const embed = note("Notes/Irène.md", "Her record:\n\n![[curie.ged#@I12@]]\n");

    expect(notesLinking([embed], { path: TREE, xref: "@I12@" }, resolve)[0]?.lines[0]?.link)
      .toBe("curie.ged › @I12@");
  });

  it("leaves out a link to the same identifier in another file", () => {
    const elsewhere = note("Notes/Other.md", "See [[other.ged#@I1@|someone else]].");

    expect(notesLinking([elsewhere, RADIUM], { path: TREE, xref: "@I1@" }, resolve).map((hit) => hit.name))
      .toEqual(["Radium"]);
  });

  it("finds nothing for a record no note links", () => {
    expect(notesLinking([RADIUM, NOBEL], { path: TREE, xref: "@I10@" }, resolve)).toEqual([]);
  });

  it("cuts a long line on both sides of the link", () => {
    const long = note("Notes/Long.md", `${"word ".repeat(40)}[[curie.ged#@I1@|Marie]]${" more".repeat(40)}`);
    const line = notesLinking([long], { path: TREE, xref: "@I1@" }, resolve)[0]?.lines[0];

    expect(line?.before.startsWith("…")).toBe(true);
    expect(line?.after.endsWith("…")).toBe(true);
    expect(line?.link).toBe("Marie");
  });
});
