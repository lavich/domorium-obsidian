/**
 * A marker, not a name: the model carries no reader-facing text, so the caller
 * names this one in the reader's language. `@` cannot begin a real name.
 */
export const UNNAMED = "@unnamed@";

/**
 * Where the slashes sit is itself information, so the parts are joined in the
 * order the line writes them. Reading a name into its parts is a larger
 * subject, which upstream declines for the same reason.
 */
/** The given names around the slashes and the surname between them, where the line writes both. */
export function readNameParts(payload: string | undefined): { given: string; surname: string } | undefined {
  const match = /^([^/]*)\/([^/]*)\/?(.*)$/u.exec(payload ?? "");
  if (!match) {
    return undefined;
  }
  const tidy = (text: string): string => text.replace(/\s+/gu, " ").trim();
  const surname = tidy(match[2] ?? "");
  const given = tidy(`${match[1] ?? ""} ${match[3] ?? ""}`);
  return surname && given ? { given, surname } : undefined;
}

export function readName(payload: string | undefined): string {
  const joined = (payload ?? "").replace(/\//gu, " ").replace(/\s+/gu, " ").trim();
  return joined || UNNAMED;
}
