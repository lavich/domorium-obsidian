import { describe, expect, it, vi } from "vitest";

import {
  matchesBinding,
  searchBindings,
  SEARCH_KEY_CAPTIONS,
  spellKey,
  type SearchKeyActions,
  type SearchKeyBinding,
  type SearchKeyEvent,
  type SearchKeyName,
} from "./searchKeys";

/** Every action the bar offers, so a test can see which one a key ran. */
const ACTIONS = [
  "findNext",
  "findPrevious",
  "close",
  "selectAll",
  "replaceNext",
  "replaceAll",
  "moveFocus",
] as const;

type Actions = SearchKeyActions &
  Record<(typeof ACTIONS)[number], ReturnType<typeof vi.fn>>;

function actions(overrides: Partial<SearchKeyActions> = {}): Actions {
  return {
    findNext: vi.fn(),
    findPrevious: vi.fn(),
    close: vi.fn(),
    selectAll: vi.fn(),
    replaceNext: vi.fn(),
    replaceAll: vi.fn(),
    focused: vi.fn(() => "search" as const),
    replacing: vi.fn(() => true),
    moveFocus: vi.fn(() => true),
    ...overrides,
  } as Actions;
}

const ran = (fake: Actions): string[] =>
  ACTIONS.filter((name) => fake[name].mock.calls.length > 0);

const signature = (binding: SearchKeyName): string =>
  [...binding.modifiers, binding.key].join("+");

/** The binding that answers these keys, run the way a scope would run it. */
function press(
  fake: SearchKeyActions,
  keys: string,
  event: SearchKeyEvent = { isComposing: false },
): boolean {
  const binding = searchBindings(fake).find(
    (candidate) => signature(candidate) === keys,
  );
  if (!binding) {
    throw new Error(`no binding answers ${keys}`);
  }
  return binding.run(event);
}

describe("the keys the search bar answers", () => {
  it("answers Obsidian's own keys and invents none of its own", () => {
    const bindings = searchBindings(actions());

    expect(bindings.map(signature).sort()).toEqual(
      [
        "F3",
        "Mod+G",
        "Shift+F3",
        "Mod+Shift+G",
        "Enter",
        "Shift+Enter",
        "Escape",
        "Tab",
        "Shift+Tab",
        "Alt+Enter",
        "Mod+Alt+Enter",
      ].sort(),
    );
  });

  it.each([
    ["F3", "findNext"],
    ["Mod+G", "findNext"],
    ["Shift+F3", "findPrevious"],
    ["Mod+Shift+G", "findPrevious"],
    ["Escape", "close"],
    ["Alt+Enter", "selectAll"],
    ["Enter", "findNext"],
    ["Shift+Enter", "findPrevious"],
    ["Tab", "moveFocus"],
    ["Shift+Tab", "moveFocus"],
  ])("runs %s and nothing else", (keys, action) => {
    const fake = actions();

    expect(press(fake, keys)).toBe(true);
    expect(ran(fake)).toEqual([action]);
  });

  it("replaces on Enter from the replace field", () => {
    const fake = actions({ focused: () => "replace" });

    expect(press(fake, "Enter")).toBe(true);
    expect(ran(fake)).toEqual(["replaceNext"]);
  });

  it("replaces every match from the replace field, where the native bar does", () => {
    const fake = actions({ focused: () => "replace" });

    expect(press(fake, "Mod+Alt+Enter")).toBe(true);
    expect(ran(fake)).toEqual(["replaceAll"]);
  });

  it("moves to the other field on Tab and on Shift-Tab, asking for no direction", () => {
    const fake = actions();
    press(fake, "Tab");
    expect(fake.moveFocus.mock.calls).toEqual([[]]);

    const back = actions();
    press(back, "Shift+Tab");
    expect(back.moveFocus.mock.calls).toEqual([[]]);
  });
});

