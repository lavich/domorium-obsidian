import type {
  GedcomLanguageService,
  Position,
} from "@domorium/language-service";

import type { MediaItem } from "../desk/media";
import type { PortraitContent } from "../desk/graphCanvas";
import {
  mediaPreviewContent,
  mediaVaultPath,
  type MediaResolver,
  type MediaVault,
} from "./media";

type MediaService = Pick<GedcomLanguageService, "getMediaAt" | "getDocument">;

export function mediaVaultOf(
  service: MediaService,
  documentPath: string,
  resolve: MediaResolver,
): MediaVault {
  return {
    documentPath,
    dialect: service.getDocument().getDialect(),
    resolve,
  };
}

export function mediaItemAt(
  service: MediaService,
  at: Position,
  documentPath: string,
  resolve: MediaResolver,
  remoteImages: boolean,
): MediaItem | null {
  const reference = service.getMediaAt(at);
  if (!reference) {
    return null;
  }
  const vault = mediaVaultOf(service, documentPath, resolve);
  const content = mediaPreviewContent(reference, vault, remoteImages);
  const path = mediaVaultPath(reference, vault);
  return { content, at, ...(path && content.kind !== "missing" ? { path } : {}) };
}

export function mediaItemsOf(
  media: { at: Position; record?: string }[],
  itemAt: (at: Position) => MediaItem | null,
): MediaItem[] {
  return media.flatMap((one) => {
    const item = itemAt(one.at);
    return item ? [{ ...item, ...(one.record ? { record: one.record } : {}) }] : [];
  });
}

export function portraitOf(items: MediaItem[]): PortraitContent | null {
  const found = items.find((item) => item.content.kind === "image");
  return found?.content.kind === "image" ? found.content : null;
}
