import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "./i18n";
import {
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
      mapTiles: false,
      tileUrl: "",
      tileAttribution: "",
      lastMode: "graph",
      genealogyInterface: false,
      openPanelsOnSelect: true,
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
        mapTiles: true,
        tileUrl: "https://tiles.example/{z}/{x}/{y}.png",
        tileAttribution: "© Example Maps",
        lastMode: "timeline",
        genealogyInterface: true,
        openPanelsOnSelect: false,
      }),
      "a trigger the reader chose outlives a change of default",
    ).toEqual({
      diagnostics: false,
      indentationHints: false,
      recordPreview: "modifier",
      mediaPreview: "off",
      remoteImages: true,
      mapTiles: true,
      tileUrl: "https://tiles.example/{z}/{x}/{y}.png",
      tileAttribution: "© Example Maps",
      lastMode: "timeline",
      genealogyInterface: true,
      openPanelsOnSelect: false,
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
      mapTiles: false,
      tileUrl: "",
      tileAttribution: "",
      lastMode: "graph",
      genealogyInterface: false,
      openPanelsOnSelect: true,
    });
  });

  it("remembers Graph as the last mode for a settings file written before the mode was kept", () => {
    expect(parseSettings({ diagnostics: true }).lastMode).toBe("graph");
  });

  it("keeps the last mode the reader chose, reads a saved genealogy as a graph and ignores any other value", () => {
    expect(parseSettings({ lastMode: "source" }).lastMode).toBe("source");
    expect(parseSettings({ lastMode: "timeline" }).lastMode).toBe("timeline");
    expect(parseSettings({ lastMode: "genealogy" }).lastMode).toBe("graph");
    expect(parseSettings({ lastMode: "reading" }).lastMode).toBe("graph");
    expect(parseSettings({ lastMode: 3 }).lastMode).toBe("graph");
  });

  it("drops the retired Open GEDCOM files as value on the next save", () => {
    const parsed = parseSettings({ openAs: "source", diagnostics: false });

    expect(parsed).not.toHaveProperty("openAs");
    expect(parsed.lastMode).toBe("graph");
    expect(parsed.diagnostics).toBe(false);
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

  it("opens the side panels for a settings file written before the choice existed", () => {
    expect(parseSettings({ diagnostics: true }).openPanelsOnSelect).toBe(true);
  });

  it("keeps the side panels closed for a reader who turned the choice off, and ignores a value that is not a boolean", () => {
    expect(parseSettings({ openPanelsOnSelect: false }).openPanelsOnSelect).toBe(false);
    expect(parseSettings({ openPanelsOnSelect: "no" }).openPanelsOnSelect).toBe(true);
  });

  it("accepts a change of the side panels choice only as a boolean", () => {
    expect(changedSetting("openPanelsOnSelect", false)).toEqual({ openPanelsOnSelect: false });
    expect(changedSetting("openPanelsOnSelect", "no")).toBeNull();
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
        desc: "Still in beta: it may change and have rough edges. Show the record card and the graph, the timeline, the list and the map of the file, with their commands. While this is off, GEDCOM files open in the source editor.",
        control: {
          type: "toggle",
          key: "genealogyInterface",
          defaultValue: false,
        },
      },
      {
        name: "Open the record card when selecting",
        desc: "Selecting a record in a graph, a timeline or a list shows the record card on the right, opening a collapsed sidebar without moving the focus. Applies when the genealogy interface is on; on a phone the right drawer opens as before.",
        control: {
          type: "toggle",
          key: "openPanelsOnSelect",
          defaultValue: true,
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
      {
        name: "Load map tiles from the web",
        desc: "Off, the map is drawn on the bundled outline and nothing is requested. On, the tile server you name learns the tile numbers, which say what part of the world you look at, and your network address. No place name leaves the vault.",
        control: { type: "toggle", key: "mapTiles", defaultValue: false },
      },
      {
        name: "Tile server address",
        desc: "A template with {z}, {x} and {y}, starting with https://. Applies while tiles are loaded. It is saved as typed, with any key it holds, in the plugin's data.",
        control: {
          type: "text",
          key: "tileUrl",
          placeholder: "https://tiles.example/{z}/{x}/{y}.png",
          defaultValue: "",
          validate: expect.any(Function) as unknown,
        },
      },
      {
        name: "Tile attribution",
        desc: "Text shown in the corner of the map while tiles are loaded. Empty, the map shows the host of the address.",
        control: { type: "text", key: "tileAttribution", defaultValue: "" },
      },
    ]);
  });

  it("speaks the reader's language when Obsidian asks for the definitions", () => {
    setLanguage("ru");
    const [, panels, second] = settingDefinitions();

    expect(panels?.name).toBe("Открывать карточку записи при выборе");
    expect(second?.name).toBe("Диагностика");
    expect(second?.desc).toMatch(/GEDCOM/);
    expect(recordPreviewOptions().off).toBe("Никогда");
  });

  it("has a definition for every setting the reader can change, and for no other", () => {
    expect(settingDefinitions().map((item) => item.control.key).sort()).toEqual(
      Object.keys(DEFAULT_SETTINGS)
        .filter((key) => key !== "lastMode")
        .sort(),
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

describe("the map tile settings", () => {
  it("read off and empty for a settings file written before they existed", () => {
    const parsed = parseSettings({ diagnostics: true });

    expect([parsed.mapTiles, parsed.tileUrl, parsed.tileAttribution]).toEqual([false, "", ""]);
  });

  it("read the defaults for a value of the wrong kind or an address of 3000 characters", () => {
    const parsed = parseSettings({ mapTiles: "yes", tileUrl: 5, tileAttribution: "x".repeat(3000) });

    expect([parsed.mapTiles, parsed.tileUrl, parsed.tileAttribution]).toEqual([false, "", ""]);
  });

  it("keep an address as typed, spaces and all", () => {
    expect(changedSetting("tileUrl", " https://x/{z}")).toEqual({ tileUrl: " https://x/{z}" });
    expect(changedSetting("mapTiles", "yes")).toBeNull();
  });

  it("ship no server", () => {
    expect(JSON.stringify(DEFAULT_SETTINGS)).not.toContain("http");
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
