import type {
  DocumentSymbol,
  GedcomLanguageService,
  MediaCrop,
  Position,
  Range,
} from "@domorium/language-service";

import { readingOf, type DateReading } from "./dates";
import { readName } from "./names";
import {
  CHILD_FAMILY_TAG,
  CHILD_ROLE_TAGS,
  FAMILY_EVENT_TAGS,
  PERSON_EVENT_TAGS,
  SPOUSE_FAMILY_TAG,
  SPOUSE_ROLE_TAGS,
} from "./tags";

export type { DatePrecision, DateReading } from "./dates";
export { UNNAMED } from "./names";

/** As UNNAMED is for a person: a marker the caller names, not a title. */
export const UNTITLED = "@untitled@";
export * from "./recordRef";

export type IndexSource = Pick<GedcomLanguageService, "getDocumentSymbols" | "readDate">;

type DateOf = (payload: string) => DateReading;

export interface PersonEvent {
  /** The tag as written. Naming it for a reader is the caller's. */
  tag: string;
  date?: DateReading;
  place?: string;
  /** What the line itself carried, as an occupation does. */
  value?: string;
  type?: string;
  range: Range;
  /** What this event itself cites, never what the record around it does. */
  citations: Citation[];
}

/**
 * Nothing here is read from disk: the file may not exist, may not be an image
 * whatever the document says, and is never fetched. The rectangle is how a
 * GEDCOM says "this person is the second face from the left".
 */
export interface PersonMedia {
  file: string;
  form?: string;
  title?: string;
  crop?: MediaCrop;
  /** On the link naming it, where the language service answers what it is. */
  at: Position;
  record?: string;
}

export interface MediaLink {
  record: string;
  title?: string;
  crop?: MediaCrop;
  at: Position;
}

export interface MediaRecord {
  xref: string;
  file?: string;
  title?: string;
  /** On the record's own `FILE` payload. */
  at?: Position;
  links: MediaLink[];
  range: Range;
}

/**
 * What any record needs to be a row in the sidebar's list, whatever it is.
 * Held for every one of them in the document, so it stays small.
 */
export interface Row {
  xref?: string;
  /** No identifier: cannot be addressed, linked to, or opened. */
  unaddressable: boolean;
  /** One lowercase string covering every field the sidebar filters on. */
  search: string;
}

export interface PersonRow extends Row {
  name: string;
  otherNames: string[];
  sex?: string;
  birth?: DateReading;
  death?: DateReading;
  place?: string;
}

export interface FamilyRow extends Row {
  spouseNames: string[];
  name?: string;
  marriage?: DateReading;
  place?: string;
  childCount: number;
}

export interface FamilyMember extends PersonRow {
  role: string;
}

export interface SourceField {
  tag: string;
  value: string;
}

export interface Repository {
  name?: string;
  address?: string;
  web?: string;
}

export interface SourceRow extends Row {
  title: string;
  author?: string;
  repository?: string;
}

export interface Source extends SourceRow {
  fields: SourceField[];
  heldAt?: Repository;
  media: PersonMedia[];
  portrait?: PersonMedia;
  unresolved: string[];
  range: Range;
}

/**
 * A `SOUR` line within a record, reported to both sides from one reading. It
 * either points at a source record or, as 5.5.1 allows, describes the source
 * on the spot.
 */
export interface Citation {
  record: string;
  /** The source it names, declared or not. Absent for a source described inline. */
  source?: string;
  inline?: string;
  /**
   * The tag of the structure the pointer sat beneath. Absent where it sat on
   * the record itself: a citation of a birth is not a citation of the person,
   * and a structure has no identifier to name it by.
   */
  within?: string;
  /**
   * Which of the record's events it sits under, by position among them, so
   * that two events of one kind keep their own citations.
   */
  event?: number;
  page?: string;
  /** `QUAY`, 0 to 3. */
  quality?: number;
  range: Range;
}

export interface Family extends FamilyRow {
  spouses: FamilyMember[];
  children: FamilyMember[];
  events: PersonEvent[];
  media: PersonMedia[];
  unresolved: string[];
  missingSpouses: Missing[];
  missingChildren: Missing[];
  range: Range;
}

export interface Missing {
  xref: string;
  range: Range;
}

