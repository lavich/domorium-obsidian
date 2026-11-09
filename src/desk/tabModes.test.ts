import { describe, expect, it } from "vitest";

import { curieIndex, indexOf } from "../testing/curie";
import type { DeskMode, Origin } from "./deskState";
import { originRules, TabModes } from "./tabModes";

const index = curieIndex();

const at = (cursorRecord?: string) => ({ cursorRecord, index: () => index });

function tab(mode: DeskMode, interfaceOn = true): TabModes {
  const modes = new TabModes(mode, interfaceOn);
  modes.loaded = true;
  return modes;
}

describe("a tab in List mode", () => {
  it("records List as the mode to come back to, and the toggle goes to Source and back", () => {
    const modes = tab("source");
    modes.setMode("list", at());
    expect(modes.toggleTarget()).toBe("source");
    modes.setMode("source", at());
    expect(modes.lastMode).toBe("list");
    expect(modes.toggleTarget()).toBe("list");
  });

  it("is a view, whose record is the selected one and not the cursor's", () => {
    const modes = tab("list");
    modes.select("@I9@", index);

    expect(modes.inView()).toBe(true);
    expect(modes.recordAtCursorFor("list", "@I1@")).toBe("@I9@");
  });
});

describe("the record a tab selects on leaving Source", () => {
  it("is the record under the cursor, going to Graph, and again going on to Timeline", () => {
    const modes = tab("source");

    const toGraph = modes.setMode("graph", at("@I2@"));
    expect(toGraph).toMatchObject({ changed: true, selectionChanged: true, moveCursor: false });
    expect(modes.selected).toBe("@I2@");

    modes.setMode("source", at());
    expect(modes.setMode("timeline", at("@I3@")).selectionChanged).toBe(true);
    expect(modes.selected).toBe("@I3@");
  });

  it("leaves the selection alone for a record that has no card", () => {
    const modes = tab("source");
    modes.select("@I1@", index);

    const change = modes.setMode("graph", at("@N1@"));

    expect(modes.selected).toBe("@I1@");
    expect(change.selectionChanged).toBe(false);
  });

  it("asks to move the cursor going to Source with a record selected, and not without one", () => {
    const withSelection = tab("graph");
    withSelection.select("@I2@", index);
    expect(withSelection.setMode("source", at()).moveCursor).toBe(true);

    const without = tab("graph");
    expect(without.setMode("source", at()).moveCursor).toBe(false);
  });

  it("changes nothing while the interface is off", () => {
    const modes = tab("source", false);

    expect(modes.setMode("graph", at("@I2@"))).toMatchObject({ changed: false });
    expect(modes.mode).toBe("source");
    expect(modes.selected).toBeNull();
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
    const modes = tab("graph");
    modes.setMode("timeline", at());
    expect(modes.toggleTarget()).toBe("source");

    modes.setMode("source", at());
    expect(modes.toggleTarget()).toBe("timeline");
  });

  it("goes to Graph from a Source this session has not left", () => {
    expect(tab("source").toggleTarget()).toBe("graph");
  });

  it("is forgotten when the tab moves to another file", () => {
    const modes = tab("graph");
    modes.setMode("source", at());
    modes.fileChanged("source");

    expect(modes.toggleTarget()).toBe("graph");
  });
});

