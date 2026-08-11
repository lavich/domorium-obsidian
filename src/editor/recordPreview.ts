import type { Text } from "@codemirror/state";
import {
  offsetToPosition,
  positionToOffset,
  type Range,
} from "@domorium/codemirror";

type Position = Range["start"];

export interface OffsetSpan {
  from: number;
  to: number;
}

export interface SemanticTokenSpan {
  startOffset: number;
  endOffset: number;
  tokenType: number;
}

export interface RecordSource {
  getDefinitionRanges(position: Position): Range[];
  getDocumentHighlights(position: Position): { range: Range }[];
  getFoldingRangeAt(
    line: number,
  ): { startLine: number; endLine: number } | undefined;
}

export interface RecordPreview extends OffsetSpan {
  truncated: boolean;
  pointer: OffsetSpan;
}

export interface PreviewRun {
  text: string;
  tokenType: number | null;
}

export function findRecordPreview(
  source: RecordSource,
  doc: Text,
  offset: number,
  maxLines: number,
): RecordPreview | null {
  const position = offsetToPosition(doc, offset);
  const [definition] = source.getDefinitionRanges(position);
  if (!definition || definition.start.line === position.line) {
    return null;
  }
  const pointer = findPointer(source, doc, position, offset);
  if (!pointer) {
    return null;
  }
  const startLine = definition.start.line;
  const endLine = source.getFoldingRangeAt(startLine)?.endLine ?? startLine;
  const lastShown = Math.min(endLine, startLine + maxLines - 1);
  return {
    from: doc.line(startLine + 1).from,
    to: doc.line(lastShown + 1).to,
    truncated: endLine > lastShown,
    pointer,
  };
}

export function toPreviewRuns(
  doc: Text,
  from: number,
  to: number,
  tokens: SemanticTokenSpan[],
): PreviewRun[] {
  const runs: PreviewRun[] = [];
  let cursor = from;
  for (const token of tokens) {
    const start = Math.max(token.startOffset, from);
    const end = Math.min(token.endOffset, to);
    if (end <= start || start < cursor) {
      continue;
    }
    if (start > cursor) {
      runs.push({ text: doc.sliceString(cursor, start), tokenType: null });
    }
    runs.push({ text: doc.sliceString(start, end), tokenType: token.tokenType });
    cursor = end;
  }
  if (cursor < to) {
    runs.push({ text: doc.sliceString(cursor, to), tokenType: null });
  }
  return runs;
}

function findPointer(
  source: RecordSource,
  doc: Text,
  position: Position,
  offset: number,
): OffsetSpan | null {
  for (const highlight of source.getDocumentHighlights(position)) {
    const from = positionToOffset(doc, highlight.range.start);
    const to = positionToOffset(doc, highlight.range.end);
    if (from <= offset && offset <= to) {
      return { from, to };
    }
  }
  return null;
}
