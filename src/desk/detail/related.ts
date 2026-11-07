import type { RecordLine } from "../../genealogy";
import { t } from "../../i18n";
import { RELATED_TAGS } from "./claims";
import { roleLabel, tagLabel } from "./labels";
import { renderLines, renderPointer, renderRest, type DetailContext } from "./lineView";
import { sectionHeading } from "./section";

export const relatedLines = (record: RecordLine): RecordLine[] => record.children.filter((line) => RELATED_TAGS.has(line.tag));

const ROLE_TAGS: ReadonlySet<string> = new Set(["ROLE", "RELA", "PHRASE"]);

function renderEntry(parent: HTMLElement, line: RecordLine, ctx: DetailContext, key?: string): void {
  const entry = parent.createDiv({ cls: "gedcom-related" });
  entry.setAttribute("data-line", String(line.range.start.line));
  if (line.tag === "ALIA") {
    entry.createSpan({ cls: "gedcom-related-kind", text: tagLabel("ALIA") });
  }
  const who = entry.createSpan({ cls: "gedcom-related-who" });
  renderPointer(who, line, ctx, key);
  for (const role of line.children.filter((child) => child.tag === "ROLE" || child.tag === "RELA")) {
    const phrase = role.children.find((child) => child.tag === "PHRASE")?.text;
    const word = entry.createSpan({
      cls: "gedcom-related-role",
      text: role.text?.toUpperCase() === "OTHER" && phrase ? phrase : roleLabel(role.text ?? ""),
    });
    const phraseLine = role.children.find((child) => child.tag === "PHRASE");
    const usesPhrase = role.text?.toUpperCase() === "OTHER" && Boolean(phrase);
    word.setAttribute(
      "data-line",
      [role, usesPhrase ? phraseLine : undefined].flatMap((one) => (one ? [one.range.start.line] : [])).join(" "),
    );
    if (phrase && !(role.text?.toUpperCase() === "OTHER")) {
      renderLines(entry.createDiv({ cls: "gedcom-detail" }), role.children.filter((child) => child.tag === "PHRASE"), ctx);
    }
    renderRest(entry.createDiv({ cls: "gedcom-detail" }), role, new Set(["PHRASE"]), ctx);
  }
  const phrase = line.children.find((child) => child.tag === "PHRASE");
  if (phrase?.text) {
    entry.createSpan({ cls: "gedcom-related-phrase", text: phrase.text }).setAttribute("data-line", String(phrase.range.start.line));
  }
  renderRest(entry.createDiv({ cls: "gedcom-detail" }), line, ROLE_TAGS, ctx);
}

/** Each person the record names as associated with them, with the role, and each other record of the same person. */
export function renderRelated(parent: HTMLElement, lines: readonly RecordLine[], ctx: DetailContext): void {
  sectionHeading(parent, t("record.related"), lines.length);
  const list = parent.createDiv({ cls: "gedcom-related-list" });
  const seen = new Map<string, number>();
  for (const line of lines) {
    const base = line.pointer === undefined ? undefined : `assoc:${line.pointer}`;
    const again = base === undefined ? 0 : (seen.get(base) ?? 0);
    if (base !== undefined) {
      seen.set(base, again + 1);
    }
    renderEntry(list, line, ctx, base === undefined ? undefined : again === 0 ? base : `${base}#${again}`);
  }
}