/** A family a person is a spouse of, read from that person's side. */
export interface Union {
  family: FamilyRow;
  /** The other spouse, where the family names one the document declares. */
  spouse?: PersonRow;
  events: PersonEvent[];
  children: PersonRow[];
  missingSpouses: Missing[];
  missingChildren: Missing[];
}

export interface Person extends PersonRow {
  media: PersonMedia[];
  portrait?: PersonMedia;
  parents: PersonRow[];
  partners: PersonRow[];
  children: PersonRow[];
  events: PersonEvent[];
  childFamilies: FamilyRow[];
  spouseFamilies: FamilyRow[];
  siblings: PersonRow[];
  unions: Union[];
  /** A child-family, or a parent in one, the document does not declare. */
  missingParents: Missing[];
  missingUnions: Missing[];
  unresolved: string[];
  range: Range;
}

export interface GenealogyIndex {
  people: PersonRow[];
  families: FamilyRow[];
  sources: SourceRow[];
  person(xref: string): Person | undefined;
  family(xref: string): Family | undefined;
  source(xref: string): Source | undefined;
  media(xref: string): MediaRecord | undefined;
  citesBy(xref: string): Citation[];
  citedBy(xref: string): Citation[];
}

const childOf = (symbol: DocumentSymbol, tag: string): DocumentSymbol | undefined =>
  symbol.children.find((child) => child.name === tag);

const childrenOf = (symbol: DocumentSymbol, tag: string): DocumentSymbol[] =>
  symbol.children.filter((child) => child.name === tag);

const payload = (symbol: DocumentSymbol | undefined): string | undefined =>
  symbol?.detail || undefined;

function rolePointers(
  family: DocumentSymbol,
  roles: ReadonlySet<string>,
): string[] {
  const found: string[] = [];
  for (const child of family.children) {
    if (roles.has(child.name)) {
      const xref = payload(child);
      if (xref) {
        found.push(xref);
      }
    }
  }
  return found;
}

function roleLinks(family: DocumentSymbol, roles: ReadonlySet<string>): Missing[] {
  const found: Missing[] = [];
  for (const child of family.children) {
    const xref = payload(child);
    if (roles.has(child.name) && xref) {
      found.push({ xref, range: child.range });
    }
  }
  return found;
}

/** Where a line's payload starts: one space after its tag. */
function payloadPosition(line: DocumentSymbol): Position {
  return {
    line: line.selectionRange.end.line,
    character: line.selectionRange.end.character + 1,
  };
}

function mediaOf(
  record: DocumentSymbol,
  objects: Map<string, DocumentSymbol>,
  unresolved: string[],
): PersonMedia[] {
  const media: PersonMedia[] = [];
  for (const link of childrenOf(record, "OBJE")) {
    const pointer = payload(link);
    // Either the link names a multimedia record, or it carries the file
    // itself, which 5.5.1 allows and 7.0 does not.
    const holder = pointer ? objects.get(pointer) : link;
    if (!holder) {
      if (pointer && !unresolved.includes(pointer)) {
        unresolved.push(pointer);
      }
      continue;
    }
    const file = payload(childOf(holder, "FILE"));
    if (!file) {
      continue;
    }
    const fileLine = childOf(holder, "FILE") ?? holder;
    const form = payload(childOf(fileLine, "FORM"));
    const title =
      payload(childOf(link, "TITL")) ??
      payload(childOf(holder, "TITL")) ??
      payload(childOf(fileLine, "TITL"));
    const crop = cropOf(link);
    media.push({
      file,
      ...(form === undefined ? {} : { form }),
      ...(title === undefined ? {} : { title }),
      ...(crop === undefined ? {} : { crop }),
      at: payloadPosition(pointer ? link : fileLine),
      ...(pointer ? { record: pointer } : {}),
    });
  }
  return media;
}

const SOURCE_FIELD_TAGS: ReadonlySet<string> = new Set([
  "TITL", "AUTH", "PUBL", "ABBR", "TEXT", "REFN", "RIN",
]);

/**
 * Every `SOUR` line beneath a record, to both sides at once. `within` names
 * the level-one structure a citation hung from, and `event` which of the
 * record's events that structure is; a citation on the record itself has
 * neither.
 */
