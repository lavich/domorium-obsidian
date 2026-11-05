import type { Coordinates } from "../genealogy/types";
import type { FileMap } from "./fileMap";
import { least, most } from "./fileTimeline";
import { yearText } from "./labels";
import { orderRows, type SortValue } from "./listOrder";
import type { ListSort } from "./listRows";
import { foldText } from "./mapSearch";
import { placeKey } from "./placesTable";

export interface PlaceRow {
  xref?: undefined;
  key: string;
  name: string;
  events: number;
  years?: [number, number];
  coordinates?: Coordinates;
}

const held = new WeakMap<FileMap, PlaceRow[]>();

export function placesOf(map: FileMap): PlaceRow[] {
  let rows = held.get(map);
  if (rows === undefined) {
    const byKey = new Map<string, PlaceRow>();
    for (const event of map.events) {
      const key = placeKey(event.place);
      const place = map.places.get(key);
      if (place === undefined) {
        continue;
      }
      let row = byKey.get(key);
      if (row === undefined) {
        row = { key, name: place.name, events: 0, ...(place.coordinates === undefined ? {} : { coordinates: place.coordinates }) };
        byKey.set(key, row);
      }
      row.events += 1;
      if (event.span !== undefined) {
        const [from, to] = event.span;
        row.years = row.years === undefined ? [from, to] : [least([row.years[0], from]), most([row.years[1], to])];
      }
    }
    rows = [...byKey.values()];
    held.set(map, rows);
  }
  return rows;
}

function sortValue(row: PlaceRow, by: ListSort["by"]): SortValue {
  switch (by) {
    case "events":
      return row.events;
    case "years":
      return row.years?.[0];
    case "coordinates":
      return row.coordinates === undefined ? 0 : 1;
    default:
      return [row.name];
  }
}

export function placeRows(map: FileMap, { query, sort }: { query: string; sort: ListSort | undefined }, collator: Intl.Collator): PlaceRow[] {
  const wanted = foldText(query.trim());
  const shown = placesOf(map).filter((row) => wanted === "" || foldText(row.name).includes(wanted));
  const by = sort?.by ?? "place";
  return orderRows(shown, shown.map((row) => sortValue(row, by)), sort?.dir ?? "asc", collator);
}

export const yearsText = ({ years }: PlaceRow): string =>
  years === undefined ? "" : years[0] === years[1] ? yearText(years[0]) : `${yearText(years[0])}–${yearText(years[1])}`;

const degrees = (value: number): string => String(Number(value.toFixed(4)));

export const coordinatesText = ({ coordinates }: PlaceRow): string =>
  coordinates === undefined ? "" : `${degrees(coordinates.latitude)}, ${degrees(coordinates.longitude)}`;
