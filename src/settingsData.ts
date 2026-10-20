export const RECORD_PREVIEW_TRIGGERS = ["modifier", "hover", "off"] as const;

export type RecordPreviewTrigger = (typeof RECORD_PREVIEW_TRIGGERS)[number];

export const OPEN_AS_MODES = ["genealogy", "source"] as const;

export type OpenAsMode = (typeof OPEN_AS_MODES)[number];

export interface GedcomSettings {
  diagnostics: boolean;
  indentationHints: boolean;
  recordPreview: RecordPreviewTrigger;
  mediaPreview: RecordPreviewTrigger;
  remoteImages: boolean;
  openAs: OpenAsMode;
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
  openAs: "genealogy",
};

function isOpenAsMode(value: unknown): value is OpenAsMode {
  return OPEN_AS_MODES.includes(value as OpenAsMode);
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
    openAs: isOpenAsMode(settings.openAs) ? settings.openAs : DEFAULT_SETTINGS.openAs,
  };
}
