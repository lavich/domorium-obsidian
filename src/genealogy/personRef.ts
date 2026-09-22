/** Here rather than beside the vault's link spelling: this module imports
 * nothing from the rest of the plugin. */
export function normalizeXref(value: string): string {
  return `@${value.replace(/^@+|@+$/gu, "")}@`;
}

/**
 * What identifies the GEDCOM document a person lives in.
 *
 * A path today, and a value rather than a bare string on purpose: a path names
 * a document only while nobody moves it, and this reference is what a link, a
 * stored view state and a future cross-tree pointer are all spelt in. A later
 * change can add a stable identity beside the path without every holder of an
 * address changing shape.
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

/**
 * The spelling `[[tree.ged#@I47@]]` already uses. The identifier is bounded by
 * `@`, so the last `#` is the separator and a path may carry its own.
 */
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
