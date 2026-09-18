import { afterEach, describe, expect, it } from "vitest";

import { resetLanguage, setLanguage } from "../i18n";
import { buttonLabel } from "./searchPanel";

afterEach(resetLanguage);

describe("what a search bar button says on hover", () => {
  it("writes the label, then the key on a line of its own", () => {
    expect(buttonLabel("findNext", false)).toBe("Next\nF3");
    expect(buttonLabel("replaceAll", true)).toBe("Replace all\n⌘ ⌥ Enter");
  });

  it("translates the label and leaves the key as Obsidian spells it", () => {
    setLanguage("ru");
    expect(buttonLabel("findNext", false)).toBe("Следующее\nF3");
    expect(buttonLabel("replaceAll", false)).toBe(
      "Заменить все\nCtrl + Alt + Enter",
    );
  });
});
