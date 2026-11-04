import type { Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import { openingMemory, type ViewKind } from "./deskState";
import { fileTimelineOf } from "./fileTimeline";
import { FileGraphBoard, type GraphState } from "./fileGraphView";
import { FileTimelineBoard, type TimelineState } from "./fileTimelineView";
import type { PortraitContent } from "./graphCanvas";

export type { ViewKind } from "./deskState";

export interface ViewMemory {
  graph?: GraphState;
  timeline?: TimelineState;
}

export interface FileViewsHost {
  /** A person or a family. */
  openRecord(xref: string): void;
  showInSource(range: Range): void;
  portrait(xref: string): PortraitContent | null;
  /** The memory changed, so the layout wants saving. */
  changed(): void;
  setIcon(element: HTMLElement, icon: string): void;
}

/** What a view is shown with: the tab's own memory over what the boards last reported. */
export const memoryToShow = (reported: ViewMemory, tab: ViewMemory): ViewMemory => ({ ...reported, ...tab });

const KINDS: readonly ViewKind[] = ["graph", "timeline"];

/** The graph and the timeline of a file, each made on its first show in a root of its own and kept, so a switch loses neither's view. */
export class FileViews {
  private readonly roots: Partial<Record<ViewKind, HTMLElement>> = {};
  private graph: FileGraphBoard | null = null;
  private timeline: FileTimelineBoard | null = null;
  private kept: ViewMemory = {};
  private pending: Partial<Record<ViewKind, string>> = {};
  private parked: Record<ViewKind, boolean> = { graph: false, timeline: false };
  private shownKind: ViewKind | null = null;

  constructor(
    private readonly parent: HTMLElement,
    private readonly host: FileViewsHost,
  ) {}

  /** Draws `kind` for `index` and shows it; `memory` is where the tab says it was, taken whole by the first show and by a scope that differs. */
  show(kind: ViewKind, index: GenealogyIndex, memory: ViewMemory, around?: string): void {
    this.parkOthers(kind);
    const root = this.rootOf(kind);
    root.toggle(true);
    this.shownKind = kind;
    const first = this.boardOf(kind) === null;
    const restore = first || this.parked[kind];
    this.parked[kind] = false;
    const before = JSON.stringify(this.kept[kind]);
    if (kind === "graph") {
      this.showGraph(index, memory.graph, around);
    } else {
      this.showTimeline(index, memory.timeline, around, restore);
    }
    this.boardOf(kind)?.resized();
    const wanted = this.pending[kind];
    if (wanted !== undefined && (restore || this.displayed())) {
      delete this.pending[kind];
      this.boardOf(kind)?.select(wanted);
    }
    if (JSON.stringify(this.kept[kind]) !== before) {
      this.host.changed();
    }
  }

  /** Never fails and never needs a board: kept until one is drawn and shown. */
  select(kind: ViewKind, xref: string | null): void {
    if (xref === null) {
      delete this.pending[kind];
      this.boardOf(kind)?.select(null);
      return;
    }
    if (this.shownKind === kind && this.displayed()) {
      delete this.pending[kind];
      this.boardOf(kind)?.select(xref);
      return;
    }
    this.pending[kind] = xref;
  }

  /** Opens the search of a drawn board and focuses it, or only focuses it where it is open. */
  openSearch(kind: ViewKind): void {
    this.boardOf(kind)?.openSearch();
  }

  hide(): void {
    this.parkOthers(null);
    this.shownKind = null;
  }

  /** Only where a board exists; the tab draws a view that has none. */
  resized(): void {
    if (this.shownKind !== null) {
      this.boardOf(this.shownKind)?.resized();
    }
  }

  /** Whether the board on show has a box, which a board hidden with its tab does not. */
  displayed(): boolean {
    const root = this.shownKind === null ? undefined : this.roots[this.shownKind];
    return root !== undefined && (root.offsetWidth > 0 || root.offsetHeight > 0 || root.getClientRects().length > 0);
  }

  /** What the boards reported, and the timeline's scroll as last seen in sight; never a view asked of a board. */
  memory(): ViewMemory {
    if (this.timeline && this.kept.timeline && this.shownKind === "timeline" && this.displayed()) {
      this.kept.timeline = { ...this.kept.timeline, scroll: this.timeline.scroll() };
    }
    return {
      ...(this.kept.graph ? { graph: { ...this.kept.graph } } : {}),
      ...(this.kept.timeline ? { timeline: { ...this.kept.timeline } } : {}),
    };
  }

  /** Another file: no board, no memory. */
  reset(): void {
    this.parkOthers(null);
    for (const kind of KINDS) {
      this.roots[kind]?.remove();
      delete this.roots[kind];
    }
    this.graph = null;
    this.timeline = null;
    this.kept = {};
    this.pending = {};
    this.parked = { graph: false, timeline: false };
    this.shownKind = null;
  }

  dispose(): void {
    this.reset();
  }

  private showGraph(index: GenealogyIndex, saved: GraphState | undefined, around: string | undefined): void {
    const board = (this.graph ??= this.makeGraph());
    const { view, ...scope } = openingMemory("graph", saved, index, around);
    const kept = this.kept.graph;
    board.show(fileTimelineOf(index), {
      scope,
      ...(around === undefined ? {} : { around }),
      ...(kept?.view ?? view ? { view: kept?.view ?? view } : {}),
    });
    const held = kept?.view ?? view;
    this.kept.graph = { ...scope, ...(held ? { view: held } : {}) };
  }

  private showTimeline(
    index: GenealogyIndex,
    saved: TimelineState | undefined,
    around: string | undefined,
    restore: boolean,
  ): void {
    const board = (this.timeline ??= this.makeTimeline());
    const { scroll: savedScroll, ...scope } = openingMemory("timeline", saved, index, around);
    const scroll = this.kept.timeline?.scroll ?? savedScroll;
    board.show(fileTimelineOf(index), scope);
    this.kept.timeline = { ...scope, ...(scroll ? { scroll } : {}) };
    if (restore && scroll) {
      board.setScroll(scroll);
    }
  }

  private parkOthers(keep: ViewKind | null): void {
    for (const kind of KINDS) {
      if (kind === keep) {
        continue;
      }
      const root = this.roots[kind];
      const board = this.boardOf(kind);
      if (root === undefined || board === null) {
        continue;
      }
      board.cancelHover();
      if (kind === "timeline" && this.timeline && this.kept.timeline && this.shownKind === kind) {
        this.kept.timeline = { ...this.kept.timeline, scroll: this.timeline.scroll() };
      }
      if (this.shownKind === kind) {
        this.parked[kind] = true;
      }
      root.toggle(false);
    }
  }

  private boardOf(kind: ViewKind): FileGraphBoard | FileTimelineBoard | null {
    return kind === "graph" ? this.graph : this.timeline;
  }

  private rootOf(kind: ViewKind): HTMLElement {
    return (this.roots[kind] ??= this.parent.createDiv({ cls: `gedcom-views-root is-${kind}` }));
  }

  private makeGraph(): FileGraphBoard {
    return new FileGraphBoard(this.rootOf("graph"), {
      openRecord: (xref) => this.host.openRecord(xref),
      portrait: (xref) => this.host.portrait(xref),
      stateChanged: ({ scope, view }) => {
        const held = view ?? this.kept.graph?.view;
        this.kept.graph = { ...scope, ...(held ? { view: held } : {}) };
        this.host.changed();
      },
      setIcon: (element, icon) => this.host.setIcon(element, icon),
    });
  }

  private makeTimeline(): FileTimelineBoard {
    return new FileTimelineBoard(this.rootOf("timeline"), {
      openPerson: (xref) => this.host.openRecord(xref),
      showInSource: (range) => this.host.showInSource(range),
      scopeChanged: (scope) => {
        const scroll = this.kept.timeline?.scroll;
        this.kept.timeline = { ...scope, ...(scroll ? { scroll } : {}) };
        this.host.changed();
      },
      setIcon: (element, icon) => this.host.setIcon(element, icon),
    });
  }
}
