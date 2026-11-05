import type { PreviewRun } from "@domorium/codemirror";

import {
  mediaPreviewContent,
  previewBounds,
  type MediaVault,
} from "./media";
import { renderMediaPreview, type AllowScope } from "./mediaPreviewView";
import type { MediaReference } from "@domorium/language-service";

export interface Popover {
  hoverEl: HTMLElement;
  unload(): void;
  register(callback: () => void): void;
}

export function renderRecordPreview(
  container: HTMLElement,
  runs: PreviewRun[],
  truncated: boolean,
): void {
  const block = container.createEl("pre", { cls: "gedcom-record-preview" });
  for (const run of runs) {
    if (run.className) {
      block.createSpan({ cls: run.className, text: run.text });
    } else {
      block.appendText(run.text);
    }
  }
  if (truncated) {
    block.appendText("\n…");
  }
}

export interface PreviewPopoversHost {
  open(target: HTMLElement): Popover;
  clearMediaSession(): void;
  mediaVault(): MediaVault;
  remoteImages(): boolean;
  allowRemoteImages(scope: AllowScope): void;
  setIcon(element: HTMLElement, icon: string): void;
  contentSize(): { width: number; height: number };
}

export class PreviewPopovers {
  private record: Popover | null = null;
  private media: Popover | null = null;

  constructor(private readonly host: PreviewPopoversHost) {}

  showRecord(runs: PreviewRun[], truncated: boolean, target: HTMLElement): void {
    this.hideRecord();
    this.record = this.host.open(target);
    renderRecordPreview(this.record.hoverEl, runs, truncated);
  }

  hideRecord(): void {
    this.record?.unload();
    this.record = null;
  }

  hideAll(): void {
    this.hideRecord();
    this.host.clearMediaSession();
  }

  showMedia(media: MediaReference, target: HTMLElement): void {
    this.hideMedia();
    const popover = this.host.open(target);
    popover.hoverEl.classList.add("gedcom-media-popover");
    this.media = popover;
    popover.register(() => {
      if (this.media === popover) {
        this.media = null;
        this.host.clearMediaSession();
      }
    });
    this.drawMedia(popover, media);
  }

  hideMedia(): void {
    const popover = this.media;
    this.media = null;
    popover?.unload();
  }

  mediaHolds(node: Node): boolean {
    return this.media?.hoverEl.contains(node) ?? false;
  }

  private drawMedia(popover: Popover, media: MediaReference): void {
    const content = mediaPreviewContent(
      media,
      this.host.mediaVault(),
      this.host.remoteImages(),
    );
    const { width, height } = this.host.contentSize();
    renderMediaPreview(content, {
      container: popover.hoverEl,
      bounds: previewBounds(width, height),
      setIcon: (element, icon) => this.host.setIcon(element, icon),
      isCurrent: () => this.media === popover,
      allow: (scope) => {
        this.host.allowRemoteImages(scope);
        this.drawMedia(popover, media);
      },
    });
  }
}
