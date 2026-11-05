// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { curieWithMap, indexOf } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { fileMapOf, groupByPlace, type PlaceGroup } from "./fileMap";
import { MapFind } from "./mapFind";
import { NO_TABLE } from "./placesTable";

beforeAll(installObsidianDom);

const model = fileMapOf(indexOf(curieWithMap()), NO_TABLE);
const groups = groupByPlace(model, model.events);

let find: MapFind;
let matches: (ReadonlySet<string> | null)[];
let went: string[];
let notes: string[];
let cleared: ReturnType<typeof vi.fn<() => void>>;

beforeEach(() => {
  document.body.replaceChildren();
  matches = [];
  went = [];
  notes = [];
  cleared = vi.fn();
  find = new MapFind(document.body, {
    groups: () => groups,
    collator: () => new Intl.Collator("en"),
    matchesChanged: (keys) => matches.push(keys),
    goTo: (group: PlaceGroup) => went.push(group.place.name),
    cleared,
    note: (text) => notes.push(text),
    setIcon: () => undefined,
  });
});

const type = (text: string): void => {
  const input = find.el.querySelector("input")!;
  input.value = text;
  input.dispatchEvent(new Event("input"));
};
const next = (): void => find.el.querySelector<HTMLButtonElement>(".gedcom-map-find-next")!.click();
const count = (): string => find.el.querySelector(".gedcom-map-find-count")?.textContent ?? "";

describe("the search over places", () => {
  it("says how many places match and dims the rest", () => {
    type("france");

    expect(matches.at(-1)).toEqual(new Set(["paris, france", "passy, haute-savoie, france"]));
    expect(count()).toBe("2 matches");
  });

  it("matches no person", () => {
    type("Marie");

    expect(count()).toBe("No results");
  });

  it("steps through the matches in the order of the panel, wrapping, and glides to each", () => {
    type("france");
    next();
    expect(count()).toBe("1 / 2");
    next();
    expect(count()).toBe("2 / 2");
    next();

    expect(went).toEqual(["Paris, France", "Passy, Haute-Savoie, France", "Paris, France"]);
    expect(count()).toBe("1 / 2");
  });

  it("says a place has no coordinates where only such a place matches", () => {
    type("mulhouse");

    expect(notes.at(-1)).toBe("Mulhouse, France has no coordinates");
    expect(count()).toBe("No results");
  });

  it("clears the marks of the query when the field is emptied", () => {
    type("paris");
    type("");

    expect(matches.at(-1)).toBeNull();
    expect(cleared).toHaveBeenCalled();
  });

  it("opens with the field focused", () => {
    find.open();

    expect(find.isOpen()).toBe(true);
    expect(document.activeElement).toBe(find.el.querySelector("input"));
  });
});
