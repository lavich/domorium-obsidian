import type { Range } from "@domorium/language-service";

import { t } from "../i18n";
import { ticksBetween } from "./axisTicks";
import { BranchScopeBar, readBranchScope, type BranchScope } from "./branchScope";
import {
  least,
  most,
  type FileTimeline,
  type TimelineMark,
  type TimelinePerson,
} from "./fileTimeline";
import { FloatingSearch } from "./floatingSearch";
import { placeInside, prefersReducedMotion, tipPlace, zoomControls } from "./dom";
import { eventName, lifelineYears, personName, yearText } from "./labels";

export const ROW = 34;
const AXIS = 26;
const TICK_HEIGHT = { minor: 3, medium: 5, major: 7 } as const;
const GLIDE_REACH = 1.5;
const PAD = 12;

export const ZOOM = { min: 2, max: 16, initial: 6, step: 1.2 } as const;

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

/** The part of the board in view: scroll offsets, and the size of the plot beside the names. */
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

const SVG = "http://www.w3.org/2000/svg";

let boards = 0;

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

interface Placed {
  mark: TimelineMark;
  xref: string;
  who: string;
}

interface Item {
  top: number;
  bottom: number;
  left: number;
  right: number;
  ids: string[];
  make(): SVGElement;
  placed?: Placed;
}

