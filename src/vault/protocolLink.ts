import type { GedcomRecord } from "../editor/records";

export const PROTOCOL_ACTION = "domorium";

export interface GedcomLinkTarget {
  file: string;
  xref?: string;
}

/**
 * Once these are written into notes the names are permanent, so the reader is
 * forgiving about the one thing a hand-written link gets wrong: `I47` and
 * `@I47@` name the same record.
 */
export function normalizeXref(value: string): string {
  return `@${value.replace(/^@+|@+$/gu, "")}@`;
}

export function parseGedcomLink(
  params: Record<string, string>,
): GedcomLinkTarget | null {
  const file = params.file?.trim();
  if (!file) {
    return null;
  }
  const xref = params.xref?.trim();
  return xref ? { file, xref: normalizeXref(xref) } : { file };
}

export function gedcomLinkUrl(
  vault: string,
  file: string,
  xref: string,
): string {
  const query = new URLSearchParams({ vault, file, xref });
  return `obsidian://${PROTOCOL_ACTION}?${query.toString()}`;
}

/**
 * A line belongs to the last record declared at or above it. Nothing is above
 * the first one, so a cursor there belongs to no record.
 */
export function recordAtLine(
  records: GedcomRecord[],
  line: number,
): GedcomRecord | undefined {
  let found: GedcomRecord | undefined;
  for (const record of records) {
    if (record.start.line > line) {
      break;
    }
    found = record;
  }
  return found;
}
