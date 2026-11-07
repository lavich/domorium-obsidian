import { CARD, type GraphCard, type GraphNode } from "./fileGraph";
import { least, most } from "./fileTimeline";
import { curve, nodeShape, svg } from "./cardRender";
import type { CanvasCard, CanvasScene } from "./graphCanvas";

type ItemKind = "card" | "node" | "line";

export interface Item {
  kind: ItemKind;
  id: string;
  left: number;
  top: number;
  right: number;
  bottom: number;
  make(far: boolean): SVGElement;
}

export function buildItems(
  scene: CanvasScene,
  doc: Document,
  makeCard: (card: { placed: GraphCard; shown: CanvasCard }, far: boolean) => SVGElement,
): { placed: Item[]; lines: Item[] } {
  const { layout } = scene;
  const nodesAfter = new Map<string, GraphNode[]>();
  for (const node of layout.nodes) {
    const [first] = node.spouses;
    nodesAfter.set(first, [...(nodesAfter.get(first) ?? []), node]);
  }
  const placed: Item[] = [];
  for (const card of layout.cards) {
    const shown = scene.card(card.id);
    if (!shown) {
      continue;
    }
    placed.push({
      kind: "card",
      id: card.id,
      left: card.x,
      top: card.y,
      right: card.x + CARD.width,
      bottom: card.y + card.height,
      make: (far) => makeCard({ placed: card, shown }, far),
    });
    for (const node of nodesAfter.get(card.id) ?? []) {
      const family = scene.family(node.family);
      if (!family) {
        continue;
      }
      const xs = [node.x, ...node.joins.flat().map((point) => point[0])];
      const ys = [node.y, ...node.joins.flat().map((point) => point[1])];
      placed.push({
        kind: "node",
        id: node.family,
        left: least(xs) - 11,
        top: least(ys) - 11,
        right: most(xs) + 11,
        bottom: most(ys) + 11,
        make: (far) => nodeShape(doc, node, family, far),
      });
    }
  }
  const lines = layout.lines.map((line): Item => {
    const xs = line.points.map((point) => point[0]);
    const ys = line.points.map((point) => point[1]);
    return {
      kind: "line",
      id: line.family,
      left: least(xs),
      top: least(ys),
      right: most(xs),
      bottom: most(ys),
      make: () =>
        svg(doc, "path", "gedcom-fg-line", {
          d: curve(line.points),
          "data-f": line.family,
          "data-child": line.child,
        }),
    };
  });
  return { placed, lines };
}
