import { expect, test, type Page } from "@playwright/test";

import { mount, SAMPLE, type MountOptions } from "./harness";

async function openSearch(
  page: Page,
  options: MountOptions = {},
): Promise<void> {
  await mount(page, { doc: SAMPLE, ...options });
  await page.evaluate(() => {
    window.gedcom.openSearch();
  });
  await page.waitForSelector(".document-search-container");
}

const input = ".document-search-input input";
const count = ".document-search-count";

test.describe("the search bar", () => {
  test("wears Obsidian's own chrome rather than the library's", async ({
    page,
  }) => {
    await openSearch(page);

    await expect(page.locator(".search-input-container")).toHaveCount(1);
    await expect(
      page.locator(".cm-textfield, .cm-button"),
      "nothing of the library's own panel is left",
    ).toHaveCount(0);

    const buttons = page.locator(".clickable-icon");
    expect(await buttons.count(), "every control is an Obsidian icon").toBe(
      await page.locator(".clickable-icon > svg").count(),
    );
    for (const label of [
      "Previous",
      "Next",
      "Select all matches",
      "Match case",
      "Whole word",
      "Regular expression",
      "Exit search",
    ]) {
      await expect(page.locator(`[aria-label="${label}"]`)).toHaveCount(1);
    }
  });

  test("takes the focus when it opens, which is what a panel is for", async ({
    page,
  }) => {
    await openSearch(page);

    await expect(page.locator(input)).toBeFocused();
  });

  test("counts the matches, and says which one the cursor is on", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "NAME");
    await expect(page.locator(count)).toHaveText("1");

    await page.click('[aria-label="Next"]');
    await expect(page.locator(count)).toHaveText("1/1");
  });

  test("says nothing about a query it cannot run, and marks the field", async ({
    page,
  }) => {
    await openSearch(page);
    await page.click('[aria-label="Regular expression"]');
    await page.fill(input, "@I[");

    await expect(page.locator(count)).toHaveText("");
    await expect(page.locator(".document-search-input")).toHaveClass(
      /mod-no-match/,
    );
  });

  test("shows a flag it is honouring as active", async ({ page }) => {
    await openSearch(page);
    const matchCase = page.locator('[aria-label="Match case"]');

    await expect(matchCase).not.toHaveClass(/is-active/);
    await matchCase.click();
    await expect(matchCase).toHaveClass(/is-active/);

    await page.fill(input, "name");
    await expect(page.locator(count)).toHaveText("");
  });

  test("keeps replace out of the way until it is asked for", async ({
    page,
  }) => {
    await openSearch(page);
    const replaceRow = page.locator(".document-replace");

    await expect(replaceRow).toBeHidden();
    await page.click('.document-search > [aria-label="Replace"]');
    await expect(replaceRow).toBeVisible();
    await expect(page.locator(".document-replace-input")).toBeFocused();
  });

  test("replaces through the panel, in the document", async ({ page }) => {
    await openSearch(page);
    await page.fill(input, "John");
    await page.click('.document-search > [aria-label="Replace"]');
    await page.fill(".document-replace-input", "Jane");
    await page.click('.document-replace-buttons [aria-label="Replace all"]');

    expect(
      await page.evaluate(() => window.gedcom.view?.state.sliceDoc()),
    ).toContain("1 NAME Jane /Smith/");
  });

  test("finds the next match on Enter and the previous on Shift-Enter", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "@F1@");
    await page.press(input, "Enter");
    await expect(page.locator(count)).toHaveText("1/2");

    await page.press(input, "Enter");
    await expect(page.locator(count)).toHaveText("2/2");

    await page.press(input, "Shift+Enter");
    await expect(page.locator(count)).toHaveText("1/2");
  });

  test("sits over the document rather than in the middle of the pane", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 400 });
    await openSearch(page);

    const box = await page.evaluate(() => {
      const at = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        field: at(".document-search-input").left,
        line: at(".cm-line").left,
        content: at(".cm-content").width,
      };
    });

    expect(box.field, "the bar keeps to the left of a wide pane").toBeLessThan(
      120,
    );
    expect(
      box.content,
      "and the document keeps the pane, unlike a note",
    ).toBeGreaterThan(1200);
    expect(
      Math.abs(box.field - box.line),
      "so the field starts about where the lines do",
    ).toBeLessThan(40);
  });

  // #86: the field arrived at a sixth of the row, with the count over the text.
  test("leaves the field usable at the width of a phone", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openSearch(page, { mobile: true });

    const row = await page.evaluate(() => {
      const at = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        whole: at(".document-search").width,
        field: at(".document-search-input").width,
      };
    });

    expect(
      row.field,
      "the field keeps at least half the row it shares with the buttons",
    ).toBeGreaterThan(row.whole / 2);
  });

  // #87: the panel took the spacing Obsidian reserves for its floating header,
  // which the view it sits in has already been given.
  test("does not push itself below the room made for the header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openSearch(page, { mobile: true });

    const padding = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.querySelector(".document-search-container")!)
          .paddingTop,
      ),
    );

    expect(
      padding,
      "a phone's header is not our panel's to clear",
    ).toBeLessThan(24);
  });

  test("closes on Escape and on the button", async ({ page }) => {
    await openSearch(page);
    await page.press(input, "Escape");
    await expect(page.locator(".document-search-container")).toHaveCount(0);

    await page.evaluate(() => {
      window.gedcom.openSearch();
    });
    await page.click('[aria-label="Exit search"]');
    await expect(page.locator(".document-search-container")).toHaveCount(0);
  });
});
