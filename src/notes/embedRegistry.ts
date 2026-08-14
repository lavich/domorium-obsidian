import { Component, TFile, type App } from "obsidian";

import { recordPreview } from "./recordPreview";

/**
 * Obsidian renders a hover preview, and an embed in a note, by asking this
 * registry for the file's extension, and falls back to a card naming the file.
 * Not in `obsidian.d.ts`.
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

export function registerRecordEmbeds(
  app: App,
  indent: () => boolean,
): (() => void) | undefined {
  const registry = (app as App & { embedRegistry?: EmbedRegistry })
    .embedRegistry;
  if (typeof registry?.registerExtension !== "function") {
    return undefined;
  }
  for (const extension of EMBEDDED_EXTENSIONS) {
    registry.registerExtension(
      extension,
      (context, file, subpath) =>
        new RecordEmbed(context, file, subpath, indent),
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
    private readonly indent: () => boolean,
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
      { indent: this.indent() },
    );
    if (preview.kind === "missing") {
      containerEl.createDiv({
        cls: "gedcom-embed-missing",
        text: `${this.file.name} has no record ${preview.xref}`,
      });
      return;
    }
    // A record says its own name on the line below; a whole file does not.
    if (preview.kind === "file") {
      containerEl.createDiv({
        cls: "gedcom-embed-title",
        text: this.file.name,
      });
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
}
