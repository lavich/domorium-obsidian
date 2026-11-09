import { describe, expect, it } from "vitest";

import { TreeSession } from "./treeSession";

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

  it("keep the scroll of a record shown, and none for one never shown", () => {
    const session = new TreeSession();
    session.stateFor("a");
    session.rememberScroll("a", 340);

    expect(session.scrollOf("a")).toBe(340);
    expect(session.scrollOf("never")).toBe(0);
  });

  it("forget the scroll of a record with the oldest of twenty-one", () => {
    const session = new TreeSession();
    session.rememberScroll("first", 50);
    for (let at = 0; at < 20; at += 1) {
      session.stateFor(`r${at}`);
    }

    expect(session.scrollOf("first")).toBe(0);
  });

  it("keep the row last pressed for the record", () => {
    const session = new TreeSession();
    session.stateFor("a").press("SEX[0]");

    expect(session.stateFor("a").pressed()).toBe("SEX[0]");
    expect(session.stateFor("b").pressed()).toBeNull();
  });
});
