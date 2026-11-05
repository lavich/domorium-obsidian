// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";

import { isDarkTheme } from "./darkTheme";

afterEach(() => document.body.classList.remove("theme-dark"));

describe("the theme the app is in", () => {
  it("is dark when the body carries theme-dark", () => {
    document.body.classList.add("theme-dark");
    expect(isDarkTheme(document.createElement("div"))).toBe(true);
  });

  it("is light otherwise", () => {
    expect(isDarkTheme(document.createElement("div"))).toBe(false);
  });
});
