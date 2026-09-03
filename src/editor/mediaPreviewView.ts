import type { MediaCrop } from "@domorium/language-service";

import {
  cropScale,
  drawnCrop,
  type MediaPreviewContent,
  type PreviewBounds,
  type RemoteState,
} from "./media";
import type { IconSetter } from "./searchPanel";

/**
 * Drawing the popover. Standard DOM and an injected `setIcon`, so the browser
 * harness mounts the same code without Obsidian.
 */

const ICONS: Record<string, string> = {
  audio: "file-audio",
  video: "file-video",
  document: "file-text",
  unknown: "file",
  remote: "globe",
  missing: "file-question",
};

export type AllowScope = "once" | "always";

export interface MediaPreviewHost {
  /** The element the popover's content goes in. */
  container: HTMLElement;
  bounds: PreviewBounds;
  setIcon: IconSetter;
  /** False once this popover is no longer the one on screen. */
  isCurrent: () => boolean;
  /** Taking the offer a refused remote image carries. Absent where there is none. */
  allow?: (scope: AllowScope) => void;
}

const REMOTE_NOTES: Record<RemoteState, string> = {
  unasked: "Remote file, not loaded",
  insecure: "Unencrypted address, not loaded",
  "not-an-image": "Remote file, not loaded",
};

const OFFERS: { scope: AllowScope; label: string }[] = [
  { scope: "once", label: "Show this image" },
  { scope: "always", label: "Always show images from the web" },
];

export function renderMediaPreview(
  content: MediaPreviewContent,
  host: MediaPreviewHost,
): void {
  const root = element(host.container, "div", "gedcom-media-preview");
  root.style.setProperty("--gedcom-media-max-w", `${host.bounds.width}px`);
  root.style.setProperty("--gedcom-media-max-h", `${host.bounds.height}px`);

  switch (content.kind) {
    case "image":
      drawImage(root, content, host);
      break;
    case "file":
      drawRow(root, ICONS[content.mediaKind] ?? ICONS.unknown, content.name, host);
      break;
    case "remote":
      drawRow(
        root,
        ICONS.remote,
        content.url,
        host,
        REMOTE_NOTES[content.state],
      );
      if (content.state === "unasked" && host.allow) {
        drawOffer(root, host.allow);
      }
      break;
    case "missing":
      drawRow(root, ICONS.missing, content.target, host, "File not found");
      break;
  }

  if (content.kind !== "missing" && content.title !== undefined) {
    caption(root, content.title);
  }
}

/** The way out, beside the refusal rather than in the settings tab. */
function drawOffer(
  root: HTMLElement,
  allow: (scope: AllowScope) => void,
): void {
  const row = element(root, "div", "gedcom-media-offer");
  for (const { scope, label } of OFFERS) {
    const button = element(row, "button", "gedcom-media-allow");
    button.textContent = label;
    button.addEventListener("click", () => {
      allow(scope);
    });
  }
}

function element(
  parent: HTMLElement,
  tag: "button" | "div" | "img" | "span",
  cls: string,
  before?: ChildNode,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.insertBefore(node, before ?? null);
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
  before?: ChildNode,
): HTMLElement {
  const row = element(root, "div", "gedcom-media-row", before);
  host.setIcon(element(row, "span", "gedcom-media-icon"), icon);
  const body = element(row, "div", "gedcom-media-body");
  if (note !== undefined) {
    element(body, "div", "gedcom-media-note").textContent = note;
  }
  element(body, "div", "gedcom-media-name").textContent = text;
  return row;
}

/**
 * A rectangle is a window with the image behind it — no canvas, nothing
 * decoded. The image's own size is unknown until it loads, so the rectangle is
 * re-measured then, and every late handler checks the popover is still the one
 * on screen: a load outlives the gesture that asked for it.
 */
function drawImage(
  root: HTMLElement,
  content: {
    url: string;
    name: string;
    title?: string;
    crop?: MediaCrop;
    remote?: true;
  },
  host: MediaPreviewHost,
): void {
  const { url, crop } = content;
  const frame = element(root, "div", "gedcom-media-frame");
  const image = element(frame, "img", "gedcom-media-image") as HTMLImageElement;
  image.alt = content.title ?? content.name;

  // The file is there and will not draw; an empty frame would read as a bug.
  // A remote one may never have arrived, which is a different thing to say.
  image.addEventListener("error", () => {
    if (!host.isCurrent()) {
      return;
    }
    drawRow(
      root,
      content.remote ? ICONS.remote : ICONS.missing,
      content.remote ? content.url : content.name,
      host,
      content.remote ? "Image could not be loaded" : "Image could not be drawn",
      frame,
    );
    frame.remove();
  });

  if (crop === undefined) {
    image.src = url;
    return;
  }
  frame.classList.add("gedcom-media-cropped");
  applyCrop(frame, image, crop, host.bounds);
  image.addEventListener("load", () => {
    if (!host.isCurrent()) {
      return;
    }
    const drawn = drawnCrop(crop, image.naturalWidth, image.naturalHeight);
    if (drawn === null) {
      frame.classList.remove("gedcom-media-cropped");
      frame.style.removeProperty("width");
      frame.style.removeProperty("height");
      image.style.removeProperty("transform");
      return;
    }
    applyCrop(frame, image, drawn, host.bounds);
  });
  image.src = url;
}

/**
 * The image sits behind the frame at its own size, moved so the rectangle's
 * corner meets the frame's, and scaled about that same corner where the
 * rectangle is larger than the bound.
 */
function applyCrop(
  frame: HTMLElement,
  image: HTMLElement,
  crop: MediaCrop,
  bounds: PreviewBounds,
): void {
  const scale = cropScale(crop, bounds);
  frame.style.width = `${crop.width * scale}px`;
  frame.style.height = `${crop.height * scale}px`;
  image.style.transform = `translate(${-crop.left * scale}px, ${
    -crop.top * scale
  }px) scale(${scale})`;
}
