import type { DocumentSymbol } from "@domorium/language-service";

import { childOf, payload } from "./symbols";
import type { SourceRow } from "./types";

/** As UNNAMED is for a person: a marker the caller names, not a title. */
export const UNTITLED = "@untitled@";

export const SOURCE_FIELD_TAGS: ReadonlySet<string> = new Set([
  "TITL", "AUTH", "PUBL", "ABBR", "TEXT", "REFN", "RIN",
]);

export function sourceRowOf(
  record: DocumentSymbol,
  repositories: ReadonlyMap<string, DocumentSymbol>,
): SourceRow {
  const xref = record.detail || undefined;
  const title = payload(childOf(record, "TITL")) ?? UNTITLED;
  const author = payload(childOf(record, "AUTH"));
  const repoPointer = payload(childOf(record, "REPO"));
  const held = repoPointer ? repositories.get(repoPointer) : undefined;
  const repository = payload(held && childOf(held, "NAME"));
  const row: SourceRow = {
    ...(xref === undefined ? {} : { xref }),
    unaddressable: xref === undefined,
    title,
    ...(author === undefined ? {} : { author }),
    ...(repository === undefined ? {} : { repository }),
    search: "",
  };
  row.search = [title, author ?? "", repository ?? "", xref ?? ""]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return row;
}
