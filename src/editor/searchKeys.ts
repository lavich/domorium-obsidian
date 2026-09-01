/*
 * The keys Obsidian's own document search bar answers, key for key, read out of
 * its bundle rather than taken from `searchKeymap`: the library invents three
 * keys Obsidian has nowhere and misses five it has. The table is data so the
 * panel, the view and the browser harness all answer from the same one.
 *
 * Read out with it: the gate each key keeps. Obsidian's bar registers eleven
 * keys and guards four of them — `Enter` and `Shift+Enter` on the focus being
 * in one of its fields, `Alt+Enter` on the same, `Mod+Alt+Enter` on the replace
 * row being open with the focus in it. Losing a gate is not a smaller change
 * than losing a key: `Mod+Alt+Enter` rewrites the file.
 */

/** What `Scope.register` takes, and what `Mod` means: Meta on macOS, Ctrl elsewhere. */
export type KeyModifier = "Mod" | "Ctrl" | "Meta" | "Shift" | "Alt";

/** The little of a keydown the table reads; the rest is the scope's business. */
export interface SearchKeyEvent {
  isComposing: boolean;
}

export interface SearchKeyBinding {
  modifiers: KeyModifier[];
  /** From `KeyboardEvent.key`, so `F3`, `G`, `Enter`, `Escape` name themselves. */
  key: string;
  /** True when the key was the bar's; false leaves it to the editor. */
  run(event: SearchKeyEvent): boolean;
}

/** What the panel can do, and the questions only the panel can answer. */
export interface SearchKeyActions {
  findNext(): void;
  findPrevious(): void;
  close(): void;
  selectAll(): void;
  replaceNext(): void;
  replaceAll(): void;
  /** Which of the bar's fields has the focus, if either. */
  focused(): "search" | "replace" | null;
  /** Whether the replace row is open, which is what gates replace-all. */
  replacing(): boolean;
  /** False while the replace row is collapsed, as the native bar's own no-op. */
  moveFocus(back: boolean): boolean;
}

/** What the panel needs of `app.keymap`: push these, and pop them on destroy. */
export type ScopePusher = (bindings: SearchKeyBinding[]) => () => void;

/**
 * The key each button names on the second line of its tooltip, the way the
 * native bar spells one. Each is a binding of the table below, written as the
 * table writes it, so a tooltip cannot promise a key that does nothing.
 */
export const SEARCH_KEY_CAPTIONS = {
  findNext: "F3",
  findPrevious: "Shift+F3",
  selectAll: "Alt+Enter",
  replaceNext: "Enter",
  replaceAll: "Mod+Alt+Enter",
} as const;

/** One entry of the table before the composition guard wraps it. */
interface KeyEntry {
  modifiers: KeyModifier[];
  key: string;
  act: () => boolean;
}

const claim = (run: () => void) => (): boolean => {
  run();
  return true;
};

/**
 * A key the bar takes only while one of its fields has the focus. Returning
 * false is how Enter goes on opening a line, and Tab on indenting, in the
 * document under an open bar — the gate the native bar's own onEnter keeps,
 * and its onAltEnter with it.
 */
const inFields =
  (actions: SearchKeyActions, run: () => void) => (): boolean => {
    if (actions.focused() === null) {
      return false;
    }
    run();
    return true;
  };

/**
 * Replace-all is the replace row's own key: the native bar's onModAltEnter
 * wants the row open *and* the focus in it, which is what keeps a replacement
 * the reader cannot see from rewriting the file.
 */
const inReplaceField =
  (actions: SearchKeyActions, run: () => void) => (): boolean => {
    if (!actions.replacing() || actions.focused() !== "replace") {
      return false;
    }
    run();
    return true;
  };

/** moveFocus answers false with the replace row collapsed, and so do we. */
const moveFocus = (actions: SearchKeyActions, back: boolean) => (): boolean =>
  actions.focused() !== null && actions.moveFocus(back);

/**
 * Whether a keydown is this binding's. Obsidian's own `Scope` answers this for
 * the plugin; the browser harness has no `app.keymap` and asks here, so the
 * specs drive the shipped table through the shipped matcher.
 *
 * The case of a letter is the keyboard's — `Mod+G` arrives as `g` and
 * `Mod+Shift+G` as `G` — and every modifier is matched exactly, so a key the
 * binding does not name keeps it from answering.
 */
export function matchesBinding(
  event: KeyboardEvent,
  binding: SearchKeyBinding,
  mac: boolean,
): boolean {
  if (event.key.toLowerCase() !== binding.key.toLowerCase()) {
    return false;
  }
  const named = (modifier: KeyModifier): boolean =>
    binding.modifiers.includes(modifier);
  const mod = named("Mod");
  return (
    event.metaKey === (named("Meta") || (mod && mac)) &&
    event.ctrlKey === (named("Ctrl") || (mod && !mac)) &&
    event.shiftKey === named("Shift") &&
    event.altKey === named("Alt")
  );
}

function entries(actions: SearchKeyActions): KeyEntry[] {
  return [
    { modifiers: [], key: "F3", act: claim(() => actions.findNext()) },
    { modifiers: ["Mod"], key: "G", act: claim(() => actions.findNext()) },
    {
      modifiers: ["Shift"],
      key: "F3",
      act: claim(() => actions.findPrevious()),
    },
    {
      modifiers: ["Mod", "Shift"],
      key: "G",
      act: claim(() => actions.findPrevious()),
    },
    {
      modifiers: [],
      key: "Enter",
      act: inFields(actions, () => {
        if (actions.focused() === "replace") {
          actions.replaceNext();
        } else {
          actions.findNext();
        }
      }),
    },
    {
      modifiers: ["Shift"],
      key: "Enter",
      act: inFields(actions, () => actions.findPrevious()),
    },
    { modifiers: [], key: "Escape", act: claim(() => actions.close()) },
    { modifiers: [], key: "Tab", act: moveFocus(actions, false) },
    { modifiers: ["Shift"], key: "Tab", act: moveFocus(actions, true) },
    {
      modifiers: ["Alt"],
      key: "Enter",
      act: inFields(actions, () => actions.selectAll()),
    },
    {
      modifiers: ["Mod", "Alt"],
      key: "Enter",
      act: inReplaceField(actions, () => actions.replaceAll()),
    },
  ];
}

export function searchBindings(actions: SearchKeyActions): SearchKeyBinding[] {
  return entries(actions).map(({ modifiers, key, act }) => ({
    modifiers,
    key,
    /*
     * A keydown that is part of an IME composition belongs to the input method:
     * `Enter` there commits a candidate. Obsidian's own onEnter opens with the
     * same guard because `app.keymap` does not filter composition for it — and
     * the panel's own keydown listeners, which used to keep this guard, are
     * gone.
     */
    run: (event: SearchKeyEvent) => !event.isComposing && act(),
  }));
}
