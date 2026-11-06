import type { GenealogyIndex } from "../genealogy";
import { plural, t } from "../i18n";
import { linkButton } from "./dom";
import { eventName, familyTitle, personName } from "./labels";
import { occurrencesAt, yearsText, type PlaceRow } from "./placeRows";
import type { PageHost } from "./personPage";

export function renderPlacePage(container: HTMLElement, place: PlaceRow, index: GenealogyIndex, host: PageHost): void {
  const heading = container.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: place.name });
  const years = yearsText(place);
  heading.createDiv({
    cls: "gedcom-desk-subtitle",
    text: [plural("places.count", place.events), years].filter(Boolean).join(" · "),
  });

  container.createEl("h2", { cls: "gedcom-desk-section", text: t("desk.placeEvents") });
  const list = container.createDiv({ cls: "gedcom-desk-place-occurrences" });
  for (const { event, record } of occurrencesAt(index, place.key)) {
    const person = index.person(record);
    const family = person ? undefined : index.family(record);
    const who = person ? personName(person) : family ? familyTitle(family.spouseNames) : record;
    const row = list.createDiv({ cls: "gedcom-desk-place-occurrence" });
    linkButton(row, `${eventName(event)} · ${who}`, () => host.openRecord(record));
    if (event.date?.text) {
      row.createSpan({ cls: "gedcom-desk-place-when", text: event.date.text });
    }
  }
}
