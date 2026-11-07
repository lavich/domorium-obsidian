import type { Position, Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import type { MessageKey } from "../i18n";
import { FILE_GRAPH_ICON, FILE_TIMELINE_ICON } from "../icon";
import { DESK_MODES, readDeskMode, type DeskMode } from "../settingsData";
import { initialFocus, initialTimelineFocus } from "./fileTimeline";
import { readGraphState, type GraphState } from "./fileGraphView";
import { readTimelineState, ZOOM as TIMELINE_ZOOM, type TimelineState } from "./fileTimelineView";
import { familyFactByKey } from "./familyPage";
import { readListState, type ListState } from "./listRows";
import { eventAt } from "./eventRows";
import { placeAt } from "./placeRows";
import { factByKey, type FactKey } from "./personPage";

export type { DeskMode };

export type PageKind = "person" | "family" | "source" | "media" | "place" | "event";

export type ViewKind = "graph" | "timeline" | "list";

export interface DeskState {
  mode?: DeskMode;
  selected?: string;
  graph?: GraphState;
  timeline?: TimelineState;
  list?: ListState;
}

export const RETIRED_VIEW_TYPES = [
  "domorium-file-timeline",
  "domorium-file-graph",
  "domorium-evidence",
  "domorium-index",
] as const;

const isObject = (value: unknown): boolean => typeof value === "object" && value !== null;

export function readDeskState(state: unknown): DeskState {
  if (typeof state !== "object" || state === null) {
    return {};
  }
  const { mode, selected, graph, timeline, list } = state as Record<string, unknown>;
  const read = readDeskMode(mode);
  return {
    ...(read === undefined ? {} : { mode: read }),
    ...(typeof selected === "string" && selected ? { selected } : {}),
    ...(isObject(graph) ? { graph: readGraphState(graph) } : {}),
    ...(isObject(timeline) ? { timeline: readTimelineState(timeline) } : {}),
    ...(isObject(list) ? { list: readListState(list) } : {}),
  };
}

export function effectiveMode(stored: DeskMode, interfaceOn: boolean): DeskMode {
  return interfaceOn ? stored : "source";
}

/** A tab opened while the interface is off must not store the default, or turning it on would flip the tab. */
export function initialMode(
  persisted: DeskMode | undefined,
  lastMode: DeskMode,
  interfaceOn: boolean,
): DeskMode {
  return persisted ?? (interfaceOn ? lastMode : "source");
}

export type ModeSource = "reader" | "program";

/** Only a mode the reader picked is the one the next file opens in. */
export function rememberedMode(last: DeskMode, next: DeskMode, source: ModeSource): DeskMode {
  return source === "reader" ? next : last;
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
  if (index.media(xref)) {
    return "media";
  }
  if (placeAt(index, xref)) {
    return "place";
  }
  return eventAt(index, xref) ? "event" : null;
}

export type Origin = "view" | "card" | "link" | "history" | "cursor";

export interface ModeButton {
  mode: DeskMode;
  title: MessageKey;
  icon: string;
  active: boolean;
}

const MODE_LOOKS: Record<DeskMode, { title: MessageKey; icon: string }> = {
  graph: { title: "mode.graph", icon: FILE_GRAPH_ICON },
  timeline: { title: "mode.timeline", icon: FILE_TIMELINE_ICON },
  list: { title: "mode.list", icon: "list" },
  source: { title: "mode.source", icon: "code" },
};

export const modeLook = (mode: DeskMode): { title: MessageKey; icon: string } => MODE_LOOKS[mode];

export function modeButtons(current: DeskMode): ModeButton[] {
  return DESK_MODES.map((mode) => ({ mode, ...MODE_LOOKS[mode], active: mode === current }));
}

/** Obsidian puts each header action to the left of those already there, so adding them in the reverse order reads them in the order of the modes. */
export const actionOrder = (modes: readonly DeskMode[]): DeskMode[] => [...modes].reverse();

/** From Source to the mode before it, Graph where this session has none; from anywhere else to Source. */
export function toggleTarget(current: DeskMode, last: DeskMode | undefined): DeskMode {
  return current === "source" ? (last ?? "graph") : "source";
}

export const isViewMode = (mode: DeskMode): mode is ViewKind => mode !== "source";

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
  kind: "graph" | "timeline",
  saved: GraphState | TimelineState | undefined,
  index: GenealogyIndex,
  around: string | undefined,
): GraphState | TimelineState {
  if (saved) {
    return saved;
  }
  const focus = kind === "graph" ? initialFocus(index, around) : initialTimelineFocus(index, around);
  const scope = focus === undefined ? {} : { focus };
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
  return index.source(record)?.range ?? index.media(record)?.range ?? eventAt(index, record)?.event.range ?? null;
}

/** Leaves a cursor already inside the lines alone, so switching back and forth does not move it. */
export function cursorInside(range: Range, cursor: Position): boolean {
  return cursor.line >= range.start.line && cursor.line <= range.end.line;
}