describe("the selected record", () => {
  it("is a person, a family, a source or a multimedia record, and not a note", () => {
    for (const xref of ["@I2@", "@F3@", "@S3@", "@O5@"]) {
      const modes = tab("graph");

      expect(modes.select(xref, index)).toBe(true);
      expect(modes.selected).toBe(xref);
    }
    const modes = tab("graph");
    expect(modes.select("@N1@", index)).toBe(false);
    expect(modes.selected).toBeNull();
  });

  it("survives Graph to Timeline to Source and back", () => {
    const modes = tab("graph");
    modes.select("@I2@", index);

    expect(modes.setMode("timeline", at())).toMatchObject({ selectionChanged: false });
    modes.setMode("source", at("@I2@"));
    modes.setMode("graph", at("@I2@"));
    expect(modes.selected).toBe("@I2@");
  });

  it("is refused while the interface is off, and keeps nothing", () => {
    const modes = tab("source", false);

    expect(modes.select("@I2@", index)).toBe(false);
    expect(modes.selected).toBeNull();
    expect(modes.shownRecord()).toBeNull();
  });

  it("selects nothing for an event id, which names no record of a tab", () => {
    const modes = tab("graph");

    expect(modes.select("event:@I1@:BIRT:0", index)).toBe(false);
    expect(modes.selected).toBeNull();
  });

  it("ends when a text change leaves its record undeclared, and is reported", () => {
    const modes = tab("graph");
    modes.select("@I1@", index);
    const without = indexOf("0 HEAD\n0 @I2@ INDI\n1 NAME Pierre /Curie/\n0 TRLR\n");

    expect(modes.textChanged(index).selectionCleared).toBe(false);
    expect(modes.selected).toBe("@I1@");
    expect(modes.textChanged(without).selectionCleared).toBe(true);
    expect(modes.selected).toBeNull();
  });

  it("is shown no more, and the tab shows as Source, when the interface is turned off, and is back when it is turned on", () => {
    const modes = tab("graph");
    modes.select("@I2@", index);

    expect(modes.interfaceChanged(false).selectionCleared).toBe(true);
    expect(modes.selected).toBe("@I2@");
    expect(modes.shownRecord()).toBeNull();
    expect(modes.shown).toBe("source");
    modes.interfaceChanged(true);
    expect(modes.shownRecord()).toBe("@I2@");
  });

  it("is what the views mark while it stands", () => {
    const modes = tab("timeline");
    expect(modes.shownRecord()).toBeNull();
    modes.select("@I2@", index);

    expect(modes.shownRecord()).toBe("@I2@");
  });

  it("is taken from a state a tab is handed, with its mode", () => {
    const modes = tab("graph");

    expect(modes.applyState({ mode: "timeline", selected: "@I2@" })).toEqual({ selectionChanged: true });
    expect(modes.mode).toBe("timeline");
    expect(modes.selected).toBe("@I2@");
    expect(modes.lastMode).toBe("graph");
    expect(modes.applyState({ mode: "timeline" })).toEqual({ selectionChanged: false });
    expect(modes.selected).toBe("@I2@");
  });

  it("is kept from a state while the interface is off, and not shown", () => {
    const modes = tab("source", false);

    expect(modes.applyState({ selected: "@I2@" })).toEqual({ selectionChanged: true });
    expect(modes.selected).toBe("@I2@");
    expect(modes.shownRecord()).toBeNull();
  });

  it("is left alone by a state of the same file that names none, and replaced by one that names another", () => {
    const modes = tab("graph");
    modes.select("@I2@", index);

    expect(modes.applyState({ mode: "graph" })).toEqual({ selectionChanged: false });
    expect(modes.selected).toBe("@I2@");
    expect(modes.applyState({ selected: "@I12@" })).toEqual({ selectionChanged: true });
    expect(modes.selected).toBe("@I12@");
  });

  it("is dropped by the first reading of a file that does not declare a restored one", () => {
    const modes = tab("graph");
    modes.applyState({ selected: "@I99@" });

    expect(modes.textChanged(index).selectionCleared).toBe(true);
    expect(modes.selected).toBeNull();
  });
});

describe("a tab moved to another file", () => {
  it("forgets the selection, the last mode and that the file was read", () => {
    const modes = tab("graph");
    modes.select("@I2@", index);
    modes.setMode("source", at());
    modes.fileChanged("graph");

    expect(modes).toMatchObject({
      mode: "graph",
      selected: null,
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
  it("is the cursor's in Source and the selected one in a view, of any kind", () => {
    const modes = tab("graph");

    expect(modes.recordAtCursorFor("graph", "@I3@")).toBeUndefined();
    modes.select("@F3@", index);
    expect(modes.recordAtCursorFor("source", "@I3@")).toBe("@I3@");
    expect(modes.recordAtCursorFor("graph", "@I3@")).toBe("@F3@");
    expect(modes.recordAtCursorFor("timeline", "@I3@")).toBe("@F3@");
  });
});

describe("what each origin of a selection asks for", () => {
  const rules = (origin: Origin, mobile = false) => originRules(origin, mobile);

  it("treats a click on a row of the list as a click in a view: no cursor, no editor focus, no reveal, a card, the drawer on a phone", () => {
    expect(rules("view")).toMatchObject({
      cursorToRecord: false,
      editorFocus: false,
      revealsView: false,
      placesCard: true,
      opensDrawer: false,
    });
    expect(rules("view", true).opensDrawer).toBe(true);
  });

  it("never moves the cursor or takes the focus for the cursor", () => {
    for (const origin of ["cursor"] as const) {
      expect(rules(origin)).toMatchObject({ cursorToRecord: false, editorFocus: false });
    }
  });

  it("puts the cursor on the record for the card and a link, and gives the editor the focus for a link", () => {
    expect(rules("link")).toMatchObject({ cursorToRecord: true, editorFocus: true });
    expect(rules("card")).toMatchObject({ cursorToRecord: true, editorFocus: false });
    expect(rules("view")).toMatchObject({ cursorToRecord: false, editorFocus: false });
  });

  it("moves a view for every origin but a click in it", () => {
    expect(rules("view").revealsView).toBe(false);
    for (const origin of ["card", "link"] as const) {
      expect(rules(origin).revealsView).toBe(true);
    }
  });

  it("places the card for every origin but the cursor", () => {
    expect(rules("cursor").placesCard).toBe(false);
    for (const origin of ["view", "card", "link"] as const) {
      expect(rules(origin).placesCard).toBe(true);
    }
  });

  it("opens the drawer only for a view, and only on mobile", () => {
    expect(rules("view", true).opensDrawer).toBe(true);
    expect(rules("view", false).opensDrawer).toBe(false);
    for (const origin of ["card", "link", "cursor"] as const) {
      expect(rules(origin, true).opensDrawer).toBe(false);
    }
  });
});
