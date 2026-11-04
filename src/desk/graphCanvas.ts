import { plural, t } from "../i18n";
import type { MediaPreviewContent } from "../editor/media";
import { HoverDelay, placeInside } from "./dom";
import { CARD, marriageDigits, type FileGraphLayout, type GraphCard, type GraphNode, type Point } from "./fileGraph";
import { least, most, type Sex } from "./fileTimeline";
import { yearText } from "./labels";
import { drawPicture } from "./media";

export const ZOOM = { min: 0.05, max: 3, fit: 1.4, readable: 0.6, opens: 0.55, far: 0.5 } as const;
const MARGIN = 20;
const DRAG = 4;
const WHEEL_STEP = 1.12;
const TRACKPAD_DELTA = 40;
/** A wheel event this soon after the last one belongs to the same gesture. */
const GESTURE_GAP = 150;
const NAME_ROOM = 22;
const NAME_WIDTH = CARD.width - 2 * 6;
const AVATAR = { width: 36, height: 44 } as const;
const BUTTON_STEP = 1.2;

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
  sex: Sex;
  focus?: boolean;
  /** A sibling, or a run of them, beside the line a person's tree follows. */
  aside?: boolean;
  /** Cites no source anywhere in the record. */
  gap?: boolean;
  /** Has parents, or children, the drawing does not reach. */
  up?: boolean;
  down?: boolean;
  branch?: boolean;
  /** Set where the name has both, each then on its own line. */
  given?: string;
  surname?: string;
  /** Asked as the card is drawn, so only cards near the view load a picture. */
  portrait?(): PortraitContent | null;
}

export type PortraitContent = Extract<MediaPreviewContent, { kind: "image" }>;

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
  /** The cards lit with this one. */
  related(id: string): Iterable<string>;
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
  /** `near`: cards of which one, at least, the opening should bring into view with the card it opens on. */
  | { open: string | undefined; near?: string[] }
  | { centre: string | undefined; k?: number };

export interface GraphCanvasOptions {
  /** A two-finger scroll that would take the drawing past its top or bottom scrolls the page instead. */
  passEdges?: boolean;
  /** Obsidian's; where none is handed in, the buttons carry a sign. */
  setIcon?(element: HTMLElement, icon: string): void;
}

const SIGNS: Record<string, string> = { minus: "−", plus: "+", maximize: "⤢" };

const SVG = "http://www.w3.org/2000/svg";

function svg<K extends keyof SVGElementTagNameMap>(
  doc: Document,
  tag: K,
  cls: string | null,
  attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] {
  const node = doc.createElementNS(SVG, tag);
  if (cls) {
    node.setAttribute("class", cls);
  }
  for (const [name, value] of Object.entries(attrs)) {
    node.setAttribute(name, String(value));
  }
  return node;
}

/** Vertical where it leaves each point and where it arrives at the next. */
export function curve(points: readonly Point[]): string {
  const [first] = points;
  if (!first) {
    return "";
  }
  let d = `M${first[0]} ${first[1]}`;
  for (let at = 1; at < points.length; at += 1) {
    const [x0, y0] = points[at - 1] ?? first;
    const [x1, y1] = points[at] ?? first;
    const half = (y1 - y0) / 2;
    d += ` C${x0} ${y0 + half} ${x1} ${y1 - half} ${x1} ${y1}`;
  }
  return d;
}

/** The longest start of `text` that, with an ellipsis, `measure` says fits in `room`, cut between code points. */
export function fitText(text: string, room: number, measure: (text: string) => number): string {
  if (measure(text) <= room) {
    return text;
  }
  const points = Array.from(text);
  let low = 0;
  let high = points.length;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (measure(`${points.slice(0, middle).join("")}…`) <= room) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return `${points.slice(0, low).join("")}…`;
}

