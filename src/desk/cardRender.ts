import { t } from "../i18n";
import { CARD, marriageDigits, type GraphCard, type GraphNode, type Point } from "./fileGraph";
import { yearText } from "./labels";
import type { CanvasCard, CanvasFamily } from "./graphCanvas";

const NAME_ROOM = 22;
const NAME_WIDTH = CARD.width - 2 * 6;
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

export function nameMeasure(root: HTMLElement): (text: string) => number {
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

export interface CardMarks {
  dim: boolean;
  armed: boolean;
  current: boolean;
  selected: boolean;
  measure: (text: string) => number;
}

export function cardShape(doc: Document, placed: GraphCard, shown: CanvasCard, far: boolean, marks: CardMarks): SVGElement {
  const { id, x, y, height } = placed;
  const { name, years } = shown;
  const group = svg(doc, "g", "gedcom-fg-person", {
    "data-p": id,
    style: shown.paint,
    transform: `translate(${x},${y})`,
  });
  group.classList.toggle("is-focus", shown.focus === true);
  group.classList.toggle("is-dim", marks.dim);
  group.classList.toggle("is-armed", marks.armed);
  group.classList.toggle("is-current", marks.current);
  group.classList.toggle("is-selected", marks.selected);
  const card = svg(doc, "g", "gedcom-fg-card", {
    tabindex: 0,
    role: "button",
    "data-card": id,
    "aria-label": years ? `${name}, ${years}` : name,
  });
  card.append(svg(doc, "rect", "gedcom-fg-card-bg", { width: CARD.width, height, rx: 7 }));
  group.append(card);
  if (far) {
    return group;
  }
  const line = (cls: string, at: number, content: string): void => {
    const written = svg(doc, "text", cls, { x: CARD.width / 2, y: at, "text-anchor": "middle" });
    written.textContent = fitText(content, NAME_WIDTH, marks.measure);
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
  const pill = svg(doc, "g", "gedcom-fg-pill", {
    tabindex: 0,
    role: "button",
    "data-branch": id,
    "aria-pressed": String(shown.focus === true),
    "aria-label": t("fileGraph.branchOf", { name }),
  });
  const label = svg(doc, "text", null, { x: CARD.width - 29, y: height - 9, "text-anchor": "middle" });
  label.textContent = t("overview.branch");
  pill.append(
    svg(doc, "rect", null, { x: CARD.width - 54, y: height - 20, width: 50, height: 15, rx: 7.5 }),
    label,
  );
  group.append(pill);
  return group;
}

export function nodeShape(doc: Document, node: GraphNode, family: CanvasFamily, far: boolean): SVGElement {
  const group = svg(doc, "g", `gedcom-fg-family is-${node.kind}`, { "data-f": node.family });
  for (const join of node.joins) {
    group.append(svg(doc, "path", "gedcom-fg-join", { d: curve(join) }));
  }
  const dated = node.year !== null;
  const digits = node.year === null ? "" : marriageDigits(node.year);
  const { couple } = family;
  const handle = svg(doc, "g", `gedcom-fg-node${dated ? "" : " is-undated"}`, {
    tabindex: 0,
    role: "button",
    "data-node": node.family,
    "aria-label":
      node.year === null
        ? t("fileGraph.nodeUndated", { couple })
        : t("fileGraph.nodeLabel", { couple, year: yearText(node.year) }),
  });
  handle.append(svg(doc, "circle", null, { cx: node.x, cy: node.y, r: dated ? 11 : 6 }));
  if (digits && !far) {
    const text = svg(doc, "text", "gedcom-fg-node-year", {
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
