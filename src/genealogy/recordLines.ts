import type { DocumentSymbol, Range } from "@domorium/language-service";

/** One line of a record as the file writes it, with what hangs beneath it. */
export interface RecordLine {
  tag: string;
  /** The identifier, on the line that opens a record. */
  xref?: string;
  /** What the line carries other than a pointer, its `CONT` and `CONC` lines joined into it. */
  text?: string;
  /** The record a payload of the form `@X@` points at. */
  pointer?: string;
  /** 7.0's `@VOID@`: the line deliberately names no record. */
  void?: true;
  children: RecordLine[];
  range: Range;
}

const POINTER = /^@([^@\s]+)@$/u;

function continued(symbol: DocumentSymbol, first: string | undefined): string | undefined {
  let text = first;
  for (const child of symbol.children) {
    if (child.name === "CONT") {
      text = text === undefined ? (child.detail ?? "") : `${text}\n${child.detail ?? ""}`;
    } else if (child.name === "CONC") {
      text = `${text ?? ""}${child.detail ?? ""}`;
    }
  }
  return text;
}

function lineOf(symbol: DocumentSymbol): RecordLine {
  const payload = symbol.detail;
  const match = payload === undefined ? null : POINTER.exec(payload);
  const text = match ? undefined : continued(symbol, payload)?.replace(/@@/gu, "@");
  return {
    tag: symbol.name,
    ...(match ? (match[1] === "VOID" ? { void: true as const } : { pointer: payload }) : {}),
    ...(text === undefined || text === "" ? {} : { text }),
    children: symbol.children.filter((child) => child.name !== "CONT" && child.name !== "CONC").map(lineOf),
    range: symbol.range,
  };
}

/**
 * The lines of a record whole, to any depth. A note record carries its text in the label of its
 * symbol, the first line of it, and in `CONT` and `CONC` lines the rest.
 */
export function recordLines(symbol: DocumentSymbol): RecordLine {
  const note = symbol.name === "NOTE" || symbol.name === "SNOTE";
  const first = symbol.label ?? (symbol.children.some((child) => child.name === "CONT") ? "" : undefined);
  const text = note ? continued(symbol, first)?.replace(/@@/gu, "@") : undefined;
  return {
    tag: symbol.name,
    ...(symbol.detail === undefined ? {} : { xref: symbol.detail }),
    ...(text === undefined || text === "" ? {} : { text }),
    children: symbol.children.filter((child) => child.name !== "CONT" && child.name !== "CONC").map(lineOf),
    range: symbol.range,
  };
}
