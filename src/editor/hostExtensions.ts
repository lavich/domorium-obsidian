import { search } from "@codemirror/search";
import type { Extension } from "@codemirror/state";
import {
  createStandaloneEditorExtensions,
  type GedcomEditorSettings,
} from "@domorium/codemirror";

import { obsidianTheme } from "./obsidianTheme";
import {
  obsidianSearchPanel,
  replaceMode,
  type PanelHost,
} from "./searchPanel";

export function createHostEditorExtensions(
  settings: GedcomEditorSettings,
  dark: boolean,
  panel: PanelHost,
): Extension[] {
  return [
    ...createStandaloneEditorExtensions({
      diagnostics: settings.diagnostics ?? true,
    }),
    search({ top: true, createPanel: obsidianSearchPanel(panel) }),
    replaceMode,
    obsidianTheme(dark),
  ];
}
