import { GedcomLanguageService } from "@domorium/language-service";
import { describe, expect, it, vi } from "vitest";

import { routeDocumentLink } from "./service";

describe("Obsidian document link adapter", () => {
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
