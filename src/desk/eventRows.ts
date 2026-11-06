import type { FamilyRow, GenealogyIndex, PersonEvent, PersonRow } from "../genealogy";
import { currentLanguage } from "../i18n";
import { foldText } from "./foldText";
import { eventName, familySortKey, familyTitle, personName, personSortKey } from "./labels";
import { orderRows, type SortValue } from "./listOrder";
import type { FactKey } from "./personPage";
import type { ListSort } from "./listRows";

export interface EventRow {
  xref?: undefined;
  key: string;
  owner: string;
  event: PersonEvent;
  person?: PersonRow;
  family?: FamilyRow;
}

const EVENT_PREFIX = "event:";
const EVENT_ID = /^event:(.+):([A-Za-z0-9_]+):(0|[1-9]\d*)$/u;

export const eventId = (owner: string, tag: string, nth: number): string => `${EVENT_PREFIX}${owner}:${tag}:${nth}`;

export interface EventTarget {
  owner: string;
  event: PersonEvent;
  fact: FactKey;
}

export function eventAt(index: GenealogyIndex, id: string): EventTarget | undefined {
  const found = EVENT_ID.exec(id);
  if (found === null) {
    return undefined;
  }
  const [, owner = "", tag, nth] = found;
  const person = index.person(owner);
  const events = (person ?? index.family(owner))?.events ?? [];
  const event = events.filter((one) => one.tag === tag)[Number(nth)];
  return event === undefined ? undefined : { owner, event, fact: `${person ? "p" : "f"}:${events.indexOf(event)}` };
}

export function eventOwner(id: string | null): string | null {
  return id === null ? null : (EVENT_ID.exec(id)?.[1] ?? null);
}

const LINE_WIDTH = 100_000;

const position = (event: PersonEvent): number => event.range.start.line * LINE_WIDTH + event.range.start.character;

export function eventIdOf(owner: string, events: PersonEvent[], event: PersonEvent): string {
  const before = events.filter((one) => one.tag === event.tag && position(one) < position(event)).length;
  return eventId(owner, event.tag, before);
}

export function eventTitle(event: PersonEvent): string {
  const text = event.value?.trim();
  const name = eventName(event);
  return text && text !== "Y" ? `${name} · ${text}` : name;
}

export const recordName = ({ person, family }: EventRow): string =>
  person !== undefined ? personName(person) : familyTitle(family?.spouseNames ?? []);

const held = new WeakMap<GenealogyIndex, EventRow[]>();

export function collectEvents(index: GenealogyIndex): EventRow[] {
  let rows = held.get(index);
  if (rows === undefined) {
    const found: EventRow[] = [];
    const seen = new Set<string>();
    const take = (owner: string, events: PersonEvent[], record: Pick<EventRow, "person" | "family">): void => {
      if (seen.has(owner)) {
        return;
      }
      seen.add(owner);
      const counted = new Map<string, number>();
      for (const event of events) {
        const nth = counted.get(event.tag) ?? 0;
        counted.set(event.tag, nth + 1);
        found.push({ owner, key: eventId(owner, event.tag, nth), event, ...record });
      }
    };
    for (const row of index.people) {
      const person = row.xref === undefined ? undefined : index.person(row.xref);
      if (row.xref !== undefined && person !== undefined) {
        take(row.xref, person.events, { person: row });
      }
    }
    for (const row of index.families) {
      const family = row.xref === undefined ? undefined : index.family(row.xref);
      if (row.xref !== undefined && family !== undefined) {
        take(row.xref, family.events, { family: row });
      }
    }
    rows = found.sort((a, b) => position(a.event) - position(b.event));
    held.set(index, rows);
  }
  return rows;
}

const folded = new WeakMap<EventRow, { language: string; text: string }>();

function searchText(row: EventRow): string {
  const language = currentLanguage();
  let held = folded.get(row);
  if (held?.language !== language) {
    held = { language, text: foldText([eventTitle(row.event), recordName(row), row.event.date?.text ?? "", row.event.place ?? ""].join("\n")) };
    folded.set(row, held);
  }
  return held.text;
}

const text = (value: string | undefined): SortValue => (value ? [value] : undefined);

function recordSort(row: EventRow): SortValue {
  const { person, family } = row;
  return person !== undefined ? personSortKey(person) : familySortKey(family?.spouseNames ?? []);
}

function sortValue(row: EventRow, by: ListSort["by"]): SortValue {
  switch (by) {
    case "record":
      return recordSort(row);
    case "date":
      return row.event.date?.year;
    case "place":
      return text(row.event.place);
    default:
      return [eventTitle(row.event)];
  }
}

export function eventRows(index: GenealogyIndex, { query, sort }: { query: string; sort: ListSort | undefined }, collator: Intl.Collator): EventRow[] {
  const wanted = foldText(query.trim());
  const shown = collectEvents(index).filter((row) => wanted === "" || searchText(row).includes(wanted));
  return sort === undefined ? shown : orderRows(shown, shown.map((row) => sortValue(row, sort.by)), sort.dir, collator);
}

export const eventCells = (row: EventRow): string[] => [eventTitle(row.event), recordName(row), row.event.date?.text ?? "", row.event.place ?? ""];
