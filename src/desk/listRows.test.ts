import { afterEach, describe, expect, it } from "vitest";

import { HEADER_ID } from "../genealogy";
import { resetLanguage, setLanguage } from "../i18n";
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
      "Pierre Curie ⚭ Marie Skłodowska-Curie",
      "1895",
      "Sceaux, France",
      "2",
    ]);
  });

  it("has four columns for each kind", () => {
    expect(columnsOf("people").map((column) => column.key)).toEqual(["name", "years", "place", "sources"]);
    expect(columnsOf("families").map((column) => column.key)).toEqual(["spouses", "marriage", "place", "children"]);
    expect(columnsOf("sources").map((column) => column.key)).toEqual(["title", "author", "repository", "citedBy"]);
  });
});

const cells = (kind: ListKind, source = index): string[][] =>
  listRows(source, { kind, query: "", sort: undefined }, collator).map((row) => cellsOf(kind, row, source).texts);

describe("the rows of the media, notes, repositories and other records", () => {
  it("reads the media of curie.ged in the file's order, with what links each", () => {
    const media = cells("media");

    expect(media).toHaveLength(7);
    expect(media[3]).toEqual(["The Curie family, about 1908", "Media/curie-family-1908.svg", "image/svg+xml", "2"]);
    expect(media.find((row) => row[0] === "A plate nobody can find")?.[3]).toBe("0");
  });

  it("reads the notes by their first line, each linked from the person who points at it", () => {
    expect(cells("notes")).toEqual([
      ["The only person to have won a Nobel Prize in two different sciences:", "1"],
      ["Wrote Madame Curie, the biography of her mother, in 1937. Her husband", "1"],
    ]);
  });

  it("reads the repositories with the first line of their address and the sources that point at them", () => {
    expect(cells("repositories")).toEqual([
      ["Nobel Prize Outreach", "", "2"],
      ["State Archive in Warsaw", "Krzywe Koło 7", "1"],
    ]);
  });

  it("reads the header first, with nothing under Linked from, then the submitter", () => {
    expect(cells("other")).toEqual([
      ["Header", "File header", ""],
      ["Submitter", "Domorium", "1"],
    ]);
  });

  it("reads the kind of a record in the reader's language, and a tag the plugin does not name as written", () => {
    const own = indexOf(["0 HEAD", "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8", "0 @SUB1@ SUBN", "0 @X1@ _PLAN", "1 NAME Research plan", "0 TRLR"].join("\n"));
    setLanguage("ru");

    expect(cells("other", own)).toEqual([
      ["Заголовок", "Заголовок файла", ""],
      ["Передача", "Передача", "0"],
      ["_PLAN", "Research plan", "0"],
    ]);
  });

  it("finds a note by a later line, a repository without marks, and another record by its kind", () => {
    expect(xrefs("notes", { query: "chemistry" })).toEqual(["@N1@"]);
    expect(xrefs("repositories", { query: "kolo" })).toEqual(["@R2@"]);
    expect(xrefs("other", { query: "submitter" })).toEqual(["@U1@"]);
    expect(xrefs("other", { query: "SUBM" })).toEqual(["@U1@"]);
    expect(xrefs("media", { query: "jpeg" })).toEqual(["@O6@", "@O7@"]);
    expect(xrefs("media", { query: "CURIE-FAMILY" })).toEqual(["@O5@"]);
  });

  it("keeps the header first under any sort, and sorts the rest", () => {
    const named = indexOf(["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @U1@ SUBM", "1 NAME Zygmunt", "0 @X1@ _ALBUM", "1 NAME Album", "0 TRLR"].join("\n"));

    expect(xrefs("other", { source: named, sort: asc("name") })).toEqual([HEADER_ID, "@X1@", "@U1@"]);
    expect(xrefs("other", { source: named, sort: desc("name") })).toEqual([HEADER_ID, "@U1@", "@X1@"]);
    expect(xrefs("other", { source: named, sort: desc("linkedFrom") })[0]).toBe(HEADER_ID);
  });

  it("sorts the notes by how many link them, and puts a medium with no format and a repository with no address last", () => {
    const linked = indexOf(
      [
        "0 HEAD", "1 GEDC", "2 VERS 7.0",
        "0 @I1@ INDI", "1 SNOTE @N1@", "1 SNOTE @N3@", "0 @I2@ INDI", "1 SNOTE @N1@", "0 @F1@ FAM", "1 SNOTE @N1@",
        "0 @N1@ SNOTE Three", "0 @N2@ SNOTE None", "0 @N3@ SNOTE One",
        "0 @O1@ OBJE", "1 FILE b.jpg", "0 @O2@ OBJE", "1 FILE a.jpg", "2 FORM image/jpeg",
        "0 TRLR",
      ].join("\n"),
    );

    expect(xrefs("notes", { source: linked, sort: desc("linkedFrom") })).toEqual(["@N1@", "@N3@", "@N2@"]);
    expect(xrefs("media", { source: linked, sort: asc("format") })).toEqual(["@O2@", "@O1@"]);
    expect(xrefs("media", { source: linked, sort: desc("format") })).toEqual(["@O2@", "@O1@"]);
    expect(xrefs("repositories", { sort: asc("address") })).toEqual(["@R2@", "@R1@"]);
    expect(xrefs("repositories", { sort: desc("address") })).toEqual(["@R2@", "@R1@"]);
  });

  it("has the columns each kind names", () => {
    expect(columnsOf("media").map((column) => column.key)).toEqual(["title", "file", "format", "linkedFrom"]);
    expect(columnsOf("notes").map((column) => column.key)).toEqual(["text", "linkedFrom"]);
    expect(columnsOf("repositories").map((column) => column.key)).toEqual(["name", "address", "sources"]);
    expect(columnsOf("other").map((column) => column.key)).toEqual(["kind", "name", "linkedFrom"]);
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

  it("drops a saved events kind, which no longer exists, and its sort, so that the list opens on the people", () => {
    expect(readListState({ kind: "events", sort: { events: desc("events") } })).toEqual({});
    expect(readListState({ kind: "places", sort: { events: desc("events"), places: desc("events") } })).toEqual({ kind: "places", sort: { places: desc("events") } });
  });

  it("reads a value that is not an object as empty", () => {
    for (const value of [undefined, null, "list", ["people"], 3]) {
      expect(readListState(value)).toEqual({});
    }
  });
});

describe("which selection the list can show", () => {
  it("is any record a kind lists, the header among them, and nothing for one the file lacks or nobody", () => {
    const listed = ["@I1@", "@F3@", "@S2@", "place:paris, france", "@O5@", "@N1@", "@R2@", "@U1@", HEADER_ID];

    expect(listed.map((xref) => listSelection(index, xref))).toEqual(listed);
    expect(listed.map((xref) => recordKind(index, xref))).toEqual([
      "people", "families", "sources", "places", "media", "notes", "repositories", "other", "other",
    ]);
    expect(["@X9@", null].map((xref) => listSelection(index, xref))).toEqual([null, null]);
  });

  it("is nothing for an event id, which names no kind of the list", () => {
    expect(recordKind(index, "event:@I1@:BIRT:0")).toBeNull();
    expect(listSelection(index, "event:@I1@:BIRT:0")).toBeNull();
  });
});
