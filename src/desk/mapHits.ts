export const TARGET = 22;

export interface Item {
  key: string;
  x: number;
  y: number;
}

const CELLS = 64;

export class PlaceGrid<T extends Item> {
  private readonly cells = new Map<number, T[]>();

  constructor(items: readonly T[]) {
    for (const item of items) {
      const id = this.id(item.x, item.y);
      const held = this.cells.get(id);
      if (held === undefined) {
        this.cells.set(id, [item]);
      } else {
        held.push(item);
      }
    }
  }

  private static cell(value: number): number {
    return Math.min(CELLS - 1, Math.max(0, Math.floor(value * CELLS)));
  }

  private id(x: number, y: number): number {
    return PlaceGrid.cell(y) * CELLS + PlaceGrid.cell(x);
  }

  inRect(left: number, top: number, right: number, bottom: number): T[] {
    const found: T[] = [];
    for (let row = PlaceGrid.cell(top); row <= PlaceGrid.cell(bottom); row += 1) {
      for (let column = PlaceGrid.cell(left); column <= PlaceGrid.cell(right); column += 1) {
        for (const item of this.cells.get(row * CELLS + column) ?? []) {
          if (item.x >= left && item.x <= right && item.y >= top && item.y <= bottom) {
            found.push(item);
          }
        }
      }
    }
    return found;
  }

  nearest(x: number, y: number, within: number): T | undefined {
    let best: T | undefined;
    let distance = within;
    for (const item of this.inRect(x - within, y - within, x + within, y + within)) {
      const away = Math.hypot(item.x - x, item.y - y);
      if (away <= distance) {
        best = item;
        distance = away;
      }
    }
    return best;
  }
}

export function nearestMark<T extends { x: number; y: number }>(marks: readonly T[], x: number, y: number, within = TARGET): T | undefined {
  let best: T | undefined;
  let distance = within;
  for (const mark of marks) {
    const away = Math.hypot(mark.x - x, mark.y - y);
    if (away <= distance) {
      best = mark;
      distance = away;
    }
  }
  return best;
}
