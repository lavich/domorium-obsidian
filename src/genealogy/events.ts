import type { DocumentSymbol } from "@domorium/language-service";

import { readCoordinates } from "./coordinates";
import { childOf, payload } from "./symbols";
import type { Citation, DateOf, PersonEvent } from "./types";

export function eventsOf(
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
    const placeSymbol = childOf(child, "PLAC");
    const place = payload(placeSymbol);
    const coordinates = place === undefined ? undefined : readCoordinates(placeSymbol);
    const position = events.length;
    events.push({
      tag: child.name,
      ...(date === undefined ? {} : { date: dateOf(date) }),
      ...(place === undefined ? {} : { place }),
      ...(coordinates === undefined ? {} : { coordinates }),
      ...(payload(child) === undefined ? {} : { value: payload(child) }),
      ...(type === undefined ? {} : { type }),
      range: child.range,
      citations: citations.filter((citation) => citation.event === position),
    });
  }
  return events;
}

export const NO_EVENTS: ReadonlySet<string> = new Set();
