import { eventIdOf } from "./eventRows";
import type { Family, GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { familyTitle, shortPlace } from "./labels";
import { renderGallery } from "./media";
import type { RecordLine } from "../genealogy";
import { renderRest, type DetailContext } from "./detail/lineView";
import { sectionHeading } from "./detail/section";
import { linkButton } from "./dom";
import {
  drawTree,
  kinGroup,
  markOf,
  missingRelative,
  relative,
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

function drawRest(parent: HTMLElement, line: RecordLine | undefined, ctx: DetailContext): void {
  if (line && line.children.length > 0) {
    renderRest(parent.createDiv({ cls: "gedcom-detail" }), line, new Set(), ctx);
  }
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
  const ctx: DetailContext = {
    index,
    host: { openRecord: (xref) => host.openRecord(xref), showInSource: (range) => host.showInSource(range) },
    notes: { drawn: 0 },
    ...(options.open === undefined ? {} : { open: options.open }),
    ...(options.folded === undefined ? {} : { folded: (id: string, open: boolean) => options.folded?.(id, open) }),
  };
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

  sectionHeading(page, t("desk.family"));
  const members = page.createDiv({ cls: "gedcom-desk-family" });
  const lineOf = (tag: string, xref: string | undefined): RecordLine | undefined =>
    lines?.children.find((line) => line.tag === tag && line.pointer === xref);
  for (const spouse of family.spouses) {
    const role =
      spouse.role === "HUSB" ? t("desk.husband")
      : spouse.role === "WIFE" ? t("desk.wife")
      : t("desk.spouse");
    const line = lineOf(spouse.role, spouse.xref);
    const group = kinGroup(members, role, line ? [line.range.start.line] : []);
    relative(group, spouse, host);
    drawRest(group, line, ctx);
  }
  for (const missing of family.missingSpouses) {
    missingRelative(kinGroup(members, t("desk.spouse")), missing, host);
  }
  const children = kinGroup(members, t("desk.children"));
  for (const child of family.children) {
    const line = lineOf("CHIL", child.xref);
    const group = children.createDiv({ cls: "gedcom-desk-kin-child" });
    if (line) {
      group.setAttribute("data-line", String(line.range.start.line));
    }
    relative(group, child, host, markOf(index, child.xref, family.xref));
    drawRest(group, line, ctx);
  }
  for (const missing of family.missingChildren) {
    missingRelative(children, missing, host);
  }
  if (family.children.length === 0 && family.missingChildren.length === 0) {
    children.createDiv({ cls: "gedcom-desk-none", text: t("desk.notRecorded") });
  }
  renderGallery(page, options.media ?? [], host);
}
