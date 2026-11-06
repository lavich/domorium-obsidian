import type { Range } from "@domorium/language-service";

import { t } from "../i18n";
import { ticksBetween } from "./axisTicks";
import { BranchScopeBar, readBranchScope, type BranchScope } from "./branchScope";
import type { FileTimeline } from "./fileTimeline";
import { FloatingSearch } from "./floatingSearch";
import { nameMeasure } from "./cardRender";
import { placeInside, prefersReducedMotion, tipPlace, zoomControls } from "./dom";
import { BAR, FADE_AT, layoutOf, maskName, PAD, ROW, SOFT, SOFT_OPACITY, svg, type BarEnd, type Layout, type Placed } from "./timelineLayout";
import { listenTimeline } from "./timelineEvents";
import { barOf, markOf, missesQuery, personOf, yearAtX } from "./timelineHits";
import { eventName, personName, yearText } from "./labels";

const AXIS = 26;
const TICK_HEIGHT = { minor: 3, medium: 5, major: 7 } as const;
const GLIDE_REACH = 1.5;
const BRANCH_WIDTH = 56;
const BRANCH_MARGIN = 8;

export const ZOOM = { min: 2, max: 16, initial: 6, step: 1.2 } as const;

export { ROW };

export interface TimelineScope extends BranchScope {
  zoom: number;
}

export interface TimelineScroll {
  top: number;
  left: number;
}

export interface TimelineState extends TimelineScope {
  scroll?: TimelineScroll;
}

/** The part of the board in view: scroll offsets, and the size of the plot. */
export interface TimelineWindow {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FileTimelineHost {
  select(xref: string): void;
  showInSource(range: Range): void;
  scopeChanged(scope: TimelineScope): void;
  setIcon(element: HTMLElement, icon: string): void;
}

const clampZoom = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(ZOOM.max, Math.max(ZOOM.min, Math.round(value * 100) / 100))
    : ZOOM.initial;

export function readTimelineState(state: unknown): TimelineState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const scroll = typeof raw.scroll === "object" && raw.scroll !== null ? (raw.scroll as Record<string, unknown>) : null;
  const offset = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : null;
  const top = offset(scroll?.top);
  const left = offset(scroll?.left);
  return {
    ...readBranchScope(raw),
    zoom: clampZoom(raw.zoom),
    ...(top !== null && left !== null ? { scroll: { top, left } } : {}),
  };
}

let boards = 0;

interface Span {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Laid out once per file, scope, zoom and switch; drawn for the window it is
 * handed and one window around it. Lighting a person only changes classes on what is
 * drawn, and puts arrows in a layer of their own.
 */
export class FileTimelineBoard {
  private readonly doc: Document;
  private readonly id = (boards += 1);
  private readonly root: HTMLElement;
  private readonly find: FloatingSearch;
  private readonly scopeBar: BranchScopeBar;
  private readonly board: HTMLElement;
  private readonly echo = new WeakMap<HTMLElement, number>();
  private readonly stage: HTMLElement;
  private readonly plot: HTMLElement;
  private readonly axisClip: HTMLElement;
  private readonly axis: SVGSVGElement;
  private readonly overlay: HTMLElement;
  private readonly chart: SVGSVGElement;
  private readonly grid: SVGGElement;
  private readonly items: SVGGElement;
  private readonly hover: SVGGElement;
  private readonly ends: SVGGElement;
  private readonly cursor: SVGSVGElement;
  private readonly tip: HTMLElement;
  private readonly pop: HTMLElement;

  private model: FileTimeline | null = null;
  private scope: TimelineScope = readTimelineState(null);
  private layout: Layout | null = null;
  private query = "";
  private current: string | null = null;
  private selected: string | null = null;
  private searchText = new Map<string, string>();
  private drawn: Span = { top: 0, bottom: 0, left: 0, right: 0 };
  private readonly elements = new Map<Element, string[]>();
  private readonly marks = new Map<Element, Placed>();
  private byPerson = new Map<string, Element[]>();
  private lit: Element[] = [];
  private highlighted: string | null = null;
  private year: number | null = null;
  private pointer = "mouse";
  private pinchAt = 0;
  /** The person a first touch lit, whom a second touch opens. */
  private armed: string | null = null;

