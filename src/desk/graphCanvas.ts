import { plural, t } from "../i18n";
import { cardShape, nameMeasure, svg } from "./cardRender";
import { floatingDock, HoverDelay, placeInside, prefersReducedMotion, zoomControls } from "./dom";
import { CARD, type FileGraphLayout, type GraphCard, type Point } from "./fileGraph";
import { beginMotion, runMotion } from "./graphMotion";
import { GraphInput } from "./graphInput";
import { buildItems, type Item } from "./sceneItems";

export { polyline, fitText } from "./cardRender";

export const ZOOM = { min: 0.05, max: 3, fit: 1.4, readable: 0.6, opens: 0.55, far: 0.5 } as const;
const MARGIN = 20;
const BUTTON_STEP = 1.2;
const GLIDE_MS = 400;
const GLIDE_REACH = 2.5;

/** Where the view looks: the graph point at the centre of the canvas, and the scale. */
export interface GraphView {
  x: number;
  y: number;
  k: number;
}

/** The part of the graph in view, in graph coordinates. */
export interface GraphWindow {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface CanvasCard {
  name: string;
  years: string;
  paint: string;
  focus?: boolean;
  branch?: boolean;
  /** Set where the name has both, each then on its own line. */
  given?: string;
  surname?: string;
}

export interface CanvasFamily {
  couple: string;
  date?: string;
  place?: string;
  children: number;
}

/** What is drawn: a layout, and what each of its cards and family nodes says. */
export interface CanvasScene {
  layout: FileGraphLayout;
  card(id: string): CanvasCard | undefined;
  family(id: string): CanvasFamily | undefined;
  /** The branch of a person: the cards lit with theirs. */
  branch(id: string): ReadonlySet<string>;
  /** Every card its person stands on, this one among them. */
  copies?(id: string): Iterable<string>;
  /** What a search reads of a card. */
  search?(id: string): string;
}

export interface GraphCanvasHost {
  activateCard(id: string, keyboard: boolean): void;
  activateFamily(id: string): void;
  branch?(id: string): void;
  viewChanged(view: GraphView): void;
}

/** How the view is first set once the canvas has a size: as saved, as a new view opens, or on a card. */
export type Opening =
  | { saved: GraphView }
  /**
   * `near`: cards of which one, at least, the opening should bring into view
   * with the card it opens on. `fits`: the least scale at which it opens fitted.
   */
  | { open: string | undefined; near?: string[]; fits?: number }
  | { centre: string | undefined; k?: number };

export interface GraphCanvasOptions {
  /** Obsidian's; where none is handed in, the buttons carry a sign. */
  setIcon?(element: HTMLElement, icon: string): void;
}

/** The cards a family joins, each lit with the others: spouses with spouses and children, children with parents. */
export function relatedIn(layout: FileGraphLayout, families: Iterable<{ id: string; spouses: string[]; children: string[] }>): (id: string) => Set<string> {
  const near = new Map<string, Set<string>>();
  const join = (one: string, other: string): void => {
    near.set(one, (near.get(one) ?? new Set([one])).add(other));
  };
  for (const family of families) {
    const spouses = family.spouses.filter((id) => layout.card.has(id));
    const children = family.children.filter((id) => layout.card.has(id));
    for (const spouse of spouses) {
      for (const other of [...spouses, ...children]) {
        join(spouse, other);
        join(other, spouse);
      }
    }
  }
  return (id) => near.get(id) ?? new Set([id]);
}

let canvases = 0;

/**
 * A layout drawn for the window it is handed and one window around it, a
 * quarter far out, moved by dragging, the wheel and pinching. Hovering and
 * searching only change classes on what is drawn.
 */
export class GraphCanvas {
  readonly el: HTMLElement;
  private readonly doc: Document;
  private readonly id = (canvases += 1);
  private readonly svgEl: SVGSVGElement;
  private readonly viewEl: SVGGElement;
  private readonly linesEl: SVGGElement;
  private readonly itemsEl: SVGGElement;
  private readonly tip: HTMLElement;
  private readonly pop: HTMLElement;

