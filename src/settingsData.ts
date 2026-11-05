export const RECORD_PREVIEW_TRIGGERS = ["modifier", "hover", "off"] as const;

export type RecordPreviewTrigger = (typeof RECORD_PREVIEW_TRIGGERS)[number];

export const DESK_MODES = ["graph", "timeline", "list", "source"] as const;

export type DeskMode = (typeof DESK_MODES)[number];

export interface GedcomSettings {
  diagnostics: boolean;
  indentationHints: boolean;
  recordPreview: RecordPreviewTrigger;
  mediaPreview: RecordPreviewTrigger;
  remoteImages: boolean;
  mapTiles: boolean;
  tileUrl: string;
  tileAttribution: string;
  lastMode: DeskMode;
  genealogyInterface: boolean;
  openPanelsOnSelect: boolean;
}

export const DEFAULT_SETTINGS: GedcomSettings = {
  diagnostics: true,
  indentationHints: true,
  // A held modifier has to be discovered; the rest the pointer must make
  // solves the same problem without being told about.
  recordPreview: "hover",
  mediaPreview: "hover",
  // Reaching a stranger's host is a statement about a family, not about a
  // plugin, so it waits to be asked.
  remoteImages: false,
  // Tiles name the part of the world in view to a stranger's host, so no
  // server is built in and the toggle waits to be asked for.
  mapTiles: false,
  tileUrl: "",
  tileAttribution: "",
  lastMode: "graph",
  // The pages and panels are the plugin's largest surface; a reader who came
  // for the editor has not asked for them.
  genealogyInterface: false,
  openPanelsOnSelect: true,
};

function isDeskMode(value: unknown): value is DeskMode {
  return DESK_MODES.includes(value as DeskMode);
}

export function readDeskMode(value: unknown): DeskMode | undefined {
  if (value === "genealogy") {
    return "graph";
  }
  return isDeskMode(value) ? value : undefined;
}

/** Kept as typed: a half-typed address is judged where it is used, not trimmed away here. */
const MAX_TEXT = 2048;

function readText(value: unknown, fallback: string): string {
  return typeof value === "string" && value.length <= MAX_TEXT ? value : fallback;
}

function isRecordPreviewTrigger(value: unknown): value is RecordPreviewTrigger {
  return RECORD_PREVIEW_TRIGGERS.includes(value as RecordPreviewTrigger);
}

export function changedSetting(
  key: string,
  value: unknown,
): Partial<GedcomSettings> | null {
  if (!(key in DEFAULT_SETTINGS)) {
    return null;
  }
  const settingKey = key as keyof GedcomSettings;
  const accepted = parseSettings({ ...DEFAULT_SETTINGS, [key]: value });
  return accepted[settingKey] === value ? { [settingKey]: value } : null;
}

export function parseSettings(data: unknown): GedcomSettings {
  if (typeof data !== "object" || data === null) {
    return { ...DEFAULT_SETTINGS };
  }

  const settings = data as Record<string, unknown>;
  return {
    diagnostics:
      typeof settings.diagnostics === "boolean"
        ? settings.diagnostics
        : DEFAULT_SETTINGS.diagnostics,
    indentationHints:
      typeof settings.indentationHints === "boolean"
        ? settings.indentationHints
        : DEFAULT_SETTINGS.indentationHints,
    recordPreview: isRecordPreviewTrigger(settings.recordPreview)
      ? settings.recordPreview
      : DEFAULT_SETTINGS.recordPreview,
    mediaPreview: isRecordPreviewTrigger(settings.mediaPreview)
      ? settings.mediaPreview
      : DEFAULT_SETTINGS.mediaPreview,
    remoteImages:
      typeof settings.remoteImages === "boolean"
        ? settings.remoteImages
        : DEFAULT_SETTINGS.remoteImages,
    mapTiles:
      typeof settings.mapTiles === "boolean"
        ? settings.mapTiles
        : DEFAULT_SETTINGS.mapTiles,
    tileUrl: readText(settings.tileUrl, DEFAULT_SETTINGS.tileUrl),
    tileAttribution: readText(settings.tileAttribution, DEFAULT_SETTINGS.tileAttribution),
    lastMode: readDeskMode(settings.lastMode) ?? DEFAULT_SETTINGS.lastMode,
    genealogyInterface:
      typeof settings.genealogyInterface === "boolean"
        ? settings.genealogyInterface
        : DEFAULT_SETTINGS.genealogyInterface,
    openPanelsOnSelect:
      typeof settings.openPanelsOnSelect === "boolean"
        ? settings.openPanelsOnSelect
        : DEFAULT_SETTINGS.openPanelsOnSelect,
  };
}
