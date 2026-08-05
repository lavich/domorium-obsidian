import { describe, expect, it } from "vitest";

const { readFile } = await import("node:fs/promises");
const stylesheet = await readFile(
  new URL("../styles.css", import.meta.url),
  "utf8",
);

describe("GEDCOM file explorer icons", () => {
  it.each(["ged", "gedcom"])(
    "targets .%s paths case-insensitively",
    (extension) => {
      expect(stylesheet).toMatch(
        new RegExp(
          String.raw`\.nav-files-container\s+\.nav-file-title\[data-path\$="\.${extension}" i\]\s+\.nav-file-title-content::before`,
        ),
      );
    },
  );

  it("uses a theme-aware SVG mask", () => {
    expect(stylesheet).toContain("background-color: currentColor");
    expect(stylesheet).toContain('mask-image: url("data:image/svg+xml');
    expect(stylesheet).toContain('-webkit-mask-image: url("data:image/svg+xml');
  });
});
