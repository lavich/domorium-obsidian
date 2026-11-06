import type { GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { linkButton } from "./dom";
import { eventTitle, type EventTarget } from "./eventRows";
import { familyTitle, personName, sourceTitle } from "./labels";
import type { PageHost } from "./personPage";
import { placeId } from "./placeRows";

function ownerName(index: GenealogyIndex, owner: string): string {
  const person = index.person(owner);
  if (person) {
    return personName(person);
  }
  return familyTitle(index.family(owner)?.spouseNames ?? []);
}

export function renderEventPage(container: HTMLElement, target: EventTarget, index: GenealogyIndex, host: PageHost): void {
  const { event, owner } = target;
  const heading = container.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: eventTitle(event) });
  linkButton(heading, t("desk.showInSource"), () => host.showInSource(event.range));

  const details = container.createDiv({ cls: "gedcom-desk-event-details" });
  const detail = (label: string): HTMLElement => {
    const line = details.createDiv({ cls: "gedcom-desk-event-detail" });
    line.createSpan({ cls: "gedcom-desk-event-label", text: label });
    return line.createSpan({ cls: "gedcom-desk-event-value" });
  };
  linkButton(detail(t("desk.eventRecord")), ownerName(index, owner), () => host.openRecord(owner));
  if (event.date?.text) {
    detail(t("desk.eventDate")).setText(event.date.text);
  }
  const place = event.place?.trim();
  if (place) {
    linkButton(detail(t("desk.eventPlace")), place, () => host.openRecord(placeId(place)));
  }

  if (event.citations.length > 0) {
    container.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.eventSources") });
    const sources = container.createDiv({ cls: "gedcom-desk-event-sources" });
    for (const citation of event.citations) {
      const record = citation.source;
      if (record !== undefined && index.source(record) !== undefined) {
        linkButton(sources, sourceTitle(index.source(record)?.title ?? record), () => host.openRecord(record));
      } else {
        sources.createDiv({ cls: "gedcom-desk-unfold-source", text: citation.inline ?? record ?? "" });
      }
    }
  }
  if (!event.date?.text && !place && event.citations.length === 0) {
    container.createDiv({ cls: "gedcom-desk-none", text: t("desk.eventStatesNothing") });
  }
}
