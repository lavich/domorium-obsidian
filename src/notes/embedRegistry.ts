import { Component, TFile, type App } from "obsidian";

import { recordPreview } from "./recordPreview";
import { renderRecordEmbed } from "./recordPreviewView";

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
    const preview = recordPreview(
      await this.context.app.vault.cachedRead(this.file),
      this.subpath,
      { indent: this.indent() },
    );
    renderRecordEmbed(this.context.containerEl, preview, this.file.name);
  }
}
