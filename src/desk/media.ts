import {
  drawnCrop,
  type MediaCrop,
  type Position,
} from "@domorium/language-service";

import type { MediaPreviewContent } from "../editor/media";

export interface MediaItem {
  content: MediaPreviewContent;
  path?: string;
  at: Position;
}

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
