import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage } from "../i18n";
import { curieWithMap, indexOf } from "../testing/curie";
import { fileMapOf } from "./fileMap";
import { cellsOf, collatorFor, columnsOf, listRows, nextSort, readListState, type ListSort } from "./listRows";
import { coordinatesText, placeRows, placesOf, yearsText, type PlaceRow } from "./placeRows";
import { NO_TABLE, parsePlacesTable } from "./placesTable";

afterEach(resetLanguage);

const index = indexOf(curieWithMap());
const map = fileMapOf(index, NO_TABLE);
const collator = collatorFor("en");
const names = (query = "", sort?: ListSort, source = map): string[] => placeRows(source, { query, sort }, collator).map((row) => row.name);
const flags = (count: number, value: boolean): boolean[] => Array.from({ length: count }, () => value);
const row = (name: string): PlaceRow => placesOf(map).find((one) => one.name === name) as PlaceRow;
const doc = (...places: string[]) =>
  fileMapOf(indexOf(["0 HEAD", "0 @I1@ INDI", "1 NAME A /B/", ...places.flatMap((place) => ["1 BIRT", `2 PLAC ${place}`]), "0 TRLR"].join("\n")), NO_TABLE);

describe("the rows of the places kind", () => {
  it("holds every place of the file, mapped or not, once", () => {
    expect(placesOf(map)).toHaveLength(10);
    expect(placesOf(map).filter((one) => one.coordinates === undefined)).toHaveLength(6);
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

  it("takes the coordinates of the places table into account", () => {
    const table = parsePlacesTable("| P | a | b |\n| - | - | - |\n| Sceaux, France | 48.7766 | 2.2917 |");
    const read = placesOf(fileMapOf(index, table)).find((one) => one.name === "Sceaux, France");

    expect(coordinatesText(read as PlaceRow)).toBe("48.7766, 2.2917");
    expect(coordinatesText(row("Sceaux, France"))).toBe("");
  });

  it("writes coordinates as degrees to four places", () => {
    expect(coordinatesText(row("Paris, France"))).toBe("48.8566, 2.3522");
    expect(coordinatesText({ ...row("Paris, France"), coordinates: { latitude: -33.8688, longitude: 151.20931 } })).toBe("-33.8688, 151.2093");
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

  it("puts the places without coordinates first when ascending and last when descending", () => {
    const withoutAt = (order: string[]): boolean[] => order.map((name) => row(name).coordinates === undefined);

    expect(withoutAt(names("", { by: "coordinates", dir: "asc" }))).toEqual([...flags(6, true), ...flags(4, false)]);
    expect(withoutAt(names("", { by: "coordinates", dir: "desc" }))).toEqual([...flags(4, false), ...flags(6, true)]);
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

describe("the places kind in the shared model of the list", () => {
  it("has the columns place, events, years and coordinates", () => {
    expect(columnsOf("places").map((column) => column.key)).toEqual(["place", "events", "years", "coordinates"]);
    expect(columnsOf("places").map((column) => column.numeric)).toEqual([false, true, false, false]);
  });

  it("serves its rows through listRows", () => {
    const rows = listRows(index, { kind: "places", query: "paris", sort: undefined, places: map }, collator);

    expect(cellsOf("places", rows[0] as PlaceRow, index)).toEqual({
      texts: ["Paris, France", "11", "1855–1958", "48.8566, 2.3522"],
      gap: false,
    });
  });

  it("marks a place with no coordinates as a gap", () => {
    expect(cellsOf("places", row("Mulhouse, France"), index).gap).toBe(true);
  });

  it("has no rows without a model of places", () => {
    expect(listRows(index, { kind: "places", query: "", sort: undefined }, collator)).toEqual([]);
  });

  it("reads the kind, a sort of its columns and the selected place of a saved state", () => {
    expect(readListState({ kind: "places", sort: { places: { by: "events", dir: "desc" } }, place: "paris, france" })).toEqual({
      kind: "places",
      sort: { places: { by: "events", dir: "desc" } },
      place: "paris, france",
    });
  });

  it("drops a selected place that is not in the places kind, and a sort column from another kind", () => {
    expect(readListState({ kind: "families", place: "paris, france" })).toEqual({ kind: "families" });
    expect(readListState({ kind: "places", sort: { places: { by: "name", dir: "asc" } } })).toEqual({ kind: "places" });
    expect(readListState({ sort: { people: { by: "events", dir: "asc" } } })).toEqual({});
  });
});
