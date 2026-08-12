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
