import { plural, t } from "../i18n";
import { BranchScopeBar, readBranchScope, sameBranch, type BranchScope } from "./branchScope";
import { placeInside } from "./dom";
import { CARD, fileGraphOf, marriageDigits, type FileGraphLayout, type GraphNode, type Point } from "./fileGraph";
import { least, most, type FileTimeline, type TimelineFamily } from "./fileTimeline";
import { familyTitle, lifelineYears, personName, yearText } from "./labels";

export const ZOOM = { min: 0.05, max: 3, fit: 1.4, readable: 0.6, opens: 0.55, far: 0.5 } as const;
const MARGIN = 20;
const DRAG = 4;
const WHEEL_STEP = 1.12;
const BUTTON_STEP = 1.2;
const TRACKPAD_DELTA = 40;
/** A wheel event this soon after the last one belongs to the same gesture. */
const GESTURE_GAP = 150;
const NAME_ROOM = 22;
const NAME_WIDTH = CARD.width - 16 - 6;

/** Where the view looks: the graph point at the centre of the canvas, and the scale. */
export interface GraphView {
  x: number;
  y: number;
  k: number;
}

export interface GraphState extends BranchScope {
  gedcom: string | null;
  /** The person of the tab the graph was opened from. */
  around?: string;
  view?: GraphView;
}

export interface GraphSettings {
  scope: BranchScope;
  around?: string;
  view?: GraphView;
}

/** The part of the graph in view, in graph coordinates. */
export interface GraphWindow {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface FileGraphHost {
  /** A person or a family. */
  openRecord(xref: string): void;
  /** `view` is absent until the canvas has had a size. */
  stateChanged(settings: { scope: BranchScope; view?: GraphView }): void;
  setIcon(element: HTMLElement, icon: string): void;
}

const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);

export function readGraphState(state: unknown): GraphState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const view = typeof raw.view === "object" && raw.view !== null ? (raw.view as Record<string, unknown>) : null;
  return {
    gedcom: typeof raw.gedcom === "string" && raw.gedcom ? raw.gedcom : null,
    ...readBranchScope(raw),
    ...(typeof raw.around === "string" && raw.around ? { around: raw.around } : {}),
    ...(view && finite(view.x) && finite(view.y) && finite(view.k)
      ? { view: { x: view.x, y: view.y, k: Math.min(ZOOM.max, Math.max(ZOOM.min, view.k)) } }
      : {}),
  };
}

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

type ItemKind = "card" | "node" | "line";

interface Item {
  kind: ItemKind;
  /** The person of a card, the family of a node or a line. */
  xref: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  /** The people a highlight reaches it through. */
  people: string[];
  make(far: boolean): SVGElement;
}

type Pending = { saved: GraphView } | { open: string | undefined } | { centre: string | undefined } | null;

let boards = 0;

/**
 * Laid out once per model and scope; drawn for the window it is handed and
 * one window around it, a quarter far out. Hovering and searching only change
 * classes on what is drawn.
 */
export class FileGraphBoard {
  private readonly doc: Document;
  private readonly id = (boards += 1);
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly searchInput: HTMLInputElement;
  private readonly scopeBar: BranchScopeBar;
  private readonly canvas: HTMLElement;
  private readonly svgEl: SVGSVGElement;
  private readonly viewEl: SVGGElement;
  private readonly linesEl: SVGGElement;
  private readonly itemsEl: SVGGElement;
  private readonly tip: HTMLElement;
  private readonly pop: HTMLElement;
  private readonly goneEl: HTMLElement;

  private model: FileTimeline | null = null;
  private scope: BranchScope = readBranchScope(null);
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
  private searchText = new Map<string, string>();
  private matches: string[] = [];
  private match = -1;
  private size = { width: 0, height: 0 };
  private transform: { x: number; y: number; k: number } | null = null;
  private pending: Pending = null;
  private frame = false;
  private pointer = "mouse";
  private readonly down = new Map<number, { x: number; y: number }>();
  private drag: { id: number; x: number; y: number; vx: number; vy: number; moving: boolean } | null = null;
  private pinch: { distance: number; k: number; mid: Point; vx: number; vy: number } | null = null;
  private swallow = false;
  private refocusing = false;
  private wheel: { at: number; pans: boolean } | null = null;
  private measureName: ((text: string) => number) | null = null;

