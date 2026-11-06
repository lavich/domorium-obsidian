import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { curieIndex, curieWithEvents, indexOf } from "../testing/curie";
import { eventCells, eventRows, eventsOf, eventTitle, type EventRow } from "./eventRows";
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
    expect(eventsOf(index)).toHaveLength(51);
    expect(new Set(keys(eventsOf(index))).size).toBe(51);
  });

  it("lists them in the order the file writes them, the families among the people", () => {
    const lines = eventsOf(index).map((row) => row.event.range.start.line);

    expect(lines).toEqual([...lines].sort((a, b) => a - b));
    expect(eventsOf(index).some((row) => row.fact.startsWith("f:"))).toBe(true);
  });

  it("keys a person's event p:<n> and a family's f:<n>, with the record's xref", () => {
    const row = eventsOf(index).find((one) => one.xref === "@I1@");

    expect(row).toMatchObject({ fact: "p:0", key: "@I1@|p:0" });
    expect(eventsOf(index).find((one) => one.fact.startsWith("f:"))?.xref.startsWith("@F")).toBe(true);
  });

  it("reads a birth as the card names it, with its record, date and place", () => {
    const birth = eventsOf(index).find((row) => row.key === "@I1@|p:0") as EventRow;

    expect(eventCells(birth)).toEqual(["Birth", "Marie Skłodowska-Curie", "7 NOV 1867", "Warsaw, Congress Poland"]);
  });

  it("names the events of a family after the family", () => {
    const marriages = eventsOf(index).filter((row) => row.fact.startsWith("f:")).map((row) => eventCells(row));

    expect(marriages).toContainEqual(["Marriage", "Pierre Curie and Marie Skłodowska-Curie", "26 JUL 1895", "Sceaux, France"]);
  });

  it("follows an occupation with its text and tells the awards apart", () => {
    const titles = eventsOf(withEvents).map((row) => eventTitle(row.event));

    expect(titles).toContain("Occupation · Physicist");
    expect(titles).toContain("Award · Nobel Prize in Physics");
    expect(titles).toContain("Award · Nobel Prize in Chemistry");
  });

  it("drops a value of Y, which is not text", () => {
    const only = doc("0 @I1@ INDI", "1 NAME A /B/", "1 DEAT Y");

    expect(eventCells(eventsOf(only)[0])).toEqual(["Death", "A B", "", ""]);
  });

  it("lists an event that has no date and no place", () => {
    const only = doc("0 @I1@ INDI", "1 NAME A /B/", "1 OCCU Cooper");

    expect(eventCells(eventsOf(only)[0])).toEqual(["Occupation · Cooper", "A B", "", ""]);
  });

  it("names a custom event by its type", () => {
    const only = doc("0 @I1@ INDI", "1 NAME A /B/", "1 EVEN", "2 TYPE Pilgrimage");

    expect(eventCells(eventsOf(only)[0])[0]).toBe("Pilgrimage");
  });

  it("lists nothing for a record with no identifier", () => {
    const only = doc("0 INDI", "1 NAME A /B/", "1 BIRT", "2 DATE 1900");

    expect(eventsOf(only)).toHaveLength(0);
  });

  it("lists the events of a record declared twice once", () => {
    const twice = doc("0 @I1@ INDI", "1 NAME A /B/", "1 BIRT", "0 @I1@ INDI", "1 NAME C /D/", "1 DEAT");

    expect(keys(eventsOf(twice))).toEqual(["@I1@|p:0"]);
  });

  it("is built once for one reading of the file", () => {
    expect(eventsOf(index)).toBe(eventsOf(index));
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
    expect(new Set(rowsOf("pierre curie").map((row) => row.xref))).toEqual(new Set(["@I2@", ...rowsOf("pierre curie").filter((row) => row.family).map((row) => row.xref)]));
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
    expect(keys(rowsOf())).toEqual(keys(eventsOf(index)));
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

    expect(rowsOf("", { by: "record", dir: "asc" }, named).map((row) => row.xref)).toEqual(["@I1@", "@I2@", "@I3@"]);
    expect(rowsOf("", { by: "record", dir: "desc" }, named).map((row) => row.xref)).toEqual(["@I2@", "@I1@", "@I3@"]);
  });
});
