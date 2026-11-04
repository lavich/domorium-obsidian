import { describe, expect, it } from "vitest";

import { curieIndex, indexOf } from "../testing/curie";
import type { DeskMode } from "./deskState";
import { TabModes } from "./tabModes";

const index = curieIndex();

const at = (cursorRecord?: string) => ({ cursorRecord, index: () => index });

function tab(mode: DeskMode, interfaceOn = true): TabModes {
  const modes = new TabModes(mode, interfaceOn);
  modes.loaded = true;
  return modes;
}

describe("the record a tab holds on leaving Source", () => {
  it("is the record under the cursor, going to Graph, and again going on to Genealogy", () => {
    const modes = tab("source");

    const toGraph = modes.setMode("graph", at("@I2@"));
    expect(toGraph).toMatchObject({ changed: true, recordChanged: true, moveCursor: false });
    expect(modes.record).toBe("@I2@");

    modes.setMode("source", at());
    modes.setMode("genealogy", at("@I3@"));
    expect(modes.record).toBe("@I3@");
  });

  it("leaves the record alone for a record that has no page", () => {
    const modes = tab("source");
    modes.record = "@I1@";

    modes.setMode("graph", at("@N1@"));

    expect(modes.record).toBe("@I1@");
  });

  it("moves the cursor only from Genealogy to Source", () => {
    const modes = tab("genealogy");

    expect(modes.setMode("graph", at()).moveCursor).toBe(false);
    modes.setMode("genealogy", at());
    expect(modes.setMode("source", at()).moveCursor).toBe(true);
  });

  it("changes nothing while the interface is off", () => {
    const modes = tab("source", false);

    expect(modes.setMode("graph", at("@I2@"))).toMatchObject({ changed: false });
    expect(modes.mode).toBe("source");
    expect(modes.record).toBeNull();
  });

  it("shows Source whatever it stored while the interface is off", () => {
    const modes = tab("graph", false);

    expect(modes.shown).toBe("source");
    expect(modes.inView()).toBe(false);
    modes.interfaceChanged(true);
    expect(modes.shown).toBe("graph");
  });
});

describe("the toggle", () => {
  it("goes to the last mode other than Source, and back", () => {
    const modes = tab("genealogy");
    modes.setMode("timeline", at());
    expect(modes.toggleTarget()).toBe("source");

    modes.setMode("source", at());
    expect(modes.toggleTarget()).toBe("timeline");
  });

  it("goes to Genealogy from a Source this session has not left", () => {
    expect(tab("source").toggleTarget()).toBe("genealogy");
  });

  it("is forgotten when the tab moves to another file", () => {
    const modes = tab("graph");
    modes.setMode("source", at());
    modes.fileChanged("source");

    expect(modes.toggleTarget()).toBe("genealogy");
  });
});

describe("what is selected in a view", () => {
  it("is recorded for a person before anything was drawn, and refused for a family and in Source", () => {
    const graph = tab("graph");

    expect(graph.select("@I2@", true)).toBe(true);
    expect(graph.selectedPerson).toBe("@I2@");
    expect(graph.select("@F3@", false)).toBe(false);
    expect(graph.selectedPerson).toBe("@I2@");
    expect(tab("source").select("@I2@", true)).toBe(false);
    expect(tab("genealogy").select("@I2@", true)).toBe(false);
  });

  it("ends with a change of mode, including Graph to Timeline", () => {
    const modes = tab("graph");
    modes.select("@I2@", true);

    expect(modes.setMode("timeline", at()).selectionCleared).toBe(true);
    expect(modes.selectedPerson).toBeNull();
    expect(modes.setMode("graph", at()).selectionCleared).toBe(false);
  });

  it("ends when the interface is turned off", () => {
    const modes = tab("graph");
    modes.select("@I2@", true);

    expect(modes.interfaceChanged(false).selectionCleared).toBe(true);
    expect(modes.selectedPerson).toBeNull();
    expect(modes.shownRecord()).toBeNull();
  });

  it("ends when a text change leaves its person undeclared, and is reported", () => {
    const modes = tab("graph");
    modes.select("@I1@", true);
    const without = indexOf("0 HEAD\n0 @I2@ INDI\n1 NAME Pierre /Curie/\n0 TRLR\n");

    expect(modes.textChanged(index).selectionCleared).toBe(false);
    expect(modes.selectedPerson).toBe("@I1@");
    expect(modes.textChanged(without).selectionCleared).toBe(true);
    expect(modes.selectedPerson).toBeNull();
  });

  it("is the record the Index marks while it stands", () => {
    const modes = tab("timeline");
    expect(modes.shownRecord()).toBeNull();
    modes.select("@I2@", true);

    expect(modes.shownRecord()).toBe("@I2@");
  });
});

