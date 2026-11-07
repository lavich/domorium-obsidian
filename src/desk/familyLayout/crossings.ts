/**
 * The crossings of lines between two rows, each line given by its x in the
 * upper row and in the lower: inversions counted with a Fenwick tree. Lines
 * sharing an end do not cross.
 */
export function countCrossings(segments: readonly (readonly [number, number])[]): number {
  if (segments.length < 2) {
    return 0;
  }
  const sorted = [...segments].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const lows = [...new Set(sorted.map((segment) => segment[1]))].sort((a, b) => a - b);
  const rank = new Map(lows.map((value, at) => [value, at + 1]));
  const tree = new Array<number>(lows.length + 1).fill(0);
  let crossings = 0;
  sorted.forEach((segment, seen) => {
    const at = rank.get(segment[1]) ?? 1;
    let notAbove = 0;
    for (let i = at; i > 0; i -= i & -i) {
      notAbove += tree[i] ?? 0;
    }
    crossings += seen - notAbove;
    for (let i = at; i < tree.length; i += i & -i) {
      tree[i] = (tree[i] ?? 0) + 1;
    }
  });
  return crossings;
}