  constructor(
    parent: HTMLElement,
    private readonly host: FileGraphHost,
  ) {
    this.doc = parent.ownerDocument;
    this.root = parent.createDiv({ cls: "gedcom-fg" });
    const head = this.root.createDiv({ cls: "gedcom-fg-head" });
    this.title = head.createDiv({ cls: "gedcom-fg-title" });
    this.summary = head.createDiv({ cls: "gedcom-fg-summary" });

    const tools = this.root.createDiv({ cls: "gedcom-fg-tools" });
    this.searchInput = tools.createEl("input", {
      cls: "gedcom-fg-search",
      type: "search",
      placeholder: t("overview.search"),
      attr: { "aria-label": t("overview.search") },
    });
    const zoom = tools.createDiv({ cls: "gedcom-fg-zoom" });
    const zoomButton = (cls: string, label: string, icon: string | null): HTMLButtonElement => {
      const button = zoom.createEl("button", { cls, attr: { type: "button", "aria-label": label } });
      if (icon) {
        this.host.setIcon(button, icon);
      } else {
        button.setText(label);
      }
      return button;
    };
    zoomButton("gedcom-fg-zoom-out", t("fileGraph.zoomOut"), "minus").addEventListener("click", () =>
      this.zoomBy(1 / BUTTON_STEP),
    );
    zoomButton("gedcom-fg-zoom-in", t("fileGraph.zoomIn"), "plus").addEventListener("click", () =>
      this.zoomBy(BUTTON_STEP),
    );
    zoomButton("gedcom-fg-fit", t("fileGraph.fit"), null).addEventListener("click", () => this.fit());

    this.scopeBar = new BranchScopeBar(this.root, {
      prefix: "gedcom-fg",
      help: t("fileGraph.branchHelp"),
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      change: (next) => this.setScope(next),
    });

    this.canvas = this.root.createDiv({ cls: "gedcom-fg-canvas" });
    this.svgEl = svg(this.doc, "svg", "gedcom-fg-svg");
    this.viewEl = svg(this.doc, "g", "gedcom-fg-view");
    this.linesEl = svg(this.doc, "g", "gedcom-fg-lines");
    this.itemsEl = svg(this.doc, "g", "gedcom-fg-items");
    this.viewEl.append(this.linesEl, this.itemsEl);
    this.svgEl.append(this.viewEl);
    this.canvas.append(this.svgEl);

    this.legend(this.root.createDiv({ cls: "gedcom-fg-legend" }));
    this.tip = this.root.createDiv({ cls: "gedcom-fg-tip", attr: { role: "tooltip", id: `gedcom-fg-tip-${this.id}` } });
    this.pop = this.root.createDiv({ cls: "gedcom-fg-pop" });
    this.goneEl = this.root.createDiv({ cls: "gedcom-fg-gone" });
    this.goneEl.toggle(false);
    this.listen();
  }

  show(model: FileTimeline, fileName: string, settings: GraphSettings): void {
    this.goneEl.toggle(false);
    this.root.removeClass("is-gone");
    this.title.setText(t("fileGraph.title", { name: fileName }));
    const scope = scopeOf(settings.scope);
    const first = this.model === null;
    const scoped = !sameBranch(scope, this.scope);
    if (!first && !scoped && model === this.model && this.layout) {
      return;
    }
    if (first) {
      this.pending = settings.view ? { saved: settings.view } : { open: settings.around };
    } else if (scoped) {
      this.pending = { centre: scope.focus ?? this.scope.focus };
    }
    this.model = model;
    this.scope = scope;
    this.searchText = new Map(
      [...model.people.values()].map((person) => [
        person.xref,
        [personName(person.row), ...person.row.otherNames].join(" ").toLowerCase(),
      ]),
    );
    this.summary.setText(
      [plural("overview.people", model.people.size), plural("overview.families", model.families.size)].join(" · "),
    );
    this.relayout();
  }

