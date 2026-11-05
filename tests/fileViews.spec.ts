import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { TabOptions } from "../harness/fileViews";

async function mountTab(page: Page, options: TabOptions = {}): Promise<void> {
  await page.goto(pathToFileURL(resolve("harness/fileViews.html")).href);
  await page.evaluate((tabOptions) => window.tab.mount(tabOptions), options);
}

const person = (page: Page, xref: string) => page.locator(`.gedcom-fg-person[data-p="${xref}"]`);
const transform = (page: Page) =>
  page.locator(".gedcom-fg-view").evaluate((element) => (element as unknown as SVGElement).style.transform);
const selectedCards = (page: Page) =>
  page.locator(".gedcom-fg-person.is-selected").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-p")));

async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox();
  return { x: (box?.x ?? NaN) + (box?.width ?? 0) / 2, y: (box?.y ?? NaN) + (box?.height ?? 0) / 2 };
}

async function expectCentred(page: Page, xref: string): Promise<void> {
  await expect
    .poll(async () => {
      const card = await centreOf(page, `.gedcom-fg-person[data-p="${xref}"] .gedcom-fg-card-bg`);
      const canvas = await centreOf(page, ".gedcom-fg-canvas");
      return Math.max(Math.abs(card.x - canvas.x), Math.abs(card.y - canvas.y));
    })
    .toBeLessThan(2);
}