describe("the keys the bar leaves to the editor", () => {
  it.each([
    "Enter",
    "Shift+Enter",
    "Tab",
    "Shift+Tab",
    "Alt+Enter",
    "Mod+Alt+Enter",
  ])("leaves %s alone while the focus is in the document", (keys) => {
    const fake = actions({ focused: () => null });

    expect(press(fake, keys), "the key was not the bar's").toBe(false);
    expect(ran(fake)).toEqual([]);
  });

  it("leaves Tab alone while the replace row is collapsed", () => {
    const fake = actions({ moveFocus: () => false });

    expect(press(fake, "Tab")).toBe(false);
  });

  // The replacement is in the row the reader cannot see, so the key that
  // rewrites the file with it is not the bar's — as it is not in Obsidian's.
  it("leaves replace-all alone while the replace row is collapsed", () => {
    const fake = actions({ replacing: () => false, focused: () => "replace" });

    expect(press(fake, "Mod+Alt+Enter")).toBe(false);
    expect(ran(fake)).toEqual([]);
  });

  it("leaves replace-all alone from the find field", () => {
    const fake = actions({ focused: () => "search" });

    expect(press(fake, "Mod+Alt+Enter")).toBe(false);
    expect(ran(fake)).toEqual([]);
  });

  it.each([
    ["F3", "findNext"],
    ["Mod+G", "findNext"],
    ["Shift+F3", "findPrevious"],
    ["Mod+Shift+G", "findPrevious"],
    ["Escape", "close"],
  ])("still answers %s from the document", (keys, action) => {
    const fake = actions({ focused: () => null });

    expect(press(fake, keys)).toBe(true);
    expect(ran(fake)).toEqual([action]);
  });
});

describe("the keys the bar leaves to the input method", () => {
  it.each([
    "F3",
    "Mod+G",
    "Shift+F3",
    "Mod+Shift+G",
    "Enter",
    "Shift+Enter",
    "Escape",
    "Tab",
    "Shift+Tab",
    "Alt+Enter",
    "Mod+Alt+Enter",
  ])("answers no %s while a composition is in progress", (keys) => {
    const fake = actions({ focused: () => "replace" });

    expect(
      press(fake, keys, { isComposing: true }),
      "Enter there commits a candidate, and the key is the IME's",
    ).toBe(false);
    expect(ran(fake)).toEqual([]);
  });
});

/** A keydown as the browser reports it; the tests run without a DOM. */
function keydown(
  key: string,
  held: { mod?: "meta" | "ctrl"; shift?: boolean; alt?: boolean } = {},
): KeyboardEvent {
  return {
    key,
    metaKey: held.mod === "meta",
    ctrlKey: held.mod === "ctrl",
    shiftKey: held.shift ?? false,
    altKey: held.alt ?? false,
  } as KeyboardEvent;
}

const binding = (keys: string): SearchKeyBinding => {
  const found = searchBindings(actions()).find(
    (candidate) => signature(candidate) === keys,
  );
  if (!found) {
    throw new Error(`no binding answers ${keys}`);
  }
  return found;
};

