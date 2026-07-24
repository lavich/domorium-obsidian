import type { SettingDefinitionItem } from "obsidian";

import { DEFAULT_SETTINGS, type GedcomSettings } from "./settingsData";

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
];