interface Layout {
  shown: string[];
  shownSet: Set<string>;
  branch: boolean;
  y: Map<string, number>;
  lo: number;
  hi: number;
  width: number;
  height: number;
  items: Item[];
  x: (year: number) => number;
}

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
  private readonly names: HTMLElement;
  private readonly stage: HTMLElement;
  private readonly plot: HTMLElement;
  private readonly axisClip: HTMLElement;
  private readonly axis: SVGSVGElement;
  private readonly chart: SVGSVGElement;
  private readonly grid: SVGGElement;
  private readonly items: SVGGElement;
  private readonly hover: SVGGElement;
  private readonly cursor: SVGSVGElement;
  private readonly tip: HTMLElement;
  private readonly pop: HTMLElement;

  private model: FileTimeline | null = null;
  private scope: TimelineScope = readTimelineState(null);
  private layout: Layout | null = null;
  private query = "";
  private current: string | null = null;
  private selected: string | null = null;
  private readonly echo = new WeakMap<HTMLElement, number>();
  private searchText = new Map<string, string>();
  private drawn: Span = { top: 0, bottom: 0, left: 0, right: 0 };
  private readonly elements = new Map<Element, string[]>();
  private readonly marks = new Map<Element, Placed>();
  private byPerson = new Map<string, Element[]>();
  private byName = new Map<string, HTMLElement>();
  private lit: Element[] = [];
  private highlighted: string | null = null;
  private year: number | null = null;
  private pointer = "mouse";
  /** The person a first touch lit, whom a second touch opens. */
  private armed: string | null = null;
  private pending = false;

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
    this.board.createDiv({ cls: "gedcom-ft-axis-pad" });
    this.axisClip = this.board.createDiv({ cls: "gedcom-ft-axis-band" }).createDiv({ cls: "gedcom-ft-axis-clip" });
    this.names = this.board.createDiv({ cls: "gedcom-ft-names" });
    this.plot = this.board.createDiv({ cls: "gedcom-ft-plot" });
    this.axis = svg(this.doc, "svg", "gedcom-ft-axis", { height: AXIS });
    this.chart = svg(this.doc, "svg", "gedcom-ft-chart");
    this.cursor = svg(this.doc, "svg", "gedcom-ft-cursor");
    this.axisClip.append(this.axis);
    this.plot.append(this.chart, this.cursor);
    this.chart.append(this.definitions());
    this.grid = svg(this.doc, "g", "gedcom-ft-grid");
    this.items = svg(this.doc, "g", "gedcom-ft-items");
    this.hover = svg(this.doc, "g", "gedcom-ft-hover");
    this.chart.append(this.grid, this.items, this.hover);

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
    const focused = this.drawNames(layout);
    this.drawSelectedBand(layout);
    this.lit = [];
    this.highlight(this.highlighted, true);
    this.drawTicks(layout);
    this.drawCursor();
    if (focused?.xref) {
      this.byName
        .get(focused.xref)
        ?.querySelector<HTMLElement>(focused.branch ? "[data-branch]" : ".gedcom-ft-name-open")
        ?.focus({ preventScroll: true });
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
    this.chart.querySelector(".gedcom-ft-row-hl")?.remove();
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
      const name = this.byName.get(relative);
      if (name) {
        light(name, relative === xref);
      }
    }
    const cy = layout.y.get(xref) ?? 0;
    this.chart.insertBefore(
      svg(this.doc, "rect", "gedcom-ft-row-hl", { x: 0, y: cy - ROW / 2, width: layout.width, height: ROW }),
      this.items,
    );
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

  /** The row to the middle, and the lifeline into view where it lies out of it. */
  private reveal(id: string): void {
    const layout = this.layout;
    if (!layout) {
      return;
    }
    const cy = layout.y.get(id) ?? 0;
    let left: number | undefined;
    const line = this.model?.people.get(id)?.lifeline;
    if (line) {
      const view = this.measure();
      const from = layout.x(line.start);
      const to = layout.x(line.end);
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

  /** Marks a person selected, and with `reveal` brings their row into view, in their own branch where this one does not hold them; `null` ends it. */
  select(xref: string | null, reveal: boolean): void {
    this.selected = xref;
    if (xref !== this.highlighted) {
      this.highlight(null);
    }
    const layout = this.layout;
    if (reveal && xref !== null && layout && this.model?.people.has(xref)) {
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
    this.follow(this.names, this.plot, "scrollTop");
    this.follow(this.axisClip, this.plot, "scrollLeft");
    if (this.layout && this.needsDraw(this.measure())) {
      this.draw(this.measure());
    }
  }

  openSearch(): void {
    if (this.find.isOpen()) {
      this.find.focus();
    } else {
      this.find.open();
    }
  }

  private markSelected(): void {
    for (const [element, ids] of this.elements) {
      element.classList.toggle("is-selected", this.selected !== null && ids[0] === this.selected && element.classList.contains("gedcom-ft-life"));
    }
    for (const [xref, name] of this.byName) {
      name.toggleClass("is-selected", xref === this.selected);
    }
    if (this.layout) {
      this.drawSelectedBand(this.layout);
    }
  }

  private drawSelectedBand(layout: Layout): void {
    this.chart.querySelector(".gedcom-ft-row-selected")?.remove();
    const cy = this.selected === null ? undefined : layout.y.get(this.selected);
    if (cy === undefined) {
      return;
    }
    this.chart.insertBefore(
      svg(this.doc, "rect", "gedcom-ft-row-selected", { x: 0, y: cy - ROW / 2, width: layout.width, height: ROW }),
      this.items,
    );
  }

  private markCurrent(): void {
    for (const [element, ids] of this.elements) {
      element.classList.toggle("is-current", this.current !== null && ids[0] === this.current && element.classList.contains("gedcom-ft-life"));
    }
    for (const [xref, name] of this.byName) {
      name.toggleClass("is-current", xref === this.current);
    }
  }

  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
    this.current = null;
    this.markCurrent();
    for (const [element, ids] of this.elements) {
      element.classList.toggle("is-dim", this.misses(ids));
    }
    for (const [xref, name] of this.byName) {
      name.toggleClass("is-dim", this.misses([xref]));
    }
    if (this.year !== null) {
      this.drawCursor();
    }
  }

  /** The names and the axis sit outside the scroller, so its bars never run over them; they keep its place. */
  private follow(to: HTMLElement, from: HTMLElement, axis: "scrollTop" | "scrollLeft"): void {
    if (to[axis] !== from[axis]) {
      to[axis] = from[axis];
    }
    this.echo.set(to, to[axis]);
  }

  /** What the names or the axis scroll by themselves moves the plot too, but not their echo of the plot, which would cut a smooth scroll short. */
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

  private setScope(change: Partial<TimelineScope>): void {
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
    this.relayout(branchChanged && person !== undefined ? { person } : centre);
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

  private relayout(keep: { person: string } | number | null = null): void {
    const model = this.model;
    if (!model) {
      return;
    }
    this.layout = this.layoutOf(model);
    const layout = this.layout;
    if (this.current !== null && !layout.shownSet.has(this.current)) {
      this.current = null;
    }
    const focus = this.scope.focus ? model.people.get(this.scope.focus) : undefined;
    this.scopeBar.draw(this.scope, {
      total: model.rows.length,
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
    if (typeof keep === "object" && keep !== null) {
      this.glideTo(Math.max(0, (layout.y.get(keep.person) ?? 0) - this.plot.clientHeight / 2));
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

  private layoutOf(model: FileTimeline): Layout {
    const scope = this.scope;
    const keep = scope.focus && model.people.has(scope.focus)
      ? model.branch(scope.focus, scope.up, scope.down)
      : null;
    const shown = keep ? model.rows.filter((xref) => keep.has(xref)) : [...model.rows];
    const y = new Map(shown.map((xref, at) => [xref, at * ROW + ROW / 2]));
    let lo = Infinity;
    let hi = -Infinity;
    for (const xref of shown) {
      const person = model.people.get(xref);
      if (person?.lifeline) {
        lo = Math.min(lo, person.lifeline.start);
        hi = Math.max(hi, person.lifeline.end);
      }
      for (const mark of person?.marks ?? []) {
        lo = Math.min(lo, mark.year);
        hi = Math.max(hi, mark.until ?? mark.year);
      }
    }
    if (!Number.isFinite(lo)) {
      hi = new Date().getFullYear();
      lo = hi - 100;
    }
    lo = Math.floor((lo - 5) / 10) * 10;
    hi = Math.ceil((hi + 5) / 10) * 10;
    const k = scope.zoom;
    const x = (year: number): number => (year - lo) * k + PAD;
    const layout: Layout = {
      shown,
      shownSet: new Set(shown),
      branch: keep !== null,
      y,
      lo,
      hi,
      width: (hi - lo) * k + 2 * PAD,
      height: shown.length * ROW,
      items: [],
      x,
    };
    layout.items = this.itemsOf(model, layout);
    return layout;
  }

  private itemsOf(model: FileTimeline, layout: Layout): Item[] {
    const { x, y } = layout;
    const doc = this.doc;
    const lines: Item[] = [];
    const marks: Item[] = [];
    const row = (cy: number) => ({ top: cy - ROW / 2, bottom: cy + ROW / 2 });
    for (const xref of layout.shown) {
      const person = model.people.get(xref);
      const cy = y.get(xref) ?? 0;
      if (!person) {
        continue;
      }
      const line = person.lifeline;
      if (line) {
        const left = x(line.start);
        const right = x(line.end);
        lines.push({
          ...row(cy),
          left,
          right,
          ids: [xref],
          make: () => {
            const bar = svg(doc, "rect", `gedcom-ft-life is-${person.sex.toLowerCase()}${line.open ? " is-open" : ""}`, {
              x: left,
              y: cy - 9,
              width: Math.max(2, right - left),
              height: 18,
              rx: 5,
              "data-p": xref,
            });
            if (line.open) {
              bar.setAttribute("mask", `url(#gedcom-ft-fade-${this.id})`);
            }
            return bar;
          },
        });
      }
      for (const mark of person.marks) {
        if (mark.until !== undefined) {
          const left = x(mark.year);
          const right = x(mark.until);
          lines.push({
            ...row(cy),
            left,
            right,
            ids: [xref],
            make: () =>
              svg(doc, "rect", `gedcom-ft-span is-${mark.kind}`, {
                x: left,
                y: cy - 3,
                width: Math.max(2, right - left),
                height: 6,
                rx: 2,
                "data-p": xref,
              }),
          });
        }
      }
      for (const mark of person.marks) {
        const at = x(mark.year);
        marks.push({
          ...row(cy),
          left: at - 7,
          right: at + 7,
          ids: [xref],
          placed: { mark, xref, who: this.whoOf(model, mark, person) },
          make: () => this.markShape(mark, at, cy, xref),
        });
      }
    }
    const couples: Item[] = [];
    for (const family of model.families.values()) {
      const marriage = family.marriage;
      const ends = family.spouses.filter((spouse) => y.has(spouse));
      if (!marriage || ends.length < 2) {
        continue;
      }
      const ys = ends.map((spouse) => y.get(spouse) ?? 0);
      const top = least(ys);
      const bottom = most(ys);
      const at = x(marriage.year);
      couples.push({
        top,
        bottom,
        left: at,
        right: at,
        ids: ends,
        make: () => svg(doc, "line", "gedcom-ft-marriage", { x1: at, x2: at, y1: top, y2: bottom }),
      });
    }
    return [...lines, ...couples, ...marks];
  }

  private whoOf(model: FileTimeline, mark: TimelineMark, person: TimelinePerson): string {
    if (!mark.family) {
      return personName(person.row);
    }
    return (model.families.get(mark.family)?.spouses ?? [person.xref])
      .map((xref) => model.people.get(xref))
      .filter((one): one is TimelinePerson => one !== undefined)
      .map((one) => personName(one.row))
      .join(" & ");
  }

  private markShape(mark: TimelineMark, at: number, cy: number, xref: string): SVGElement {
    const group = svg(this.doc, "g", `gedcom-ft-mark is-${mark.kind}${mark.uncertain ? " is-uncertain" : ""}`, {
      "data-p": xref,
      "data-year": mark.year,
    });
    group.append(svg(this.doc, "circle", null, { cx: at, cy, r: mark.kind === "other" ? 6.5 : 4.5 }));
    if (mark.sign) {
      const sign = svg(this.doc, "text", "gedcom-ft-sign", { x: at, y: cy + 0.5 });
      sign.textContent = mark.sign;
      group.append(sign);
    }
    return group;
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
      this.hover.append(
        svg(this.doc, "path", "gedcom-ft-kin", {
          d: `M${at} ${fromY + (down ? 10 : -10)} V${toY + (down ? -11 : 11)}`,
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
    flag.append(svg(this.doc, "rect", null, { x: at - 20, y: 4, width: 40, height: 18, rx: 9 }));
    const label = svg(this.doc, "text", null, { x: at, y: 17, "text-anchor": "middle" });
    label.textContent = yearText(year);
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

  private drawNames(layout: Layout): { xref: string | null; branch: boolean } | null {
    const model = this.model;
    const first = Math.max(0, Math.floor(this.drawn.top / ROW));
    const last = Math.min(layout.shown.length, Math.ceil(this.drawn.bottom / ROW));
    const active = this.doc.activeElement;
    const focused = active && this.names.contains(active)
      ? { xref: this.personAt(active), branch: active.hasAttribute("data-branch") }
      : null;
    this.names.empty();
    this.byName = new Map();
    this.names.createDiv({ cls: "gedcom-ft-spacer" }).setCssProps({ height: `${first * ROW}px` });
    for (const xref of layout.shown.slice(first, last)) {
      const person = model?.people.get(xref);
      if (!person) {
        continue;
      }
      const name = personName(person.row);
      const row = this.names.createDiv({ cls: "gedcom-ft-name", attr: { "data-p": xref } });
      row.toggleClass("is-focus", xref === this.scope.focus);
      row.toggleClass("is-dim", this.misses([xref]));
      row.toggleClass("is-current", xref === this.current);
      row.toggleClass("is-selected", xref === this.selected);
      const years = lifelineYears(person.lifeline);
      const open = row.createEl("button", {
        cls: "gedcom-ft-name-open",
        attr: { type: "button", "aria-label": years ? `${name}, ${years}` : name },
      });
      tipPlace(open, "right");
      open.createSpan({ cls: "gedcom-ft-name-text", text: name });
      open.createSpan({ cls: "gedcom-ft-name-years", text: years });
      const branch = row.createEl("button", {
        cls: "gedcom-ft-branch",
        text: t("overview.branch"),
        attr: {
          type: "button",
          "data-branch": xref,
          "aria-pressed": String(xref === this.scope.focus),
          "aria-label": t("fileGraph.branchOf", { name }),
        },
      });
      tipPlace(branch, "right");
      this.byName.set(xref, row);
    }
    this.names
      .createDiv({ cls: "gedcom-ft-spacer" })
      .setCssProps({ height: `${(layout.shown.length - last) * ROW}px` });
    this.follow(this.names, this.plot, "scrollTop");
    return focused;
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
    const gradient = svg(this.doc, "linearGradient", null, { id: `gedcom-ft-fade-g-${this.id}` });
    gradient.append(
      svg(this.doc, "stop", null, { offset: 0.6, "stop-color": "#fff" }),
      svg(this.doc, "stop", null, { offset: 1, "stop-color": "#fff", "stop-opacity": 0 }),
    );
    const mask = svg(this.doc, "mask", null, {
      id: `gedcom-ft-fade-${this.id}`,
      maskContentUnits: "objectBoundingBox",
    });
    mask.append(svg(this.doc, "rect", null, { width: 1, height: 1, fill: `url(#gedcom-ft-fade-g-${this.id})` }));
    defs.append(marker, gradient, mask);
    return defs;
  }

  private misses(ids: string[]): boolean {
    return this.query !== "" && ids.every((xref) => !(this.searchText.get(xref) ?? "").includes(this.query));
  }

  private yearAt(clientX: number): number | null {
    const layout = this.layout;
    if (!layout) {
      return null;
    }
    const left = this.chart.getBoundingClientRect().left;
    return Math.round(layout.lo + (clientX - left - PAD) / this.scope.zoom);
  }

  private personAt(target: EventTarget | null): string | null {
    const found = target instanceof Element ? target.closest("[data-p]") : null;
    return found?.getAttribute("data-p") ?? null;
  }

  private markAt(target: EventTarget | null): Placed | null {
    const found = target instanceof Element ? target.closest(".gedcom-ft-mark") : null;
    return found ? (this.marks.get(found) ?? null) : null;
  }

  private listen(): void {

    this.board.addEventListener("pointerdown", (event) => {
      this.pointer = event.pointerType || "mouse";
    });
    this.board.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      this.pointer = event.pointerType || "mouse";
      this.showTip(this.markAt(event.target), event);
      const onPlot = event.target instanceof Node && (this.plot.contains(event.target) || this.axisClip.contains(event.target));
      this.setYear(onPlot ? this.yearAt(event.clientX) : null);
    });
    this.board.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      this.setYear(null);
      this.showTip(null, event);
    });
    this.plot.addEventListener("scroll", () => {
      this.follow(this.names, this.plot, "scrollTop");
      this.follow(this.axisClip, this.plot, "scrollLeft");
      if (this.pending) {
        return;
      }
      this.pending = true;
      (this.doc.defaultView ?? window).requestAnimationFrame(() => {
        this.pending = false;
        const view = this.measure();
        if (this.needsDraw(view)) {
          this.draw(view);
        }
      });
    });
    this.names.addEventListener("scroll", () => this.pull(this.plot, this.names, "scrollTop"));
    this.axisClip.addEventListener("scroll", () => this.pull(this.plot, this.axisClip, "scrollLeft"));
    this.board.addEventListener("click", (event) => this.activate(event));
    this.root.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && this.highlighted !== null) {
        this.armed = null;
        this.highlight(null);
      }
    });
    this.root.addEventListener("click", (event) => {
      if (!(event.target instanceof Node) || !this.pop.contains(event.target)) {
        if (!this.board.contains(event.target as Node)) {
          this.closePop();
        }
      }
    });
  }

  private activate(event: MouseEvent): void {
    const target = event.target instanceof Element ? event.target : null;
    const branch = target?.closest("[data-branch]")?.getAttribute("data-branch");
    if (branch) {
      this.closePop();
      this.setScope({ focus: branch === this.scope.focus ? undefined : branch });
      return;
    }
    // A click from the keyboard has no pointer, and is no touch whatever pointer came before it.
    const kind = (event as PointerEvent).pointerType || (event.detail === 0 ? "keyboard" : this.pointer);
    const touch = kind === "touch";
    const placed = this.markAt(target);
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
    const xref = this.personAt(target);
    if (xref === null) {
      this.armed = null;
      this.highlight(null);
      if (touch) {
        this.setYear(null);
      }
      return;
    }
    if (touch && this.armed !== xref) {
      this.armed = xref;
      this.highlight(xref);
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
    parent.createDiv({ cls: "gedcom-ft-tip-what", text: `${eventName(event)}${value} · ${placed.who}` });
    const detail = parent.createDiv({ cls: "gedcom-ft-tip-when", text: event.date?.text ?? "" });
    if (event.place) {
      detail.createSpan({ cls: "gedcom-ft-tip-where", text: ` · ${event.place}` });
    }
  }

  private showTip(placed: Placed | null, event: MouseEvent): void {
    if (!placed) {
      this.tip.removeClass("is-shown");
      return;
    }
    this.tip.empty();
    this.describe(this.tip, placed);
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

function scopeOf({ focus, up, down, zoom }: TimelineScope): TimelineScope {
  return { ...(focus === undefined ? {} : { focus }), up, down, zoom };
}

function sameScope(a: TimelineScope, b: TimelineScope): boolean {
  return a.focus === b.focus && a.up === b.up && a.down === b.down && a.zoom === b.zoom;
}
