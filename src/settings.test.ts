import { describe, expect, it } from "vitest";

import {
  RECORD_PREVIEW_OPTIONS,
  SETTING_DEFINITIONS,
} from "./settingDefinitions";
import { changedSetting, DEFAULT_SETTINGS, parseSettings } from "./settingsData";

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

  it("has a definition for every setting, and a setting for every definition", () => {
    expect(SETTING_DEFINITIONS.map((item) => item.control.key).sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS).sort(),
    );
  });

  it("defaults every control to what the setting itself defaults to", () => {
    for (const { control } of SETTING_DEFINITIONS) {
      expect(control.defaultValue).toBe(DEFAULT_SETTINGS[control.key]);
    }
  });

  it("offers a dropdown only values the setting accepts", () => {
    for (const { control } of SETTING_DEFINITIONS) {
      if (control.type !== "dropdown") {
        continue;
      }
      for (const value of Object.keys(control.options)) {
        expect(changedSetting(control.key, value)).toEqual({
          [control.key]: value,
        });
      }
    }
  });
});

describe("one setting the user has changed", () => {
  it("takes a value the setting can hold", () => {
    expect(changedSetting("diagnostics", false)).toEqual({
      diagnostics: false,
    });
    expect(changedSetting("recordPreview", "off")).toEqual({
      recordPreview: "off",
    });
  });

  it("declines a value of the wrong kind rather than resetting the setting", () => {
    expect(changedSetting("diagnostics", "no")).toBeNull();
    expect(changedSetting("recordPreview", "sometimes")).toBeNull();
    expect(changedSetting("recordPreview", true)).toBeNull();
  });

  it("declines a key that is not a setting", () => {
    expect(changedSetting("theme", "dark")).toBeNull();
    expect(changedSetting("__proto__", {})).toBeNull();
  });
});
