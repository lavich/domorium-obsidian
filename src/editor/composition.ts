import type { Extension } from "@codemirror/state";
import {
  createGedcomExtensions,
  recordPreviewHover,
  type EditorLanguageService,
  type GedcomEditorActions,
  type GedcomEditorSettings,
  type RecordPreview,
} from "@domorium/codemirror";
import type { EditorView } from "@codemirror/view";

import { createHostEditorExtensions } from "./hostExtensions";

export interface GedcomCompositionOptions {
  language: EditorLanguageService;
  settings: GedcomEditorSettings;
  actions: GedcomEditorActions;
  showPreview: (
    preview: RecordPreview,
    view: EditorView,
    event: MouseEvent,
  ) => void;
  hidePreview: (view: EditorView) => void;
}

export function createGedcomComposition(
  options: GedcomCompositionOptions,
): Extension[] {
  return [
    recordPreviewHover({
      language: options.language,
      show: options.showPreview,
      hide: options.hidePreview,
    }),
    ...createHostEditorExtensions(options.settings),
    ...createGedcomExtensions({
      language: options.language,
      settings: options.settings,
      actions: options.actions,
    }),
  ];
}
