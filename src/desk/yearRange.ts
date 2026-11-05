import { t } from "../i18n";
import type { MapEvent } from "./fileMap";
import { least, most } from "./fileTimeline";
import { yearText } from "./labels";

export interface YearRange {
  from: number;
  to: number;
}

export type Handle = "from" | "to";

export function boundsOf(events: readonly MapEvent[]): YearRange | null {
  const years = events.flatMap((event) => event.span ?? []);
  return years.length === 0 ? null : { from: least(years), to: most(years) };
}

const within = (value: number, bounds: YearRange): number => Math.min(bounds.to, Math.max(bounds.from, value));

export function clampRange(range: YearRange | null, bounds: YearRange | null): YearRange | null {
  if (range === null || bounds === null) {
    return null;
  }
  const from = within(range.from, bounds);
  const to = within(range.to, bounds);
  return { from: Math.min(from, to), to: Math.max(from, to) };
}

export function stepHandle(range: YearRange, handle: Handle, key: string, bounds: YearRange): YearRange {
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageUp: 10, PageDown: -10 };
  const moved = { ...range };
  const current = range[handle];
  const target =
    key === "Home" ? bounds.from : key === "End" ? bounds.to : steps[key] === undefined ? current : current + (steps[key] ?? 0);
  moved[handle] = within(target, bounds);
  if (handle === "from") {
    moved.from = Math.min(moved.from, range.to);
  } else {
    moved.to = Math.max(moved.to, range.from);
  }
  return moved;
}

export function keeps(event: MapEvent, range: YearRange | null): boolean {
  if (range === null) {
    return true;
  }
  return event.span !== undefined && event.span[0] <= range.to && event.span[1] >= range.from;
}

export function readout(range: YearRange): string {
  return t("map.years.readout", { from: yearText(range.from), to: yearText(range.to) });
}

export function chipText(range: YearRange | null): string {
  return range === null ? t("map.years.all") : t("map.years.range", { from: yearText(range.from), to: yearText(range.to) });
}

export const valueText = yearText;
