import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import { generated } from "../../tests/generated";
import { buildIndex } from "../genealogy";
import { DESK_MODES } from "../settingsData";
import { curieIndex, indexOf } from "../testing/curie";
import { ZOOM } from "./fileTimelineView";
import {
  cursorInside,
  effectiveMode,
  initialMode,
  modeChoices,
  navigationStep,
  openFromIndex,
  openingMemory,
  pageKind,
  readDeskState,
  recordToShow,
  RETIRED_VIEW_TYPES,
  routeLink,
  shownRange,
  toggleTarget,
} from "./deskState";

const CURIE = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 FAMS @F1@",
  "0 @I2@ INDI",
  "1 NAME Pierre /Curie/",
  "0 @F1@ FAM",
  "1 WIFE @I1@",
  "0 @N1@ SNOTE A shared note",
  "0 @O1@ OBJE",
  "1 FILE Media/marie.jpg",
  "2 FORM image/jpeg",
  "0 @S1@ SOUR",
  "1 TITL Parish registers",
  "0 TRLR",
  "",
].join("\n");

const index = (text = CURIE) =>
  buildIndex(new GedcomLanguageService(text));

describe("what a tab keeps of the desk", () => {
  it("reads a mode and a record it wrote", () => {
    expect(readDeskState({ file: "a.ged", mode: "source", record: "@I2@" }))
      .toEqual({ mode: "source", record: "@I2@" });
  });

  it("reads the view of a person page it wrote", () => {
    expect(readDeskState({ mode: "genealogy", record: "@I1@", view: "timeline" }))
      .toEqual({ mode: "genealogy", record: "@I1@", view: "timeline" });
    expect(readDeskState({ view: "map" })).toEqual({});
  });

  it("reads each of the four modes", () => {
    for (const mode of DESK_MODES) {
      expect(readDeskState({ mode })).toEqual({ mode });
    }
  });

  it("reads the memory of the graph and the timeline, clamped, and drops what is malformed", () => {
    expect(
      readDeskState({
        mode: "graph",
        graph: { focus: "@I12@", up: 12, down: 1, view: { x: 1, y: 2, k: 9 } },
        timeline: { focus: "@I12@", up: 3, down: -2, zoom: 99, scroll: { top: 30, left: -1 } },
      }),
    ).toEqual({
      mode: "graph",
      graph: { focus: "@I12@", up: 9, down: 1, view: { x: 1, y: 2, k: 3 } },
      timeline: { focus: "@I12@", up: 3, down: 0, zoom: 16, scroll: { top: 30, left: 0 } },
    });
    expect(readDeskState({ graph: "wide", timeline: null })).toEqual({});
    expect(readDeskState({ graph: { view: { x: 1 } }, timeline: { scroll: { top: 5 } } })).toEqual({
      graph: { up: 2, down: 2 },
      timeline: { up: 2, down: 2, zoom: ZOOM.initial },
    });
  });

  it("ignores what it does not recognise, so the setting decides", () => {
    expect(readDeskState({ mode: "reading", record: 7 })).toEqual({});
    expect(readDeskState(null)).toEqual({});
  });
});

describe("which record Genealogy mode shows", () => {
  it("takes the first preferred record that has a page", () => {
    expect(recordToShow(index(), ["@N1@", "@F1@", "@I1@"])).toBe("@F1@");
  });

  it("falls back to the first person the file declares", () => {
    expect(recordToShow(index(), [undefined, "@X9@"])).toBe("@I1@");
  });

  it("shows a source when the file declares no person", () => {
    const sourcesOnly = ["0 HEAD", "0 @S1@ SOUR", "1 TITL A", "0 TRLR", ""].join("\n");

    expect(recordToShow(index(sourcesOnly), [])).toBe("@S1@");
  });

  it("has nothing to show for a file of neither", () => {
    expect(recordToShow(index("0 HEAD\n0 TRLR\n"), [])).toBeNull();
  });

  it("gives a multimedia record a page", () => {
    expect(pageKind(index(), "@O1@")).toBe("media");
  });

  it("gives a person, a family and a source a page, and a note none", () => {
    expect(pageKind(index(), "@I1@")).toBe("person");
    expect(pageKind(index(), "@F1@")).toBe("family");
    expect(pageKind(index(), "@S1@")).toBe("source");
    expect(pageKind(index(), "@N1@")).toBeNull();
  });
});

