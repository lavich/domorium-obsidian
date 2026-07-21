import { describe, expect, it } from "vitest";

import { EditorLanguageService } from "./service";

describe("EditorLanguageService", () => {
  it("keeps one shared snapshot and resets it", () => {
    const language = new EditorLanguageService();
    const first = language.update("0 HEAD\n0 TRLR");
    const second = language.update("0 HEAD\n0 TRLR");
    expect(second).toBe(first);
    expect(second.getDiagnostics()).not.toHaveLength(0);

    language.clear();

    expect(language.service.getSemanticTokens()).toEqual([]);
  });
});
