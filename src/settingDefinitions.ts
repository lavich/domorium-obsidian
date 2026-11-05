import type { SettingDropdownControl, SettingTextControl, SettingToggleControl } from "obsidian";

import { t } from "./i18n";
import { tileTemplate } from "./desk/mapProjection";
import { DEFAULT_SETTINGS, type GedcomSettings } from "./settingsData";

type SettingKey = keyof GedcomSettings;

export interface GedcomSettingDefinition {
  name: string;
  desc: string;
  control: SettingToggleControl<SettingKey> | SettingDropdownControl<SettingKey> | SettingTextControl<SettingKey>;
}

export const TILE_PLACEHOLDER = "https://tiles.example/{z}/{x}/{y}.png";

/** Functions, not constants: the language is known only once the plugin has loaded. */
export function recordPreviewOptions(): Record<string, string> {
  return {
    modifier: t("previewOption.modifier"),
    hover: t("previewOption.hover"),
    off: t("previewOption.off"),
  };
}

export function settingDefinitions(): GedcomSettingDefinition[] {
  return [
    {
      name: t("setting.genealogyInterface.name"),
      desc: t("setting.genealogyInterface.desc"),
      control: {
        type: "toggle",
        key: "genealogyInterface",
        defaultValue: DEFAULT_SETTINGS.genealogyInterface,
      },
    },
    {
      name: t("setting.openPanelsOnSelect.name"),
      desc: t("setting.openPanelsOnSelect.desc"),
      control: {
        type: "toggle",
        key: "openPanelsOnSelect",
        defaultValue: DEFAULT_SETTINGS.openPanelsOnSelect,
      },
    },
    {
      name: t("setting.diagnostics.name"),
      desc: t("setting.diagnostics.desc"),
      control: {
        type: "toggle",
        key: "diagnostics",
        defaultValue: DEFAULT_SETTINGS.diagnostics,
      },
    },
    {
      name: t("setting.indentationHints.name"),
      desc: t("setting.indentationHints.desc"),
      control: {
        type: "toggle",
        key: "indentationHints",
        defaultValue: DEFAULT_SETTINGS.indentationHints,
      },
    },
    {
      name: t("setting.recordPreview.name"),
      desc: t("setting.recordPreview.desc"),
      control: {
        type: "dropdown",
        key: "recordPreview",
        options: recordPreviewOptions(),
        defaultValue: DEFAULT_SETTINGS.recordPreview,
      },
    },
    {
      name: t("setting.mediaPreview.name"),
      desc: t("setting.mediaPreview.desc"),
      control: {
        type: "dropdown",
        key: "mediaPreview",
        options: recordPreviewOptions(),
        defaultValue: DEFAULT_SETTINGS.mediaPreview,
      },
    },
    {
      name: t("setting.remoteImages.name"),
      desc: t("setting.remoteImages.desc"),
      control: {
        type: "toggle",
        key: "remoteImages",
        defaultValue: DEFAULT_SETTINGS.remoteImages,
      },
    },
    {
      name: t("setting.mapTiles.name"),
      desc: t("setting.mapTiles.desc"),
      control: {
        type: "toggle",
        key: "mapTiles",
        defaultValue: DEFAULT_SETTINGS.mapTiles,
      },
    },
    {
      name: t("setting.tileUrl.name"),
      desc: t("setting.tileUrl.desc"),
      control: {
        type: "text",
        key: "tileUrl",
        placeholder: TILE_PLACEHOLDER,
        defaultValue: DEFAULT_SETTINGS.tileUrl,
        validate: (value) => (value.trim() === "" || tileTemplate(value) !== null ? undefined : t("map.tiles.invalid")),
      },
    },
    {
      name: t("setting.tileAttribution.name"),
      desc: t("setting.tileAttribution.desc"),
      control: {
        type: "text",
        key: "tileAttribution",
        defaultValue: DEFAULT_SETTINGS.tileAttribution,
      },
    },
  ];
}
