import type { ViewState, WorkspaceLeaf } from "obsidian";
import { describe, expect, it } from "vitest";

import { leafShowingFile, shownFilePath } from "./openTabs";

const state = (value: Partial<ViewState>): ViewState => ({
  type: "markdown",
  ...value,
});

/** A leaf is only ever asked what it is showing, so that is all one needs. */
const leaf = (file?: unknown): WorkspaceLeaf =>
  ({
    getViewState: () =>
      state(file === undefined ? {} : { state: { file } }),
  }) as unknown as WorkspaceLeaf;

const walk =
  (...leaves: WorkspaceLeaf[]) =>
  (visit: (leaf: WorkspaceLeaf) => void): void => {
    for (const one of leaves) {
      visit(one);
    }
  };

describe("the file a leaf is showing", () => {
  it("reads the path out of the state, which a deferred leaf still has", () => {
    expect(
      shownFilePath(state({ state: { file: "Media/marie.svg" } })),
    ).toBe("Media/marie.svg");
  });

  it("answers nothing for a leaf holding no file", () => {
    expect(shownFilePath(state({ type: "graph", state: {} }))).toBeNull();
    expect(shownFilePath(state({ type: "graph" }))).toBeNull();
  });

  it("declines a state whose file is not a path", () => {
    expect(shownFilePath(state({ state: { file: 7 } }))).toBeNull();
    expect(shownFilePath(state({ state: { file: null } }))).toBeNull();
  });
});

describe("the leaf a file is already open in", () => {
  it("answers the first one showing it", () => {
    const wanted = leaf("Media/marie.svg");
    expect(
      leafShowingFile(
        "Media/marie.svg",
        walk(leaf("tree.ged"), wanted, leaf("Media/marie.svg")),
      ),
    ).toBe(wanted);
  });

  it("answers nothing where no leaf is showing it", () => {
    expect(
      leafShowingFile("Media/marie.svg", walk(leaf("tree.ged"), leaf())),
    ).toBeNull();
  });

  it("does not take the timeline of a file for a tab of that file", () => {
    const timeline = {
      getViewState: () =>
        state({ type: "domorium-file-timeline", state: { gedcom: "tree.ged", focus: "@I1@", up: 2 } }),
    } as unknown as WorkspaceLeaf;
    const tab = leaf("tree.ged");

    expect(shownFilePath(timeline.getViewState())).toBeNull();
    expect(leafShowingFile("tree.ged", walk(timeline, tab))).toBe(tab);
    expect(leafShowingFile("tree.ged", walk(timeline))).toBeNull();
  });

  it("does not take the graph of a file for a tab of that file", () => {
    const graph = {
      getViewState: () =>
        state({
          type: "domorium-file-graph",
          state: { gedcom: "tree.ged", around: "@I1@", up: 2, down: 2, view: { x: 10, y: 20, k: 0.6 } },
        }),
    } as unknown as WorkspaceLeaf;
    const tab = leaf("tree.ged");

    expect(shownFilePath(graph.getViewState())).toBeNull();
    expect(leafShowingFile("tree.ged", walk(graph, tab))).toBe(tab);
    expect(leafShowingFile("tree.ged", walk(graph))).toBeNull();
  });

  it("walks whatever it is handed, and a workspace with nothing open is that", () => {
    expect(leafShowingFile("Media/marie.svg", walk())).toBeNull();
  });
});