  constructor(
    parent: HTMLElement,
    private readonly host: FileTimelineHost,
  ) {
    this.doc = parent.ownerDocument;
    this.root = parent.createDiv({ cls: "gedcom-ft" });
    this.scopeBar = new BranchScopeBar(this.root, {
      prefix: "gedcom-ft",
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      change: (next) => this.setScope(next),
    });

    this.stage = this.root.createDiv({ cls: "gedcom-ft-stage" });
    this.find = new FloatingSearch(this.stage, {
      prefix: "gedcom-ft",
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      change: (query) => this.setQuery(query),
      step: (by) => this.stepMatch(by),
      info: () => this.matchInfo(),
    });
    zoomControls(this.stage, "gedcom-ft", (element, icon) => this.host.setIcon(element, icon), {
      out: () => this.zoomBy(1 / ZOOM.step),
      in: () => this.zoomBy(ZOOM.step),
      fit: () => this.fit(),
    });
    this.board = this.stage.createDiv({ cls: "gedcom-ft-board" });
    this.axisClip = this.board.createDiv({ cls: "gedcom-ft-axis-band" }).createDiv({ cls: "gedcom-ft-axis-clip" });
    this.plot = this.board.createDiv({ cls: "gedcom-ft-plot" });
    this.axis = svg(this.doc, "svg", "gedcom-ft-axis", { height: AXIS });
    this.chart = svg(this.doc, "svg", "gedcom-ft-chart");
    this.cursor = svg(this.doc, "svg", "gedcom-ft-cursor");
    this.axisClip.append(this.axis);
    this.overlay = this.plot.createDiv({ cls: "gedcom-ft-overlay" });
    this.plot.append(this.chart, this.cursor, this.overlay);
    this.chart.append(this.definitions());
    this.grid = svg(this.doc, "g", "gedcom-ft-grid");
    this.items = svg(this.doc, "g", "gedcom-ft-items");
    this.hover = svg(this.doc, "g", "gedcom-ft-hover");
    this.ends = svg(this.doc, "g", "gedcom-ft-ends");
    this.chart.append(this.grid, this.hover, this.items, this.ends);

    this.tip = this.root.createDiv({ cls: "gedcom-ft-tip" });
    this.pop = this.root.createDiv({ cls: "gedcom-ft-pop" });
    this.listen();
  }

  /** Laid out again only where the model or the scope is not the one shown. */
  show(model: FileTimeline, scope: TimelineScope): void {
    const changed = model !== this.model || !sameScope(scope, this.scope);
    this.model = model;
    if (!changed && this.layout) {
      return;
    }
    this.scope = scopeOf(scope);
    this.searchText = new Map(
      [...model.people.values()].map((person) => [
        person.xref,
        [personName(person.row), ...person.row.otherNames].join(" ").toLowerCase(),
      ]),
    );
    this.relayout();
  }

  draw(view: TimelineWindow): void {
    const layout = this.layout;
    if (!layout) {
      return;
    }
    const { width, height } = view;
    this.drawn = {
      top: Math.max(0, view.top - height),
      bottom: view.top + 2 * height,
      left: Math.max(0, view.left - width),
      right: view.left + 2 * width,
    };
    const span = this.drawn;
    const active = this.doc.activeElement;
    const focused =
      active instanceof Element && this.plot.contains(active) && (personOf(active) !== null || active.hasAttribute("data-branch"))
        ? { xref: personOf(active), branch: active.hasAttribute("data-branch") }
        : null;
    this.elements.clear();
    this.marks.clear();
    this.byPerson = new Map();
    this.items.replaceChildren();
    for (const item of layout.items) {
      if (item.bottom <= span.top || item.top >= span.bottom || item.right < span.left || item.left > span.right) {
        continue;
      }
      const shape = item.make();
      shape.classList.toggle("is-dim", this.misses(item.ids));
      shape.classList.toggle("is-current", this.current !== null && item.ids[0] === this.current && shape.classList.contains("gedcom-ft-life"));
      shape.classList.toggle("is-selected", this.selected !== null && item.ids[0] === this.selected && shape.classList.contains("gedcom-ft-life"));
      this.items.append(shape);
      this.elements.set(shape, item.ids);
      if (item.placed) {
        this.marks.set(shape, item.placed);
      }
      for (const xref of item.ids) {
        const held = this.byPerson.get(xref) ?? [];
        held.push(shape);
        this.byPerson.set(xref, held);
      }
    }
    this.lit = [];
    this.highlight(this.highlighted, true);
    this.drawTicks(layout);
    this.drawCursor();
    this.drawBranch();
    this.rove();
    if (focused !== null) {
      const again = focused.branch
        ? this.overlay.querySelector<HTMLElement>("[data-branch]")
        : this.items.querySelector<HTMLElement>(`.gedcom-ft-life[data-p="${focused.xref}"]`);
      again?.focus({ preventScroll: true });
    }
  }

  needsDraw(view: TimelineWindow): boolean {
    return (
      view.top < this.drawn.top ||
      view.top + view.height > this.drawn.bottom ||
      view.left < this.drawn.left ||
      view.left + view.width > this.drawn.right
    );
  }

  measure(): TimelineWindow {
    return {
      top: this.plot.scrollTop,
      left: this.plot.scrollLeft,
      width: this.plot.clientWidth || 1600,
      height: this.plot.clientHeight || 1000,
    };
  }

