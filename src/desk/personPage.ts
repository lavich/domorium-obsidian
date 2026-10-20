import type { Range } from "@domorium/language-service";

import type {
  GenealogyIndex,
  Missing,
  Person,
  PersonEvent,
  PersonRow,
} from "../genealogy";
import { plural, t } from "../i18n";
import { eventName, personName, shortPlace, sourceTitle, yearsOf } from "./labels";

/** `p:<event>` for a person's own event, `u:<union>:<event>` for a family's. */
export type FactKey = string;

export interface Fact {
  key: FactKey;
  event: PersonEvent;
  /** The other spouse, for an event of a family the person married into. */
  spouse?: PersonRow;
}

export interface PageHost {
  openRecord(xref: string): void;
  select(key: FactKey | null): void;
  showInSource(range: Range): void;
  openEvidence(): void;
}

export interface PersonPageOptions {
  selected: FactKey | null;
  phone: boolean;
}

export function factsOf(person: Person): Fact[] {
  const own = person.events.map((event, at) => ({ key: `p:${at}`, event }));
  const married = person.unions.flatMap((union, u) =>
    union.events.map((event, at) => ({
      key: `u:${u}:${at}`,
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
  container.empty();
  const page = container.createDiv({ cls: "gedcom-desk-page" });
  renderHeading(page, person, options, host);
  renderFacts(page, person, index, options, host);
  if (person.otherNames.length > 0) {
    page.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.otherNames") });
    const names = page.createDiv({ cls: "gedcom-desk-names" });
    for (const name of person.otherNames) {
      names.createDiv({ cls: "gedcom-desk-name", text: personName({ name }) });
    }
  }
  renderFamily(page, person, host);
}

function renderHeading(
  page: HTMLElement,
  person: Person,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const heading = page.createDiv({ cls: "gedcom-desk-heading" });
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

function renderFacts(
  page: HTMLElement,
  person: Person,
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  page.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.facts") });
  const list = page.createDiv({ cls: "gedcom-desk-facts" });
  for (const fact of factsOf(person)) {
    const selected = fact.key === options.selected;
    const row = list.createEl("button", { cls: "gedcom-desk-fact" });
    row.setAttribute("type", "button");
    row.setAttribute("aria-pressed", String(selected));
    row.toggleClass("is-selected", selected);
    row.addEventListener("click", () => {
      host.select(selected ? null : fact.key);
    });
    row.createSpan({ cls: "gedcom-desk-fact-name", text: eventName(fact.event) });
    renderFactValue(row.createSpan({ cls: "gedcom-desk-fact-value" }), fact);
    const count = fact.event.citations.length;
    row.createSpan({
      cls: ["gedcom-desk-chip", count > 0 ? "has-source" : "no-source"],
      text: count > 0 ? plural("desk.sources", count) : t("desk.noSource"),
    });
    if (selected && options.phone) {
      renderUnfold(list, fact, index, host);
    }
  }
}

function renderFactValue(value: HTMLElement, fact: Fact): void {
  const { date, place, value: own } = fact.event;
  const parts = [
    date?.text,
    place,
    own,
    fact.spouse ? t("desk.with", { name: personName(fact.spouse) }) : undefined,
  ].filter((part): part is string => Boolean(part));
  value.setText(parts.length > 0 ? parts.join(" · ") : t("desk.noDetails"));
  value.toggleClass("is-empty", parts.length === 0);
}

function renderUnfold(
  list: HTMLElement,
  fact: Fact,
  index: GenealogyIndex,
  host: PageHost,
): void {
  const unfold = list.createDiv({ cls: "gedcom-desk-unfold" });
  const citations = fact.event.citations;
  if (citations.length === 0) {
    unfold.createDiv({ cls: "gedcom-desk-unfold-none", text: t("desk.noOwnSource") });
  }
  for (const citation of citations) {
    const title = citation.source
      ? sourceTitle(index.source(citation.source)?.title ?? citation.source)
      : (citation.inline ?? "");
    unfold.createDiv({ cls: "gedcom-desk-unfold-source", text: title });
  }
  const actions = unfold.createDiv({ cls: "gedcom-desk-actions" });
  linkButton(actions, t("desk.allEvidence"), () => host.openEvidence());
  linkButton(actions, t("desk.showInSource"), () => host.showInSource(fact.event.range));
}

function renderFamily(page: HTMLElement, person: Person, host: PageHost): void {
  page.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.family") });
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

function kinGroup(family: HTMLElement, label: string): HTMLElement {
  family.createDiv({ cls: "gedcom-desk-kin-label", text: label });
  return family.createDiv({ cls: "gedcom-desk-kin" });
}

function relative(
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
    button.addEventListener("click", () => host.openRecord(xref));
  }
}

function missingRelative(group: HTMLElement, missing: Missing, host: PageHost): void {
  const line = group.createDiv({ cls: "gedcom-desk-missing" });
  line.createSpan({ text: t("desk.missingRecord") });
  linkButton(line, t("desk.showInSource"), () => host.showInSource(missing.range));
}

export function linkButton(
  parent: HTMLElement,
  text: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "gedcom-desk-link", text });
  button.setAttribute("type", "button");
  button.addEventListener("click", onClick);
  return button;
}
