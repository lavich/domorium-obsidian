import type { GenealogyIndex, Person, PersonEvent, PersonRow } from "../genealogy";
import { t, type MessageKey } from "../i18n";
import { eventName, personName } from "./labels";
import type { FactKey } from "./personPage";

export interface TimelineEntry {
  year?: number;
  event: PersonEvent;
  label: string;
  own: boolean;
  /** The relative the entry is about, to open. */
  relative?: { xref: string; name: string };
  /** The person's own fact, to select. */
  fact?: FactKey;
}

export interface Timeline {
  entries: TimelineEntry[];
  undated: TimelineEntry[];
}

export interface PlaceEntry {
  place: string;
  events: string[];
}

type Relation = "parent" | "sibling" | "spouse" | "child" | "grandchild";

function relationKey(relation: Relation, sex: string | undefined): MessageKey {
  const form = sex === "M" ? "male" : sex === "F" ? "female" : "any";
  return `timeline.of.${relation}.${form}` as MessageKey;
}

const eventsOf = (index: GenealogyIndex, row: PersonRow, tags: string[]): PersonEvent[] =>
  row.xref ? (index.person(row.xref)?.events ?? []).filter((event) => tags.includes(event.tag)) : [];

export function timelineOf(person: Person, index: GenealogyIndex): Timeline {
  const own: TimelineEntry[] = [];
  const kin: TimelineEntry[] = [];

  person.events.forEach((event, at) => {
    own.push({ year: event.date?.year, event, label: eventName(event), own: true, fact: `p:${at}` });
  });
  person.unions.forEach((union, u) => {
    union.events.forEach((event, at) => {
      const spouse = union.spouse;
      own.push({
        year: event.date?.year,
        event,
        label: spouse
          ? t("timeline.with", { event: eventName(event), name: personName(spouse) })
          : eventName(event),
        own: true,
        fact: `u:${u}:${at}`,
        ...(spouse?.xref ? { relative: { xref: spouse.xref, name: personName(spouse) } } : {}),
      });
    });
  });

  const relativeEntry = (row: PersonRow, relation: Relation, event: PersonEvent): void => {
    if (!row.xref || event.date?.year === undefined) {
      return;
    }
    kin.push({
      year: event.date.year,
      event,
      label: t(relationKey(relation, row.sex), {
        event: eventName(event),
        name: personName(row),
      }),
      own: false,
      relative: { xref: row.xref, name: personName(row) },
    });
  };

  const parentsFamily = person.childFamilies[0]?.xref
    ? index.family(person.childFamilies[0].xref)
    : undefined;
  for (const event of parentsFamily?.events ?? []) {
    if (event.date?.year !== undefined) {
      kin.push({
        year: event.date.year,
        event,
        label: t("timeline.ofParents", { event: eventName(event) }),
        own: false,
      });
    }
  }
  for (const parent of person.parents) {
    for (const event of eventsOf(index, parent, ["DEAT"])) {
      relativeEntry(parent, "parent", event);
    }
  }
  for (const sibling of person.siblings) {
    for (const event of eventsOf(index, sibling, ["BIRT", "DEAT"])) {
      relativeEntry(sibling, "sibling", event);
    }
  }
  for (const union of person.unions) {
    if (union.spouse) {
      for (const event of eventsOf(index, union.spouse, ["DEAT"])) {
        relativeEntry(union.spouse, "spouse", event);
      }
    }
    for (const child of union.children) {
      for (const event of eventsOf(index, child, ["BIRT", "DEAT"])) {
        relativeEntry(child, "child", event);
      }
      const read = child.xref ? index.person(child.xref) : undefined;
      for (const childUnion of read?.unions ?? []) {
        for (const event of childUnion.events.filter((one) => one.tag === "MARR")) {
          relativeEntry(child, "child", event);
        }
        for (const grandchild of childUnion.children) {
          for (const event of eventsOf(index, grandchild, ["BIRT"])) {
            relativeEntry(grandchild, "grandchild", event);
          }
        }
      }
    }
  }

  const born = person.birth?.year;
  const married = parentsFamily?.events.find((event) => event.tag === "MARR")?.date?.year;
  const from = [born, married].filter((year): year is number => year !== undefined);
  const start = from.length > 0 ? Math.min(...from) : undefined;
  const end = person.death?.year;
  const inLife = kin.filter(
    (entry) =>
      entry.year !== undefined &&
      (start === undefined || entry.year >= start) &&
      (end === undefined || entry.year <= end),
  );

  const dated = [...own.filter((entry) => entry.year !== undefined), ...inLife];
  const order = new Map(dated.map((entry, at) => [entry, at]));
  dated.sort((a, b) => (a.year ?? 0) - (b.year ?? 0) || (order.get(a) ?? 0) - (order.get(b) ?? 0));
  return { entries: dated, undated: own.filter((entry) => entry.year === undefined) };
}

export function placesOf(timeline: Timeline): PlaceEntry[] {
  const places = new Map<string, string[]>();
  for (const entry of [...timeline.entries, ...timeline.undated]) {
    const place = entry.event.place;
    if (!place) {
      continue;
    }
    const events = places.get(place) ?? [];
    events.push(entry.label);
    places.set(place, events);
  }
  return [...places].map(([place, events]) => ({ place, events }));
}
