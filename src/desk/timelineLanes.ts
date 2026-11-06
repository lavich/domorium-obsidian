export const GAP = 12;

export interface LaneBox {
  xref: string;
  left: number;
  right: number;
}

export function packLanes(
  boxes: readonly LaneBox[],
  near: (xref: string) => readonly string[],
): Map<string, number> {
  const lane = new Map<string, number>();
  const ends: number[] = [];
  const ordered = boxes
    .map((box, at) => ({ box, at }))
    .sort((a, b) => a.box.left - b.box.left || a.at - b.at);
  for (const { box } of ordered) {
    const anchors = near(box.xref)
      .map((xref) => lane.get(xref))
      .filter((at): at is number => at !== undefined);
    let chosen = -1;
    let closest = Infinity;
    for (let at = 0; at < ends.length; at += 1) {
      if ((ends[at] ?? 0) + GAP > box.left) {
        continue;
      }
      const distance = anchors.length === 0 ? 0 : Math.min(...anchors.map((anchor) => Math.abs(anchor - at)));
      if (distance < closest) {
        closest = distance;
        chosen = at;
        if (distance === 0 && anchors.length === 0) {
          break;
        }
      }
    }
    if (chosen < 0) {
      chosen = ends.length;
      ends.push(box.right);
    } else {
      ends[chosen] = box.right;
    }
    lane.set(box.xref, chosen);
  }
  return lane;
}
