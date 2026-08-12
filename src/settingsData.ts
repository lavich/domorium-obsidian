export const RECORD_PREVIEW_TRIGGERS = ["modifier", "hover", "off"] as const;

export type RecordPreviewTrigger = (typeof RECORD_PREVIEW_TRIGGERS)[number];

export interface GedcomSettings {
  diagnostics: boolean;
  indentationHints: boolean;
  recordPreview: RecordPreviewTrigger;
}

export const DEFAULT_SETTINGS: GedcomSettings = {
  diagnostics: true,
  indentationHints: true,
  recordPreview: "modifier",
};

export function isRecordPreviewTrigger(
  value: unknown,
): value is RecordPreviewTrigger {
  return RECORD_PREVIEW_TRIGGERS.includes(value as RecordPreviewTrigger);
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
  };
}
