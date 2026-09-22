/**
 * A marker, not a name: the model carries no reader-facing text, so a person
 * the record leaves unnamed is reported as this and named by the caller in
 * whatever language the caller speaks. The `@` makes it unmistakable for a
 * name a file could actually contain.
 */
export const UNNAMED = "@unnamed@";

/**
 * GEDCOM marks the surname with slashes — `Marie /Skłodowska-Curie/` — and
 * where in the line they sit is itself information, so the parts are joined in
 * the order the line writes them rather than reordered. Reading a name into
 * its parts is a larger subject, which upstream declines for the same reason.
 */
export function readName(payload: string | undefined): string {
  const joined = (payload ?? "").replace(/\//gu, " ").replace(/\s+/gu, " ").trim();
  return joined || UNNAMED;
}
