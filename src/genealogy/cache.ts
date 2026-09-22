import type { DocumentSymbol } from "@domorium/language-service";

import { buildIndex, type GenealogyIndex } from "./index";
import type { DocumentRef } from "./personRef";

/*
 * Imported by its consumers directly rather than re-exported from index.ts:
 * this module reads that one, and a barrel pointing back would make a cycle.
 */

/**
 * One reading per revision, and only the newest kept.
 *
 * What counts as a revision is the caller's, and it matters: a document open
 * in an editor changes when the reader types while the file on disk does not,
 * so a revision taken from the file's modification time goes stale on an
 * unsaved edit and shows the reader their own edit back as the old value.
 */
export class IndexCache {
  private readonly held_ = new Map<
    string,
    { revision: string; index: GenealogyIndex }
  >();

  get size(): number {
    return this.held_.size;
  }

  at(
    document: DocumentRef,
    revision: string,
    read: () => DocumentSymbol[],
  ): GenealogyIndex {
    const key = document.path;
    const found = this.held_.get(key);
    if (found?.revision === revision) {
      return found.index;
    }
    const index = buildIndex(read());
    this.held_.set(key, { revision, index });
    return index;
  }

  held(document: DocumentRef): GenealogyIndex | null {
    return this.held_.get(document.path)?.index ?? null;
  }

  forget(document: DocumentRef): void {
    this.held_.delete(document.path);
  }

  clear(): void {
    this.held_.clear();
  }
}
