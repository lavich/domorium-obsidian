import { eventIdOf } from "./eventRows";
import type { Family, GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { familyTitle, shortPlace } from "./labels";
import { renderGallery } from "./media";
import { linkButton } from "./dom";
import {
  drawTree,
  type Fact,
  type FactKey,
  type PageHost,
  type PersonPageOptions,
} from "./personPage";

export function familyFacts(family: Family): Fact[] {
  const owner = family.xref;
  return family.events.map((event, at) => ({
    key: `f:${at}`,
    ...(owner === undefined ? {} : { eventId: eventIdOf(owner, family.events, event) }),
    event,
  }));
}

export function familyFactByKey(family: Family, key: FactKey | null): Fact | undefined {
  return key === null ? undefined : familyFacts(family).find((fact) => fact.key === key);
}

export function renderFamilyPage(
  container: HTMLElement,
  family: Family,
  index: GenealogyIndex,
  options: PersonPageOptions,
  host: PageHost,
): void {
  const page = container;
  const lines = family.xref === undefined ? undefined : index.record(family.xref);
  const heading = page.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: familyTitle(family.spouseNames) });
  const marriage = family.events.find((event) => event.tag === "MARR");
  const when = [marriage?.date?.text, shortPlace(marriage?.place)].filter(Boolean).join(", ");
  if (when) {
    heading.createDiv({ cls: "gedcom-desk-subtitle", text: t("desk.married", { when }) });
  }
  const selected = familyFactByKey(family, options.selected);
  linkButton(heading, t("desk.showInSource"), () => {
    host.showInSource(selected?.event.range ?? family.range);
  });

  drawTree(page, lines, index, host, options, familyFacts(family));

  renderGallery(page, options.media ?? [], host);
}
