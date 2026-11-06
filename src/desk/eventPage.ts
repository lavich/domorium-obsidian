import type { GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { linkButton } from "./dom";
import { renderEventDetail } from "./eventDetail";
import { eventTitle, type EventTarget } from "./eventRows";
import { familyTitle, personName } from "./labels";
import type { PageHost } from "./personPage";

function ownerName(index: GenealogyIndex, owner: string): string {
  const person = index.person(owner);
  if (person) {
    return personName(person);
  }
  return familyTitle(index.family(owner)?.spouseNames ?? []);
}

export function renderEventPage(container: HTMLElement, target: EventTarget, index: GenealogyIndex, host: PageHost): void {
  const { event, owner } = target;
  const lead = container.createDiv({ cls: "gedcom-desk-event-owner" });
  lead.createSpan({ cls: "gedcom-desk-event-kind", text: t(index.person(owner) ? "desk.person" : "desk.family") });
  linkButton(lead, ownerName(index, owner), () => host.openRecord(owner));

  const heading = container.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: eventTitle(event) });
  const place = event.place?.trim();
  const when = heading.createDiv({ cls: "gedcom-desk-subtitle" });
  if (!renderEventDetail(when, { ...(event.date?.text ? { date: event.date.text } : {}), ...(place ? { place } : {}) }, host)) {
    when.remove();
  }
  linkButton(heading, t("desk.showInSource"), () => host.showInSource(event.range));

  if (!event.date?.text && !place && event.citations.length === 0) {
    container.createDiv({ cls: "gedcom-desk-none", text: t("desk.eventStatesNothing") });
  }
}
