// @vitest-environment happy-dom
import { beforeAll, describe, expect, it } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { handleKey, type KeyActions, LiveRegion, placeAnnouncement } from "./mapKeys";

beforeAll(installObsidianDom);

function actions(popup = false) {
  const calls: string[] = [];
  const made: KeyActions = {
    step: (by) => calls.push(`step ${by}`),
    edge: (which) => calls.push(which),
    activate: () => calls.push("activate"),
    zoom: (direction) => calls.push(`zoom ${direction}`),
    fit: () => calls.push("fit"),
    closePopup: () => {
      calls.push("close");
      return popup;
    },
  };
  return { made, calls };
}

const press = (key: string, extra: Partial<KeyboardEvent> = {}) => ({ key, ctrlKey: false, metaKey: false, altKey: false, ...extra });

describe("the keys of the map", () => {
  it("steps through places with the arrows and goes to the ends with Home and End", () => {
    const { made, calls } = actions();
    for (const key of ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"]) {
      expect(handleKey(press(key), made)).toBe(true);
    }

    expect(calls).toEqual(["step 1", "step 1", "step -1", "step -1", "first", "last"]);
  });

  it("acts on Enter and Space, zooms with plus and minus and fits with zero", () => {
    const { made, calls } = actions();
    for (const key of ["Enter", " ", "+", "-", "0"]) {
      handleKey(press(key), made);
    }

    expect(calls).toEqual(["activate", "activate", "zoom 1", "zoom -1", "fit"]);
  });

  it("closes a popup with Escape and lets the key through where none is open", () => {
    expect(handleKey(press("Escape"), actions(true).made)).toBe(true);
    expect(handleKey(press("Escape"), actions(false).made)).toBe(false);
  });

  it("leaves a key with a modifier and any other key alone", () => {
    const { made, calls } = actions();

    expect(handleKey(press("ArrowRight", { ctrlKey: true }), made)).toBe(false);
    expect(handleKey(press("a"), made)).toBe(false);
    expect(calls).toEqual([]);
  });
});

describe("announcing a place", () => {
  it("says its name, its events and their years", () => {
    expect(placeAnnouncement("Paris, France", 2, { from: 1891, to: 1934 })).toBe("Paris, France, 2 events, 1891 to 1934");
  });

  it("says one year once and nothing where nothing is dated", () => {
    expect(placeAnnouncement("Stockholm, Sweden", 1, { from: 1903, to: 1903 })).toBe("Stockholm, Sweden, 1 event, 1903");
    expect(placeAnnouncement("Sceaux, France", 3, null)).toBe("Sceaux, France, 3 events");
  });

  it("puts the words in a polite live region", () => {
    const region = new LiveRegion(document.body);
    region.say("Paris");

    expect(region.el.getAttribute("aria-live")).toBe("polite");
    expect(region.el.textContent).toBe("Paris");
  });
});
