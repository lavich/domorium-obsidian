import { GedcomLanguageService } from "@domorium/language-service";

import type { VaultReader } from "../api";
import { normalizeXref } from "../vault/protocolLink";

/** What Obsidian writes where the author gave the link no text of their own. */
export function defaultLinkText(href: string): string {
  return href.split("#").filter(Boolean).join(" > ").trim();
}

export function splitSubpath(href: string): {
  path: string;
  subpath: string;
} {
  const hash = href.indexOf("#");
  return hash === -1
    ? { path: href, subpath: "" }
    : { path: href.slice(0, hash), subpath: href.slice(hash) };
}

/**
 * A link the author wrote out by hand reads as a path and an identifier. The
 * name is better, and their own words are better still, so a link carrying
 * any text of its own is left as it is.
 */
export function namedLink(
  href: string,
  shown: string,
  name: string | undefined,
): string | null {
  if (!name || shown !== defaultLinkText(href)) {
    return null;
  }
  return name === shown ? null : name;
}

export function recordNames(text: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const symbol of new GedcomLanguageService(text).getDocumentSymbols()) {
    if (symbol.detail && symbol.label) {
      names.set(symbol.detail, symbol.label);
    }
  }
  return names;
}

/** Read once per file, and again only where the file changed under it. */
export class RecordNameIndex {
  private readonly cache = new Map<
    string,
    { revision: string; names: Map<string, string> }
  >();

  constructor(private readonly vault: VaultReader) {}

  async nameOf(path: string, xref: string): Promise<string | undefined> {
    return (await this.namesOf(path))?.get(normalizeXref(xref));
  }

  private async namesOf(path: string): Promise<Map<string, string> | null> {
    const file = await this.vault.read(path);
    if (!file) {
      return null;
    }
    const cached = this.cache.get(path);
    if (cached?.revision === file.revision) {
      return cached.names;
    }
    const names = recordNames(file.text);
    this.cache.set(path, { revision: file.revision, names });
    return names;
  }
}
