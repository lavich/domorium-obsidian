import type { MediaKind, MediaReference } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import {
  cropScale,
  drawnCrop,
  mediaPreviewContent,
  previewBounds,
  MEDIA_PREVIEW_MAX_HEIGHT,
  MEDIA_PREVIEW_MAX_WIDTH,
  type MediaVault,
} from "./media";

function reference(overrides: Partial<MediaReference> = {}): MediaReference {
  return {
    range: {
      start: { line: 1, character: 7 },
      end: { line: 1, character: 24 },
    },
    targetText: "media/marie.jpg",
    kind: "file-relative",
    mediaKind: "image",
    ...overrides,
  };
}

const vault = (
  files: Record<string, string> = { "media/marie.jpg": "app://marie" },
  documentPath = "tree.ged",
): MediaVault => ({
  documentPath,
  resolve: (path) => files[path] ?? null,
});

describe("what the popover should draw", () => {
  it("answers a vault image with the resolved url", () => {
    expect(mediaPreviewContent(reference(), vault())).toEqual({
      kind: "image",
      url: "app://marie",
      name: "marie.jpg",
    });
  });

  it("reads a relative target from the document that wrote it", () => {
    const content = mediaPreviewContent(
      reference({ targetText: "../shared/marie.jpg" }),
      vault({ "shared/marie.jpg": "app://shared" }, "family/tree.ged"),
    );
    expect(content).toEqual({
      kind: "image",
      url: "app://shared",
      name: "marie.jpg",
    });
  });

  it("leaves a remote target as a row until the reader has been asked", () => {
    expect(
      mediaPreviewContent(
        reference({
          kind: "http",
          targetText: "https://example.org/marie.jpg",
          mediaKind: "image",
        }),
        vault(),
      ),
    ).toEqual({
      kind: "remote",
      url: "https://example.org/marie.jpg",
      state: "unasked",
    });
  });

  it("draws it once the reader has said so, from the url the document wrote", () => {
    expect(
      mediaPreviewContent(
        reference({
          kind: "http",
          targetText: "https://example.org/marie.jpg",
          mediaKind: "image",
        }),
        vault(),
        true,
      ),
    ).toEqual({
      kind: "image",
      url: "https://example.org/marie.jpg",
      name: "marie.jpg",
      remote: true,
    });
  });

  it("carries the rectangle and the caption a remote link asks for", () => {
    expect(
      mediaPreviewContent(
        reference({
          kind: "http",
          targetText: "https://example.org/family.jpg",
          mediaKind: "image",
          crop: { top: 10, left: 20, height: 30, width: 40 },
          title: "Marie, second from the left",
        }),
        vault(),
        true,
      ),
    ).toEqual({
      kind: "image",
      url: "https://example.org/family.jpg",
      name: "family.jpg",
      remote: true,
      crop: { top: 10, left: 20, height: 30, width: 40 },
      title: "Marie, second from the left",
    });
  });

  it("refuses an unencrypted address whatever the reader answered", () => {
    expect(
      mediaPreviewContent(
        reference({
          kind: "http",
          targetText: "http://example.org/marie.jpg",
          mediaKind: "image",
        }),
        vault(),
        true,
      ),
    ).toEqual({
      kind: "remote",
      url: "http://example.org/marie.jpg",
      state: "insecure",
    });
  });

  it("names remote media that is not an image rather than fetching it", () => {
    expect(
      mediaPreviewContent(
        reference({
          kind: "http",
          targetText: "https://example.org/interview.mp3",
          mediaKind: "audio",
        }),
        vault(),
        true,
      ),
    ).toEqual({
      kind: "remote",
      url: "https://example.org/interview.mp3",
      state: "not-an-image",
    });
  });

  it("answers missing where the vault holds no such file", () => {
    expect(
      mediaPreviewContent(reference({ targetText: "media/gone.jpg" }), vault()),
    ).toEqual({ kind: "missing", target: "media/gone.jpg" });
  });

  it("answers missing where the target escapes the vault", () => {
    expect(
      mediaPreviewContent(
        reference({ targetText: "../outside/marie.jpg" }),
        vault({}, "tree.ged"),
      ),
    ).toEqual({ kind: "missing", target: "../outside/marie.jpg" });
  });

  it("answers missing for a target the vault cannot address at all", () => {
    expect(
      mediaPreviewContent(
        reference({ kind: "file-absolute", targetText: "/etc/marie.jpg" }),
        vault(),
      ),
    ).toEqual({ kind: "missing", target: "/etc/marie.jpg" });
  });

  it("names media it cannot draw rather than hiding it", () => {
    const kinds: MediaKind[] = ["audio", "video", "document", "unknown"];
    for (const mediaKind of kinds) {
      expect(
        mediaPreviewContent(
          reference({ mediaKind, targetText: "media/interview.mp3" }),
          vault({ "media/interview.mp3": "app://interview" }),
        ),
      ).toEqual({ kind: "file", mediaKind, name: "interview.mp3" });
    }
  });

  it("names a file written with backslashes by its last segment", () => {
    expect(
      mediaPreviewContent(
        reference({ mediaKind: "document", targetText: "media\\deed.pdf" }),
        vault({ "media/deed.pdf": "app://deed" }),
      ),
    ).toEqual({ kind: "file", mediaKind: "document", name: "deed.pdf" });
  });
});

