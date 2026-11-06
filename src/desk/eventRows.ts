import type { FamilyRow, GenealogyIndex, PersonEvent, PersonRow } from "../genealogy";
import { UNNAMED } from "../genealogy";
import { currentLanguage } from "../i18n";
import { foldText } from "./foldText";
import { eventName, familyTitle, personName } from "./labels";
import { orderRows, type SortValue } from "./listOrder";
import type { ListSort } from "./listRows";
import type { FactKey } from "./personPage";

export interface EventRow {
  xref: string;
  fact: FactKey;
  key: string;
  event: PersonEvent;
  person?: PersonRow;
  family?: FamilyRow;
}

const LINE_WIDTH = 100_000;

const position = (event: PersonEvent): number => event.range.start.line * LINE_WIDTH + event.range.start.character;

export function eventTitle(event: PersonEvent): string {
  const text = event.value?.trim();
  const name = eventName(event);
  return text && text !== "Y" ? `${name} · ${text}` : name;
}

export const recordName = ({ person, family }: EventRow): string =>
  person !== undefined ? personName(person) : familyTitle(family?.spouseNames ?? []);

const held = new WeakMap<GenealogyIndex, EventRow[]>();

export function eventsOf(index: GenealogyIndex): EventRow[] {
  let rows = held.get(index);
  if (rows === undefined) {
    const found: EventRow[] = [];
    const take = (xref: string, prefix: "p" | "f", events: PersonEvent[], record: Pick<EventRow, "person" | "family">): void => {
      events.forEach((event, at) => {
        const fact = `${prefix}:${at}`;
        found.push({ xref, fact, key: `${xref}|${fact}`, event, ...record });
      });
    };
    for (const row of index.people) {
      const person = row.xref === undefined ? undefined : index.person(row.xref);
      if (row.xref !== undefined && person !== undefined) {
        take(row.xref, "p", person.events, { person: row });
      }
    }
    for (const row of index.families) {
      const family = row.xref === undefined ? undefined : index.family(row.xref);
      if (row.xref !== undefined && family !== undefined) {
        take(row.xref, "f", family.events, { family: row });
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
  if (person !== undefined) {
    if (person.name === UNNAMED) {
      return undefined;
    }
    return person.surname !== undefined || person.given !== undefined ? [person.surname ?? "", person.given ?? ""] : [person.name];
  }
  return family === undefined || family.spouseNames.length === 0 ? undefined : [familyTitle(family.spouseNames)];
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
  const shown = eventsOf(index).filter((row) => wanted === "" || searchText(row).includes(wanted));
  return sort === undefined ? shown : orderRows(shown, shown.map((row) => sortValue(row, sort.by)), sort.dir, collator);
}

export const eventCells = (row: EventRow): string[] => [eventTitle(row.event), recordName(row), row.event.date?.text ?? "", row.event.place ?? ""];
