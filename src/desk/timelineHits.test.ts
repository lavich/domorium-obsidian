// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";

import { markOf, missesQuery, personOf, yearAtX } from "./timelineHits";

describe("yearAtX", () => {
  it("maps a client x to the year under it, rounded", () => {
    const geometry = { lo: 1800, zoom: 5, pad: 12, chartLeft: 100 };
    expect(yearAtX(geometry, 112)).toBe(1800);
    expect(yearAtX(geometry, 112 + 5 * 10 + 2)).toBe(1810);
    expect(yearAtX(geometry, 112 + 5 * 10 + 3)).toBe(1811);
  });
});

describe("personOf", () => {
  it("finds the person on the nearest ancestor, and none for a bare target", () => {
    const outer = document.createElement("div");
    outer.setAttribute("data-p", "@I1@");
    const inner = document.createElement("span");
    outer.append(inner);
    expect(personOf(inner)).toBe("@I1@");
    expect(personOf(document.createElement("div"))).toBeNull();
    expect(personOf(null)).toBeNull();
  });
});

describe("markOf", () => {
  it("returns what is held for the enclosing mark", () => {
    const mark = document.createElement("g");
    mark.setAttribute("class", "gedcom-ft-mark");
    const inner = document.createElement("span");
    mark.append(inner);
    const marks = new Map<Element, string>([[mark, "placed"]]);
    expect(markOf(inner, marks)).toBe("placed");
    expect(markOf(document.createElement("div"), marks)).toBeNull();
    expect(markOf(null, marks)).toBeNull();
  });
});

describe("missesQuery", () => {
  const text = new Map([["a", "ann smith"], ["b", "bob"]]);

  it("misses nothing without a query", () => {
    expect(missesQuery("", text, ["a"])).toBe(false);
  });

  it("misses only when no id contains the query", () => {
    expect(missesQuery("smi", text, ["a"])).toBe(false);
    expect(missesQuery("smi", text, ["b"])).toBe(true);
    expect(missesQuery("smi", text, ["b", "a"])).toBe(false);
    expect(missesQuery("x", text, ["unknown"])).toBe(true);
  });
});
