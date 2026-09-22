import { drawnCrop, type PreviewBounds } from "../editor/media";
import { applyCrop } from "../editor/mediaPreviewView";
import {
  UNNAMED,
  type Person,
  type PersonEvent,
  type PersonMedia,
  type PersonRow,
} from "../genealogy";

/** Already in the reader's language. */
export interface PersonPageLabels {
  otherNames: string;
  parents: string;
  partners: string;
  children: string;
  events: string;
  openInGedcom: string;
  born: string;
  died: string;
  /** The label; `sex` below names the value. */
  sexLabel: string;
  /** What to call a person whose record carries no name. */
  unnamed: string;
  unresolved: (xref: string) => string;
  /** `M`, `F` or whatever else the record states. */
  sex: (value: string) => string;
}

/**
 * Everything the page needs, handed in: it reaches for nothing global, neither
 * the plugin's language state — set once at load, so the page could not be
 * drawn twice in two languages — nor the application, which a test does not
 * have.
 */
export interface PersonPageHost {
  labels: PersonPageLabels;
  source: { document: string; xref: string };
  /**
   * A vault path made drawable, or nothing. Answering nothing for a web
   * address is how the page keeps its promise not to fetch one; that question
   * is the media preview's, with a setting of its own.
   */
  resolveMedia?: (file: string) => string | null;
  /** The host measures; the page does not. */
  portraitBounds?: PreviewBounds;
  /** Names an event's tag. The model reads more tags than a catalogue names. */
  eventLabel: (tag: string) => string;
  onPerson: (relative: PersonRow) => void;
  onOpenSource: () => void;
  /** The picture itself, whole rather than cut. */
  onOpenPicture?: (picture: PersonMedia) => void;
}

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
 * The cutting is the media preview's, not a second implementation. A file that
 * will not load leaves the page as if none were named: a missing picture is
 * not worth an error in place of a person.
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
  // A face cut out of a group is a reason to want the group.
  frame.setAttribute("role", "button");
  frame.tabIndex = 0;
  frame.addEventListener("click", () => {
    host.onOpenPicture?.(portrait);
  });
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
  // Now, not on load: a cropped frame carries no bound until it is sized, so
  // an unsized photograph paints whole for the length of the load — for a
  // group photograph, a flash of somebody else's face.
  applyCrop(frame, image, wanted, bounds);
  image.addEventListener("load", () => {
    const crop = drawnCrop(wanted, image.naturalWidth, image.naturalHeight);
    if (!crop) {
      // A rectangle the picture does not reach means show the whole picture.
      frame.classList.remove("is-cropped");
      frame.style.removeProperty("width");
      frame.style.removeProperty("height");
      image.style.removeProperty("transform");
      return;
    }
    applyCrop(frame, image, crop, bounds);
  });
  image.src = url;
}

/** A label never appears without the field it names. */
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

  // Named rather than swallowed: the reader can go and fix it.
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
  // The page's one separator hangs on this class.
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
  for (const value of [event.date?.text, event.place, event.value]) {
    if (value) {
      element(row, "div", "gedcom-person-event-detail").textContent = value;
    }
  }
}

/** The document it came from is named in the header, not repeated here. */
function drawSource(head: HTMLElement, host: PersonPageHost): void {
  const line = element(head, "div", "gedcom-person-source");
  const link = element(line, "a", "gedcom-person-source-link");
  link.textContent = host.source.xref;
  link.setAttribute("role", "button");
  link.tabIndex = 0;
  link.setAttribute("aria-label", host.labels.openInGedcom);
  link.addEventListener("click", () => {
    host.onOpenSource();
  });
}

/** `1901–1975`, `1931–`, `–1975`, or nothing at all. */
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