for (const viewport of [
  { width: 1400, height: 700 },
  { width: 390, height: 700 },
]) {
  test.describe(`the views of a tab at ${viewport.width} px`, () => {
    test.use({ viewport });

    test.beforeEach(async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" });
    });

    test("fills the view with the graph and draws its cards, after the graph was hidden", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      await page.click("#show-source");
      await expect(page.locator(".gedcom-views-root.is-graph")).toBeHidden();
      await page.click("#show-graph");

      await expect(page.locator(".gedcom-fg-person")).toHaveCount(17);
      const views = await page.locator("#views").boundingBox();
      const canvas = await page.locator(".gedcom-fg-canvas").boundingBox();
      expect(canvas?.width).toBeCloseTo(views?.width ?? NaN, 0);
      expect(canvas?.height ?? 0).toBeGreaterThan((views?.height ?? 0) - 80);
    });

    test("draws the graph of a tab that began behind another one, once it is shown and the resize is delivered", async ({
      page,
    }) => {
      await mountTab(page, { mode: "graph", hidden: true });
      await expect(page.locator(".gedcom-fg-person")).toHaveCount(0);

      await page.evaluate(() => {
        window.tab.setHidden(false);
        window.tab.resized();
      });

      await expect(page.locator(".gedcom-fg-person")).toHaveCount(17);
      const canvas = await page.locator(".gedcom-fg-canvas").boundingBox();
      expect(canvas?.width ?? 0).toBeGreaterThan(300);
    });

    test("keeps the graph's position and zoom through the timeline and back, and through a resize to nothing", async ({
      page,
    }) => {
      await mountTab(page, { mode: "graph" });
      await page.locator(".gedcom-fg-zoom-in").click();
      await page.locator(".gedcom-fg-zoom-in").click();
      const before = await transform(page);

      await page.click("#show-timeline");
      await page.click("#show-graph");
      expect(await transform(page)).toBe(before);

      await page.evaluate(() => {
        window.tab.setHidden(true);
        window.tab.views?.resized();
        window.tab.setHidden(false);
        window.tab.resized();
      });
      expect(await transform(page)).toBe(before);
    });

    test("keeps the timeline's scroll through the source and back, its names and years in line with the rows", async ({
      page,
    }) => {
      await mountTab(page, { mode: "timeline", memory: { timeline: { up: 2, down: 2, zoom: 16 } } });
      const plot = page.locator(".gedcom-ft-plot");
      await plot.evaluate((element) => {
        element.scrollTop = 120;
        element.scrollLeft = 300;
      });
      const scrolled = await plot.evaluate((element) => [element.scrollTop, element.scrollLeft]);
      expect(scrolled[1]).toBeGreaterThan(0);

      await page.click("#show-source");
      await page.click("#show-timeline");

      await expect.poll(() => plot.evaluate((element) => [element.scrollTop, element.scrollLeft])).toEqual(scrolled);
      await expect
        .poll(() => page.locator(".gedcom-ft-names").evaluate((element) => element.scrollTop))
        .toBe(scrolled[0]);
      await expect
        .poll(() => page.locator(".gedcom-ft-axis-clip").evaluate((element) => element.scrollLeft))
        .toBe(scrolled[1]);
    });

    test("asks the tab to select the person of a card, and the family of a node, and moves nothing", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      const before = await transform(page);
      await page.locator('[data-card="@I12@"]').dispatchEvent("click", { detail: 1 });
      await page.locator('[data-node="@F3@"]').dispatchEvent("click", { detail: 1 });

      expect(await page.evaluate(() => window.tab.calls.selected)).toEqual(["@I12@", "@F3@"]);
      expect(await transform(page)).toBe(before);
    });

    test("marks a card selected without a reveal and leaves the view where it was, and glides with one", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      const before = await transform(page);
      await page.evaluate(() => {
        window.tab.select("@I2@", false);
      });
      expect(await selectedCards(page)).toEqual(["@I2@"]);
      expect(await transform(page)).toBe(before);

      await page.evaluate(() => {
        window.tab.select("@I12@", true);
      });
      await expectCentred(page, "@I12@");
    });

    test("keeps a reveal asked for while the tab was in Source through a later hand-over without one", async ({ page }) => {
      await mountTab(page, { mode: "source" });
      await page.evaluate(() => {
        window.tab.select("@I12@", true);
        window.tab.select("@I12@", false);
      });
      await page.click("#show-graph");

      expect(await selectedCards(page)).toEqual(["@I12@"]);
      await expectCentred(page, "@I12@");
    });

    test("marks Pierre's card and centres on it, also when he was chosen while the view was hidden", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      await page.click("#select-pierre");
      expect(await selectedCards(page)).toEqual(["@I2@"]);
      await expectCentred(page, "@I2@");

      await page.click("#select-irene");
      expect(await selectedCards(page)).toEqual(["@I12@"]);
      await expectCentred(page, "@I12@");

      await page.evaluate(() => {
        window.tab.setHidden(true);
        window.tab.select("@I2@", true);
        window.tab.setHidden(false);
        window.tab.resized();
      });
      await expect.poll(() => selectedCards(page)).toEqual(["@I2@"]);
      await expectCentred(page, "@I2@");
    });

    test("keeps the selection across the views, and leaves no mark of an earlier one behind", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      await page.click("#select-pierre");
      await page.click("#show-timeline");
      await expect(page.locator(".gedcom-ft-name.is-selected")).toHaveCount(1);
      await expect(page.locator(".gedcom-ft-name.is-selected")).toHaveAttribute("data-p", "@I2@");
      await page.click("#select-irene");
      await expect(page.locator(".gedcom-ft-name.is-selected")).toHaveAttribute("data-p", "@I12@");
      await page.click("#show-graph");

      expect(await selectedCards(page)).toEqual(["@I12@"]);
      await page.evaluate(() => {
        window.tab.select(null, false);
      });
      await expect(page.locator(".is-selected, .gedcom-ft-row-selected")).toHaveCount(0);
      await page.click("#show-timeline");
      await expect(page.locator(".is-selected, .gedcom-ft-row-selected")).toHaveCount(0);
    });

    test("opens the search expanded and focused from outside", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      await expect(page.locator(".gedcom-fg-find")).not.toHaveClass(/is-open/);
      await page.click("#open-search");

      await expect(page.locator(".gedcom-fg-find")).toHaveClass(/is-open/);
      await expect(page.locator(".gedcom-fg-search")).toBeFocused();
    });

    test("restores a graph at the view that was saved", async ({ page }) => {
      await mountTab(page, { mode: "graph", memory: { graph: { up: 2, down: 2, view: { x: 500, y: 200, k: 0.8 } } } });
      await expect(person(page, "@I1@")).toHaveCount(1);

      const [width, height] = await page
        .locator(".gedcom-fg-canvas")
        .evaluate((element) => [element.clientWidth, element.clientHeight]);
      expect(await transform(page)).toBe(`translate(${width / 2 - 500 * 0.8}px, ${height / 2 - 200 * 0.8}px) scale(0.8)`);
    });

    test("shows the root of one view only", async ({ page }) => {
      await mountTab(page, { mode: "graph" });
      await expect(page.locator(".gedcom-views-root.is-timeline")).toHaveCount(0);
      await expect(page.locator("#source")).toBeHidden();

      await page.click("#show-timeline");
      await expect(page.locator(".gedcom-views-root.is-graph")).toBeHidden();
      await expect(page.locator(".gedcom-views-root.is-timeline")).toBeVisible();
      await page.click("#show-source");
      await expect(page.locator(".gedcom-views-root")).toHaveCount(2);
      await expect(page.locator(".gedcom-views-root.is-timeline")).toBeHidden();
      await expect(page.locator("#source")).toBeVisible();
    });

    test("keeps both marks where the selected person is also the search's current match, and fades a selected non-match", async ({
      page,
    }) => {
      await mountTab(page, { mode: "graph" });
      const colours = await page.evaluate(() => {
        const probe = (name: string): string => {
          const holder = document.createElement("i");
          holder.style.color = `var(${name})`;
          document.getElementById("views")?.append(holder);
          const colour = getComputedStyle(holder).color;
          holder.remove();
          return colour;
        };
        return { text: probe("--text-normal"), accent: probe("--interactive-accent") };
      });
      await page.click("#select-pierre");
      await page.click("#open-search");
      await page.locator(".gedcom-fg-search").fill("pierre");
      await page.locator(".gedcom-fg-search").press("Enter");
      const bg = page.locator('.gedcom-fg-person[data-p="@I2@"] .gedcom-fg-card-bg');
      await expect(page.locator('.gedcom-fg-person[data-p="@I2@"]')).toHaveClass(/is-current/);
      const card = await bg.evaluate((element) => {
        const style = getComputedStyle(element);
        return { stroke: style.stroke, outline: style.outlineColor, width: style.outlineWidth };
      });
      expect(card.stroke).toBe(colours.text);
      expect(card.outline).toBe(colours.accent);
      expect(card.width).not.toBe("0px");

      await page.click("#show-timeline");
      await page.click("#select-pierre");
      await page.click("#open-search");
      await page.locator(".gedcom-ft-search").fill("pierre");
      await page.locator(".gedcom-ft-search").press("Enter");
      const life = page.locator('.gedcom-ft-life[data-p="@I2@"]');
      await expect(life).toHaveClass(/is-current/);
      const line = await life.evaluate((element) => {
        const style = getComputedStyle(element);
        return { stroke: style.stroke, outline: style.outlineColor };
      });
      expect(line).toEqual({ stroke: colours.text, outline: colours.accent });
      const row = await page
        .locator('.gedcom-ft-name[data-p="@I2@"]')
        .evaluate((element) => getComputedStyle(element).boxShadow);
      expect(row).toContain(colours.text);
      expect(row).toContain(colours.accent);

      await page.locator(".gedcom-ft-search").fill("joliot");
      const opacity = (xref: string) =>
        page
          .locator(`.gedcom-ft-life[data-p="${xref}"]`)
          .first()
          .evaluate((element) => Number(getComputedStyle(element).opacity));
      await expect(page.locator('.gedcom-ft-life.is-selected[data-p="@I2@"]')).toHaveClass(/is-dim/);
      expect(await opacity("@I2@")).toBeLessThan(0.3);
      expect(await opacity("@I2@")).toBe(await opacity("@I1@"));
    });
  });
}
