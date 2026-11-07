import type { RecordLine } from "../../genealogy";
import { countLines, renderLines, type DetailContext } from "./lineView";

export const otherCount = countLines;

/** Every line no section drew, nested as the file nests them. */
export function renderOther(body: HTMLElement, lines: readonly RecordLine[], ctx: DetailContext): void {
  renderLines(body.createDiv({ cls: "gedcom-detail" }), lines, ctx);
}
