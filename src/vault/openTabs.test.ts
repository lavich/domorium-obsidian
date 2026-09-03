import type { ViewState } from "obsidian";
import { describe, expect, it } from "vitest";

import { shownFilePath } from "./openTabs";

const state = (value: Partial<ViewState>): ViewState => ({
  type: "markdown",
  ...value,
});

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
