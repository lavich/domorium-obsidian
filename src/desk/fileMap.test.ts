import { describe, expect, it } from "vitest";

import { curieWithMap, indexOf } from "../testing/curie";
import {
  fileMapOf,
  groupByPlace,
  mapSelection,
  orderedPlaces,
  placeLabel,
  placesWithoutRow,
  routeOf,
  scopeEvents,
} from "./fileMap";
import { NO_TABLE, parsePlacesTable, placeKey } from "./placesTable";

const index = indexOf(curieWithMap());
const SCEAUX = parsePlacesTable("| P | a | b |\n| - | - | - |\n| Sceaux, France | 48.7766 | 2.2917 |");
const map = fileMapOf(index, SCEAUX);
const names = (route: ReturnType<typeof routeOf>): (string | undefined)[] =>
  route.stops.map((stop) => map.places.get(stop.key)?.name);

const doc = (...lines: string[]) => indexOf(["0 HEAD", ...lines, "0 TRLR"].join("\n"));
const person = (xref: string, ...events: string[]): string[] => [`0 ${xref} INDI`, "1 NAME A /B/", ...events];

describe("the places of a file", () => {
  it("takes the coordinates of a MAP in the file", () => {
    expect(map.places.get(placeKey("Warsaw, Congress Poland"))?.coordinates).toEqual({ latitude: 52.2297, longitude: 21.0122 });
  });

  it("leaves a place with neither a MAP nor a row without coordinates", () => {
    expect(map.places.get(placeKey("Mulhouse, France"))?.coordinates).toBeUndefined();
  });

  it("lets the table fill in a place but never override the file", () => {
    const table = parsePlacesTable(
      ["| P | La | Lo |", "| - | - | - |", "| Sceaux, France | 48.7766 | 2.2917 |", "| Paris, France | 1 | 1 |"].join("\n"),
    );
    const mapped = fileMapOf(index, table);

    expect(mapped.places.get(placeKey("Sceaux, France"))?.coordinates).toEqual({ latitude: 48.7766, longitude: 2.2917 });
    expect(mapped.places.get(placeKey("Paris, France"))?.coordinates?.latitude).toBe(48.8566);
  });

  it("merges two spellings, named as first written, with the coordinates of whichever has the MAP", () => {
    const text = doc(
      ...person("@I1@", "1 BIRT", "2 PLAC Paris, France", "1 DEAT", "2 PLAC paris,  france", "3 MAP", "4 LATI N48.8", "4 LONG E2.3"),
    );
    const places = [...fileMapOf(text, NO_TABLE).places.values()];

    expect(places).toHaveLength(1);
    expect(places[0]?.name).toBe("Paris, France");
    expect(places[0]?.coordinates).toEqual({ latitude: 48.8, longitude: 2.3 });
  });

  it("falls through a half-stated MAP to the table", () => {
    const text = doc(...person("@I1@", "1 BIRT", "2 PLAC X", "3 MAP", "4 LATI N10"));
    const table = parsePlacesTable("| P | a | b |\n| - | - | - |\n| X | 5 | 6 |");

    expect(fileMapOf(text, table).places.get("x")?.coordinates).toEqual({ latitude: 5, longitude: 6 });
  });

  it("counts a marriage once however many spouses are in scope", () => {
    const marriages = map.events.filter((event) => event.tag === "MARR");

    expect(marriages.map((event) => event.record)).toEqual(expect.arrayContaining(["@F3@"]));
    expect(marriages.filter((event) => event.record === "@F3@")).toHaveLength(1);
  });

  it("is the same object for the same index and table", () => {
    expect(fileMapOf(index, SCEAUX)).toBe(map);
    expect(fileMapOf(index, parsePlacesTable(""))).not.toBe(map);
  });
});

