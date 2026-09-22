import { drawnCrop, type PreviewBounds } from "../editor/media";
import { applyCrop } from "../editor/mediaPreviewView";
import {
  UNNAMED,
  type Person,
  type PersonEvent,
  type PersonMedia,
  type PersonRow,
} from "../genealogy";

/** The page's own words, already in the reader's language. */
export interface PersonPageLabels {
  otherNames: string;
  parents: string;
  partners: string;
  children: string;
  events: string;
  openInGedcom: string;
  born: string;
  died: string;
  /** The label beside the recorded sex; `sex` below names the value. */
  sexLabel: string;
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
  /** Which record this is a reading of, shown and reachable from the page. */
  source: { document: string; xref: string };
  /**
   * A vault path made drawable, or nothing for a file the host will not or
   * cannot serve. Answering nothing for a web address is how the page keeps
   * its promise not to fetch one: that question belongs to the media preview
   * and its setting, and is not answered a second way here.
   */
  resolveMedia?: (file: string) => string | null;
  /** How large the portrait may be. The host measures; the page does not. */
  portraitBounds?: PreviewBounds;
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
}

const PORTRAIT_BOUNDS: PreviewBounds = { width: 120, height: 120 };

function drawIdentity(
  page: HTMLElement,
  person: Person,
  host: PersonPageHost,
): void {
  const top = element(page, "div", "gedcom-person-top");
  drawPortrait(top, person.portrait, host);
  const head = element(top, "div", "gedcom-person-head");
  element(head, "h1", "gedcom-person-title").textContent =
    person.name === UNNAMED ? host.labels.unnamed : person.name;

  const span = lifespan(person);
  if (span) {
    element(head, "div", "gedcom-person-lifespan").textContent = span;
  }

  drawSource(head, host);

  // A summary of who the person was, labelled so the reader does not have to
  // infer which date is which from the order. It does not replace the events
  // below, which are the record in full and in its own order.
  const facts = element(page, "div", "gedcom-person-facts");
  const birth = person.events.find((event) => event.tag === "BIRT");
  const death = person.events.find((event) => event.tag === "DEAT");
  drawFact(facts, host.labels.born, person.birth?.text, birth?.place);
  drawFact(facts, host.labels.died, person.death?.text, death?.place);
  drawFact(
    facts,
    host.labels.sexLabel,
    person.sex === undefined ? undefined : host.labels.sex(person.sex),
    undefined,
  );
  if (!facts.hasChildNodes()) {
    facts.remove();
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

/**
 * The face beside the name, cut to the rectangle the record names.
 *
 * The cutting is the media preview's, not a second implementation: the image
 * sits behind a frame at its own size, moved so the rectangle's corner meets
 * the frame's. Its size is unknown until it loads, so the rectangle is applied
 * then; a file that will not load leaves the page as if none were named, since
 * a missing picture is not worth an error in place of a person.
 */
function drawPortrait(
  top: HTMLElement,
  portrait: PersonMedia | undefined,
  host: PersonPageHost,
): void {
  const url = portrait && host.resolveMedia?.(portrait.file);
  if (!portrait || !url) {
    return;
  }
  const bounds = host.portraitBounds ?? PORTRAIT_BOUNDS;
  const frame = element(top, "div", "gedcom-person-portrait");
  const image = top.ownerDocument.createElement("img");
  image.className = "gedcom-person-portrait-image";
  image.alt = portrait.title ?? "";
  frame.append(image);

  image.addEventListener("error", () => {
    frame.remove();
  });

  if (!portrait.crop) {
    image.src = url;
    return;
  }
  const wanted = portrait.crop;
  frame.classList.add("is-cropped");
  image.addEventListener("load", () => {
    const crop = drawnCrop(wanted, image.naturalWidth, image.naturalHeight);
    if (!crop) {
      // A rectangle the image does not reach means show the whole image.
      frame.classList.remove("is-cropped");
      return;
    }
    applyCrop(frame, image, crop, bounds);
  });
  image.src = url;
}

/**
 * One labelled fact, with its place beneath the date it belongs to so that the
 * two read as one thing. A label never appears without the field it names.
 */
function drawFact(
  facts: HTMLElement,
  label: string,
  value: string | undefined,
  place: string | undefined,
): void {
  if (!value) {
    return;
  }
  const fact = element(facts, "div", "gedcom-person-fact");
  element(fact, "div", "gedcom-person-fact-label").textContent = label;
  const body = element(fact, "div", "gedcom-person-fact-body");
  element(body, "div", "gedcom-person-fact-value").textContent = value;
  if (place) {
    element(body, "div", "gedcom-person-fact-place").textContent = place;
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
  // The one separator on the page hangs on this class: it divides the summary
  // of a person from the record of their life.
  const group = element(page, "div", "gedcom-person-group is-events");
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

/**
 * Which record this page is a reading of. Person view does not replace a
 * GEDCOM record and should not look as though it has; with two documents open
 * this line is the only thing distinguishing two people who share an
 * identifier. The identifier is also the way to the record, so the page does
 * not carry a second control saying the same thing.
 */
function drawSource(head: HTMLElement, host: PersonPageHost): void {
  const line = element(head, "div", "gedcom-person-source");
  element(line, "span", "gedcom-person-source-file").textContent =
    host.source.document;
  element(line, "span", "gedcom-person-source-sep").textContent = " · ";
  const link = element(line, "a", "gedcom-person-source-link");
  link.textContent = host.source.xref;
  link.setAttribute("role", "button");
  link.tabIndex = 0;
  link.setAttribute("aria-label", host.labels.openInGedcom);
  link.addEventListener("click", () => {
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
  tag: "div" | "span" | "h1" | "h2" | "a",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}
