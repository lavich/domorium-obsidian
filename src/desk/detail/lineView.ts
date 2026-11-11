import type { Range } from "@domorium/language-service";

import { HEADER_ID, type GenealogyIndex, type RecordLine } from "../../genealogy";
import { readName, UNNAMED } from "../../genealogy/names";
import { t } from "../../i18n";
import { pageKind } from "../deskState";
import { linkButton } from "../dom";
import { placeAt } from "../placeRows";
import { familyTitle, personName, sourceTitle } from "../labels";
import { labelId, renderField } from "./fields";
import { renderFoldedText } from "./foldedText";
import { linkStatusLabel, nameTypeLabel, roleLabel, sexLabel, tagLabel } from "./labels";

export interface DetailHost {
  openRecord(xref: string): void;
  showInSource(range: Range): void;
}

export interface DetailContext {
  index: GenealogyIndex;
  host: DetailHost;
  /** The ids of what the reader has opened on the card: folds and long notes. */
  open?: { has(id: string): boolean };
  folded?(id: string, open: boolean): void;
  /** Counts the notes drawn so far on the card, so that one is named by its place among them and not by its line. */
  notes?: { drawn: number; prefix?: string };
}

const firstFilled = (text: string): string | undefined => text.split("\n").find((line) => line.trim() !== "");

const baseName = (file: string): string => file.split(/[\\/]/u).filter(Boolean).pop() ?? file;

/** What a reader calls a record wherever it is named, with no identifier: in the list, the card's announcement, a pointer, the root of a tree. */
export function recordTitle(index: GenealogyIndex, xref: string): string | undefined {
  if (xref === HEADER_ID) {
    return index.record(HEADER_ID) ? t("record.header") : undefined;
  }
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
  const place = placeAt(index, xref);
  if (place) {
    return place.name;
  }
  const media = index.media(xref);
  if (media) {
    return media.title ?? (media.file === undefined ? t("desk.media") : baseName(media.file));
  }
  const lines = index.record(xref);
  if (!lines) {
    return undefined;
  }
  if (lines.tag === "SNOTE" || lines.tag === "NOTE") {
    return (lines.text === undefined ? undefined : firstFilled(lines.text)) ?? tagLabel(lines.tag);
  }
  const child = (tag: string): string | undefined => lines.children.find((one) => one.tag === tag)?.text;
  const own = lines.text === undefined ? undefined : firstFilled(lines.text);
  const first = lines.children.find((one) => one.text !== undefined && one.text !== "")?.text;
  return child("NAME") ?? child("TITL") ?? own ?? (first === undefined ? undefined : firstFilled(first)) ?? tagLabel(lines.tag);
}

/** What a line's value reads as: a sex, a role, a name or the type of a name in the reader's language, anything else as written. */
export function valueText(line: RecordLine, parent?: RecordLine): string {
  const text = line.text ?? "";
  switch (line.tag) {
    case "SEX":
      return sexLabel(text);
    case "ROLE":
    case "RELA":
      return roleLabel(text);
    case "STAT":
      return linkStatusLabel(text);
    case "NAME": {
      const name = readName(text);
      return name === UNNAMED ? t("desk.unnamed") : name;
    }
    case "TYPE":
      return parent?.tag === "NAME" ? nameTypeLabel(text) : text;
    default:
      return text;
  }
}

const CHOICES: ReadonlySet<string> = new Set(["SEX", "ROLE", "RELA", "STAT", "PEDI", "RESN", "QUAY"]);

export const fieldKind = (line: RecordLine, parent?: RecordLine): "text" | "choice" =>
  CHOICES.has(line.tag) || (line.tag === "TYPE" && parent?.tag === "NAME") ? "choice" : "text";

/** A note's text, folded where it is long; what the reader opened stays through a redraw. */
export function renderNoteText(parent: HTMLElement, text: string, line: number, ctx: DetailContext, named?: string): void {
  const key = named ?? `note:${ctx.notes ? `${ctx.notes.prefix ?? ""}${ctx.notes.drawn++}` : `L${line}`}`;
  renderFoldedText(parent, text, {
    key,
    open: ctx.open?.has(key) ?? false,
    toggled: (open) => ctx.folded?.(key, open),
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
  if (target && (target.tag === "SNOTE" || target.tag === "NOTE")) {
    if (target.text !== undefined) {
      renderNoteText(parent, target.text, line.range.start.line, ctx);
    }
    if (target.children.length > 0) {
      renderLines(parent.createDiv({ cls: "gedcom-detail" }), target.children, ctx, target);
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

/** One line as a row of a label and a value, its substructure nested beneath the value, none dropped. */
export function renderLine(parent: HTMLElement, line: RecordLine, ctx: DetailContext, owner?: RecordLine): void {
  const label = parent.createDiv({ cls: "gedcom-detail-label", text: tagLabel(line.tag) });
  label.setAttribute("data-line", String(line.range.start.line));
  label.id = labelId();
  const value = parent.createDiv({ cls: "gedcom-detail-value" });
  if (line.pointer !== undefined || line.void) {
    renderPointer(value, line, ctx);
  } else if (line.text !== undefined && (line.tag === "NOTE" || line.tag === "SNOTE")) {
    renderNoteText(value, line.text, line.range.start.line, ctx);
  } else if (line.text !== undefined) {
    renderField(value, valueText(line, owner), fieldKind(line, owner), { labelledBy: label.id });
  }
  if (line.children.length > 0) {
    renderLines(value.createDiv({ cls: "gedcom-detail" }), line.children, ctx, line);
  }
}

export function renderLines(parent: HTMLElement, lines: readonly RecordLine[], ctx: DetailContext, owner?: RecordLine): void {
  for (const line of lines) {
    renderLine(parent, line, ctx, owner);
  }
}
