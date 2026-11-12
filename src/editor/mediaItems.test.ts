import type { MediaReference, Position } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import { mediaItemAt } from "./mediaItems";

const at = (line: number): Position => ({ line, character: 7 });

const reference: MediaReference = {
  range: { start: at(1), end: { line: 1, character: 24 } },
  targetText: "media/marie.jpg",
  kind: "file-relative",
  mediaKind: "image",
};

const service = (found: MediaReference | null) => ({
  getMediaAt: () => found,
  getDocument: () => ({ getDialect: () => "7.0" as const }),
});

const resolve = (path: string): string | null =>
  path === "media/marie.jpg" ? "app://marie" : null;

describe("a media item at a position", () => {
  it("is null where the document names no media", () => {
    expect(mediaItemAt(service(null) as never, at(1), "tree.ged", resolve, false)).toBeNull();
  });

  it("carries the vault path of a file that resolves", () => {
    expect(mediaItemAt(service(reference) as never, at(1), "tree.ged", resolve, false)).toEqual({
      content: { kind: "image", url: "app://marie", name: "marie.jpg" },
      at: at(1),
      path: "media/marie.jpg",
    });
  });

  it("carries no path for a file the vault lacks", () => {
    const item = mediaItemAt(service(reference) as never, at(1), "tree.ged", () => null, false);
    expect(item?.content.kind).toBe("missing");
    expect(item).not.toHaveProperty("path");
  });
});