describe("the caption the author wrote", () => {
  it("travels with every branch that has one", () => {
    expect(
      mediaPreviewContent(reference({ title: "Marie" }), vault()),
    ).toMatchObject({ kind: "image", title: "Marie" });
    expect(
      mediaPreviewContent(
        reference({ mediaKind: "audio", title: "Grandmother" }),
        vault(),
      ),
    ).toMatchObject({ kind: "file", title: "Grandmother" });
    expect(
      mediaPreviewContent(
        reference({ kind: "http", targetText: "https://e.org/m.jpg", title: "Marie" }),
        vault(),
      ),
    ).toMatchObject({ kind: "remote", title: "Marie" });
  });

  it("is absent rather than filled in from the file name", () => {
    const content = mediaPreviewContent(reference(), vault());
    expect(content).not.toHaveProperty("title");
  });
});

describe("the rectangle a link asks for", () => {
  it("travels with an image that has one", () => {
    const crop = { top: 100, left: 250, height: 400, width: 300 };
    expect(mediaPreviewContent(reference({ crop }), vault())).toEqual({
      kind: "image",
      url: "app://marie",
      name: "marie.jpg",
      crop,
    });
  });

  it("is drawn unchanged where the image covers it", () => {
    expect(
      drawnCrop({ top: 100, left: 250, height: 400, width: 300 }, 1000, 800),
    ).toEqual({ top: 100, left: 250, height: 400, width: 300 });
  });

  it("is clamped to the part of it the image reaches", () => {
    expect(
      drawnCrop({ top: 100, left: 900, height: 400, width: 300 }, 1000, 300),
    ).toEqual({ top: 100, left: 900, height: 200, width: 100 });
  });

  it("gives up where the image does not reach it at all", () => {
    expect(
      drawnCrop({ top: 0, left: 2000, height: 100, width: 100 }, 1000, 800),
    ).toBeNull();
  });

  it("gives up on a rectangle with no extent", () => {
    expect(drawnCrop({ top: 0, left: 0, height: 0, width: 300 }, 1000, 800)).toBeNull();
    expect(drawnCrop({ top: 0, left: 0, height: 300, width: 0 }, 1000, 800)).toBeNull();
  });

  it("gives up before the image has a size to measure against", () => {
    expect(drawnCrop({ top: 0, left: 0, height: 10, width: 10 }, 0, 0)).toBeNull();
  });
});

describe("how far a rectangle has to shrink to fit the bound", () => {
  const bounds = { width: 560, height: 400 };

  it("leaves a rectangle the bound already holds at its own size", () => {
    expect(
      cropScale({ top: 0, left: 0, width: 300, height: 200 }, bounds),
    ).toBe(1);
  });

  it("shrinks a rectangle wider than the bound by its width", () => {
    expect(
      cropScale({ top: 0, left: 0, width: 1120, height: 400 }, bounds),
    ).toBe(0.5);
  });

  it("shrinks a rectangle taller than the bound by its height", () => {
    expect(
      cropScale({ top: 0, left: 0, width: 400, height: 800 }, bounds),
    ).toBe(0.5);
  });

  it("takes the tighter of the two, so both hold", () => {
    expect(
      cropScale({ top: 0, left: 0, width: 1120, height: 1600 }, bounds),
    ).toBe(0.25);
  });

  it("declines to divide by a rectangle with no extent", () => {
    expect(cropScale({ top: 0, left: 0, width: 0, height: 0 }, bounds)).toBe(1);
  });
});

describe("the box the popover may fill", () => {
  it("takes a share of the pane on a small one", () => {
    expect(previewBounds(400, 600)).toEqual({ width: 240, height: 240 });
  });

  it("stops at the ceiling on a large one", () => {
    expect(previewBounds(2400, 1400)).toEqual({
      width: MEDIA_PREVIEW_MAX_WIDTH,
      height: MEDIA_PREVIEW_MAX_HEIGHT,
    });
  });

  it("falls back to the ceiling where the pane cannot be measured", () => {
    expect(previewBounds(0, 0)).toEqual({
      width: MEDIA_PREVIEW_MAX_WIDTH,
      height: MEDIA_PREVIEW_MAX_HEIGHT,
    });
  });
});
