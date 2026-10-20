import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { DeskOptions } from "../harness/desk";

async function mountDesk(page: Page, options: DeskOptions = {}): Promise<void> {
  await page.goto(pathToFileURL(resolve("harness/desk.html")).href);
  await page.evaluate((deskOptions) => {
    window.desk.mount(deskOptions);
  }, options);
  await page.waitForSelector(".gedcom-desk-page");
}

function overflowsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const desk = document.querySelector<HTMLElement>(".gedcom-desk");
    return desk ? desk.scrollWidth > desk.clientWidth : true;
  });
}

const factNamed = (page: Page, name: string) =>
  page.locator(".gedcom-desk-fact", { has: page.locator(".gedcom-desk-fact-name", { hasText: name }) });

test.describe("the person page", () => {
  test("shows Marie's facts and family at desktop width", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);

    await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
    await expect(page.locator(".gedcom-desk-fact")).toHaveCount(4);
    await expect(page.locator(".gedcom-desk-kin-label")).toHaveText([
      "Parents", "Siblings", "Husband", "Children",
    ]);
    expect(await overflowsSideways(page)).toBe(false);
  });

  test("fits a phone's width without scrolling sideways", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mountDesk(page, { phone: true });

    expect(await overflowsSideways(page)).toBe(false);
    const name = await page.locator(".gedcom-desk-fact-name").first().boundingBox();
    const value = await page.locator(".gedcom-desk-fact-value").first().boundingBox();
    expect(value?.y ?? 0, "the value drops below the name").toBeGreaterThan(name?.y ?? 0);
  });

  test("unfolds a tapped fact on a phone, with the way to all evidence", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await mountDesk(page, { phone: true });
    await factNamed(page, "Birth").click();

    await expect(page.locator(".gedcom-desk-unfold-none")).toHaveText("No source of its own");
    await page.locator(".gedcom-desk-unfold .gedcom-desk-link", { hasText: "All evidence" }).click();
    expect(await page.evaluate(() => window.desk.calls.evidenceOpened)).toBe(1);
  });

  test("moves to a relative's page", async ({ page }) => {
    await mountDesk(page);
    await page.locator(".gedcom-desk-person", { hasText: "Pierre Curie" }).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie");
  });
});

test.describe("the evidence panel", () => {
  test("follows the selected fact, and goes back to the whole record", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    const context = page.locator(".gedcom-desk-evidence-context div").first();
    await expect(context).toHaveText("Whole record");

    await factNamed(page, "Birth").click();
    await expect(context).toHaveText("Birth");
    await expect(page.locator(".gedcom-desk-notice-title")).toHaveText("No source of its own");

    await page.locator("#evidence-pane .gedcom-desk-link", { hasText: "Whole record" }).click();
    await expect(context).toHaveText("Whole record");
    await expect(page.locator(".gedcom-desk-fact.is-selected")).toHaveCount(0);
  });

  test("opens a source's page from a citation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-cite", { hasText: "Physics 1903" }).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText("The Nobel Prize in Physics 1903");
    await expect(page.locator(".gedcom-desk-citer .gedcom-desk-person-name")).toHaveText([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
  });
});

test.describe("the index of a large file", () => {
  const people = 20_000;
  const big = (() => {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let at = 1; at <= people; at += 1) {
      lines.push(`0 @I${at}@ INDI`, `1 NAME Person${at} /Family${at % 97}/`, "1 BIRT", `2 DATE ${1700 + (at % 300)}`);
    }
    lines.push("0 TRLR", "");
    return lines.join("\n");
  })();

  test("scrolls through twenty thousand people drawing only a window of them", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page, { doc: big });
    const list = page.locator(".gedcom-desk-index-list");

    expect(await page.locator(".gedcom-desk-row").count()).toBeLessThan(100);
    await list.evaluate((node) => {
      node.scrollTop = 44 * 10_000;
    });
    await expect(page.locator(".gedcom-desk-row-name", { hasText: /^Person10001 / })).toBeVisible();
    expect(await page.locator(".gedcom-desk-row").count()).toBeLessThan(100);
  });

  test("answers each keystroke in the search field promptly", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page, { doc: big });
    const field = page.locator(".gedcom-desk-search");

    const elapsed = await field.evaluate(async (input: HTMLInputElement) => {
      const started = performance.now();
      for (const query of ["P", "Pe", "Per", "Pers", "Person1234"]) {
        input.value = query;
        input.dispatchEvent(new Event("input"));
      }
      await new Promise((settled) => requestAnimationFrame(settled));
      return performance.now() - started;
    });
    expect(elapsed / 5, "milliseconds a keystroke").toBeLessThan(100);
    await expect(page.locator(".gedcom-desk-row-name").first()).toHaveText(/^Person1234 /);
  });
});
