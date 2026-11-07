import type { Direction, FileGraphLayout, GraphBand, GraphCard, GraphLine, GraphNode, Point } from "./types";

/**
 * Turns a layout made with generations running down (x across, y along) to the
 * direction asked for. Cards exchange width and height with the axes; the order
 * of each generation, the crossings and the overlaps are not touched, and a
 * band keeps its place in the list of generations.
 */
export function orient(layout: FileGraphLayout, direction: Direction): FileGraphLayout {
  if (direction === "TB") {
    return layout;
  }
  const across = layout.width;
  const along = layout.height;
  const turned = direction === "LR" || direction === "RL";
  const flipped = direction === "BT" || direction === "RL";
  const point = ([x, y]: Point): Point => {
    const u = flipped ? along - y : y;
    return turned ? [u, x] : [x, u];
  };
  const box = (card: GraphCard): GraphCard => {
    const u = flipped ? along - card.y - card.height : card.y;
    return turned
      ? { ...card, x: u, y: card.x, width: card.height, height: card.width }
      : { ...card, y: u };
  };
  const cards = layout.cards.map(box);
  const nodes: GraphNode[] = layout.nodes.map((node) => {
    const [x, y] = point([node.x, node.y]);
    return { ...node, x, y, joins: node.joins.map((join) => join.map(point)) };
  });
  const lines: GraphLine[] = layout.lines.map((line) => ({ ...line, points: line.points.map(point) }));
  const bands: GraphBand[] = layout.bands.map((band) =>
    flipped ? { top: along - band.bottom, bottom: along - band.top } : band,
  );
  return {
    ...layout,
    cards,
    card: new Map(cards.map((one) => [one.id, one])),
    nodes,
    node: new Map(nodes.map((one) => [one.family, one])),
    lines,
    bands,
    width: turned ? along : across,
    height: turned ? across : along,
    direction,
  };
}

/** The start of a card across the generations, given a layout of `direction`: where `previous` positions are read. */
export function acrossOf(direction: Direction, card: { x: number; y: number }): number {
  return direction === "LR" || direction === "RL" ? card.y : card.x;
}
