import { t } from "../i18n";
import { layoutGraph } from "./fileGraph";
import { zoomButtons } from "./fileGraphView";
import { GraphCanvas, relatedIn, type CanvasScene } from "./graphCanvas";
import type { PersonTree } from "./personTree";

export interface TreeHost {
  /** A person, who becomes the focus, or a family, whose page opens. */
  openRecord(xref: string): void;
  toggleSiblings?(xref: string): void;
  setIcon?(element: HTMLElement, icon: string): void;
}

const ZOOM_SIGNS: Record<string, string> = { minus: "−", plus: "+" };

/** A person's tree on the graph's canvas, opening with the focus in view. */
export function renderTree(parent: HTMLElement, tree: PersonTree, host: TreeHost): GraphCanvas {
  const wrap = parent.createDiv({ cls: "gedcom-desk-graph" });
  const tools = wrap.createDiv({ cls: "gedcom-desk-graph-tools gedcom-fg-zoom" });
  const layout = layoutGraph(tree.input);
  const canvas = new GraphCanvas(wrap, {
    activateCard: (id) => {
      const card = tree.cards.get(id);
      if (card?.expands) {
        host.toggleSiblings?.(card.expands);
      } else if (card?.xref && !card.focus) {
        host.openRecord(card.xref);
      }
    },
    activateFamily: (id) => {
      const xref = tree.families.get(id)?.xref;
      if (xref) {
        host.openRecord(xref);
      }
    },
    viewChanged: () => undefined,
  });
  zoomButtons(tools, canvas, (element, icon) => {
    if (host.setIcon) {
      host.setIcon(element, icon);
    } else {
      element.setText(ZOOM_SIGNS[icon] ?? icon);
    }
  });

  const legend = wrap.createDiv({ cls: "gedcom-desk-legend" });
  const entry = (cls: string, text: string) => {
    const item = legend.createSpan({ cls: "gedcom-fg-legend-item" });
    item.createSpan({ cls: `gedcom-fg-swatch ${cls}` });
    item.appendText(text);
  };
  entry("is-f", t("overview.legend.woman"));
  entry("is-m", t("overview.legend.man"));
  entry("is-u", t("overview.legend.unknown"));
  entry("is-family", t("fileGraph.legend.family"));
  entry("is-undated", t("fileGraph.legend.undated"));
  legend.createSpan({ cls: "gedcom-desk-legend-gap", text: t("tree.legendGap") });
  legend.createSpan({ text: t("tree.legendMore") });

  const related = relatedIn(layout, tree.families.values());
  const scene: CanvasScene = {
    layout,
    card: (id) => {
      const card = tree.cards.get(id);
      return card
        ? {
            name: card.label,
            years: card.years,
            sex: card.sex,
            focus: card.focus,
            aside: card.dim,
            gap: card.gap,
            up: card.up,
            down: card.down,
          }
        : undefined;
    },
    family: (id) => {
      const family = tree.families.get(id);
      return family
        ? {
            couple: family.couple,
            ...(family.date ? { date: family.date } : {}),
            ...(family.place ? { place: family.place } : {}),
            children: family.childCount,
          }
        : undefined;
    },
    related,
  };
  canvas.show(scene, { open: tree.focus });
  const measure = (): void => {
    if (canvas.el.isConnected) {
      canvas.resized();
    }
  };
  measure();
  const win = parent.ownerDocument.defaultView;
  win?.requestAnimationFrame(measure);
  if (win && "ResizeObserver" in win) {
    const observer = new win.ResizeObserver(() => {
      if (!canvas.el.isConnected) {
        observer.disconnect();
        return;
      }
      measure();
    });
    observer.observe(canvas.el);
  }
  return canvas;
}
