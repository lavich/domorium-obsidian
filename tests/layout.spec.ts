import { expect, test } from "@playwright/test";

import { mount, PROBLEMS, SAMPLE } from "./harness";

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

  // The room was counted twice: once after the last line, once under the panel
  // that stands below it.
  test("counts the room for the navbar once", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await mount(page, { doc: PROBLEMS, mobile: true });

    const alone = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".cm-scroller")!).paddingBottom,
    );

    await page.evaluate(() => {
      window.gedcom.openProblems();
    });
    await page.waitForSelector(".cm-panel-lint");

    const withPanel = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".cm-scroller")!).paddingBottom,
    );

    expect(
      parseFloat(alone),
      "the last line clears the navbar itself",
    ).toBeGreaterThan(50);
    expect(
      withPanel,
      "and hands the job over when a panel takes the bottom",
    ).toBe("0px");
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
