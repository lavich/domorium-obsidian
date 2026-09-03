import type { Extension } from "@codemirror/state";
import { ViewPlugin, type EditorView } from "@codemirror/view";

/** The class the editor wears while the platform modifier is down. */
export const MODIFIER_HELD_CLASS = "gedcom-mod-held";

export type ModifierHeld = (event: MouseEvent | KeyboardEvent) => boolean;

/**
 * A cursor should promise only what a click delivers. Following a link in this
 * editor takes the modifier — a plain click has to place the caret, or a path
 * could not be edited — so the pointer cursor appears only while the modifier
 * is down, which is what Obsidian's own source editor does.
 */
export function modifierHeldClass(held: ModifierHeld): Extension {
  return ViewPlugin.define((view: EditorView) => {
    const owner = view.dom.ownerDocument;
    const window = owner.defaultView;
    const set = (down: boolean): void => {
      view.dom.classList.toggle(MODIFIER_HELD_CLASS, down);
    };
    // A modifier already down when the pointer arrives sends no keydown here,
    // and one released over another window sends no keyup, so the mouse says
    // what the keyboard did not and losing focus clears it either way.
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
