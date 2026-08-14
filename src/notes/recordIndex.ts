import { GedcomLanguageService } from "@domorium/language-service";

import type { VaultReader } from "../api";
import { recordEntries, type GedcomRecord } from "../editor/records";

const LINK = /\[\[([^[\]|#]+)#([^[\]|#]*)$/u;

/** Where a link being typed has named a file and started on the record. */
export function linkContext(
  before: string,
): { path: string; query: string; start: number } | null {
  const found = LINK.exec(before);
  if (!found) {
    return null;
  }
  const [, path, query] = found;
  return { path, query, start: before.length - query.length };
}

export function recordList(text: string): GedcomRecord[] {
  return recordEntries(
    new GedcomLanguageService(text).getDocumentSymbols(),
  ).filter((record) => record.identifier !== undefined);
}

/** Read once per file, and again only where the file changed under it. */
export class RecordIndex {
  private readonly cache = new Map<
    string,
    { revision: string; records: GedcomRecord[] }
  >();

  constructor(private readonly vault: VaultReader) {}

  async of(path: string): Promise<GedcomRecord[]> {
    const file = await this.vault.read(path);
    if (!file) {
      return [];
    }
    const cached = this.cache.get(path);
    if (cached?.revision === file.revision) {
      return cached.records;
    }
    const records = recordList(file.text);
    this.cache.set(path, { revision: file.revision, records });
    return records;
  }
}