  resized(): void {
    this.fitGutters();
    if (this.layout && this.needsDraw(this.measure())) {
      this.draw(this.measure());
    }
  }

  unlight(): void {
    this.highlight(null);
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
    this.hover.replaceChildren();
    this.ends.replaceChildren();
    const layout = this.layout;
    const model = this.model;
    const shown = xref !== null && layout !== null && layout.y.has(xref);
    this.board.toggleClass("has-hl", shown);
    if (!shown || !layout || !model || xref === null) {
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
      for (const element of this.byPerson.get(relative) ?? []) {
        light(element, relative === xref);
      }
    }
    this.drawArrows(layout, model, xref);
    if (this.year !== null) {
      this.drawCursor();
    }
  }

  setYear(year: number | null): void {
    const layout = this.layout;
    const clamped = year === null || !layout ? null : Math.max(layout.lo, Math.min(layout.hi, year));
    if (clamped === this.year) {
      return;
    }
    this.year = clamped;
    this.drawCursor();
  }

  private matchIds(): string[] {
    const layout = this.layout;
    return this.query === "" || !layout ? [] : layout.shown.filter((xref) => !this.misses([xref]));
  }

  matchInfo(): { index: number; total: number } {
    const ids = this.matchIds();
    return { index: this.current === null ? -1 : ids.indexOf(this.current), total: ids.length };
  }

  stepMatch(by: 1 | -1): string | null {
    const layout = this.layout;
    const ids = this.matchIds();
    if (!layout || ids.length === 0) {
      return null;
    }
    const at = this.current === null ? -1 : ids.indexOf(this.current);
    const id = ids[at < 0 ? (by > 0 ? 0 : ids.length - 1) : (at + by + ids.length) % ids.length] ?? null;
    if (id === null) {
      return null;
    }
    this.current = id;
    this.markCurrent();
    this.reveal(id);
    return id;
  }

  /** The row to the middle, and the bar into view where it lies out of it. */
  private reveal(id: string): void {
    const layout = this.layout;
    const line = this.model?.people.get(id)?.lifeline;
    const cy = layout?.y.get(id);
    if (!layout || cy === undefined) {
      return;
    }
    let left: number | undefined;
    if (line) {
      const view = this.measure();
      const from = layout.x(line.start);
      const to = layout.reach.get(id) ?? from;
      if (to < view.left || from > view.left + view.width) {
        left = Math.max(0, from - 40);
      }
    }
    this.glideTo(Math.max(0, cy - this.plot.clientHeight / 2), left);
  }

  /**
   * The plot scrolls smoothly to a place the reader did not scroll to, unless they ask for reduced
   * motion or it is further than a smooth scroll can show without leaving blank rows, which jumps.
   */
  private glideTo(top: number, left?: number): void {
    const plot = this.plot;
    const room = plot.scrollHeight - plot.clientHeight;
    top = room > 0 ? Math.min(Math.max(0, top), room) : Math.max(0, top);
    const far =
      Math.abs(top - plot.scrollTop) > GLIDE_REACH * plot.clientHeight ||
      (left !== undefined && Math.abs(left - plot.scrollLeft) > GLIDE_REACH * plot.clientWidth);
    if (far || prefersReducedMotion(this.doc) || typeof plot.scrollTo !== "function") {
      plot.scrollTop = top;
      if (left !== undefined) {
        plot.scrollLeft = left;
      }
      return;
    }
    plot.scrollTo({ top, ...(left === undefined ? {} : { left }), behavior: "smooth" });
  }

  /** Marks a person selected, and with `reveal` brings their bar into view, in their own branch where this one does not hold them; `null` ends it. */
  select(xref: string | null, reveal: boolean): void {
    this.selected = xref;
    if (xref !== this.highlighted) {
      this.highlight(null);
    }
    const layout = this.layout;
    if (reveal && xref !== null && layout && this.model?.people.get(xref)?.lifeline) {
      if (layout.shownSet.has(xref)) {
        this.reveal(xref);
      } else {
        this.setScope({ focus: xref });
      }
    }
    this.markSelected();
  }

  scroll(): TimelineScroll {
    return { top: this.plot.scrollTop, left: this.plot.scrollLeft };
  }

  setScroll({ top, left }: TimelineScroll): void {
    this.plot.scrollTop = top;
    this.plot.scrollLeft = left;
    this.follow(this.axisClip, this.plot, "scrollLeft");
    if (this.layout && this.needsDraw(this.measure())) {
      this.draw(this.measure());
    }
  }

  canBranch(): boolean {
    return this.selected !== null && this.model?.people.get(this.selected)?.lifeline != null;
  }

  branchOfSelected(): void {
    if (this.selected !== null && this.canBranch()) {
      this.branchOf(this.selected);
    }
  }

