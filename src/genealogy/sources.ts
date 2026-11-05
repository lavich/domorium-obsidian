import type { DocumentSymbol } from "@domorium/language-service";

import { childOf, payload } from "./symbols";
import type { Repository, SourceRow } from "./types";

/** As UNNAMED is for a person: a marker the caller names, not a title. */
export const UNTITLED = "@untitled@";

export const SOURCE_FIELD_TAGS: ReadonlySet<string> = new Set([
  "TITL", "AUTH", "PUBL", "ABBR", "TEXT", "REFN", "RIN",
]);

/**
 * The address is the `ADDR` line and the lines beneath it joined as one: the
 * record writes them apart, but nobody reads an address in pieces.
 */
export function repositoryRead(held: DocumentSymbol): Repository {
  const name = payload(childOf(held, "NAME"));
  const web = payload(childOf(held, "WWW"));
  const at = childOf(held, "ADDR");
  const address = at
    ? [payload(at), ...at.children.map((line) => payload(line))]
        .filter((part): part is string => Boolean(part))
        .join(", ")
    : undefined;
  return {
    ...(name === undefined ? {} : { name }),
    ...(address === undefined || address === "" ? {} : { address }),
    ...(web === undefined ? {} : { web }),
  };
}

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
