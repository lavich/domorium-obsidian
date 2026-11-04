import type { Range } from "@domorium/language-service";

import { plural, t } from "../i18n";
import { BranchScopeBar, clampTo, readBranchScope, type BranchScope } from "./branchScope";
import {
  least,
  most,
  type FileTimeline,
  type TimelineMark,
  type TimelinePerson,
} from "./fileTimeline";
import { placeInside } from "./dom";
import { eventName, lifelineYears, personName, yearText } from "./labels";

export const ROW = 34;
const AXIS = 26;
const PAD = 12;
const UNDATED_NAMES = 20;

export const ZOOM = { min: 2, max: 16, initial: 6, captions: 9 } as const;

export interface TimelineScope extends BranchScope {
  zoom: number;
  others: boolean;
}

export interface TimelineState extends TimelineScope {
  gedcom: string | null;
}

/** The part of the board in view: scroll offsets, and the size of the plot beside the names. */
export interface TimelineWindow {
  top: number;
  left: number;
  width: number;
  height: number;
}

export interface FileTimelineHost {
  openPerson(xref: string): void;
  showInSource(range: Range): void;
  scopeChanged(scope: TimelineScope): void;
  setIcon(element: HTMLElement, icon: string): void;
}

export function readTimelineState(state: unknown): TimelineState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  return {
    gedcom: typeof raw.gedcom === "string" && raw.gedcom ? raw.gedcom : null,
    ...readBranchScope(raw),
    zoom: clampTo(raw.zoom, ZOOM.min, ZOOM.max, ZOOM.initial),
    others: raw.others !== false,
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

function captionOf(person: TimelinePerson): string {
  const parts = person.undated
    .filter((event) => (event.value && event.value !== "Y") || !["BIRT", "CHR", "BAPM", "DEAT", "BURI", "CREM"].includes(event.tag))
    .map((event) => (event.value && event.value !== "Y" ? event.value : eventName(event)));
  return [...new Set(parts)].join(" · ");
}

function fitted(text: string, room: number): string {
  if (!text || room <= 40) {
    return "";
  }
  const fit = Math.floor(room / 5.6);
  return text.length > fit ? `${text.slice(0, fit - 1)}…` : text;
}

/**
 * Laid out once per file, scope, zoom and switch; drawn for the window it is
 * handed and one window around it. Hovering only changes classes on what is
 * drawn, and puts arrows and the hovered person's undated facts in a layer of
 * their own.
 */
export class FileTimelineBoard {
  private readonly doc: Document;
  private readonly id = (boards += 1);
  private readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly othersChip: HTMLButtonElement;
  private readonly othersCount: HTMLElement;
  private readonly zoomInput: HTMLInputElement;
  private readonly searchInput: HTMLInputElement;
  private readonly aliveEl: HTMLElement;
  private readonly scopeBar: BranchScopeBar;
  private readonly board: HTMLElement;
  private readonly names: HTMLElement;
  private readonly plot: HTMLElement;
  private readonly axis: SVGSVGElement;
  private readonly chart: SVGSVGElement;
  private readonly grid: SVGGElement;
  private readonly items: SVGGElement;
  private readonly hover: SVGGElement;
  private readonly cursor: SVGSVGElement;
  private readonly undatedEl: HTMLElement;
  private readonly tip: HTMLElement;
  private readonly pop: HTMLElement;
  private readonly goneEl: HTMLElement;

  private model: FileTimeline | null = null;
  private scope: TimelineScope = readTimelineState(null);
  private layout: Layout | null = null;
  private query = "";
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
    const head = this.root.createDiv({ cls: "gedcom-ft-head" });
    this.title = head.createDiv({ cls: "gedcom-ft-title" });
    this.summary = head.createDiv({ cls: "gedcom-ft-summary" });

    const tools = this.root.createDiv({ cls: "gedcom-ft-tools" });
    this.othersChip = tools.createEl("button", {
      cls: "gedcom-ft-chip",
      text: t("fileTimeline.others"),
      attr: { type: "button" },
    });
    this.othersCount = this.othersChip.createSpan({ cls: "gedcom-ft-chip-count" });
    const zoom = tools.createEl("label", { cls: "gedcom-ft-zoom", text: t("fileTimeline.zoom") });
    this.zoomInput = zoom.createEl("input", {
      type: "range",
      attr: { min: ZOOM.min, max: ZOOM.max, step: 1, "aria-label": t("fileTimeline.zoom") },
    });
    this.searchInput = tools.createEl("input", {
      cls: "gedcom-ft-search",
      type: "search",
      placeholder: t("overview.search"),
      attr: { "aria-label": t("overview.search") },
    });
    this.aliveEl = tools.createSpan({ cls: "gedcom-ft-alive" });
    this.scopeBar = new BranchScopeBar(this.root, {
      prefix: "gedcom-ft",
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      change: (next) => this.setScope(next),
    });

    this.board = this.root.createDiv({ cls: "gedcom-ft-board" });
    this.names = this.board.createDiv({ cls: "gedcom-ft-names" });
    this.plot = this.board.createDiv({ cls: "gedcom-ft-plot" });
    this.axis = svg(this.doc, "svg", "gedcom-ft-axis", { height: AXIS });
    this.chart = svg(this.doc, "svg", "gedcom-ft-chart");
    this.cursor = svg(this.doc, "svg", "gedcom-ft-cursor");
    this.plot.append(this.axis, this.chart, this.cursor);
    this.chart.append(this.definitions());
    this.grid = svg(this.doc, "g", "gedcom-ft-grid");
    this.items = svg(this.doc, "g", "gedcom-ft-items");
    this.hover = svg(this.doc, "g", "gedcom-ft-hover");
    this.chart.append(this.grid, this.items, this.hover);

    this.undatedEl = this.root.createDiv({ cls: "gedcom-ft-undated" });
    this.legend(this.root.createDiv({ cls: "gedcom-ft-legend" }));
    this.tip = this.root.createDiv({ cls: "gedcom-ft-tip" });
    this.pop = this.root.createDiv({ cls: "gedcom-ft-pop" });
    this.goneEl = this.root.createDiv({ cls: "gedcom-ft-gone" });
    this.goneEl.toggle(false);
    this.listen();
  }

  /** Laid out again only where the model or the scope is not the one shown. */
  show(model: FileTimeline, fileName: string, scope: TimelineScope): void {
    this.goneEl.toggle(false);
    this.root.removeClass("is-gone");
    const changed = model !== this.model || !sameScope(scope, this.scope);
    this.model = model;
    this.title.setText(t("fileTimeline.title", { name: fileName }));
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
    this.summarise(model);
    this.relayout();
  }

  /** Where the file is gone, the last reading stays out of sight rather than passing for the file. */
  showGone(path: string): void {
    this.root.addClass("is-gone");
    this.goneEl.toggle(true);
    this.goneEl.setText(t("overview.gone", { path }));
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
    this.lit = [];
    this.highlight(this.highlighted, true);
    this.drawCursor();
    if (focused?.xref) {
      this.highlight(focused.xref);
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
    const names = this.names.offsetWidth;
    return {
      top: this.board.scrollTop,
      left: this.board.scrollLeft,
      width: Math.max(this.board.clientWidth - names, 0) || 1600,
      height: Math.max(this.board.clientHeight - AXIS, 0) || 1000,
    };
  }

  resized(): void {
    if (this.layout && this.needsDraw(this.measure())) {
      this.draw(this.measure());
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
    const person = model.people.get(xref);
    if (person?.lifeline && this.scope.zoom < ZOOM.captions) {
      const line = person.lifeline;
      const text = fitted(captionOf(person), layout.x(line.end) - layout.x(line.start) - 22);
      if (text) {
        this.hover.append(this.caption(layout.x(line.start) + 11, cy, text, xref));
      }
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

  setQuery(query: string): void {
    this.query = query.trim().toLowerCase();
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
    this.othersChip.setAttribute("aria-pressed", String(this.scope.others));
    this.zoomInput.value = String(this.scope.zoom);
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
    this.drawGrid(layout);
    if (typeof keep === "object" && keep !== null) {
      this.board.scrollTop = Math.max(0, (layout.y.get(keep.person) ?? 0) - this.board.clientHeight / 2);
    } else if (typeof keep === "number") {
      this.board.scrollLeft = Math.max(0, layout.x(keep) - this.measure().width / 2);
    }
    if (this.highlighted !== null && !layout.y.has(this.highlighted)) {
      this.highlighted = null;
    }
    if (this.year !== null) {
      this.year = Math.max(layout.lo, Math.min(layout.hi, this.year));
    }
    this.draw(this.measure());
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
    const showsMark = (mark: TimelineMark) => mark.kind !== "other" || this.scope.others;
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
        if (this.scope.zoom >= ZOOM.captions) {
          const text = fitted(captionOf(person), right - left - 22);
          if (text) {
            lines.push({ ...row(cy), left, right, ids: [xref], make: () => this.caption(left + 11, cy, text, xref) });
          }
        }
      }
      for (const mark of person.marks) {
        if (mark.until !== undefined && showsMark(mark)) {
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
        if (!showsMark(mark)) {
          continue;
        }
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

  private caption(left: number, cy: number, text: string, xref: string): SVGElement {
    const node = svg(this.doc, "text", "gedcom-ft-caption", { x: left, y: cy + 3.5, "data-p": xref });
    node.textContent = text;
    return node;
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

  private drawCursor(): void {
    const layout = this.layout;
    const model = this.model;
    this.cursor.replaceChildren();
    this.axis.querySelector(".gedcom-ft-axis-cursor")?.remove();
    if (!layout || !model || this.year === null) {
      this.aliveEl.setText("");
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
    this.aliveEl.setText(
      plural(layout.branch ? "fileTimeline.aliveInBranch" : "fileTimeline.alive", alive.length, {
        year: yearText(year),
      }),
    );
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
    this.names.createDiv({ cls: "gedcom-ft-axis-pad" });
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
      const open = row.createEl("button", {
        cls: "gedcom-ft-name-open",
        attr: { type: "button", title: name },
      });
      open.createSpan({ cls: "gedcom-ft-name-text", text: name });
      open.createSpan({ cls: "gedcom-ft-name-years", text: lifelineYears(person.lifeline) });
      row.createEl("button", {
        cls: "gedcom-ft-branch",
        text: t("overview.branch"),
        attr: {
          type: "button",
          "data-branch": xref,
          "aria-pressed": String(xref === this.scope.focus),
          title: t("overview.branchHint"),
        },
      });
      this.byName.set(xref, row);
    }
    this.names
      .createDiv({ cls: "gedcom-ft-spacer" })
      .setCssProps({ height: `${(layout.shown.length - last) * ROW}px` });
    return focused;
  }

  private summarise(model: FileTimeline): void {
    const dated = new Set<TimelineMark>();
    for (const person of model.people.values()) {
      person.marks.forEach((mark) => dated.add(mark));
    }
    let others = 0;
    for (const mark of dated) {
      others += mark.kind === "other" ? 1 : 0;
    }
    this.othersCount.setText(String(others));
    const parts = [
      plural("overview.people", model.rows.length),
      plural("overview.families", model.families.size),
      plural("fileTimeline.events", dated.size),
    ];
    if (dated.size > 0) {
      const from = least([...dated].map((mark) => mark.year));
      const to = most([...dated].map((mark) => mark.until ?? mark.year));
      parts.push(`${yearText(from)}–${yearText(to)}`);
    }
    this.summary.setText(parts.join(" · "));
    this.undatedEl.empty();
    const facts = [...model.people.values()].flatMap((person) => person.undated);
    if (facts.length > 0) {
      const kinds = [...new Set(facts.map((event) => eventName(event).toLowerCase()))].join(", ");
      this.undatedEl.createDiv({ text: plural("fileTimeline.undatedFacts", facts.length, { kinds }) });
    }
    if (model.undated.length > 0) {
      const listed = model.undated
        .slice(0, UNDATED_NAMES)
        .map((xref) => model.people.get(xref))
        .filter((person): person is TimelinePerson => person !== undefined)
        .map((person) => personName(person.row))
        .join(", ");
      const more = model.undated.length > UNDATED_NAMES ? "…" : "";
      this.undatedEl.createDiv({ text: `${plural("fileTimeline.undated", model.undated.length)}: ${listed}${more}.` });
    }
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

  private legend(parent: HTMLElement): void {
    const toggle = parent.createEl("button", {
      cls: "gedcom-ft-legend-toggle",
      text: t("overview.legend"),
      attr: { type: "button", "aria-expanded": "false" },
    });
    toggle.addEventListener("click", () => {
      const open = !parent.hasClass("is-open");
      parent.toggleClass("is-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    const entry = (cls: string, text: string) => {
      const item = parent.createSpan({ cls: "gedcom-ft-legend-item" });
      item.createSpan({ cls: `gedcom-ft-swatch ${cls}` });
      item.appendText(text);
    };
    entry("is-f", t("overview.legend.woman"));
    entry("is-m", t("overview.legend.man"));
    entry("is-u", t("overview.legend.unknown"));
    entry("is-birth", t("fileTimeline.legend.birth"));
    entry("is-marriage", t("fileTimeline.legend.marriage"));
    entry("is-death", t("fileTimeline.legend.death"));
    entry("is-other", t("fileTimeline.legend.other"));
    entry("is-period", t("fileTimeline.legend.period"));
    entry("is-uncertain", t("fileTimeline.legend.uncertain"));
    entry("is-caption", t("fileTimeline.legend.captions"));
    parent.createSpan({ cls: "gedcom-ft-legend-item", text: t("fileTimeline.legend.arrows") });
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
    this.othersChip.addEventListener("click", () => this.setScope({ others: !this.scope.others }));
    this.zoomInput.addEventListener("input", () => this.setScope({ zoom: Number(this.zoomInput.value) }));
    this.searchInput.addEventListener("input", () => this.setQuery(this.searchInput.value));

    this.board.addEventListener("pointerdown", (event) => {
      this.pointer = event.pointerType || "mouse";
    });
    this.board.addEventListener("pointermove", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      this.pointer = event.pointerType || "mouse";
      const xref = this.personAt(event.target);
      if (xref !== null) {
        this.highlight(xref);
      }
      this.showTip(this.markAt(event.target), event);
      const onPlot = event.target instanceof Node && this.plot.contains(event.target);
      this.setYear(onPlot ? this.yearAt(event.clientX) : null);
    });
    this.board.addEventListener("pointerleave", (event) => {
      if (event.pointerType === "touch") {
        return;
      }
      this.highlight(null);
      this.setYear(null);
      this.showTip(null, event);
    });
    this.board.addEventListener("scroll", () => {
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
    this.board.addEventListener("click", (event) => this.activate(event));
    this.names.addEventListener("focusin", (event) => {
      const xref = this.personAt(event.target);
      if (xref !== null) {
        this.highlight(xref);
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
      if (touch) {
        this.armed = null;
        this.highlight(null);
        this.setYear(null);
      }
      return;
    }
    if (touch && this.armed !== xref) {
      this.armed = xref;
      this.highlight(xref);
      const onPlot = target !== null && this.plot.contains(target);
      this.setYear(onPlot ? this.yearAt(event.clientX) : null);
      return;
    }
    this.armed = null;
    this.host.openPerson(xref);
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

function scopeOf({ focus, up, down, zoom, others }: TimelineScope): TimelineScope {
  return { ...(focus === undefined ? {} : { focus }), up, down, zoom, others };
}

function sameScope(a: TimelineScope, b: TimelineScope): boolean {
  return a.focus === b.focus && a.up === b.up && a.down === b.down && a.zoom === b.zoom && a.others === b.others;
}
