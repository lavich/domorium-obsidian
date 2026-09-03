/*
 * The keys Obsidian's own document search bar answers, key for key, read out of
 * its bundle rather than taken from `searchKeymap`: the library invents three
 * keys Obsidian has nowhere and misses five it has. Read out with them: the
 * gate each key keeps, which is no smaller a part of the key than the key
 * itself — `Mod+Alt+Enter` rewrites the file. The table is data so the panel,
 * the view and the browser harness all answer from the same one.
 */

/** What `Scope.register` takes, and what `Mod` means: Meta on macOS, Ctrl elsewhere. */
export type KeyModifier = "Mod" | "Ctrl" | "Meta" | "Shift" | "Alt";

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

export interface SearchKeyActions {
  findNext(): void;
  findPrevious(): void;
  close(): void;
  selectAll(): void;
  replaceNext(): void;
  replaceAll(): void;
  focused(): "search" | "replace" | null;
  /** Whether the replace row is open, which is what gates replace-all. */
  replacing(): boolean;
  /**
   * Moves to the bar's other field — there being two, the direction is the
   * other one either way — and answers false while the replace row is
   * collapsed and there is no other field, the native bar's own no-op.
   */
  moveFocus(): boolean;
}

/** What the panel needs of `app.keymap`: push these, and pop them on destroy. */
export type ScopePusher = (bindings: SearchKeyBinding[]) => () => void;

export interface SearchKeyName {
  modifiers: readonly KeyModifier[];
  key: string;
}

/**
 * The key each button names on the second line of its tooltip, held as the
 * table below holds it rather than as a string: a tooltip cannot then promise
 * a key that does nothing, and `spellKey` can spell it for the reader.
 */
export const SEARCH_KEY_CAPTIONS = {
  findNext: { modifiers: [], key: "F3" },
  findPrevious: { modifiers: ["Shift"], key: "F3" },
  selectAll: { modifiers: ["Alt"], key: "Enter" },
  replaceNext: { modifiers: [], key: "Enter" },
  replaceAll: { modifiers: ["Mod", "Alt"], key: "Enter" },
} as const satisfies Record<string, SearchKeyName>;

/** The order Obsidian spells modifiers in, whatever order they were named. */
const MODIFIER_ORDER: readonly KeyModifier[] = [
  "Mod",
  "Ctrl",
  "Meta",
  "Alt",
  "Shift",
];

/** What Obsidian shows for each, which on macOS is the glyph on the key. */
const MAC_MODIFIERS: Record<KeyModifier, string> = {
  Mod: "⌘",
  Ctrl: "⌃",
  Meta: "⌘",
  Alt: "⌥",
  Shift: "⇧",
};

const OTHER_MODIFIERS: Record<KeyModifier, string> = {
  Mod: "Ctrl",
  Ctrl: "Ctrl",
  Meta: "Win",
  Alt: "Alt",
  Shift: "Shift",
};

/**
 * A binding spelt the way Obsidian spells one for a reader: its own symbols,
 * in its own order, joined by a space on macOS and by " + " elsewhere. `Mod`
 * is a token of the API and reaches no tooltip — a reader sees `⌘` or `Ctrl`.
 *
 * Obsidian also prettifies the key itself, but only for the arrows and the
 * space bar; `F3` and `Enter` come through it unchanged, and the table names
 * nothing else.
 */
export function spellKey(name: SearchKeyName, mac: boolean): string {
  const symbols = mac ? MAC_MODIFIERS : OTHER_MODIFIERS;
  const spelt = MODIFIER_ORDER.filter((modifier) =>
    name.modifiers.includes(modifier),
  ).map((modifier) => symbols[modifier]);
  spelt.push(name.key);
  return spelt.join(mac ? " " : " + ");
}

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

const moveFocus = (actions: SearchKeyActions) => (): boolean =>
  actions.focused() !== null && actions.moveFocus();

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
    { modifiers: [], key: "Tab", act: moveFocus(actions) },
    { modifiers: ["Shift"], key: "Tab", act: moveFocus(actions) },
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
     * same guard because `app.keymap` does not filter composition for it.
     */
    run: (event: SearchKeyEvent) => !event.isComposing && act(),
  }));
}