  /** Where the file is gone, the last reading stays out of sight rather than passing for the file. */
  showGone(path: string): void {
    this.root.addClass("is-gone");
    this.goneEl.toggle(true);
    this.goneEl.setText(t("overview.gone", { path }));
  }

  resized(size?: { width: number; height: number }): void {
    this.size = size ?? { width: this.canvas.clientWidth, height: this.canvas.clientHeight };
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

  highlight(xref: string | null, force = false): void {
    if (xref === this.highlighted && !force) {
      return;
    }
    this.highlighted = xref;
    for (const element of this.lit) {
      element.classList.remove("is-on", "is-hl");
    }
    this.lit = [];
    const model = this.model;
    const shown = xref !== null && model !== null && (this.layout?.card.has(xref) ?? false);
    this.svgEl.classList.toggle("has-hl", shown);
    if (!shown || xref === null || !model) {
      return;
    }
    const light = (element: Element, self: boolean): void => {
      element.classList.add("is-on");
      if (self) {
        element.classList.add("is-hl");
      }
      this.lit.push(element);
    };
    for (const relative of model.related(xref)) {
      const card = this.cardOf.get(relative);
      if (card) {
        light(card, relative === xref);
      }
    }
    for (const element of this.reach.get(xref) ?? []) {
      light(element, true);
    }
  }

  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
    this.match = -1;
    this.matches =
      this.query === "" || !this.layout
        ? []
        : this.layout.cards.map((card) => card.id).filter((xref) => !this.misses(xref));
    for (const [xref, element] of this.cardOf) {
      element.classList.toggle("is-dim", this.misses(xref));
    }
  }