  private branchOf(xref: string): void {
    this.closePop();
    this.setScope({ focus: xref === this.scope.focus ? undefined : xref });
  }

  openSearch(): void {
    if (this.find.isOpen()) {
      this.find.focus();
    } else {
      this.find.open();
    }
  }

  private rove(): void {
    const bars = [...this.items.querySelectorAll<SVGElement>(".gedcom-ft-life")];
    const active = this.doc.activeElement;
    const stop =
      bars.find((one) => one === active) ??
      bars.find((one) => one.getAttribute("data-p") === this.selected) ??
      bars[0];
    for (const one of bars) {
      one.setAttribute("tabindex", one === stop ? "0" : "-1");
    }
  }

  private stepFocus(xref: string, by: 1 | -1): void {
    const layout = this.layout;
    const next = layout?.shown[(layout?.shown.indexOf(xref) ?? -1) + by];
    if (!layout || next === undefined) {
      return;
    }
    const find = () => this.items.querySelector<SVGElement>(`.gedcom-ft-life[data-p="${next}"]`);
    if (!find()) {
      const view = this.measure();
      const line = this.model?.people.get(next)?.lifeline;
      this.plot.scrollTop = Math.max(0, (layout.y.get(next) ?? 0) - view.height / 2);
      this.plot.scrollLeft = Math.max(0, layout.x(line?.start ?? layout.lo) - 40);
      this.draw(this.measure());
    }
    find()?.focus();
    this.rove();
  }

  private markSelected(): void {
    for (const [element, ids] of this.elements) {
      element.classList.toggle("is-selected", this.selected !== null && ids[0] === this.selected && element.classList.contains("gedcom-ft-life"));
    }
    this.drawBranch();
    this.rove();
    if (this.year !== null) {
      this.drawCursor();
    }
  }

  private drawBranch(): void {
    this.overlay.replaceChildren();
    const layout = this.layout;
    const xref = this.selected;
    const cy = xref === null ? undefined : layout?.y.get(xref);
    const reach = xref === null ? undefined : layout?.reach.get(xref);
    if (xref === null || !layout || cy === undefined || reach === undefined) {
      return;
    }
    if (!(this.byPerson.get(xref) ?? []).some((element) => element.classList.contains("gedcom-ft-life"))) {
      return;
    }
    const name = personName(this.model?.people.get(xref)?.row ?? { name: "" });
    const button = this.overlay.createEl("button", {
      cls: "gedcom-ft-branch",
      text: t("overview.branch"),
      attr: {
        type: "button",
        "data-branch": xref,
        "aria-pressed": String(xref === this.scope.focus),
        "aria-label": t("fileGraph.branchOf", { name }),
      },
    });
    button.setCssProps({ top: `${cy - BAR / 2}px` });
    tipPlace(button, "right");
    this.placeBranch();
  }

  private placeBranch(): void {
    const button = this.overlay.querySelector<HTMLElement>("[data-branch]");
    const xref = button?.getAttribute("data-branch");
    const reach = xref ? this.layout?.reach.get(xref) : undefined;
    const line = xref ? this.model?.people.get(xref)?.lifeline : undefined;
    if (!button || reach === undefined || !line || !this.layout) {
      return;
    }
    const room = this.plot.scrollLeft + this.plot.clientWidth - (button.offsetWidth || BRANCH_WIDTH) - BRANCH_MARGIN;
    const left = Math.max(this.layout.x(line.start) + BRANCH_MARGIN, Math.min(reach + BRANCH_MARGIN, room));
    button.setCssProps({ left: `${left}px` });
  }

  private markCurrent(): void {
    for (const [element, ids] of this.elements) {
      element.classList.toggle("is-current", this.current !== null && ids[0] === this.current && element.classList.contains("gedcom-ft-life"));
    }
  }

  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
    this.current = null;
    this.markCurrent();
    for (const [element, ids] of this.elements) {
      element.classList.toggle("is-dim", this.misses(ids));
    }
    if (this.year !== null) {
      this.drawCursor();
    }
  }

  /** The axis sits outside the scroller, so its ticks never run over the bars; it keeps the plot's place. */
  private follow(to: HTMLElement, from: HTMLElement, axis: "scrollTop" | "scrollLeft"): void {
    if (to[axis] !== from[axis]) {
      to[axis] = from[axis];
    }
    this.echo.set(to, to[axis]);
  }

  /** What the axis scrolls by itself moves the plot too, but not its echo of the plot, which would cut a smooth scroll short. */
  private pull(plot: HTMLElement, from: HTMLElement, axis: "scrollTop" | "scrollLeft"): void {
    const echo = this.echo.get(from);
    if (echo === undefined || Math.abs(from[axis] - echo) >= 1.5) {
      this.follow(plot, from, axis);
    }
  }

