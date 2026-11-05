import type { MediaReference, Position } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import type { MediaItem } from "../desk/media";
import { mediaItemAt, mediaItemsOf, portraitOf } from "./mediaItems";

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

describe("media items of a record", () => {
  const found = (line: number): MediaItem => ({
    content: { kind: "image", url: `app://${line}`, name: `${line}.jpg` },
    at: at(line),
  });

  it("drops entries that resolve to nothing and keeps the record of the rest", () => {
    const items = mediaItemsOf(
      [{ at: at(1), record: "@O1@" }, { at: at(2) }, { at: at(3) }],
      (position) => (position.line === 2 ? null : found(position.line)),
    );
    expect(items.map((item) => item.record)).toEqual(["@O1@", undefined]);
    expect(items).toHaveLength(2);
    expect(items[1]).not.toHaveProperty("record");
  });
});

describe("the portrait of a person", () => {
  it("is the first item that can be drawn", () => {
    const missing: MediaItem = { content: { kind: "missing", name: "x.jpg" } as never, at: at(1) };
    const image: MediaItem = {
      content: { kind: "image", url: "app://a", name: "a.jpg" },
      at: at(2),
    };
    expect(portraitOf([missing, image])).toBe(image.content);
  });

  it("is null without an image", () => {
    expect(portraitOf([])).toBeNull();
  });
});
