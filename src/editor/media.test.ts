import type { MediaKind, MediaReference } from "@domorium/language-service";
import { describe, expect, it } from "vitest";

import {
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
    });
  });

  it("reads a relative target from the document that wrote it", () => {
    const content = mediaPreviewContent(
      reference({ targetText: "../shared/marie.jpg" }),
      vault({ "shared/marie.jpg": "app://shared" }, "family/tree.ged"),
    );
    expect(content).toEqual({ kind: "image", url: "app://shared" });
  });

  it("calls a remote target remote before it asks what the file is", () => {
    expect(
      mediaPreviewContent(
        reference({
          kind: "http",
          targetText: "https://example.org/marie.jpg",
          mediaKind: "image",
        }),
        vault(),
      ),
    ).toEqual({ kind: "remote", url: "https://example.org/marie.jpg" });
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
