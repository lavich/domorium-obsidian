import type { Extension } from "@codemirror/state";
import {
  clearRecordPreview,
  createGedcomExtensions,
  hoveredPointer,
  recordPreviewHover,
  type EditorLanguageService,
  type GedcomEditorActions,
  type GedcomEditorSettings,
  type RecordPreview,
} from "@domorium/codemirror";
import { ViewPlugin, type EditorView } from "@codemirror/view";

import { createHostEditorExtensions } from "./hostExtensions";
import type { PreviewGesture } from "./previewGesture";

export interface GedcomCompositionOptions {
  language: EditorLanguageService;
  settings: GedcomEditorSettings;
  actions: GedcomEditorActions;
  dark: boolean;
  gesture: PreviewGesture;
  showPreview: (
    preview: RecordPreview,
    view: EditorView,
    event: MouseEvent,
  ) => void;
  hidePreview: (view: EditorView) => void;
}

// The editor sees a modifier released over itself; a modifier released over the
// sidebar, or over another window, only ever reaches the document.
function closePreviewOnRelease(gesture: PreviewGesture): Extension {
  return ViewPlugin.define((view) => {
    const owner = view.dom.ownerDocument;
    const released = (event: KeyboardEvent): void => {
      if (gesture.closes(event) && hoveredPointer(view.state)) {
        clearRecordPreview(view);
      }
    };
    owner.addEventListener("keyup", released);
    return {
      destroy: () => {
        owner.removeEventListener("keyup", released);
      },
    };
  });
}

export function createGedcomComposition(
  options: GedcomCompositionOptions,
): Extension[] {
  return [
    recordPreviewHover({
      language: options.language,
      trigger: (event) => options.gesture.opens(event),
      show: options.showPreview,
      hide: options.hidePreview,
    }),
    closePreviewOnRelease(options.gesture),
    ...createHostEditorExtensions(options.settings, options.dark),
    ...createGedcomExtensions({
      language: options.language,
      settings: options.settings,
      actions: options.actions,
    }),
  ];
}
