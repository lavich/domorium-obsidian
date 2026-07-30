import { describe, expect, it, vi } from "vitest";

import {
  resolveVaultRelativePath,
  routeDocumentLink,
} from "./service";

describe("Obsidian document link adapter", () => {
  it("resolves local links from the GEDCOM file directory and stays in vault", () => {
    expect(
      resolveVaultRelativePath("family/tree.ged", "media/photo.jpg"),
    ).toBe("family/media/photo.jpg");
    expect(
      resolveVaultRelativePath("family/tree.ged", "../shared/photo.jpg"),
    ).toBe("shared/photo.jpg");
    expect(
      resolveVaultRelativePath("tree.ged", "../outside/photo.jpg"),
    ).toBeNull();
  });

  it("routes HTTP externally and vault files through the resolved path", () => {
    const openExternal = vi.fn();
    const openVaultFile = vi.fn();
    const router = { openExternal, openVaultFile };

    expect(routeDocumentLink({
      kind: "http",
      targetText: "https://example.com",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    }, "family/tree.ged", router)).toBe(true);
    expect(openExternal).toHaveBeenCalledWith("https://example.com");

    expect(routeDocumentLink({
      kind: "file-relative",
      targetText: "media/photo.jpg",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    }, "family/tree.ged", router)).toBe(true);
    expect(openVaultFile).toHaveBeenCalledWith("family/media/photo.jpg");
  });
});
