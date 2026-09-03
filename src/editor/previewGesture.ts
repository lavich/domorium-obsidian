import { HOVER_TIME_MS } from "@domorium/codemirror";

import type { RecordPreviewTrigger } from "../settingsData";

export interface PreviewGesture {
  opens(event: MouseEvent): boolean;
  closes(event: KeyboardEvent): boolean;
}

export function previewGesture(
  trigger: RecordPreviewTrigger,
  modifierHeld: (event: MouseEvent | KeyboardEvent) => boolean,
): PreviewGesture {
  switch (trigger) {
    case "off":
      return { opens: () => false, closes: () => false };
    case "hover":
      return { opens: () => true, closes: () => false };
    case "modifier":
      return {
        opens: (event) => modifierHeld(event),
        closes: (event) => !modifierHeld(event),
      };
  }
}

/**
 * A bare hover waits, as the tag tooltip does. A held modifier is already the
 * reader's intent and answers the first movement. Beside the gesture rather
 * than in either preview, both of them reading it from here.
 */
export function hoverDelay(trigger: RecordPreviewTrigger): number {
  return trigger === "hover" ? HOVER_TIME_MS : 0;
}
