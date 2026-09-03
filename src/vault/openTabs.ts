import type { ViewState } from "obsidian";

/**
 * The file a leaf is showing, read from its state rather than its view.
 *
 * A leaf in the background is deferred: its `view` is a `DeferredView` and not
 * the `FileView` the type would otherwise give, so asking the view which file
 * it holds misses exactly the tab worth finding — one already open, behind the
 * one being read. The state carries the path either way.
 */
export function shownFilePath(state: ViewState): string | null {
  const file = state.state?.file;
  return typeof file === "string" ? file : null;
}
