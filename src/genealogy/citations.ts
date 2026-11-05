import type { DocumentSymbol } from "@domorium/language-service";

import { childOf, payload } from "./symbols";
import type { Citation } from "./types";

/**
 * Every `SOUR` line beneath a record, to both sides at once. `within` names
 * the level-one structure a citation hung from, and `event` which of the
 * record's events that structure is; a citation on the record itself has
 * neither.
 */
export function collectCitations(
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
