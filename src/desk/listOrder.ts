export type SortValue = number | string[] | undefined;

function compareValues(a: Exclude<SortValue, undefined>, b: Exclude<SortValue, undefined>, collator: Intl.Collator): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  const left = a as string[];
  const right = b as string[];
  for (let at = 0; at < Math.max(left.length, right.length); at += 1) {
    const order = collator.compare(left[at] ?? "", right[at] ?? "");
    if (order !== 0) {
      return order;
    }
  }
  return 0;
}

/** Ties keep the file's order in both directions, and a missing value comes last in both. */
export function orderRows<T>(rows: readonly T[], values: readonly SortValue[], dir: "asc" | "desc", collator: Intl.Collator): T[] {
  const sign = dir === "asc" ? 1 : -1;
  const order = rows.map((_, at) => at);
  order.sort((one, other) => {
    const a = values[one];
    const b = values[other];
    if (a === undefined || b === undefined) {
      if (a === b) {
        return one - other;
      }
      return a === undefined ? 1 : -1;
    }
    return sign * compareValues(a, b, collator) || one - other;
  });
  return order.map((at) => rows[at]);
}
