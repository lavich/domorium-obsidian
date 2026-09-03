import type { GedcomRecord } from "../editor/records";

/**
 * One row of the suggester: what the record is called, and under it what it is.
 * A record with no label falls back to its identifier, which then has no reason
 * to be repeated below.
 */
export function renderRecordSuggestion(
  record: GedcomRecord,
  element: HTMLElement,
): void {
  element.createDiv({ text: record.label ?? record.identifier ?? "" });
  element.createEl("small", {
    cls: "gedcom-suggestion-detail",
    text: record.label ? `${record.identifier} · ${record.tag}` : record.tag,
  });
}
