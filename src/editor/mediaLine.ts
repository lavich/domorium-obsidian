import type { EditorState } from "@codemirror/state";
import {
  offsetToPosition,
  type EditorLanguageService,
} from "@domorium/codemirror";
import type { MediaReference } from "@domorium/language-service";

/** The media a line names, and the line it was answered from, counting from one. */
export interface MediaLine {
  number: number;
  media: MediaReference;
}

/**
 * The level, the tag, and the gap before the payload. Only `FILE` and `OBJE`
 * can carry media, so every other line is settled without asking the service,
 * which walks a pointer to its record.
 */
const MEDIA_LINE = /^(\s*\d+\s+)(FILE|OBJE)(\s+)\S/;

/**
 * The media under one offset, or nothing. The whole line answers, from the tag
 * to its end, but not the level number that opens it: nothing there looks live.
 */
export function mediaLineAt(
  state: EditorState,
  language: EditorLanguageService,
  offset: number,
): MediaLine | null {
  const line = state.doc.lineAt(offset);
  const match = MEDIA_LINE.exec(line.text);
  if (!match) {
    return null;
  }
  const tagFrom = line.from + match[1].length;
  if (offset < tagFrom) {
    return null;
  }
  const payload = tagFrom + match[2].length + match[3].length;
  const media = language
    .update(state.doc)
    .getMediaAt(offsetToPosition(state.doc, payload));
  return media ? { number: line.number, media } : null;
}
