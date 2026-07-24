import type { Position, Range } from "gedcom-language-service";
import type { Text } from "@codemirror/state";

export function toOffset(document: Text, position: Position): number {
  const lineNumber = Math.min(position.line + 1, document.lines);
  const line = document.line(lineNumber);
  return Math.min(line.from + position.character, line.to);
}

export function toPosition(document: Text, offset: number): Position {
  const line = document.lineAt(Math.min(Math.max(offset, 0), document.length));
  return { line: line.number - 1, character: offset - line.from };
}

export function toOffsets(document: Text, range: Range): { from: number; to: number } {
  return {
    from: toOffset(document, range.start),
    to: toOffset(document, range.end),
  };
}
