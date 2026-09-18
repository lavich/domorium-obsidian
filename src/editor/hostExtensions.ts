import { search } from "@codemirror/search";
import { EditorState, type Extension } from "@codemirror/state";
import {
  createStandaloneEditorExtensions,
  type GedcomEditorSettings,
} from "@domorium/codemirror";

import { currentLanguage, en, t, type MessageKey } from "../i18n";
import { obsidianTheme } from "./obsidianTheme";
import {
  obsidianSearchPanel,
  replaceMode,
  type PanelHost,
} from "./searchPanel";

const CM_PHRASES: MessageKey[] = [
  "cm.diagnostics",
  "cm.noDiagnostics",
  "cm.close",
  "cm.foldedCode",
  "cm.unfold",
  "cm.completions",
];

/** The English side is the phrase CodeMirror looks up; English supplies nothing. */
function codeMirrorPhrases(): Extension[] {
  if (currentLanguage() === "en") {
    return [];
  }
  const phrases: Record<string, string> = {};
  for (const key of CM_PHRASES) {
    phrases[en[key] as string] = t(key);
  }
  return [EditorState.phrases.of(phrases)];
}

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
    ...codeMirrorPhrases(),
  ];
}