function collectCitations(
  record: DocumentSymbol,
  xref: string,
  eventTags: ReadonlySet<string>,
  byCiter: Map<string, Citation[]>,
  byCited: Map<string, Citation[]>,
): void {
  const report = (citation: Citation): void => {
    push(byCiter, xref, citation);
    if (citation.source) {
      push(byCited, citation.source, citation);
    }
  };
  const add = (
    node: DocumentSymbol,
    within: string,
    event: number | undefined,
  ): void => {
    for (const child of node.children) {
      if (child.name === "SOUR") {
        report(citationOf(child, xref, within, event));
      } else {
        add(child, within, event);
      }
    }
  };
  let events = 0;
  for (const child of record.children) {
    if (child.name === "SOUR") {
      report(citationOf(child, xref, undefined, undefined));
      continue;
    }
    const event = eventTags.has(child.name) ? events++ : undefined;
    add(child, child.name, event);
  }
}

function citationOf(
  line: DocumentSymbol,
  xref: string,
  within: string | undefined,
  event: number | undefined,
): Citation {
  const page = payload(childOf(line, "PAGE"));
  const written = payload(childOf(line, "QUAY"));
  const quality = written === undefined ? Number.NaN : Number(written);
  const pointer = line.detail?.startsWith("@") ? line.detail : undefined;
  return {
    record: xref,
    ...(pointer === undefined ? { inline: line.detail ?? "" } : { source: pointer }),
    ...(within === undefined ? {} : { within }),
    ...(event === undefined ? {} : { event }),
    ...(page === undefined ? {} : { page }),
    ...(Number.isInteger(quality) && quality >= 0 && quality <= 3 ? { quality } : {}),
    range: line.range,
  };
}

function push(into: Map<string, Citation[]>, key: string, one: Citation): void {
  const held = into.get(key);
  if (held) {
    held.push(one);
  } else {
    into.set(key, [one]);
  }
}

/** Extensions a document that says nothing about a file may still be judged by. */
const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tif", "tiff", "avif",
]);

/**
 * Whether the document calls this an image. Where it says what the file is,
 * that is believed; where it says nothing, the name is the only evidence left.
 */
function looksLikeAnImage(media: PersonMedia): boolean {
  if (media.form) {
    return media.form.toLowerCase().startsWith("image/");
  }
  const dot = media.file.lastIndexOf(".");
  return (
    dot > 0 && IMAGE_EXTENSIONS.has(media.file.slice(dot + 1).toLowerCase())
  );
}

function cropOf(link: DocumentSymbol): MediaCrop | undefined {
  const crop = childOf(link, "CROP");
  if (!crop) {
    return undefined;
  }
  const number = (tag: string): number | undefined => {
    const written = payload(childOf(crop, tag));
    const value = written === undefined ? Number.NaN : Number(written);
    return Number.isFinite(value) ? value : undefined;
  };
  const top = number("TOP");
  const left = number("LEFT");
  const height = number("HEIGHT");
  const width = number("WIDTH");
  // A rectangle missing a side is not a rectangle. The whole picture is a
  // better answer than a guessed one.
  if (top === undefined || left === undefined || height === undefined || width === undefined) {
    return undefined;
  }
  return { top, left, height, width };
}

function eventsOf(
  record: DocumentSymbol,
  reading: ReadonlySet<string>,
  citations: Citation[],
  dateOf: DateOf,
): PersonEvent[] {
  const events: PersonEvent[] = [];
  for (const child of record.children) {
    if (!reading.has(child.name)) {
      continue;
    }
    const date = payload(childOf(child, "DATE"));
    const type = payload(childOf(child, "TYPE"));
    const position = events.length;
    events.push({
      tag: child.name,
      ...(date === undefined ? {} : { date: dateOf(date) }),
      ...(payload(childOf(child, "PLAC")) === undefined
        ? {}
        : { place: payload(childOf(child, "PLAC")) }),
      ...(payload(child) === undefined ? {} : { value: payload(child) }),
      ...(type === undefined ? {} : { type }),
      range: child.range,
      citations: citations.filter((citation) => citation.event === position),
    });
  }
  return events;
}

const NO_EVENTS: ReadonlySet<string> = new Set();

function familyName(names: string[]): string | undefined {
  return names.length > 0 ? names.join(" / ") : undefined;
}