describe("reading a keydown against the table", () => {
  it("takes Mod for Meta on macOS and for Ctrl everywhere else", () => {
    const meta = keydown("g", { mod: "meta" });
    const ctrl = keydown("g", { mod: "ctrl" });

    expect(matchesBinding(meta, binding("Mod+G"), true)).toBe(true);
    expect(matchesBinding(meta, binding("Mod+G"), false)).toBe(false);
    expect(matchesBinding(ctrl, binding("Mod+G"), false)).toBe(true);
    expect(matchesBinding(ctrl, binding("Mod+G"), true)).toBe(false);
  });

  // Mod+G arrives as "g" and Mod+Shift+G as "G": the case is the keyboard's.
  it("reads a letter in whichever case the keyboard reports it", () => {
    expect(
      matchesBinding(keydown("g", { mod: "ctrl" }), binding("Mod+G"), false),
    ).toBe(true);
    expect(
      matchesBinding(
        keydown("G", { mod: "ctrl", shift: true }),
        binding("Mod+Shift+G"),
        false,
      ),
    ).toBe(true);
  });

  it("keeps Shift out of a binding that does not name it", () => {
    expect(matchesBinding(keydown("F3"), binding("F3"), false)).toBe(true);
    expect(
      matchesBinding(keydown("F3", { shift: true }), binding("F3"), false),
      "Shift+F3 is a binding of its own",
    ).toBe(false);
    expect(
      matchesBinding(
        keydown("F3", { shift: true }),
        binding("Shift+F3"),
        false,
      ),
    ).toBe(true);
  });

  it("fails on a modifier the binding never named", () => {
    expect(
      matchesBinding(keydown("F3", { alt: true }), binding("F3"), false),
    ).toBe(false);
    expect(
      matchesBinding(
        keydown("Enter", { alt: true }),
        binding("Alt+Enter"),
        false,
      ),
    ).toBe(true);
    expect(
      matchesBinding(
        keydown("Enter", { mod: "ctrl", alt: true }),
        binding("Alt+Enter"),
        false,
      ),
      "Mod+Alt+Enter is a binding of its own",
    ).toBe(false);
  });

  it("fails on another key entirely", () => {
    expect(matchesBinding(keydown("F4"), binding("F3"), false)).toBe(false);
  });
});

describe("the keys the buttons promise in their tooltips", () => {
  it("names a binding the table carries, for every button", () => {
    const signatures = searchBindings(actions()).map(signature);

    for (const caption of Object.values(SEARCH_KEY_CAPTIONS)) {
      expect(signatures).toContain(signature(caption));
    }
  });

  it.each(Object.entries(SEARCH_KEY_CAPTIONS))(
    "runs %s when the key its tooltip names is pressed",
    (action, caption) => {
      const fake = actions({ focused: () => "replace" });

      expect(press(fake, signature(caption))).toBe(true);
      expect(ran(fake)).toEqual([action]);
    },
  );
});

describe("spelling a key the way Obsidian spells one", () => {
  // Read out of obsidian-1.13.7: the symbols, the order and the separator are
  // its own, and "Mod" — a token of the API — reaches no reader.
  it("writes the glyph on the key on macOS, joined by a space", () => {
    expect(spellKey(SEARCH_KEY_CAPTIONS.replaceAll, true)).toBe("⌘ ⌥ Enter");
    expect(spellKey(SEARCH_KEY_CAPTIONS.findPrevious, true)).toBe("⇧ F3");
    expect(spellKey(SEARCH_KEY_CAPTIONS.selectAll, true)).toBe("⌥ Enter");
  });

  it("writes the name of the key elsewhere, joined by a plus", () => {
    expect(spellKey(SEARCH_KEY_CAPTIONS.replaceAll, false)).toBe(
      "Ctrl + Alt + Enter",
    );
    expect(spellKey(SEARCH_KEY_CAPTIONS.findPrevious, false)).toBe(
      "Shift + F3",
    );
    expect(spellKey(SEARCH_KEY_CAPTIONS.selectAll, false)).toBe("Alt + Enter");
  });

  it("spells a key with no modifier as itself", () => {
    expect(spellKey(SEARCH_KEY_CAPTIONS.findNext, true)).toBe("F3");
    expect(spellKey(SEARCH_KEY_CAPTIONS.replaceNext, false)).toBe("Enter");
  });

  it("spells the modifiers in Obsidian's order, not the order they were named", () => {
    expect(
      spellKey({ modifiers: ["Shift", "Mod", "Alt"], key: "K" }, false),
    ).toBe("Ctrl + Alt + Shift + K");
  });

  it("names no key that the table does not carry", () => {
    const signatures = searchBindings(actions()).map(signature);

    for (const caption of Object.values(SEARCH_KEY_CAPTIONS)) {
      expect(signatures, spellKey(caption, false)).toContain(
        signature(caption),
      );
    }
  });
});
