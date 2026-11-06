export interface YearGeometry {
  lo: number;
  zoom: number;
  pad: number;
  chartLeft: number;
}

export function yearAtX(geometry: YearGeometry, clientX: number): number {
  return Math.round(geometry.lo + (clientX - geometry.chartLeft - geometry.pad) / geometry.zoom);
}

export function personOf(target: EventTarget | null): string | null {
  const found = target instanceof Element ? target.closest("[data-p]") : null;
  return found?.getAttribute("data-p") ?? null;
}

export function barOf(target: EventTarget | null): string | null {
  const found = target instanceof Element ? target.closest(".gedcom-ft-life, .gedcom-ft-label") : null;
  return found?.getAttribute("data-p") ?? null;
}

export function markOf<T>(target: EventTarget | null, marks: ReadonlyMap<Element, T>): T | null {
  const found = target instanceof Element ? target.closest(".gedcom-ft-mark") : null;
  return found ? (marks.get(found) ?? null) : null;
}

export function missesQuery(query: string, searchText: ReadonlyMap<string, string>, ids: readonly string[]): boolean {
  return query !== "" && ids.every((xref) => !(searchText.get(xref) ?? "").includes(query));
}
