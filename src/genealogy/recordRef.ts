export function normalizeXref(value: string): string {
  return `@${value.replace(/^@+|@+$/gu, "")}@`;
}

/**
 * A value rather than a bare path: a path names a document only while nobody
 * moves it, and a later change can add a stable identity beside it without
 * every holder of an address changing shape.
 */
export interface DocumentRef {
  path: string;
}

/** A record: the document it lives in, and its identifier within it. */
export interface RecordRef {
  document: DocumentRef;
  xref: string;
}

export function documentRef(path: string): DocumentRef {
  return { path };
}

export function recordRef(document: DocumentRef, xref: string): RecordRef {
  return { document, xref: normalizeXref(xref) };
}

export function sameDocument(one: DocumentRef, other: DocumentRef): boolean {
  return one.path === other.path;
}

export function sameRecord(one: RecordRef, other: RecordRef): boolean {
  return sameDocument(one.document, other.document) && one.xref === other.xref;
}

/** Bounded by `@`, so the last `#` separates; a path may carry its own. */
export function recordPath(person: RecordRef): string {
  return `${person.document.path}#${person.xref}`;
}

export function parseRecordPath(written: string): RecordRef | null {
  const separator = written.lastIndexOf("#");
  if (separator <= 0) {
    return null;
  }
  const path = written.slice(0, separator);
  const xref = written.slice(separator + 1).trim();
  if (!path || !xref) {
    return null;
  }
  return recordRef(documentRef(path), xref);
}
