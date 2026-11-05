import { describe, expect, it } from "vitest";

import { curieWithMap, indexOf } from "../testing/curie";
import { fileMapOf, groupByPlace } from "./fileMap";
import { foldText, matchPlaces } from "./mapSearch";
import { NO_TABLE } from "./placesTable";

const index = indexOf(curieWithMap());
const groups = groupByPlace(fileMapOf(index, NO_TABLE), fileMapOf(index, NO_TABLE).events);
const collator = new Intl.Collator("en");
const names = (query: string) => matchPlaces(groups, query, collator).drawn.map((group) => group.place.name);

describe("folding text for the search", () => {
  it.each([
    ["Skłodowska", "sklodowska"],
    ["Łódź", "lodz"],
    ["Straße", "strasse"],
    ["Øresund", "oresund"],
    ["Đakovo", "dakovo"],
    ["Cæsar", "caesar"],
    ["Œuvre", "oeuvre"],
    ["Iğdır", "igdir"],
    ["Orléans", "orleans"],
  ])("folds %s to %s", (text, folded) => {
    expect(foldText(text)).toBe(folded);
  });

  it("makes skłodowska and Skłodowska one", () => {
    expect(foldText("skłodowska")).toBe(foldText("SKŁODOWSKA"));
  });
});

describe("matching places", () => {
  it("matches a place by case, as written or in part", () => {
    expect(names("WARSAW")).toEqual(["Warsaw, Congress Poland"]);
    expect(names("warsaw, congress")).toEqual(["Warsaw, Congress Poland"]);
  });

  it("does not match an exonym", () => {
    expect(names("varsovie")).toEqual([]);
  });

  it("does not match a person", () => {
    expect(names("Marie")).toEqual([]);
  });

  it("matches in the order of the collator", () => {
    expect(names("france")).toEqual([...names("france")].sort(collator.compare));
    expect(names("france").length).toBeGreaterThan(1);
  });

  it("reports a place with no coordinates as unmapped", () => {
    const found = matchPlaces(groups, "mulhouse", collator);

    expect(found.drawn).toEqual([]);
    expect(found.unmapped.map((group) => group.place.name)).toEqual(["Mulhouse, France"]);
  });

  it("matches nothing for an empty query", () => {
    expect(matchPlaces(groups, "  ", collator)).toEqual({ drawn: [], unmapped: [] });
  });
});
