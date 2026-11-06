import type { Range } from "@domorium/language-service";

import type {
  GenealogyIndex,
  Missing,
  Person,
  PersonEvent,
  PersonRow,
} from "../genealogy";
import { plural, t } from "../i18n";
import { eventName, personName, shortPlace, yearsOf } from "./labels";
import { linkButton } from "./dom";
import { renderEventDetail } from "./eventDetail";
import { eventIdOf } from "./eventRows";
import { renderGallery, renderPortrait, type MediaItem } from "./media";
import { placesOf, timelineOf } from "./timeline";
import { renderPlaces, renderTimeline } from "./timelineView";
import type { PortraitContent } from "./graphCanvas";

/**
 * `p:<event>` for a person's own event, `u:<union>:<event>` for one of a family
 * they married into, `f:<event>` for a family's on its own page.
 */
export type FactKey = string;

export interface Fact {
  key: FactKey;
  /** The id the event is selected by; none where its record has no identifier. */
  eventId?: string;
  event: PersonEvent;
  /** The other spouse, for an event of a family the person married into. */
  spouse?: PersonRow;
}

export interface PageHost {
  openRecord(xref: string): void;
  select(key: FactKey | null): void;
  showInSource(range: Range): void;
  openFile(path: string): void;
  setIcon?(element: HTMLElement, icon: string): void;
  portrait?(xref: string): PortraitContent | null;
}

export interface PersonPageOptions {
  selected: FactKey | null;
  /** The files the record links, resolved by the host; none where omitted. */
  media?: MediaItem[];
}

export function factsOf(person: Person): Fact[] {
  const owner = person.xref;
  const own = person.events.map((event, at) => ({
    key: `p:${at}`,
    ...(owner === undefined ? {} : { eventId: eventIdOf(owner, person.events, event) }),
    event,
  }));
  const married = person.unions.flatMap((union, u) =>
    union.events.map((event, at) => ({
      key: `u:${u}:${at}`,
      ...(union.family.xref === undefined ? {} : { eventId: eventIdOf(union.family.xref, union.events, event) }),
      event,
      ...(union.spouse === undefined ? {} : { spouse: union.spouse }),
    })),
  );
  return [...own, ...married];
}

export function factByKey(person: Person, key: FactKey | null): Fact | undefined {
  return key === null ? undefined : factsOf(person).find((fact) => fact.key === key);
}

export function renderPersonPage(
  container: HTMLElement,
  person: Person,
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  renderHeading(container, person, options, host);
  renderFactList(container, factsOf(person), index, options, host);
  if (person.otherNames.length > 0) {
    container.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.otherNames") });
    const names = container.createDiv({ cls: "gedcom-desk-names" });
    for (const name of person.otherNames) {
      names.createDiv({ cls: "gedcom-desk-name", text: personName({ name }) });
    }
  }
  renderFamily(container, person, host);
  renderGallery(container, options.media ?? [], host);
  const timeline = timelineOf(person, index);
  container.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.timeline") });
  renderTimeline(container, timeline, host);
  container.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.places") });
  renderPlaces(container, placesOf(timeline), host);
}

function renderHeading(
  page: HTMLElement,
  person: Person,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const who = page.createDiv({ cls: "gedcom-desk-who" });
  renderPortrait(who, options.media ?? []);
  const heading = who.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: personName(person) });
  const birth = shortPlace(person.events.find((event) => event.tag === "BIRT")?.place);
  const death = shortPlace(person.events.find((event) => event.tag === "DEAT")?.place);
  const places = birth && death && birth !== death ? `${birth} → ${death}` : (birth ?? death);
  const line = [yearsOf(person), places].filter(Boolean).join(" · ");
  if (line) {
    heading.createDiv({ cls: "gedcom-desk-subtitle", text: line });
  }
  const selected = factByKey(person, options.selected);
  linkButton(heading, t("desk.showInSource"), () => {
    host.showInSource(selected?.event.range ?? person.range);
  });
}

