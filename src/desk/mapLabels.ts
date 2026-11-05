export const LABEL_HEIGHT = 14;
export const LABEL_GAP = 4;

export interface LabelInput {
  key: string;
  x: number;
  y: number;
  radius: number;
  text: string;
  events: number;
  kept: boolean;
}

export interface PlacedLabel {
  key: string;
  x: number;
  y: number;
  side: "right" | "left";
  width: number;
}

export interface LabelResult {
  placed: Map<string, PlacedLabel>;
  comparisons: number;
}

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
  owner: string;
}

const CELL = 96;

class BoxIndex {
  private readonly cells = new Map<string, Box[]>();

  add(box: Box): void {
    for (let x = Math.floor(box.left / CELL); x <= Math.floor(box.right / CELL); x += 1) {
      for (let y = Math.floor(box.top / CELL); y <= Math.floor(box.bottom / CELL); y += 1) {
        const id = `${x},${y}`;
        const held = this.cells.get(id);
        if (held === undefined) {
          this.cells.set(id, [box]);
        } else {
          held.push(box);
        }
      }
    }
  }

  hits(box: Box, ignore: string, count: () => void): boolean {
    for (let x = Math.floor(box.left / CELL); x <= Math.floor(box.right / CELL); x += 1) {
      for (let y = Math.floor(box.top / CELL); y <= Math.floor(box.bottom / CELL); y += 1) {
        for (const other of this.cells.get(`${x},${y}`) ?? []) {
          count();
          if (
            other.owner !== ignore &&
            other.left < box.right &&
            other.right > box.left &&
            other.top < box.bottom &&
            other.bottom > box.top
          ) {
            return true;
          }
        }
      }
    }
    return false;
  }
}

export function placeLabels(
  inputs: readonly LabelInput[],
  measure: (text: string) => number,
  width: number,
): LabelResult {
  const markers = new BoxIndex();
  for (const one of inputs) {
    markers.add({ left: one.x - one.radius, right: one.x + one.radius, top: one.y - one.radius, bottom: one.y + one.radius, owner: one.key });
  }
  const labels = new BoxIndex();
  const placed = new Map<string, PlacedLabel>();
  let comparisons = 0;
  const count = (): void => {
    comparisons += 1;
  };
  const order = [...inputs].sort(
    (a, b) => Number(b.kept) - Number(a.kept) || b.events - a.events || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
  );
  for (const one of order) {
    const length = measure(one.text);
    for (const side of ["right", "left"] as const) {
      const left = side === "right" ? one.x + one.radius + LABEL_GAP : one.x - one.radius - LABEL_GAP - length;
      const box: Box = { left, right: left + length, top: one.y - LABEL_HEIGHT / 2, bottom: one.y + LABEL_HEIGHT / 2, owner: one.key };
      if (box.left < 0 || box.right > width) {
        continue;
      }
      if (labels.hits(box, one.key, count) || markers.hits(box, one.key, count)) {
        continue;
      }
      labels.add(box);
      placed.set(one.key, { key: one.key, x: side === "right" ? box.left : box.right, y: one.y, side, width: length });
      break;
    }
  }
  return { placed, comparisons };
}