  nextMatch(): string | null {
    if (this.matches.length === 0) {
      return null;
    }
    this.match = (this.match + 1) % this.matches.length;
    const xref = this.matches[this.match] ?? null;
    if (xref !== null) {
      const k = this.transform && this.transform.k >= ZOOM.far ? this.transform.k : ZOOM.readable;
      this.centreOn(xref, k);
      this.highlight(xref);
    }
    return xref;
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

  private centreOn(xref: string | undefined, k: number): boolean {
    const card = xref === undefined ? undefined : this.layout?.card.get(xref);
    if (!card) {
      return false;
    }
    this.apply({
      x: this.size.width / 2 - (card.x + CARD.width / 2) * k,
      y: this.size.height / 2 - (card.y + CARD.height / 2) * k,
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
      if (!this.centreOn(pending.centre, ZOOM.readable) && !this.transform) {
        this.fit();
      }
      return;
    }
    if (this.fitScale(layout) >= ZOOM.opens) {
      this.fit();
      return;
    }
    const first = layout.cards[0]?.id;
    for (const xref of [pending.open, layout.focus ?? undefined, first]) {
      if (this.centreOn(xref, ZOOM.readable)) {
        return;
      }
    }
    this.fit();
  }

  private apply(at: { x: number; y: number; k: number }): void {
    this.transform = at;
    this.viewEl.setAttribute("transform", `translate(${at.x},${at.y}) scale(${at.k})`);
    this.root.toggleClass("is-far", this.far());
    this.closePop();
    this.scheduleDraw();
    const view = this.view();
    if (view) {
      this.host.stateChanged({ scope: scopeOf(this.scope), view });
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

  private setScope(change: Partial<BranchScope>): void {
    const next: BranchScope = { ...this.scope, ...change };
    if (!next.focus) {
      delete next.focus;
    }
    if (sameBranch(next, this.scope)) {
      return;
    }
    const centre = next.focus ?? this.scope.focus;
    this.scope = next;
    this.pending = { centre };
    this.arm(null);
    this.relayout();
    const view = this.view();
    this.host.stateChanged({ scope: scopeOf(next), ...(view ? { view } : {}) });
  }

  private relayout(): void {
    const model = this.model;
    if (!model) {
      return;
    }
    const layout = fileGraphOf(model, this.scope);
    this.layout = layout;
    const focus = layout.focus === null ? undefined : model.people.get(layout.focus);
    this.scopeBar.draw(this.scope, {
      total: model.people.size,
      shown: layout.cards.length,
      focusName: focus ? personName(focus.row) : null,
    });
    const active = this.doc.activeElement;
    const kept = active && this.canvas.contains(active)
      ? { xref: this.personAt(active), pill: active.hasAttribute("data-branch") }
      : null;
    this.buildItems(model, layout);
    for (const element of this.drawn.values()) {
      element.remove();
    }
    this.drawn.clear();
    this.drawnWindow = null;
    if (this.highlighted !== null && !layout.card.has(this.highlighted)) {
      this.highlighted = null;
    }
    this.setQuery(this.searchInput.value);
    this.settle();
    this.redrawIfNeeded();
    if (kept?.xref) {
      this.refocus(this.cardOf.get(kept.xref), kept.pill);
    }
  }

  private buildItems(model: FileTimeline, layout: FileGraphLayout): void {
    const nodesAfter = new Map<string, GraphNode[]>();
    for (const node of layout.nodes) {
      const [first] = node.spouses;
      nodesAfter.set(first, [...(nodesAfter.get(first) ?? []), node]);
    }
    const placed: Item[] = [];
    for (const card of layout.cards) {
      const person = model.people.get(card.id);
      if (!person) {
        continue;
      }
      const name = personName(person.row);
      const years = lifelineYears(person.lifeline);
      placed.push({
        kind: "card",
        xref: card.id,
        left: card.x,
        top: card.y,
        right: card.x + CARD.width,
        bottom: card.y + CARD.height,
        people: [card.id],
        make: (far) => this.cardShape(card.id, card.x, card.y, person.sex, name, years, far),
      });
      for (const node of nodesAfter.get(card.id) ?? []) {
        const family = model.families.get(node.family);
        if (!family) {
          continue;
        }
        const xs = [node.x, ...node.joins.flat().map((point) => point[0])];
        const ys = [node.y, ...node.joins.flat().map((point) => point[1])];
        placed.push({
          kind: "node",
          xref: node.family,
          left: least(xs) - 11,
          top: least(ys) - 11,
          right: most(xs) + 11,
          bottom: most(ys) + 11,
          people: [...family.spouses, ...family.children],
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
        xref: line.family,
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

  private cardShape(
    xref: string,
    x: number,
    y: number,
    sex: string,
    name: string,
    years: string,
    far: boolean,
  ): SVGElement {
    const group = svg(this.doc, "g", `gedcom-fg-person is-${sex.toLowerCase()}`, {
      "data-p": xref,
      transform: `translate(${x},${y})`,
    });
    group.classList.toggle("is-focus", xref === this.scope.focus);
    group.classList.toggle("is-dim", this.misses(xref));
    group.classList.toggle("is-armed", xref === this.armed);
    const card = svg(this.doc, "g", "gedcom-fg-card", {
      tabindex: 0,
      role: "button",
      "data-card": xref,
      "aria-label": years ? `${name}, ${years}` : name,
    });
    const title = svg(this.doc, "title", null);
    title.textContent = name;
    card.append(
      title,
      svg(this.doc, "rect", "gedcom-fg-card-bg", { width: CARD.width, height: CARD.height, rx: 7 }),
      svg(this.doc, "rect", "gedcom-fg-card-side", { x: 5, y: 6, width: 4, height: CARD.height - 12, rx: 2 }),
    );
    group.append(card);
    if (far) {
      return group;
    }
    const named = svg(this.doc, "text", "gedcom-fg-card-name", { x: 16, y: 19 });
    this.measureName ??= nameMeasure(this.root);
    named.textContent = fitText(name, NAME_WIDTH, this.measureName);
    const lived = svg(this.doc, "text", "gedcom-fg-card-years", { x: 16, y: 35 });
    lived.textContent = years;
    card.append(named, lived);
    const pill = svg(this.doc, "g", "gedcom-fg-pill", {
      tabindex: 0,
      role: "button",
      "data-branch": xref,
      "aria-label": t("fileGraph.branchOf", { name }),
    });
    const hint = svg(this.doc, "title", null);
    hint.textContent = t("overview.branchHint");
    const label = svg(this.doc, "text", null, { x: CARD.width - 29, y: CARD.height - 9, "text-anchor": "middle" });
    label.textContent = t("overview.branch");
    pill.append(
      hint,
      svg(this.doc, "rect", null, { x: CARD.width - 54, y: CARD.height - 20, width: 50, height: 15, rx: 7.5 }),
      label,
    );
    group.append(pill);
    return group;
  }

  private nodeShape(node: GraphNode, family: TimelineFamily, far: boolean): SVGElement {
    const group = svg(this.doc, "g", `gedcom-fg-family is-${node.kind}`, { "data-f": node.family });
    for (const join of node.joins) {
      group.append(svg(this.doc, "path", "gedcom-fg-join", { d: curve(join) }));
    }
    const dated = node.year !== null;
    const digits = node.year === null ? "" : marriageDigits(node.year);
    const couple = this.coupleOf(family);
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

  private coupleOf(family: TimelineFamily): string {
    const names = family.spouses
      .map((xref) => this.model?.people.get(xref))
      .filter((person) => person !== undefined)
      .map((person) => person.row.name);
    return familyTitle(names);
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
        this.cardOf.set(item.xref, element);
        continue;
      }
      for (const xref of item.people) {
        const held = this.reach.get(xref) ?? [];
        held.push(element);
        this.reach.set(xref, held);
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

  private misses(xref: string): boolean {
    return this.query !== "" && !(this.searchText.get(xref) ?? "").includes(this.query);
  }

  private legend(parent: HTMLElement): void {
    const toggle = parent.createEl("button", {
      cls: "gedcom-fg-legend-toggle",
      text: t("overview.legend"),
      attr: { type: "button", "aria-expanded": "false" },
    });
    toggle.addEventListener("click", () => {
      const open = !parent.hasClass("is-open");
      parent.toggleClass("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    const entry = (cls: string, text: string) => {
      const item = parent.createSpan({ cls: "gedcom-fg-legend-item" });
      item.createSpan({ cls: `gedcom-fg-swatch ${cls}` });
      item.appendText(text);
    };
    entry("is-f", t("overview.legend.woman"));
    entry("is-m", t("overview.legend.man"));
    entry("is-u", t("overview.legend.unknown"));
    entry("is-family", t("fileGraph.legend.family"));
    entry("is-undated", t("fileGraph.legend.undated"));
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
    const box = this.canvas.getBoundingClientRect();
    return [event.clientX - box.left, event.clientY - box.top];
  }

  private listen(): void {
    this.searchInput.addEventListener("input", () => this.setQuery(this.searchInput.value));
    this.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        this.nextMatch();
      }
    });

    const lift = (event: PointerEvent): void => {
      this.down.delete(event.pointerId);
      if (this.drag?.moving || this.pinch) {
        this.swallow = true;
      }
      if (this.drag?.id === event.pointerId || this.down.size === 0) {
        this.drag = null;
        this.canvas.removeClass("is-dragging");
      }
      if (this.down.size < 2) {
        this.pinch = null;
      }
    };
    this.canvas.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) {
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
    this.canvas.addEventListener("pointermove", (event) => {
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
          this.canvas.addClass("is-dragging");
          this.hideTip();
          try {
            this.canvas.setPointerCapture(event.pointerId);
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
      this.highlight(this.personAt(event.target));
      const family = this.nodeAt(event.target);
      if (family !== null) {
        this.showTip(family, event);
      } else {
        this.hideTip();
      }
    });
    this.canvas.addEventListener("pointerup", lift);
    this.canvas.addEventListener("pointercancel", lift);
    this.canvas.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch" || this.drag) {
        return;
      }
      this.highlight(null);
      this.hideTip();
    });
    this.canvas.addEventListener(
      "wheel",
      (event) => {
        event.preventDefault();
        const [x, y] = this.local(event);
        if (event.ctrlKey) {
          this.zoomAt(Math.exp(-event.deltaY / 100), x, y);
          return;
        }
        const fresh = this.wheel === null || event.timeStamp - this.wheel.at > GESTURE_GAP;
        const pans = fresh
          ? event.deltaX !== 0 || (event.deltaMode === 0 && Math.abs(event.deltaY) < TRACKPAD_DELTA)
          : (this.wheel?.pans ?? false);
        this.wheel = { at: event.timeStamp, pans };
        if (pans) {
          this.panBy(-event.deltaX, -event.deltaY);
          return;
        }
        this.zoomAt(event.deltaY < 0 ? WHEEL_STEP : 1 / WHEEL_STEP, x, y);
      },
      { passive: false },
    );
    this.canvas.addEventListener("click", (event) => this.activate(event, false));
    this.canvas.addEventListener("keydown", (event) => {
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
    this.canvas.addEventListener("focusin", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) {
        return;
      }
      if (!this.refocusing) {
        this.bringIntoView(target);
      }
      const xref = this.personAt(target);
      if (xref !== null) {
        this.highlight(xref);
      }
      const family = this.nodeAt(target);
      if (family !== null) {
        const box = target.getBoundingClientRect();
        this.showTip(family, { clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 });
      }
    });
    this.canvas.addEventListener("focusout", (event) => {
      this.hideTip();
      const next = event.relatedTarget instanceof Element ? event.relatedTarget : null;
      if (this.refocusing || (next && this.canvas.contains(next) && this.personAt(next) !== null)) {
        return;
      }
      if (this.armed === null) {
        this.highlight(null);
      }
    });
    this.root.addEventListener("click", (event) => {
      const target = event.target instanceof Node ? event.target : null;
      if (target && !this.pop.contains(target) && !this.canvas.contains(target)) {
        this.closePop();
      }
    });
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
    if (branch && !(touch && this.armed !== branch)) {
      this.closePop();
      this.setScope({ focus: branch });
      return;
    }
    const family = this.nodeAt(target);
    if (family !== null) {
      if (touch) {
        this.arm(null);
        this.openPop(family, event as MouseEvent);
      } else {
        this.host.openRecord(family);
      }
      return;
    }
    this.closePop();
    const xref = this.personAt(target);
    if (xref === null) {
      if (touch) {
        this.arm(null);
        this.highlight(null);
      }
      return;
    }
    if (touch && this.armed !== xref) {
      this.arm(xref);
      this.highlight(xref);
      return;
    }
    this.arm(null);
    this.host.openRecord(xref);
  }

  private arm(xref: string | null): void {
    if (this.armed !== null) {
      this.cardOf.get(this.armed)?.classList.remove("is-armed");
    }
    this.armed = xref;
    if (xref !== null) {
      this.cardOf.get(xref)?.classList.add("is-armed");
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

  private describe(parent: HTMLElement, xref: string): void {
    const family = this.model?.families.get(xref);
    if (!family) {
      return;
    }
    parent.createDiv({ cls: "gedcom-fg-tip-what", text: this.coupleOf(family) });
    const marriage = family.marriage?.event;
    const when = parent.createDiv({
      cls: "gedcom-fg-tip-when",
      text: marriage?.date?.text ? t("fileGraph.married", { date: marriage.date.text }) : t("fileGraph.noDate"),
    });
    if (marriage?.place) {
      when.createSpan({ cls: "gedcom-fg-tip-where", text: ` · ${marriage.place}` });
    }
    parent.createDiv({ cls: "gedcom-fg-tip-where", text: plural("fileGraph.children", family.children.length) });
  }

  private showTip(xref: string, point: { clientX: number; clientY: number }): void {
    this.tip.empty();
    this.describe(this.tip, xref);
    this.tip.addClass("is-shown");
    placeInside(this.root, this.tip, point);
  }

  private hideTip(): void {
    this.tip.removeClass("is-shown");
  }

  private openPop(xref: string, event: MouseEvent): void {
    this.hideTip();
    this.pop.empty();
    this.describe(this.pop, xref);
    this.pop
      .createEl("button", { cls: "gedcom-fg-pop-open", text: t("fileGraph.openFamily"), attr: { type: "button" } })
      .addEventListener("click", () => {
        this.closePop();
        this.host.openRecord(xref);
      });
    this.pop.addClass("is-shown");
    placeInside(this.root, this.pop, event);
  }

  private closePop(): void {
    this.pop.removeClass("is-shown");
  }
}

function scopeOf({ focus, up, down }: BranchScope): BranchScope {
  return { ...(focus === undefined ? {} : { focus }), up, down };
}
