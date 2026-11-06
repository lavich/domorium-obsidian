import type { FileTimeline, TimelineMark, TimelinePerson } from "./fileTimeline";
import { personName } from "./labels";
import type { TimelineScope } from "./fileTimelineView";
import { paintStyle } from "./surnameHue";

export const ROW = 32;
export const BAR = 22;
export const PAD = 12;
export const FADE_AT = 0.6;
export const SOFT = 0.15;
export const SOFT_OPACITY = 0.15;

const LABEL_PAD = 6;
const MARK_DROP = 9;
const MARK_RADIUS = { plain: 3.5, other: 4.5 } as const;
const SPAN_HEIGHT = 4;

const SVG = "http://www.w3.org/2000/svg";

export function svg<K extends keyof SVGElementTagNameMap>(
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

export interface Placed {
  mark: TimelineMark;
  xref: string;
}

export interface Item {
  top: number;
  bottom: number;
  left: number;
  right: number;
  ids: string[];
  make(): SVGElement;
  placed?: Placed;
}

export interface Layout {
  shown: string[];
  shownSet: Set<string>;
  branch: boolean;
  /** The people the whole file holds who have a bar. */
  total: number;
  y: Map<string, number>;
  /** The right edge of each bar or of its last mark, whichever is further. */
  reach: Map<string, number>;
  lo: number;
  hi: number;
  width: number;
  height: number;
  items: Item[];
  x: (year: number) => number;
}


export type BarEnd = "cut" | "soft" | "fade";

export const barEndOf = (line: NonNullable<TimelinePerson["lifeline"]>): BarEnd =>
  line.living ? "cut" : line.open ? "fade" : line.endUncertain ? "soft" : "cut";

export const maskName = (soft: boolean, end: BarEnd, id: number): string => `gedcom-ft-mask-${soft ? "s" : "c"}${end}-${id}`;

export function layoutOf(
  model: FileTimeline,
  scope: TimelineScope,
  doc: Document,
  id: number,
  measure: (text: string) => number,
): Layout {
  const keep = scope.focus && model.people.has(scope.focus)
    ? model.branch(scope.focus, scope.up, scope.down)
    : null;
  const barred = (xref: string): boolean => model.people.get(xref)?.lifeline != null;
  const total = [...model.people.keys()].filter(barred).length;
  const shown = model.rows.filter((xref) => barred(xref) && (keep === null || keep.has(xref)));
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
  const bars = new Map<string, BarBox>();
  for (const xref of shown) {
    const person = model.people.get(xref);
    if (person) {
      bars.set(xref, barBox(person, x, measure));
    }
  }
  const y = new Map(shown.map((xref, at) => [xref, at * ROW + ROW / 2]));
  const reach = new Map(shown.map((xref) => [xref, bars.get(xref)?.reach ?? 0]));
  const rightmost = shown.reduce((far, xref) => Math.max(far, reach.get(xref) ?? 0), 0);
  const layout: Layout = {
    shown,
    shownSet: new Set(shown),
    branch: keep !== null,
    total,
    y,
    reach,
    lo,
    hi,
    width: Math.max((hi - lo) * k + 2 * PAD, rightmost + PAD),
    height: shown.length * ROW,
    items: [],
    x,
  };
  layout.items = itemsOf(model, layout, bars, doc, id);
  return layout;
}

interface BarBox {
  left: number;
  right: number;
  reach: number;
  name: string;
  text: string;
  labelX: number;
  labelWidth: number;
}

const ELLIPSIS = "…";

function fitText(name: string, room: number, measure: (text: string) => number): string {
  if (measure(name) <= room) {
    return name;
  }
  let low = 0;
  let high = name.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (measure(name.slice(0, middle).trimEnd() + ELLIPSIS) <= room) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  const fitted = name.slice(0, low).trimEnd() + ELLIPSIS;
  return low > 0 && measure(fitted) <= room ? fitted : "";
}

function barBox(person: TimelinePerson, x: (year: number) => number, measure: (text: string) => number): BarBox {
  const line = person.lifeline;
  const left = line ? x(line.start) : 0;
  const right = line ? left + Math.max(2, x(line.end) - left) : 0;
  const name = personName(person.row);
  const end = line ? barEndOf(line) : "cut";
  const from = line?.startUncertain ? SOFT : 0;
  const to = end === "fade" ? FADE_AT : end === "soft" ? 1 - SOFT : 1;
  const text = fitText(name, (right - left) * (to - from) - 2 * LABEL_PAD, measure);
  const labelWidth = text === "" ? 0 : measure(text);
  const labelX = left + (right - left) * from + LABEL_PAD;
  const marked = person.marks.reduce(
    (far, mark) => Math.max(far, x(mark.until ?? mark.year) + MARK_RADIUS[mark.kind === "other" ? "other" : "plain"]),
    0,
  );
  return { left, right, reach: Math.max(right, marked), name, text, labelX, labelWidth };
}

function itemsOf(model: FileTimeline, layout: Layout, bars: Map<string, BarBox>, doc: Document, id: number): Item[] {
  const { x, y } = layout;
  const lines: Item[] = [];
  const labels: Item[] = [];
  const marks: Item[] = [];
  const row = (cy: number) => ({ top: cy - ROW / 2, bottom: cy + ROW / 2 });
  for (const xref of layout.shown) {
    const person = model.people.get(xref);
    const box = bars.get(xref);
    const cy = y.get(xref) ?? 0;
    const line = person?.lifeline;
    if (!person || !line || !box) {
      continue;
    }
    const paint = paintStyle(person.surname);
    const end = barEndOf(line);
    lines.push({
      ...row(cy),
      left: box.left,
      right: box.right,
      ids: [xref],
      make: () => {
        const bar = svg(doc, "rect", "gedcom-ft-life", {
          x: box.left,
          y: cy - BAR / 2,
          width: box.right - box.left,
          height: BAR,
          rx: 5,
          style: paint,
          tabindex: -1,
          role: "button",
          "aria-label": box.name,
          "data-p": xref,
        });
        if (line.startUncertain || end !== "cut") {
          bar.setAttribute("mask", `url(#${maskName(line.startUncertain, end, id)})`);
        }
        return bar;
      },
    });
    if (box.text !== "") {
      labels.push({
        ...row(cy),
        left: box.labelX,
        right: box.labelX + box.labelWidth,
        ids: [xref],
        make: () => {
          const label = svg(doc, "text", "gedcom-ft-label", {
            x: box.labelX,
            y: cy,
            style: paint,
            "aria-hidden": "true",
            "data-p": xref,
          });
          label.textContent = box.text;
          return label;
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
              y: cy + BAR / 2 - SPAN_HEIGHT,
              width: Math.max(2, right - left),
              height: SPAN_HEIGHT,
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
        placed: { mark, xref },
        make: () => markShape(doc, mark, at, cy + MARK_DROP, xref),
      });
    }
  }
  return [...lines, ...labels, ...marks];
}

function markShape(doc: Document, mark: TimelineMark, at: number, cy: number, xref: string): SVGElement {
  const group = svg(doc, "g", `gedcom-ft-mark is-${mark.kind}${mark.uncertain ? " is-uncertain" : ""}`, {
    "data-p": xref,
    "data-year": mark.year,
  });
  group.append(svg(doc, "circle", null, { cx: at, cy, r: mark.kind === "other" ? MARK_RADIUS.other : MARK_RADIUS.plain }));
  if (mark.sign) {
    const sign = svg(doc, "text", "gedcom-ft-sign", { x: at, y: cy + 0.5 });
    sign.textContent = mark.sign;
    group.append(sign);
  }
  return group;
}