describe("the moves of a record", () => {
  it("runs Marie through Warsaw, Paris, Sceaux, Stockholm and Passy, numbering stops", () => {
    const route = routeOf(map, index, "@I1@");

    expect(names(route)).toEqual([
      "Warsaw, Congress Poland",
      "Paris, France",
      "Sceaux, France",
      "Stockholm, Sweden",
      "Passy, Haute-Savoie, France",
    ]);
    expect(route.stops.map((stop) => stop.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it("gives a place stopped at twice both numbers", () => {
    const text = doc(
      ...person("@I1@", "1 BIRT", "2 DATE 1900", "2 PLAC A", "3 MAP", "4 LATI N1", "4 LONG E1", "1 RESI", "2 DATE 1910", "2 PLAC B", "3 MAP", "4 LATI N2", "4 LONG E2", "1 DEAT", "2 DATE 1920", "2 PLAC A"),
    );
    const mapped = fileMapOf(text, NO_TABLE);

    expect(routeOf(mapped, text, "@I1@").numbers.get("a")).toEqual([1, 3]);
  });

  it("breaks a tie of years by the order of the lines of the file", () => {
    const text = doc(
      "0 @I1@ INDI",
      "1 NAME A /B/",
      "1 FAMS @F1@",
      "1 BIRT",
      "2 DATE 1900",
      "2 PLAC Later",
      "3 MAP",
      "4 LATI N1",
      "4 LONG E1",
      "0 @F1@ FAM",
      "1 HUSB @I1@",
      "1 MARR",
      "2 DATE 1900",
      "2 PLAC Earlier",
      "3 MAP",
      "4 LATI N2",
      "4 LONG E2",
    );
    const mapped = fileMapOf(text, NO_TABLE);

    expect(routeOf(mapped, text, "@I1@").stops.map((stop) => stop.key)).toEqual(["later", "earlier"]);
  });

  it("draws a family's own events only", () => {
    const route = routeOf(map, index, "@F3@");

    expect(names(route)).toEqual(["Sceaux, France"]);
  });

  it("leaves undated events and unmapped places off the route", () => {
    const text = doc(...person("@I1@", "1 BIRT", "2 PLAC A", "3 MAP", "4 LATI N1", "4 LONG E1", "1 DEAT", "2 DATE 1900", "2 PLAC Nowhere"));

    expect(routeOf(fileMapOf(text, NO_TABLE), text, "@I1@").stops).toEqual([]);
  });

  it("applies the range the caller keeps", () => {
    const route = routeOf(map, index, "@I1@", (event) => (event.year ?? 0) >= 1900);

    expect(names(route)).toEqual(["Stockholm, Sweden", "Passy, Haute-Savoie, France"]);
  });
});

describe("the scope of the map", () => {
  it("is the whole file with no branch", () => {
    expect(scopeEvents(map, index, null)).toHaveLength(map.events.length);
  });

  it("keeps a person's events and a family with a spouse in the branch", () => {
    const events = scopeEvents(map, index, new Set(["@I1@"]));

    expect(events.every((event) => event.record === "@I1@" || event.record.startsWith("@F"))).toBe(true);
    expect(events.some((event) => event.record === "@F3@")).toBe(true);
    expect(events.some((event) => event.record === "@F1@")).toBe(false);
  });

  it("groups events by place and splits the mapped from the rest", () => {
    const groups = groupByPlace(map, map.events);
    const unmapped = groups.filter((group) => group.place.coordinates === undefined).map((group) => group.place.name);

    expect(unmapped).toContain("Mulhouse, France");
    expect(groups.find((group) => group.place.key === "paris, france")?.events.length).toBeGreaterThan(2);
  });

  it("names the places with neither coordinates nor a row", () => {
    const table = parsePlacesTable("| P | a | b |\n| - | - | - |\n| Mulhouse, France |  |  |");
    const missing = placesWithoutRow(fileMapOf(index, table).places.values(), table);

    expect(missing).not.toContain("Mulhouse, France");
    expect(missing).toContain("Montpellier, France");
  });

  it("orders places by the collator", () => {
    const groups = orderedPlaces(groupByPlace(map, map.events), new Intl.Collator("en"));
    const named = groups.map((group) => group.place.name);

    expect(named).toEqual([...named].sort(new Intl.Collator("en").compare));
  });
});

describe("selecting on the map", () => {
  it("accepts a person and a family and nothing else", () => {
    expect(mapSelection(index, "@I1@")).toBe("@I1@");
    expect(mapSelection(index, "@F3@")).toBe("@F3@");
    expect(mapSelection(index, "@S1@")).toBeNull();
    expect(mapSelection(index, "@O1@")).toBeNull();
    expect(mapSelection(index, "@X@")).toBeNull();
    expect(mapSelection(index, null)).toBeNull();
  });
});

describe("the label of a place", () => {
  const place = { key: "paris, france", name: "Paris, France" };
  const at = (year: number, end?: number) => ({
    record: "@I1@", family: false, kind: "other" as const, tag: "EVEN", place: "Paris, France", year, span: [year, end ?? year] as [number, number], order: 0,
  });

  it("gives the short name and the years", () => {
    expect(placeLabel(place, [at(1891), at(1934)])).toBe("Paris · 1891–1934");
  });

  it("gives one year alone", () => {
    expect(placeLabel({ key: "s", name: "Stockholm, Sweden" }, [at(1903)])).toBe("Stockholm · 1903");
  });

  it("counts both ends of a period", () => {
    expect(placeLabel(place, [at(1891, 1894)])).toBe("Paris · 1891–1894");
  });

  it("gives the name alone where nothing is dated", () => {
    expect(placeLabel({ key: "s", name: "Sceaux, France" }, [{ ...at(0), span: undefined }])).toBe("Sceaux");
  });

  it("writes a year before the common era as the plugin does", () => {
    expect(placeLabel(place, [at(-43)])).toMatch(/Paris · .*44/u);
  });
});
