import type { Range } from "@domorium/language-service";

import type { GenealogyIndex } from "../genealogy";
import { openingMemory, type ViewKind } from "./deskState";
import { fileTimelineOf } from "./fileTimeline";
import { FileGraphBoard, type GraphState } from "./fileGraphView";
import { FileTimelineBoard, type TimelineState } from "./fileTimelineView";
import { ListBoard } from "./fileList";
import type { ListState } from "./listRows";
import type { FactKey } from "./personPage";
import type { PortraitContent } from "./graphCanvas";

export type { ViewKind } from "./deskState";

export interface ViewMemory {
  graph?: GraphState;
  timeline?: TimelineState;
  list?: ListState;
}

export interface FileViewsHost {
  /** A person, a family or a source. */
  select(xref: string): void;
  /** A person or a family, with one of its events shown. */
  selectEvent(xref: string, fact: FactKey): void;
  showInSource(range: Range): void;
  portrait(xref: string): PortraitContent | null;
  /** The memory changed, so the layout wants saving. */
  changed(): void;
  setIcon(element: HTMLElement, icon: string): void;
  coarsePointer(): boolean;
}

/** What a view is shown with: the tab's own memory over what the boards last reported. */
export const memoryToShow = (reported: ViewMemory, tab: ViewMemory): ViewMemory => ({ ...reported, ...tab });

const KINDS: readonly ViewKind[] = ["graph", "timeline", "list"];

export class FileViews {
  private readonly roots: Partial<Record<ViewKind, HTMLElement>> = {};
  private graph: FileGraphBoard | null = null;
  private timeline: FileTimelineBoard | null = null;
  private list: ListBoard | null = null;
  private listScroll: number | undefined;
  private kept: ViewMemory = {};
  private pending: Partial<Record<ViewKind, { xref: string; reveal: boolean; fact: FactKey | null }>> = {};
  private parked: Record<ViewKind, boolean> = { graph: false, timeline: false, list: false };
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
    } else if (kind === "timeline") {
      this.showTimeline(index, memory.timeline, around, restore);
    } else {
      this.showList(index, memory.list);
    }
    this.boardOf(kind)?.resized();
    const wanted = this.pending[kind];
    if (wanted !== undefined && (restore || this.displayed())) {
      delete this.pending[kind];
      this.selectOn(kind, wanted.xref, wanted.reveal || (kind === "list" && restore), wanted.fact);
    }
    if (JSON.stringify(this.kept[kind]) !== before) {
      this.host.changed();
    }
  }

  /** Never fails and never needs a board: kept until one is drawn and shown, and moving only where a gesture that asked for it set it. */
  select(kind: ViewKind, xref: string | null, reveal: boolean, fact: FactKey | null = null): void {
    if (xref === null) {
      delete this.pending[kind];
      this.boardOf(kind)?.select(null, false);
      return;
    }
    if (this.shownKind === kind && this.displayed()) {
      delete this.pending[kind];
      this.selectOn(kind, xref, reveal, fact);
      return;
    }
    const held = this.pending[kind];
    this.pending[kind] = { xref, reveal: reveal || (held?.xref === xref && held.reveal), fact };
  }

  private selectOn(kind: ViewKind, xref: string, reveal: boolean, fact: FactKey | null): void {
    const board = this.boardOf(kind);
    if (board instanceof ListBoard) {
      board.select(xref, reveal, fact);
    } else {
      board?.select(xref, reveal);
    }
  }

  /** Opens the search of a drawn board and focuses it, or only focuses it where it is open. */
  openSearch(kind: ViewKind): void {
    const board = this.boardOf(kind);
    if (board instanceof ListBoard) {
      board.focusFilter();
    } else {
      board?.openSearch();
    }
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
      ...(this.kept.list ? { list: { ...this.kept.list } } : {}),
    };
  }

  /** Another file: no board, no memory. */
  reset(): void {
    this.parkOthers(null);
    for (const kind of KINDS) {
      this.roots[kind]?.remove();
      delete this.roots[kind];
    }
    this.list?.dispose();
    this.graph = null;
    this.timeline = null;
    this.list = null;
    this.listScroll = undefined;
    this.kept = {};
    this.pending = {};
    this.parked = { graph: false, timeline: false, list: false };
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

  private showList(index: GenealogyIndex, saved: ListState | undefined): void {
    const board = (this.list ??= this.makeList());
    board.show(index, saved ?? this.kept.list ?? {});
    this.kept.list = board.state();
    if (this.listScroll !== undefined && board.scroll() !== this.listScroll) {
      board.setScroll(this.listScroll);
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
      if (board instanceof FileGraphBoard) {
        board.cancelHover();
      } else if (board instanceof FileTimelineBoard) {
        board.unlight();
      }
      if (kind === "timeline" && this.timeline && this.kept.timeline && this.shownKind === kind) {
        this.kept.timeline = { ...this.kept.timeline, scroll: this.timeline.scroll() };
      }
      if (kind === "list" && this.list && this.shownKind === kind && this.displayed()) {
        this.listScroll = this.list.scroll();
      }
      if (this.shownKind === kind) {
        this.parked[kind] = true;
      }
      root.toggle(false);
    }
  }

  private boardOf(kind: ViewKind): FileGraphBoard | FileTimelineBoard | ListBoard | null {
    return kind === "graph" ? this.graph : kind === "timeline" ? this.timeline : this.list;
  }

  private rootOf(kind: ViewKind): HTMLElement {
    return (this.roots[kind] ??= this.parent.createDiv({ cls: `gedcom-views-root is-${kind}` }));
  }

  private makeGraph(): FileGraphBoard {
    return new FileGraphBoard(this.rootOf("graph"), {
      select: (xref) => this.host.select(xref),
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
      select: (xref) => this.host.select(xref),
      showInSource: (range) => this.host.showInSource(range),
      scopeChanged: (scope) => {
        const scroll = this.kept.timeline?.scroll;
        this.kept.timeline = { ...scope, ...(scroll ? { scroll } : {}) };
        this.host.changed();
      },
      setIcon: (element, icon) => this.host.setIcon(element, icon),
    });
  }

  private makeList(): ListBoard {
    return new ListBoard(this.rootOf("list"), {
      select: (xref) => this.host.select(xref),
      selectEvent: (xref, fact) => this.host.selectEvent(xref, fact),
      changed: (state) => {
        this.kept.list = state;
        this.host.changed();
      },
      scrolled: (top) => {
        this.listScroll = top;
      },
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      coarsePointer: () => this.host.coarsePointer(),
    });
  }
}
