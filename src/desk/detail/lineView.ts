import type { Range } from "@domorium/language-service";

import type { GenealogyIndex, RecordLine } from "../../genealogy";
import { t } from "../../i18n";
import { pageKind } from "../deskState";
import { linkButton } from "../dom";
import { familyTitle, personName, sourceTitle } from "../labels";
import { renderFoldedText } from "./foldedText";
import { linkStatusLabel, roleLabel, sexLabel, tagLabel } from "./labels";

export interface DetailHost {
  openRecord(xref: string): void;
  showInSource(range: Range): void;
}

export interface DetailContext {
  index: GenealogyIndex;
  host: DetailHost;
  /** The ids of what the reader has opened on the card: folds and long notes. */
  open?: ReadonlySet<string>;
  folded?(id: string, open: boolean): void;
}

/** The lines of a list and of everything beneath them. */
export function countLines(lines: readonly RecordLine[]): number {
  return lines.reduce((sum, line) => sum + 1 + countLines(line.children), 0);
}

/** What a reader calls the record a pointer names, with no identifier. */
export function recordTitle(index: GenealogyIndex, xref: string): string | undefined {
  const person = index.person(xref);
  if (person) {
    return personName(person);
  }
  const family = index.family(xref);
  if (family) {
    return familyTitle(family.spouseNames);
  }
  const source = index.source(xref);
  if (source) {
    return sourceTitle(source.title);
  }
  const media = index.media(xref);
  if (media) {
    return media.title ?? media.file ?? t("desk.media");
  }
  const lines = index.record(xref);
  if (!lines) {
    return undefined;
  }
  if (lines.text !== undefined) {
    return lines.text.split("\n")[0];
  }
  return lines.children.find((child) => child.tag === "NAME")?.text ?? tagLabel(lines.tag);
}

function valueText(tag: string, text: string): string {
  switch (tag) {
    case "SEX":
      return sexLabel(text);
    case "ROLE":
    case "RELA":
      return roleLabel(text);
    case "STAT":
      return linkStatusLabel(text);
    default:
      return text;
  }
}

/** A note's text, folded where it is long; what the reader opened stays through a redraw. */
export function renderNoteText(parent: HTMLElement, text: string, line: number, ctx: DetailContext): void {
  renderFoldedText(parent, text, {
    line,
    open: ctx.open?.has(`note:${line}`) ?? false,
    toggled: (open) => ctx.folded?.(`note:${line}`, open),
  });
}

/** A pointer, as the name of the record it points at, or as a pointer to one the file does not declare. */
export function renderPointer(parent: HTMLElement, line: RecordLine, ctx: DetailContext, focusKey?: string): void {
  const { index, host } = ctx;
  if (line.void) {
    parent.createSpan({ cls: "gedcom-desk-none", text: t("record.void") });
    return;
  }
  const xref = line.pointer ?? "";
  const title = recordTitle(index, xref);
  if (title === undefined) {
    const missing = parent.createSpan({ cls: "gedcom-desk-missing" });
    missing.createSpan({ text: t("desk.missingRecord") });
    linkButton(missing, t("desk.showInSource"), () => host.showInSource(line.range));
    return;
  }
  const target = index.record(xref);
  if (target && (target.tag === "SNOTE" || target.tag === "NOTE") && target.text !== undefined) {
    renderNoteText(parent, target.text, line.range.start.line, ctx);
    if (target.children.length > 0) {
      renderLines(parent.createDiv({ cls: "gedcom-detail" }), target.children, ctx);
    }
    return;
  }
  if (pageKind(index, xref)) {
    const link = linkButton(parent, title, () => host.openRecord(xref));
    if (focusKey !== undefined) {
      link.setAttribute("data-focus-key", focusKey);
    }
  } else {
    parent.appendText(title);
  }
}

/** The children of a line other than those a section has drawn for itself. */
export function renderRest(
  parent: HTMLElement,
  line: RecordLine,
  handled: ReadonlySet<string>,
  ctx: DetailContext,
): void {
  const rest = line.children.filter((child) => !handled.has(child.tag));
  if (rest.length > 0) {
    renderLines(parent, rest, ctx);
  }
}

/** One line as a row of a label and a value, its substructure nested beneath the value, none dropped. */
export function renderLine(parent: HTMLElement, line: RecordLine, ctx: DetailContext): void {
  const label = parent.createDiv({ cls: "gedcom-detail-label", text: tagLabel(line.tag) });
  label.setAttribute("data-line", String(line.range.start.line));
  const value = parent.createDiv({ cls: "gedcom-detail-value" });
  if (line.pointer !== undefined || line.void) {
    renderPointer(value, line, ctx);
  } else if (line.text !== undefined && (line.tag === "NOTE" || line.tag === "SNOTE")) {
    renderNoteText(value, line.text, line.range.start.line, ctx);
  } else if (line.text !== undefined) {
    value.setText(valueText(line.tag, line.text));
  }
  if (line.children.length > 0) {
    renderLines(value.createDiv({ cls: "gedcom-detail" }), line.children, ctx);
  }
}

export function renderLines(parent: HTMLElement, lines: readonly RecordLine[], ctx: DetailContext): void {
  for (const line of lines) {
    renderLine(parent, line, ctx);
  }
}