  private fitGutters(): void {
    this.stage.setCssProps({
      "--gedcom-ft-vbar": `${this.plot.offsetWidth - this.plot.clientWidth}px`,
      "--gedcom-ft-hbar": `${this.plot.offsetHeight - this.plot.clientHeight}px`,
    });
  }

  private zoomBy(factor: number): void {
    this.setScope({ zoom: clampZoom(this.scope.zoom * factor) });
  }

  private fit(): void {
    const layout = this.layout;
    if (layout) {
      const room = this.measure().width - 2 * PAD;
      this.setScope({ zoom: clampZoom(room / (layout.hi - layout.lo)) });
    }
  }

  private pinchedZoom(scale: number): number {
    return clampZoom(this.scope.zoom * scale);
  }

  private pinchShow(scale: number): void {
    const origin = `${this.plot.scrollLeft + this.pinchAt}px 0`;
    const factor = this.pinchedZoom(scale) / this.scope.zoom;
    for (const element of [this.chart, this.cursor, this.axis, this.overlay]) {
      element.style.transformOrigin = origin;
      element.style.transform = factor === 1 ? "" : `scaleX(${factor})`;
    }
  }

  private pinchEnd(scale: number): void {
    this.pinchShow(1);
    const layout = this.layout;
    const zoom = this.pinchedZoom(scale);
    if (!layout || zoom === this.scope.zoom) {
      return;
    }
    const year = layout.lo + (this.plot.scrollLeft + this.pinchAt - PAD) / this.scope.zoom;
    const row = this.rowUnder(layout, year, this.plot.scrollTop + this.measure().height / 2);
    this.setScope({ zoom }, { year, at: this.pinchAt, ...(row ? { row } : {}) });
  }

  private rowUnder(layout: Layout, year: number, y: number): { xref: string; offset: number } | null {
    const xref =
      layout.shown.find((one) => {
        const line = this.model?.people.get(one)?.lifeline;
        return line !== undefined && line !== null && line.start <= year && year <= line.end && Math.abs((layout.y.get(one) ?? 0) - y) < ROW;
      }) ?? this.selected;
    const at = xref === null ? undefined : layout.y.get(xref);
    return xref === null || at === undefined ? null : { xref, offset: at - this.plot.scrollTop };
  }

  private setScope(change: Partial<TimelineScope>, hold?: Hold): void {
    const next: TimelineScope = { ...this.scope, ...change };
    if (!next.focus) {
      delete next.focus;
    }
    if (sameScope(next, this.scope)) {
      return;
    }
    const branchChanged = next.focus !== this.scope.focus || next.up !== this.scope.up || next.down !== this.scope.down;
    const person = next.focus ?? this.scope.focus;
    const centre = this.centreYear();
    this.highlight(null);
    this.scope = next;
    this.relayout(hold ?? (branchChanged && person !== undefined ? { person } : centre));
    this.host.scopeChanged(scopeOf(next));
  }

  private centreYear(): number | null {
    const layout = this.layout;
    if (!layout) {
      return null;
    }
    const view = this.measure();
    return layout.lo + (view.left + view.width / 2 - PAD) / this.scope.zoom;
  }

  private relayout(keep: { person: string } | Hold | number | null = null): void {
    const model = this.model;
    if (!model) {
      return;
    }
    this.layout = layoutOf(model, this.scope, this.doc, this.id, nameMeasure(this.root));
    const layout = this.layout;
    if (this.current !== null && !layout.shownSet.has(this.current)) {
      this.current = null;
    }
    const focus = this.scope.focus ? model.people.get(this.scope.focus) : undefined;
    this.scopeBar.draw(this.scope, {
      total: layout.total,
      shown: layout.shown.length,
      focusName: focus && layout.branch ? personName(focus.row) : null,
    });
    this.axis.setAttribute("width", String(layout.width));
    this.chart.setAttribute("width", String(layout.width));
    this.chart.setAttribute("height", String(Math.max(layout.height, 1)));
    this.cursor.setAttribute("width", String(layout.width));
    this.cursor.setAttribute("height", String(Math.max(layout.height, 1)));
    this.fitGutters();
    this.drawGrid(layout);
    if (typeof keep === "object" && keep !== null && "person" in keep) {
      this.glideTo(Math.max(0, (layout.y.get(keep.person) ?? 0) - this.plot.clientHeight / 2));
    } else if (typeof keep === "object" && keep !== null) {
      this.plot.scrollLeft = Math.max(0, layout.x(keep.year) - keep.at);
      const held = keep.row ? layout.y.get(keep.row.xref) : undefined;
      if (keep.row && held !== undefined) {
        this.plot.scrollTop = Math.max(0, held - keep.row.offset);
      }
    } else if (typeof keep === "number") {
      this.plot.scrollLeft = Math.max(0, layout.x(keep) - this.measure().width / 2);
    }
    if (this.highlighted !== null && !layout.y.has(this.highlighted)) {
      this.highlighted = null;
    }
    if (this.year !== null) {
      this.year = Math.max(layout.lo, Math.min(layout.hi, this.year));
    }
    this.draw(this.measure());
    this.find.refresh();
  }

