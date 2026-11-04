import { layoutGraph } from "./fileGraph";
import { GraphCanvas, relatedIn, ZOOM, type CanvasScene, type PortraitContent } from "./graphCanvas";
import type { PersonTree } from "./personTree";

export interface TreeHost {
  /** A person, who becomes the focus, or a family, whose page opens. */
  openRecord(xref: string): void;
  toggleSiblings?(xref: string): void;
  setIcon?(element: HTMLElement, icon: string): void;
  /** The picture the person's page shows, where it can be shown. */
  portrait?(xref: string): PortraitContent | null;
}

/** What a page keeps of its tree between drawings, as the focus moves. */
export interface TreeMemory {
  k?: number;
  /** The focus was moved from the keyboard, which keeps the keyboard's focus on the new one. */
  keyboard?: boolean;
}

/** Below the scale at which cards lose their text, the tree opens around the focus instead of fitted. */
const TREE_FITS = ZOOM.far;

/** A person's tree on the graph's canvas, filling the tab and opening fitted to it. */
export function renderTree(parent: HTMLElement, tree: PersonTree, host: TreeHost, memory: TreeMemory = {}): GraphCanvas {
  const wrap = parent.createDiv({ cls: "gedcom-desk-graph" });
  const layout = layoutGraph(tree.input);
  const canvas = new GraphCanvas(wrap, {
    activateCard: (id, keyboard) => {
      const card = tree.cards.get(id);
      memory.keyboard = keyboard;
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
    viewChanged: (view) => {
      memory.k = view.k;
    },
  }, host.setIcon ? { setIcon: (element: HTMLElement, icon: string) => host.setIcon?.(element, icon) } : {});

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
            ...(card.given && card.surname ? { given: card.given, surname: card.surname } : {}),
            portrait: () => (card.xref ? (host.portrait?.(card.xref) ?? null) : null),
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
    related: (id) => {
      const lit = new Set<string>();
      const xref = tree.cards.get(id)?.xref;
      for (const copy of (xref ? tree.copies.get(xref) : undefined) ?? [id]) {
        for (const one of related(copy)) {
          lit.add(one);
        }
      }
      return lit;
    },
    copies: (id) => {
      const xref = tree.cards.get(id)?.xref;
      return (xref ? tree.copies.get(xref) : undefined) ?? [id];
    },
  };
  const children = [...tree.families.values()]
    .filter((family) => family.spouses.includes(tree.focus))
    .flatMap((family) => family.children);
  canvas.show(
    scene,
    memory.k === undefined ? { open: tree.focus, near: children, fits: TREE_FITS } : { centre: tree.focus, k: memory.k },
  );
  if (memory.keyboard) {
    memory.keyboard = false;
    canvas.focusCard(tree.focus);
  }
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
