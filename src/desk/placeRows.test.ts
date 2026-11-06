import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage } from "../i18n";
import { curieWithEvents, indexOf } from "../testing/curie";
import { cellsOf, collatorFor, columnsOf, listRows, nextSort, readListState, type ListSort } from "./listRows";
import { occurrencesAt, placeAt, placeId, placeKeyOf, placeRows, placesOf, yearsText, type PlaceRow } from "./placeRows";

afterEach(resetLanguage);

const index = indexOf(curieWithEvents());
const collator = collatorFor("en");
const names = (query = "", sort?: ListSort, source = index): string[] => placeRows(source, { query, sort }, collator).map((row) => row.name);
const row = (name: string): PlaceRow => placesOf(index).find((one) => one.name === name) as PlaceRow;
const doc = (...places: string[]) =>
  indexOf(["0 HEAD", "0 @I1@ INDI", "1 NAME A /B/", ...places.flatMap((place) => ["1 BIRT", `2 PLAC ${place}`]), "0 TRLR"].join("\n"));

describe("the rows of the places kind", () => {
  it("holds every place of the file once", () => {
    expect(placesOf(index)).toHaveLength(10);
  });

  it("lists the places in the order the file first names them", () => {
    expect(placesOf(index)[0]?.name).toBe("Warsaw, Congress Poland");
  });

  it("counts the events at a place and spans their years", () => {
    expect(row("Paris, France")).toMatchObject({ events: 11, years: [1855, 1958] });
    expect(yearsText(row("Mulhouse, France"))).toBe("1827");
    expect(yearsText(row("Paris, France"))).toBe("1855–1958");
  });

  it("names a place as first written", () => {
    const spellings = doc("paris, France", "Paris,  FRANCE");

    expect(names("", undefined, spellings)).toEqual(["paris, France"]);
  });
});

describe("ordering the places", () => {
  it("is alphabetical by the collator of the language until a column is chosen", () => {
    const ordered = names();

    expect(ordered).toEqual([...ordered].sort(collator.compare));
    expect(ordered[0]).toBe("Montpellier, France");
  });

  it("orders by the collator of the language of the plugin", () => {
    const ordered = placeRows(doc("Яблоково", "Москва", "Аксай"), { query: "", sort: undefined }, collatorFor("ru")).map((one) => one.name);

    expect(ordered).toEqual(["Аксай", "Москва", "Яблоково"]);
  });

  it("reverses by the place column", () => {
    expect(names("", { by: "place", dir: "desc" })).toEqual([...names()].reverse());
  });

  it("orders by events, ties in file order in both directions", () => {
    const ascending = names("", { by: "events", dir: "asc" });
    const descending = names("", { by: "events", dir: "desc" });

    expect(ascending.slice(0, 2)).toEqual(["Passy, Haute-Savoie, France", "Mulhouse, France"]);
    expect(descending[0]).toBe("Warsaw, Congress Poland");
    expect(descending.slice(-2)).toEqual(["United States", "New Orleans, Louisiana, United States"]);
  });

  it("orders by the first year", () => {
    expect(names("", { by: "years", dir: "asc" }).slice(0, 2)).toEqual(["Mulhouse, France", "Warsaw, Congress Poland"]);
    expect(names("", { by: "years", dir: "desc" })[0]).toBe("New York, New York, United States");
  });

  it("goes round the three presses of a header", () => {
    const first = nextSort(undefined, "events");
    const second = nextSort(first, "events");

    expect([first, second, nextSort(second, "events")]).toEqual([{ by: "events", dir: "asc" }, { by: "events", dir: "desc" }, undefined]);
  });
});

describe("searching the places", () => {
  it("matches in any case", () => {
    expect(names("PARIS")).toEqual(["Paris, France"]);
  });

  it("matches without accents", () => {
    expect(names("montpelliér")).toEqual(["Montpellier, France"]);
  });

  it("matches the transliteration of letters that do not decompose", () => {
    const places = doc("Łódź, Poland", "Tromsø, Norway", "Gdańsk");

    expect(names("lodz", undefined, places)).toEqual(["Łódź, Poland"]);
    expect(names("tromso", undefined, places)).toEqual(["Tromsø, Norway"]);
    expect(names("GDANSK", undefined, places)).toEqual(["Gdańsk"]);
  });

  it("finds nothing for a text no place holds", () => {
    expect(names("atlantis")).toEqual([]);
  });

  it("lists every place for a blank query", () => {
    expect(names("   ")).toHaveLength(10);
  });
});

describe("a place as a selectable record", () => {
  it("has an id that no xref can have, which reads back to the key", () => {
    expect(placeId("  Paris,   FRANCE ")).toBe("place:paris, france");
    expect(placeKeyOf("place:paris, france")).toBe("paris, france");
    expect(placeKeyOf("@I1@")).toBeNull();
  });

  it("is found in the file by its id, and only if the file names it", () => {
    expect(placeAt(index, placeId("Paris, France"))?.name).toBe("Paris, France");
    expect(placeAt(index, "place:atlantis")).toBeUndefined();
    expect(placeAt(index, "@I1@")).toBeUndefined();
  });

  it("lists the events held there by year, with the record each belongs to", () => {
    const found = occurrencesAt(index, "paris, france");

    expect(found).toHaveLength(11);
    expect(found.every(({ record }) => record.startsWith("@"))).toBe(true);
    const years = found.map(({ event }) => event.date?.year ?? Infinity);
    expect(years).toEqual([...years].sort((a, b) => a - b));
  });
});

describe("the places kind in the shared model of the list", () => {
  it("has the columns place, events and years", () => {
    expect(columnsOf("places").map((column) => column.key)).toEqual(["place", "events", "years"]);
    expect(columnsOf("places").map((column) => column.numeric)).toEqual([false, true, false]);
  });

  it("serves its rows through listRows", () => {
    const rows = listRows(index, { kind: "places", query: "paris", sort: undefined }, collator);

    expect(cellsOf("places", rows[0] as PlaceRow, index)).toEqual({ texts: ["Paris, France", "11", "1855–1958"], gap: false });
  });

  it("reads the kind and a sort of its columns of a saved state", () => {
    expect(readListState({ kind: "places", sort: { places: { by: "events", dir: "desc" } } })).toEqual({
      kind: "places",
      sort: { places: { by: "events", dir: "desc" } },
    });
  });

  it("drops a sort column from another kind", () => {
    expect(readListState({ kind: "places", sort: { places: { by: "name", dir: "asc" } } })).toEqual({ kind: "places" });
    expect(readListState({ sort: { people: { by: "events", dir: "asc" } } })).toEqual({});
  });
});
