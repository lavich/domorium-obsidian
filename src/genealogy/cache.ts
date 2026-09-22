import type { DocumentSymbol } from "@domorium/language-service";

import { buildIndex, type GenealogyIndex } from "./index";
import type { DocumentRef } from "./personRef";

/*
 * Imported by its consumers directly rather than re-exported from index.ts:
 * this module reads that one, and a barrel pointing back would make a cycle.
 */

/**
 * One reading per revision of a document, shared by everything that reads it.
 *
 * What counts as a revision is the caller's to decide, and the distinction
 * matters: a document open in an editor changes when the reader types, while
 * the file on disk does not. A revision taken from the file's modification
 * time would go stale the moment someone edits without saving, and would show
 * the reader their own edit back as the old value. An open document's caller
 * therefore counts its own updates; a closed one may use the file's metadata.
 *
 * Only the newest revision of a document is kept. The older reading has no
 * reader and the syntax tree behind it is the expensive thing in the process.
 */
export class IndexCache {
  private readonly held = new Map<
    string,
    { revision: string; index: GenealogyIndex }
  >();

  get size(): number {
    return this.held.size;
  }

  /** `read` runs only for a revision not already held. */
  at(
    document: DocumentRef,
    revision: string,
    read: () => DocumentSymbol[],
  ): GenealogyIndex {
    const key = document.path;
    const found = this.held.get(key);
    if (found?.revision === revision) {
      return found.index;
    }
    const index = buildIndex(read());
    this.held.set(key, { revision, index });
    return index;
  }

  forget(document: DocumentRef): void {
    this.held.delete(document.path);
  }

  clear(): void {
    this.held.clear();
  }
}
