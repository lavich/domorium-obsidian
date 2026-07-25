import { describe, expect, it } from "vitest";

import { SETTING_DEFINITIONS } from "./settingDefinitions";
import { DEFAULT_SETTINGS, parseSettings } from "./settingsData";

describe("GEDCOM settings", () => {
  it("enables language assistance by default", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      diagnostics: true,
      indentationHints: true,
    });
  });

  it("accepts persisted boolean settings", () => {
    expect(parseSettings({ diagnostics: false, indentationHints: false })).toEqual({
      diagnostics: false,
      indentationHints: false,
    });
  });

  it("uses defaults for missing or invalid persisted values", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(parseSettings({ diagnostics: "no", indentationHints: false })).toEqual({
      diagnostics: true,
      indentationHints: false,
    });
  });

  it("exposes both options to Obsidian settings search", () => {
    expect(SETTING_DEFINITIONS).toEqual([
      {
        name: "Diagnostics",
        desc: "Underline GEDCOM errors and warnings in the editor.",
        control: { type: "toggle", key: "diagnostics", defaultValue: true },
      },
      {
        name: "Indentation hints",
        desc: "Visually indent nested GEDCOM records without changing the file.",
        control: { type: "toggle", key: "indentationHints", defaultValue: true },
      },
    ]);
  });
});
