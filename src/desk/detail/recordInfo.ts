import type { RecordLine } from "../../genealogy";
import { INFO_TAGS } from "./claims";
import { countLines, renderLines, type DetailContext } from "./lineView";

export const infoLines = (record: RecordLine): RecordLine[] => record.children.filter((line) => INFO_TAGS.has(line.tag));
export const infoCount = countLines;

/** Reference numbers, identifiers, the restriction and the dates of creation and change, as rows. */
export function renderInfo(body: HTMLElement, lines: readonly RecordLine[], ctx: DetailContext): void {
  renderLines(body.createDiv({ cls: "gedcom-detail" }), lines, ctx);
}
