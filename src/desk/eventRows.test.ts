import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
import { collectEvents, eventAt, eventCells, eventId, eventOwner, eventRows, eventTitle, type EventRow } from "./eventRows";
import { collatorFor, listRows, type ListSort } from "./listRows";

afterEach(resetLanguage);

const index = curieIndex();
const withEvents = indexOf(curieWithEvents());
const collator = collatorFor("en");
const rowsOf = (query = "", sort?: ListSort, source = index): EventRow[] => eventRows(source, { query, sort }, collator);
const keys = (rows: EventRow[]): string[] => rows.map((row) => row.key);
const doc = (...lines: string[]) => indexOf(["0 HEAD", ...lines, "0 TRLR"].join("\n"));

describe("the rows of the events kind", () => {
  it("holds every event of the people and the families of the file once", () => {
    expect(collectEvents(index)).toHaveLength(51);
    expect(new Set(keys(collectEvents(index))).size).toBe(51);
  });

  it("lists them in the order the file writes them, the families among the people", () => {
    const lines = collectEvents(index).map((row) => row.event.range.start.line);

    expect(lines).toEqual([...lines].sort((a, b) => a - b));
    expect(collectEvents(index).some((row) => row.family !== undefined)).toBe(true);
  });

  it("keys an event by its record, its tag and its place among the events of that tag", () => {
    const row = collectEvents(index).find((one) => one.owner === "@I1@");

    expect(row).toMatchObject({ key: "event:@I1@:BIRT:0" });
    expect(collectEvents(index).find((one) => one.family !== undefined)?.owner.startsWith("@F")).toBe(true);
  });

  it("reads a birth as the card names it, with its record, date and place", () => {
    const birth = collectEvents(index).find((row) => row.key === "event:@I1@:BIRT:0") as EventRow;

    expect(eventCells(birth)).toEqual(["Birth", "Marie Skłodowska-Curie", "7 NOV 1867", "Warsaw, Congress Poland"]);
  });

  it("names the events of a family after the family", () => {
    const marriages = collectEvents(index).filter((row) => row.family !== undefined).map((row) => eventCells(row));

    expect(marriages).toContainEqual(["Marriage", "Pierre Curie and Marie Skłodowska-Curie", "26 JUL 1895", "Sceaux, France"]);
  });

  it("follows an occupation with its text and tells the awards apart", () => {
    const titles = collectEvents(withEvents).map((row) => eventTitle(row.event));

    expect(titles).toContain("Occupation · Physicist");
    expect(titles).toContain("Award · Nobel Prize in Physics");
    expect(titles).toContain("Award · Nobel Prize in Chemistry");
  });

  it("drops a value of Y, which is not text", () => {
    const only = doc("0 @I1@ INDI", "1 NAME A /B/", "1 DEAT Y");

    expect(eventCells(collectEvents(only)[0])).toEqual(["Death", "A B", "", ""]);
  });

  it("lists an event that has no date and no place", () => {
    const only = doc("0 @I1@ INDI", "1 NAME A /B/", "1 OCCU Cooper");

    expect(eventCells(collectEvents(only)[0])).toEqual(["Occupation · Cooper", "A B", "", ""]);
  });

  it("names a custom event by its type", () => {
    const only = doc("0 @I1@ INDI", "1 NAME A /B/", "1 EVEN", "2 TYPE Pilgrimage");

    expect(eventCells(collectEvents(only)[0])[0]).toBe("Pilgrimage");
  });

  it("lists nothing for a record with no identifier", () => {
    const only = doc("0 INDI", "1 NAME A /B/", "1 BIRT", "2 DATE 1900");

    expect(collectEvents(only)).toHaveLength(0);
  });

  it("lists the events of a record declared twice once", () => {
    const twice = doc("0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "0 @I1@ INDI", "1 NAME C /D/", "1 DEAT");

    expect(keys(collectEvents(twice))).toEqual(["event:@I1@:DEAT:0"]);
  });

  it("finds the event an id names in O(1) and no other", () => {
    expect(eventAt(index, eventId("@I1@", "BIRT", 0))?.event.tag).toBe("BIRT");
    expect(eventAt(index, "event:@I1@:BIRT:9999")).toBeUndefined();
    expect(eventAt(index, "event:@I1@:MARR:0")).toBeUndefined();
    expect(eventAt(index, "event:@F3@:MARR:0")?.owner).toBe("@F3@");
    expect(eventAt(index, "event:@I1@")).toBeUndefined();
    expect(eventAt(index, "event:@I1@:BIRT:00")).toBeUndefined();
    expect(eventAt(index, "event:@I1@:BIRT:1e0")).toBeUndefined();
    expect(eventAt(index, "event:@I1@:u:0:0")).toBeUndefined();
    expect(eventAt(index, "event:nobody:BIRT:0")).toBeUndefined();
    expect(eventAt(index, "@I1@")).toBeUndefined();
    expect(eventAt(index, "place:paris, france")).toBeUndefined();
  });

  it("keeps the id of an event when events of other tags come before it, and drops it when its own goes", () => {
    const base = ["0 HEAD", "0 @I1@ INDI", "1 NAME A /B/"];
    const id = "event:@I1@:DEAT:0";

    expect(eventAt(doc(...base.slice(1), "1 DEAT"), id)?.event.tag).toBe("DEAT");
    expect(eventAt(doc(...base.slice(1), "1 BIRT", "1 OCCU Cooper", "1 DEAT"), id)?.event.tag).toBe("DEAT");
    expect(eventAt(doc(...base.slice(1), "1 BIRT"), id)).toBeUndefined();
  });

  it("numbers events of one tag among themselves", () => {
    const two = doc("0 @I1@ INDI", "1 NAME A /B/", "1 RESI", "2 PLAC One", "1 OCCU Cooper", "1 RESI", "2 PLAC Two");

    expect(eventAt(two, "event:@I1@:RESI:1")?.event.place).toBe("Two");
    expect(keys(collectEvents(two))).toEqual(["event:@I1@:RESI:0", "event:@I1@:OCCU:0", "event:@I1@:RESI:1"]);
  });

  it("reads an owner whose xref holds a colon", () => {
    expect(eventOwner("event:@a:b@:BIRT:0")).toBe("@a:b@");
    expect(eventOwner("@I1@")).toBeNull();
    expect(eventOwner(null)).toBeNull();
  });

  it("names every row by an id eventAt reads back", () => {
    for (const row of collectEvents(index)) {
      expect(eventAt(index, row.key)).toMatchObject({ owner: row.owner, event: row.event });
    }
  });

  it("is built once for one reading of the file", () => {
    expect(collectEvents(index)).toBe(collectEvents(index));
  });

  it("is reached by the list as a kind", () => {
    expect(listRows(index, { kind: "events", query: "", sort: undefined }, collator)).toHaveLength(51);
  });
});

describe("searching the events", () => {
  it("narrows by the event, in any case", () => {
    expect(rowsOf("PHYSICIST").every((row) => eventTitle(row.event).toLowerCase().includes("physicist"))).toBe(true);
    expect(rowsOf("physicist").length).toBeGreaterThan(0);
  });

  it("narrows by the record", () => {
    expect(rowsOf("pierre curie").some((row) => row.owner === "@I2@")).toBe(true);
  });

  it("narrows by the date and by the place", () => {
    expect(rowsOf("1867").length).toBeGreaterThan(0);
    expect(rowsOf("warsaw").every((row) => row.event.place?.toLowerCase().includes("warsaw") || eventCells(row).join(" ").toLowerCase().includes("warsaw"))).toBe(true);
  });

  it("ignores marks and the letters that do not decompose", () => {
    const polish = doc("0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "2 PLAC Łódź, Poland");

    expect(rowsOf("lodz", undefined, polish)).toHaveLength(1);
  });

  it("finds nothing for a word that is nowhere", () => {
    expect(rowsOf("zzz")).toHaveLength(0);
  });

  it("matches in the language shown, on rows searched before the language changed", () => {
    expect(rowsOf("birth").length).toBeGreaterThan(0);
    setLanguage("ru");

    expect(rowsOf("рождение").length).toBeGreaterThan(0);
    expect(rowsOf("birth")).toHaveLength(0);
  });
});

describe("ordering the events", () => {
  const dated = (rows: EventRow[]): (number | undefined)[] => rows.map((row) => row.event.date?.year);

  it("is the order of the file until a column is chosen", () => {
    expect(keys(rowsOf())).toEqual(keys(collectEvents(index)));
  });

  it("sorts by the first year of the date, the undated last in both directions, ties in file order", () => {
    const up = dated(rowsOf("", { by: "date", dir: "asc" }));
    const down = dated(rowsOf("", { by: "date", dir: "desc" }));

    expect(up.filter((year) => year !== undefined)).toEqual([...up].filter((year) => year !== undefined).sort((a, b) => (a) - (b)));
    expect(up.at(-1)).toBeUndefined();
    expect(down.at(-1)).toBeUndefined();
  });

  it("sorts by the event as it is read, and by the place", () => {
    const events = rowsOf("", { by: "event", dir: "asc" }).map((row) => eventTitle(row.event));
    const places = rowsOf("", { by: "place", dir: "asc" }).map((row) => row.event.place);

    expect(events).toEqual([...events].sort(collator.compare));
    expect(places.at(-1)).toBeUndefined();
  });

  it("sorts by the record as the people and the families sort their names", () => {
    const named = doc(
      "0 @I1@ INDI", "1 NAME Zed /Alpha/", "1 BIRT", "2 DATE 1900",
      "0 @I2@ INDI", "1 NAME Adam /Zulu/", "1 BIRT", "2 DATE 1901",
      "0 @I3@ INDI", "1 BIRT", "2 DATE 1902",
    );

    expect(rowsOf("", { by: "record", dir: "asc" }, named).map((row) => row.owner)).toEqual(["@I1@", "@I2@", "@I3@"]);
    expect(rowsOf("", { by: "record", dir: "desc" }, named).map((row) => row.owner)).toEqual(["@I2@", "@I1@", "@I3@"]);
  });
});
