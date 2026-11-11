import type { FamilyRow, GenealogyIndex, PersonRow, RecordLine, SourceRow } from "../genealogy";
import { HEADER_ID, UNTITLED } from "../genealogy";
import { currentLanguage, type Language, type MessageKey } from "../i18n";
import { tagLabel } from "./detail/labels";
import { recordTitle } from "./detail/lineView";
import { foldText } from "./foldText";
import { familySortKey, familyTitle, personName, personSortKey, sourceTitle, year, yearsOf } from "./labels";
import { orderRows, type SortValue } from "./listOrder";
import { placeAt, placeRows, yearsText, type PlaceRow } from "./placeRows";

export type ListKind = "people" | "families" | "sources" | "places" | "media" | "notes" | "repositories" | "other";

export const LIST_KINDS: readonly ListKind[] = ["people", "families", "sources", "places", "media", "notes", "repositories", "other"];

/** The kinds whose rows the read model lists by id, each row read when first asked for. */
export type RecordKind = "media" | "notes" | "repositories" | "other";

const RECORD_KINDS: readonly RecordKind[] = ["media", "notes", "repositories", "other"];

export const isRecordKind = (kind: ListKind): kind is RecordKind => (RECORD_KINDS as readonly string[]).includes(kind);

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
  | "citedBy"
  | "events"
  | "text"
  | "file"
  | "format"
  | "address"
  | "kind"
  | "linkedFrom";

export interface ListSort {
  by: SortKey;
  dir: "asc" | "desc";
}

export interface ListState {
  kind?: ListKind;
  sort?: Partial<Record<ListKind, ListSort>>;
}

/** A row of the media, the notes, the repositories or the other records: its cells as shown, and what the search reads. */
export interface RecordRow {
  xref: string;
  texts: string[];
  /** The count of its last column; none on the header's row, which nothing can point at. */
  count?: number;
  /** A column the record states nothing for, by position. */
  missing: number[];
  search: string;
}

