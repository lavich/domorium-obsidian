import type { FamilyRow, GenealogyIndex, PersonRow, SourceRow } from "../genealogy";
import { UNNAMED, UNTITLED } from "../genealogy";
import type { Language, MessageKey } from "../i18n";
import { familyTitle, personName, sourceTitle, year, yearsOf } from "./labels";

export type ListKind = "people" | "families" | "sources";

export const LIST_KINDS: readonly ListKind[] = ["people", "families", "sources"];

export type SortKey =
  | "name"
  | "years"
  | "place"
  | "sources"
  | "spouses"
  | "marriage"
  | "children"
  | "title"
  | "author"
  | "repository"
  | "citedBy";

export interface ListSort {
  by: SortKey;
  dir: "asc" | "desc";
}

export interface ListState {
  kind?: ListKind;
  sort?: Partial<Record<ListKind, ListSort>>;
}

export type ListRow = PersonRow | FamilyRow | SourceRow;

export interface Column {
  key: SortKey;
  label: MessageKey;
  numeric: boolean;
}

const COLUMNS: Record<ListKind, Column[]> = {
  people: [
    { key: "name", label: "list.column.name", numeric: false },
    { key: "years", label: "list.column.years", numeric: false },
    { key: "place", label: "list.column.place", numeric: false },
    { key: "sources", label: "list.column.sources", numeric: true },
  ],
  families: [
    { key: "spouses", label: "list.column.spouses", numeric: false },
    { key: "marriage", label: "list.column.marriage", numeric: false },
    { key: "place", label: "list.column.place", numeric: false },
    { key: "children", label: "list.column.children", numeric: true },
  ],
  sources: [
    { key: "title", label: "list.column.title", numeric: false },
    { key: "author", label: "list.column.author", numeric: false },
    { key: "repository", label: "list.column.repository", numeric: false },
    { key: "citedBy", label: "list.column.citedBy", numeric: true },
  ],
};

export const columnsOf = (kind: ListKind): Column[] => COLUMNS[kind];

function personSearch(row: PersonRow): string {
  return [row.search, yearsOf(row).toLowerCase()].join(" ");
}

export function peopleShown(index: GenealogyIndex, query: string): PersonRow[] {
  const wanted = query.trim().toLowerCase();
  return index.people.filter(
    (row) =>
      row.xref !== undefined &&
      (!wanted || personSearch(row).includes(wanted)),
  );
}

export function familiesShown(index: GenealogyIndex, query: string): FamilyRow[] {
  const wanted = query.trim().toLowerCase();
  return index.families.filter((row) => row.xref !== undefined && (!wanted || row.search.includes(wanted)));
}

export function sourcesShown(index: GenealogyIndex, query: string): SourceRow[] {
  const wanted = query.trim().toLowerCase();
  return index.sources.filter((row) => row.xref !== undefined && (!wanted || row.search.includes(wanted)));
}

const counts = new WeakMap<GenealogyIndex, { cited: Map<string, number>; citing: Map<string, number> }>();

function countsOf(index: GenealogyIndex): { cited: Map<string, number>; citing: Map<string, number> } {
  let held = counts.get(index);
  if (!held) {
    held = { cited: new Map(), citing: new Map() };
    counts.set(index, held);
  }
  return held;
}

export function sourcesCited(index: GenealogyIndex, xref: string): number {
  const { cited } = countsOf(index);
  let count = cited.get(xref);
  if (count === undefined) {
    const named = new Set<string>();
    let inline = 0;
    for (const citation of index.citesBy(xref)) {
      if (citation.source !== undefined) {
        named.add(citation.source);
      } else {
        inline += 1;
      }
    }
    count = named.size + inline;
    cited.set(xref, count);
  }
  return count;
}

export function citingRecords(index: GenealogyIndex, xref: string): number {
  const { citing } = countsOf(index);
  let count = citing.get(xref);
  if (count === undefined) {
    count = new Set(index.citedBy(xref).map((citation) => citation.record)).size;
    citing.set(xref, count);
  }
  return count;
}

export interface Cells {
  texts: string[];
  gap: boolean;
}

