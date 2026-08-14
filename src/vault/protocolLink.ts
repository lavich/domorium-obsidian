import type { GedcomRecord } from "../editor/records";

export const PROTOCOL_ACTION = "domorium";

export interface GedcomLinkTarget {
  file: string;
  xref?: string;
}

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

/** What a `[[tree.ged#@I47@]]` link carries after the `#`. */
export function recordSubpath(xref: string): string {
  return `#${normalizeXref(xref)}`;
}

/** `![[tree.ged#@I47@]]` embeds the file; `[[tree.ged#@I47@]]` links to it. */
export function stripEmbed(link: string): string {
  return link.startsWith("!") ? link.slice(1) : link;
}

/**
 * What a link to a record shows a reader. A name, or failing that the
 * identifier — a link with no text of its own is spelt `[](tree.ged#@I47@)`
 * by Obsidian's markdown form, and a note shows nothing at all where it sits.
 */
export function recordLinkText(record: GedcomRecord): string {
  const named = (record.label ?? "").replace(/[[\]|]/gu, " ").trim();
  return named || (record.identifier ?? "");
}

export function xrefFromSubpath(subpath: string): string | null {
  const bare = subpath.replace(/^#/u, "").trim();
  return bare ? normalizeXref(bare) : null;
}

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