  private drawArrows(layout: Layout, model: FileTimeline, xref: string): void {
    const person = model.people.get(xref);
    if (!person) {
      return;
    }
    const arrow = (from: string, to: string, at: number): void => {
      const fromY = layout.y.get(from) ?? 0;
      const toY = layout.y.get(to) ?? 0;
      const down = toY > fromY;
      if (toY === fromY) {
        return;
      }
      this.hover.append(
        svg(this.doc, "path", "gedcom-ft-kin", {
          d: `M${at} ${fromY + (down ? BAR / 2 : -BAR / 2)} V${toY + (down ? -BAR / 2 : BAR / 2)}`,
          "marker-end": `url(#gedcom-ft-arrow-${this.id})`,
          "data-from": from,
          "data-to": to,
        }),
      );
    };
    const parents = person.parents.filter((parent) => layout.y.has(parent));
    if (person.lifeline) {
      const start = layout.x(person.lifeline.start);
      parents.forEach((parent, at) => {
        arrow(parent, xref, start + (at - (parents.length - 1) / 2) * 4);
      });
    }
    for (const child of person.children) {
      const line = model.people.get(child)?.lifeline;
      if (line && layout.y.has(child)) {
        arrow(xref, child, layout.x(line.start));
      }
    }
    for (const family of model.families.values()) {
      if (!family.spouses.includes(xref) || family.linkYear === undefined) {
        continue;
      }
      const ends = family.spouses.filter((spouse) => layout.y.has(spouse));
      const [upper, lower] = ends.map((spouse) => layout.y.get(spouse) ?? 0).sort((a, b) => a - b);
      if (ends.length < 2 || upper === undefined || lower === undefined || upper === lower) {
        continue;
      }
      const at = layout.x(family.linkYear);
      const [top, bottom] = [upper + BAR / 2, lower - BAR / 2];
      this.hover.append(
        svg(this.doc, "line", "gedcom-ft-marriage", { x1: at, x2: at, y1: top, y2: bottom }),
      );
      this.ends.append(
        svg(this.doc, "circle", "gedcom-ft-marriage-dot", { cx: at, cy: top, r: 3 }),
        svg(this.doc, "circle", "gedcom-ft-marriage-dot", { cx: at, cy: bottom, r: 3 }),
      );
    }
  }

  private drawTicks(layout: Layout): void {
    this.axis.querySelector(".gedcom-ft-ticks")?.remove();
    const k = this.scope.zoom;
    const yearAt = (at: number): number => layout.lo + (at - PAD) / k;
    const ticks = ticksBetween(
      Math.max(layout.lo, Math.floor(yearAt(this.drawn.left))),
      Math.min(layout.hi, Math.ceil(yearAt(this.drawn.right))),
      k,
    );
    const group = svg(this.doc, "g", "gedcom-ft-ticks");
    for (const kind of ["minor", "medium", "major"] as const) {
      if (ticks[kind].length === 0) {
        continue;
      }
      const d = ticks[kind].map((year) => `M${layout.x(year)} ${AXIS - 1}v${-TICK_HEIGHT[kind]}`).join("");
      group.append(svg(this.doc, "path", `gedcom-ft-tick is-${kind}`, { d }));
    }
    this.axis.prepend(group);
  }

  private drawCursor(): void {
    const layout = this.layout;
    const model = this.model;
    this.cursor.replaceChildren();
    this.axis.querySelector(".gedcom-ft-axis-cursor")?.remove();
    if (!layout || !model || this.year === null) {
      return;
    }
    const year = this.year;
    const at = layout.x(year);
    this.cursor.append(svg(this.doc, "line", "gedcom-ft-cursor-line", { x1: at, x2: at, y1: 0, y2: layout.height }));
    const alive = model.alive(year, layout.shownSet);
    const lit = this.highlighted === null ? null : model.related(this.highlighted);
    for (const one of alive) {
      const cy = layout.y.get(one.xref);
      if (cy === undefined || one.age === undefined || cy < this.drawn.top || cy > this.drawn.bottom) {
        continue;
      }
      const text = `${one.approximate ? "≈" : ""}${one.age}`;
      const pill = svg(this.doc, "g", `gedcom-ft-age${lit?.has(one.xref) ? " is-on" : ""}`, { "data-p": one.xref });
      pill.classList.toggle("is-dim", this.misses([one.xref]));
      pill.append(
        svg(this.doc, "rect", null, { x: at + 5, y: cy - 8, width: text.length * 6.4 + 8, height: 16, rx: 8 }),
      );
      const label = svg(this.doc, "text", null, { x: at + 9, y: cy + 3.5 });
      label.textContent = text;
      pill.append(label);
      this.cursor.append(pill);
    }
    const flag = svg(this.doc, "g", "gedcom-ft-axis-cursor");
    const ruler = alive.find((one) => one.xref === this.selected);
    const text =
      ruler?.age === undefined ? yearText(year) : `${yearText(year)} · ${ruler.approximate ? "≈" : ""}${ruler.age}`;
    const half = Math.max(20, text.length * 3.4 + 9);
    flag.append(svg(this.doc, "rect", null, { x: at - half, y: 4, width: 2 * half, height: 18, rx: 9 }));
    const label = svg(this.doc, "text", null, { x: at, y: 17, "text-anchor": "middle" });
    label.textContent = text;
    flag.append(label);
    this.axis.append(flag);
  }

