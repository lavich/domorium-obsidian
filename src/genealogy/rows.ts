import type { DocumentSymbol } from "@domorium/language-service";

import { readingOf, type DateReading } from "./dates";
import { readName, readNameParts } from "./names";
import { childOf, childrenOf, payload, rolePointers } from "./symbols";
import { CHILD_ROLE_TAGS, SPOUSE_ROLE_TAGS } from "./tags";
import type { DateOf, FamilyRow, IndexSource, PersonRow } from "./types";

export function familyName(names: string[]): string | undefined {
  return names.length > 0 ? names.join(" / ") : undefined;
}

export function rowOf(record: DocumentSymbol, dateOf: DateOf): PersonRow {
  const nameLines = childrenOf(record, "NAME");
  const name = readName(payload(nameLines[0]));
  const parts = readNameParts(payload(nameLines[0]));
  const otherNames = nameLines
    .slice(1)
    .map((line) => readName(payload(line)))
    .filter((other) => other !== name);

  const birthEvent = childOf(record, "BIRT");
  const deathEvent = childOf(record, "DEAT");
  const birth = payload(childOf(birthEvent ?? record, "DATE"));
  const death = payload(childOf(deathEvent ?? record, "DATE"));
  const place =
    payload(birthEvent && childOf(birthEvent, "PLAC")) ??
    payload(deathEvent && childOf(deathEvent, "PLAC"));

  const xref = record.detail || undefined;
  const sex = payload(childOf(record, "SEX"));

  const row: PersonRow = {
    ...(xref === undefined ? {} : { xref }),
    unaddressable: xref === undefined,
    name,
    ...(parts ?? {}),
    otherNames,
    ...(sex === undefined ? {} : { sex }),
    ...(birthEvent && birth !== undefined ? { birth: dateOf(birth) } : {}),
    ...(deathEvent && death !== undefined ? { death: dateOf(death) } : {}),
    ...(place === undefined ? {} : { place }),
    search: "",
  };
  row.search = searchTextOf(row);
  return row;
}

function searchTextOf(row: PersonRow): string {
  return [
    row.name,
    ...row.otherNames,
    row.xref ?? "",
    writtenYear(row.birth),
    writtenYear(row.death),
    row.place ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

export function writtenYear(date: DateReading | undefined): string {
  if (date?.year === undefined) {
    return "";
  }
  return String(date.year > 0 ? date.year : 1 - date.year);
}

export function readDatesOf(
  record: DocumentSymbol,
  language: IndexSource,
  into: Map<string, DateReading>,
): void {
  for (const child of record.children) {
    const date = payload(childOf(child, "DATE"));
    if (date !== undefined && !into.has(date)) {
      into.set(date, readingOf(date, language.readDate(date)));
    }
  }
}

export function familyRowOf(
  record: DocumentSymbol,
  rows: ReadonlyMap<string, PersonRow>,
  dateOf: DateOf,
): FamilyRow {
  const spouseNames: string[] = [];
  for (const pointer of rolePointers(record, SPOUSE_ROLE_TAGS)) {
    const spouse = rows.get(pointer);
    if (spouse) {
      spouseNames.push(spouse.name);
    }
  }
  const marriageEvent = record.children.find(
    (child) => child.name === "MARR",
  );
  const date = payload(marriageEvent && childOf(marriageEvent, "DATE"));
  const place = payload(marriageEvent && childOf(marriageEvent, "PLAC"));
  const xref = record.detail || undefined;
  const name = familyName(spouseNames);

  const row: FamilyRow = {
    ...(xref === undefined ? {} : { xref }),
    unaddressable: xref === undefined,
    spouseNames,
    ...(name === undefined ? {} : { name }),
    ...(date === undefined ? {} : { marriage: dateOf(date) }),
    ...(place === undefined ? {} : { place }),
    childCount: rolePointers(record, CHILD_ROLE_TAGS).length,
    search: "",
  };
  row.search = [
    ...spouseNames,
    xref ?? "",
    writtenYear(row.marriage),
    place ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return row;
}
