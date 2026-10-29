import {
  drawnCrop,
  type MediaCrop,
  type Position,
  type Range,
} from "@domorium/language-service";

import type { MediaPreviewContent } from "../editor/media";
import { t, type MessageKey } from "../i18n";
import { linkButton } from "./dom";

export interface MediaItem {
  content: MediaPreviewContent;
  path?: string;
  record?: string;
  at: Position;
}

export interface MediaHost {
  openFile(path: string): void;
  openRecord(xref: string): void;
  showInSource(range: Range): void;
}

const pointAt = (at: Position): Range => ({ start: at, end: at });

/**
 * The picture at its own size behind a box, moved so the rectangle's corner
 * meets the box's, and scaled so the rectangle fills it.
 */
function fitCrop(box: HTMLElement, image: HTMLImageElement, crop: MediaCrop, width: number, height: number): void {
  const scale = Math.min(width / crop.width, height / crop.height);
  box.setCssProps({
    width: `${crop.width * scale}px`,
    height: `${crop.height * scale}px`,
  });
  image.setCssProps({
    transform: `translate(${-crop.left * scale}px, ${-crop.top * scale}px) scale(${scale})`,
  });
}

export function drawPicture(
  parent: HTMLElement,
  content: Extract<MediaPreviewContent, { kind: "image" }>,
  width: number,
  height: number,
): HTMLElement {
  const box = parent.createDiv({ cls: "gedcom-desk-picture" });
  const image = box.createEl("img");
  image.alt = content.title ?? content.name;
  const crop = content.crop;
  if (crop) {
    box.addClass("is-cropped");
    fitCrop(box, image, crop, width, height);
    image.addEventListener("load", () => {
      const drawn = drawnCrop(crop, image.naturalWidth, image.naturalHeight);
      if (drawn === null) {
        box.removeClass("is-cropped");
        box.style.removeProperty("width");
        box.style.removeProperty("height");
        image.style.removeProperty("transform");
        return;
      }
      fitCrop(box, image, drawn, width, height);
    });
  }
  image.src = content.url;
  return box;
}

function caption(content: MediaPreviewContent): string {
  switch (content.kind) {
    case "image":
    case "file":
      return content.title ?? content.name;
    case "remote":
      return content.title ?? content.url;
    case "missing":
      return content.target;
  }
}

export function renderGallery(
  parent: HTMLElement,
  items: MediaItem[],
  host: MediaHost,
): void {
  if (items.length === 0) {
    return;
  }
  parent.createEl("h3", { cls: "gedcom-desk-section", text: t("desk.media") });
  const gallery = parent.createDiv({ cls: "gedcom-desk-gallery" });
  for (const item of items) {
    renderTile(gallery, item, host);
  }
}

export function renderTile(parent: HTMLElement, item: MediaItem, host: MediaHost): HTMLElement {
  const { content } = item;
  const tile = parent.createDiv({ cls: ["gedcom-desk-tile", `is-${content.kind}`] });
  const face = tile.createEl("button", { cls: "gedcom-desk-tile-face" });
  face.setAttribute("type", "button");
  const path = item.path;
  if (content.kind === "image") {
    drawPicture(face, content, 120, 120);
  } else {
    face.createDiv({ cls: "gedcom-desk-tile-note", text: tileNote(content) });
  }
  if (path && (content.kind === "image" || content.kind === "file")) {
    face.addEventListener("click", () => host.openFile(path));
  } else {
    face.setAttribute("disabled", "");
  }
  tile.createDiv({ cls: "gedcom-desk-tile-caption", text: caption(content) });
  const actions = tile.createDiv({ cls: "gedcom-desk-actions" });
  const record = item.record;
  if (record) {
    linkButton(actions, t("desk.mediaPage"), () => host.openRecord(record));
  }
  if (content.kind === "missing") {
    linkButton(actions, t("desk.showInSource"), () => host.showInSource(pointAt(item.at)));
  }
  return tile;
}

function tileNote(content: Exclude<MediaPreviewContent, { kind: "image" }>): string {
  switch (content.kind) {
    case "file":
      return t(`mediaKind.${content.mediaKind}` as MessageKey);
    case "remote":
      return t(content.state === "not-an-image" ? "desk.notAnImage" : "desk.fromWeb");
    case "missing":
      return t("desk.notInVault");
  }
}

export function renderPortrait(parent: HTMLElement, items: MediaItem[]): void {
  const portrait = items.find(
    (item): item is MediaItem & { content: Extract<MediaPreviewContent, { kind: "image" }> } =>
      item.content.kind === "image",
  );
  if (portrait) {
    drawPicture(parent.createDiv({ cls: "gedcom-desk-portrait" }), portrait.content, 76, 95);
  }
}
