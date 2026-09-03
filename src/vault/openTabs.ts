import type { ViewState, WorkspaceLeaf } from "obsidian";

/**
 * The file a leaf is showing, from its state rather than its view: a background
 * leaf is deferred and holds a `DeferredView`, so asking the view misses
 * exactly the tab worth finding. The state carries the path either way.
 */
export function shownFilePath(state: ViewState): string | null {
  const file = state.state?.file;
  return typeof file === "string" ? file : null;
}

/**
 * The first leaf showing `path`, or null where none does. `iterate` is handed
 * in so the walk can be tested without a workspace, and so that the caller
 * chooses which leaves count: only the ones a reader can actually be sent to.
 */
export function leafShowingFile(
  path: string,
  iterate: (visit: (leaf: WorkspaceLeaf) => void) => void,
): WorkspaceLeaf | null {
  let found: WorkspaceLeaf | null = null;
  iterate((leaf) => {
    if (found === null && shownFilePath(leaf.getViewState()) === path) {
      found = leaf;
    }
  });
  return found;
}
