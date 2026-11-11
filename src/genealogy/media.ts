import type { DocumentSymbol, MediaCrop } from "@domorium/language-service";

import { childOf, childrenOf, payload, payloadPosition } from "./symbols";
import type { MediaLink, MediaRecord, PersonMedia } from "./types";

export function mediaOf(
  record: DocumentSymbol,
  objects: Map<string, DocumentSymbol>,
  unresolved: string[],
): PersonMedia[] {
  const media: PersonMedia[] = [];
  for (const link of childrenOf(record, "OBJE")) {
    const pointer = payload(link);
    // Either the link names a multimedia record, or it carries the file
    // itself, which 5.5.1 allows and 7.0 does not.
    const holder = pointer ? objects.get(pointer) : link;
    if (!holder) {
      if (pointer && !unresolved.includes(pointer)) {
        unresolved.push(pointer);
      }
      continue;
    }
    const file = payload(childOf(holder, "FILE"));
    if (!file) {
      continue;
    }
    const fileLine = childOf(holder, "FILE") ?? holder;
    const form = payload(childOf(fileLine, "FORM"));
    const title =
      payload(childOf(link, "TITL")) ??
      payload(childOf(holder, "TITL")) ??
      payload(childOf(fileLine, "TITL"));
    const crop = cropOf(link);
    media.push({
      file,
      ...(form === undefined ? {} : { form }),
      ...(title === undefined ? {} : { title }),
      ...(crop === undefined ? {} : { crop }),
      at: payloadPosition(pointer ? link : fileLine),
      ...(pointer ? { record: pointer } : {}),
    });
  }
  return media;
}

/** Extensions a document that says nothing about a file may still be judged by. */
const IMAGE_EXTENSIONS = new Set([
  "png", "jpg", "jpeg", "gif", "svg", "webp", "bmp", "tif", "tiff", "avif",
]);

/**
 * Whether the document calls this an image. Where it says what the file is,
 * that is believed; where it says nothing, the name is the only evidence left.
 */
export function looksLikeAnImage(media: PersonMedia): boolean {
  if (media.form) {
    return media.form.toLowerCase().startsWith("image/");
  }
  const dot = media.file.lastIndexOf(".");
  return (
    dot > 0 && IMAGE_EXTENSIONS.has(media.file.slice(dot + 1).toLowerCase())
  );
}

export function cropOf(link: DocumentSymbol): MediaCrop | undefined {
  const crop = childOf(link, "CROP");
  if (!crop) {
    return undefined;
  }
  const number = (tag: string): number | undefined => {
    const written = payload(childOf(crop, tag));
    const value = written === undefined ? Number.NaN : Number(written);
    return Number.isFinite(value) ? value : undefined;
  };
  const top = number("TOP");
  const left = number("LEFT");
  const height = number("HEIGHT");
  const width = number("WIDTH");
  // A rectangle missing a side is not a rectangle. The whole picture is a
  // better answer than a guessed one.
  if (top === undefined || left === undefined || height === undefined || width === undefined) {
    return undefined;
  }
  return { top, left, height, width };
}

export function collectMediaLinks(
  symbol: DocumentSymbol,
  owner: string,
  into: Map<string, MediaLink[]>,
): void {
  for (const link of childrenOf(symbol, "OBJE")) {
    const pointer = payload(link);
    if (!pointer?.startsWith("@")) {
      continue;
    }
    const title = payload(childOf(link, "TITL"));
    const crop = cropOf(link);
    const held = into.get(pointer) ?? [];
    held.push({
      record: owner,
      ...(title === undefined ? {} : { title }),
      ...(crop === undefined ? {} : { crop }),
      at: payloadPosition(link),
    });
    into.set(pointer, held);
  }
}

export function mediaRecordOf(
  xref: string,
  record: DocumentSymbol,
  links: MediaLink[],
): MediaRecord {
  const fileLine = childOf(record, "FILE");
  const file = payload(fileLine);
  const title = payload(childOf(record, "TITL")) ?? payload(fileLine && childOf(fileLine, "TITL"));
  const form = payload(fileLine && childOf(fileLine, "FORM"));
  return {
    xref,
    ...(file === undefined ? {} : { file }),
    ...(form === undefined ? {} : { form }),
    ...(title === undefined ? {} : { title }),
    ...(fileLine && file !== undefined ? { at: payloadPosition(fileLine) } : {}),
    links,
    range: record.range,
  };
}