  private scene: CanvasScene | null = null;
  private layout: FileGraphLayout | null = null;
  private lineItems: Item[] = [];
  private placedItems: Item[] = [];
  private readonly drawn = new Map<Item, SVGElement>();
  private drawnWindow: GraphWindow | null = null;
  private drawnFar = false;
  private cardOf = new Map<string, Element>();
  private lit: Element[] = [];
  private highlighted: string | null = null;
  private armed: string | null = null;
  private query = "";
  private matches: string[] = [];
  private match = -1;
  private current: string | null = null;
  private selected: string | null = null;
  private selectedIds = new Set<string>();
  private size = { width: 0, height: 0 };
  private transform: { x: number; y: number; k: number } | null = null;
  private glideTimer: number | null = null;
  private pending: Opening | null = null;
  private frame = false;
  private refocusing = false;
  private wantsFocus: string | null = null;
  private readonly hover: HoverDelay<string>;
  readonly dock: HTMLElement;
  private readonly measureName: (text: string) => number;
  private readonly input: GraphInput;

  /** The canvas joins `root` where it stands; its tooltip and popover are placed inside `root`. */
  constructor(
    private readonly root: HTMLElement,
    private readonly host: GraphCanvasHost,
    private readonly options: GraphCanvasOptions = {},
  ) {
    this.doc = root.ownerDocument;
    this.measureName = nameMeasure(root);
    this.el = root.createDiv({ cls: "gedcom-fg-canvas" });
    this.input = new GraphInput({
      el: this.el,
      transform: () => this.transform,
      apply: (at) => this.apply(at),
      stopGlide: () => this.stopGlide(),
      zoomAt: (factor, cx, cy) => this.zoomAt(factor, cx, cy),
      panBy: (dx, dy) => this.panBy(dx, dy),
      hideTip: () => this.hideTip(),
      onControls: (target) => this.onControls(target),
      hovered: (event) => {
        this.hover.rest(this.personAt(event.target), this.highlighted);
        const family = this.nodeAt(event.target);
        if (family !== null) {
          this.showTip(family, event);
        } else {
          this.hideTip();
        }
      },
      left: () => {
        this.hover.rest(null, this.highlighted);
        this.hideTip();
      },
    });
    this.dock = floatingDock(this.el, "gedcom-fg");
    zoomControls(this.dock, "gedcom-fg", this.options.setIcon && ((element, icon) => this.options.setIcon?.(element, icon)), {
      out: () => this.zoomBy(1 / BUTTON_STEP),
      in: () => this.zoomBy(BUTTON_STEP),
      fit: () => this.fit(),
    });
    this.svgEl = svg(this.doc, "svg", "gedcom-fg-svg");
    this.viewEl = svg(this.doc, "g", "gedcom-fg-view");
    this.linesEl = svg(this.doc, "g", "gedcom-fg-lines");
    this.itemsEl = svg(this.doc, "g", "gedcom-fg-items");
    this.viewEl.append(this.linesEl, this.itemsEl);
    this.viewEl.addEventListener("transitionend", (event) => {
      if (event.target === this.viewEl) {
        this.endGlide();
      }
    });
    this.svgEl.append(this.viewEl);
    this.el.append(this.svgEl);
    this.tip = root.createDiv({ cls: "gedcom-fg-tip", attr: { role: "tooltip", id: `gedcom-fg-tip-${this.id}` } });
    this.pop = root.createDiv({ cls: "gedcom-fg-pop" });
    this.hover = new HoverDelay(this.doc.defaultView ?? window, (id) => this.highlight(id));
    this.listen();
  }

