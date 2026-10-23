import type { Position, Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import type { OpenAsMode } from "../settingsData";
import { familyFactByKey } from "./familyPage";
import { factByKey, PERSON_VIEWS, type FactKey, type PersonView } from "./personPage";

export type DeskMode = OpenAsMode;

export type PageKind = "person" | "family" | "source" | "media";

export interface DeskState {
  mode?: DeskMode;
  record?: string;
  view?: PersonView;
}

export function readDeskState(state: unknown): DeskState {
  if (typeof state !== "object" || state === null) {
    return {};
  }
  const { mode, record, view } = state as Record<string, unknown>;
  return {
    ...(mode === "genealogy" || mode === "source" ? { mode } : {}),
    ...(typeof record === "string" && record ? { record } : {}),
    ...(PERSON_VIEWS.includes(view as PersonView) ? { view: view as PersonView } : {}),
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

export interface IndexTarget {
  inSource(): boolean;
  goToXref(xref: string): boolean;
  openRecord(xref: string): void;
}

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

/** `declared` answers whether the file holds a record of any kind by that identifier. */
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

/** The lines of the fact shown, or else of the whole record shown. */
export function shownRange(
  index: GenealogyIndex,
  record: string,
  fact: FactKey | null,
): Range | null {
  const person = index.person(record);
  if (person) {
    return factByKey(person, fact)?.event.range ?? person.range;
  }
  const family = index.family(record);
  if (family) {
    return familyFactByKey(family, fact)?.event.range ?? family.range;
  }
  return index.source(record)?.range ?? index.media(record)?.range ?? null;
}

/** Leaves a cursor already inside the lines alone, so switching back and forth does not move it. */
export function cursorInside(range: Range, cursor: Position): boolean {
  return cursor.line >= range.start.line && cursor.line <= range.end.line;
}

