import type { ViewState } from "obsidian";

/**
 * The file a leaf is showing, from its state rather than its view: a background
 * leaf is deferred and holds a `DeferredView`, so asking the view misses
 * exactly the tab worth finding. The state carries the path either way.
 */
export function shownFilePath(state: ViewState): string | null {
  const file = state.state?.file;
  return typeof file === "string" ? file : null;
}
