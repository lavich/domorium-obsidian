// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";

import { curieWithMap, indexOf } from "../testing/curie";
import { fileMapOf, groupByPlace, type MapEvent, type PlaceGroup, routeOf } from "./fileMap";
import { MapMarks, type MarksInput } from "./mapMarks";
import { type MapView, viewOf, type Size } from "./mapProjection";
import { parsePlacesTable } from "./placesTable";

const SVG = "http://www.w3.org/2000/svg";
const size: Size = { width: 1400, height: 900 };

let layers: { route: SVGGElement; marks: SVGGElement; labels: SVGGElement };
let marks: MapMarks;

beforeEach(() => {
  const svg = document.createElementNS(SVG, "svg");
  layers = {
    route: document.createElementNS(SVG, "g"),
    marks: document.createElementNS(SVG, "g"),
    labels: document.createElementNS(SVG, "g"),
  };
  svg.append(layers.route, layers.marks, layers.labels);
  document.body.replaceChildren(svg);
  marks = new MapMarks(layers);
});

const event = (kind: MapEvent["kind"], year?: number, record = "@I1@"): MapEvent => ({
  record,
  family: false,
  kind,
  tag: "EVEN",
  place: "X",
  order: 0,
  ...(year === undefined ? {} : { year, span: [year, year] as [number, number] }),
});

const group = (name: string, lat: number, lon: number, events: MapEvent[]): PlaceGroup => ({
  place: { key: name.toLowerCase(), name, coordinates: { latitude: lat, longitude: lon } },
  events,
});

function input(groups: PlaceGroup[], view: MapView, extra: Partial<MarksInput> = {}): MarksInput {
  return {
    view,
    size,
    coarse: false,
    groups,
    highlighted: new Set(),
    selected: false,
    route: { stops: [], numbers: new Map() },
    current: null,
    focused: null,
    matches: null,
    measure: (text) => text.length * 7,
    ...extra,
  };
}

const at = (lat: number, lon: number, zoom = 6): MapView => viewOf({ lat, lon, zoom }, size);
const nodes = (): Element[] => Array.from(layers.marks.children);

