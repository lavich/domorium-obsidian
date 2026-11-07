import type { GenealogyIndex, PersonEvent, RecordLine } from "../../genealogy";
import { t } from "../../i18n";
import { NOTE_TAGS } from "./claims";
import { renderLine, renderLines, renderRest, type DetailContext } from "./lineView";
import { sectionHeading } from "./section";

/** What an event states beyond its date and place, drawn as a row each. */
const DETAIL_TAGS: ReadonlySet<string> = new Set([
  "AGE", "CAUS", "AGNC", "RELI", "RESN", "SDATE", "TEMP", "STAT", "ADDR", "PHON", "EMAIL", "FAX", "WWW", "FAMC", "UID",
  "EXID", "REFN", "HUSB", "WIFE",
]);
const SPOUSES: ReadonlySet<string> = new Set(["HUSB", "WIFE"]);

export interface EventParts {
  /** The rows of the date's and the place's own lines, then the details, in the order the event writes them. */
  rows: RecordLine[];
  notes: RecordLine[];
  related: RecordLine[];
  media: RecordLine[];
  other: RecordLine[];
}

/** The line of an event in the lines of the record it belongs to. */
export function eventLine(index: GenealogyIndex, owner: string, event: PersonEvent): RecordLine | undefined {
  const same = (a: PersonEvent["range"], b: RecordLine["range"]): boolean =>
    a.start.line === b.start.line && a.start.character === b.start.character;
  return index.record(owner)?.children.find((line) => line.tag === event.tag && same(event.range, line.range));
}

/** Sorts what an event states into what each part of its card draws; `titled` says whether `TYPE` names it. */
export function splitEvent(line: RecordLine, titled: boolean): EventParts {
  const rows: RecordLine[] = [];
  const parts: EventParts = { rows, notes: [], related: [], media: [], other: [] };
  for (const child of line.children) {
    if (child.tag === "DATE" || child.tag === "PLAC") {
      rows.push(...child.children);
    } else if (child.tag === "TYPE") {
      if (!titled) {
        rows.push(child);
      }
    } else if (DETAIL_TAGS.has(child.tag)) {
      rows.push(child);
    } else if (NOTE_TAGS.has(child.tag)) {
      parts.notes.push(child);
    } else if (child.tag === "ASSO") {
      parts.related.push(child);
    } else if (child.tag === "OBJE") {
      parts.media.push(child);
    } else if (child.tag !== "SOUR") {
      parts.other.push(child);
    }
  }
  return parts;
}

function renderSpouseAge(parent: HTMLElement, line: RecordLine, ctx: DetailContext): void {
  const age = line.children.find((child) => child.tag === "AGE");
  const label = parent.createDiv({
    cls: "gedcom-detail-label",
    text: t(line.tag === "HUSB" ? "record.husbandAge" : "record.wifeAge"),
  });
  label.setAttribute("data-line", String(line.range.start.line));
  const value = parent.createDiv({ cls: "gedcom-detail-value", text: age?.text ?? "" });
  if (age) {
    value.setAttribute("data-line", String(age.range.start.line));
  }
  renderRest(value, line, new Set(["AGE"]), ctx);
}

export function renderEventRows(parent: HTMLElement, rows: readonly RecordLine[], ctx: DetailContext): void {
  const grid = parent.createDiv({ cls: "gedcom-detail" });
  for (const row of rows) {
    if (SPOUSES.has(row.tag) && row.pointer === undefined) {
      renderSpouseAge(grid, row, ctx);
    } else {
      renderLine(grid, row, ctx);
    }
  }
}

export function renderEventMedia(parent: HTMLElement, lines: readonly RecordLine[], ctx: DetailContext): void {
  sectionHeading(parent, t("desk.media"), lines.length);
  renderLines(parent.createDiv({ cls: "gedcom-detail" }), lines, ctx);
}
