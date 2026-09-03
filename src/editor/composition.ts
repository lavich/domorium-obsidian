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
import type { MediaReference } from "@domorium/language-service";
import { ViewPlugin, type EditorView } from "@codemirror/view";

import { createHostEditorExtensions } from "./hostExtensions";
import { mediaLineAt } from "./mediaLine";
import {
  clearMediaPreview,
  hoveredMedia,
  mediaPreviewHover,
} from "./mediaPreviewHover";
import { modifierHeldClass, type ModifierHeld } from "./modifierHeld";
import type { PreviewGesture } from "./previewGesture";
import type { PanelHost } from "./searchPanel";

export interface GedcomCompositionOptions {
  language: EditorLanguageService;
  settings: GedcomEditorSettings;
  actions: GedcomEditorActions;
  dark: boolean;
  gesture: PreviewGesture;
  mediaGesture: PreviewGesture;
  /** Whether an event carries the platform modifier, which a click needs. */
  modifierHeld: ModifierHeld;
  /** How long a bare hover must rest before a preview opens; zero for a modifier. */
  delay: number;
  mediaDelay: number;
  panel: PanelHost;
  showPreview: (
    preview: RecordPreview,
    view: EditorView,
    event: MouseEvent,
  ) => void;
  hidePreview: (view: EditorView) => void;
  showMedia: (
    media: MediaReference,
    view: EditorView,
    event: MouseEvent,
  ) => void;
  hideMedia: (view: EditorView) => void;
}

// The editor sees a modifier released over itself; a modifier released over the
// sidebar, or over another window, only ever reaches the document.
function closePreviewOnRelease(
  gesture: PreviewGesture,
  mediaGesture: PreviewGesture,
): Extension {
  return ViewPlugin.define((view) => {
    const owner = view.dom.ownerDocument;
    const released = (event: KeyboardEvent): void => {
      if (gesture.closes(event) && hoveredPointer(view.state)) {
        clearRecordPreview(view);
      }
      if (mediaGesture.closes(event) && hoveredMedia(view)) {
        clearMediaPreview(view);
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
      delay: options.delay,
      // A multimedia link is a cross-reference too, so both previews answer
      // the same pointer and the picture wins — but only where the picture is
      // actually coming. Asked through `mediaLineAt`, the media hover's own
      // resolver: a second one could disagree and leave the reader neither.
      show: (preview, view, event) => {
        if (
          options.mediaGesture.opens(event) &&
          mediaLineAt(view.state, options.language, preview.pointer.from)
        ) {
          return;
        }
        options.showPreview(preview, view, event);
      },
      hide: options.hidePreview,
    }),
    mediaPreviewHover({
      language: options.language,
      trigger: (event) => options.mediaGesture.opens(event),
      delay: options.mediaDelay,
      show: options.showMedia,
      hide: options.hideMedia,
    }),
    closePreviewOnRelease(options.gesture, options.mediaGesture),
    modifierHeldClass(options.modifierHeld),
    ...createHostEditorExtensions(options.settings, options.dark, options.panel),
    ...createGedcomExtensions({
      language: options.language,
      settings: options.settings,
      actions: options.actions,
    }),
  ];
}
