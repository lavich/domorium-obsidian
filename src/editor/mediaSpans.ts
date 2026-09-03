import type { EditorState } from "@codemirror/state";
import { offsetToPosition, type EditorLanguageService } from "@domorium/codemirror";
import type { MediaReference } from "@domorium/language-service";

/**
 * Which lines name media, and over what extent the gesture answers. Computed
 * on the hover rather than on every viewport change: the dressing a reader
 * sees comes from the highlight style, which already calls a reference and a
 * file payload what they are.
 */
export interface MediaSpan {
  /** The payload, which the highlight style dresses as a link. */
  from: number;
  /** The tag: the gesture is answered from here, a wider target than the mark. */
  tagFrom: number;
  to: number;
  media: MediaReference;
}

/**
 * Only `FILE` and `OBJE` can carry media, so every other line is settled
 * without asking the service — which, for a pointer, walks to its record.
 *
 * The groups are the level, the tag, and the gap before the payload: the
 * service answers for a position inside the payload, while the extent a reader
 * may hover starts at the tag.
 */
const MEDIA_LINE = /^(\s*\d+\s+)(FILE|OBJE)(\s+)\S/;

export function mediaSpans(
  state: EditorState,
  language: EditorLanguageService,
  ranges: readonly { from: number; to: number }[],
): MediaSpan[] {
  const spans: MediaSpan[] = [];
  let previous = -1;
  for (const range of ranges) {
    for (let at = range.from; at <= range.to; ) {
      const line = state.doc.lineAt(at);
      at = line.to + 1;
      if (line.number === previous) {
        continue;
      }
      previous = line.number;
      const match = MEDIA_LINE.exec(line.text);
      if (!match) {
        continue;
      }
      const tagFrom = line.from + match[1].length;
      const from = tagFrom + match[2].length + match[3].length;
      const media = language
        .update(state.doc)
        .getMediaAt(offsetToPosition(state.doc, from));
      if (media) {
        spans.push({ from, tagFrom, to: line.to, media });
      }
    }
  }
  return spans;
}

/**
 * The span the pointer is inside, or nothing. The target reaches back to the
 * tag, past where the dressing starts: a reader aiming near the thing should
 * hit it, and the tag keeps the colour its own kind gives it.
 */
export function spanAt(spans: MediaSpan[], offset: number): MediaSpan | null {
  return (
    spans.find((span) => offset >= span.tagFrom && offset <= span.to) ?? null
  );
}
