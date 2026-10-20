import type { Range } from "@domorium/language-service";

import type { Citation, GenealogyIndex } from "../genealogy";
import { t, type MessageKey } from "../i18n";
import { familyFactByKey } from "./familyPage";
import { eventName, familyTitle, personName, sourceTitle, yearsOf } from "./labels";
import { linkButton } from "./dom";
import type { NoteHit } from "./noteLinks";
import { factByKey, type FactKey } from "./personPage";

export interface EvidenceHost {
  openRecord(xref: string): void;
  showInSource(range: Range): void;
  wholeRecord(): void;
  openNote(path: string, line: number): void;
}

export interface EvidenceSelection {
  index: GenealogyIndex;
  record: string;
  fact: FactKey | null;
  /** Null while the vault is still being asked. */
  notes?: NoteHit[] | null;
}

export function renderEvidence(
  container: HTMLElement,
  selection: EvidenceSelection | null,
  host: EvidenceHost,
): void {
  container.empty();
  const root = container.createDiv({ cls: "gedcom-desk-evidence" });
  const head = root.createDiv({ cls: "gedcom-desk-evidence-head" });
  head.createDiv({ cls: "gedcom-desk-evidence-title", text: t("evidence.title") });
  if (!selection) {
    root.createDiv({ cls: "gedcom-desk-none", text: t("evidence.noTab") });
    return;
  }
  const { index, record, fact: key } = selection;
  const source = index.source(record);
  const person = index.person(record);
  const family = person ? undefined : index.family(record);
  const context = head.createDiv({ cls: "gedcom-desk-evidence-context" });
  const actions = head.createDiv({ cls: "gedcom-desk-actions" });

  if (source && !person && !family) {
    context.createDiv({ text: sourceTitle(source.title) });
    context.createDiv({ cls: "gedcom-desk-evidence-sub", text: t("evidence.source") });
    linkButton(actions, t("desk.showInSource"), () => host.showInSource(source.range));
    renderNotes(root.createDiv({ cls: "gedcom-desk-evidence-body" }), selection.notes, host);
    return;
  }
  const media = person || family ? undefined : index.media(record);
  if (media) {
    context.createDiv({ text: media.title ?? media.file ?? t("evidence.media") });
    context.createDiv({ cls: "gedcom-desk-evidence-sub", text: t("evidence.media") });
    linkButton(actions, t("desk.showInSource"), () => host.showInSource(media.range));
    renderNotes(root.createDiv({ cls: "gedcom-desk-evidence-body" }), selection.notes, host);
    return;
  }
  const subject = person
    ? {
        fact: factByKey(person, key),
        name: [personName(person), yearsOf(person)].filter(Boolean).join(" · "),
        range: person.range,
      }
    : family
      ? {
          fact: familyFactByKey(family, key),
          name: familyTitle(family.spouseNames),
          range: family.range,
        }
      : null;
  if (!subject) {
    return;
  }

  const fact = subject.fact;
  const body = root.createDiv({ cls: "gedcom-desk-evidence-body" });
  const ofRecord = index.citesBy(record).filter((citation) => citation.event === undefined);

  if (fact) {
    context.createDiv({
      text: fact.key.startsWith("u:")
        ? `${eventName(fact.event)} · ${t("evidence.familyEvent").toLowerCase()}`
        : eventName(fact.event),
    });
    const detail = [fact.event.date?.text, fact.event.value, fact.event.place]
      .filter(Boolean)
      .join(" · ");
    context.createDiv({
      cls: "gedcom-desk-evidence-sub",
      text: detail || t("desk.noDetails"),
    });
    linkButton(actions, `← ${t("desk.wholeRecord")}`, () => host.wholeRecord());
    linkButton(actions, t("desk.showInSource"), () => host.showInSource(fact.event.range));

    body.createEl("h3", { cls: "gedcom-desk-section", text: t("evidence.factSources") });
    if (fact.event.citations.length > 0) {
      for (const citation of fact.event.citations) {
        renderCitation(body, citation, index, host);
      }
    } else {
      const notice = body.createDiv({ cls: "gedcom-desk-notice" });
      notice.createDiv({ cls: "gedcom-desk-notice-title", text: t("desk.noOwnSource") });
      notice.createDiv({
        text: t(ofRecord.length > 0 ? "evidence.belowBelong" : "evidence.recordNone"),
      });
    }
    body.createEl("h3", {
      cls: ["gedcom-desk-section", "gedcom-desk-scope"],
      text: t("desk.wholeRecord"),
    });
  } else {
    context.createDiv({ text: t("desk.wholeRecord") });
    context.createDiv({ cls: "gedcom-desk-evidence-sub", text: subject.name });
    linkButton(actions, t("desk.showInSource"), () => host.showInSource(subject.range));
  }

  body.createEl("h3", {
    cls: "gedcom-desk-section",
    text: `${t("evidence.recordSources")} · ${ofRecord.length}`,
  });
  if (ofRecord.length === 0) {
    body.createDiv({ cls: "gedcom-desk-none", text: t("evidence.recordEmpty") });
  }
  for (const citation of ofRecord) {
    renderCitation(body, citation, index, host);
  }
  renderNotes(body, selection.notes, host);
}

