import type { Family, GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { familyTitle, shortPlace } from "./labels";
import { renderGallery } from "./media";
import { linkButton } from "./dom";
import {
  drawTree,
  type Fact,
  type PageHost,
  type PersonPageOptions,
} from "./personPage";

export function familyFacts(family: Family): Fact[] {
  return family.events.map((event, at) => ({ key: `f:${at}`, event }));
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
  linkButton(heading, t("desk.showInSource"), () => {
    host.showInSource(family.range);
  });

  drawTree(page, lines, index, host, options, familyFacts(family));

  renderGallery(page, options.media ?? [], host);
}