  private drawGrid(layout: Layout): void {
    const step = this.scope.zoom < 4 ? 50 : this.scope.zoom < 8 ? 20 : 10;
    const minor = (year: number) => ((year % step) + step) % step !== 0;
    const lines: SVGElement[] = [];
    for (let year = layout.lo; year <= layout.hi; year += 10) {
      const at = layout.x(year);
      lines.push(svg(this.doc, "line", `gedcom-ft-gridline${minor(year) ? " is-minor" : ""}`, {
        x1: at, x2: at, y1: 0, y2: layout.height,
      }));
    }
    const now = new Date().getFullYear();
    if (now <= layout.hi) {
      const at = layout.x(now);
      lines.push(svg(this.doc, "line", "gedcom-ft-now", { x1: at, x2: at, y1: 0, y2: layout.height }));
    }
    this.grid.replaceChildren(...lines);
    const labels: SVGElement[] = [];
    for (let year = Math.ceil(layout.lo / step) * step; year <= layout.hi; year += step) {
      const label = svg(this.doc, "text", null, { x: layout.x(year), y: 17, "text-anchor": "middle" });
      label.textContent = yearText(year);
      labels.push(label);
    }
    this.axis.replaceChildren(...labels);
  }

  private definitions(): SVGDefsElement {
    const defs = svg(this.doc, "defs", null);
    const marker = svg(this.doc, "marker", null, {
      id: `gedcom-ft-arrow-${this.id}`,
      viewBox: "0 0 6 6",
      refX: 5,
      refY: 3,
      markerWidth: 5,
      markerHeight: 5,
      orient: "auto",
    });
    marker.append(svg(this.doc, "path", "gedcom-ft-arrowhead", { d: "M0 0L6 3L0 6z" }));
    defs.append(marker);
    for (const soft of [false, true]) {
      for (const end of ["cut", "soft", "fade"] as const) {
        if (soft || end !== "cut") {
          defs.append(this.maskOf(soft, end));
        }
      }
    }
    return defs;
  }

  private maskOf(soft: boolean, end: BarEnd): SVGMaskElement {
    const key = `${soft ? "s" : "c"}${end}`;
    const stops: [number, number][] = [];
    if (soft) {
      stops.push([0, SOFT_OPACITY], [SOFT, 1]);
    } else {
      stops.push([0, 1]);
    }
    if (end === "soft") {
      stops.push([1 - SOFT, 1], [1, SOFT_OPACITY]);
    } else if (end === "fade") {
      stops.push([FADE_AT, 1], [1, 0]);
    } else {
      stops.push([1, 1]);
    }
    const gradient = svg(this.doc, "linearGradient", null, { id: `gedcom-ft-fade-g-${key}-${this.id}` });
    gradient.append(
      ...stops.map(([offset, opacity]) =>
        svg(this.doc, "stop", null, { offset, "stop-color": "#fff", "stop-opacity": opacity }),
      ),
    );
    const mask = svg(this.doc, "mask", null, { id: maskName(soft, end, this.id), maskContentUnits: "objectBoundingBox" });
    mask.append(gradient, svg(this.doc, "rect", null, { width: 1, height: 1, fill: `url(#gedcom-ft-fade-g-${key}-${this.id})` }));
    return mask;
  }

  private misses(ids: string[]): boolean {
    return missesQuery(this.query, this.searchText, ids);
  }

  private yearAt(clientX: number): number | null {
    const layout = this.layout;
    if (!layout) {
      return null;
    }
    return yearAtX(
      { lo: layout.lo, zoom: this.scope.zoom, pad: PAD, chartLeft: this.chart.getBoundingClientRect().left },
      clientX,
    );
  }

