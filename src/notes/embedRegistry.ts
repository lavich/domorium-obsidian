import { Component, TFile, type App } from "obsidian";

import { recordPreview } from "./recordPreview";

/**
 * Obsidian renders a hover preview, and an embed in a note, by asking this
 * registry for the file's extension and falling back to a card carrying the
 * file name. It is how the canvas plugin renders a canvas, and it is not in
 * `obsidian.d.ts`, so a build without it leaves the card alone.
 */
interface EmbedRegistry {
  registerExtension(extension: string, creator: EmbedCreator): void;
  unregisterExtension(extension: string): void;
}

type EmbedCreator = (
  context: EmbedContext,
  file: TFile,
  subpath: string,
) => Component;

interface EmbedContext {
  app: App;
  containerEl: HTMLElement;
}

export const EMBEDDED_EXTENSIONS = ["ged", "gedcom"];

/** Answers with what undoes it, or nothing where there is no registry. */
export function registerRecordEmbeds(app: App): (() => void) | undefined {
  const registry = (app as App & { embedRegistry?: EmbedRegistry })
    .embedRegistry;
  if (typeof registry?.registerExtension !== "function") {
    return undefined;
  }
  for (const extension of EMBEDDED_EXTENSIONS) {
    registry.registerExtension(
      extension,
      (context, file, subpath) => new RecordEmbed(context, file, subpath),
    );
  }
  return () => {
    for (const extension of EMBEDDED_EXTENSIONS) {
      registry.unregisterExtension(extension);
    }
  };
}

class RecordEmbed extends Component {
  constructor(
    private readonly context: EmbedContext,
    private readonly file: TFile,
    private readonly subpath: string,
  ) {
    super();
  }

  async loadFile(): Promise<void> {
    const { containerEl } = this.context;
    containerEl.empty();
    containerEl.addClass("gedcom-embed");
    const preview = recordPreview(
      await this.context.app.vault.cachedRead(this.file),
      this.subpath,
    );
    if (preview.kind === "missing") {
      containerEl.createDiv({
        cls: "gedcom-embed-missing",
        text: `${this.file.name} has no record ${preview.xref}`,
      });
      return;
    }
    containerEl.createDiv({
      cls: "gedcom-embed-title",
      text: preview.kind === "record" ? preview.title : this.file.name,
    });
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
}
