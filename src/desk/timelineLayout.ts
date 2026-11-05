import { least, most, type FileTimeline, type TimelineMark, type TimelinePerson } from "./fileTimeline";
import { personName } from "./labels";
import type { TimelineScope } from "./fileTimelineView";

export const ROW = 27;
export const PAD = 12;

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
  who: string;
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
  y: Map<string, number>;
  lo: number;
  hi: number;
  width: number;
  height: number;
  items: Item[];
  x: (year: number) => number;
}


export function layoutOf(model: FileTimeline, scope: TimelineScope, doc: Document, id: number): Layout {
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
  layout.items = itemsOf(model, layout, doc, id);
  return layout;
}

function itemsOf(model: FileTimeline, layout: Layout, doc: Document, id: number): Item[] {
  const { x, y } = layout;
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
            bar.setAttribute("mask", `url(#gedcom-ft-fade-${id})`);
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
        placed: { mark, xref, who: whoOf(model, mark, person) },
        make: () => markShape(doc, mark, at, cy, xref),
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

function whoOf(model: FileTimeline, mark: TimelineMark, person: TimelinePerson): string {
  if (!mark.family) {
    return personName(person.row);
  }
  return (model.families.get(mark.family)?.spouses ?? [person.xref])
    .map((xref) => model.people.get(xref))
    .filter((one): one is TimelinePerson => one !== undefined)
    .map((one) => personName(one.row))
    .join(" & ");
}

function markShape(doc: Document, mark: TimelineMark, at: number, cy: number, xref: string): SVGElement {
  const group = svg(doc, "g", `gedcom-ft-mark is-${mark.kind}${mark.uncertain ? " is-uncertain" : ""}`, {
    "data-p": xref,
    "data-year": mark.year,
  });
  group.append(svg(doc, "circle", null, { cx: at, cy, r: mark.kind === "other" ? 6.5 : 4.5 }));
  if (mark.sign) {
    const sign = svg(doc, "text", "gedcom-ft-sign", { x: at, y: cy + 0.5 });
    sign.textContent = mark.sign;
    group.append(sign);
  }
  return group;
}
