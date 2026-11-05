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

  test("take the colours, opacity and hover of Obsidian's own header actions, the mode shown as an on/off action does", async ({ page }) => {
    const look = (selector: string) =>
      page.locator(selector).evaluate((button) => {
        const style = getComputedStyle(button);
        const icon = getComputedStyle(button.querySelector("svg") as Element);
        return { background: style.backgroundColor, color: style.color, radius: style.borderTopLeftRadius, opacity: icon.opacity };
      });

    const active = await look("#show-list");
    const idle = await look("#show-graph");
    expect(idle).toEqual({ background: "rgba(0, 0, 0, 0)", color: "rgb(110, 110, 110)", radius: "4px", opacity: "0.85" });
    expect(active).toEqual({ background: "rgba(0, 0, 0, 0)", color: "rgb(0, 0, 180)", radius: "4px", opacity: "0.85" });

    await page.locator("#show-graph").hover();
    expect(await look("#show-graph")).toEqual({ background: "rgba(0, 0, 0, 0.075)", color: "rgb(110, 110, 110)", radius: "4px", opacity: "1" });
    await page.locator("#show-list").hover();
    expect((await look("#show-list")).color).toBe("rgb(0, 0, 180)");
  });

  test("do not rely on one class for the mode shown", async ({ page }) => {
    await page.evaluate(() => {
      const button = document.getElementById("show-graph");
      button?.classList.remove("gedcom-mode-active");
      button?.setAttribute("aria-pressed", "true");
    });

    expect(await page.locator("#show-graph").evaluate((button) => getComputedStyle(button).color)).toBe("rgb(0, 0, 180)");
  });

  test("keep the active mark as the mode changes", async ({ page }) => {
    await page.click("#show-graph");

    await expect(page.locator("#show-graph")).toHaveClass(/gedcom-mode-active/);
    await expect(page.locator("#show-list")).not.toHaveClass(/gedcom-mode-active/);
  });
});
