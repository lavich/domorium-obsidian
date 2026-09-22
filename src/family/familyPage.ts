import type {
  Citation,
  Family,
  FamilyMember,
  PersonEvent,
} from "../genealogy";
import { drawCitations, withinOf } from "../source/citationRows";

/** Already in the reader's language. */
export interface FamilyPageLabels {
  spouses: string;
  children: string;
  events: string;
  sources: string;
  /** What to call a family whose record names nobody and has no identifier. */
  unnamed: string;
  unresolved: (xref: string) => string;
}

/**
 * Everything the page needs, handed in, as the person's page takes it: it
 * reaches for neither the plugin's language state nor the application.
 */
export interface FamilyPageHost {
  labels: FamilyPageLabels;
  eventLabel: (tag: string) => string;
  source: { document: string; xref: string };
  onPerson: (member: FamilyMember) => void;
  onOpenRecord: () => void;
  /** What this family cites. Empty where the record cites nothing. */
  citations?: Citation[];
  /** The title of a source cited, or the identifier where it has none. */
  titleOf?: (xref: string) => string;
  /** Phrases where in the record a citation hung, already named. */
  within?: (what: string) => string;
  onSource?: (citation: Citation) => void;
}

export function renderFamilyPage(
  container: HTMLElement,
  family: Family,
  host: FamilyPageHost,
): void {
  container.replaceChildren();
  // The person's page and this one share their classes on purpose: they are
  // the same page with different contents, and one set of rules dresses both.
  const page = element(container, "div", "gedcom-person-page");

  const head = element(page, "div", "gedcom-person-head");
  element(head, "h1", "gedcom-person-title").textContent =
    family.name ?? family.xref ?? host.labels.unnamed;
  const year = family.marriage?.year;
  if (year !== undefined) {
    element(head, "div", "gedcom-person-lifespan").textContent = String(year);
  }
  drawSource(head, host);

  drawGroup(page, host.labels.spouses, family.spouses, host);
  drawGroup(page, host.labels.children, family.children, host);
  for (const xref of family.unresolved) {
    element(page, "div", "gedcom-person-unresolved").textContent =
      host.labels.unresolved(xref);
  }

  drawEvents(page, family.events, host);
  drawSources(page, host);
}

/** As on a person's page, and silent for the same reason where empty. */
function drawSources(page: HTMLElement, host: FamilyPageHost): void {
  const citations = host.citations ?? [];
  if (citations.length === 0) {
    return;
  }
  const group = element(page, "div", "gedcom-person-group is-events");
  element(group, "h2", "gedcom-person-group-title").textContent =
    host.labels.sources;
  const phrase = host.within ?? ((what: string) => what);
  drawCitations(
    group,
    citations.map((citation) => {
      const within = withinOf(citation, host.eventLabel, phrase);
      return {
        title: host.titleOf?.(citation.source) ?? citation.source,
        ...(within === undefined ? {} : { within }),
        ...(citation.page === undefined ? {} : { page: citation.page }),
        open: () => {
          host.onSource?.(citation);
        },
      };
    }),
  );
}

function drawGroup(
  page: HTMLElement,
  title: string,
  members: FamilyMember[],
  host: FamilyPageHost,
): void {
  if (members.length === 0) {
    return;
  }
  const group = element(page, "div", "gedcom-person-group");
  element(group, "h2", "gedcom-person-group-title").textContent = title;
  for (const member of members) {
    const row = element(group, "div", "gedcom-person-relative");
    row.tabIndex = 0;
    element(row, "span", "gedcom-person-relative-name").textContent =
      member.name;
    const span = lifespan(member);
    if (span) {
      element(row, "span", "gedcom-person-relative-years").textContent = span;
    }
    row.addEventListener("click", () => {
      host.onPerson(member);
    });
  }
}

function drawEvents(
  page: HTMLElement,
  events: PersonEvent[],
  host: FamilyPageHost,
): void {
  if (events.length === 0) {
    return;
  }
  const group = element(page, "div", "gedcom-person-group is-events");
  element(group, "h2", "gedcom-person-group-title").textContent =
    host.labels.events;
  for (const event of events) {
    const row = element(group, "div", "gedcom-person-event");
    element(row, "div", "gedcom-person-event-label").textContent =
      host.eventLabel(event.tag);
    for (const value of [event.date?.text, event.place, event.value]) {
      if (value) {
        element(row, "div", "gedcom-person-event-detail").textContent = value;
      }
    }
  }
}

/** The document it came from is named in the header, not repeated here. */
function drawSource(head: HTMLElement, host: FamilyPageHost): void {
  const line = element(head, "div", "gedcom-person-source");
  const link = element(line, "a", "gedcom-person-source-link");
  link.textContent = host.source.xref;
  link.setAttribute("role", "button");
  link.tabIndex = 0;
  link.addEventListener("click", () => {
    host.onOpenRecord();
  });
}

/** `1901–1975`, `1931–`, `–1975`, or nothing at all. */
function lifespan(member: FamilyMember): string | null {
  const born = member.birth?.year;
  const died = member.death?.year;
  if (born === undefined && died === undefined) {
    return null;
  }
  return `${born ?? ""}–${died ?? ""}`;
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
