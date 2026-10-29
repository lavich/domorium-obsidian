import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import {
  relativeToDocument,
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

  it("spells a vault path from the folder the GEDCOM file sits in", () => {
    expect(relativeToDocument("family/tree.ged", "family/media/photo.jpg")).toBe(
      "media/photo.jpg",
    );
    expect(relativeToDocument("tree.ged", "media/photo.jpg")).toBe(
      "media/photo.jpg",
    );
    expect(relativeToDocument("family/tree.ged", "shared/photo.jpg")).toBe(
      "../shared/photo.jpg",
    );
    expect(relativeToDocument("a/b/tree.ged", "photo.jpg")).toBe(
      "../../photo.jpg",
    );
  });

  it("spells back what resolving one gave", () => {
    const vaultPath = resolveVaultRelativePath("a/b/tree.ged", "../c/photo.jpg");

    expect(relativeToDocument("a/b/tree.ged", vaultPath!)).toBe(
      "../c/photo.jpg",
    );
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
    }, "family/tree.ged", "7.0", router)).toBe(true);
    expect(openExternal).toHaveBeenCalledWith("https://example.com");

    expect(routeDocumentLink({
      kind: "file-relative",
      targetText: "media/photo.jpg",
      range: {
        start: { line: 0, character: 0 },
        end: { line: 0, character: 1 },
      },
    }, "family/tree.ged", "7.0", router)).toBe(true);
    expect(openVaultFile).toHaveBeenCalledWith("family/media/photo.jpg");
  });

  it.each([
    ["GEDCOM 7.0", "1 GEDC\n2 VERS 7.0\n"],
    ["no version", ""],
  ])("follows a percent-escaped name in a document of %s", (_, head) => {
    const service = new GedcomLanguageService(
      `0 HEAD\n${head}0 @O1@ OBJE\n1 FILE photos/my%20photo.jpg\n0 TRLR\n`,
    );
    const openVaultFile = vi.fn();

    routeDocumentLink(
      service.getDocumentLinks()[0],
      "family/tree.ged",
      service.getDocument().getDialect(),
      { openExternal: vi.fn(), openVaultFile },
    );

    expect(openVaultFile).toHaveBeenCalledWith("family/photos/my photo.jpg");
  });

  it("follows a backslash and a parent folder in GEDCOM 5.5.1", () => {
    const service = new GedcomLanguageService(
      "0 HEAD\n1 GEDC\n2 VERS 5.5.1\n0 @O1@ OBJE\n1 FILE ..\\photos\\marie.jpg\n0 TRLR\n",
    );
    const openVaultFile = vi.fn();

    routeDocumentLink(
      service.getDocumentLinks()[0],
      "family/tree.ged",
      service.getDocument().getDialect(),
      { openExternal: vi.fn(), openVaultFile },
    );

    expect(openVaultFile).toHaveBeenCalledWith("photos/marie.jpg");
  });
});