/** The width of a card's name in the font it is drawn in; by count of code points where no canvas can measure. */
function nameMeasure(root: HTMLElement): (text: string) => number {
  let context: CanvasRenderingContext2D | null | undefined;
  const widths = new Map<string, number>();
  return (text) => {
    if (context === undefined) {
      try {
        context = createEl("canvas").getContext("2d");
      } catch {
        context = null;
      }
      if (context) {
        const family = getComputedStyle(root).getPropertyValue("--font-interface").trim() || "sans-serif";
        context.font = `600 12px ${family}`;
      }
    }
    if (!context) {
      return (Array.from(text).length * NAME_WIDTH) / NAME_ROOM;
    }
    const known = widths.get(text);
    if (known !== undefined) {
      return known;
    }
    const width = context.measureText(text).width;
    widths.set(text, width);
    return width;
  };
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

type ItemKind = "card" | "node" | "line";

interface Item {
  kind: ItemKind;
  /** The card's id, or the family's of a node or a line. */
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The cards a highlight reaches it through. */
  people: string[];
  make(far: boolean): SVGElement;
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
  private reach = new Map<string, Element[]>();
  private lit: Element[] = [];
  private highlighted: string | null = null;
  private armed: string | null = null;
  private query = "";
  private matches: string[] = [];
  private match = -1;
  private size = { width: 0, height: 0 };
  private transform: { x: number; y: number; k: number } | null = null;
  private pending: Opening | null = null;
  private frame = false;
  private pointer = "mouse";
  private readonly down = new Map<number, { x: number; y: number }>();
  private drag: { id: number; x: number; y: number; vx: number; vy: number; moving: boolean } | null = null;
  private pinch: { distance: number; k: number; mid: Point; vx: number; vy: number } | null = null;
  private swallow = false;
  private refocusing = false;
  private wantsFocus: string | null = null;
  private readonly hover: HoverDelay<string>;
  private readonly controls: HTMLElement;
  private wheel: { at: number; pans: boolean } | null = null;
  private measureName: ((text: string) => number) | null = null;

  /** The canvas joins `root` where it stands; its tooltip and popover are placed inside `root`. */
  constructor(
    private readonly root: HTMLElement,
    private readonly host: GraphCanvasHost,
    private readonly options: GraphCanvasOptions = {},
  ) {
    this.doc = root.ownerDocument;
    this.el = root.createDiv({ cls: "gedcom-fg-canvas" });
    this.controls = this.el.createDiv({ cls: "gedcom-fg-controls" });
    this.zoomButtons();
    this.svgEl = svg(this.doc, "svg", "gedcom-fg-svg");
    this.viewEl = svg(this.doc, "g", "gedcom-fg-view");
    this.linesEl = svg(this.doc, "g", "gedcom-fg-lines");
    this.itemsEl = svg(this.doc, "g", "gedcom-fg-items");
    this.viewEl.append(this.linesEl, this.itemsEl);
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
    this.scene = scene;
    this.layout = scene.layout;
    this.arm(null);
    this.buildItems(scene);
    for (const element of this.drawn.values()) {
      element.remove();
    }
    this.drawn.clear();
    this.drawnWindow = null;
    if (this.highlighted !== null && !scene.layout.card.has(this.highlighted)) {
      this.highlighted = null;
    }
    this.setQuery(this.query);
    this.settle();
    this.redrawIfNeeded();
    if (kept?.id) {
      this.refocus(this.cardOf.get(kept.id), kept.pill);
    }
  }

  resized(size?: { width: number; height: number }): void {
    this.size = size ?? { width: this.el.clientWidth, height: this.el.clientHeight };
    if (this.size.width <= 0 || this.size.height <= 0) {
      return;
    }
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

  draw(window: GraphWindow): void {
    if (!this.layout) {
      return;
    }
    const far = this.far();
    const width = window.right - window.left;
    const height = window.bottom - window.top;
    const margin = far ? 0.25 : 1;
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

  /** −, + and Fit, floating over the canvas and first in its order for the keyboard. */
  private zoomButtons(): void {
    const button = (cls: string, label: string, icon: string, run: () => void): void => {
      const made = this.controls.createEl("button", {
        cls: ["clickable-icon", cls],
        attr: { type: "button", "aria-label": label, title: label },
      });
      if (this.options.setIcon) {
        this.options.setIcon(made, icon);
      } else {
        made.setText(SIGNS[icon] ?? icon);
      }
      made.addEventListener("click", run);
    };
    button("gedcom-fg-zoom-out", t("fileGraph.zoomOut"), "minus", () => this.zoomBy(1 / BUTTON_STEP));
    button("gedcom-fg-zoom-in", t("fileGraph.zoomIn"), "plus", () => this.zoomBy(BUTTON_STEP));
    button("gedcom-fg-fit", t("fileGraph.fit"), "maximize", () => this.fit());
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
    for (const self of selves) {
      for (const relative of scene.related(self)) {
        const card = this.cardOf.get(relative);
        if (card && !card.classList.contains("is-on")) {
          light(card, selves.has(relative));
        }
      }
      for (const element of this.reach.get(self) ?? []) {
        light(element, true);
      }
    }
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
    this.matches =
      this.query === "" || !this.layout
        ? []
        : this.layout.cards.map((card) => card.id).filter((id) => !this.misses(id));
    for (const [id, element] of this.cardOf) {
      element.classList.toggle("is-dim", this.misses(id));
    }
  }

  nextMatch(): string | null {
    if (this.matches.length === 0) {
      return null;
    }
    this.match = (this.match + 1) % this.matches.length;
    const id = this.matches[this.match] ?? null;
    if (id !== null) {
      const k = this.transform && this.transform.k >= ZOOM.far ? this.transform.k : ZOOM.readable;
      this.centreOn(id, k);
      this.highlight(id);
    }
    return id;
  }

  zoomAt(factor: number, cx: number, cy: number): void {
    const at = this.transform;
    if (!at) {
      return;
    }
    const k = Math.max(ZOOM.min, Math.min(ZOOM.max, at.k * factor));
    this.apply({ x: cx - ((cx - at.x) * k) / at.k, y: cy - ((cy - at.y) * k) / at.k, k });
  }

  zoomBy(factor: number): void {
    this.zoomAt(factor, this.size.width / 2, this.size.height / 2);
  }

  fit(): void {
    const layout = this.layout;
    if (!layout || this.size.width <= 0) {
      return;
    }
    const k = this.fitScale(layout);
    this.apply({
      x: this.size.width / 2 - (layout.width / 2) * k,
      y: this.size.height / 2 - (layout.height / 2) * k,
      k,
    });
  }

  panBy(dx: number, dy: number): void {
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

  private centreOn(id: string | undefined, k: number): boolean {
    const card = id === undefined ? undefined : this.layout?.card.get(id);
    if (!card) {
      return false;
    }
    this.apply({
      x: this.size.width / 2 - (card.x + CARD.width / 2) * k,
      y: this.size.height / 2 - (card.y + card.height / 2) * k,
      k,
    });
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
      if (!this.centreOn(pending.centre, pending.k ?? ZOOM.readable) && !this.transform) {
        this.fit();
      }
      return;
    }
    if (this.fitScale(layout) >= ZOOM.opens) {
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

  private apply(at: { x: number; y: number; k: number }): void {
    this.transform = at;
    this.viewEl.setAttribute("transform", `translate(${at.x},${at.y}) scale(${at.k})`);
    this.root.toggleClass("is-far", this.far());
    this.closePop();
    this.scheduleDraw();
    const view = this.view();
    if (view) {
      this.host.viewChanged(view);
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

  private buildItems(scene: CanvasScene): void {
    const { layout } = scene;
    const nodesAfter = new Map<string, GraphNode[]>();
    for (const node of layout.nodes) {
      const [first] = node.spouses;
      nodesAfter.set(first, [...(nodesAfter.get(first) ?? []), node]);
    }
    const near = new Map<string, string[]>();
    for (const line of layout.lines) {
      near.set(line.family, [...(near.get(line.family) ?? []), line.child]);
    }
    const placed: Item[] = [];
    for (const card of layout.cards) {
      const shown = scene.card(card.id);
      if (!shown) {
        continue;
      }
      placed.push({
        kind: "card",
        id: card.id,
        left: card.x,
        top: card.y - (shown.up ? 14 : 0),
        right: card.x + CARD.width,
        bottom: card.y + card.height + (shown.down ? 14 : 0),
        people: [card.id],
        make: (far) => this.cardShape(card, shown, far),
      });
      for (const node of nodesAfter.get(card.id) ?? []) {
        const family = scene.family(node.family);
        if (!family) {
          continue;
        }
        const xs = [node.x, ...node.joins.flat().map((point) => point[0])];
        const ys = [node.y, ...node.joins.flat().map((point) => point[1])];
        placed.push({
          kind: "node",
          id: node.family,
          left: least(xs) - 11,
          top: least(ys) - 11,
          right: most(xs) + 11,
          bottom: most(ys) + 11,
          people: [...node.spouses, ...(near.get(node.family) ?? [])],
          make: (far) => this.nodeShape(node, family, far),
        });
      }
    }
    this.placedItems = placed;
    this.lineItems = layout.lines.map((line) => {
      const xs = line.points.map((point) => point[0]);
      const ys = line.points.map((point) => point[1]);
      return {
        kind: "line" as const,
        id: line.family,
        left: least(xs),
        top: least(ys),
        right: most(xs),
        bottom: most(ys),
        people: [line.child, ...line.parents],
        make: () =>
          svg(this.doc, "path", "gedcom-fg-line", {
            d: curve(line.points),
            "data-f": line.family,
            "data-child": line.child,
          }),
      };
    });
  }

  private cardShape(placed: GraphCard, shown: CanvasCard, far: boolean): SVGElement {
    const { id, x, y, height } = placed;
    const { name, years } = shown;
    const text = height - CARD.height;
    const group = svg(this.doc, "g", `gedcom-fg-person is-${shown.sex.toLowerCase()}`, {
      "data-p": id,
      transform: `translate(${x},${y})`,
    });
    group.classList.toggle("is-focus", shown.focus === true);
    group.classList.toggle("is-aside", shown.aside === true);
    group.classList.toggle("is-dim", this.misses(id));
    group.classList.toggle("is-armed", id === this.armed);
    const card = svg(this.doc, "g", "gedcom-fg-card", {
      tabindex: 0,
      role: "button",
      "data-card": id,
      "aria-label": years ? `${name}, ${years}` : name,
    });
    const title = svg(this.doc, "title", null);
    title.textContent = name;
    card.append(
      title,
      svg(this.doc, "rect", "gedcom-fg-card-bg", { width: CARD.width, height, rx: 7 }),
    );
    if (shown.gap) {
      card.append(svg(this.doc, "circle", "gedcom-fg-card-gap", { cx: CARD.width - 9, cy: 9, r: 3 }));
    }
    group.append(card);
    const more = (up: boolean): void => {
      const mark = svg(this.doc, "text", `gedcom-fg-card-more ${up ? "is-up" : "is-down"}`, {
        x: CARD.width / 2,
        y: up ? -4 : height + 11,
        "text-anchor": "middle",
        "aria-label": t(up ? "tree.moreUp" : "tree.moreDown"),
      });
      mark.textContent = up ? "▲" : "▼";
      group.append(mark);
    };
    if (shown.up) {
      more(true);
    }
    if (shown.down) {
      more(false);
    }
    if (far) {
      return group;
    }
    if (text > 0) {
      this.avatar(card, shown);
    }
    this.measureName ??= nameMeasure(this.root);
    const line = (cls: string, at: number, content: string): void => {
      const written = svg(this.doc, "text", cls, { x: CARD.width / 2, y: text + at, "text-anchor": "middle" });
      written.textContent = fitText(content, NAME_WIDTH, this.measureName ?? ((one) => one.length));
      card.append(written);
    };
    if (shown.given && shown.surname) {
      line("gedcom-fg-card-name is-given", 18, shown.given);
      line("gedcom-fg-card-name is-surname", 33, shown.surname);
      line("gedcom-fg-card-years", 49, years);
    } else {
      line("gedcom-fg-card-name", 25, name);
      line("gedcom-fg-card-years", 41, years);
    }
    if (!shown.branch) {
      return group;
    }
    const pill = svg(this.doc, "g", "gedcom-fg-pill", {
      tabindex: 0,
      role: "button",
      "data-branch": id,
      "aria-pressed": String(shown.focus === true),
      "aria-label": t("fileGraph.branchOf", { name }),
    });
    const hint = svg(this.doc, "title", null);
    hint.textContent = t("overview.branchHint");
    const label = svg(this.doc, "text", null, { x: CARD.width - 29, y: height - 9, "text-anchor": "middle" });
    label.textContent = t("overview.branch");
    pill.append(
      hint,
      svg(this.doc, "rect", null, { x: CARD.width - 54, y: height - 20, width: 50, height: 15, rx: 7.5 }),
      label,
    );
    group.append(pill);
    return group;
  }

  /** The picture the card's person has, from the host, in the space above the name; none where it fails. */
  private avatar(card: SVGGElement, shown: CanvasCard): void {
    const content = shown.portrait?.() ?? null;
    if (!content) {
      return;
    }
    const holder = svg(this.doc, "foreignObject", "gedcom-fg-avatar-holder", {
      x: (CARD.width - AVATAR.width) / 2,
      y: 6,
      width: AVATAR.width,
      height: AVATAR.height,
    });
    const frame = this.doc.createElementNS("http://www.w3.org/1999/xhtml", "div") as HTMLDivElement;
    frame.className = "gedcom-desk-portrait gedcom-fg-avatar";
    holder.append(frame);
    const picture = drawPicture(frame, content, AVATAR.width, AVATAR.height);
    const image = picture.querySelector("img");
    image?.setAttribute("draggable", "false");
    image?.addEventListener("error", () => holder.remove());
    card.append(holder);
  }

  private nodeShape(node: GraphNode, family: CanvasFamily, far: boolean): SVGElement {
    const group = svg(this.doc, "g", `gedcom-fg-family is-${node.kind}`, { "data-f": node.family });
    for (const join of node.joins) {
      group.append(svg(this.doc, "path", "gedcom-fg-join", { d: curve(join) }));
    }
    const dated = node.year !== null;
    const digits = node.year === null ? "" : marriageDigits(node.year);
    const { couple } = family;
    const handle = svg(this.doc, "g", `gedcom-fg-node${dated ? "" : " is-undated"}`, {
      tabindex: 0,
      role: "button",
      "data-node": node.family,
      "aria-label":
        node.year === null
          ? t("fileGraph.nodeUndated", { couple })
          : t("fileGraph.nodeLabel", { couple, year: yearText(node.year) }),
    });
    handle.append(svg(this.doc, "circle", null, { cx: node.x, cy: node.y, r: dated ? 11 : 6 }));
    if (digits && !far) {
      const text = svg(this.doc, "text", "gedcom-fg-node-year", {
        x: node.x,
        y: node.y + 3.5,
        "text-anchor": "middle",
      });
      text.textContent = digits;
      handle.append(text);
    }
    group.append(handle);
    return group;
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
    this.reach = new Map();
    for (const [item, element] of this.drawn) {
      if (item.kind === "card") {
        this.cardOf.set(item.id, element);
        continue;
      }
      for (const id of item.people) {
        const held = this.reach.get(id) ?? [];
        held.push(element);
        this.reach.set(id, held);
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

  private local(event: { clientX: number; clientY: number }): Point {
    const box = this.el.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  }

  private listen(): void {
    const lift = (event: PointerEvent): void => {
      this.down.delete(event.pointerId);
      if (this.drag?.moving || this.pinch) {
        this.swallow = true;
      }
      if (this.drag?.id === event.pointerId || this.down.size === 0) {
        this.drag = null;
        this.el.removeClass("is-dragging");
      }
      if (this.down.size < 2) {
        this.pinch = null;
      }
    };
    this.el.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || (event.target instanceof Node && this.controls.contains(event.target))) {
        return;
      }
      this.pointer = event.pointerType || "mouse";
      this.swallow = false;
      this.down.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const at = this.transform;
      if (!at) {
        return;
      }
      if (this.down.size === 2) {
        const [one, other] = [...this.down.values()];
        if (one && other) {
          const mid = this.local({ clientX: (one.x + other.x) / 2, clientY: (one.y + other.y) / 2 });
          this.pinch = { distance: Math.hypot(one.x - other.x, one.y - other.y) || 1, k: at.k, mid, vx: at.x, vy: at.y };
          this.drag = null;
        }
        return;
      }
      if (this.down.size === 1) {
        this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, vx: at.x, vy: at.y, moving: false };
      }
    });
    this.el.addEventListener("pointermove", (event) => {
      if (event.buttons === 0 && this.down.has(event.pointerId)) {
        lift(event);
      }
      if (this.down.has(event.pointerId)) {
        this.down.set(event.pointerId, { x: event.clientX, y: event.clientY });
      }
      if (this.pinch && this.down.size >= 2) {
        this.pinchMoved();
        return;
      }
      const drag = this.drag;
      if (drag && drag.id === event.pointerId) {
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moving && Math.hypot(dx, dy) >= DRAG) {
          drag.moving = true;
          this.el.addClass("is-dragging");
          this.hideTip();
          try {
            this.el.setPointerCapture(event.pointerId);
          } catch {
            // A synthetic pointer cannot be captured, and needs no capture to drag.
          }
        }
        if (drag.moving) {
          const k = this.transform?.k ?? 1;
          this.apply({ x: drag.vx + dx, y: drag.vy + dy, k });
        }
        return;
      }
      if (event.pointerType === "touch") {
        return;
      }
      this.pointer = event.pointerType || "mouse";
      this.hover.rest(this.personAt(event.target), this.highlighted);
      const family = this.nodeAt(event.target);
      if (family !== null) {
        this.showTip(family, event);
      } else {
        this.hideTip();
      }
    });
    this.el.addEventListener("pointerup", lift);
    this.el.addEventListener("pointercancel", lift);
    this.el.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch" || this.drag) {
        return;
      }
      this.hover.rest(null, this.highlighted);
      this.hideTip();
    });
    this.el.addEventListener(
      "wheel",
      (event) => {
        const [x, y] = this.local(event);
        if (event.ctrlKey) {
          event.preventDefault();
          this.zoomAt(Math.exp(-event.deltaY / 100), x, y);
          return;
        }
        const fresh = this.wheel === null || event.timeStamp - this.wheel.at > GESTURE_GAP;
        const pans = fresh
          ? event.deltaX !== 0 || (event.deltaMode === 0 && Math.abs(event.deltaY) < TRACKPAD_DELTA)
          : (this.wheel?.pans ?? false);
        this.wheel = { at: event.timeStamp, pans };
        if (pans) {
          const dy = this.options.passEdges ? this.within(-event.deltaY) : -event.deltaY;
          if (dy === 0 && event.deltaX === 0) {
            return;
          }
          event.preventDefault();
          this.panBy(-event.deltaX, dy);
          return;
        }
        event.preventDefault();
        this.zoomAt(event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, x, y);
      },
      { passive: false },
    );
    this.el.addEventListener("click", (event) => {
      if (!(event.target instanceof Node && this.controls.contains(event.target))) {
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

  /** How far the drawing can move down (`dy` above zero) or up before its edge comes in further than the margin. */
  private within(dy: number): number {
    const at = this.transform;
    const layout = this.layout;
    if (!at || !layout) {
      return 0;
    }
    const top = at.y;
    const bottom = at.y + layout.height * at.k;
    if (dy > 0) {
      return Math.max(0, Math.min(dy, MARGIN - top));
    }
    return Math.min(0, Math.max(dy, this.size.height - MARGIN - bottom));
  }

  private pinchMoved(): void {
    const pinch = this.pinch;
    const [one, other] = [...this.down.values()];
    if (!pinch || !one || !other) {
      return;
    }
    const distance = Math.hypot(one.x - other.x, one.y - other.y) || 1;
    const k = Math.max(ZOOM.min, Math.min(ZOOM.max, (pinch.k * distance) / pinch.distance));
    const mid = this.local({ clientX: (one.x + other.x) / 2, clientY: (one.y + other.y) / 2 });
    const [cx, cy] = pinch.mid;
    this.apply({
      x: mid[0] - ((cx - pinch.vx) * k) / pinch.k,
      y: mid[1] - ((cy - pinch.vy) * k) / pinch.k,
      k,
    });
  }

  private activate(event: MouseEvent | KeyboardEvent, keyboard: boolean): void {
    if (this.swallow && !keyboard) {
      this.swallow = false;
      event.stopPropagation();
      return;
    }
    const target = event.target instanceof Element ? event.target : null;
    // A click from the keyboard has no pointer, and is no touch whatever pointer came before it.
    const kind = keyboard
      ? "keyboard"
      : (event as PointerEvent).pointerType || ((event as MouseEvent).detail === 0 ? "keyboard" : this.pointer);
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
