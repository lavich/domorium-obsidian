import type { Position, Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import type { MessageKey } from "../i18n";
import { FILE_GRAPH_ICON, FILE_TIMELINE_ICON } from "../icon";
import { DESK_MODES, type OpenAsMode } from "../settingsData";
import { BRANCH_STEPS, initialFocus } from "./fileTimeline";
import { readGraphState, type GraphState } from "./fileGraphView";
import { readTimelineState, ZOOM as TIMELINE_ZOOM, type TimelineState } from "./fileTimelineView";
import { familyFactByKey } from "./familyPage";
import { factByKey, PERSON_VIEWS, type FactKey, type PersonView } from "./personPage";

export type DeskMode = OpenAsMode;

export type PageKind = "person" | "family" | "source" | "media";

export type ViewKind = "graph" | "timeline";

export interface DeskState {
  mode?: DeskMode;
  record?: string;
  view?: PersonView;
  graph?: GraphState;
  timeline?: TimelineState;
}

export const RETIRED_VIEW_TYPES = ["domorium-file-timeline", "domorium-file-graph"] as const;

const isObject = (value: unknown): boolean => typeof value === "object" && value !== null;

export function readDeskState(state: unknown): DeskState {
  if (typeof state !== "object" || state === null) {
    return {};
  }
  const { mode, record, view, graph, timeline } = state as Record<string, unknown>;
  return {
    ...(DESK_MODES.includes(mode as DeskMode) ? { mode: mode as DeskMode } : {}),
    ...(typeof record === "string" && record ? { record } : {}),
    ...(PERSON_VIEWS.includes(view as PersonView) ? { view: view as PersonView } : {}),
    ...(isObject(graph) ? { graph: readGraphState(graph) } : {}),
    ...(isObject(timeline) ? { timeline: readTimelineState(timeline) } : {}),
  };
}

export function effectiveMode(stored: DeskMode, interfaceOn: boolean): DeskMode {
  return interfaceOn ? stored : "source";
}

/** A tab opened while the interface is off must not store the default, or turning it on would flip the tab. */
export function initialMode(
  persisted: DeskMode | undefined,
  openAs: OpenAsMode,
  interfaceOn: boolean,
): DeskMode {
  return persisted ?? (interfaceOn ? openAs : "source");
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
  inView(): boolean;
  goToXref(xref: string): boolean;
  openRecord(xref: string): void;
  /** False where the record is not a person, which has nothing to select. */
  selectInView(xref: string): boolean;
}

export function openFromIndex(tab: IndexTarget, xref: string): void {
  if (tab.inSource()) {
    tab.goToXref(xref);
  } else if (!tab.inView() || !tab.selectInView(xref)) {
    tab.openRecord(xref);
  }
}

export interface ModeChoice {
  mode: DeskMode;
  title: MessageKey;
  icon: string;
  checked: boolean;
}

const MODE_LOOKS: Record<DeskMode, { title: MessageKey; icon: string }> = {
  genealogy: { title: "mode.genealogy", icon: "users" },
  graph: { title: "mode.graph", icon: FILE_GRAPH_ICON },
  timeline: { title: "mode.timeline", icon: FILE_TIMELINE_ICON },
  source: { title: "mode.source", icon: "code" },
};

export function modeChoices(current: DeskMode): ModeChoice[] {
  return DESK_MODES.map((mode) => ({ mode, ...MODE_LOOKS[mode], checked: mode === current }));
}

/** From Source to the mode before it, Genealogy where this session has none; from anywhere else to Source. */
export function toggleTarget(current: DeskMode, last: DeskMode | undefined): DeskMode {
  return current === "source" ? (last ?? "genealogy") : "source";
}

export const isViewMode = (mode: DeskMode): mode is ViewKind => mode === "graph" || mode === "timeline";

/** Whether Back should return to what the tab showed: a record changes, or a view gives way to its page. */
export function navigationStep(
  current: { mode: DeskMode; record: string | null },
  next: { mode?: DeskMode; record?: string },
): boolean {
  if (next.record !== undefined && next.record !== current.record) {
    return true;
  }
  return next.record !== undefined && next.mode === "genealogy" && isViewMode(current.mode);
}

export function openingMemory(
  kind: "graph",
  saved: GraphState | undefined,
  index: GenealogyIndex,
  around: string | undefined,
): GraphState;
export function openingMemory(
  kind: "timeline",
  saved: TimelineState | undefined,
  index: GenealogyIndex,
  around: string | undefined,
): TimelineState;
export function openingMemory(
  kind: ViewKind,
  saved: GraphState | TimelineState | undefined,
  index: GenealogyIndex,
  around: string | undefined,
): GraphState | TimelineState {
  if (saved) {
    return saved;
  }
  const focus = initialFocus(index, around);
  const scope = {
    ...(focus === undefined ? {} : { focus }),
    up: BRANCH_STEPS.initial,
    down: BRANCH_STEPS.initial,
  };
  return kind === "graph" ? scope : { ...scope, zoom: TIMELINE_ZOOM.initial };
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

