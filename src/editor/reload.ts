import type { Text } from "@codemirror/state";

import { offsetFromPosition, positionFromOffset } from "./ephemeralState";

export function carryCursor(before: Text, after: Text, head: number): number {
  return offsetFromPosition(after, positionFromOffset(before, head));
}
