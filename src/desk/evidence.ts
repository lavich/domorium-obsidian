import type { Range } from "@domorium/language-service";

import type { Citation, GenealogyIndex, PersonEvent, RecordLine } from "../genealogy";
import { t, type MessageKey } from "../i18n";
import { renderRest, type DetailContext } from "./detail/lineView";
import { linkButton } from "./dom";
import { sourceTitle } from "./labels";
import type { NoteHit } from "./noteLinks";

export interface EvidenceHost {
  openRecord(xref: string): void;
  showInSource(range: Range): void;
  openNote(path: string, line: number): void;
}

export interface EvidenceSelection {
  index: GenealogyIndex;
  record: string;
  /** The event of an event card; none for the whole record of a person or a family. */
  event?: PersonEvent;
  /** Null while the vault is still being asked. */
  notes?: NoteHit[] | null;
}

export function renderEvidenceSection(
  parent: HTMLElement,
  selection: EvidenceSelection,
  host: EvidenceHost,
): void {
  const { index, record, event } = selection;
  if (!index.person(record) && !index.family(record)) {
    renderNotes(parent, selection.notes, host, "h2");
    return;
  }
  const root = parent.createDiv({ cls: "gedcom-card-evidence" });
  root.createEl("h2", { cls: "gedcom-desk-section", text: t("evidence.title") });
  const body = root.createDiv({ cls: "gedcom-desk-evidence-body" });
  const ofRecord = index.citesBy(record).filter((citation) => citation.event === undefined);

  if (event) {
    body.createEl("h3", { cls: "gedcom-desk-subsection", text: t("evidence.factSources") });
    if (event.citations.length > 0) {
      for (const citation of event.citations) {
        renderCitation(body, citation, index, host);
      }
    } else {
      const notice = body.createDiv({ cls: "gedcom-desk-notice" });
      notice.createDiv({ cls: "gedcom-desk-notice-title", text: t("desk.noOwnSource") });
      notice.createDiv({
        text: t(ofRecord.length > 0 ? "evidence.recordOnItsCard" : "evidence.recordNone"),
      });
    }
    return;
  }

  const sources = body.createEl("h3", { cls: "gedcom-desk-subsection", text: t("evidence.recordSources") });
  if (ofRecord.length > 0) {
    sources.setAttribute("data-count", String(ofRecord.length));
  }
  if (ofRecord.length === 0) {
    body.createDiv({ cls: "gedcom-desk-none", text: t("evidence.recordEmpty") });
  }
  for (const citation of ofRecord) {
    renderCitation(body, citation, index, host);
  }
  renderNotes(body, selection.notes, host, "h3");
}

function renderNotes(
  parent: HTMLElement,
  notes: NoteHit[] | null | undefined,
  host: EvidenceHost,
  heading: "h2" | "h3",
): void {
  if (notes === undefined) {
    return;
  }
  const title = parent.createEl(heading, {
    cls: heading === "h2" ? "gedcom-desk-section" : "gedcom-desk-subsection",
    text: t("evidence.notes"),
  });
  if (notes !== null && notes.length > 0) {
    title.setAttribute("data-count", String(notes.length));
  }
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

const CITATION_SHOWN: ReadonlySet<string> = new Set(["PAGE", "QUAY"]);

function findLine(line: RecordLine, range: Citation["range"]): RecordLine | undefined {
  if (line.range.start.line === range.start.line && line.range.start.character === range.start.character) {
    return line;
  }
  for (const child of line.children) {
    const found = findLine(child, range);
    if (found) {
      return found;
    }
  }
  return undefined;
}

/** A citation as the title of its source, its page and its quality, then every other line it states. */
function renderCitation(
  parent: HTMLElement,
  citation: Citation,
  index: GenealogyIndex,
  host: EvidenceHost,
): void {
  const before = parent.childElementCount;
  drawCitation(parent, citation, index, host);
  const own = parent.children[before];
  const record = index.record(citation.record);
  const line = record ? findLine(record, citation.range) : undefined;
  if (own && line) {
    own.setAttribute("data-line", String(line.range.start.line));
    const ctx: DetailContext = { index, host: { openRecord: (xref) => host.openRecord(xref), showInSource: (range) => host.showInSource(range) } };
    if (line.children.some((child) => !CITATION_SHOWN.has(child.tag))) {
      renderRest(parent.createDiv({ cls: ["gedcom-detail", "gedcom-cite-lines"] }), line, CITATION_SHOWN, ctx);
    }
  }
}

function drawCitation(
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
