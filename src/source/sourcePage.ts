import { UNTITLED, type Citation, type Source } from "../genealogy";
import { drawCitations, type CitationRow } from "./citationRows";

/** Already in the reader's language. */
export interface SourcePageLabels {
  heldAt: string;
  citedBy: string;
  citedByNobody: string;
  untitled: string;
  address: string;
  web: string;
}

export interface SourcePageHost {
  labels: SourcePageLabels;
  /** Names a tag the record states — `AUTH`, `PUBL` — in the reader's language. */
  fieldLabel: (tag: string) => string;
  /** Says what a citation hung from, already phrased. */
  within: (tag: string) => string;
  /** The name a citing record goes by, or the identifier where there is none. */
  nameOf: (xref: string) => string;
  source: { document: string; xref: string };
  citations: Citation[];
  onCiter: (citation: Citation) => void;
  onOpenRecord: () => void;
}

export function renderSourcePage(
  container: HTMLElement,
  source: Source,
  host: SourcePageHost,
): void {
  container.replaceChildren();
  const page = element(container, "div", "gedcom-person-page");

  const head = element(page, "div", "gedcom-person-head");
  element(head, "h1", "gedcom-person-title").textContent =
    source.title === UNTITLED
      ? (source.xref ?? host.labels.untitled)
      : source.title;
  drawSourceLink(head, host);

  // The title is the heading; repeating it as a field would say it twice.
  const facts = element(page, "div", "gedcom-person-facts");
  for (const field of source.fields) {
    if (field.tag === "TITL") {
      continue;
    }
    const fact = element(facts, "div", "gedcom-person-fact");
    element(fact, "div", "gedcom-person-fact-label").textContent =
      host.fieldLabel(field.tag);
    const body = element(fact, "div", "gedcom-person-fact-body");
    element(body, "div", "gedcom-person-fact-value").textContent = field.value;
  }
  if (!facts.hasChildNodes()) {
    facts.remove();
  }

  drawRepository(page, source, host);
  drawCitedBy(page, host);
}

function drawRepository(
  page: HTMLElement,
  source: Source,
  host: SourcePageHost,
): void {
  const held = source.heldAt;
  if (!held || (!held.name && !held.address && !held.web)) {
    return;
  }
  const group = element(page, "div", "gedcom-person-group");
  element(group, "h2", "gedcom-person-group-title").textContent =
    host.labels.heldAt;
  if (held.name) {
    element(group, "div", "gedcom-person-fact-value").textContent = held.name;
  }
  for (const [label, value] of [
    [host.labels.address, held.address],
    [host.labels.web, held.web],
  ] as const) {
    if (value) {
      const line = element(group, "div", "gedcom-person-event-detail");
      line.textContent = `${label}: ${value}`;
    }
  }
}

/**
 * The substance of the page: what in this document rests on this source. A
 * source nothing cites says so, because that is a fact about the tree worth
 * seeing rather than an empty section.
 */
function drawCitedBy(page: HTMLElement, host: SourcePageHost): void {
  const group = element(page, "div", "gedcom-person-group is-events");
  element(group, "h2", "gedcom-person-group-title").textContent =
    host.labels.citedBy;
  if (host.citations.length === 0) {
    element(group, "div", "gedcom-person-event-detail").textContent =
      host.labels.citedByNobody;
    return;
  }
  const rows: CitationRow[] = host.citations.map((citation) => ({
    title: host.nameOf(citation.record),
    ...(citation.within === undefined
      ? {}
      : { within: host.within(citation.within) }),
    ...(citation.page === undefined ? {} : { page: citation.page }),
    open: () => {
      host.onCiter(citation);
    },
  }));
  drawCitations(group, rows);
}

/** The document it came from is named in the header, not repeated here. */
function drawSourceLink(head: HTMLElement, host: SourcePageHost): void {
  const line = element(head, "div", "gedcom-person-source");
  const link = element(line, "a", "gedcom-person-source-link");
  link.textContent = host.source.xref;
  link.setAttribute("role", "button");
  link.tabIndex = 0;
  link.addEventListener("click", () => {
    host.onOpenRecord();
  });
}

function element(
  parent: HTMLElement,
  tag: "div" | "span" | "h1" | "h2" | "a",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}
