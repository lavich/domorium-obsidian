import { type BranchScope, readBranchScope } from "./branchScope";
import { type IconSetter, prefersReducedMotion } from "./dom";
import { decodeOutline, outlinePath } from "./mapOutline";
import { MAP_OUTLINE } from "./mapOutlineData";
import { readMapView, type SavedView } from "./mapProjection";
import type { PlacesTable } from "./placesTable";

export interface MapState extends BranchScope {
  view?: SavedView;
}

export type TableState = { status: "unread" } | { status: "absent" } | { status: "read"; table: PlacesTable };

export interface TileSettings {
  enabled: boolean;
  template: string | null;
  invalid: boolean;
  attribution: string;
}

export interface FileMapHost {
  select(xref: string): void;
  setIcon: IconSetter;
  coarsePointer(): boolean;
  stateChanged(state: MapState): void;
  tableAction(): void;
  addMissing(names: string[]): void;
  tiles(): TileSettings;
}

export interface MapEnv {
  frame(callback: () => void): number;
  cancel(id: number): void;
  now(): number;
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
  reduced(): boolean;
  outline(): string;
}

let outlineCache: string | null = null;

export function defaultEnv(doc: Document): MapEnv {
  const win = doc.defaultView ?? window;
  return {
    frame: (callback) => win.requestAnimationFrame(callback),
    cancel: (id) => win.cancelAnimationFrame(id),
    now: () => win.performance.now(),
    set: (callback, ms) => win.setTimeout(callback, ms),
    clear: (id) => win.clearTimeout(id),
    reduced: () => prefersReducedMotion(doc),
    outline: () => (outlineCache ??= outlinePath(decodeOutline(MAP_OUTLINE))),
  };
}

export function readMapState(state: unknown): MapState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const view = readMapView(raw.view);
  return { ...readBranchScope(raw), ...(view ? { view } : {}) };
}

