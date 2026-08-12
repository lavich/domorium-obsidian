import { describe, expect, it } from "vitest";

import {
  RECORD_PREVIEW_OPTIONS,
  SETTING_DEFINITIONS,
} from "./settingDefinitions";
import { DEFAULT_SETTINGS, parseSettings } from "./settingsData";

describe("GEDCOM settings", () => {
  it("enables language assistance by default", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      diagnostics: true,
      indentationHints: true,
      recordPreview: "modifier",
    });
  });

  it("accepts persisted boolean settings", () => {
    expect(
      parseSettings({
        diagnostics: false,
        indentationHints: false,
        recordPreview: "hover",
      }),
    ).toEqual({
      diagnostics: false,
      indentationHints: false,
      recordPreview: "hover",
    });
  });

  it("uses defaults for missing or invalid persisted values", () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(
      parseSettings({
        diagnostics: "no",
        indentationHints: false,
        recordPreview: "sometimes",
      }),
    ).toEqual({
      diagnostics: true,
      indentationHints: false,
      recordPreview: "modifier",
    });
  });

  it("exposes every option to Obsidian settings search", () => {
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
      {
        name: "Record preview",
        desc: "Show the record a cross-reference points at when the pointer is over it.",
        control: {
          type: "dropdown",
          key: "recordPreview",
          options: RECORD_PREVIEW_OPTIONS,
          defaultValue: "modifier",
        },
      },
    ]);
  });
});
