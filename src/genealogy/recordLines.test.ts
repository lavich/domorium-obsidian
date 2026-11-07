import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { buildIndex, type GenealogyIndex, type RecordLine } from "./index";

const indexOf = (lines: string[]): GenealogyIndex => buildIndex(new GedcomLanguageService(lines.join("\n")));
const head = (version: string): string[] => ["0 HEAD", "1 GEDC", `2 VERS ${version}`];
const find = (line: RecordLine | undefined, tag: string): RecordLine | undefined =>
  line?.children.find((child) => child.tag === tag);

describe("the lines of a record", () => {
  const index = indexOf([
    ...head("7.0"),
    "0 @I1@ INDI",
    "1 NAME Maria /Curie/",
    "2 TYPE BIRTH",
    "2 NICK Manya",
    "1 SEX F",
    "1 FAMC @F1@",
    "2 PEDI ADOPTED",
    "1 ASSO @VOID@",
    "1 _MILITARY Cavalry",
    "2 _RANK Captain",
    "0 @F1@ FAM",
    "1 CHIL @I1@",
    "0 TRLR",
  ]);

  it("gives a name with its parts, in the order written, to any depth", () => {
    const record = index.record("@I1@");
    const name = find(record, "NAME");

    expect(record?.xref).toBe("@I1@");
    expect(name?.text).toBe("Maria /Curie/");
    expect(name?.children.map((child) => [child.tag, child.text])).toEqual([
      ["TYPE", "BIRTH"],
      ["NICK", "Manya"],
    ]);
    expect(find(find(record, "_MILITARY"), "_RANK")?.text).toBe("Captain");
  });

  it("tells a pointer from a value, and a void pointer from both", () => {
    const record = index.record("@I1@");

    expect(find(record, "FAMC")).toMatchObject({ pointer: "@F1@" });
    expect(find(record, "FAMC")?.text).toBeUndefined();
    expect(find(record, "SEX")).toMatchObject({ text: "F" });
    expect(find(record, "SEX")?.pointer).toBeUndefined();
    expect(find(record, "ASSO")?.void).toBe(true);
    expect(find(record, "ASSO")?.pointer).toBeUndefined();
  });

  it("gives the lines of a family and says nothing of a record the document does not declare", () => {
    expect(index.record("@F1@")?.children.map((child) => child.tag)).toEqual(["CHIL"]);
    expect(index.record("@I9@")).toBeUndefined();
  });
});

describe("a continued line", () => {
  it("breaks at a CONT and joins at a CONC, and does not show them as lines", () => {
    const index = indexOf([...head("7.0"), "0 @I1@ INDI", "1 NOTE first", "2 CONT second", "2 CONC  more", "0 TRLR"]);
    const note = find(index.record("@I1@"), "NOTE");

    expect(note?.text).toBe("first\nsecond more");
    expect(note?.children).toEqual([]);
  });

  it("reads an escaped at sign, and a payload that begins with one as a value", () => {
    const index = indexOf([...head("5.5.1"), "0 @I1@ INDI", "1 NOTE write to me@@example.org", "1 NOTE @@home", "0 TRLR"]);
    const notes = index.record("@I1@")?.children.filter((child) => child.tag === "NOTE");

    expect(notes?.map((note) => [note.text, note.pointer])).toEqual([
      ["write to me@example.org", undefined],
      ["@home", undefined],
    ]);
  });
});

describe("a shared note", () => {
  it("gives its text in 7.0, whose record is an SNOTE, with its continuation", () => {
    const index = indexOf([...head("7.0"), "0 @N1@ SNOTE The only person", "1 CONT second line", "0 TRLR"]);

    expect(index.record("@N1@")).toMatchObject({ tag: "SNOTE", xref: "@N1@", text: "The only person\nsecond line" });
  });

  it("gives its text in 5.5.1, whose record is a NOTE, with its continuation", () => {
    const index = indexOf([...head("5.5.1"), "1 CHAR UTF-8", "0 @N1@ NOTE A long line", "1 CONC  continued", "1 CONT next", "0 TRLR"]);

    expect(index.record("@N1@")).toMatchObject({ tag: "NOTE", text: "A long line continued\nnext" });
  });

  it("gives the text of a note whose first line is empty from its continuation", () => {
    const index = indexOf([...head("7.0"), "0 @N1@ SNOTE", "1 CONT second", "0 TRLR"]);

    expect(index.record("@N1@")?.text).toBe("second");
  });
});
