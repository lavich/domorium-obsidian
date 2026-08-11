import type { Text } from "@codemirror/state";

export interface EphemeralPosition {
  line: number;
  ch: number;
}

export interface GedcomEphemeralState {
  cursor?: EphemeralPosition;
  scroll?: number;
}

export function positionFromOffset(
  doc: Text,
  offset: number,
): EphemeralPosition {
  const line = doc.lineAt(offset);
  return { line: line.number - 1, ch: offset - line.from };
}

export function offsetFromPosition(
  doc: Text,
  cursor: EphemeralPosition,
): number {
  const line = doc.line(clamp(cursor.line + 1, 1, doc.lines));
  return clamp(line.from + cursor.ch, line.from, line.to);
}

export function parseEphemeralState(value: unknown): GedcomEphemeralState {
  const source = asRecord(value);
  if (!source) {
    return {};
  }
  const state: GedcomEphemeralState = {};
  const cursor = parsePosition(source.cursor);
  if (cursor) {
    state.cursor = cursor;
  }
  if (isFiniteNumber(source.scroll) && source.scroll >= 0) {
    state.scroll = source.scroll;
  }
  return state;
}

function parsePosition(value: unknown): EphemeralPosition | null {
  const source = asRecord(value);
  if (!source || !isFiniteNumber(source.line) || !isFiniteNumber(source.ch)) {
    return null;
  }
  return { line: source.line, ch: source.ch };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
