export interface DomoriumSettings {
  diagnostics: boolean;
  indentationHints: boolean;
}

export const DEFAULT_SETTINGS: DomoriumSettings = {
  diagnostics: true,
  indentationHints: true,
};

export function parseSettings(data: unknown): DomoriumSettings {
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
  };
}