describe("opening a record's page", () => {
  it("is a step from Graph, even on the record the tab already holds", () => {
    const modes = tab("graph");
    modes.record = "@I1@";

    expect(modes.applyState(modes.openRecord("@I1@")).step).toBe(true);
  });

  it("is not a step from Genealogy on the same record, and is on another", () => {
    const modes = tab("genealogy");
    modes.record = "@I1@";

    expect(modes.applyState(modes.openRecord("@I1@")).step).toBe(false);
    expect(modes.applyState(modes.openRecord("@I2@")).step).toBe(true);
  });

  it("takes the mode and the record of a state it is handed, and ends a selection with the mode", () => {
    const modes = tab("graph");
    modes.select("@I2@", true);

    expect(modes.applyState({ mode: "genealogy", record: "@I2@" })).toEqual({
      step: true,
      recordChanged: true,
      selectionCleared: true,
    });
    expect(modes.mode).toBe("genealogy");
    expect(modes.record).toBe("@I2@");
    expect(modes.lastMode).toBe("graph");
  });

  it("is no step for a state that names only a mode", () => {
    const modes = tab("genealogy");

    expect(modes.applyState({ mode: "graph" })).toMatchObject({ step: false, recordChanged: false });
  });
});

describe("a tab moved to another file", () => {
  it("forgets the record, the selection, the last mode and that the file was read", () => {
    const modes = tab("graph");
    modes.record = "@I1@";
    modes.select("@I2@", true);
    modes.setMode("source", at());
    modes.fileChanged("genealogy");

    expect(modes).toMatchObject({
      mode: "genealogy",
      record: null,
      selectedPerson: null,
      lastMode: undefined,
      loaded: false,
    });
  });
});

describe("when a view is drawn", () => {
  it("never before the file is loaded", () => {
    const modes = new TabModes("graph", true);

    expect(modes.needsDraw(true)).toBe(false);
    modes.loaded = true;
    expect(modes.needsDraw(true)).toBe(true);
  });

  it("not while the tab is hidden, and not in a mode that is no view", () => {
    expect(tab("graph").needsDraw(false)).toBe(false);
    expect(tab("source").needsDraw(true)).toBe(false);
    expect(tab("genealogy").needsDraw(true)).toBe(false);
    expect(tab("graph", false).needsDraw(true)).toBe(false);
  });

  it("is again when the tab is shown after text changed under it", () => {
    const modes = tab("timeline");
    modes.textChanged(index);

    expect(modes.needsDraw(false)).toBe(false);
    expect(modes.needsDraw(true)).toBe(true);
  });
});

describe("the record the commands and the copy links act on", () => {
  it("is the page's in Genealogy, the selected person in a view, the cursor's in Source", () => {
    const modes = tab("genealogy");
    modes.record = "@I1@";
    modes.select("@I2@", true);

    expect(modes.recordAtCursorFor("genealogy", "@I3@")).toBe("@I1@");
    expect(modes.recordAtCursorFor("source", "@I3@")).toBe("@I3@");
    expect(modes.recordAtCursorFor("graph", "@I3@")).toBeUndefined();
    modes.setMode("graph", at());
    modes.select("@I2@", true);
    expect(modes.recordAtCursorFor("graph", "@I3@")).toBe("@I2@");
    expect(modes.recordAtCursorFor("timeline", "@I3@")).toBe("@I2@");
  });
});
