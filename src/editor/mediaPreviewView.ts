import type { MediaCrop } from "@domorium/language-service";

import { t, type MessageKey } from "../i18n";
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

const REMOTE_NOTES: Record<RemoteState, MessageKey> = {
  unasked: "media.remoteNotLoaded",
  insecure: "media.insecureNotLoaded",
  "not-an-image": "media.remoteNotLoaded",
};

const OFFERS: { scope: AllowScope; label: MessageKey }[] = [
  { scope: "once", label: "media.showOnce" },
  { scope: "always", label: "media.showAlways" },
];

/**
 * Draws into the container in place of whatever it held. A popover redrawn by
 * the reader's answer keeps the footprint the question had, as a minimum: the
 * image it draws has no size until it arrives, and a popover that shrinks under
 * the pointer is a popover the pointer has left, which closes it.
 */
export function renderMediaPreview(
  content: MediaPreviewContent,
  host: MediaPreviewHost,
): void {
  const kept = footprintOf(previousPreview(host.container));
  host.container.replaceChildren();
  const root = element(host.container, "div", "gedcom-media-preview");
  root.style.setProperty("--gedcom-media-max-w", `${host.bounds.width}px`);
  root.style.setProperty("--gedcom-media-max-h", `${host.bounds.height}px`);
  if (kept !== null) {
    root.style.minWidth = `${kept.width}px`;
    root.style.minHeight = `${kept.height}px`;
  }

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
        t(REMOTE_NOTES[content.state]),
      );
      if (content.state === "unasked" && host.allow) {
        drawOffer(root, host.allow);
      }
      break;
    case "missing":
      drawRow(root, ICONS.missing, content.target, host, t("media.fileNotFound"));
      break;
  }

  if (content.kind !== "missing" && content.title !== undefined) {
    caption(root, content.title);
  }
}

function previousPreview(container: HTMLElement): HTMLElement | null {
  for (const child of container.children) {
    if (child.classList.contains("gedcom-media-preview")) {
      return child as HTMLElement;
    }
  }
  return null;
}

/**
 * The content box of a drawn preview: the extent of its children, not the
 * root's own rectangle, which has the padding in it that the root's content-box
 * sizing would then count again. Nothing drawn, or nothing laid out, is no
 * footprint to keep.
 */
function footprintOf(
  root: HTMLElement | null,
): { width: number; height: number } | null {
  if (root === null || root.children.length === 0) {
    return null;
  }
  let width = 0;
  let top = Infinity;
  let bottom = -Infinity;
  for (const child of root.children) {
    const rect = child.getBoundingClientRect();
    width = Math.max(width, rect.width);
    top = Math.min(top, rect.top);
    bottom = Math.max(bottom, rect.bottom);
  }
  const height = bottom - top;
  return width > 0 && height > 0 ? { width, height } : null;
}

/** The way out, beside the refusal rather than in the settings tab. */
function drawOffer(
  root: HTMLElement,
  allow: (scope: AllowScope) => void,
): void {
  const row = element(root, "div", "gedcom-media-offer");
  for (const { scope, label } of OFFERS) {
    const button = element(row, "button", "gedcom-media-allow");
    button.textContent = t(label);
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
      t(content.remote ? "media.loadFailed" : "media.drawFailed"),
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
export function applyCrop(
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
