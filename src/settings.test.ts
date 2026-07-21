import { describe, expect, it } from "vitest";

import { DEFAULT_SETTINGS } from "./settingsData";

describe("Domorium settings", () => {
  it("enables language assistance by default", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      diagnostics: true,
      indentationHints: true,
    });
  });
});
