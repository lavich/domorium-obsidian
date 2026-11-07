import { eventIdOf } from "./eventRows";
import type { Family, GenealogyIndex } from "../genealogy";
import { t } from "../i18n";
import { familyTitle, shortPlace } from "./labels";
import { renderGallery } from "./media";
import type { RecordLine } from "../genealogy";
import { FAMILY_EVENT_TAGS } from "../genealogy/tags";
import { INFO_TAGS, NOTE_TAGS, unclaimed } from "./detail/claims";
import { lazyFold } from "./detail/lazyFold";
import { renderRest, type DetailContext } from "./detail/lineView";
import { noteLines, renderNotes } from "./detail/notes";
import { otherCount, renderOther } from "./detail/otherData";
import { infoLines, renderInfo } from "./detail/recordInfo";
import { relatedLines, renderRelated } from "./detail/related";
import { sectionHeading } from "./detail/section";
import { linkButton } from "./dom";
import {
  drawnByGallery,
  kinGroup,
  markOf,
  missingRelative,
  relative,
  renderFactList,
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

const FAMILY_CLAIMED: ReadonlySet<string> = new Set([
  "HUSB", "WIFE", "CHIL", "NCHI", "SOUR", "OBJE", ...NOTE_TAGS, "ASSO", ...INFO_TAGS, ...FAMILY_EVENT_TAGS,
]);

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
    ...(options.open === undefined ? {} : { open: options.open }),
    ...(options.folded === undefined ? {} : { folded: options.folded }),
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

  renderFactList(page, familyFacts(family), index, options, host);
  const stated = lines?.children.find((line) => line.tag === "NCHI");
  if (stated?.text) {
    const note = page.createDiv({ cls: "gedcom-desk-subtitle", text: t("record.childrenStated", { count: stated.text }) });
    note.setAttribute("data-line", String(stated.range.start.line));
  }

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
  const notes = lines ? noteLines(lines) : [];
  if (notes.length > 0) {
    renderNotes(page, notes, ctx);
  }
  const related = lines ? relatedLines(lines) : [];
  if (related.length > 0) {
    renderRelated(page, related, ctx);
  }
  renderGallery(page, options.media ?? [], host);
  const fold = (id: string, title: string, count: number, fill: (body: HTMLElement) => void): void =>
    lazyFold(page, { id, title, count, open: options.open?.has(id) ?? false, toggled: (open) => options.folded?.(id, open) }, fill);
  const info = lines ? infoLines(lines) : [];
  if (info.length > 0) {
    fold("info", t("record.info"), otherCount(info), (body) => renderInfo(body, info, ctx));
  }
  const gallery = options.media;
  const other = lines
    ? unclaimed(lines, FAMILY_CLAIMED, (line) => line.tag === "OBJE" && !drawnByGallery(line, gallery))
    : [];
  if (other.length > 0) {
    fold("other", t("record.other"), otherCount(other), (body) => renderOther(body, other, ctx));
  }
}