function rowOf(record: DocumentSymbol, dateOf: DateOf): PersonRow {
  const nameLines = childrenOf(record, "NAME");
  const name = readName(payload(nameLines[0]));
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

function writtenYear(date: DateReading | undefined): string {
  if (date?.year === undefined) {
    return "";
  }
  return String(date.year > 0 ? date.year : 1 - date.year);
}

function readDatesOf(
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

/**
 * One pass over the document's symbols. What it keeps is compact — a row per
 * person and two lookups — because the syntax tree behind these symbols is the
 * expensive thing and copying it would double the cost for data almost none of
 * which is ever read. A person's relatives and events are resolved when that
 * person is opened.
 */
export function buildIndex(language: IndexSource): GenealogyIndex {
  const symbols = language.getDocumentSymbols();
  // Every date is read during this pass, so the index never holds a service
  // that may since have moved on to another revision of the document.
  const readings = new Map<string, DateReading>();
  const dateOf: DateOf = (date) => readings.get(date) ?? { text: date };
  const people: PersonRow[] = [];
  const familyRows: FamilyRow[] = [];
  const sourceRows: SourceRow[] = [];
  const rows = new Map<string, PersonRow>();
  const records = new Map<string, DocumentSymbol>();
  const families = new Map<string, DocumentSymbol>();
  const familySymbols: DocumentSymbol[] = [];
  const objects = new Map<string, DocumentSymbol>();
  const sourceSymbols: DocumentSymbol[] = [];
  const sourceRecords = new Map<string, DocumentSymbol>();
  const repositories = new Map<string, DocumentSymbol>();
  const byCiter = new Map<string, Citation[]>();
  const byCited = new Map<string, Citation[]>();
  const mediaLinks = new Map<string, MediaLink[]>();

  for (const symbol of symbols) {
    if (symbol.name === "INDI" || symbol.name === "FAM") {
      readDatesOf(symbol, language, readings);
    }
    if (symbol.name === "INDI") {
      const row = rowOf(symbol, dateOf);
      people.push(row);
      if (row.xref) {
        rows.set(row.xref, row);
        records.set(row.xref, symbol);
      }
    } else if (symbol.name === "FAM") {
      if (symbol.detail) {
        families.set(symbol.detail, symbol);
      }
      familySymbols.push(symbol);
    } else if (symbol.name === "OBJE" && symbol.detail) {
      objects.set(symbol.detail, symbol);
    } else if (symbol.name === "SOUR") {
      if (symbol.detail) {
        sourceRecords.set(symbol.detail, symbol);
      }
      sourceSymbols.push(symbol);
    } else if (symbol.name === "REPO" && symbol.detail) {
      repositories.set(symbol.detail, symbol);
    }

    // Citations, collected by the walk this loop already makes rather than by
    // walking the document again per source.
    if (symbol.detail && symbol.name !== "OBJE") {
      for (const link of childrenOf(symbol, "OBJE")) {
        const pointer = payload(link);
        if (!pointer?.startsWith("@")) {
          continue;
        }
        const title = payload(childOf(link, "TITL"));
        const crop = cropOf(link);
        const held = mediaLinks.get(pointer) ?? [];
        held.push({
          record: symbol.detail,
          ...(title === undefined ? {} : { title }),
          ...(crop === undefined ? {} : { crop }),
          at: payloadPosition(link),
        });
        mediaLinks.set(pointer, held);
      }
    }
    if (symbol.detail && symbol.name !== "SOUR") {
      const eventTags =
        symbol.name === "FAM" ? FAMILY_EVENT_TAGS
        : symbol.name === "INDI" ? PERSON_EVENT_TAGS
        : NO_EVENTS;
      collectCitations(symbol, symbol.detail, eventTags, byCiter, byCited);
    }
  }

  function familyRowOf(record: DocumentSymbol): FamilyRow {
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

  function family(xref: string): Family | undefined {
    const record = families.get(xref);
    if (!record) {
      return undefined;
    }
    const unresolved: string[] = [];
    const members = (roles: ReadonlySet<string>): FamilyMember[] => {
      const found: FamilyMember[] = [];
      for (const child of record.children) {
        if (!roles.has(child.name)) {
          continue;
        }
        const pointer = payload(child);
        if (!pointer) {
          continue;
        }
        const who = rows.get(pointer);
        if (who) {
          found.push({ ...who, role: child.name });
        } else if (!unresolved.includes(pointer)) {
          unresolved.push(pointer);
        }
      }
      return found;
    };

    return {
      ...familyRowOf(record),
      spouses: members(SPOUSE_ROLE_TAGS),
      children: members(CHILD_ROLE_TAGS),
      events: eventsOf(record, FAMILY_EVENT_TAGS, byCiter.get(xref) ?? [], dateOf),
      media: mediaOf(record, objects, unresolved),
      unresolved,
      missingSpouses: roleLinks(record, SPOUSE_ROLE_TAGS).filter((one) => !rows.has(one.xref)),
      missingChildren: roleLinks(record, CHILD_ROLE_TAGS).filter((one) => !rows.has(one.xref)),
      range: record.range,
    };
  }

  /**
   * The address is the `ADDR` line and the lines beneath it joined as one: the
   * record writes them apart, but nobody reads an address in pieces.
   */
  function repositoryRead(held: DocumentSymbol): Repository {
    const name = payload(childOf(held, "NAME"));
    const web = payload(childOf(held, "WWW"));
    const at = childOf(held, "ADDR");
    const address = at
      ? [payload(at), ...at.children.map((line) => payload(line))]
          .filter((part): part is string => Boolean(part))
          .join(", ")
      : undefined;
    return {
      ...(name === undefined ? {} : { name }),
      ...(address === undefined || address === "" ? {} : { address }),
      ...(web === undefined ? {} : { web }),
    };
  }

  function repositoryOf(record: DocumentSymbol): DocumentSymbol | undefined {
    const pointer = payload(childOf(record, "REPO"));
    return pointer ? repositories.get(pointer) : undefined;
  }

  function sourceRowOf(record: DocumentSymbol): SourceRow {
    const xref = record.detail || undefined;
    const title = payload(childOf(record, "TITL")) ?? UNTITLED;
    const author = payload(childOf(record, "AUTH"));
    const repository = payload(
      repositoryOf(record) && childOf(repositoryOf(record)!, "NAME"),
    );
    const row: SourceRow = {
      ...(xref === undefined ? {} : { xref }),
      unaddressable: xref === undefined,
      title,
      ...(author === undefined ? {} : { author }),
      ...(repository === undefined ? {} : { repository }),
      search: "",
    };
    row.search = [title, author ?? "", repository ?? "", xref ?? ""]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return row;
  }

  function source(xref: string): Source | undefined {
    const record = sourceRecords.get(xref);
    if (!record) {
      return undefined;
    }
    const unresolved: string[] = [];
    const pointer = payload(childOf(record, "REPO"));
    const held = pointer ? repositories.get(pointer) : undefined;
    if (pointer && !held) {
      unresolved.push(pointer);
    }
    const media = mediaOf(record, objects, unresolved);
    const portrait = media.find(looksLikeAnImage);

    const fields: SourceField[] = [];
    for (const child of record.children) {
      const value = payload(child);
      if (value && !child.name.startsWith("@") && SOURCE_FIELD_TAGS.has(child.name)) {
        fields.push({ tag: child.name, value });
      }
    }

    const heldAt = held ? repositoryRead(held) : undefined;

    return {
      ...sourceRowOf(record),
      fields,
      ...(heldAt === undefined ? {} : { heldAt }),
      media,
      ...(portrait === undefined ? {} : { portrait }),
      unresolved,
      range: record.range,
    };
  }

  function person(xref: string): Person | undefined {
    const record = records.get(xref);
    const row = rows.get(xref);
    if (!record || !row) {
      return undefined;
    }

    const unresolved: string[] = [];
    const parents = new Map<string, PersonRow>();
    const partners = new Map<string, PersonRow>();
    const children = new Map<string, PersonRow>();
    const siblings = new Map<string, PersonRow>();
    const unions: Union[] = [];

    const resolveInto = (target: Map<string, PersonRow>, pointer: string): void => {
      const found = rows.get(pointer);
      if (found) {
        target.set(pointer, found);
      } else if (!unresolved.includes(pointer)) {
        unresolved.push(pointer);
      }
    };

    const familyOf = (pointer: string): DocumentSymbol | undefined => {
      const family = families.get(pointer);
      if (!family && !unresolved.includes(pointer)) {
        unresolved.push(pointer);
      }
      return family;
    };

    const missingParents: Missing[] = [];
    const missingUnions: Missing[] = [];
    const resolved = (pointer: string): boolean => rows.has(pointer);

    for (const link of childrenOf(record, CHILD_FAMILY_TAG)) {
      const family = payload(link) && familyOf(payload(link) as string);
      if (!family) {
        if (payload(link)) {
          missingParents.push({ xref: payload(link) as string, range: link.range });
        }
        continue;
      }
      for (const spouse of roleLinks(family, SPOUSE_ROLE_TAGS)) {
        resolveInto(parents, spouse.xref);
        if (!resolved(spouse.xref)) {
          missingParents.push(spouse);
        }
      }
      for (const child of rolePointers(family, CHILD_ROLE_TAGS)) {
        if (child !== xref) {
          resolveInto(siblings, child);
        }
      }
    }

    for (const link of childrenOf(record, SPOUSE_FAMILY_TAG)) {
      const family = payload(link) && familyOf(payload(link) as string);
      if (!family) {
        if (payload(link)) {
          missingUnions.push({ xref: payload(link) as string, range: link.range });
        }
        continue;
      }
      const spouses = new Map<string, PersonRow>();
      const ownChildren = new Map<string, PersonRow>();
      const missingSpouses: Missing[] = [];
      const missingChildren: Missing[] = [];
      for (const spouse of roleLinks(family, SPOUSE_ROLE_TAGS)) {
        if (spouse.xref === xref) {
          continue;
        }
        resolveInto(partners, spouse.xref);
        resolveInto(spouses, spouse.xref);
        if (!resolved(spouse.xref)) {
          missingSpouses.push(spouse);
        }
      }
      for (const child of roleLinks(family, CHILD_ROLE_TAGS)) {
        resolveInto(children, child.xref);
        resolveInto(ownChildren, child.xref);
        if (!resolved(child.xref)) {
          missingChildren.push(child);
        }
      }
      const spouse = [...spouses.values()][0];
      unions.push({
        family: familyRowOf(family),
        ...(spouse === undefined ? {} : { spouse }),
        events: eventsOf(
          family,
          FAMILY_EVENT_TAGS,
          family.detail ? (byCiter.get(family.detail) ?? []) : [],
          dateOf,
        ),
        children: [...ownChildren.values()],
        missingSpouses,
        missingChildren,
      });
    }

    const media = mediaOf(record, objects, unresolved);
    const portrait = media.find(looksLikeAnImage);

    const familiesOf = (tag: string): FamilyRow[] => {
      const found: FamilyRow[] = [];
      for (const link of childrenOf(record, tag)) {
        const pointer = payload(link);
        const symbol = pointer ? families.get(pointer) : undefined;
        if (symbol) {
          found.push(familyRowOf(symbol));
        }
      }
      return found;
    };

    return {
      ...row,
      media,
      ...(portrait === undefined ? {} : { portrait }),
      parents: [...parents.values()],
      partners: [...partners.values()],
      children: [...children.values()],
      events: eventsOf(record, PERSON_EVENT_TAGS, byCiter.get(xref) ?? [], dateOf),
      childFamilies: familiesOf(CHILD_FAMILY_TAG),
      spouseFamilies: familiesOf(SPOUSE_FAMILY_TAG),
      siblings: [...siblings.values()],
      unions,
      missingParents,
      missingUnions,
      unresolved,
      range: record.range,
    };
  }

  for (const symbol of familySymbols) {
    familyRows.push(familyRowOf(symbol));
  }
  for (const symbol of sourceSymbols) {
    sourceRows.push(sourceRowOf(symbol));
  }

  return {
    people,
    families: familyRows,
    sources: sourceRows,
    person,
    family,
    source,
    media: (xref) => {
      const record = objects.get(xref);
      if (!record) {
        return undefined;
      }
      const fileLine = childOf(record, "FILE");
      const file = payload(fileLine);
      const title = payload(childOf(record, "TITL")) ?? payload(fileLine && childOf(fileLine, "TITL"));
      return {
        xref,
        ...(file === undefined ? {} : { file }),
        ...(title === undefined ? {} : { title }),
        ...(fileLine && file !== undefined ? { at: payloadPosition(fileLine) } : {}),
        links: mediaLinks.get(xref) ?? [],
        range: record.range,
      };
    },
    citesBy: (xref) => byCiter.get(xref) ?? [],
    citedBy: (xref) => byCited.get(xref) ?? [],
  };
}
