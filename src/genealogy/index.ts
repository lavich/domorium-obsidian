import type { DocumentSymbol, MediaCrop } from "@domorium/language-service";

import { readDate, type DateReading } from "./dates";
import { readName } from "./names";
import {
  CHILD_FAMILY_TAG,
  CHILD_ROLE_TAGS,
  PERSON_EVENT_TAGS,
  SPOUSE_FAMILY_TAG,
  SPOUSE_ROLE_TAGS,
} from "./tags";

export type { DatePrecision, DateReading } from "./dates";
export { UNNAMED } from "./names";
export * from "./personRef";

/** One event or recorded attribute, as the record states it. */
export interface PersonEvent {
  /** The tag as written. Naming it for a reader is the caller's. */
  tag: string;
  date?: DateReading;
  place?: string;
  /** What the event line itself carried, as an occupation does. */
  value?: string;
}

/**
 * A picture a record points at, as the document names it.
 *
 * Nothing here is read from disk: the file may not exist, may not be an image
 * whatever the document says, and is never fetched. The rectangle is how a
 * GEDCOM says "this person is the second face from the left".
 */
export interface PersonMedia {
  /** The file as the document wrote it: a vault path, or a web address. */
  file: string;
  /** What the document says the file is, where it says anything. */
  form?: string;
  title?: string;
  crop?: MediaCrop;
}

/**
 * What the list needs to show a person and tell them from another, held for
 * every person in the document.
 */
export interface PersonRow {
  /** Absent where the record declares no cross-reference: see `unaddressable`. */
  xref?: string;
  /** A record declaring no identifier cannot be addressed, linked or opened. */
  unaddressable: boolean;
  name: string;
  otherNames: string[];
  sex?: string;
  birth?: DateReading;
  death?: DateReading;
  place?: string;
  /** One lowercase string covering every field the sidebar filters on. */
  search: string;
}

/** A person read in full, resolved when one is opened rather than for all. */
export interface Person extends PersonRow {
  /** Every picture the record points at, in the order it writes them. */
  media: PersonMedia[];
  /** The first of those the document calls an image, where there is one. */
  portrait?: PersonMedia;
  parents: PersonRow[];
  partners: PersonRow[];
  children: PersonRow[];
  events: PersonEvent[];
  /** Identifiers this person's record pointed at and the document does not hold. */
  unresolved: string[];
}

export interface GenealogyIndex {
  /** Every `INDI` record, in the order the file declares them. */
  people: PersonRow[];
  /** One person read in full, or undefined where the document holds none. */
  person(xref: string): Person | undefined;
}

const childOf = (symbol: DocumentSymbol, tag: string): DocumentSymbol | undefined =>
  symbol.children.find((child) => child.name === tag);

const childrenOf = (symbol: DocumentSymbol, tag: string): DocumentSymbol[] =>
  symbol.children.filter((child) => child.name === tag);

const payload = (symbol: DocumentSymbol | undefined): string | undefined =>
  symbol?.detail || undefined;

/** The identifiers a family names in the given roles, in document order. */
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

function eventsOf(record: DocumentSymbol): PersonEvent[] {
  const events: PersonEvent[] = [];
  for (const child of record.children) {
    if (!PERSON_EVENT_TAGS.has(child.name)) {
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
  const rows = new Map<string, PersonRow>();
  const records = new Map<string, DocumentSymbol>();
  const families = new Map<string, DocumentSymbol>();
  const objects = new Map<string, DocumentSymbol>();

  for (const symbol of symbols) {
    if (symbol.name === "INDI") {
      const row = rowOf(symbol);
      people.push(row);
      if (row.xref) {
        rows.set(row.xref, row);
        records.set(row.xref, symbol);
      }
    } else if (symbol.name === "FAM" && symbol.detail) {
      families.set(symbol.detail, symbol);
    } else if (symbol.name === "OBJE" && symbol.detail) {
      objects.set(symbol.detail, symbol);
    }
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

    return {
      ...row,
      media,
      ...(portrait === undefined ? {} : { portrait }),
      parents: [...parents.values()],
      partners: [...partners.values()],
      children: [...children.values()],
      events: eventsOf(record),
      unresolved,
    };
  }

  return { people, person };
}
