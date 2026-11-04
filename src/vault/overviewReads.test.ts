import { describe, expect, it } from "vitest";

import { OverviewReads, type ShownOverview } from "./overviewReads";

const TEXT = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME Anna /Nowak/", "0 TRLR", ""].join("\n");
const text = () => Promise.resolve(TEXT);

function reads() {
  const open: ShownOverview[] = [];
  const overviews = new OverviewReads(() => open);
  const show = (type: string, gedcom: string): ShownOverview => {
    const one = { type, gedcom, view: {} };
    open.push(one);
    return one;
  };
  const close = (one: ShownOverview): void => {
    overviews.closed(one.gedcom as string, one.view);
    open.splice(open.indexOf(one), 1);
  };
  return { overviews, show, close };
}

describe("reading a closed file for its overviews", () => {
  it("keeps the reading of a path a timeline and a graph show until both close", async () => {
    const { overviews, show, close } = reads();
    const timeline = show("domorium-file-timeline", "tree.ged");
    const graph = show("domorium-file-graph", "tree.ged");
    const first = await overviews.read("tree.ged", text);

    close(timeline);
    expect(await overviews.read("tree.ged", text)).toBe(first);
    expect(overviews.shows("tree.ged")).toBe(true);
    close(graph);
    expect(overviews.revision("tree.ged")).toBeUndefined();
    expect(await overviews.read("tree.ged", text)).not.toBe(first);
  });

  it("holds the language service of a reading beside its index, and forgets both together", async () => {
    const { overviews, show, close } = reads();
    const graph = show("domorium-file-graph", "tree.ged");
    expect(overviews.held("tree.ged")).toBeNull();
    const index = await overviews.read("tree.ged", text);

    expect(overviews.held("tree.ged")?.index).toBe(index);
    expect(overviews.held("tree.ged")?.service.getDocument()).toBeDefined();
    close(graph);
    expect(overviews.held("tree.ged")).toBeNull();
  });

  it("holds a path for two openings until both end", async () => {
    const { overviews } = reads();
    const one = overviews.opening("tree.ged");
    const other = overviews.opening("tree.ged");
    const first = await overviews.read("tree.ged", text);

    one();
    expect(await overviews.read("tree.ged", text)).toBe(first);
    other();
    expect(overviews.revision("tree.ged")).toBeUndefined();
    expect(await overviews.read("tree.ged", text)).not.toBe(first);
  });

  it("makes no revision for a modify of a path nothing shows", () => {
    const { overviews, show } = reads();

    expect(overviews.modified("tree.ged")).toBe(false);
    expect(overviews.revision("tree.ged")).toBeUndefined();
    show("domorium-file-graph", "tree.ged");
    expect(overviews.modified("tree.ged")).toBe(true);
    expect(overviews.revision("tree.ged")).toBeDefined();
  });

  it("reads again after a modify of a path shown", async () => {
    const { overviews, show } = reads();
    show("domorium-file-graph", "tree.ged");
    const first = await overviews.read("tree.ged", text);

    overviews.modified("tree.ged");
    expect(await overviews.read("tree.ged", text)).not.toBe(first);
  });

  it("never reuses a revision after a path is forgotten", async () => {
    const { overviews, show, close } = reads();
    const graph = show("domorium-file-graph", "tree.ged");
    await overviews.read("tree.ged", text);
    const before = overviews.revision("tree.ged");

    close(graph);
    show("domorium-file-graph", "tree.ged");
    await overviews.read("tree.ged", text);
    expect(overviews.revision("tree.ged")).not.toBe(before);
  });

  it("forgets every path under a deleted folder, and no other", async () => {
    const { overviews, show } = reads();
    for (const path of ["A/x.ged", "A/B/y.ged", "Ab/z.ged"]) {
      show("domorium-file-graph", path);
      await overviews.read(path, text);
    }

    const under = overviews.went("A", true);
    expect(["A/x.ged", "A/B/y.ged", "Ab/z.ged"].map((path) => overviews.revision(path) !== undefined)).toEqual([
      false,
      false,
      true,
    ]);
    expect(under("A/B/y.ged")).toBe(true);
    expect(under("Ab/z.ged")).toBe(false);
    expect(overviews.went("Ab/z.ged", false)("Ab/z.ged")).toBe(true);
    expect(overviews.revision("Ab/z.ged")).toBeUndefined();
  });

  it("maps each path under a moved folder to its new place", () => {
    const { overviews } = reads();

    expect([...overviews.moved("A", "C/A", ["C/A/x.ged", "C/A/B", "C/A/B/y.ged"])]).toEqual([
      ["A", "C/A"],
      ["A/x.ged", "C/A/x.ged"],
      ["A/B", "C/A/B"],
      ["A/B/y.ged", "C/A/B/y.ged"],
    ]);
    expect([...overviews.moved("tree.ged", "family.ged", [])]).toEqual([["tree.ged", "family.ged"]]);
  });
});
