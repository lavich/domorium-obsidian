import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage } from "../i18n";
import { curieIndex, indexOf } from "../testing/curie";
import {
  cellsOf,
  citingRecords,
  collatorFor,
  columnsOf,
  listRows,
  listSelection,
  nextSort,
  peopleShown,
  readListState,
  recordKind,
  sourcesCited,
  type ListKind,
  type ListSort,
} from "./listRows";

afterEach(resetLanguage);

const index = curieIndex();
const collator = collatorFor("en");

const xrefs = (
  kind: ListKind,
  options: { query?: string; sort?: ListSort; source?: typeof index } = {},
): (string | undefined)[] =>
  listRows(
    options.source ?? index,
    { kind, query: options.query ?? "", sort: options.sort },
    collator,
  ).map((row) => row.xref);

const asc = (by: ListSort["by"]): ListSort => ({ by, dir: "asc" });
const desc = (by: ListSort["by"]): ListSort => ({ by, dir: "desc" });

describe("filtering the rows", () => {
  it("finds a person by year, by another name and by name in any case", () => {
    expect(xrefs("people", { query: "1867" })).toEqual(["@I1@"]);
    expect(xrefs("people", { query: "salomea" })).toEqual(["@I1@"]);
    expect(xrefs("people", { query: "joliot" })).toEqual(["@I12@", "@I14@", "@I16@", "@I17@"]);
    expect(xrefs("people", { query: "JOLIOT" })).toEqual(xrefs("people", { query: "joliot" }));
  });

  it("finds a place in people, families and sources, and a repository in sources", () => {
    expect(xrefs("people", { query: "Warsaw" })).toHaveLength(7);
    expect(xrefs("families", { query: "Warsaw" })).toEqual(["@F1@"]);
    expect(xrefs("sources", { query: "Warsaw" })).toEqual(["@S2@"]);
    expect(xrefs("sources", { query: "archive" })).toEqual(["@S2@"]);
  });

  it("finds a year before the common era by its digits in people and families", () => {
    const bce = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 BIRT", "2 DATE 1401 BCE",
        "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 BIRT", "2 DATE 1500 BCE",
        "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR", "2 DATE 1401 BCE",
        "0 @F2@ FAM", "1 HUSB @I2@", "1 MARR", "2 DATE 1500 BCE",
        "0 TRLR", "",
      ].join("\n"),
    );

    expect(peopleShown(bce, "1401").map((row) => row.xref)).toEqual(["@I1@"]);
    expect(xrefs("families", { query: "1401", source: bce })).toEqual(["@F1@"]);
  });
});

describe("what a row counts", () => {
  it("counts the distinct sources a person cites, an inline one once", () => {
    expect(sourcesCited(index, "@I1@")).toBe(2);
    expect(sourcesCited(index, "@I2@")).toBe(1);
    expect(sourcesCited(index, "@I5@")).toBe(0);

    const inline = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 5.5.1", "1 CHAR UTF-8",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/", "1 SOUR parish book", "1 BIRT", "2 SOUR @S1@", "2 SOUR @S1@",
        "0 @S1@ SOUR", "1 TITL Register",
        "0 TRLR", "",
      ].join("\n"),
    );
    expect(sourcesCited(inline, "@I1@")).toBe(2);
  });

  it("counts the distinct records that cite a source", () => {
    expect(["@S2@", "@S3@", "@S1@"].map((xref) => citingRecords(index, xref))).toEqual([2, 3, 2]);
  });

  it("reads the cells of a row as the card shows them, and marks a person who cites nothing", () => {
    const marie = index.people.find((row) => row.xref === "@I1@");
    const zofia = index.people.find((row) => row.xref === "@I5@");
    expect(cellsOf("people", marie!, index)).toEqual({
      texts: ["Marie Skłodowska-Curie", "1867–1934", "Warsaw, Congress Poland", "2"],
      gap: false,
    });
    expect(cellsOf("people", zofia!, index).gap).toBe(true);
    const family = index.families.find((row) => row.xref === "@F3@");
    expect(cellsOf("families", family!, index).texts).toEqual([
      "Pierre Curie and Marie Skłodowska-Curie",
      "1895",
      "Sceaux, France",
      "2",
    ]);
  });

  it("has four columns for each kind", () => {
    expect(columnsOf("events").map((column) => column.key)).toEqual(["event", "record", "date", "place"]);
    expect(columnsOf("people").map((column) => column.key)).toEqual(["name", "years", "place", "sources"]);
    expect(columnsOf("families").map((column) => column.key)).toEqual(["spouses", "marriage", "place", "children"]);
    expect(columnsOf("sources").map((column) => column.key)).toEqual(["title", "author", "repository", "citedBy"]);
  });
});

