import type {
  MediaCrop,
  MediaKind,
  MediaReference,
} from "@domorium/language-service";

import { resolveVaultRelativePath } from "./service";

/** What the popover should draw. No DOM in it, so it is testable on its own. */
export type MediaPreviewContent =
  | {
      kind: "image";
      url: string;
      /** The `alt` text. */
      name: string;
      title?: string;
      crop?: MediaCrop;
    }
  | { kind: "file"; mediaKind: MediaKind; name: string; title?: string }
  | { kind: "remote"; url: string; title?: string }
  | { kind: "missing"; target: string };

/** A vault path to a URL an `<img>` can take, or null where there is no such file. */
export type MediaResolver = (vaultPath: string) => string | null;

export interface MediaVault {
  /** The GEDCOM file a relative target is read from. */
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

/** An http target is answered before its kind: it is never to be fetched. */
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
        name: fileName(targetText),
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
 * The rectangle to draw, clamped to the loaded image, or null for "show the
 * whole image" — which is what a rectangle the image does not reach comes to.
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

/**
 * Ceilings, so a wide pane does not mean a wide popover. They live here alone:
 * what styles.css reads is the measured bound the view writes into
 * `--gedcom-media-max-w` and `--gedcom-media-max-h`, these already inside it.
 */
export const MEDIA_PREVIEW_MAX_WIDTH = 560;
export const MEDIA_PREVIEW_MAX_HEIGHT = 400;

const WIDTH_SHARE = 0.6;
const HEIGHT_SHARE = 0.4;

export interface PreviewBounds {
  width: number;
  height: number;
}

/**
 * The box the popover may fill, from the pane rather than the window: with both
 * sidebars open the window is wider than the editor.
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

/**
 * How far a rectangle has to shrink to fit the bound, never above 1. A larger
 * rectangle is scaled rather than cut short: a corner of it is another picture.
 */
export function cropScale(crop: MediaCrop, bounds: PreviewBounds): number {
  if (crop.width <= 0 || crop.height <= 0) {
    return 1;
  }
  return Math.min(1, bounds.width / crop.width, bounds.height / crop.height);
}
