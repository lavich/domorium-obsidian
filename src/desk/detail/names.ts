import type { RecordLine } from "../../genealogy";
import { readName, UNNAMED } from "../../genealogy/names";
import { t } from "../../i18n";
import { labelId, renderField } from "./fields";
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

function row(rows: HTMLElement, label: string, line: RecordLine, text: string, kind: "text" | "choice", cls: string): HTMLElement {
  const name = rows.createDiv({ cls: "gedcom-detail-label", text: label });
  name.setAttribute("data-line", String(line.range.start.line));
  name.id = labelId();
  const value = rows.createDiv({ cls: "gedcom-detail-value" });
  renderField(value, text, kind, { labelledBy: name.id, cls });
  return value;
}

/** A name as a small form: the name as written, its type, the parts it states, its notes and sources, its translations. */
function renderName(parent: HTMLElement, name: RecordLine, ctx: DetailContext): void {
  const entry = parent.createDiv({ cls: "gedcom-name" });
  const rows = entry.createDiv({ cls: "gedcom-detail" });
  const written = readName(name.text);
  row(rows, tagLabel("NAME"), name, written === UNNAMED ? t("desk.unnamed") : written, "text", "gedcom-name-text");
  const types = name.children.filter((line) => line.tag === "TYPE");
  const [type] = types;
  if (type?.text) {
    const value = row(rows, tagLabel("TYPE"), type, nameTypeLabel(type.text), "choice", "gedcom-name-type");
    if (type.children.length > 0) {
      renderLines(value.createDiv({ cls: "gedcom-detail" }), type.children, ctx);
    }
  }
  for (const further of types.slice(1)) {
    renderLine(rows, further, ctx);
  }
  for (const line of name.children) {
    if (PARTS.has(line.tag) || line.tag === "NOTE" || line.tag === "SNOTE" || line.tag === "SOUR") {
      renderLine(rows, line, ctx);
    }
  }
  renderRest(rows, name, WHAT_AN_ENTRY_DRAWS, ctx);
  for (const translation of name.children.filter((line) => line.tag === "TRAN")) {
    const box = entry.createDiv({ cls: "gedcom-name-translation" });
    box.createDiv({ cls: "gedcom-name-translation-label", text: tagLabel("TRAN") });
    renderName(box, { ...translation, tag: "NAME" }, ctx);
  }
}

export function renderNames(parent: HTMLElement, names: readonly RecordLine[], ctx: DetailContext): void {
  sectionHeading(parent, t("record.names"), names.length);
  const list = parent.createDiv({ cls: "gedcom-names" });
  for (const name of names) {
    renderName(list, name, ctx);
  }
}
