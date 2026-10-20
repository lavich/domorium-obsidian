import type { GenealogyIndex } from "../genealogy";
import type { OpenAsMode } from "../settingsData";

export type DeskMode = OpenAsMode;

export type PageKind = "person" | "family" | "source" | "media";

/** What a tab keeps of the desk across a restart, beside the file it shows. */
export interface DeskState {
  mode?: DeskMode;
  record?: string;
}

export function readDeskState(state: unknown): DeskState {
  if (typeof state !== "object" || state === null) {
    return {};
  }
  const { mode, record } = state as Record<string, unknown>;
  return {
    ...(mode === "genealogy" || mode === "source" ? { mode } : {}),
    ...(typeof record === "string" && record ? { record } : {}),
  };
}

export function pageKind(index: GenealogyIndex, xref: string): PageKind | null {
  if (index.person(xref)) {
    return "person";
  }
  if (index.family(xref)) {
    return "family";
  }
  if (index.source(xref)) {
    return "source";
  }
  return index.media(xref) ? "media" : null;
}

/**
 * The first of the preferred records that has a page, else the file's first
 * person, else its first source. Null for a file with neither.
 */
export function recordToShow(
  index: GenealogyIndex,
  preferred: (string | undefined)[],
): string | null {
  for (const xref of preferred) {
    if (xref && pageKind(index, xref)) {
      return xref;
    }
  }
  return (
    index.people.find((row) => row.xref)?.xref ??
    index.sources.find((row) => row.xref)?.xref ??
    null
  );
}

/** What the index needs of the tab it follows. */
export interface IndexTarget {
  inSource(): boolean;
  goToXref(xref: string): boolean;
  openRecord(xref: string): void;
}

/** The index keeps the tab in the mode it is in: a page there, a line here. */
export function openFromIndex(tab: IndexTarget, xref: string): void {
  if (tab.inSource()) {
    tab.goToXref(xref);
  } else {
    tab.openRecord(xref);
  }
}

export type LinkRoute =
  | { to: "page"; xref: string }
  | { to: "source"; xref: string }
  | { to: "nowhere" };

/**
 * Where a link into a record lands in Genealogy mode. `declared` answers
 * whether the file holds a record by that identifier of any kind.
 */
export function routeLink(
  index: GenealogyIndex,
  xref: string,
  declared: (xref: string) => boolean,
): LinkRoute {
  if (pageKind(index, xref)) {
    return { to: "page", xref };
  }
  return declared(xref) ? { to: "source", xref } : { to: "nowhere" };
}
