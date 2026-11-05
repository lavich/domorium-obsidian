// @vitest-environment happy-dom
import { afterEach, beforeAll, describe, expect, it } from "vitest";

import { resetLanguage } from "../i18n";
import { installObsidianDom } from "../testing/obsidianDom";
import { FloatingSearch, type FloatingSearchOptions } from "./floatingSearch";

beforeAll(installObsidianDom);
afterEach(resetLanguage);

function made(extra: Partial<FloatingSearchOptions> = {}, info = { index: -1, total: 3 }): FloatingSearch {
  document.body.replaceChildren();
  return new FloatingSearch(document.body, {
    prefix: "t",
    change: () => undefined,
    step: () => undefined,
    info: () => info,
    ...extra,
  });
}

const typed = (find: FloatingSearch, text: string): void => {
  const input = find.el.querySelector("input");
  if (input) {
    input.value = text;
    input.dispatchEvent(new Event("input"));
  }
};

describe("the floating search", () => {
  it("speaks of people unless it is told otherwise", () => {
    const find = made();
    typed(find, "x");

    expect(find.el.querySelector("button")?.getAttribute("aria-label")).toBe("Find a person…");
    expect(find.el.querySelector("input")?.placeholder).toBe("Find a person…");
    expect(find.el.querySelector(".t-find-count")?.textContent).toBe("3 matches");
  });

  it("takes the words it is given for its label, placeholder and counter", () => {
    const words = {
      label: "Find a place…",
      none: "Nothing",
      matches: (count: number) => `${count} places`,
      matchOf: (current: number, total: number) => `${current} of ${total}`,
    };
    const find = made({ words }, { index: 1, total: 4 });
    typed(find, "x");

    expect(find.el.querySelector("button")?.getAttribute("aria-label")).toBe("Find a place…");
    expect(find.el.querySelector("input")?.placeholder).toBe("Find a place…");
    expect(find.el.querySelector(".t-find-count")?.textContent).toBe("2 of 4");
    expect(made({ words }, { index: -1, total: 0 }).el.querySelector(".t-find-count")?.textContent).toBe("");
  });
});