describe("where a link into a record lands", () => {
  const declared = (xref: string) => ["@I1@", "@I2@", "@F1@", "@N1@", "@S1@"].includes(xref);

  it("opens a person's page", () => {
    expect(routeLink(index(), "@I1@", declared)).toEqual({ to: "page", xref: "@I1@" });
  });

  it("opens a family's page", () => {
    expect(routeLink(index(), "@F1@", declared)).toEqual({ to: "page", xref: "@F1@" });
  });

  it("sends a shared note to the source", () => {
    expect(routeLink(index(), "@N1@", declared)).toEqual({ to: "source", xref: "@N1@" });
  });

  it("goes nowhere for a record the file does not hold", () => {
    expect(routeLink(index(), "@I9@", declared)).toEqual({ to: "nowhere" });
  });
});

describe("a row of the index, activated", () => {
  const tab = (where: "source" | "view" | "genealogy", selects = true) => ({
    inSource: () => where === "source",
    inView: () => where === "view",
    goToXref: vi.fn(() => true),
    openRecord: vi.fn(),
    selectInView: vi.fn(() => selects),
  });

  it("opens the record's page from a tab in Genealogy mode", () => {
    const genealogy = tab("genealogy");
    openFromIndex(genealogy, "@I2@");

    expect(genealogy.openRecord).toHaveBeenCalledWith("@I2@");
    expect(genealogy.goToXref).not.toHaveBeenCalled();
    expect(genealogy.selectInView).not.toHaveBeenCalled();
  });

  it("selects a person in a tab in Graph or Timeline, and opens nothing", () => {
    const view = tab("view");
    openFromIndex(view, "@I2@");

    expect(view.selectInView).toHaveBeenCalledWith("@I2@");
    expect(view.openRecord).not.toHaveBeenCalled();
    expect(view.goToXref).not.toHaveBeenCalled();
  });

  it("opens the page of a record in a view that has nothing to select", () => {
    const view = tab("view", false);
    openFromIndex(view, "@F3@");

    expect(view.openRecord).toHaveBeenCalledWith("@F3@");
  });

  it("goes to the record's line in a tab in Source mode", () => {
    const source = tab("source");
    openFromIndex(source, "@F3@");

    expect(source.goToXref).toHaveBeenCalledWith("@F3@");
    expect(source.openRecord).not.toHaveBeenCalled();
    expect(source.selectInView).not.toHaveBeenCalled();
  });
});

describe("where the source opens when the tab switches to it", () => {
  const curie = curieIndex();
  const marie = curie.person("@I1@");

  it("opens on the selected fact", () => {
    expect(shownRange(curie, "@I1@", "p:0")).toEqual(marie?.events[0]?.range);
  });

  it("opens on the whole record when no fact is selected", () => {
    expect(shownRange(curie, "@I1@", null)).toEqual(marie?.range);
  });

  it("opens on a family's fact, a source and a multimedia record too", () => {
    expect(shownRange(curie, "@F3@", "f:0")).toEqual(curie.family("@F3@")?.events[0]?.range);
    expect(shownRange(curie, "@S1@", null)).toEqual(curie.source("@S1@")?.range);
    expect(shownRange(curie, "@O5@", null)).toEqual(curie.media("@O5@")?.range);
  });

  it("leaves a cursor already inside the lines where it is", () => {
    const range = { start: { line: 14, character: 0 }, end: { line: 44, character: 7 } };

    expect(cursorInside(range, { line: 20, character: 3 })).toBe(true);
    expect(cursorInside(range, { line: 2, character: 0 })).toBe(false);
  });
});


describe("the mode a tab shows while the genealogy interface is off", () => {
  it("is source whatever the tab last stored", () => {
    expect(effectiveMode("genealogy", false)).toBe("source");
    expect(effectiveMode("graph", false)).toBe("source");
    expect(effectiveMode("timeline", false)).toBe("source");
  });

  it("is the stored mode while the interface is on", () => {
    expect(effectiveMode("genealogy", true)).toBe("genealogy");
    expect(effectiveMode("source", true)).toBe("source");
    expect(effectiveMode("graph", true)).toBe("graph");
    expect(effectiveMode("timeline", true)).toBe("timeline");
  });

  it("starts a new tab in the mode the setting names while the interface is on", () => {
    expect(initialMode(undefined, "genealogy", true)).toBe("genealogy");
    expect(initialMode(undefined, "source", true)).toBe("source");
    expect(initialMode(undefined, "graph", true)).toBe("graph");
    expect(initialMode(undefined, "timeline", true)).toBe("timeline");
  });

  it("stores source for a tab opened while the interface is off, so turning it on leaves the tab alone", () => {
    const stored = initialMode(undefined, "genealogy", false);

    expect(effectiveMode(stored, true)).toBe("source");
  });

  it("keeps the mode a restored tab was in, off or on", () => {
    expect(initialMode("genealogy", "source", false)).toBe("genealogy");
    expect(initialMode("genealogy", "source", true)).toBe("genealogy");
    expect(initialMode("source", "genealogy", false)).toBe("source");
    expect(initialMode("graph", "source", false)).toBe("graph");
  });
});

