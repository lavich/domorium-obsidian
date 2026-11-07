import type { DocumentSymbol } from "@domorium/language-service";

import type { DateReading } from "./dates";
import { collectCitations } from "./citations";
import { eventsOf, NO_EVENTS } from "./events";
import { recordLines } from "./recordLines";
import { collectMediaLinks, looksLikeAnImage, mediaOf, mediaRecordOf } from "./media";
import { familyRowOf as readFamilyRow, readDatesOf, rowOf } from "./rows";
import { repositoryRead, SOURCE_FIELD_TAGS, sourceRowOf as readSourceRow } from "./sources";
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
  MediaLink,
  Missing,
  Person,
  PersonRow,
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
  const declared = new Map<string, DocumentSymbol>();

  for (const symbol of symbols) {
    if (symbol.detail !== undefined && /^@[^@\s]+@$/u.test(symbol.detail)) {
      declared.set(symbol.detail, symbol);
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
    if (symbol.detail && symbol.name !== "OBJE") {
      collectMediaLinks(symbol, symbol.detail, mediaLinks);
    }
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
      return record ? mediaRecordOf(xref, record, mediaLinks.get(xref) ?? []) : undefined;
    },
    record: (xref) => {
      const symbol = declared.get(xref);
      return symbol ? recordLines(symbol) : undefined;
    },
    citesBy: (xref) => byCiter.get(xref) ?? [],
    citedBy: (xref) => byCited.get(xref) ?? [],
  };
}
