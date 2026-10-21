import { t } from "../i18n";
import { BOX, type TreeBox, type TreeLayout } from "./treeLayout";

export interface TreeHost {
  openRecord(xref: string): void;
  toggleSiblings?(xref: string): void;
}

const SVG = "http://www.w3.org/2000/svg";

function centreX(box: TreeBox): number {
  return box.x + BOX.width / 2;
}

function origin(from: TreeBox[]): { x: number; y: number } {
  const [one, other] = from;
  if (one && other) {
    return { x: (centreX(one) + centreX(other)) / 2, y: one.y + BOX.height / 2 };
  }
  return one ? { x: centreX(one), y: one.y + BOX.height } : { x: 0, y: 0 };
}

function linesOf(layout: TreeLayout): string {
  const byId = new Map(layout.boxes.map((box) => [box.id, box]));
  const parts: string[] = [];
  for (const [a, b] of layout.couples) {
    const one = byId.get(a);
    const other = byId.get(b);
    if (!one || !other) {
      continue;
    }
    const [left, right] = one.x < other.x ? [one, other] : [other, one];
    const y = left.y + BOX.height / 2;
    parts.push(`M${left.x + BOX.width} ${y}H${right.x}`);
  }
  for (const link of layout.links) {
    const from = link.from.map((id) => byId.get(id)).filter((box): box is TreeBox => Boolean(box));
    const to = byId.get(link.to);
    if (!to || from.length === 0) {
      continue;
    }
    const start = origin(from);
    const turn = to.y - BOX.rowGap / 2;
    parts.push(`M${start.x} ${start.y}V${turn}H${centreX(to)}V${to.y}`);
  }
  return parts.join("");
}

export function renderTree(parent: HTMLElement, layout: TreeLayout, host: TreeHost): void {
  const wrap = parent.createDiv({ cls: "gedcom-desk-tree" });
  const canvas = wrap.createDiv({ cls: "gedcom-desk-tree-canvas" });
  canvas.setCssProps({ width: `${layout.width}px`, height: `${layout.height}px` });

  const svg = parent.ownerDocument.createElementNS(SVG, "svg");
  svg.setAttribute("class", "gedcom-desk-tree-lines");
  svg.setAttribute("width", String(layout.width));
  svg.setAttribute("height", String(layout.height));
  const path = parent.ownerDocument.createElementNS(SVG, "path");
  path.setAttribute("d", linesOf(layout));
  svg.append(path);
  canvas.append(svg);

  for (const box of layout.boxes) {
    const node = canvas.createEl("button", { cls: "gedcom-desk-node" });
    node.setAttribute("type", "button");
    node.toggleClass("is-focus", box.focus);
    node.toggleClass("is-dim", box.dim);
    node.toggleClass("is-gap", box.gap);
    node.setCssProps({ left: `${box.x}px`, top: `${box.y}px` });
    node.createSpan({ cls: "gedcom-desk-node-name", text: box.label });
    node.createSpan({ cls: "gedcom-desk-node-years", text: box.years });
    if (box.up) {
      node.createSpan({ cls: ["gedcom-desk-node-more", "is-up"], text: "▲" }).setAttribute("aria-label", t("tree.moreUp"));
    }
    if (box.down) {
      node.createSpan({ cls: ["gedcom-desk-node-more", "is-down"], text: "▼" }).setAttribute("aria-label", t("tree.moreDown"));
    }
    const xref = box.xref;
    const expands = box.expands;
    if (expands) {
      node.addEventListener("click", () => host.toggleSiblings?.(expands));
    } else if (xref && !box.focus) {
      node.addEventListener("click", () => host.openRecord(xref));
    }
  }

  const legend = parent.createDiv({ cls: "gedcom-desk-legend" });
  legend.createSpan({ cls: "gedcom-desk-legend-gap", text: t("tree.legendGap") });
  legend.createSpan({ text: t("tree.legendMore") });

  const focus = layout.boxes.find((box) => box.id === layout.focus);
  if (focus) {
    parent.ownerDocument.defaultView?.requestAnimationFrame(() => {
      wrap.scrollLeft = centreX(focus) - wrap.clientWidth / 2;
    });
  }
}
