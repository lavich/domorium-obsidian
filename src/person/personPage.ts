import { UNNAMED, type Person, type PersonEvent, type PersonRow } from "../genealogy";

/** The page's own words, already in the reader's language. */
export interface PersonPageLabels {
  otherNames: string;
  parents: string;
  partners: string;
  children: string;
  events: string;
  openInGedcom: string;
  /** What to call a person whose record carries no name. */
  unnamed: string;
  /** Said of an identifier the document does not declare. */
  unresolved: (xref: string) => string;
  /** `M`, `F` or whatever else the record states. */
  sex: (value: string) => string;
}

/**
 * Everything the page needs, handed in.
 *
 * It reaches for nothing global: not the plugin's language state, which is set
 * once at load and would make the page undrawable twice in two languages, and
 * not the application, which a test and the browser harness do not have. What
 * it does when a relative is chosen is its caller's business too.
 */
export interface PersonPageHost {
  labels: PersonPageLabels;
  /** Names an event's tag. The model reads more tags than a catalogue names. */
  eventLabel: (tag: string) => string;
  onPerson: (relative: PersonRow) => void;
  onOpenSource: () => void;
}

/** Draws one person into the container, in place of whatever it held. */
export function renderPersonPage(
  container: HTMLElement,
  person: Person,
  host: PersonPageHost,
): void {
  container.replaceChildren();
  const page = element(container, "div", "gedcom-person-page");

  drawIdentity(page, person, host);
  drawFamily(page, person, host);
  drawEvents(page, person, host);
  drawSource(page, host);
}

function drawIdentity(
  page: HTMLElement,
  person: Person,
  host: PersonPageHost,
): void {
  const head = element(page, "div", "gedcom-person-head");
  element(head, "h1", "gedcom-person-title").textContent =
    person.name === UNNAMED ? host.labels.unnamed : person.name;

  const span = lifespan(person);
  if (span) {
    element(head, "div", "gedcom-person-lifespan").textContent = span;
  }

  // A field the record does not state is left out. No dash, no "unknown".
  const fields = element(page, "div", "gedcom-person-fields");
  for (const value of [
    person.birth?.text,
    person.death?.text,
    person.place,
    person.sex === undefined ? undefined : host.labels.sex(person.sex),
  ]) {
    if (value) {
      element(fields, "div", "gedcom-person-field").textContent = value;
    }
  }
  if (!fields.hasChildNodes()) {
    fields.remove();
  }

  if (person.otherNames.length > 0) {
    const other = element(page, "div", "gedcom-person-other-names");
    element(other, "div", "gedcom-person-group-label").textContent =
      host.labels.otherNames;
    for (const name of person.otherNames) {
      element(other, "div", "gedcom-person-other-name").textContent = name;
    }
  }
}

function drawFamily(
  page: HTMLElement,
  person: Person,
  host: PersonPageHost,
): void {
  const groups: [string, PersonRow[]][] = [
    [host.labels.parents, person.parents],
    [host.labels.partners, person.partners],
    [host.labels.children, person.children],
  ];
  for (const [title, people] of groups) {
    if (people.length === 0) {
      continue;
    }
    const group = element(page, "div", "gedcom-person-group");
    element(group, "h2", "gedcom-person-group-title").textContent = title;
    for (const relative of people) {
      drawRelative(group, relative, host);
    }
  }

  // Named rather than swallowed: a pointer the document does not answer is
  // something the reader can go and fix.
  for (const xref of person.unresolved) {
    element(page, "div", "gedcom-person-unresolved").textContent =
      host.labels.unresolved(xref);
  }
}

function drawRelative(
  group: HTMLElement,
  relative: PersonRow,
  host: PersonPageHost,
): void {
  const row = element(group, "div", "gedcom-person-relative");
  row.tabIndex = 0;
  element(row, "span", "gedcom-person-relative-name").textContent =
    relative.name === UNNAMED ? host.labels.unnamed : relative.name;
  const span = lifespan(relative);
  if (span) {
    element(row, "span", "gedcom-person-relative-years").textContent = span;
  }
  row.addEventListener("click", () => {
    host.onPerson(relative);
  });
}

function drawEvents(
  page: HTMLElement,
  person: Person,
  host: PersonPageHost,
): void {
  if (person.events.length === 0) {
    return;
  }
  const group = element(page, "div", "gedcom-person-group");
  element(group, "h2", "gedcom-person-group-title").textContent =
    host.labels.events;
  for (const event of person.events) {
    drawEvent(group, event, host);
  }
}

function drawEvent(
  group: HTMLElement,
  event: PersonEvent,
  host: PersonPageHost,
): void {
  const row = element(group, "div", "gedcom-person-event");
  element(row, "div", "gedcom-person-event-label").textContent =
    host.eventLabel(event.tag);
  // The date as the record wrote it, whether or not a year was read from it.
  for (const value of [event.date?.text, event.place, event.value]) {
    if (value) {
      element(row, "div", "gedcom-person-event-detail").textContent = value;
    }
  }
}

function drawSource(page: HTMLElement, host: PersonPageHost): void {
  const action = element(page, "button", "gedcom-person-source");
  action.textContent = host.labels.openInGedcom;
  action.addEventListener("click", () => {
    host.onOpenSource();
  });
}

/** `1901–1975`, `1931–`, `–1975`, or nothing where neither year was read. */
function lifespan(person: PersonRow): string | null {
  const born = person.birth?.year;
  const died = person.death?.year;
  if (born === undefined && died === undefined) {
    return null;
  }
  return `${born ?? ""}–${died ?? ""}`;
}

function element(
  parent: HTMLElement,
  tag: "div" | "span" | "h1" | "h2" | "button",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}
