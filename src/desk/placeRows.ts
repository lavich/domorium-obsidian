import type { GenealogyIndex, PersonEvent } from "../genealogy";
import { least, most } from "./fileTimeline";
import { foldText } from "./foldText";
import { yearText } from "./labels";
import { orderRows, type SortValue } from "./listOrder";
import type { ListSort } from "./listRows";

export interface PlaceRow {
  xref?: undefined;
  key: string;
  name: string;
  events: number;
  years?: [number, number];
}

const LINE_WIDTH = 100_000;
const PLACE_PREFIX = "place:";

export function placeKey(text: string): string {
  return text.trim().replace(/\s+/gu, " ").normalize("NFC").toLowerCase();
}

const held = new WeakMap<GenealogyIndex, PlaceRow[]>();

export function placesOf(index: GenealogyIndex): PlaceRow[] {
  let rows = held.get(index);
  if (rows === undefined) {
    const found = new Map<string, { order: number; row: PlaceRow }>();
    const take = (events: PersonEvent[]): void => {
      for (const event of events) {
        const name = event.place?.trim().replace(/\s+/gu, " ");
        if (name === undefined || name === "") {
          continue;
        }
        const key = placeKey(name);
        const order = event.range.start.line * LINE_WIDTH + event.range.start.character;
        let place = found.get(key);
        if (place === undefined) {
          place = { order, row: { key, name, events: 0 } };
          found.set(key, place);
        } else if (order < place.order) {
          place.order = order;
          place.row.name = name;
        }
        place.row.events += 1;
        const first = event.date?.year;
        if (first !== undefined) {
          const ends = [first, event.date?.end ?? first];
          const years = place.row.years;
          place.row.years = years === undefined ? [least(ends), most(ends)] : [least([years[0], ...ends]), most([years[1], ...ends])];
        }
      }
    };
    for (const row of index.people) {
      const person = row.xref === undefined ? undefined : index.person(row.xref);
      if (person !== undefined) {
        take(person.events);
      }
    }
    for (const row of index.families) {
      const family = row.xref === undefined ? undefined : index.family(row.xref);
      if (family !== undefined) {
        take(family.events);
      }
    }
    rows = [...found.values()].sort((a, b) => a.order - b.order).map(({ row }) => row);
    held.set(index, rows);
  }
  return rows;
}

function sortValue(row: PlaceRow, by: ListSort["by"]): SortValue {
  switch (by) {
    case "events":
      return row.events;
    case "years":
      return row.years?.[0];
    default:
      return [row.name];
  }
}

export const placeId = (name: string): string => `${PLACE_PREFIX}${placeKey(name)}`;

export const placeKeyOf = (id: string): string | null => (id.startsWith(PLACE_PREFIX) ? id.slice(PLACE_PREFIX.length) : null);

export function placeAt(index: GenealogyIndex, id: string): PlaceRow | undefined {
  const key = placeKeyOf(id);
  return key === null ? undefined : placesOf(index).find((row) => row.key === key);
}

export function placeRows(index: GenealogyIndex, { query, sort }: { query: string; sort: ListSort | undefined }, collator: Intl.Collator): PlaceRow[] {
  const wanted = foldText(query.trim());
  const shown = placesOf(index).filter((row) => wanted === "" || foldText(row.name).includes(wanted));
  const by = sort?.by ?? "place";
  return orderRows(shown, shown.map((row) => sortValue(row, by)), sort?.dir ?? "asc", collator);
}

export const yearsText = ({ years }: PlaceRow): string =>
  years === undefined ? "" : years[0] === years[1] ? yearText(years[0]) : `${yearText(years[0])}–${yearText(years[1])}`;
