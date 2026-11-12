import { describe, expect, it } from "vitest";

import type { StructureFieldDescription } from "@domorium/language-service";

import { TreeSession, unwrittenId, type Unwritten } from "./treeSession";

const nickname = (): Unwritten => ({
  id: unwrittenId(),
  field: { tag: "NICK" } as StructureFieldDescription,
  value: "",
  children: [],
  parent: { tag: "NAME", text: "Manya /Skłodowska/", range: { start: { line: 6, character: 0 } } },
});

describe("the choices of the reader in the trees", () => {
  it("keep a node opened on Marie open after Pierre and Marie again", () => {
    const session = new TreeSession();
    session.stateFor("curie.ged\n@I1@").setOpen("RESI[0]", true);
    session.stateFor("curie.ged\n@I2@");

    const marie = session.stateFor("curie.ged\n@I1@");
    expect(marie.isOpen("RESI[0]")).toBe(true);
    expect(session.stateFor("curie.ged\n@I2@").isOpen("RESI[0]")).toBe(false);
  });

  it("forget the oldest of twenty-one records, and not one that was shown again", () => {
    const session = new TreeSession();
    for (let at = 0; at < 20; at += 1) {
      session.stateFor(`r${at}`).setOpen("A[0]", true);
    }
    session.stateFor("r0");
    session.stateFor("r20").setOpen("A[0]", true);

    expect(session.stateFor("r0").isOpen("A[0]")).toBe(true);
    expect(session.stateFor("r1").isOpen("A[0]")).toBe(false);
  });

  it("open the root of a record at first, and keep it closed for the record once the reader closed it", () => {
    const session = new TreeSession();
    expect(session.stateFor("a").isOpen("")).toBe(true);

    session.stateFor("a").setOpen("", false);
    expect(session.stateFor("a").isOpen("")).toBe(false);
    expect(session.stateFor("b").isOpen("")).toBe(true);
  });

  it("close a node again", () => {
    const state = new TreeSession().stateFor("r");
    state.setOpen("A[0]", true);
    state.setOpen("A[0]", false);

    expect(state.isOpen("A[0]")).toBe(false);
  });

  it("keep an unwritten row under its record and the key of the line it goes under, until it is dropped", () => {
    const session = new TreeSession();
    const row = nickname();
    session.stateFor("a").setUnwritten("NAME[1]", [row]);

    expect(session.stateFor("a").unwritten("NAME[1]")).toEqual([row]);
    expect(session.stateFor("b").unwritten("NAME[1]")).toEqual([]);
    expect(session.stateFor("a").unwrittenParents()).toEqual(["NAME[1]"]);
    session.stateFor("a").setUnwritten("NAME[1]", []);
    expect(session.stateFor("a").unwrittenParents()).toEqual([]);
  });

  it("keep a draft and a message for a field, and the focus wanted once, through a redraw", () => {
    const state = new TreeSession().stateFor("a");
    state.setDraft("DATE[0]", { text: "31 NOV 1867", over: "7 NOV 1867" });
    state.setMessage("DATE[0]", { text: "No", kind: "error" });
    state.wishFocus({ key: "", parts: ["add"] });

    expect(state.draft("DATE[0]")?.text).toBe("31 NOV 1867");
    expect(state.message("DATE[0]")?.kind).toBe("error");
    expect(state.takeFocus()).toEqual({ key: "", parts: ["add"] });
    expect(state.takeFocus()).toBeUndefined();
  });

  it("keep the state of a place only while it is the last one asked for, taking no slot of the twenty", () => {
    const session = new TreeSession();
    session.stateFor("a").setOpen("BIRT[0]", true);
    session.passingStateFor("place:x").setDraft("place", { text: "Y", over: "X" });

    expect(session.passingStateFor("place:x").draft("place")?.text).toBe("Y");
    for (let at = 0; at < 25; at += 1) {
      session.passingStateFor(`place:${at}`);
    }
    expect(session.passingStateFor("place:x").draft("place")).toBeUndefined();
    expect(session.stateFor("a").isOpen("BIRT[0]")).toBe(true);
  });
});
