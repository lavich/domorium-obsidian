import type { SettingDefinitionItem } from "obsidian";

import { DEFAULT_SETTINGS, type GedcomSettings } from "./settingsData";

export const RECORD_PREVIEW_OPTIONS: Record<string, string> = {
  modifier: "Hold Ctrl/Cmd and hover",
  hover: "Hover",
  off: "Never",
};

export const SETTING_DEFINITIONS: SettingDefinitionItem<
  keyof GedcomSettings
>[] = [
  {
    name: "Diagnostics",
    desc: "Underline GEDCOM errors and warnings in the editor.",
    control: {
      type: "toggle",
      key: "diagnostics",
      defaultValue: DEFAULT_SETTINGS.diagnostics,
    },
  },
  {
    name: "Indentation hints",
    desc: "Visually indent nested GEDCOM records without changing the file.",
    control: {
      type: "toggle",
      key: "indentationHints",
      defaultValue: DEFAULT_SETTINGS.indentationHints,
    },
  },
  {
    name: "Record preview",
    desc: "Show the record a cross-reference points at when the pointer is over it.",
    control: {
      type: "dropdown",
      key: "recordPreview",
      options: RECORD_PREVIEW_OPTIONS,
      defaultValue: DEFAULT_SETTINGS.recordPreview,
    },
  },
];