  /** Draws a new scene; `opening` sets the view once the canvas has a size, else the view is kept. */
  show(scene: CanvasScene, opening: Opening | null): void {
    if (opening) {
      this.pending = opening;
    }
    const active = this.doc.activeElement;
    const kept = active && this.el.contains(active)
      ? { id: this.personAt(active), pill: active.hasAttribute("data-branch") }
      : null;
    const motion = opening && "centre" in opening ? beginMotion(this.doc, this.layout, this.drawn, scene.layout) : null;
    this.scene = scene;
    this.layout = scene.layout;
    this.markSelectedIds();
    this.arm(null);
    const built = buildItems(scene, this.doc, (card, far) =>
      cardShape(this.doc, card.placed, card.shown, far, {
        dim: this.misses(card.placed.id),
        armed: card.placed.id === this.armed,
        current: card.placed.id === this.current,
        selected: this.selectedIds.has(card.placed.id),
        measure: this.measureName,
      }),
    );
    this.placedItems = built.placed;
    this.lineItems = built.lines;
    const leaving = new Set(motion?.ghosts);
    for (const element of this.drawn.values()) {
      if (!leaving.has(element)) {
        element.remove();
      }
    }
    this.drawn.clear();
    this.drawnWindow = null;
    if (this.highlighted !== null && !scene.layout.card.has(this.highlighted)) {
      this.highlighted = null;
    }
    this.setQuery(this.query);
    this.settle();
    this.redrawIfNeeded();
    if (motion) {
      runMotion(motion, this.drawn, scene.layout);
    }
    if (kept?.id) {
      this.refocus(this.cardOf.get(kept.id), kept.pill);
    }
  }

  resized(size?: { width: number; height: number }): void {
    const next = size ?? { width: this.el.clientWidth, height: this.el.clientHeight };
    if (next.width <= 0 || next.height <= 0) {
      return;
    }
    this.size = next;
    this.settle();
    this.redrawIfNeeded();
  }

  view(): GraphView | null {
    const at = this.transform;
    if (!at) {
      return null;
    }
    return { x: (this.size.width / 2 - at.x) / at.k, y: (this.size.height / 2 - at.y) / at.k, k: at.k };
  }

  windowOf(): GraphWindow | null {
    const at = this.transform;
    if (!at) {
      return null;
    }
    return {
      left: -at.x / at.k,
      top: -at.y / at.k,
      right: (this.size.width - at.x) / at.k,
      bottom: (this.size.height - at.y) / at.k,
    };
  }

  needsDraw(window: GraphWindow): boolean {
    const drawn = this.drawnWindow;
    return (
      drawn === null ||
      this.far() !== this.drawnFar ||
      window.left < drawn.left ||
      window.top < drawn.top ||
      window.right > drawn.right ||
      window.bottom > drawn.bottom
    );
  }

  draw(window: GraphWindow, around?: number): void {
    if (!this.layout) {
      return;
    }
    const far = this.far();
    const width = window.right - window.left;
    const height = window.bottom - window.top;
    const margin = around ?? (far ? 0.25 : 1);
    const range: GraphWindow = {
      left: window.left - width * margin,
      top: window.top - height * margin,
      right: window.right + width * margin,
      bottom: window.bottom + height * margin,
    };
    const active = this.doc.activeElement;
    const focused = active ? this.itemOf(active) : null;
    const focusedPill = active?.hasAttribute("data-branch") ?? false;
    if (far !== this.drawnFar) {
      for (const element of this.drawn.values()) {
        element.remove();
      }
      this.drawn.clear();
    }
    this.drawnFar = far;
    this.drawnWindow = range;
    const inRange = (item: Item): boolean =>
      item === focused ||
      (item.right >= range.left && item.left <= range.right && item.bottom >= range.top && item.top <= range.bottom);
    this.place(this.lineItems, this.linesEl, inRange, far);
    this.place(this.placedItems, this.itemsEl, inRange, far);
    this.mapDrawn();
    for (const element of this.lit) {
      element.classList.remove("is-on", "is-hl");
    }
    this.lit = [];
    this.highlight(this.highlighted, true);
    if (focused) {
      this.refocus(this.drawn.get(focused), focusedPill);
    }
    const wanted = this.wantsFocus === null ? undefined : this.cardOf.get(this.wantsFocus);
    if (wanted) {
      this.wantsFocus = null;
      this.refocus(wanted, false);
    }
  }