describe("the marks of places", () => {
  it("draws one mark per place with the size and kind of its events", () => {
    const groups = [
      group("Paris", 48.85, 2.35, [event("birth"), event("birth"), event("birth")]),
      group("Warsaw", 52.22, 21, [event("birth")]),
    ];
    marks.draw(input(groups, at(50, 10)));
    const [paris, warsaw] = nodes();

    expect(nodes()).toHaveLength(2);
    expect(paris?.getAttribute("class")).toContain("is-birth");
    expect(warsaw?.getAttribute("class")).toContain("is-birth");
    expect(Number(paris?.querySelector(".gedcom-map-disc")?.getAttribute("r"))).toBeGreaterThan(
      Number(warsaw?.querySelector(".gedcom-map-disc")?.getAttribute("r")),
    );
  });

  it("is grey with the number of events where the kinds differ", () => {
    marks.draw(input([group("Paris", 48.85, 2.35, [event("other"), event("marriage"), event("death")])], at(48.85, 2.35)));

    expect(nodes()[0]?.getAttribute("class")).toContain("is-mixed");
    expect(nodes()[0]?.querySelector(".gedcom-map-count")?.textContent).toBe("3");
  });

  it("draws a ring with the number of places where places overlap", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")]), group("Passy", 48.857, 2.357, [event("other")])];
    marks.draw(input(groups, at(48.85, 2.35, 7)));

    expect(nodes()).toHaveLength(1);
    expect(nodes()[0]?.getAttribute("class")).toContain("is-cluster");
    expect(nodes()[0]?.querySelector(".gedcom-map-count")?.textContent).toBe("2");
  });

  it("parts a cluster as the map zooms in", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")]), group("Passy", 48.857, 2.357, [event("other")])];
    marks.draw(input(groups, at(48.85, 2.35, 12)));

    expect(nodes()).toHaveLength(2);
  });

  it("labels a place with its name and the years of its events", () => {
    const groups = [
      group("Small, X", 48.85, 2.35, [event("other", 1900)]),
      group("Large, X", 48.856, 2.35, [event("other", 1890), event("other", 1934)]),
    ];
    marks.draw(input(groups, at(48.85, 2.35, 11)));
    const texts = Array.from(layers.labels.children).map((node) => node.textContent);

    expect(texts).toContain("Large · 1890–1934");
    expect(texts).toContain("Small · 1900");
  });

  it("highlights the selected record's places and dims the rest", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")]), group("Warsaw", 52.22, 21, [event("other")])];
    marks.draw(input(groups, at(50, 10), { selected: true, highlighted: new Set(["paris"]) }));
    const classes = nodes().map((node) => node.getAttribute("class") ?? "");

    expect(classes.filter((one) => one.includes("is-highlighted"))).toHaveLength(1);
    expect(classes.filter((one) => one.includes("is-dimmed"))).toHaveLength(1);
  });

  it("dims places that do not match a query and rings the current one", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")]), group("Warsaw", 52.22, 21, [event("other")])];
    marks.draw(input(groups, at(50, 10), { matches: new Set(["paris"]), current: "paris" }));

    expect(nodes().filter((node) => node.getAttribute("class")?.includes("is-dimmed"))).toHaveLength(1);
    expect(nodes().filter((node) => node.getAttribute("class")?.includes("is-current"))).toHaveLength(1);
  });

  it("keeps the selected places as points rather than a cluster", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")]), group("Passy", 48.857, 2.357, [event("other")])];
    marks.draw(input(groups, at(48.85, 2.35, 7), { selected: true, highlighted: new Set(["paris", "passy"]) }));

    expect(nodes().every((node) => node.getAttribute("class")?.includes("is-point"))).toBe(true);
  });

  it("reuses its elements across a pan", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")])];
    marks.draw(input(groups, at(48.85, 2.35)));
    const before = nodes()[0];
    marks.draw(input(groups, at(48.9, 2.5)));

    expect(nodes()[0]).toBe(before);
  });

  it("removes the mark of a place that leaves the view", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")])];
    marks.draw(input(groups, at(48.85, 2.35)));
    marks.draw(input(groups, at(-30, 150)));

    expect(nodes()).toHaveLength(0);
  });

  it("holds under 600 marks for five thousand places at the world zoom and after a pan", () => {
    const groups = Array.from({ length: 5000 }, (_, i) =>
      group(`P${i}`, ((i * 7919) % 120) - 40 + (i % 7) * 0.01, ((i * 104729) % 300) - 150, [event("other")]),
    );
    marks.draw(input(groups, at(20, 0, 1.7)));
    expect(marks.count()).toBeLessThan(600);
    marks.draw(input(groups, at(40, 30, 3)));

    expect(marks.count()).toBeLessThan(600);
  });

  it("finds the mark nearest a press within the target", () => {
    const groups = [group("Paris", 48.85, 2.35, [event("other")])];
    const [drawn] = marks.draw(input(groups, at(48.85, 2.35)));

    expect(marks.hit((drawn?.x ?? 0) + 10, drawn?.y ?? 0, false)?.id).toBe(drawn?.id);
    expect(marks.hit((drawn?.x ?? 0) + 200, drawn?.y ?? 0, true)).toBeUndefined();
  });
});

describe("the route of a record", () => {
  it("draws Marie's line with an arrow on each segment and numbers on the stops", () => {
    const index = indexOf(curieWithMap());
    const table = parsePlacesTable("| P | a | b |\n| - | - | - |\n| Sceaux, France | 48.7766 | 2.2917 |");
    const map = fileMapOf(index, table);
    const groups = groupByPlace(map, map.events).filter((one) => one.place.coordinates !== undefined);
    marks.draw(input(groups, at(48, 12, 4), { route: routeOf(map, index, "@I1@"), selected: true }));

    expect(layers.route.querySelectorAll(".gedcom-map-arrow")).toHaveLength(4);
    expect(Array.from(layers.route.querySelectorAll(".gedcom-map-number")).map((node) => node.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    expect(layers.route.querySelectorAll("polyline")).toHaveLength(1);
  });

  it("numbers a place stopped at twice with both", () => {
    const groups = [group("A", 10, 10, [event("other")]), group("B", 20, 20, [event("other")])];
    marks.draw(
      input(groups, at(15, 15, 4), {
        route: { stops: [{ key: "a", number: 1 }, { key: "b", number: 2 }, { key: "a", number: 3 }], numbers: new Map([["a", [1, 3]], ["b", [2]]]) },
      }),
    );

    expect(Array.from(layers.route.querySelectorAll(".gedcom-map-number")).map((node) => node.textContent)).toEqual(["1, 3", "2"]);
  });

  it("draws nothing for no route", () => {
    marks.draw(input([group("A", 10, 10, [event("other")])], at(10, 10)));

    expect(layers.route.children).toHaveLength(0);
  });
});
