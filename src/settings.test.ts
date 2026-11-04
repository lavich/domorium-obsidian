import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "./i18n";
import {
  openAsOptions,
  recordPreviewOptions,
  settingDefinitions,
} from "./settingDefinitions";
import { changedSetting, DEFAULT_SETTINGS, parseSettings } from "./settingsData";

afterEach(resetLanguage);

describe("GEDCOM settings", () => {
  it("enables language assistance by default", () => {
    expect(DEFAULT_SETTINGS).toEqual({
      diagnostics: true,
      indentationHints: true,
      recordPreview: "hover",
      mediaPreview: "hover",
      remoteImages: false,
      openAs: "graph",
      genealogyInterface: false,
    });
  });

  it("accepts persisted boolean settings", () => {
    expect(
      parseSettings({
        diagnostics: false,
        indentationHints: false,
        recordPreview: "modifier",
        mediaPreview: "off",
        remoteImages: true,
        openAs: "source",
        genealogyInterface: true,
      }),
      "a trigger the reader chose outlives a change of default",
    ).toEqual({
      diagnostics: false,
      indentationHints: false,
      recordPreview: "modifier",
      mediaPreview: "off",
      remoteImages: true,
      openAs: "source",
      genealogyInterface: true,
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
      recordPreview: "hover",
      mediaPreview: "hover",
      remoteImages: false,
      openAs: "graph",
      genealogyInterface: false,
    });
  });

  it("opens files as a graph for a settings file written before the choice existed", () => {
    expect(
      parseSettings({ diagnostics: true, openAs: "reading" }).openAs,
    ).toBe("graph");
  });

  it("opens files as a graph, a timeline or the source when the reader chose one, and a saved genealogy as a graph", () => {
    expect(parseSettings({ openAs: "graph" }).openAs).toBe("graph");
    expect(parseSettings({ openAs: "timeline" }).openAs).toBe("timeline");
    expect(parseSettings({ openAs: "genealogy" }).openAs).toBe("graph");
    expect(parseSettings({ openAs: "source" }).openAs).toBe("source");
    expect(changedSetting("openAs", "graph")).toEqual({ openAs: "graph" });
  });

  it("offers the three modes in order, in English and Russian", () => {
    expect(Object.keys(openAsOptions())).toEqual(["graph", "timeline", "source"]);
    expect(Object.values(openAsOptions())).toEqual(["Graph", "Timeline", "Source"]);
    setLanguage("ru");
    expect(Object.values(openAsOptions())).toEqual(["Граф", "Хронологию", "Исходник"]);
  });

  it("leaves the genealogy interface off for a settings file written before it existed", () => {
    expect(
      parseSettings({ diagnostics: true, openAs: "genealogy" })
        .genealogyInterface,
    ).toBe(false);
  });

  it("ignores a genealogy interface value that is not a boolean", () => {
    expect(parseSettings({ genealogyInterface: "yes" }).genealogyInterface).toBe(
      false,
    );
  });

  it("leaves the web off for a settings file written before it existed", () => {
    expect(
      parseSettings({
        diagnostics: true,
        indentationHints: true,
        recordPreview: "hover",
        mediaPreview: "hover",
      }).remoteImages,
      "a reader who never answered has not said yes",
    ).toBe(false);
  });

  it("exposes every option to Obsidian settings search", () => {
    expect(settingDefinitions()).toEqual([
      {
        name: "Genealogy interface (beta)",
        desc: "Still in beta: it may change and have rough edges. Show the Domorium index, the record card, the timeline and the graph of the file, with the ribbon icon and their commands. While this is off, GEDCOM files open in the source editor.",
        control: {
          type: "toggle",
          key: "genealogyInterface",
          defaultValue: false,
        },
      },
      {
        name: "Open GEDCOM files as",
        desc: "How a GEDCOM file opens in a new tab: as a graph, a timeline or the source. Each tab remembers the mode it was last in. Applies when the genealogy interface is on.",
        control: {
          type: "dropdown",
          key: "openAs",
          options: openAsOptions(),
          defaultValue: "graph",
        },
      },
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
          options: recordPreviewOptions(),
          defaultValue: "hover",
        },
      },
      {
        name: "Media preview",
        desc: "Show the photograph a FILE payload names when the pointer is over it.",
        control: {
          type: "dropdown",
          key: "mediaPreview",
          options: recordPreviewOptions(),
          defaultValue: "hover",
        },
      },
      {
        name: "Load images from the web",
        desc: "Draw a FILE payload naming an https address. Off, the preview says the file is remote and fetches nothing.",
        control: {
          type: "toggle",
          key: "remoteImages",
          defaultValue: false,
        },
      },
    ]);
  });

  it("speaks the reader's language when Obsidian asks for the definitions", () => {
    setLanguage("ru");
    const [, first, second] = settingDefinitions();

    expect(first?.name).toBe("Открывать файлы GEDCOM как");
    expect(openAsOptions().source).toBe("Исходник");
    expect(second?.name).toBe("Диагностика");
    expect(first?.desc).toMatch(/GEDCOM/);
    expect(recordPreviewOptions().off).toBe("Никогда");
  });

  it("has a definition for every setting, and a setting for every definition", () => {
    expect(settingDefinitions().map((item) => item.control.key).sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS).sort(),
    );
  });

  it("defaults every control to what the setting itself defaults to", () => {
    for (const { control } of settingDefinitions()) {
      expect(control.defaultValue).toBe(DEFAULT_SETTINGS[control.key]);
    }
  });

  it("offers a dropdown only values the setting accepts", () => {
    for (const { control } of settingDefinitions()) {
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
    expect(changedSetting("mediaPreview", "hover")).toEqual({
      mediaPreview: "hover",
    });
  });

  it("declines a value of the wrong kind rather than resetting the setting", () => {
    expect(changedSetting("diagnostics", "no")).toBeNull();
    expect(changedSetting("recordPreview", "sometimes")).toBeNull();
    expect(changedSetting("recordPreview", true)).toBeNull();
    expect(changedSetting("mediaPreview", "sometimes")).toBeNull();
  });

  it("declines a key that is not a setting", () => {
    expect(changedSetting("theme", "dark")).toBeNull();
    expect(changedSetting("__proto__", {})).toBeNull();
  });
});
