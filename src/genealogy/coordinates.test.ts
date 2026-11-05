import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { curieWithMap } from "../testing/curie";
import { readDegrees } from "./coordinates";
import { buildIndex } from "./index";

function eventsOfBirth(birth: string[], head = ["0 HEAD", "1 GEDC", "2 VERS 7.0"]): ReturnType<typeof firstEvent> {
  return firstEvent([...head, "0 @I1@ INDI", "1 BIRT", ...birth, "0 TRLR"].join("\n"));
}

function firstEvent(text: string) {
  const person = buildIndex(new GedcomLanguageService(text)).person("@I1@");
  const event = person?.events[0];
  if (!event) {
    throw new Error("no event");
  }
  return event;
}

const map = (lat: string, lon: string): string[] => ["2 PLAC Somewhere", "3 MAP", `4 LATI ${lat}`, `4 LONG ${lon}`];

describe("reading a coordinate", () => {
  it.each([
    ["N52.2297", "lat", 52.2297],
    ["S18.150944", "lat", -18.150944],
    ["E21.0122", "lon", 21.0122],
    ["W46.6", "lon", -46.6],
    ["n 52.2297", "lat", 52.2297],
    ["21,0122 E", "lon", 21.0122],
    ["-70.6693", "lon", -70.6693],
    ["52.2297", "lat", 52.2297],
    ["S0", "lat", 0],
    ["E0", "lon", 0],
  ] as const)("reads %s as %s %f", (text, axis, expected) => {
    expect(readDegrees(text, axis)).toBe(expected);
  });

  it("never gives negative zero", () => {
    expect(Object.is(readDegrees("S0", "lat"), 0)).toBe(true);
    expect(Object.is(readDegrees("-0", "lon"), 0)).toBe(true);
  });

  it.each([
    ["W-1.5", "lon"],
    ["N95.0", "lat"],
    ["E181", "lon"],
    ["10.5 E", "lat"],
    ["", "lat"],
    ["north", "lat"],
    ["N", "lat"],
    ["52.2.1", "lat"],
  ] as const)("refuses %s as %s", (text, axis) => {
    expect(readDegrees(text, axis)).toBeUndefined();
  });
});

describe("the coordinates of an event's place", () => {
  it("reads a MAP under the PLAC of a birth", () => {
    const event = eventsOfBirth(["2 PLAC Warsaw", "3 MAP", "4 LATI N52.2297", "4 LONG E21.0122"]);

    expect(event.place).toBe("Warsaw");
    expect(event.coordinates).toEqual({ latitude: 52.2297, longitude: 21.0122 });
  });

  it("reads the southern and western hemispheres", () => {
    expect(eventsOfBirth(map("S18.150944", "W46.6")).coordinates).toEqual({
      latitude: -18.150944,
      longitude: -46.6,
    });
  });

  it("reads a family's event", () => {
    const text = [
      "0 HEAD",
      "0 @I1@ INDI",
      "0 @F1@ FAM",
      "1 MARR",
      "2 PLAC Paris, France",
      "3 MAP",
      "4 LATI N48.8566",
      "4 LONG E2.3522",
      "0 TRLR",
    ].join("\n");
    const family = buildIndex(new GedcomLanguageService(text)).family("@F1@");

    expect(family?.events[0]?.coordinates).toEqual({ latitude: 48.8566, longitude: 2.3522 });
  });

  it("reports the place alone where there is no MAP", () => {
    const event = eventsOfBirth(["2 PLAC Sceaux, France"]);

    expect(event.place).toBe("Sceaux, France");
    expect(event.coordinates).toBeUndefined();
  });

  it.each([
    [["2 PLAC X", "3 MAP", "4 LATI N52.2"]],
    [map("N95.0", "E10.0")],
    [map("N52.2", "W-1.5")],
    [map("E52.2", "E10")],
  ])("reports the place and no coordinates for %j", (lines) => {
    const event = eventsOfBirth(lines);

    expect(event.place).toBeDefined();
    expect(event.coordinates).toBeUndefined();
  });

  it("ignores a MAP that sits under the event and not under its PLAC", () => {
    const event = eventsOfBirth(["2 PLAC X", "2 MAP", "3 LATI N52.2", "3 LONG E10"]);

    expect(event.coordinates).toBeUndefined();
  });

  it("gives an event with no PLAC none", () => {
    expect(eventsOfBirth(["2 DATE 1900"]).coordinates).toBeUndefined();
  });

  it("reads the same birth in 5.5.1, in 7.0 and in a document with no version", () => {
    const lines = map("N52.2297", "E21.0122");
    const heads = [
      ["0 HEAD", "1 GEDC", "2 VERS 5.5.1"],
      ["0 HEAD", "1 GEDC", "2 VERS 7.0"],
      ["0 HEAD"],
    ];

    expect(heads.map((head) => eventsOfBirth(lines, head).coordinates)).toEqual(
      heads.map(() => ({ latitude: 52.2297, longitude: 21.0122 })),
    );
  });
});

describe("the Curie fixture with coordinates", () => {
  it("maps four of its places and leaves the others", () => {
    const index = buildIndex(new GedcomLanguageService(curieWithMap()));
    const places = new Map<string, boolean>();
    for (const row of index.people) {
      for (const event of index.person(row.xref ?? "")?.events ?? []) {
        if (event.place !== undefined) {
          places.set(event.place, event.coordinates !== undefined || places.get(event.place) === true);
        }
      }
    }

    expect(places.get("Paris, France")).toBe(true);
    expect(places.get("Passy, Haute-Savoie, France")).toBe(true);
    expect(places.get("Mulhouse, France")).toBe(false);
  });
});
