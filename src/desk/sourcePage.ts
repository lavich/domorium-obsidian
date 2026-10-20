import type { Citation, GenealogyIndex, Source } from "../genealogy";
import { PERSON_EVENT_TAGS, FAMILY_EVENT_TAGS } from "../genealogy/tags";
import { t } from "../i18n";
import { eventName, personName, sourceTitle, yearsOf } from "./labels";
import { linkButton, type PageHost } from "./personPage";

export function renderSourcePage(
  container: HTMLElement,
  source: Source,
  index: GenealogyIndex,
  host: PageHost,
): void {
  container.empty();
  const page = container.createDiv({ cls: "gedcom-desk-page" });
  const heading = page.createDiv({ cls: "gedcom-desk-heading" });
  heading.createEl("h1", { cls: "gedcom-desk-title", text: sourceTitle(source.title) });
  const publication = source.fields.find((field) => field.tag === "PUBL")?.value;
  heading.createDiv({
    cls: "gedcom-desk-subtitle",
    text: [source.author, publication].filter(Boolean).join(" · ") || t("desk.noAuthor"),
  });
  linkButton(heading, t("desk.showInSource"), () => host.showInSource(source.range));

  page.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.repository") });
  const repository = page.createDiv({ cls: "gedcom-desk-repository" });
  if (source.heldAt) {
    for (const line of [source.heldAt.name, source.heldAt.address, source.heldAt.web]) {
      if (line) {
        repository.createDiv({ text: line });
      }
    }
  } else if (source.unresolved.length > 0) {
    repository.createDiv({ cls: "gedcom-desk-missing", text: t("desk.missingRepository") });
  } else {
    repository.createDiv({ cls: "gedcom-desk-none", text: t("desk.noRepository") });
  }

  renderCitedBy(page, source, index, host);
}

function renderCitedBy(
  page: HTMLElement,
  source: Source,
  index: GenealogyIndex,
  host: PageHost,
): void {
  page.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.citedBy") });
  const list = page.createDiv({ cls: "gedcom-desk-cited-by" });
  const byRecord = new Map<string, Citation[]>();
  for (const citation of source.xref ? index.citedBy(source.xref) : []) {
    const held = byRecord.get(citation.record);
    if (held) {
      held.push(citation);
    } else {
      byRecord.set(citation.record, [citation]);
    }
  }
  if (byRecord.size === 0) {
    list.createDiv({ cls: "gedcom-desk-none", text: t("desk.citedByNone") });
    return;
  }
  for (const [record, citations] of byRecord) {
    const entry = list.createDiv({ cls: "gedcom-desk-citer" });
    const person = index.person(record);
    if (person) {
      const button = entry.createEl("button", { cls: "gedcom-desk-person" });
      button.setAttribute("type", "button");
      button.createSpan({ cls: "gedcom-desk-person-name", text: personName(person) });
      const years = yearsOf(person);
      if (years) {
        button.createSpan({ cls: "gedcom-desk-person-years", text: years });
      }
      button.addEventListener("click", () => host.openRecord(record));
    } else {
      const family = index.family(record);
      entry.createDiv({
        cls: "gedcom-desk-citer-name",
        text: family?.name ?? t("desk.family"),
      });
    }
    for (const citation of citations) {
      entry.createDiv({
        cls: "gedcom-desk-citer-where",
        text: [where(citation), citation.page].filter(Boolean).join(" — "),
      });
    }
  }
}

function where(citation: Citation): string {
  const within = citation.within;
  if (within && (PERSON_EVENT_TAGS.has(within) || FAMILY_EVENT_TAGS.has(within))) {
    return eventName({ tag: within });
  }
  return t("desk.wholeRecord");
}

export function renderEmptyPage(container: HTMLElement, openSource: () => void): void {
  container.empty();
  const page = container.createDiv({ cls: ["gedcom-desk-page", "gedcom-desk-state"] });
  page.createDiv({ cls: "gedcom-desk-state-title", text: t("desk.empty.title") });
  page.createDiv({ cls: "gedcom-desk-state-desc", text: t("desk.empty.desc") });
  linkButton(page, t("desk.openSource"), openSource);
}

export function renderGonePage(
  container: HTMLElement,
  actions: { showFirst: (() => void) | null; openSource: () => void },
): void {
  container.empty();
  const page = container.createDiv({ cls: ["gedcom-desk-page", "gedcom-desk-state"] });
  page.createDiv({ cls: "gedcom-desk-state-title", text: t("desk.gone.title") });
  const row = page.createDiv({ cls: "gedcom-desk-actions" });
  if (actions.showFirst) {
    linkButton(row, t("desk.gone.first"), actions.showFirst);
  }
  linkButton(row, t("desk.showInSource"), actions.openSource);
}
