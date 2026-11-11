import type { Position, Range } from "@domorium/language-service";

import { HEADER_ID, type GenealogyIndex } from "../genealogy";
import type { MessageKey } from "../i18n";
import { FILE_GRAPH_ICON, FILE_TIMELINE_ICON } from "../icon";
import { DESK_MODES, readDeskMode, type DeskMode } from "../settingsData";
import { initialFocus, initialTimelineFocus } from "./fileTimeline";
import { readGraphState, type GraphState } from "./fileGraphView";
import { readTimelineState, ZOOM as TIMELINE_ZOOM, type TimelineState } from "./fileTimelineView";
import { readListState, recordKind, type ListKind, type ListState } from "./listRows";

export type { DeskMode };
export { HEADER_ID };

/** `record` is a shared note, a repository, a submitter, a submission, a record of the file's own or the header: a card that is its tree. */
export type PageKind = "person" | "family" | "source" | "media" | "place" | "record";

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
    ...(typeof selected === "string" && selected ? { selected: ownerOfSavedEvent(selected) } : {}),
    ...(isObject(graph) ? { graph: readGraphState(graph) } : {}),
    ...(isObject(timeline) ? { timeline: readTimelineState(timeline) } : {}),
    ...(isObject(list) ? { list: readListState(list) } : {}),
  };
}

const SAVED_EVENT = /^event:(.+):[A-Za-z0-9_]+:(?:0|[1-9]\d*)$/u;

/** A workspace saved before the events had no cards may name an event as the selection; its record is what it showed. */
function ownerOfSavedEvent(selected: string): string {
  return SAVED_EVENT.exec(selected)?.[1] ?? selected;
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

const PAGE_OF: Record<ListKind, PageKind> = {
  people: "person",
  families: "family",
  sources: "source",
  places: "place",
  media: "media",
  notes: "record",
  repositories: "record",
  other: "record",
};

export function pageKind(index: GenealogyIndex, xref: string): PageKind | null {
  const kind = recordKind(index, xref);
  return kind === null ? null : PAGE_OF[kind];
}

const FOLLOWED: ReadonlySet<PageKind> = new Set(["person", "family", "source", "media"]);

/** Whether the cursor resting in a record, or leaving Source from it, selects it. */
export function followsCursor(index: GenealogyIndex, xref: string): boolean {
  const kind = pageKind(index, xref);
  return kind !== null && FOLLOWED.has(kind);
}

export type Origin = "view" | "card" | "link" | "cursor";

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

/** A link's identifier, or an entry of *Go to record*. */
export type RecordTarget = string | { tag: string; identifier?: string; start: Position };

export type RecordRoute =
  | { to: "select"; id: string }
  | { to: "source"; at: Position }
  | { to: "nowhere" };

/** Where a link or *Go to record* lands; `declared` answers where the file starts a record of any kind by that identifier. */
export function routeRecord(
  index: GenealogyIndex,
  target: RecordTarget,
  declared: (xref: string) => Position | undefined,
  interfaceOn: boolean,
): RecordRoute {
  const id = typeof target === "string" ? target : target.tag === "HEAD" ? HEADER_ID : target.identifier;
  if (interfaceOn && id !== undefined && pageKind(index, id) !== null) {
    return { to: "select", id };
  }
  const at = typeof target === "string" ? declared(target) : target.start;
  return at === undefined ? { to: "nowhere" } : { to: "source", at };
}

/** The lines of the record shown. */
export function shownRange(index: GenealogyIndex, record: string): Range | null {
  const kind = pageKind(index, record);
  if (kind === null || kind === "place") {
    return null;
  }
  return (index.person(record) ?? index.family(record) ?? index.source(record) ?? index.media(record) ?? index.record(record))?.range ?? null;
}

/** Leaves a cursor already inside the lines alone, so switching back and forth does not move it. */
export function cursorInside(range: Range, cursor: Position): boolean {
  return cursor.line >= range.start.line && cursor.line <= range.end.line;
}

