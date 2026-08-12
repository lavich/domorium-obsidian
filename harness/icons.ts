/*
 * The icons Obsidian would draw, taken from its own bundle, so a screenshot of
 * this harness shows the panel Obsidian shows. setIcon is injected precisely so
 * the panel can be looked at without reaching for obsidian.
 */
interface Shape {
  tag: string;
  attrs: Record<string, string | number>;
}

const ICONS: Record<string, Shape[]> = {
  "whole-word": [
    { tag: "circle", attrs: { cx: 7, cy: 12, r: 3 } },
    { tag: "path", attrs: { d: "M10 9v6" } },
    { tag: "circle", attrs: { cx: 17, cy: 12, r: 3 } },
    { tag: "path", attrs: { d: "M14 7v8" } },
    { tag: "path", attrs: { d: "M22 17v1c0 .5-.5 1-1 1H3c-.5 0-1-.5-1-1v-1" } },
  ],
  regex: [
    { tag: "path", attrs: { d: "M17 3v10" } },
    { tag: "path", attrs: { d: "m12.67 5.5 8.66 5" } },
    { tag: "path", attrs: { d: "m12.67 10.5 8.66-5" } },
    {
      tag: "path",
      attrs: {
        d: "M9 17a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-2z",
      },
    },
  ],
  "arrow-up": [
    { tag: "path", attrs: { d: "m5 12 7-7 7 7" } },
    { tag: "path", attrs: { d: "M12 19V5" } },
  ],
  "arrow-down": [
    { tag: "path", attrs: { d: "M12 5v14" } },
    { tag: "path", attrs: { d: "m19 12-7 7-7-7" } },
  ],
  "text-select": [
    { tag: "path", attrs: { d: "M5 3a2 2 0 0 0-2 2" } },
    { tag: "path", attrs: { d: "M19 3a2 2 0 0 1 2 2" } },
    { tag: "path", attrs: { d: "M21 19a2 2 0 0 1-2 2" } },
    { tag: "path", attrs: { d: "M5 21a2 2 0 0 1-2-2" } },
    { tag: "path", attrs: { d: "M9 3h1" } },
    { tag: "path", attrs: { d: "M9 21h1" } },
    { tag: "path", attrs: { d: "M14 3h1" } },
    { tag: "path", attrs: { d: "M14 21h1" } },
    { tag: "path", attrs: { d: "M3 9v1" } },
    { tag: "path", attrs: { d: "M21 9v1" } },
    { tag: "path", attrs: { d: "M3 14v1" } },
    { tag: "path", attrs: { d: "M21 14v1" } },
    { tag: "line", attrs: { x1: 7, y1: 8, x2: 15, y2: 8 } },
    { tag: "line", attrs: { x1: 7, y1: 12, x2: 17, y2: 12 } },
    { tag: "line", attrs: { x1: 7, y1: 16, x2: 13, y2: 16 } },
  ],
  replace: [
    { tag: "path", attrs: { d: "M14 4a2 2 0 0 1 2-2" } },
    { tag: "path", attrs: { d: "M16 10a2 2 0 0 1-2-2" } },
    { tag: "path", attrs: { d: "M20 2a2 2 0 0 1 2 2" } },
    { tag: "path", attrs: { d: "M22 8a2 2 0 0 1-2 2" } },
    { tag: "path", attrs: { d: "m3 7 3 3 3-3" } },
    { tag: "path", attrs: { d: "M6 10V5a3 3 0 0 1 3-3h1" } },
    { tag: "rect", attrs: { x: 2, y: 14, width: 8, height: 8, rx: 2 } },
  ],
  "replace-all": [
    { tag: "path", attrs: { d: "M14 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2" } },
    { tag: "path", attrs: { d: "M14 4a2 2 0 0 1 2-2" } },
    { tag: "path", attrs: { d: "M16 10a2 2 0 0 1-2-2" } },
    { tag: "path", attrs: { d: "M20 14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2" } },
    { tag: "path", attrs: { d: "M20 2a2 2 0 0 1 2 2" } },
    { tag: "path", attrs: { d: "M22 8a2 2 0 0 1-2 2" } },
    { tag: "path", attrs: { d: "m3 7 3 3 3-3" } },
    { tag: "path", attrs: { d: "M6 10V5a 3 3 0 0 1 3-3h1" } },
    { tag: "rect", attrs: { x: 2, y: 14, width: 8, height: 8, rx: 2 } },
  ],
  "chevron-right": [{ tag: "path", attrs: { d: "m9 18 6-6-6-6" } }],
  "chevron-down": [{ tag: "path", attrs: { d: "m6 9 6 6 6-6" } }],
  x: [
    { tag: "path", attrs: { d: "M18 6 6 18" } },
    { tag: "path", attrs: { d: "m6 6 12 12" } },
  ],
  "uppercase-lowercase-a": [
    { tag: "path", attrs: { d: "M10.5 14L4.5 14" } },
    { tag: "path", attrs: { d: "M12.5 18L7.5 6" } },
    { tag: "path", attrs: { d: "M3 18L7.5 6" } },
    {
      tag: "path",
      attrs: {
        d: "M15.9526 10.8322C15.9526 10.8322 16.6259 10 18.3832 10C20.1406 9.99999 20.9986 11.0587 20.9986 11.9682V16.7018C20.9986 17.1624 21.2815 17.7461 21.7151 18",
      },
    },
    {
      tag: "path",
      attrs: {
        d: "M20.7151 13.5C18.7151 13.5 15.7151 14.2837 15.7151 16C15.7151 17.7163 17.5908 18.2909 18.7151 18C19.5635 17.7804 20.5265 17.3116 20.889 16.6199",
      },
    },
  ],
};

export function stubSetIcon(element: HTMLElement, icon: string): void {
  const ns = "http://www.w3.org/2000/svg";
  const owner = element.ownerDocument;
  const svg = owner.createElementNS(ns, "svg");
  for (const [name, value] of Object.entries({
    class: "svg-icon",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
  })) {
    svg.setAttribute(name, value);
  }
  for (const shape of ICONS[icon] ?? []) {
    const node = owner.createElementNS(ns, shape.tag);
    for (const [name, value] of Object.entries(shape.attrs)) {
      node.setAttribute(name, String(value));
    }
    svg.append(node);
  }
  element.replaceChildren(svg);
}