describe("sorting the rows", () => {
  it("sorts people by surname and then given name, and descending reverses it", () => {
    const up = xrefs("people", { sort: asc("name") });
    expect(up[0]).toBe("@I4@");
    expect(up.at(-1)).toBe("@I8@");
    expect(up.filter((xref) => ["@I9@", "@I13@", "@I11@", "@I2@"].includes(xref ?? ""))).toEqual([
      "@I9@", "@I13@", "@I11@", "@I2@",
    ]);
    expect(xrefs("people", { sort: desc("name") })).toEqual([...up].reverse());
  });

  it("sorts by the year of birth, with ties in the file's order in both directions", () => {
    const up = xrefs("people", { sort: asc("years") });
    expect(up[0]).toBe("@I9@");
    expect(up.at(-1)).toBe("@I17@");
    expect(up.indexOf("@I3@")).toBeLessThan(up.indexOf("@I10@"));
    const down = xrefs("people", { sort: desc("years") });
    expect(down.indexOf("@I13@")).toBeLessThan(down.indexOf("@I15@"));
  });

  it("puts a person with no birth year last in both directions", () => {
    const without = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Anna /Nowak/",
        "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 BIRT", "2 DATE 1900",
        "0 @I3@ INDI", "1 NAME Ewa /Nowak/", "1 BIRT", "2 DATE 1800",
        "0 TRLR", "",
      ].join("\n"),
    );
    expect(xrefs("people", { sort: asc("years"), source: without })).toEqual(["@I3@", "@I2@", "@I1@"]);
    expect(xrefs("people", { sort: desc("years"), source: without })).toEqual(["@I2@", "@I3@", "@I1@"]);
  });

  it("puts an unnamed person and an untitled source last", () => {
    const bare = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI",
        "0 @I2@ INDI", "1 NAME Jan /Nowak/",
        "0 @S1@ SOUR",
        "0 @S2@ SOUR", "1 TITL Register",
        "0 TRLR", "",
      ].join("\n"),
    );
    expect(xrefs("people", { sort: asc("name"), source: bare })).toEqual(["@I2@", "@I1@"]);
    expect(xrefs("people", { sort: desc("name"), source: bare })).toEqual(["@I2@", "@I1@"]);
    expect(xrefs("sources", { sort: desc("title"), source: bare })).toEqual(["@S2@", "@S1@"]);
  });

  it("sorts by how many sources a person cites, and families and sources by their counts", () => {
    const up = xrefs("people", { sort: asc("sources") });
    const first = up.slice(0, 11);
    expect(first.map((xref) => sourcesCited(index, xref ?? ""))).toEqual(Array(11).fill(0));
    expect(first).toEqual(["@I5@", "@I6@", "@I7@", "@I8@", "@I9@", "@I10@", "@I11@", "@I13@", "@I15@", "@I16@", "@I17@"]);
    expect(up.at(-1)).toBe("@I1@");
    expect(xrefs("families", { sort: desc("children") })).toEqual(["@F1@", "@F2@", "@F3@", "@F4@", "@F5@"]);
    expect(xrefs("sources", { sort: desc("citedBy") })).toEqual(["@S3@", "@S1@", "@S2@"]);
  });

  it("combines with the text", () => {
    expect(xrefs("people", { query: "curie", sort: desc("years") })).toEqual([
      "@I13@", "@I12@", "@I1@", "@I2@", "@I11@", "@I9@",
    ]);
  });

  it("does not change the order of the index", () => {
    const before = index.people.map((row) => row.xref);
    xrefs("people", { sort: desc("name") });
    expect(index.people.map((row) => row.xref)).toEqual(before);
  });

  it("collates by the language shown, a letter with a mark with its base letter", () => {
    const names = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 NAME Ève /Curie/",
        "0 @I2@ INDI", "1 NAME Eugène /Curie/",
        "0 @I3@ INDI", "1 NAME Person10 /Curie/",
        "0 @I4@ INDI", "1 NAME Person2 /Curie/",
        "0 TRLR", "",
      ].join("\n"),
    );
    expect(xrefs("people", { sort: asc("name"), source: names })).toEqual(["@I2@", "@I1@", "@I4@", "@I3@"]);
  });
});

describe("the sort a header press asks for", () => {
  it("goes ascending, descending, then none, and starts over on another column", () => {
    const first = nextSort(undefined, "name");
    expect(first).toEqual(asc("name"));
    const second = nextSort(first, "name");
    expect(second).toEqual(desc("name"));
    expect(nextSort(second, "name")).toBeUndefined();
    expect(nextSort(second, "years")).toEqual(asc("years"));
  });
});

describe("reading a saved list state", () => {
  it("keeps what is valid and drops the rest", () => {
    expect(
      readListState({
        kind: "families",
        sort: { people: asc("name"), families: { by: "name", dir: "asc" }, sources: { by: "title", dir: "sideways" } },
      }),
    ).toEqual({ kind: "families", sort: { people: asc("name") } });
    expect(readListState({ kind: "everyone", noSources: true })).toEqual({});
    expect(readListState({ kind: "sources", noSources: true })).toEqual({ kind: "sources" });
    expect(readListState({ kind: "sources", sort: { sources: desc("citedBy") } })).toEqual({
      kind: "sources",
      sort: { sources: desc("citedBy") },
    });
  });

  it("keeps the events as a kind and its sort", () => {
    expect(readListState({ kind: "events", sort: { events: desc("date") } })).toEqual({ kind: "events", sort: { events: desc("date") } });
    expect(readListState({ kind: "events", sort: { events: { by: "years", dir: "asc" } } })).toEqual({ kind: "events" });
  });

  it("reads a value that is not an object as empty", () => {
    for (const value of [undefined, null, "list", ["people"], 3]) {
      expect(readListState(value)).toEqual({});
    }
  });
});

describe("which selection the list can show", () => {
  it("is a person, a family or a source, and nothing for a media record, a note or nobody", () => {
    expect(["@I1@", "@F3@", "@S2@"].map((xref) => listSelection(index, xref))).toEqual(["@I1@", "@F3@", "@S2@"]);
    expect(["@O5@", "@N1@", null].map((xref) => listSelection(index, xref))).toEqual([null, null, null]);
  });

  it("is an event the file names, which the list shows among the events", () => {
    expect(recordKind(index, "event:@I1@:p:0")).toBe("events");
    expect(listSelection(index, "event:@I1@:p:0")).toBe("event:@I1@:p:0");
    expect(listSelection(index, "event:@I1@:p:999")).toBeNull();
  });
});
