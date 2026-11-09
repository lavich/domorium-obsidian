import type { RecordLine } from "../../genealogy";
import { t } from "../../i18n";
import { renderLines, renderNoteText, renderPointer, type DetailContext } from "./lineView";
import { sectionHeading } from "./section";

export const NOTE_TAGS: ReadonlySet<string> = new Set(["NOTE", "SNOTE"]);

function renderNote(parent: HTMLElement, note: RecordLine, ctx: DetailContext): void {
  const box = parent.createDiv({ cls: "gedcom-note" });
  box.setAttribute("data-line", String(note.range.start.line));
  if (note.pointer !== undefined || note.void) {
    renderPointer(box, note, ctx);
  } else if (note.text !== undefined) {
    renderNoteText(box, note.text, note.range.start.line, ctx);
  }
  if (note.children.length > 0) {
    renderLines(box.createDiv({ cls: "gedcom-detail" }), note.children, ctx);
  }
}

/** Every note of the record: its own text, or that of the shared note it points at, folded where long. */
export function renderNotes(parent: HTMLElement, notes: readonly RecordLine[], ctx: DetailContext): void {
  sectionHeading(parent, t("record.notes"), notes.length);
  const list = parent.createDiv({ cls: "gedcom-notes" });
  for (const note of notes) {
    renderNote(list, note, ctx);
  }
}
