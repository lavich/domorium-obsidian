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

export interface PersonRef {
  document: DocumentRef;
  xref: string;
}

export function documentRef(path: string): DocumentRef {
  return { path };
}

export function personRef(document: DocumentRef, xref: string): PersonRef {
  return { document, xref: normalizeXref(xref) };
}

export function sameDocument(one: DocumentRef, other: DocumentRef): boolean {
  return one.path === other.path;
}

export function samePerson(one: PersonRef, other: PersonRef): boolean {
  return sameDocument(one.document, other.document) && one.xref === other.xref;
}

/** Bounded by `@`, so the last `#` separates; a path may carry its own. */
export function personPath(person: PersonRef): string {
  return `${person.document.path}#${person.xref}`;
}

export function parsePersonPath(written: string): PersonRef | null {
  const separator = written.lastIndexOf("#");
  if (separator <= 0) {
    return null;
  }
  const path = written.slice(0, separator);
  const xref = written.slice(separator + 1).trim();
  if (!path || !xref) {
    return null;
  }
  return personRef(documentRef(path), xref);
}
