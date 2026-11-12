import type { DocumentSymbol } from "@domorium/language-service";

import type { DateReading } from "./dates";
import { collectCitations } from "./citations";
import { eventsOf, NO_EVENTS } from "./events";
import { recordLines, type RecordLine } from "./recordLines";
import { looksLikeAnImage, mediaOf, mediaRecordOf } from "./media";
import { familyRowOf as readFamilyRow, readDatesOf, rowOf } from "./rows";
import { SOURCE_FIELD_TAGS, sourceRowOf as readSourceRow } from "./sources";
import { childOf, childrenOf, payload, rolePointers, roleLinks } from "./symbols";
import {
  CHILD_FAMILY_TAG,
  CHILD_ROLE_TAGS,
  PEDIGREE_TAG,
  FAMILY_EVENT_TAGS,
  PERSON_EVENT_TAGS,
  SPOUSE_FAMILY_TAG,
  SPOUSE_ROLE_TAGS,
} from "./tags";
import { HEADER_ID } from "./types";
import type {
  ChildLink,
  ChildLinkKind,
  Citation,
  DateOf,
  Family,
  FamilyMember,
  FamilyRow,
  GenealogyIndex,
  IndexSource,
  Missing,
  Person,
  PersonRow,
  RecordLists,
  Source,
  SourceField,
  SourceRow,
  Union,
} from "./types";

/** `PEDI` is lower-case in 5.5.1 and upper-case in 7.0; a value that is neither a known one nor absent is `other`. */
function childLinkKind(value: string | undefined): ChildLinkKind {
  if (value === undefined) {
    return "unstated";
  }
  const kind = value.trim().toLowerCase();
  return kind === "birth" || kind === "adopted" || kind === "foster" || kind === "sealing" ? kind : "other";
}

const IDENTIFIER = /^@[^@\s]+@$/u;
const LISTED_ELSEWHERE: ReadonlySet<string> = new Set(["INDI", "FAM", "SOUR", "TRLR"]);
const CONTINUATION: ReadonlySet<string> = new Set(["CONC", "CONT"]);

/** The symbols carry no value of a record's own opening line but a note's, so the service is asked for it. */
function ownValue(language: IndexSource, symbol: DocumentSymbol): string | undefined {
  const described = language.describeStructure(symbol.range.start);
  return "ok" in described || !described.value ? undefined : described.value;
}

/** Target → the records pointing at it, a record without an identifier under a key of its own. */
function pointersOf(symbols: readonly DocumentSymbol[]): Map<string, Set<string>> {
  const into = new Map<string, Set<string>>();
  symbols.forEach((symbol, at) => {
    const owner = symbol.name === "HEAD" ? HEADER_ID : symbol.detail !== undefined && IDENTIFIER.test(symbol.detail) ? symbol.detail : `#${at}`;
    const walk = (line: DocumentSymbol): void => {
      for (const child of line.children) {
        if (CONTINUATION.has(child.name)) {
          continue;
        }
        const target = child.detail;
        if (target !== undefined && target !== owner && target !== "@VOID@" && IDENTIFIER.test(target)) {
          let from = into.get(target);
          if (!from) {
            from = new Set();
            into.set(target, from);
          }
          from.add(owner);
        }
        walk(child);
      }
    };
    walk(symbol);
  });
  return into;
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
  const declared = new Map<string, DocumentSymbol>();
  const converted = new Map<string, RecordLine>();
  const lists: RecordLists = { media: [], notes: [], repositories: [], other: [] };
  const ownValues = new Map<string, string>();

  for (const symbol of symbols) {
    const xref = symbol.detail !== undefined && IDENTIFIER.test(symbol.detail) ? symbol.detail : undefined;
    if (xref !== undefined) {
      declared.set(xref, symbol);
    }
    if (symbol.name === "HEAD" && !declared.has(HEADER_ID)) {
      declared.set(HEADER_ID, symbol);
      lists.other.unshift(HEADER_ID);
    } else if (xref !== undefined && !LISTED_ELSEWHERE.has(symbol.name)) {
      const list =
        symbol.name === "OBJE" ? lists.media
        : symbol.name === "SNOTE" || symbol.name === "NOTE" ? lists.notes
        : symbol.name === "REPO" ? lists.repositories
        : lists.other;
      list.push(xref);
      if (list === lists.other) {
        const own = ownValue(language, symbol);
        if (own !== undefined) {
          ownValues.set(xref, own);
        }
      }
    }
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
    if (symbol.detail && symbol.name !== "SOUR") {
      const eventTags =
        symbol.name === "FAM" ? FAMILY_EVENT_TAGS
        : symbol.name === "INDI" ? PERSON_EVENT_TAGS
        : NO_EVENTS;
      collectCitations(symbol, symbol.detail, eventTags, byCiter, byCited);
    }
  }

  const familyRowOf = (record: DocumentSymbol): FamilyRow =>
    readFamilyRow(record, rows, dateOf);

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

  const sourceRowOf = (record: DocumentSymbol): SourceRow =>
    readSourceRow(record, repositories);

  function source(xref: string): Source | undefined {
    const record = sourceRecords.get(xref);
    if (!record) {
      return undefined;
    }
    const unresolved: string[] = [];
    const media = mediaOf(record, objects, unresolved);
    const portrait = media.find(looksLikeAnImage);

    const fields: SourceField[] = [];
    for (const child of record.children) {
      const value = payload(child);
      if (value && !child.name.startsWith("@") && SOURCE_FIELD_TAGS.has(child.name)) {
        fields.push({ tag: child.name, value });
      }
    }

    return {
      ...sourceRowOf(record),
      fields,
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

    const childLinks: ChildLink[] = [];
    for (const link of childrenOf(record, CHILD_FAMILY_TAG)) {
      const family = payload(link) && familyOf(payload(link) as string);
      if (family) {
        childLinks.push({ family: payload(link) as string, kind: childLinkKind(payload(childOf(link, PEDIGREE_TAG))) });
      }
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
      childLinks,
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

  let pointers: Map<string, Set<string>> | undefined;
  const pointing = (): Map<string, Set<string>> => (pointers ??= pointersOf(symbols));
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
      return record ? mediaRecordOf(xref, record) : undefined;
    },
    lists,
    record: (xref) => {
      const symbol = declared.get(xref);
      if (!symbol) {
        return undefined;
      }
      let lines = converted.get(xref);
      if (!lines) {
        lines = recordLines(symbol, ownValues.get(xref));
        converted.set(xref, lines);
      }
      return lines;
    },
    linkedFrom: (xref) => pointing().get(xref)?.size ?? 0,
    sourcesOf: (xref) => {
      let count = 0;
      for (const from of pointing().get(xref) ?? []) {
        if (sourceRecords.has(from)) {
          count += 1;
        }
      }
      return count;
    },
    citesBy: (xref) => byCiter.get(xref) ?? [],
    citedBy: (xref) => byCited.get(xref) ?? [],
  };
}
