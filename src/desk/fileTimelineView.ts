import type { Range } from "@domorium/language-service";

import { plural, t } from "../i18n";
import { BRANCH_STEPS, type FileTimeline, type TimelineMark, type TimelinePerson } from "./fileTimeline";
import { eventName, personName, yearText } from "./labels";

export const ROW = 34;
const AXIS = 26;
const PAD = 12;
const UNDATED_NAMES = 20;

export const ZOOM = { min: 2, max: 16, initial: 6, captions: 9 } as const;

export interface TimelineScope {
  focus?: string;
  up: number;
  down: number;
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

const clamp = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

export function readTimelineState(state: unknown): TimelineState {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const steps = (value: unknown) =>
    clamp(value, BRANCH_STEPS.min, BRANCH_STEPS.max, BRANCH_STEPS.initial);
  return {
    gedcom: typeof raw.gedcom === "string" && raw.gedcom ? raw.gedcom : null,
    ...(typeof raw.focus === "string" && raw.focus ? { focus: raw.focus } : {}),
    up: steps(raw.up),
    down: steps(raw.down),
    zoom: clamp(raw.zoom, ZOOM.min, ZOOM.max, ZOOM.initial),
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

function yearsLabel(person: TimelinePerson): string {
  const line = person.lifeline;
  if (!line) {
    return "";
  }
  const mark = (uncertain: boolean, year: number) => `${uncertain ? "≈" : ""}${yearText(year)}`;
  return `${mark(line.startUncertain, line.start)}–${line.open ? "" : mark(line.endUncertain, line.end)}`;
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
  private readonly scopeEl: HTMLElement;
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
      placeholder: t("fileTimeline.search"),
      attr: { "aria-label": t("fileTimeline.search") },
    });
    this.aliveEl = tools.createSpan({ cls: "gedcom-ft-alive" });
    this.scopeEl = this.root.createDiv({ cls: "gedcom-ft-scope" });

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
    this.scope = { ...scope };
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
    this.goneEl.setText(t("fileTimeline.gone", { path }));
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
    const shapes: SVGElement[] = [];
    for (const item of layout.items) {
      if (item.bottom <= span.top || item.top >= span.bottom || item.right < span.left || item.left > span.right) {
        continue;
      }
      const shape = item.make();
      shape.classList.toggle("is-dim", this.misses(item.ids));
      shapes.push(shape);
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
    this.items.replaceChildren(...shapes);
    this.drawNames(layout);
    this.lit = [];
    this.highlight(this.highlighted, true);
    this.drawCursor();
  }

  /** Whether the window has left what the last drawing covered. */
  needsDraw(view: TimelineWindow): boolean {
    return (
      view.top < this.drawn.top ||
      view.top + view.height > this.drawn.bottom ||
      view.left < this.drawn.left ||
      view.left + view.width > this.drawn.right
    );
  }

  /** The window the board itself is scrolled to, for the view to draw. */
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
  }

  private setScope(change: Partial<TimelineScope>): void {
    const next: TimelineScope = { ...this.scope, ...change };
    if (!next.focus) {
      delete next.focus;
    }
    if (sameScope(next, this.scope)) {
      return;
    }
    const focusChanged = next.focus !== this.scope.focus;
    const centre = this.centreYear();
    this.scope = next;
    this.relayout(focusChanged ? "focus" : centre);
    this.host.scopeChanged({ ...next });
  }

  private centreYear(): number | null {
    const layout = this.layout;
    if (!layout) {
      return null;
    }
    const view = this.measure();
    return layout.lo + (view.left + view.width / 2 - PAD) / this.scope.zoom;
  }

