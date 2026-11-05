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
  rememberedMode,
  modeButtons,
  openFromIndex,
  openingMemory,
  pageKind,
  readDeskState,
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
  it("reads a mode and the selected record it wrote", () => {
    expect(readDeskState({ file: "a.ged", mode: "source", selected: "@I2@" }))
      .toEqual({ mode: "source", selected: "@I2@" });
    expect(readDeskState({ selected: "" })).toEqual({});
    expect(readDeskState({ selected: 7 })).toEqual({});
  });

  it("reads each of the three modes", () => {
    expect(DESK_MODES).toEqual(["graph", "timeline", "source"]);
    for (const mode of DESK_MODES) {
      expect(readDeskState({ mode })).toEqual({ mode });
    }
  });

  it("reads a saved genealogy mode as graph", () => {
    expect(readDeskState({ mode: "genealogy" })).toEqual({ mode: "graph" });
  });

  it("ignores the record and the view of a person page an earlier version wrote", () => {
    expect(readDeskState({ mode: "source", record: "@I1@", view: "timeline" })).toEqual({ mode: "source" });
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

describe("which records have a card", () => {
  it("gives a multimedia record a card", () => {
    expect(pageKind(index(), "@O1@")).toBe("media");
  });

  it("gives a person, a family and a source a card, and a note none", () => {
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
  it.each(["graph", "timeline", "source"] as const)("selects the record with the index as its origin in %s", () => {
    const tab = { selectRecord: vi.fn(() => true) };
    openFromIndex(tab, "@I2@");

    expect(tab.selectRecord).toHaveBeenCalledWith("@I2@", "index");
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
    expect(effectiveMode("graph", false)).toBe("source");
    expect(effectiveMode("timeline", false)).toBe("source");
  });

  it("is the stored mode while the interface is on", () => {
    expect(effectiveMode("source", true)).toBe("source");
    expect(effectiveMode("graph", true)).toBe("graph");
    expect(effectiveMode("timeline", true)).toBe("timeline");
  });

  it("starts a new tab in the mode the reader last chose while the interface is on", () => {
    expect(initialMode(undefined, "source", true)).toBe("source");
    expect(initialMode(undefined, "graph", true)).toBe("graph");
    expect(initialMode(undefined, "timeline", true)).toBe("timeline");
  });

  it("stores source for a tab opened while the interface is off, so turning it on leaves the tab alone", () => {
    const stored = initialMode(undefined, "graph", false);

    expect(effectiveMode(stored, true)).toBe("source");
  });

  it("keeps the mode a restored tab was in, off or on", () => {
    expect(initialMode("timeline", "source", true)).toBe("timeline");
    expect(initialMode("source", "graph", false)).toBe("source");
    expect(initialMode("graph", "source", false)).toBe("graph");
  });
});

describe("the mode the next file opens in", () => {
  it("follows a mode the reader picked", () => {
    expect(rememberedMode("graph", "source", "reader")).toBe("source");
    expect(rememberedMode("source", "timeline", "reader")).toBe("timeline");
  });

  it("is not moved by a change the plugin made", () => {
    expect(rememberedMode("timeline", "source", "program")).toBe("timeline");
    expect(rememberedMode("graph", "timeline", "program")).toBe("graph");
  });
});

describe("the modes a tab offers", () => {
  it("lists Graph, Timeline and Source in that order, with the current one active", () => {
    for (const current of DESK_MODES) {
      const choices = modeButtons(current);

      expect(choices.map((choice) => choice.mode)).toEqual(["graph", "timeline", "source"]);
      expect(choices.filter((choice) => choice.active).map((choice) => choice.mode)).toEqual([current]);
    }
  });

  it("gives each mode an icon and a title of its own", () => {
    const choices = modeButtons("graph");

    expect(choices.map((choice) => choice.icon)).toEqual(["network", "calendar-range", "code"]);
    expect(new Set(choices.map((choice) => choice.title)).size).toBe(3);
  });

  it("toggles Source to the last other mode, Graph where there is none, and any other mode to Source", () => {
    expect(toggleTarget("source", "timeline")).toBe("timeline");
    expect(toggleTarget("source", "graph")).toBe("graph");
    expect(toggleTarget("source", undefined)).toBe("graph");
    for (const current of ["graph", "timeline"] as const) {
      expect(toggleTarget(current, "graph")).toBe("source");
      expect(toggleTarget(current, undefined)).toBe("source");
    }
  });

  it("names the tabs and the panel of earlier versions, which no view is registered under", () => {
    expect(RETIRED_VIEW_TYPES).toEqual(["domorium-file-timeline", "domorium-file-graph", "domorium-evidence"]);
    for (const registered of ["domorium-gedcom", "domorium-index", "domorium-record"]) {
      expect(RETIRED_VIEW_TYPES).not.toContain(registered);
    }
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
