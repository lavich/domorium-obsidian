import type { GenealogyIndex, PersonEvent } from "../genealogy";
import type { Coordinates } from "../genealogy/types";
import { fileTimelineOf, kindOf, least, type MarkKind, most } from "./fileTimeline";
import { shortPlace, yearText } from "./labels";
import { placeKey } from "./placeRows";

export { placeKey };

export interface MapEvent {
  record: string;
  family: boolean;
  kind: MarkKind;
  tag: string;
  type?: string;
  place: string;
  year?: number;
  span?: [number, number];
  order: number;
}

export interface MapPlace {
  key: string;
  name: string;
  coordinates?: Coordinates;
}

export interface FileMap {
  places: ReadonlyMap<string, MapPlace>;
  events: readonly MapEvent[];
  byRecord: ReadonlyMap<string, readonly MapEvent[]>;
}

export interface PlaceGroup {
  place: MapPlace;
  events: MapEvent[];
}

export interface Stop {
  key: string;
  number: number;
}

export interface Route {
  stops: Stop[];
  numbers: ReadonlyMap<string, number[]>;
}

export const NO_ROUTE: Route = { stops: [], numbers: new Map() };

const LINE_WIDTH = 100_000;

function eventOf(event: PersonEvent, record: string, family: boolean): MapEvent | null {
  const place = event.place?.trim().replace(/\s+/gu, " ");
  if (place === undefined || place === "") {
    return null;
  }
  const date = event.date;
  const first = date?.year;
  const ends = first === undefined ? [] : [first, date?.end ?? first];
  const span: [number, number] | undefined =
    first === undefined ? undefined : [least(ends), most(ends)];
  return {
    record,
    family,
    kind: kindOf(event.tag),
    tag: event.tag,
    ...(event.type === undefined ? {} : { type: event.type }),
    place,
    ...(span === undefined ? {} : { year: span[0], span }),
    order: event.range.start.line * LINE_WIDTH + event.range.start.character,
  };
}

function coordinatesOf(event: PersonEvent): Coordinates | undefined {
  return event.place === undefined ? undefined : event.coordinates;
}

export function buildFileMap(index: GenealogyIndex): FileMap {
  const events: MapEvent[] = [];
  const fromFile = new Map<string, { order: number; coordinates: Coordinates }>();
  const names = new Map<string, { order: number; name: string }>();
  const take = (source: PersonEvent[], record: string, family: boolean): void => {
    for (const event of source) {
      const one = eventOf(event, record, family);
      if (one === null) {
        continue;
      }
      events.push(one);
      const key = placeKey(one.place);
      const named = names.get(key);
      if (named === undefined || one.order < named.order) {
        names.set(key, { order: one.order, name: one.place });
      }
      const coordinates = coordinatesOf(event);
      const held = fromFile.get(key);
      if (coordinates !== undefined && (held === undefined || one.order < held.order)) {
        fromFile.set(key, { order: one.order, coordinates });
      }
    }
  };
  for (const row of index.people) {
    const person = row.xref === undefined ? undefined : index.person(row.xref);
    if (person?.xref !== undefined) {
      take(person.events, person.xref, false);
    }
  }
  for (const row of index.families) {
    const family = row.xref === undefined ? undefined : index.family(row.xref);
    if (family?.xref !== undefined) {
      take(family.events, family.xref, true);
    }
  }
  events.sort((a, b) => a.order - b.order);
  const places = new Map<string, MapPlace>();
  for (const [key, { name }] of names) {
    const coordinates = fromFile.get(key)?.coordinates;
    places.set(key, { key, name, ...(coordinates === undefined ? {} : { coordinates }) });
  }
  const byRecord = new Map<string, MapEvent[]>();
  for (const event of events) {
    const held = byRecord.get(event.record);
    if (held === undefined) {
      byRecord.set(event.record, [event]);
    } else {
      held.push(event);
    }
  }
  return { places, events, byRecord };
}

const held = new WeakMap<GenealogyIndex, FileMap>();

export function fileMapOf(index: GenealogyIndex): FileMap {
  let built = held.get(index);
  if (built === undefined) {
    built = buildFileMap(index);
    held.set(index, built);
  }
  return built;
}

export function mapSelection(index: GenealogyIndex, xref: string | null | undefined): string | null {
  if (xref === null || xref === undefined) {
    return null;
  }
  return index.person(xref) || index.family(xref) ? xref : null;
}

export function branchOf(index: GenealogyIndex, focus: string, up: number, down: number): Set<string> {
  return fileTimelineOf(index).branch(focus, up, down);
}

export function scopeEvents(map: FileMap, index: GenealogyIndex, branch: ReadonlySet<string> | null): MapEvent[] {
  if (branch === null) {
    return [...map.events];
  }
  const spouses = new Map<string, boolean>();
  const familyIn = (xref: string): boolean => {
    let found = spouses.get(xref);
    if (found === undefined) {
      found = index.family(xref)?.spouses.some((spouse) => spouse.xref !== undefined && branch.has(spouse.xref)) ?? false;
      spouses.set(xref, found);
    }
    return found;
  };
  return map.events.filter((event) => (event.family ? familyIn(event.record) : branch.has(event.record)));
}

export function recordEvents(map: FileMap, index: GenealogyIndex, xref: string): MapEvent[] {
  const own = map.byRecord.get(xref) ?? [];
  const families = (index.person(xref)?.spouseFamilies ?? []).flatMap((row) =>
    row.xref === undefined ? [] : (map.byRecord.get(row.xref) ?? []),
  );
  return [...own, ...families];
}

export function groupByPlace(map: FileMap, events: readonly MapEvent[]): PlaceGroup[] {
  const groups = new Map<string, PlaceGroup>();
  for (const event of events) {
    const key = placeKey(event.place);
    const place = map.places.get(key);
    if (place === undefined) {
      continue;
    }
    const group = groups.get(key);
    if (group === undefined) {
      groups.set(key, { place, events: [event] });
    } else {
      group.events.push(event);
    }
  }
  return [...groups.values()];
}

export function routeOf(
  map: FileMap,
  index: GenealogyIndex,
  xref: string,
  keep: (event: MapEvent) => boolean = () => true,
): Route {
  const ordered = recordEvents(map, index, xref)
    .filter((event) => event.year !== undefined && keep(event) && map.places.get(placeKey(event.place))?.coordinates !== undefined)
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || a.order - b.order);
  if (ordered.length === 0) {
    return NO_ROUTE;
  }
  const stops: Stop[] = [];
  const numbers = new Map<string, number[]>();
  for (const event of ordered) {
    const key = placeKey(event.place);
    if (stops.at(-1)?.key === key) {
      continue;
    }
    const number = stops.length + 1;
    stops.push({ key, number });
    numbers.set(key, [...(numbers.get(key) ?? []), number]);
  }
  return { stops, numbers };
}

export function placeLabel(place: MapPlace, events: readonly MapEvent[]): string {
  const name = shortPlace(place.name) ?? place.name;
  const years = events.flatMap((event) => event.span ?? []);
  if (years.length === 0) {
    return name;
  }
  const from = least(years);
  const to = most(years);
  return from === to ? `${name} · ${yearText(from)}` : `${name} · ${yearText(from)}–${yearText(to)}`;
}

export function orderedPlaces<T extends { place: MapPlace }>(groups: readonly T[], collator: Intl.Collator): T[] {
  return [...groups].sort((a, b) => collator.compare(a.place.name, b.place.name) || (a.place.key < b.place.key ? -1 : 1));
}