  private refocus(element: Element | undefined, pill: boolean): void {
    const target = pill ? element?.querySelector<SVGElement>("[data-branch]") : this.focusTarget(element);
    if (target && target !== this.doc.activeElement) {
      this.refocusing = true;
      try {
        target.focus({ preventScroll: true });
      } finally {
        this.refocusing = false;
      }
    }
  }

  /** Stops a light the pointer has asked for and not yet waited out, as a view closes. */
  cancelHover(): void {
    this.hover.cancel();
  }

  highlight(id: string | null, force = false): void {
    this.hover.cancel();
    if (id === this.highlighted && !force) {
      return;
    }
    this.highlighted = id;
    for (const element of this.lit) {
      element.classList.remove("is-on", "is-hl");
    }
    this.lit = [];
    const scene = this.scene;
    const shown = id !== null && scene !== null && scene.layout.card.has(id);
    this.svgEl.classList.toggle("has-hl", shown);
    if (!shown || id === null || !scene) {
      return;
    }
    const light = (element: Element, self: boolean): void => {
      element.classList.add("is-on");
      if (self) {
        element.classList.add("is-hl");
      }
      this.lit.push(element);
    };
    const selves = new Set(scene.copies?.(id) ?? [id]);
    const branch: ReadonlySet<string> =
      selves.size === 1 ? scene.branch([...selves][0] ?? id) : new Set([...selves].flatMap((self) => [...scene.branch(self)]));
    for (const member of branch) {
      const card = this.cardOf.get(member);
      if (card && !card.classList.contains("is-on")) {
        light(card, selves.has(member));
      }
    }
  }

  hasCard(id: string): boolean {
    return this.layout?.card.has(id) ?? false;
  }

  /** Marks the person's cards as selected until another is, and centres on them only where `reveal` says so; a card not drawn shows the mark once it is. */
  select(id: string | null, reveal: boolean): void {
    this.selected = id;
    this.markSelectedIds();
    for (const [one, element] of this.cardOf) {
      element.classList.toggle("is-selected", this.selectedIds.has(one));
    }
    if (id === null || !reveal) {
      return;
    }
    const k = this.transform && this.transform.k >= ZOOM.far ? this.transform.k : ZOOM.readable;
    if (this.transform && this.size.width > 0) {
      this.centreOn(id, k, true);
    } else {
      this.pending = { centre: id, k };
    }
  }

  private markSelectedIds(): void {
    this.selectedIds = new Set(
      this.selected === null ? [] : (this.scene?.copies?.(this.selected) ?? [this.selected]),
    );
  }

  /** Gives a card the keyboard's focus without moving the view to it, now or once it is drawn. */
  focusCard(id: string): void {
    const card = this.cardOf.get(id);
    if (card) {
      this.refocus(card, false);
      return;
    }
    this.wantsFocus = id;
  }

  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
    this.match = -1;
    this.current = null;
    this.matches =
      this.query === "" || !this.layout
        ? []
        : this.layout.cards.map((card) => card.id).filter((id) => !this.misses(id));
    for (const [id, element] of this.cardOf) {
      element.classList.toggle("is-dim", this.misses(id));
      element.classList.remove("is-current");
    }
  }

  matchInfo(): { index: number; total: number } {
    return { index: this.match, total: this.matches.length };
  }

  private onControls(target: EventTarget | null): boolean {
    return target instanceof Element && target.closest(".gedcom-fg-dock") !== null;
  }

  stepMatch(by: 1 | -1): string | null {
    if (this.matches.length === 0) {
      return null;
    }
    const total = this.matches.length;
    this.match = this.match < 0 ? (by > 0 ? 0 : total - 1) : (this.match + by + total) % total;
    const id = this.matches[this.match] ?? null;
    this.current = id;
    for (const [one, element] of this.cardOf) {
      element.classList.toggle("is-current", one === id);
    }
    if (id !== null) {
      const k = this.transform && this.transform.k >= ZOOM.far ? this.transform.k : ZOOM.readable;
      this.highlight(id);
      this.centreOn(id, k, true);
    }
    return id;
  }

