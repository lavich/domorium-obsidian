import type { DocumentSymbol, MediaCrop } from "@domorium/language-service";

import { readDate, type DateReading } from "./dates";
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
export * from "./recordRef";

export interface PersonEvent {
  /** The tag as written. Naming it for a reader is the caller's. */
  tag: string;
  date?: DateReading;
  place?: string;
  /** What the line itself carried, as an occupation does. */
  value?: string;
}

/**
 * Nothing here is read from disk: the file may not exist, may not be an image
 * whatever the document says, and is never fetched. The rectangle is how a
 * GEDCOM says "this person is the second face from the left".
 */
export interface PersonMedia {
  /** A vault path, or a web address, as the document wrote it. */
  file: string;
  form?: string;
  title?: string;
  crop?: MediaCrop;
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

/** One case of a row. */
export interface PersonRow extends Row {
  name: string;
  otherNames: string[];
  sex?: string;
  birth?: DateReading;
  death?: DateReading;
  place?: string;
}

/** One case of a row. A family record carries no name of its own. */
export interface FamilyRow extends Row {
  /** The names of the people it joins, in the order the record names them. */
  spouseNames: string[];
  /** Those names joined, so a caller need not join them a second way. */
  name?: string;
  marriage?: DateReading;
  place?: string;
  childCount: number;
}

/** A person, with the role that named them where one did. */
export interface FamilyMember extends PersonRow {
  role: string;
}

/** Read in full when a family is opened, rather than for all of them. */
export interface Family extends FamilyRow {
  spouses: FamilyMember[];
  children: FamilyMember[];
  events: PersonEvent[];
  unresolved: string[];
}

/** Read in full when a person is opened, rather than for all of them. */
export interface Person extends PersonRow {
  media: PersonMedia[];
  /** The first picture the document calls an image. */
  portrait?: PersonMedia;
  parents: PersonRow[];
  partners: PersonRow[];
  children: PersonRow[];
  events: PersonEvent[];
  /** The families the record points at, each kind kept apart. */
  childFamilies: FamilyRow[];
  spouseFamilies: FamilyRow[];
  /** Identifiers this person's record pointed at and the document does not hold. */
  unresolved: string[];
}

export interface GenealogyIndex {
  /** In the order the file declares them. */
  people: PersonRow[];
  families: FamilyRow[];
  person(xref: string): Person | undefined;
  family(xref: string): Family | undefined;
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
): PersonEvent[] {
  const events: PersonEvent[] = [];
  for (const child of record.children) {
    if (!reading.has(child.name)) {
      continue;
    }
    const date = payload(childOf(child, "DATE"));
    events.push({
      tag: child.name,
      ...(date === undefined ? {} : { date: readDate(date) }),
      ...(payload(childOf(child, "PLAC")) === undefined
        ? {}
        : { place: payload(childOf(child, "PLAC")) }),
      ...(payload(child) === undefined ? {} : { value: payload(child) }),
    });
  }
  return events;
}

/** The spouses' names joined, which is the only name a family record has. */
function familyName(names: string[]): string | undefined {
  return names.length > 0 ? names.join(" / ") : undefined;
}

function rowOf(record: DocumentSymbol): PersonRow {
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
    ...(birthEvent && birth !== undefined ? { birth: readDate(birth) } : {}),
    ...(deathEvent && death !== undefined ? { death: readDate(death) } : {}),
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
    row.birth?.year?.toString() ?? "",
    row.death?.year?.toString() ?? "",
    row.place ?? "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * One pass over the document's symbols. What it keeps is compact — a row per
 * person and two lookups — because the syntax tree behind these symbols is the
 * expensive thing and copying it would double the cost for data almost none of
 * which is ever read. A person's relatives and events are resolved when that
 * person is opened.
 */
export function buildIndex(symbols: DocumentSymbol[]): GenealogyIndex {
  const people: PersonRow[] = [];
  const familyRows: FamilyRow[] = [];
  const rows = new Map<string, PersonRow>();
  const records = new Map<string, DocumentSymbol>();
  const families = new Map<string, DocumentSymbol>();
  const familySymbols: DocumentSymbol[] = [];
  const objects = new Map<string, DocumentSymbol>();

  for (const symbol of symbols) {
    if (symbol.name === "INDI") {
      const row = rowOf(symbol);
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
    }
  }

  /** A family's row. People are resolved because the name needs them. */
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
      ...(date === undefined ? {} : { marriage: readDate(date) }),
      ...(place === undefined ? {} : { place }),
      childCount: rolePointers(record, CHILD_ROLE_TAGS).length,
      search: "",
    };
    row.search = [
      ...spouseNames,
      xref ?? "",
      row.marriage?.year?.toString() ?? "",
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
      events: eventsOf(record, FAMILY_EVENT_TAGS),
      unresolved,
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

    for (const link of childrenOf(record, CHILD_FAMILY_TAG)) {
      const family = payload(link) && familyOf(payload(link) as string);
      if (!family) {
        continue;
      }
      for (const spouse of rolePointers(family, SPOUSE_ROLE_TAGS)) {
        resolveInto(parents, spouse);
      }
    }

    for (const link of childrenOf(record, SPOUSE_FAMILY_TAG)) {
      const family = payload(link) && familyOf(payload(link) as string);
      if (!family) {
        continue;
      }
      for (const spouse of rolePointers(family, SPOUSE_ROLE_TAGS)) {
        if (spouse !== xref) {
          resolveInto(partners, spouse);
        }
      }
      for (const child of rolePointers(family, CHILD_ROLE_TAGS)) {
        resolveInto(children, child);
      }
    }

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
      const form = payload(childOf(childOf(holder, "FILE") ?? holder, "FORM"));
      const title = payload(childOf(link, "TITL")) ?? payload(childOf(holder, "TITL"));
      const crop = cropOf(link);
      media.push({
        file,
        ...(form === undefined ? {} : { form }),
        ...(title === undefined ? {} : { title }),
        ...(crop === undefined ? {} : { crop }),
      });
    }
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
      events: eventsOf(record, PERSON_EVENT_TAGS),
      childFamilies: familiesOf(CHILD_FAMILY_TAG),
      spouseFamilies: familiesOf(SPOUSE_FAMILY_TAG),
      unresolved,
    };
  }

  for (const symbol of familySymbols) {
    familyRows.push(familyRowOf(symbol));
  }

  return { people, families: familyRows, person, family };
}
