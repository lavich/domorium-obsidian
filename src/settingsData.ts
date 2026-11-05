export const RECORD_PREVIEW_TRIGGERS = ["modifier", "hover", "off"] as const;

export type RecordPreviewTrigger = (typeof RECORD_PREVIEW_TRIGGERS)[number];

export const DESK_MODES = ["graph", "timeline", "source"] as const;

export type OpenAsMode = (typeof DESK_MODES)[number];

export interface GedcomSettings {
  diagnostics: boolean;
  indentationHints: boolean;
  recordPreview: RecordPreviewTrigger;
  mediaPreview: RecordPreviewTrigger;
  remoteImages: boolean;
  openAs: OpenAsMode;
  genealogyInterface: boolean;
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
  openAs: "graph",
  // The pages and panels are the plugin's largest surface; a reader who came
  // for the editor has not asked for them.
  genealogyInterface: false,
};

function isOpenAsMode(value: unknown): value is OpenAsMode {
  return DESK_MODES.includes(value as OpenAsMode);
}

export function readOpenAs(value: unknown): OpenAsMode | undefined {
  if (value === "genealogy") {
    return "graph";
  }
  return isOpenAsMode(value) ? value : undefined;
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
    openAs: readOpenAs(settings.openAs) ?? DEFAULT_SETTINGS.openAs,
    genealogyInterface:
      typeof settings.genealogyInterface === "boolean"
        ? settings.genealogyInterface
        : DEFAULT_SETTINGS.genealogyInterface,
  };
}
