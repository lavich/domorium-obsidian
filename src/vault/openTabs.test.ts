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

  it("walks whatever it is handed, and a workspace with nothing open is that", () => {
    expect(leafShowingFile("Media/marie.svg", walk())).toBeNull();
  });
});