function renderNotes(
  parent: HTMLElement,
  notes: NoteHit[] | null | undefined,
  host: EvidenceHost,
): void {
  if (notes === undefined) {
    return;
  }
  parent.createEl("h3", {
    cls: "gedcom-desk-section",
    text: notes === null ? t("evidence.notes") : `${t("evidence.notes")} · ${notes.length}`,
  });
  if (notes?.length === 0) {
    parent.createDiv({ cls: "gedcom-desk-none", text: t("evidence.notesNone") });
  }
  for (const note of notes ?? []) {
    const entry = parent.createDiv({ cls: "gedcom-desk-note" });
    entry.createDiv({ cls: "gedcom-desk-note-name", text: note.name });
    for (const line of note.lines) {
      const button = entry.createEl("button", { cls: "gedcom-desk-note-line" });
      button.setAttribute("type", "button");
      button.appendText(line.before);
      button.createEl("mark", { text: line.link });
      button.appendText(line.after);
      button.addEventListener("click", () => host.openNote(note.path, line.line));
    }
  }
}

function renderCitation(
  parent: HTMLElement,
  citation: Citation,
  index: GenealogyIndex,
  host: EvidenceHost,
): void {
  const quality =
    citation.quality === undefined ? undefined : t(`quality.${citation.quality}` as MessageKey);
  if (citation.inline !== undefined) {
    const cite = parent.createDiv({ cls: "gedcom-desk-cite" });
    cite.createDiv({ cls: "gedcom-desk-cite-inline", text: citation.inline });
    for (const line of [citation.page, quality, t("evidence.inline")]) {
      if (line) {
        cite.createDiv({ cls: "gedcom-desk-cite-meta", text: line });
      }
    }
    return;
  }
  const xref = citation.source;
  const source = xref ? index.source(xref) : undefined;
  if (!xref || !source) {
    const missing = parent.createDiv({ cls: "gedcom-desk-missing" });
    missing.createSpan({ text: t("evidence.missingSource") });
    linkButton(missing, t("desk.showInSource"), () => host.showInSource(citation.range));
    return;
  }
  const cite = parent.createEl("button", { cls: "gedcom-desk-cite" });
  cite.setAttribute("type", "button");
  cite.addEventListener("click", () => host.openRecord(xref));
  cite.createDiv({ cls: "gedcom-desk-cite-title", text: sourceTitle(source.title) });
  if (citation.page) {
    cite.createDiv({ cls: "gedcom-desk-cite-page", text: citation.page });
  }
  const publication = source.fields.find((field) => field.tag === "PUBL")?.value;
  const meta = [quality, [source.author, publication].filter(Boolean).join(" · ")]
    .filter(Boolean)
    .join(" · ");
  if (meta) {
    cite.createDiv({ cls: "gedcom-desk-cite-meta", text: meta });
  }
}