  zoomAt(factor: number, cx: number, cy: number, glide = false): void {
    if (!glide) {
      this.stopGlide();
    }
    const at = this.transform;
    if (!at) {
      return;
    }
    const k = Math.max(ZOOM.min, Math.min(ZOOM.max, at.k * factor));
    this.apply({ x: cx - ((cx - at.x) * k) / at.k, y: cy - ((cy - at.y) * k) / at.k, k }, glide);
  }

  zoomBy(factor: number): void {
    this.zoomAt(factor, this.size.width / 2, this.size.height / 2, true);
  }

  fit(glide = true): void {
    const layout = this.layout;
    if (!layout || this.size.width <= 0) {
      return;
    }
    const k = this.fitScale(layout);
    this.apply(
      {
        x: this.size.width / 2 - (layout.width / 2) * k,
        y: this.size.height / 2 - (layout.height / 2) * k,
        k,
      },
      glide,
    );
  }

  panBy(dx: number, dy: number): void {
    this.stopGlide();
    const at = this.transform;
    if (at) {
      this.apply({ x: at.x + dx, y: at.y + dy, k: at.k });
    }
  }

  private fitScale(layout: FileGraphLayout): number {
    const k = Math.min(
      ZOOM.fit,
      (this.size.width - 2 * MARGIN) / Math.max(layout.width, 1),
      (this.size.height - 2 * MARGIN) / Math.max(layout.height, 1),
    );
    return Math.max(ZOOM.min, k);
  }

  private centreOn(id: string | undefined, k: number, glide = false): boolean {
    const card = id === undefined ? undefined : this.layout?.card.get(id);
    if (!card) {
      return false;
    }
    this.apply(
      {
        x: this.size.width / 2 - (card.x + CARD.width / 2) * k,
        y: this.size.height / 2 - (card.y + card.height / 2) * k,
        k,
      },
      glide,
    );
    return true;
  }

  private settle(): void {
    const layout = this.layout;
    const pending = this.pending;
    if (!layout || !pending || this.size.width <= 0 || this.size.height <= 0) {
      return;
    }
    this.pending = null;
    if ("saved" in pending) {
      const { x, y, k } = pending.saved;
      this.apply({ x: this.size.width / 2 - x * k, y: this.size.height / 2 - y * k, k });
      return;
    }
    if ("centre" in pending) {
      if (!this.centreOn(pending.centre, pending.k ?? ZOOM.readable, this.transform !== null) && !this.transform) {
        this.fit(false);
      }
      return;
    }
    if (this.fitScale(layout) >= (pending.fits ?? ZOOM.opens)) {
      this.fit();
      return;
    }
    if (pending.open !== undefined && pending.near && pending.near.length > 0 && this.openNear(pending.open, pending.near)) {
      return;
    }
    const first = layout.cards[0]?.id;
    for (const id of [pending.open, layout.focus ?? undefined, first]) {
      if (this.centreOn(id, ZOOM.readable)) {
        return;
      }
    }
    this.fit();
  }

