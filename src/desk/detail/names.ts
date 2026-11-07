import type { RecordLine } from "../../genealogy";
import { readName, UNNAMED } from "../../genealogy/names";
import { t } from "../../i18n";
import { nameTypeLabel, tagLabel } from "./labels";
import { renderLine, renderLines, renderRest, type DetailContext } from "./lineView";
import { sectionHeading } from "./section";

const PARTS: ReadonlySet<string> = new Set(["GIVN", "SURN", "NPFX", "NSFX", "NICK", "SPFX"]);
const WHAT_AN_ENTRY_DRAWS: ReadonlySet<string> = new Set([...PARTS, "TYPE", "NOTE", "SNOTE", "SOUR", "TRAN"]);

export const nameLines = (record: RecordLine): RecordLine[] => record.children.filter((line) => line.tag === "NAME");

/** The heading shows the first name; the section is only for what it does not show. */
export function needsNames(names: readonly RecordLine[]): boolean {
  return names.length > 1 || (names[0]?.children.length ?? 0) > 0;
}

function renderName(parent: HTMLElement, name: RecordLine, ctx: DetailContext): void {
  const entry = parent.createDiv({ cls: "gedcom-name" });
  const head = entry.createDiv({ cls: "gedcom-name-head" });
  const written = readName(name.text);
  const text = head.createSpan({ cls: "gedcom-name-text", text: written === UNNAMED ? t("desk.unnamed") : written });
  text.setAttribute("data-line", String(name.range.start.line));
  const type = name.children.find((line) => line.tag === "TYPE");
  if (type?.text) {
    const badge = head.createSpan({ cls: "gedcom-name-type", text: nameTypeLabel(type.text) });
    badge.setAttribute("data-line", String(type.range.start.line));
    for (const phrase of type.children) {
      renderLines(entry.createDiv({ cls: "gedcom-detail" }), [phrase], ctx);
    }
  }
  const rows = entry.createDiv({ cls: "gedcom-detail" });
  for (const further of name.children.filter((line) => line.tag === "TYPE").slice(1)) {
    renderLine(rows, further, ctx);
  }
  for (const line of name.children) {
    if (PARTS.has(line.tag) || line.tag === "NOTE" || line.tag === "SNOTE" || line.tag === "SOUR") {
      renderLine(rows, line, ctx);
    }
  }
  for (const translation of name.children.filter((line) => line.tag === "TRAN")) {
    const box = entry.createDiv({ cls: "gedcom-name-translation" });
    box.createDiv({ cls: "gedcom-name-translation-label", text: tagLabel("TRAN") });
    renderName(box, { ...translation, tag: "NAME" }, ctx);
  }
  renderRest(rows, name, WHAT_AN_ENTRY_DRAWS, ctx);
  if (!rows.hasChildNodes()) {
    rows.remove();
  }
}

/** Every name of the record, in the order it writes them, each with its type and its parts. */
export function renderNames(parent: HTMLElement, names: readonly RecordLine[], ctx: DetailContext): void {
  sectionHeading(parent, t("record.names"), names.length);
  const list = parent.createDiv({ cls: "gedcom-names" });
  for (const name of names) {
    renderName(list, name, ctx);
  }
}
