import type { Text } from "@codemirror/state";

import { offsetFromPosition, positionFromOffset } from "./ephemeralState";

/**
 * Where a caret goes when the whole document is replaced under it — a sync
 * from another device, a pull, another application writing the file.
 *
 * By line and column rather than by offset, which is the choice
 * `getEphemeralState` already makes: after a change elsewhere in a file, the
 * line a reader was on is the thing they recognise.
 */
export function carryCursor(before: Text, after: Text, head: number): number {
  return offsetFromPosition(after, positionFromOffset(before, head));
}
