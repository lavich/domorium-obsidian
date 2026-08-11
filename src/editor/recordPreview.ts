import type { Text } from "@codemirror/state";
import { offsetToPosition, type Range } from "@domorium/codemirror";

type Position = Range["start"];

export interface RecordSource {
  getDefinitionRanges(position: Position): Range[];
  getFoldingRangeAt(
    line: number,
  ): { startLine: number; endLine: number } | undefined;
}

export function readRecordPreview(
  source: RecordSource,
  doc: Text,
  offset: number,
  maxLines: number,
): string | null {
  const position = offsetToPosition(doc, offset);
  const [definition] = source.getDefinitionRanges(position);
  if (!definition || definition.start.line === position.line) {
    return null;
  }
  const startLine = definition.start.line;
  const endLine = source.getFoldingRangeAt(startLine)?.endLine ?? startLine;
  const lastShown = Math.min(endLine, startLine + maxLines - 1);
  const lines: string[] = [];
  for (let line = startLine; line <= lastShown; line += 1) {
    lines.push(doc.line(line + 1).text);
  }
  if (endLine > lastShown) {
    lines.push("…");
  }
  return lines.join("\n");
}