  /** Centred on a card where one of `near` is then in view, else between it and the nearest, zoomed out as far as `far` to show both. */
  private openNear(id: string, near: string[]): boolean {
    const layout = this.layout;
    const from = layout?.card.get(id);
    if (!layout || !from) {
      return false;
    }
    const centre = (card: GraphCard): Point => [card.x + CARD.width / 2, card.y + card.height / 2];
    const [fx, fy] = centre(from);
    const room = (k: number): [number, number] => [(this.size.width - 2 * MARGIN) / k, (this.size.height - 2 * MARGIN) / k];
    const [w, h] = room(ZOOM.readable);
    let nearest: GraphCard | undefined;
    let distance = Infinity;
    for (const other of near) {
      const card = layout.card.get(other);
      if (!card) {
        continue;
      }
      const [x, y] = centre(card);
      if (Math.abs(x - fx) + CARD.width / 2 <= w / 2 && Math.abs(y - fy) + card.height / 2 <= h / 2) {
        return this.centreOn(id, ZOOM.readable);
      }
      const apart = Math.abs(x - fx);
      if (apart < distance) {
        distance = apart;
        nearest = card;
      }
    }
    if (!nearest) {
      return false;
    }
    const [nx, ny] = centre(nearest);
    const span = Math.abs(nx - fx) + CARD.width;
    const tall = Math.abs(ny - fy) + (from.height + nearest.height) / 2;
    const k = Math.max(
      ZOOM.far,
      Math.min(ZOOM.readable, (this.size.width - 2 * MARGIN) / span, (this.size.height - 2 * MARGIN) / tall),
    );
    this.apply({ x: this.size.width / 2 - ((fx + nx) / 2) * k, y: this.size.height / 2 - ((fy + ny) / 2) * k, k });
    return true;
  }

  /**
   * A move the reader did not drag glides by a CSS transition, unless they ask for reduced motion or
   * the move is longer than a glide can show without a streak, which jumps as a drag does.
   */
  private apply(at: { x: number; y: number; k: number }, glide = false): void {
    const from = this.visibleTransform() ?? this.transform;
    const gliding = glide && from !== null && !prefersReducedMotion(this.doc) && this.glides(from, at);
    this.transform = at;
    if (gliding && from) {
      this.drawBetween(from, at);
      this.beginGlide();
    } else {
      this.endGlide();
    }
    this.viewEl.style.transform = `translate(${at.x}px, ${at.y}px) scale(${at.k})`;
    this.root.toggleClass("is-far", this.far());
    this.closePop();
    this.scheduleDraw();
    const view = this.view();
    if (view) {
      this.host.viewChanged(view);
    }
  }

  private glides(from: { x: number; y: number }, to: { x: number; y: number }): boolean {
    return (
      this.size.width > 0 &&
      Math.abs(to.x - from.x) <= GLIDE_REACH * this.size.width &&
      Math.abs(to.y - from.y) <= GLIDE_REACH * this.size.height
    );
  }

  /** Both ends of a glide are drawn before it starts, and stay, so nothing appears in the middle of it. */
  private drawBetween(from: { x: number; y: number; k: number }, to: { x: number; y: number; k: number }): void {
    const [a, b] = [from, to].map((at) => ({
      left: -at.x / at.k,
      top: -at.y / at.k,
      right: (this.size.width - at.x) / at.k,
      bottom: (this.size.height - at.y) / at.k,
    }));
    if (a && b) {
      this.draw(
        {
          left: Math.min(a.left, b.left),
          top: Math.min(a.top, b.top),
          right: Math.max(a.right, b.right),
          bottom: Math.max(a.bottom, b.bottom),
        },
        0.25,
      );
    }
  }

  private beginGlide(): void {
    this.viewEl.classList.add("is-gliding");
    this.clearGlideTimer();
    this.glideTimer = (this.doc.defaultView ?? window).setTimeout(() => this.endGlide(), GLIDE_MS + 150);
  }

  private endGlide(): void {
    this.viewEl.classList.remove("is-gliding");
    this.clearGlideTimer();
  }

  private clearGlideTimer(): void {
    if (this.glideTimer !== null) {
      (this.doc.defaultView ?? window).clearTimeout(this.glideTimer);
      this.glideTimer = null;
    }
  }

