import type {
  MediaCrop,
  MediaKind,
  MediaReference,
} from "@domorium/language-service";

import { resolveVaultRelativePath } from "./service";

/**
 * What the popover should draw. No DOM in it, so every branch the spec names is
 * decided in one place and tested without a vault or a browser.
 */
export type MediaPreviewContent =
  | { kind: "image"; url: string; title?: string; crop?: MediaCrop }
  | { kind: "file"; mediaKind: MediaKind; name: string; title?: string }
  | { kind: "remote"; url: string; title?: string }
  | { kind: "missing"; target: string };

/** A vault path to something an `<img>` can take, or null where the vault holds no such file. */
export type MediaResolver = (vaultPath: string) => string | null;

export interface MediaVault {
  /** The GEDCOM file the payload is written in; a relative target is read from here. */
  documentPath: string;
  resolve: MediaResolver;
}

const withTitle = <T extends object>(
  content: T,
  title: string | undefined,
): T => (title === undefined ? content : { ...content, title });

const fileName = (target: string): string => {
  const parts = target.replaceAll("\\", "/").split("/");
  return parts[parts.length - 1] || target;
};

/**
 * The promise about network requests outranks the question of what the file is,
 * so an http target is answered before its kind is ever consulted.
 */
export function mediaPreviewContent(
  reference: MediaReference,
  { documentPath, resolve }: MediaVault,
): MediaPreviewContent {
  const { targetText, title } = reference;
  if (reference.kind === "http") {
    return withTitle({ kind: "remote" as const, url: targetText }, title);
  }
  const vaultPath =
    reference.kind === "file-relative"
      ? resolveVaultRelativePath(documentPath, targetText)
      : null;
  const url = vaultPath === null ? null : resolve(vaultPath);
  if (url === null) {
    return { kind: "missing", target: targetText };
  }
  if (reference.mediaKind === "image") {
    return withTitle(
      {
        kind: "image" as const,
        url,
        ...(reference.crop === undefined ? {} : { crop: reference.crop }),
      },
      title,
    );
  }
  return withTitle(
    {
      kind: "file" as const,
      mediaKind: reference.mediaKind,
      name: fileName(targetText),
    },
    title,
  );
}

/**
 * The rectangle to draw, or null for "show the whole image".
 *
 * The extent of an image is not knowable from the document — upstream says so
 * and declines to clamp — so the rectangle is measured against the image only
 * once the browser has loaded it. A rectangle the image does not reach at all
 * names nothing, and showing the whole photograph beats showing an empty box.
 */
export function drawnCrop(
  crop: MediaCrop,
  naturalWidth: number,
  naturalHeight: number,
): MediaCrop | null {
  if (naturalWidth <= 0 || naturalHeight <= 0) {
    return null;
  }
  const left = Math.max(0, crop.left);
  const top = Math.max(0, crop.top);
  const width = Math.min(crop.left + crop.width, naturalWidth) - left;
  const height = Math.min(crop.top + crop.height, naturalHeight) - top;
  if (width <= 0 || height <= 0) {
    return null;
  }
  return { top, left, width, height };
}

/** Ceilings, so a wide pane does not mean a wide popover. */
export const MEDIA_PREVIEW_MAX_WIDTH = 560;
export const MEDIA_PREVIEW_MAX_HEIGHT = 400;

const WIDTH_SHARE = 0.6;
const HEIGHT_SHARE = 0.4;

export interface PreviewBounds {
  width: number;
  height: number;
}

/**
 * The box the popover may fill, taken from the pane rather than the window: with
 * both sidebars open the window is wider than the editor, and a preview bounded
 * by the window overflows the pane it hangs in.
 *
 * An unmeasurable pane yields the ceilings, which is what the CSS fallback
 * would have applied anyway.
 */
export function previewBounds(
  paneWidth: number,
  paneHeight: number,
): PreviewBounds {
  return {
    width:
      paneWidth > 0
        ? Math.min(paneWidth * WIDTH_SHARE, MEDIA_PREVIEW_MAX_WIDTH)
        : MEDIA_PREVIEW_MAX_WIDTH,
    height:
      paneHeight > 0
        ? Math.min(paneHeight * HEIGHT_SHARE, MEDIA_PREVIEW_MAX_HEIGHT)
        : MEDIA_PREVIEW_MAX_HEIGHT,
  };
}