  private listen(): void {
    listenTimeline(
      {
        doc: this.doc,
        root: this.root,
        board: this.board,
        plot: this.plot,
        axisClip: this.axisClip,
        pop: this.pop,
      },
      {
        pointer: (kind) => {
          this.pointer = kind;
        },
        tip: (target, event) => this.showTip(markOf(target, this.marks), barOf(target), event),
        year: (clientX) => this.setYear(clientX === null ? null : this.yearAt(clientX)),
        plotScrolled: () => {
          this.follow(this.axisClip, this.plot, "scrollLeft");
          this.placeBranch();
        },
        redrawIfNeeded: () => {
          const view = this.measure();
          if (this.needsDraw(view)) {
            this.draw(view);
          }
        },
        axisScrolled: () => this.pull(this.plot, this.axisClip, "scrollLeft"),
        pinchStart: (clientX) => {
          this.pinchAt = clientX - this.plot.getBoundingClientRect().left;
        },
        pinchMove: (scale) => this.pinchShow(scale),
        pinchEnd: (scale) => this.pinchEnd(scale),
        step: (xref, by) => this.stepFocus(xref, by),
        bar: (xref) => {
          this.armed = null;
          this.closePop();
          this.highlight(xref);
          this.host.select(xref);
        },
        activate: (event) => this.activate(event),
        escape: () => {
          if (this.highlighted !== null) {
            this.armed = null;
            this.highlight(null);
          }
        },
        closePop: () => this.closePop(),
      },
    );
  }

  private activate(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    const branch = target?.closest("[data-branch]")?.getAttribute("data-branch");
    if (branch) {
      this.branchOf(branch);
      return;
    }
    // A click from the keyboard has no pointer, and is no touch whatever pointer came before it.
    const kind = (event as PointerEvent).pointerType || (event.detail === 0 ? "keyboard" : this.pointer);
    const touch = kind === "touch";
    const placed = markOf(target, this.marks);
    if (placed) {
      if (touch) {
        this.armed = null;
        this.highlight(placed.xref);
        this.openPop(placed, event);
      } else {
        this.host.showInSource(placed.mark.event.range);
      }
      return;
    }
    this.closePop();
    const xref = personOf(target);
    if (xref === null) {
      this.armed = null;
      this.tip.removeClass("is-shown");
      this.highlight(null);
      if (touch) {
        this.setYear(null);
      }
      return;
    }
    if (touch && this.armed !== xref) {
      this.armed = xref;
      this.highlight(xref);
      this.showTip(null, xref, event);
      const onPlot = target !== null && (this.plot.contains(target) || this.axisClip.contains(target));
      this.setYear(onPlot ? this.yearAt(event.clientX) : null);
      return;
    }
    this.armed = null;
    this.highlight(xref);
    this.host.select(xref);
  }

  private describe(parent: HTMLElement, placed: Placed): void {
    const { event } = placed.mark;
    const value = event.value && event.value !== "Y" ? `: ${event.value}` : "";
    parent.createDiv({ cls: "gedcom-ft-tip-what", text: `${eventName(event)}${value}` });
    const detail = parent.createDiv({ cls: "gedcom-ft-tip-when", text: event.date?.text ?? "" });
    if (event.place) {
      detail.createSpan({ cls: "gedcom-ft-tip-where", text: ` · ${event.place}` });
    }
  }

  private showTip(placed: Placed | null, xref: string | null, event: MouseEvent): void {
    const person = xref === null ? undefined : this.model?.people.get(xref);
    if (!placed && !person) {
      this.tip.removeClass("is-shown");
      return;
    }
    this.tip.empty();
    if (placed) {
      this.describe(this.tip, placed);
    } else if (person) {
      this.tip.createDiv({ cls: "gedcom-ft-tip-what", text: personName(person.row) });
    }
    this.tip.addClass("is-shown");
    placeInside(this.root, this.tip, event);
  }

  private openPop(placed: Placed, event: MouseEvent): void {
    this.pop.empty();
    this.describe(this.pop, placed);
    this.pop.createEl("button", {
      cls: "gedcom-ft-pop-source",
      text: t("desk.showInSource"),
      attr: { type: "button" },
    }).addEventListener("click", () => {
      this.closePop();
      this.host.showInSource(placed.mark.event.range);
    });
    this.pop.addClass("is-shown");
    placeInside(this.root, this.pop, event);
  }

  private closePop(): void {
    this.pop.removeClass("is-shown");
  }
}

interface Hold {
  year: number;
  at: number;
  row?: { xref: string; offset: number };
}

function scopeOf({ focus, up, down, zoom }: TimelineScope): TimelineScope {
  return { ...(focus === undefined ? {} : { focus }), up, down, zoom };
}

function sameScope(a: TimelineScope, b: TimelineScope): boolean {
  return a.focus === b.focus && a.up === b.up && a.down === b.down && a.zoom === b.zoom;
}