export function renderFactList(
  page: HTMLElement,
  facts: Fact[],
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  page.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.facts") });
  const list = page.createDiv({ cls: "gedcom-desk-facts" });
  if (facts.length === 0) {
    list.createDiv({ cls: "gedcom-desk-none", text: t("desk.noFacts") });
  }
  for (const fact of facts) {
    const row = list.createDiv({ cls: "gedcom-desk-fact" });
    const id = fact.eventId;
    const name = row.createEl("button", { cls: "gedcom-desk-fact-name", text: eventName(fact.event) });
    name.setAttribute("type", "button");
    name.setAttribute("data-focus-key", fact.key);
    if (id !== undefined) {
      row.addEventListener("click", (click) => {
        if (!(click.target as HTMLElement).closest(".gedcom-desk-link")) {
          host.openRecord(id);
        }
      });
    } else {
      name.setAttribute("disabled", "");
    }
    renderFactValue(row.createSpan({ cls: "gedcom-desk-fact-value" }), fact, host);
    const count = fact.event.citations.length;
    row.createSpan({
      cls: ["gedcom-desk-chip", count > 0 ? "has-source" : "no-source"],
      text: count > 0 ? plural("desk.sources", count) : t("desk.noSource"),
    });
  }
}

function renderFactValue(value: HTMLElement, fact: Fact, host: PageHost): void {
  const { date, place, value: own } = fact.event;
  const shown = renderEventDetail(
    value,
    {
      ...(date?.text ? { date: date.text } : {}),
      ...(place ? { place } : {}),
      ...(own ? { text: own } : {}),
      ...(fact.spouse ? { spouse: t("desk.with", { name: personName(fact.spouse) }) } : {}),
    },
    host,
  );
  if (!shown) {
    value.setText(t("desk.noDetails"));
  }
  value.toggleClass("is-empty", !shown);
}

function renderFamily(page: HTMLElement, person: Person, host: PageHost): void {
  page.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.family") });
  const family = page.createDiv({ cls: "gedcom-desk-family" });

  const parents = kinGroup(family, t("desk.parents"));
  for (const parent of person.parents) {
    relative(parents, parent, host);
  }
  for (const missing of person.missingParents) {
    missingRelative(parents, missing, host);
  }
  if (person.parents.length === 0 && person.missingParents.length === 0) {
    parents.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
  }

  if (person.siblings.length > 0) {
    const siblings = kinGroup(family, t("desk.siblings"));
    for (const sibling of person.siblings) {
      relative(siblings, sibling, host);
    }
  }

  for (const union of person.unions) {
    const spouse = union.spouse;
    const marriage = union.events.find((event) => event.tag === "MARR");
    const when = [marriage?.date?.text, shortPlace(marriage?.place)].filter(Boolean).join(", ");
    const role =
      spouse?.sex === "M" ? t("desk.husband")
      : spouse?.sex === "F" ? t("desk.wife")
      : t("desk.spouse");
    const partner = kinGroup(family, role);
    if (spouse) {
      relative(partner, spouse, host, when ? t("desk.married", { when }) : undefined);
    }
    for (const missing of union.missingSpouses) {
      missingRelative(partner, missing, host);
    }
    if (!spouse && union.missingSpouses.length === 0) {
      partner.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
    }
    const familyXref = union.family.xref;
    if (familyXref) {
      linkButton(partner, t("desk.familyPage"), () => host.openRecord(familyXref));
    }
    if (union.children.length > 0 || union.missingChildren.length > 0) {
      const children = kinGroup(family, t("desk.children"));
      for (const child of union.children) {
        relative(children, child, host);
      }
      for (const missing of union.missingChildren) {
        missingRelative(children, missing, host);
      }
    }
  }
  for (const missing of person.missingUnions) {
    missingRelative(kinGroup(family, t("desk.spouse")), missing, host);
  }
}

export function kinGroup(family: HTMLElement, label: string): HTMLElement {
  family.createDiv({ cls: "gedcom-desk-kin-label", text: label });
  return family.createDiv({ cls: "gedcom-desk-kin" });
}

export function relative(
  group: HTMLElement,
  row: PersonRow,
  host: PageHost,
  note?: string,
): void {
  const button = group.createEl("button", { cls: "gedcom-desk-person" });
  button.setAttribute("type", "button");
  button.createSpan({ cls: "gedcom-desk-person-name", text: personName(row) });
  const years = yearsOf(row);
  if (years) {
    button.createSpan({ cls: "gedcom-desk-person-years", text: years });
  }
  if (note) {
    button.createSpan({ cls: "gedcom-desk-person-note", text: note });
  }
  const xref = row.xref;
  if (xref) {
    button.setAttribute("data-focus-key", xref);
    button.addEventListener("click", () => host.openRecord(xref));
  }
}

export function missingRelative(group: HTMLElement, missing: Missing, host: PageHost): void {
  const line = group.createDiv({ cls: "gedcom-desk-missing" });
  line.createSpan({ text: t("desk.missingRecord") });
  linkButton(line, t("desk.showInSource"), () => host.showInSource(missing.range));
}