export type ListRow = PersonRow | FamilyRow | SourceRow | PlaceRow | RecordRow;

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
  places: [
    { key: "place", label: "list.column.place", numeric: false },
    { key: "events", label: "list.column.events", numeric: true },
    { key: "years", label: "list.column.years", numeric: false },
  ],
  media: [
    { key: "title", label: "list.column.title", numeric: false },
    { key: "file", label: "list.column.file", numeric: false },
    { key: "format", label: "list.column.format", numeric: false },
    { key: "linkedFrom", label: "list.column.linkedFrom", numeric: true },
  ],
  notes: [
    { key: "text", label: "list.column.text", numeric: false },
    { key: "linkedFrom", label: "list.column.linkedFrom", numeric: true },
  ],
  repositories: [
    { key: "name", label: "list.column.name", numeric: false },
    { key: "address", label: "list.column.address", numeric: false },
    { key: "sources", label: "list.column.sources", numeric: true },
  ],
  other: [
    { key: "kind", label: "list.column.kind", numeric: false },
    { key: "name", label: "list.column.name", numeric: false },
    { key: "linkedFrom", label: "list.column.linkedFrom", numeric: true },
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

const childText = (line: RecordLine | undefined, tag: string): string | undefined =>
  line?.children.find((one) => one.tag === tag)?.text;

const firstLine = (text: string | undefined): string | undefined => text?.split("\n").find((line) => line.trim() !== "");

const valuesBeneath = (line: RecordLine | undefined): string[] =>
  line === undefined ? [] : [line.text ?? "", ...line.children.flatMap(valuesBeneath)];

function recordRow(kind: RecordKind, index: GenealogyIndex, xref: string): RecordRow {
  const name = recordTitle(index, xref) ?? "";
  const lines = index.record(xref);
  if (kind === "media") {
    const media = index.media(xref);
    const file = media?.file ?? "";
    const format = media?.form ?? "";
    return {
      xref,
      texts: [name, file, format],
      count: index.linkedFrom(xref),
      missing: format === "" ? [2] : [],
      search: foldText([name, file, format].join(" ")),
    };
  }
  if (kind === "notes") {
    return { xref, texts: [name], count: index.linkedFrom(xref), missing: [], search: foldText(lines?.text ?? name) };
  }
  if (kind === "repositories") {
    const address = childText(lines, "ADDR");
    const shown = firstLine(address) ?? "";
    const whole = valuesBeneath(lines?.children.find((one) => one.tag === "ADDR"));
    return {
      xref,
      texts: [name, shown],
      count: index.sourcesOf(xref),
      missing: shown === "" ? [1] : [],
      search: foldText([name, ...whole].join(" ")),
    };
  }
  const tag = lines?.tag ?? "";
  const label = tagLabel(tag);
  return {
    xref,
    texts: [label, name],
    ...(xref === HEADER_ID ? {} : { count: index.linkedFrom(xref) }),
    missing: [],
    search: foldText([label, tag, name].join(" ")),
  };
}

const recordRowsHeld = new WeakMap<GenealogyIndex, Map<string, RecordRow[]>>();

/** Every row of a kind of records, read once per index and language. */
export function recordRows(index: GenealogyIndex, kind: RecordKind): RecordRow[] {
  let byKind = recordRowsHeld.get(index);
  if (!byKind) {
    byKind = new Map();
    recordRowsHeld.set(index, byKind);
  }
  const key = `${kind}\n${currentLanguage()}`;
  let rows = byKind.get(key);
  if (!rows) {
    rows = index.lists[kind].map((xref) => recordRow(kind, index, xref));
    byKind.set(key, rows);
  }
  return rows;
}

export interface Cells {
  texts: string[];
  gap: boolean;
}

export function cellsOf(kind: ListKind, row: ListRow, index: GenealogyIndex): Cells {
  if (isRecordKind(kind)) {
    const record = row as RecordRow;
    return { texts: [...record.texts, record.count === undefined ? "" : String(record.count)], gap: false };
  }
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
  if (kind === "places") {
    const place = row as PlaceRow;
    return { texts: [place.name, String(place.events), yearsText(place)], gap: false };
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

const text = (value: string | undefined): SortValue => (value ? [value] : undefined);

function sortValue(kind: ListKind, by: SortKey, row: ListRow, index: GenealogyIndex): SortValue {
  if (isRecordKind(kind)) {
    const record = row as RecordRow;
    const at = columnsOf(kind).findIndex((column) => column.key === by);
    if (at === columnsOf(kind).length - 1) {
      return record.count;
    }
    return record.missing.includes(at) ? undefined : [record.texts[at] ?? ""];
  }
  const xref = row.xref ?? "";
  if (kind === "people") {
    const person = row as PersonRow;
    switch (by) {
      case "name":
        return personSortKey(person);
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
        return familySortKey(family.spouseNames);
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

function sorted(kind: ListKind, rows: ListRow[], sort: ListSort, index: GenealogyIndex, collator: Intl.Collator): ListRow[] {
  return orderRows(rows, rows.map((row) => sortValue(kind, sort.by, row, index)), sort.dir, collator);
}

export interface ListQuery {
  kind: ListKind;
  query: string;
  sort: ListSort | undefined;
}

function recordsShown(index: GenealogyIndex, kind: RecordKind, query: string, sort: ListSort | undefined, collator: Intl.Collator): RecordRow[] {
  const wanted = foldText(query.trim());
  const rows = recordRows(index, kind).filter((row) => wanted === "" || row.search.includes(wanted));
  if (!sort) {
    return rows;
  }
  const header = kind === "other" ? rows.filter((row) => row.xref === HEADER_ID) : [];
  const rest = header.length > 0 ? rows.filter((row) => row.xref !== HEADER_ID) : rows;
  return [...header, ...(sorted(kind, rest, sort, index, collator) as RecordRow[])];
}

export function listRows(index: GenealogyIndex, { kind, query, sort }: ListQuery, collator: Intl.Collator): ListRow[] {
  if (kind === "places") {
    return placeRows(index, { query, sort }, collator);
  }
  if (isRecordKind(kind)) {
    return recordsShown(index, kind, query, sort, collator);
  }
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

const kindsHeld = new WeakMap<GenealogyIndex, Map<string, RecordKind>>();

function listedKind(index: GenealogyIndex, xref: string): RecordKind | undefined {
  let kinds = kindsHeld.get(index);
  if (!kinds) {
    kinds = new Map();
    for (const kind of RECORD_KINDS) {
      for (const one of index.lists[kind]) {
        kinds.set(one, kind);
      }
    }
    kindsHeld.set(index, kinds);
  }
  return kinds.get(xref);
}

export function recordKind(index: GenealogyIndex, xref: string): ListKind | null {
  const listed = listedKind(index, xref);
  if (listed) {
    return listed;
  }
  if (index.person(xref)) {
    return "people";
  }
  if (index.family(xref)) {
    return "families";
  }
  if (index.source(xref)) {
    return "sources";
  }
  if (placeAt(index, xref)) {
    return "places";
  }
  return null;
}

export const listSelection = (index: GenealogyIndex, xref: string | null): string | null =>
  xref !== null && recordKind(index, xref) !== null ? xref : null;
