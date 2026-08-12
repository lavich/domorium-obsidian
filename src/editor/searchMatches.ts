import type { SearchQuery } from "@codemirror/search";
import type { EditorState } from "@codemirror/state";

export interface MatchCount {
  /** Which match the selection is on, counting from one, or 0 for none. */
  index: number;
  total: number;
  capped: boolean;
}

export const MATCH_CAP = 1000;

export function countMatches(
  state: EditorState,
  query: SearchQuery,
  cap = MATCH_CAP,
): MatchCount {
  if (!query.valid) {
    return { index: 0, total: 0, capped: false };
  }
  const cursor = query.getCursor(state);
  const head = state.selection.main.from;
  let index = 0;
  let total = 0;
  for (let step = cursor.next(); !step.done; step = cursor.next()) {
    total += 1;
    if (index === 0 && step.value.from === head) {
      index = total;
    }
    if (total >= cap) {
      return { index, total, capped: true };
    }
  }
  return { index, total, capped: false };
}

export function describeMatches(count: MatchCount): string {
  if (count.total === 0) {
    return "";
  }
  const total = count.capped ? `${count.total}+` : `${count.total}`;
  return count.index === 0 ? total : `${count.index}/${total}`;
}
