import type { Extension } from "@codemirror/state";
import { ViewPlugin, type EditorView } from "@codemirror/view";

/** The class the editor wears while the platform modifier is down. */
export const MODIFIER_HELD_CLASS = "gedcom-mod-held";

export type ModifierHeld = (event: MouseEvent | KeyboardEvent) => boolean;

/**
 * A cursor should promise only what a click delivers, and following a link here
 * takes the modifier — a plain click has to place the caret. Obsidian's own
 * source editor gates the affordance on a class the same way.
 */
export function modifierHeldClass(held: ModifierHeld): Extension {
  return ViewPlugin.define((view: EditorView) => {
    const owner = view.dom.ownerDocument;
    const window = owner.defaultView;
    const set = (down: boolean): void => {
      view.dom.classList.toggle(MODIFIER_HELD_CLASS, down);
    };
    // A modifier already down when the pointer arrives sends no keydown here,
    // and one released over another window sends no keyup.
    const fromKey = (event: KeyboardEvent): void => set(held(event));
    const fromMouse = (event: MouseEvent): void => set(held(event));
    const clear = (): void => set(false);

    owner.addEventListener("keydown", fromKey);
    owner.addEventListener("keyup", fromKey);
    view.dom.addEventListener("mousemove", fromMouse);
    view.dom.addEventListener("mouseleave", clear);
    window?.addEventListener("blur", clear);

    return {
      destroy: () => {
        owner.removeEventListener("keydown", fromKey);
        owner.removeEventListener("keyup", fromKey);
        view.dom.removeEventListener("mousemove", fromMouse);
        view.dom.removeEventListener("mouseleave", clear);
        window?.removeEventListener("blur", clear);
      },
    };
  });
}
