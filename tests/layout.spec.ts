import { expect, test } from "@playwright/test";

import { mount, MANY_PROBLEMS, PROBLEMS, SAMPLE } from "./harness";

test.describe("the editor in its pane", () => {
  // #87: the editor came out 113px of a 433px view, so the document ended four
  // lines in and the rest was blank.
  test("keeps its height when the keyboard takes the bottom inset", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await mount(page, { doc: SAMPLE, mobile: true, keyboard: 308 });

    const height = await page.evaluate(() => {
      const of = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect().height;
      return { view: of(".view-content"), editor: of(".cm-editor") };
    });

    expect(
      height.editor,
      "Obsidian pads the view by the inset, and iOS puts the keyboard in it",
    ).toBeGreaterThan(height.view * 0.9);
  });

  // The navbar floats over the view, and a panel pinned to the bottom of the
  // editor is the one thing that cannot be scrolled out from under it.
  test("keeps the problems panel clear of the floating navbar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await mount(page, { doc: PROBLEMS, mobile: true });
    await page.evaluate(() => {
      window.gedcom.openProblems();
    });
    await page.waitForSelector(".cm-panel-lint");

    const box = await page.evaluate(() => {
      const of = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        panel: of(".cm-panel-lint").bottom,
        navbar: of(".mobile-navbar").top,
      };
    });

    expect(
      box.panel,
      "the last problem has to be readable, and it cannot be scrolled",
    ).toBeLessThanOrEqual(box.navbar);
  });

  // One wrapped problem fills CodeMirror's 100px on a phone, so the rest were
  // behind a scroll nobody would look for.
  test("holds a handful of problems without hiding any", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await mount(page, { doc: MANY_PROBLEMS, mobile: true });
    await page.evaluate(() => {
      window.gedcom.openProblems();
    });
    await expect(page.locator(".cm-panel-lint li")).toHaveCount(5);

    const list = await page.evaluate(() => {
      const element = document.querySelector(".cm-panel-lint ul")!;
      return { shown: element.clientHeight, all: element.scrollHeight };
    });

    expect(list.shown, "all five, not one and a scrollbar").toBe(list.all);
  });

  // A keyboard shrinks the area the view has and pushes the navbar down out of
  // it, so there is nothing of the navbar left to clear.
  test("reserves nothing for the navbar while the keyboard is up", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await mount(page, { doc: PROBLEMS, mobile: true, keyboard: 308 });
    await page.evaluate(() => {
      window.gedcom.openProblems();
    });
    await page.waitForSelector(".cm-panel-lint");

    const bottom = await page.evaluate(() => {
      const of = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect().bottom;
      return { panel: of(".cm-panel-lint"), editor: of(".cm-editor") };
    });

    expect(
      bottom.editor - bottom.panel,
      "a gap here is the blank strip above the keyboard, again",
    ).toBeLessThan(8);
  });
});
