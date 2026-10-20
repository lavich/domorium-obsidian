import type { Family, GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { familyTitle, shortPlace } from "./labels";
import {
  kinGroup,
  linkButton,
  missingRelative,
  relative,
  renderFactList,
  type Fact,
  type FactKey,
  type PageHost,
  type PersonPageOptions,
} from "./personPage";

export function familyFacts(family: Family): Fact[] {
  return family.events.map((event, at) => ({ key: `f:${at}`, event }));
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
  container.empty();
  const page = container.createDiv({ cls: "gedcom-desk-page" });
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

  renderFactList(page, familyFacts(family), index, options, host);

  page.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.family") });
  const members = page.createDiv({ cls: "gedcom-desk-family" });
  for (const spouse of family.spouses) {
    const role =
      spouse.role === "HUSB" ? t("desk.husband")
      : spouse.role === "WIFE" ? t("desk.wife")
      : t("desk.spouse");
    relative(kinGroup(members, role), spouse, host);
  }
  for (const missing of family.missingSpouses) {
    missingRelative(kinGroup(members, t("desk.spouse")), missing, host);
  }
  const children = kinGroup(members, t("desk.children"));
  for (const child of family.children) {
    relative(children, child, host);
  }
  for (const missing of family.missingChildren) {
    missingRelative(children, missing, host);
  }
  if (family.children.length === 0 && family.missingChildren.length === 0) {
    children.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
  }
}
