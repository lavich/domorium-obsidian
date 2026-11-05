import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

test.describe("the mode buttons of the tab header", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(pathToFileURL(resolve("harness/fileViews.html")).href);
    await page.evaluate(() => window.tab.mount({ mode: "list" }));
  });

  test("are spaced from one another and from nothing else", async ({ page }) => {
    const gaps = await page.locator(".gedcom-mode-action").evaluateAll((buttons) =>
      buttons.map((button, at) => {
        const before = buttons[at - 1];
        return before ? button.getBoundingClientRect().left - before.getBoundingClientRect().right : null;
      }),
    );

    expect(gaps[0]).toBeNull();
    for (const gap of gaps.slice(1)) {
      expect(gap ?? 0).toBeGreaterThan(1);
    }
    const first = await page.locator(".gedcom-mode-action").first().evaluate((button) => getComputedStyle(button).marginInlineStart);
    expect(first).toBe("0px");
  });

  test("take Obsidian's own active treatment, hover and radius, and no colour of ours", async ({ page }) => {
    const look = (selector: string) =>
      page.locator(selector).evaluate((button) => {
        const style = getComputedStyle(button);
        return { background: style.backgroundColor, color: style.color, radius: style.borderTopLeftRadius };
      });

    const active = await look("#show-list");
    const idle = await look("#show-graph");
    expect(active.background).not.toBe(idle.background);
    expect(active.background).toBe("rgba(112, 93, 207, 0.15)");
    expect(idle.background).toBe("rgba(0, 0, 0, 0)");
    expect(active.color).toBe(idle.color);
    expect(active.radius).toBe("4px");
    expect(idle.radius).toBe("4px");

    await page.locator("#show-graph").hover();
    expect((await look("#show-graph")).background).toBe("rgba(0, 0, 0, 0.075)");
  });

  test("keep the active mark as the mode changes", async ({ page }) => {
    await page.click("#show-graph");

    await expect(page.locator("#show-graph")).toHaveClass(/is-active/);
    await expect(page.locator("#show-list")).not.toHaveClass(/is-active/);
  });
});
