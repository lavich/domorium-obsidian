import type { RecordPreview } from "./recordPreview";

/**
 * The embed a note shows where it names a record. Drawing is separated from
 * deciding what to draw, the way the media preview is: `recordPreview` answers
 * with runs, and this puts them on the page.
 */
export function renderRecordEmbed(
  containerEl: HTMLElement,
  preview: RecordPreview,
  fileName: string,
): void {
  containerEl.empty();
  containerEl.addClass("gedcom-embed");
  if (preview.kind === "missing") {
    containerEl.createDiv({
      cls: "gedcom-embed-missing",
      text: `${fileName} has no record ${preview.xref}`,
    });
    return;
  }
  // A record says its own name on the line below; a whole file does not.
  if (preview.kind === "file") {
    containerEl.createDiv({ cls: "gedcom-embed-title", text: fileName });
  }
  const block = containerEl.createEl("pre", { cls: "gedcom-note-block" });
  for (const run of preview.runs) {
    if (run.className) {
      block.createSpan({ cls: run.className, text: run.text });
    } else {
      block.appendText(run.text);
    }
  }
  if (preview.truncated) {
    block.appendText("\n…");
  }
}
