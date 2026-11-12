import type { GedcomLanguageService, Position, StructureEditResult } from "@domorium/language-service";

import type { GenealogyIndex, PersonEvent } from "../genealogy";
import { plural } from "../i18n";
import { joinEdits, type Refusal } from "./edits";
import { placeKey, placesOf } from "./placeRows";

export const NAME_EMPTY = "place-name-empty";

/** A `PLAC` line the Places list groups into a place, with the event that holds it. */
export interface PlaceLine {
  record: string;
  event: PersonEvent;
  at: Position;
  /** The name as this line writes it. */
  text: string;
}

/** What renaming a place writes: the lines that change, the name they get, and the place it joins where it is another's. */
export interface Rename {
  value: string;
  lines: Position[];
  joins?: string;
}

const before = (left: Position, right: Position): number => left.line - right.line || left.character - right.character;

export function placeLines(index: GenealogyIndex, key: string): PlaceLine[] {
  const found: PlaceLine[] = [];
  const seen = new Set<string>();
  const take = (record: string | undefined, events: readonly PersonEvent[]): void => {
    if (record === undefined || seen.has(record)) {
      return;
    }
    seen.add(record);
    const lines = index.record(record);
    for (const event of events) {
      if (event.place === undefined || placeKey(event.place) !== key) {
        continue;
      }
      const line = lines?.children.find((child) => child.range.start.line === event.range.start.line);
      const plac = line?.children.find((child) => child.tag === "PLAC");
      if (plac) {
        found.push({ record, event, at: plac.range.start, text: plac.text ?? "" });
      }
    }
  };
  for (const row of index.people) {
    take(row.xref, row.xref === undefined ? [] : (index.person(row.xref)?.events ?? []));
  }
  for (const row of index.families) {
    take(row.xref, row.xref === undefined ? [] : (index.family(row.xref)?.events ?? []));
  }
  return found.sort((left, right) => before(left.at, right.at));
}

/** The rename a typed name asks for; null where no line would change. */
export function planRename(index: GenealogyIndex, key: string, typed: string): Rename | Refusal | null {
  const value = typed.trim();
  if (value === "") {
    return { ok: false, code: NAME_EMPTY, message: "A place needs a name." };
  }
  const lines = placeLines(index, key)
    .filter((line) => line.text !== value)
    .map((line) => line.at);
  if (lines.length === 0) {
    return null;
  }
  const target = placeKey(value);
  const joins = target === key ? undefined : placesOf(index).find((row) => row.key === target)?.name;
  return joins === undefined ? { value, lines } : { value, lines, joins };
}

export function renameEdit(service: GedcomLanguageService, rename: Rename, version: number): StructureEditResult | Refusal {
  return joinEdits(rename.lines.map((at) => service.setValue(at, { value: rename.value }, version)));
}

export function renameQuestion({ lines, joins }: Rename): string {
  return joins === undefined
    ? plural("place.renameQuestion", lines.length)
    : plural("place.mergeQuestion", lines.length, { place: joins });
}
