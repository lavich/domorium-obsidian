import type { MediaCrop } from "@domorium/language-service";

import { drawnCrop, type MediaPreviewContent, type PreviewBounds } from "./media";
import type { IconSetter } from "./searchPanel";

/**
 * Drawing the popover, kept out of `GedcomView` so the browser harness mounts
 * the same code against a stub resolver. Standard DOM rather than Obsidian's
 * element helpers for the same reason — the harness has no Obsidian, which is
 * also why `setIcon` is injected.
 */

const ICONS: Record<string, string> = {
  audio: "file-audio",
  video: "file-video",
  document: "file-text",
  unknown: "file",
  remote: "globe",
  missing: "file-question",
};

export interface MediaPreviewHost {
  /** The element the popover's content goes in. */
  container: HTMLElement;
  bounds: PreviewBounds;
  setIcon: IconSetter;
  /** False once this popover is no longer the one on screen. */
  isCurrent: () => boolean;
}

export function renderMediaPreview(
  content: MediaPreviewContent,
  host: MediaPreviewHost,
): void {
  const root = element(host.container, "div", "gedcom-media-preview");
  root.style.setProperty("--gedcom-media-max-w", `${host.bounds.width}px`);
  root.style.setProperty("--gedcom-media-max-h", `${host.bounds.height}px`);

  switch (content.kind) {
    case "image":
      drawImage(root, content.url, content.crop, host);
      break;
    case "file":
      drawRow(root, ICONS[content.mediaKind] ?? ICONS.unknown, content.name, host);
      break;
    case "remote":
      drawRow(root, ICONS.remote, content.url, host, "Remote file, not loaded");
      break;
    case "missing":
      drawRow(root, ICONS.missing, content.target, host, "File not found");
      break;
  }

  if (content.kind !== "missing" && content.title !== undefined) {
    caption(root, content.title);
  }
}

/**
 * The owner document's own element, not Obsidian's `createEl`: the browser
 * harness mounts this module and has no Obsidian to extend HTMLElement.
 */
function element(
  parent: HTMLElement,
  tag: "div" | "img" | "span",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}

function caption(root: HTMLElement, text: string): void {
  element(root, "div", "gedcom-media-caption").textContent = text;
}

function drawRow(
  root: HTMLElement,
  icon: string,
  text: string,
  host: MediaPreviewHost,
  note?: string,
): void {
  const row = element(root, "div", "gedcom-media-row");
  host.setIcon(element(row, "span", "gedcom-media-icon"), icon);
  const body = element(row, "div", "gedcom-media-body");
  if (note !== undefined) {
    element(body, "div", "gedcom-media-note").textContent = note;
  }
  element(body, "div", "gedcom-media-name").textContent = text;
}

/**
 * A rectangle is a window with the image offset behind it — no canvas, nothing
 * decoded. The image's own size is unknown until it loads, so the rectangle is
 * measured against it then, and the handler checks the popover is still the one
 * on screen: a load outlives the gesture that asked for it.
 */
function drawImage(
  root: HTMLElement,
  url: string,
  crop: MediaCrop | undefined,
  host: MediaPreviewHost,
): void {
  const frame = element(root, "div", "gedcom-media-frame");
  const image = element(frame, "img", "gedcom-media-image") as HTMLImageElement;
  if (crop === undefined) {
    image.src = url;
    return;
  }
  frame.classList.add("gedcom-media-cropped");
  applyCrop(frame, image, crop);
  image.addEventListener("load", () => {
    if (!host.isCurrent()) {
      return;
    }
    const drawn = drawnCrop(crop, image.naturalWidth, image.naturalHeight);
    if (drawn === null) {
      frame.classList.remove("gedcom-media-cropped");
      frame.style.removeProperty("width");
      frame.style.removeProperty("height");
      frame.style.removeProperty("aspect-ratio");
      image.style.removeProperty("margin-left");
      image.style.removeProperty("margin-top");
      return;
    }
    applyCrop(frame, image, drawn);
  });
  image.src = url;
}

function applyCrop(
  frame: HTMLElement,
  image: HTMLElement,
  crop: MediaCrop,
): void {
  frame.style.width = `${crop.width}px`;
  frame.style.height = `${crop.height}px`;
  frame.style.aspectRatio = `${crop.width} / ${crop.height}`;
  image.style.marginLeft = `${-crop.left}px`;
  image.style.marginTop = `${-crop.top}px`;
}