  /** Where the view is drawn right now, which is between where it was and where it goes while it glides. */
  private visibleTransform(): { x: number; y: number; k: number } | null {
    if (!this.viewEl.classList.contains("is-gliding")) {
      return this.transform;
    }
    const matrix = this.doc.defaultView?.getComputedStyle(this.viewEl).transform ?? "";
    const parts = /^matrix\(([^)]+)\)$/.exec(matrix)?.[1]?.split(",").map(Number);
    const [a, , , , e, f] = parts ?? [];
    return a !== undefined && e !== undefined && f !== undefined && [a, e, f].every(Number.isFinite)
      ? { x: e, y: f, k: a }
      : this.transform;
  }

  /** A drag, the wheel or a key takes over from a glide at the place it has reached, with no jump. */
  private stopGlide(): void {
    if (!this.viewEl.classList.contains("is-gliding")) {
      return;
    }
    const at = this.visibleTransform();
    this.endGlide();
    if (at) {
      this.transform = at;
      this.viewEl.style.transform = `translate(${at.x}px, ${at.y}px) scale(${at.k})`;
      this.scheduleDraw();
    }
  }

  private far(): boolean {
    return (this.transform?.k ?? 1) < ZOOM.far;
  }

  private scheduleDraw(): void {
    if (this.frame) {
      return;
    }
    this.frame = true;
    (this.doc.defaultView ?? window).requestAnimationFrame(() => {
      this.frame = false;
      this.redrawIfNeeded();
    });
  }

  private redrawIfNeeded(): void {
    const window = this.windowOf();
    if (window && this.needsDraw(window)) {
      this.draw(window);
    }
  }

  private place(items: Item[], layer: SVGGElement, inRange: (item: Item) => boolean, far: boolean): void {
    let previous: SVGElement | null = null;
    for (const item of items) {
      const held = this.drawn.get(item);
      if (!inRange(item)) {
        if (held) {
          held.remove();
          this.drawn.delete(item);
        }
        continue;
      }
      if (held) {
        previous = held;
        continue;
      }
      const element = item.make(far);
      if (previous) {
        previous.after(element);
      } else {
        layer.prepend(element);
      }
      this.drawn.set(item, element);
      previous = element;
    }
  }

  private mapDrawn(): void {
    this.cardOf = new Map();
    for (const [item, element] of this.drawn) {
      if (item.kind === "card") {
        this.cardOf.set(item.id, element);
      }
    }
  }

  private itemOf(element: Element): Item | null {
    const holder = element.closest("[data-p], .gedcom-fg-family");
    if (!holder) {
      return null;
    }
    for (const [item, drawn] of this.drawn) {
      if (drawn === holder) {
        return item;
      }
    }
    return null;
  }

  private focusTarget(element: Element | undefined): SVGElement | null {
    return element?.querySelector<SVGElement>("[data-card], [data-node]") ?? null;
  }

  private misses(id: string): boolean {
    return this.query !== "" && !(this.scene?.search?.(id) ?? "").includes(this.query);
  }

  private personAt(target: EventTarget | null): string | null {
    const found = target instanceof Element ? target.closest("[data-p]") : null;
    return found?.getAttribute("data-p") ?? null;
  }

  private nodeAt(target: EventTarget | null): string | null {
    const found = target instanceof Element ? target.closest("[data-node]") : null;
    return found?.getAttribute("data-node") ?? null;
  }

  private listen(): void {
    this.input.listen();
    this.el.addEventListener("click", (event) => {
      if (!this.onControls(event.target)) {
        this.activate(event, false);
      }
    });
    this.el.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      const target = event.target instanceof Element ? event.target : null;
      if (!target?.closest("[data-card], [data-branch], [data-node]")) {
        return;
      }
      event.preventDefault();
      this.activate(event, true);
    });
    this.el.addEventListener("focusin", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }
      if (!this.refocusing) {
        this.bringIntoView(target);
      }
      const id = this.personAt(target);
      if (id !== null) {
        this.highlight(id);
      }
      const family = this.nodeAt(target);
      if (family !== null) {
        const box = target.getBoundingClientRect();
        this.showTip(family, { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 });
      }
    });
    this.el.addEventListener("focusout", (event) => {
      this.hideTip();
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (this.refocusing || (next && this.el.contains(next) && this.personAt(next) !== null)) {
        return;
      }
      if (this.armed === null) {
        this.highlight(null);
      }
    });
    this.root.addEventListener("click", (event) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && !this.pop.contains(target) && !this.el.contains(target)) {
        this.closePop();
      }
    });
  }

  private activate(event: MouseEvent | KeyboardEvent, keyboard: boolean): void {
    if (!keyboard && this.input.swallows()) {
      event.stopPropagation();
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    // A click from the keyboard has no pointer, and is no touch whatever pointer came before it.
    const kind = keyboard
      ? "keyboard"
      : (event as PointerEvent).pointerType || ((event as MouseEvent).detail === 0 ? "keyboard" : this.input.pointer);
    const touch = kind === "touch";
    const branch = target?.closest("[data-branch]")?.getAttribute("data-branch");
    if (branch && (!touch || this.armed === branch)) {
      this.closePop();
      this.host.branch?.(branch);
      return;
    }
    const family = this.nodeAt(target);
    if (family !== null) {
      if (touch) {
        this.arm(null);
        this.openPop(family, event as MouseEvent);
      } else {
        this.host.activateFamily(family);
      }
      return;
    }
    this.closePop();
    const id = this.personAt(target);
    if (id === null) {
      if (touch) {
        this.arm(null);
        this.highlight(null);
      }
      return;
    }
    if (touch && this.armed !== id) {
      this.arm(id);
      this.highlight(id);
      return;
    }
    this.arm(null);
    this.host.activateCard(id, kind === "keyboard");
  }

  private arm(id: string | null): void {
    if (this.armed !== null) {
      this.cardOf.get(this.armed)?.classList.remove("is-armed");
    }
    this.armed = id;
    if (id !== null) {
      this.cardOf.get(id)?.classList.add("is-armed");
    }
  }

  private bringIntoView(target: Element): void {
    const item = this.itemOf(target);
    const window = this.windowOf();
    const at = this.transform;
    if (!item || !window || !at) {
      return;
    }
    const pad = MARGIN / at.k;
    let dx = 0;
    let dy = 0;
    if (item.left - pad < window.left) {
      dx = window.left - (item.left - pad);
    } else if (item.right + pad > window.right) {
      dx = window.right - (item.right + pad);
    }
    if (item.top - pad < window.top) {
      dy = window.top - (item.top - pad);
    } else if (item.bottom + pad > window.bottom) {
      dy = window.bottom - (item.bottom + pad);
    }
    if (dx !== 0 || dy !== 0) {
      this.panBy(dx * at.k, dy * at.k);
    }
  }

  private describe(parent: HTMLElement, id: string): void {
    const family = this.scene?.family(id);
    if (!family) {
      return;
    }
    parent.createDiv({ cls: "gedcom-fg-tip-what", text: family.couple });
    const when = parent.createDiv({
      cls: "gedcom-fg-tip-when",
      text: family.date ? t("fileGraph.married", { date: family.date }) : t("fileGraph.noDate"),
    });
    if (family.place) {
      when.createSpan({ cls: "gedcom-fg-tip-where", text: ` · ${family.place}` });
    }
    parent.createDiv({ cls: "gedcom-fg-tip-where", text: plural("fileGraph.children", family.children) });
  }

  private showTip(id: string, point: { clientX: number; clientY: number }): void {
    this.tip.empty();
    this.describe(this.tip, id);
    this.tip.addClass("is-shown");
    placeInside(this.root, this.tip, point);
  }

  private hideTip(): void {
    this.tip.removeClass("is-shown");
  }

  private openPop(id: string, event: MouseEvent): void {
    this.hideTip();
    this.pop.empty();
    this.describe(this.pop, id);
    this.pop
      .createEl("button", { cls: "gedcom-fg-pop-open", text: t("fileGraph.openFamily"), attr: { type: "button" } })
      .addEventListener("click", () => {
        this.closePop();
        this.host.activateFamily(id);
      });
    this.pop.addClass("is-shown");
    placeInside(this.root, this.pop, event);
  }

  private closePop(): void {
    this.pop.removeClass("is-shown");
  }
}