  private relayout(keep: "focus" | number | null = null): void {
    const model = this.model;
    if (!model) {
      return;
    }
    this.layout = this.layoutOf(model);
    const layout = this.layout;
    this.othersChip.setAttribute("aria-pressed", String(this.scope.others));
    this.zoomInput.value = String(this.scope.zoom);
    this.drawScope(model, layout);
    this.axis.setAttribute("width", String(layout.width));
    this.chart.setAttribute("width", String(layout.width));
    this.chart.setAttribute("height", String(Math.max(layout.height, 1)));
    this.cursor.setAttribute("width", String(layout.width));
    this.cursor.setAttribute("height", String(Math.max(layout.height, 1)));
    this.drawGrid(layout);
    if (keep === "focus" && this.scope.focus) {
      this.board.scrollTop = Math.max(0, (layout.y.get(this.scope.focus) ?? 0) - this.board.clientHeight / 2);
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
      const top = Math.min(...ys);
      const bottom = Math.max(...ys);
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
    for (const one of alive) {
      const cy = layout.y.get(one.xref);
      if (cy === undefined || one.age === undefined || cy < this.drawn.top || cy > this.drawn.bottom) {
        continue;
      }
      const text = `${one.approximate ? "≈" : ""}${one.age}`;
      const pill = svg(this.doc, "g", "gedcom-ft-age", { "data-p": one.xref });
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

  private drawNames(layout: Layout): void {
    const model = this.model;
    const first = Math.max(0, Math.floor(this.drawn.top / ROW));
    const last = Math.min(layout.shown.length, Math.ceil(this.drawn.bottom / ROW));
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
      const row = this.names.createDiv({
        cls: "gedcom-ft-name",
        attr: { "data-p": xref, tabindex: 0, role: "button", title: name },
      });
      row.toggleClass("is-focus", xref === this.scope.focus);
      row.toggleClass("is-dim", this.misses([xref]));
      row.createSpan({ cls: "gedcom-ft-name-text", text: name });
      row.createSpan({ cls: "gedcom-ft-name-years", text: yearsLabel(person) });
      row.createEl("button", {
        cls: "gedcom-ft-branch",
        text: t("fileTimeline.branch"),
        attr: { type: "button", "data-branch": xref, title: t("fileTimeline.branchHint") },
      });
      this.byName.set(xref, row);
    }
    this.names
      .createDiv({ cls: "gedcom-ft-spacer" })
      .setCssProps({ height: `${(layout.shown.length - last) * ROW}px` });
  }

  private drawScope(model: FileTimeline, layout: Layout): void {
    const scope = this.scope;
    this.scopeEl.empty();
    const focus = scope.focus ? model.people.get(scope.focus) : undefined;
    if (!focus || !layout.branch) {
      this.scopeEl.createSpan({
        text: `${t("fileTimeline.wholeFile")} · ${plural("fileTimeline.people", model.rows.length)}. ${t("fileTimeline.branchHelp")}`,
      });
      return;
    }
    this.scopeEl.createSpan({
      text: t("fileTimeline.branchOf", {
        name: personName(focus.row),
        shown: layout.shown.length,
        count: model.rows.length,
      }),
    });
    const stepper = (label: string, key: "up" | "down") => {
      this.scopeEl.createSpan({ cls: "gedcom-ft-step-label", text: label });
      const step = this.scopeEl.createSpan({ cls: "gedcom-ft-step" });
      const button = (icon: string, aria: string, by: number) => {
        const node = step.createEl("button", {
          cls: "gedcom-ft-step-button",
          attr: { type: "button", "aria-label": aria, "data-step": `${key}:${by}` },
        });
        this.host.setIcon(node, icon);
        const next = scope[key] + by;
        if (next < BRANCH_STEPS.min || next > BRANCH_STEPS.max) {
          node.setAttribute("disabled", "");
        }
      };
      button("minus", t("fileTimeline.fewer"), -1);
      step.createSpan({ cls: "gedcom-ft-step-value", text: String(scope[key]) });
      button("plus", t("fileTimeline.more"), 1);
    };
    stepper(t("fileTimeline.ancestors"), "up");
    stepper(t("fileTimeline.descendants"), "down");
    this.scopeEl.createEl("button", {
      cls: "gedcom-ft-whole",
      text: t("fileTimeline.wholeFile"),
      attr: { type: "button", "data-whole": "" },
    });
  }

  private summarise(model: FileTimeline): void {
    const dated = new Set<TimelineMark>();
    for (const person of model.people.values()) {
      person.marks.forEach((mark) => dated.add(mark));
    }
    const years = [...dated].flatMap((mark) => [mark.year, mark.until ?? mark.year]);
    const others = [...dated].filter((mark) => mark.kind === "other").length;
    this.othersCount.setText(String(others));
    const parts = [
      plural("fileTimeline.people", model.rows.length),
      plural("fileTimeline.families", model.families.size),
      plural("fileTimeline.events", dated.size),
    ];
    if (years.length > 0) {
      parts.push(`${yearText(Math.min(...years))}–${yearText(Math.max(...years))}`);
    }
    this.summary.setText(parts.join(" · "));
    this.undatedEl.empty();
    if (model.undated.length > 0) {
      const listed = model.undated
        .slice(0, UNDATED_NAMES)
        .map((xref) => model.people.get(xref))
        .filter((person): person is TimelinePerson => person !== undefined)
        .map((person) => personName(person.row))
        .join(", ");
      const more = model.undated.length > UNDATED_NAMES ? "…" : "";
      this.undatedEl.setText(`${plural("fileTimeline.undated", model.undated.length)}: ${listed}${more}.`);
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
    const entry = (cls: string, text: string) => {
      const item = parent.createSpan({ cls: "gedcom-ft-legend-item" });
      item.createSpan({ cls: `gedcom-ft-swatch ${cls}` });
      item.appendText(text);
    };
    entry("is-f", t("fileTimeline.legend.woman"));
    entry("is-m", t("fileTimeline.legend.man"));
    entry("is-u", t("fileTimeline.legend.unknown"));
    entry("is-birth", t("fileTimeline.legend.birth"));
    entry("is-marriage", t("fileTimeline.legend.marriage"));
    entry("is-death", t("fileTimeline.legend.death"));
    entry("is-other", t("fileTimeline.legend.other"));
    entry("is-period", t("fileTimeline.legend.period"));
    entry("is-uncertain", t("fileTimeline.legend.uncertain"));
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
    this.scopeEl.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const step = target?.closest("[data-step]")?.getAttribute("data-step");
      if (step) {
        const [key, by] = step.split(":");
        if (key === "up" || key === "down") {
          const next = this.scope[key] + Number(by);
          this.setScope({ [key]: Math.max(BRANCH_STEPS.min, Math.min(BRANCH_STEPS.max, next)) });
        }
        return;
      }
      if (target?.closest("[data-whole]")) {
        this.setScope({ focus: undefined });
      }
    });

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
    this.board.addEventListener("keydown", (event) => {
      const xref = this.personAt(event.target);
      if (event.key === "Enter" && xref !== null && !(event.target as Element).closest("[data-branch]")) {
        this.host.openPerson(xref);
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
      this.setScope({ focus: branch });
      return;
    }
    const touch = this.pointer === "touch" || (event as PointerEvent).pointerType === "touch";
    const placed = this.markAt(target);
    if (placed) {
      if (touch) {
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
      return;
    }
    if (touch && this.highlighted !== xref) {
      this.highlight(xref);
      const onPlot = target !== null && this.plot.contains(target);
      this.setYear(onPlot ? this.yearAt(event.clientX) : null);
      return;
    }
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

  private place(element: HTMLElement, event: MouseEvent, width: number): void {
    const box = this.root.getBoundingClientRect();
    const left = Math.max(0, Math.min(event.clientX - box.left + 14, this.root.clientWidth - width));
    element.setCssProps({ left: `${left}px`, top: `${event.clientY - box.top + 14}px` });
  }

  private showTip(placed: Placed | null, event: MouseEvent): void {
    if (!placed) {
      this.tip.removeClass("is-shown");
      return;
    }
    this.tip.empty();
    this.describe(this.tip, placed);
    this.place(this.tip, event, 300);
    this.tip.addClass("is-shown");
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
    this.place(this.pop, event, 260);
    this.pop.addClass("is-shown");
  }

  private closePop(): void {
    this.pop.removeClass("is-shown");
  }
}

function sameScope(a: TimelineScope, b: TimelineScope): boolean {
  return a.focus === b.focus && a.up === b.up && a.down === b.down && a.zoom === b.zoom && a.others === b.others;
}
