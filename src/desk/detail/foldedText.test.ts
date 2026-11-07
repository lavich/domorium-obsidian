// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../../testing/obsidianDom";
import { isLong, renderFoldedText, SHOWN } from "./foldedText";

beforeAll(installObsidianDom);

let box: HTMLElement;
beforeEach(() => {
  box = document.createElement("div");
  document.body.replaceChildren(box);
});

const lines = (count: number): string => Array.from({ length: count }, (_, at) => `line ${at + 1}`).join("\n");
const draw = (text: string, open = false) => {
  const toggled = vi.fn<(open: boolean) => void>();
  renderFoldedText(box, text, { key: "note:2", open, toggled });
  return { toggled, button: box.querySelector<HTMLButtonElement>("button"), body: box.querySelector(".gedcom-detail-text-body") };
};

describe("a text folded where it is long", () => {
  it("shows a short text in full, with no button", () => {
    const { button, body } = draw(lines(SHOWN.lines));

    expect(button).toBeNull();
    expect(body?.textContent).toBe(lines(SHOWN.lines));
    expect(isLong(lines(SHOWN.lines))).toBe(false);
  });

  it("shows the first five lines of a longer one, and a button that shows the other seven and folds them again", () => {
    const { button, body, toggled } = draw(lines(12));

    expect(body?.textContent).toBe(lines(5));
    expect(button?.textContent).toBe("Show more");
    button?.click();
    expect(body?.textContent).toBe(lines(12));
    expect(button?.textContent).toBe("Show less");
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(toggled).toHaveBeenLastCalledWith(true);
    button?.click();
    expect(body?.textContent).toBe(lines(5));
    expect(toggled).toHaveBeenLastCalledWith(false);
  });

  it("cuts a text of few lines but many characters at three hundred, with an ellipsis", () => {
    const text = "x".repeat(SHOWN.characters + 50);
    const { body } = draw(text);

    expect(isLong(text)).toBe(true);
    expect(body?.textContent).toBe(`${"x".repeat(SHOWN.characters)}…`);
  });

  it("comes back open as the reader left it, and names its button for the redraw to find", () => {
    const { button, body } = draw(lines(12), true);

    expect(body?.textContent).toBe(lines(12));
    expect(button?.getAttribute("data-focus-key")).toBe("note:2");
  });
});