export function cellsOf(kind: ListKind, row: ListRow, index: GenealogyIndex): Cells {
  const xref = row.xref ?? "";
  if (kind === "people") {
    const person = row as PersonRow;
    const cited = sourcesCited(index, xref);
    return {
      texts: [personName(person), yearsOf(person), person.place ?? "", String(cited)],
      gap: cited === 0,
    };
  }
  if (kind === "families") {
    const family = row as FamilyRow;
    return {
      texts: [
        familyTitle(family.spouseNames),
        year(family.marriage) ?? "",
        family.place ?? "",
        String(family.childCount),
      ],
      gap: false,
    };
  }
  const source = row as SourceRow;
  return {
    texts: [
      sourceTitle(source.title),
      source.author ?? "",
      source.repository ?? "",
      String(citingRecords(index, xref)),
    ],
    gap: false,
  };
}

const collators = new Map<Language, Intl.Collator>();

export function collatorFor(language: Language): Intl.Collator {
  let collator = collators.get(language);
  if (!collator) {
    collator = new Intl.Collator(language, { numeric: true, sensitivity: "base" });
    collators.set(language, collator);
  }
  return collator;
}

type SortValue = number | string[] | undefined;

const text = (value: string | undefined): SortValue => (value ? [value] : undefined);

function sortValue(kind: ListKind, by: SortKey, row: ListRow, index: GenealogyIndex): SortValue {
  const xref = row.xref ?? "";
  if (kind === "people") {
    const person = row as PersonRow;
    switch (by) {
      case "name":
        if (person.name === UNNAMED) {
          return undefined;
        }
        return person.surname !== undefined || person.given !== undefined
          ? [person.surname ?? "", person.given ?? ""]
          : [person.name];
      case "years":
        return person.birth?.year;
      case "place":
        return text(person.place);
      default:
        return sourcesCited(index, xref);
    }
  }
  if (kind === "families") {
    const family = row as FamilyRow;
    switch (by) {
      case "spouses":
        return family.spouseNames.length === 0 ? undefined : [familyTitle(family.spouseNames)];
      case "marriage":
        return family.marriage?.year;
      case "place":
        return text(family.place);
      default:
        return family.childCount;
    }
  }
  const source = row as SourceRow;
  switch (by) {
    case "title":
      return source.title === UNTITLED ? undefined : [source.title];
    case "author":
      return text(source.author);
    case "repository":
      return text(source.repository);
    default:
      return citingRecords(index, xref);
  }
}

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
function sorted(kind: ListKind, rows: ListRow[], sort: ListSort, index: GenealogyIndex, collator: Intl.Collator): ListRow[] {
  const values = rows.map((row) => sortValue(kind, sort.by, row, index));
  const sign = sort.dir === "asc" ? 1 : -1;
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

export interface ListQuery {
  kind: ListKind;
  query: string;
  sort: ListSort | undefined;
}

export function listRows(index: GenealogyIndex, { kind, query, sort }: ListQuery, collator: Intl.Collator): ListRow[] {
  const rows: ListRow[] =
    kind === "people" ? peopleShown(index, query) : kind === "families" ? familiesShown(index, query) : sourcesShown(index, query);
  return sort ? sorted(kind, rows, sort, index, collator) : rows;
}

export function nextSort(current: ListSort | undefined, by: SortKey): ListSort | undefined {
  if (current?.by !== by) {
    return { by, dir: "asc" };
  }
  return current.dir === "asc" ? { by, dir: "desc" } : undefined;
}

const isKind = (value: unknown): value is ListKind => LIST_KINDS.includes(value as ListKind);

export function readListState(value: unknown): ListState {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return {};
  }
  const { kind, sort } = value as Record<string, unknown>;
  const sorts: Partial<Record<ListKind, ListSort>> = {};
  if (typeof sort === "object" && sort !== null) {
    for (const each of LIST_KINDS) {
      const one = (sort as Record<string, unknown>)[each];
      if (typeof one !== "object" || one === null) {
        continue;
      }
      const { by, dir } = one as Record<string, unknown>;
      if (columnsOf(each).some((column) => column.key === by) && (dir === "asc" || dir === "desc")) {
        sorts[each] = { by: by as SortKey, dir };
      }
    }
  }
  return {
    ...(isKind(kind) ? { kind } : {}),
    ...(Object.keys(sorts).length > 0 ? { sort: sorts } : {}),
  };
}

export function recordKind(index: GenealogyIndex, xref: string): ListKind | null {
  if (index.person(xref)) {
    return "people";
  }
  if (index.family(xref)) {
    return "families";
  }
  return index.source(xref) ? "sources" : null;
}

export const listSelection = (index: GenealogyIndex, xref: string | null): string | null =>
  xref !== null && recordKind(index, xref) !== null ? xref : null;