describe("the modes a tab offers", () => {
  it("lists Genealogy, Graph, Timeline and Source in that order, with the current one checked", () => {
    for (const current of DESK_MODES) {
      const choices = modeChoices(current);

      expect(choices.map((choice) => choice.mode)).toEqual(["genealogy", "graph", "timeline", "source"]);
      expect(choices.filter((choice) => choice.checked).map((choice) => choice.mode)).toEqual([current]);
    }
  });

  it("gives each mode an icon and a title of its own", () => {
    const choices = modeChoices("graph");

    expect(choices.map((choice) => choice.icon)).toEqual(["users", "network", "calendar-range", "code"]);
    expect(new Set(choices.map((choice) => choice.title)).size).toBe(4);
  });

  it("toggles Source to the last other mode, Genealogy where there is none, and any other mode to Source", () => {
    expect(toggleTarget("source", "timeline")).toBe("timeline");
    expect(toggleTarget("source", undefined)).toBe("genealogy");
    for (const current of ["genealogy", "graph", "timeline"] as const) {
      expect(toggleTarget(current, "graph")).toBe("source");
      expect(toggleTarget(current, undefined)).toBe("source");
    }
  });

  it("names the two overview tabs of an earlier version, which no view is registered under", () => {
    expect(RETIRED_VIEW_TYPES).toEqual(["domorium-file-timeline", "domorium-file-graph"]);
    for (const registered of ["domorium-gedcom", "domorium-index", "domorium-evidence"]) {
      expect(RETIRED_VIEW_TYPES).not.toContain(registered);
    }
  });
});

describe("whether Back returns to what the tab showed", () => {
  it("steps where the record changes", () => {
    expect(navigationStep({ mode: "genealogy", record: "@I1@" }, { mode: "genealogy", record: "@I2@" })).toBe(true);
  });

  it("steps from a graph or a timeline to a page of the record the tab already holds", () => {
    expect(navigationStep({ mode: "graph", record: "@I1@" }, { mode: "genealogy", record: "@I1@" })).toBe(true);
    expect(navigationStep({ mode: "timeline", record: "@I1@" }, { mode: "genealogy", record: "@I1@" })).toBe(true);
  });

  it("does not step for a switch of mode alone, nor on the same record in Genealogy", () => {
    expect(navigationStep({ mode: "genealogy", record: "@I1@" }, { mode: "graph" })).toBe(false);
    expect(navigationStep({ mode: "graph", record: "@I1@" }, { mode: "genealogy" })).toBe(false);
    expect(navigationStep({ mode: "genealogy", record: "@I1@" }, { mode: "genealogy", record: "@I1@" })).toBe(false);
  });
});

describe("where a view opens for the first time", () => {
  it("reads a small file whole", () => {
    const memory = openingMemory("graph", undefined, curieIndex(), "@I12@");

    expect(memory).toEqual({ up: 2, down: 2 });
    expect("focus" in memory).toBe(false);
    expect(openingMemory("timeline", undefined, curieIndex(), "@I12@")).toEqual({ up: 2, down: 2, zoom: ZOOM.initial });
  });

  it("opens a large file on the branch of the person the tab is on, else of the first person", () => {
    const large = indexOf(generated(2000));

    expect(openingMemory("graph", undefined, large, "@I6@").focus).toBe("@I6@");
    expect(openingMemory("graph", undefined, large, undefined).focus).toBe("@I1@");
    expect(openingMemory("timeline", undefined, large, "@F1@").focus).toBe("@I1@");
  });

  it("keeps what the tab saved, a whole file chosen on a large one included", () => {
    const large = indexOf(generated(2000));
    const saved = { up: 4, down: 1 };

    expect(openingMemory("graph", saved, large, "@I6@")).toBe(saved);
  });
});
