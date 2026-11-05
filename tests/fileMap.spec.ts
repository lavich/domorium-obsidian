import { Buffer } from "node:buffer";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { TabOptions } from "../harness/fileViews";
import { placesFile } from "./generated";

const SCEAUX = "| Place | Latitude | Longitude |\n| --- | --- | --- |\n| Sceaux, France | 48.7766 | 2.2917 |";
const PLAIN = ["0 HEAD", "0 @I1@ INDI", "1 NAME Marie /Curie/", "1 BIRT", "2 PLAC Warsaw, Congress Poland", "0 TRLR", ""].join("\n");
const TILES = "https://tiles.example/{z}/{x}/{y}.png";

async function mountMap(page: Page, options: TabOptions = {}): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(pathToFileURL(resolve("harness/fileViews.html")).href);
  await page.evaluate((tabOptions) => window.tab.mount({ mode: "map", fixture: "map", ...tabOptions }), options);
  await expect(page.locator(".gedcom-map-plot")).toBeVisible();
}

const marks = (page: Page) => page.locator(".gedcom-map-mark");
const mark = (page: Page, key: string) => page.locator(`.gedcom-map-mark[data-key="${key}"]`);
const keysOf = (page: Page) => marks(page).evaluateAll((all) => all.map((one) => one.getAttribute("data-key")));
const text = (page: Page, selector: string) => page.locator(selector).first().innerText();
const selected = (page: Page) => page.evaluate(() => window.tab.calls.selected);

async function centre(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).first().boundingBox();
  return { x: (box?.x ?? NaN) + (box?.width ?? 0) / 2, y: (box?.y ?? NaN) + (box?.height ?? 0) / 2 };
}

async function sideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const views = document.getElementById("views");
    const row = document.querySelector<HTMLElement>(".gedcom-map-scope-row");
    return (
      (views?.scrollWidth ?? 0) > (views?.clientWidth ?? 0) ||
      (row?.scrollWidth ?? 0) > (row?.clientWidth ?? 0)
    );
  });
}

for (const viewport of [
  { width: 1400, height: 800 },
  { width: 390, height: 800 },
]) {
  const phone = viewport.width < 400;

  test.describe(`the map at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("draws a point for each place with coordinates and none for a place without", async ({ page }) => {
      await mountMap(page, { phone, touch: phone });

      expect((await keysOf(page)).sort()).toEqual(["paris, france", "passy, haute-savoie, france", "stockholm, sweden", "warsaw, congress poland"]);
      expect(await text(page, ".gedcom-map-counts")).toMatch(/^4 places · \d+ events$/u);
      expect(await text(page, ".gedcom-map-counter")).toBe("6 places have no coordinates");
    });

    test("sizes points by their events and colours them by kind, grey with a number where kinds differ", async ({ page }) => {
      await mountMap(page);
      const radius = (key: string) => mark(page, key).locator(".gedcom-map-disc").getAttribute("r").then(Number);

      expect(await radius("warsaw, congress poland")).toBeGreaterThan(await radius("passy, haute-savoie, france"));
      await expect(mark(page, "passy, haute-savoie, france")).toHaveClass(/is-death/u);
      await expect(mark(page, "paris, france")).toHaveClass(/is-mixed/u);
      await expect(mark(page, "paris, france").locator(".gedcom-map-count")).not.toHaveText("");
    });

    test("opens fitted to its places and keeps every point inside the plot", async ({ page }) => {
      await mountMap(page);
      const plot = await page.locator(".gedcom-map-plot").boundingBox();

      for (const key of await keysOf(page)) {
        const box = await mark(page, key!).locator(".gedcom-map-disc").boundingBox();
        expect(box?.x ?? -1).toBeGreaterThanOrEqual(plot?.x ?? 0);
        expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((plot?.x ?? 0) + (plot?.width ?? 0));
      }
      expect(await page.evaluate(() => window.tab.views?.memory().map?.view)).toBeUndefined();
    });

    test("fits again after the reader moves it, by the button and by the 0 key", async ({ page }) => {
      await mountMap(page);
      const before = await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]');
      await page.locator(".gedcom-map-zoom-in").click();
      await expect.poll(async () => (await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]')).x).not.toBeCloseTo(before.x, 0);
      await page.locator(".gedcom-map-fit").click();
      await expect.poll(async () => (await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]')).x).toBeCloseTo(before.x, 0);
      await page.locator(".gedcom-map-plot").focus();
      await page.keyboard.press("+");
      await page.keyboard.press("0");

      await expect.poll(async () => (await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]')).x).toBeCloseTo(before.x, 0);
    });

    test("selects the record of a point that holds one record's events", async ({ page }) => {
      await mountMap(page, { phone, touch: phone });
      const at = await centre(page, '.gedcom-map-mark[data-key="passy, haute-savoie, france"] .gedcom-map-disc');
      await page.mouse.click(at.x, at.y);

      expect(await selected(page)).toEqual(["@I1@"]);
    });

    test("lists the records of a point that holds several, and a row selects its record", async ({ page }) => {
      await mountMap(page, { phone, touch: phone });
      const at = await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"] .gedcom-map-disc');
      await page.mouse.click(at.x, at.y);
      const rows = page.locator(".gedcom-map-popup-row");

      expect(await rows.count()).toBeGreaterThan(1);
      expect(await selected(page)).toEqual([]);
      await rows.nth(1).click();
      expect((await selected(page)).length).toBe(1);
      await expect(page.locator(".gedcom-map-popup")).toBeHidden();
    });

    test("draws Marie's line with an arrow on each segment and the numbers 1 to 5, dims nothing for nothing selected", async ({ page }) => {
      await mountMap(page, { placesText: SCEAUX });
      await expect(page.locator(".gedcom-map-arrow")).toHaveCount(0);
      await page.evaluate(() => window.tab.select("@I1@", false));

      await expect(page.locator(".gedcom-map-arrow")).toHaveCount(4);
      expect(await page.locator(".gedcom-map-number").evaluateAll((all) => all.map((one) => one.textContent))).toEqual(["1", "2", "3", "4", "5"]);
      await page.evaluate(() => window.tab.select(null, false));
      await expect(page.locator(".gedcom-map-arrow")).toHaveCount(0);
      await expect(page.locator(".gedcom-map-mark.is-dimmed")).toHaveCount(0);
    });

    test("dims the places of other records when a person is selected", async ({ page }) => {
      await mountMap(page);
      await page.evaluate(() => window.tab.select("@I2@", false));

      await expect(mark(page, "paris, france")).toHaveClass(/is-highlighted/u);
      await expect(mark(page, "passy, haute-savoie, france")).toHaveClass(/is-dimmed/u);
    });

    test("narrows by years with the chip and leaves the selection and the view alone", async ({ page }) => {
      await mountMap(page);
      await page.evaluate(() => window.tab.select("@I1@", false));
      const before = await text(page, ".gedcom-map-counts");
      const view = await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]');
      await expect(page.locator(".gedcom-map-years-chip")).toHaveText("Years: all");
      await page.locator(".gedcom-map-years-chip").click();
      await page.locator(".gedcom-map-years-handle.is-from").focus();
      await page.keyboard.press("End");

      expect(await text(page, ".gedcom-map-counts")).not.toBe(before);
      expect(await page.evaluate(() => window.tab.calls.selected)).toEqual([]);
      await expect(page.locator(".gedcom-map-mark.is-highlighted")).toHaveCount(0);
      await expect(page.locator(".gedcom-map-branch")).toContainText("Marie");
      await page.locator(".gedcom-map-years-clear").click();
      await expect(page.locator(".gedcom-map-years-chip")).toHaveText("Years: all");
      expect(await text(page, ".gedcom-map-counts")).toBe(before);
      expect(await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]')).toEqual(view);
    });

    test("finds a place by name, dims the rest and glides to it", async ({ page }) => {
      await mountMap(page);
      await page.evaluate(() => window.tab.openSearch());
      await page.keyboard.type("WARSAW");
      await page.locator(".gedcom-map-find-next").click();
      const plot = await centre(page, ".gedcom-map-plot");

      await expect(mark(page, "warsaw, congress poland")).toHaveClass(/is-current/u);
      await expect(page.locator(".gedcom-map-mark.is-dimmed")).toHaveCount((await marks(page).count()) - 1);
      await expect
        .poll(async () => {
          const at = await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"] .gedcom-map-disc');
          return Math.max(Math.abs(at.x - plot.x), Math.abs(at.y - plot.y));
        })
        .toBeLessThan(4);
      expect(await selected(page)).toEqual([]);
    });

    test("is one tab stop that steps through places and announces each", async ({ page }) => {
      await mountMap(page);
      await page.locator(".gedcom-map-plot").focus();
      await page.keyboard.press("ArrowRight");

      await expect(page.locator(".gedcom-map-live")).toHaveText(/^Paris, France, \d+ events?, \d{4} to \d{4}$/u);
      await expect(mark(page, "paris, france")).toHaveClass(/is-focused/u);
      await expect(page.locator(".gedcom-map-plot")).not.toHaveAttribute("aria-label", /.*/u);
      await expect(page.locator(".gedcom-map-plot")).toHaveAccessibleName("Map of places, 4 places");
    });

    test("opens the list of places by the counter, reaches every place by keyboard and selects by Enter", async ({ page }) => {
      await mountMap(page, { phone, touch: phone });
      await page.locator(".gedcom-map-counter").click();
      await expect(page.locator(".gedcom-map-panel")).toBeVisible();
      expect(await page.locator(".gedcom-map-panel-group").allInnerTexts()).toEqual(["On the map · 4", "No coordinates · 6"]);
      await page.locator("button.gedcom-map-panel-row").first().focus();
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      expect((await selected(page)).length + (await page.locator(".gedcom-map-popup-row").count())).toBeGreaterThan(0);
      await page.keyboard.press("Escape");
    });

    test("says why there is no place to draw and calls its host once from the button", async ({ page }) => {
      await mountMap(page, { fixture: undefined, doc: PLAIN, placesText: null, phone, touch: phone });

      await expect(page.locator(".gedcom-map-empty h3")).toHaveText("No place has coordinates yet");
      await page.locator(".gedcom-map-empty button").click();
      expect(await page.evaluate(() => window.tab.calls.tableActions)).toBe(1);
    });

    test("offers Branch of a selected person and shows the branch", async ({ page }) => {
      await mountMap(page);
      await expect(page.locator(".gedcom-map-branch")).toBeDisabled();
      await page.evaluate(() => window.tab.select("@I12@", false));
      await expect(page.locator(".gedcom-map-branch")).toBeEnabled();
      await page.locator(".gedcom-map-branch").click();

      await expect(page.locator(".gedcom-map-scope")).toContainText("Branch of");
      await page.locator("[data-whole]").click();
      await expect(page.locator(".gedcom-map-branch")).toBeVisible();
    });

    test("has nothing to scroll sideways in English and in Russian", async ({ page }) => {
      for (const width of [viewport.width, 320]) {
        await page.setViewportSize({ width, height: 800 });
        for (const language of ["en", "ru"]) {
          await mountMap(page, { language, phone: width < 400, touch: width < 400 });
          await page.evaluate(() => window.tab.select("@I1@", false));
          expect(await sideways(page), `${language} at ${width}`).toBe(false);
        }
      }
    });

    test("zooms with the wheel about the pointer", async ({ page }) => {
      await mountMap(page);
      const at = await centre(page, ".gedcom-map-plot");
      const before = await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]');
      await page.mouse.move(at.x, at.y);
      await page.mouse.wheel(0, -400);

      await expect
        .poll(async () => {
          const now = await centre(page, '.gedcom-map-mark[data-key="warsaw, congress poland"]');
          return Math.hypot(now.x - at.x, now.y - at.y) / Math.hypot(before.x - at.x, before.y - at.y);
        })
        .toBeGreaterThan(1.1);
    });
  });
}

test.describe("the map on a phone", () => {
  test.use({ viewport: { width: 390, height: 800 }, hasTouch: true });

  test("zooms about the midpoint of two fingers", async ({ page }) => {
    await mountMap(page, { phone: true, touch: true });
    const plot = await page.locator(".gedcom-map-plot").boundingBox();
    const [x, y] = [(plot?.x ?? 0) + (plot?.width ?? 0) / 2, (plot?.y ?? 0) + (plot?.height ?? 0) / 2];
    const before = await centre(page, '.gedcom-map-mark[data-key="paris, france"]');
    await page.evaluate(
      ([cx, cy]) => {
        const el = document.querySelector(".gedcom-map-plot") as HTMLElement;
        const fire = (type: string, id: number, px: number) =>
          el.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: px, clientY: cy, button: 0, buttons: 1, pointerType: "touch", bubbles: true }));
        fire("pointerdown", 1, cx - 30);
        fire("pointerdown", 2, cx + 30);
        fire("pointermove", 1, cx - 45);
        fire("pointermove", 2, cx + 45);
        el.dispatchEvent(new PointerEvent("pointerup", { pointerId: 1, bubbles: true }));
        el.dispatchEvent(new PointerEvent("pointerup", { pointerId: 2, bubbles: true }));
      },
      [x, y],
    );
    const after = await centre(page, '.gedcom-map-mark[data-key="paris, france"]');

    expect(Math.hypot(after.x - x, after.y - y)).toBeGreaterThan(Math.hypot(before.x - x, before.y - y) * 1.3);
  });

  test("gives every control a target of at least 44 px", async ({ page }) => {
    await mountMap(page, { phone: true, touch: true });
    await page.locator(".gedcom-map-years-chip").click();
    const small = await page.evaluate(() =>
      Array.from(document.querySelectorAll<HTMLElement>(".gedcom-map-controls button, .gedcom-map-scope-row button, .gedcom-map-years-chip, .gedcom-map-years-clear, .gedcom-map-find-toggle"))
        .filter((el) => el.offsetParent !== null)
        .map((el) => ({ cls: el.className, ...(({ width, height }) => ({ width, height }))(el.getBoundingClientRect()) }))
        .filter((box) => box.width < 43.5 || box.height < 43.5),
    );

    expect(small).toEqual([]);
  });

  test("keeps a small point's target by pressing near it", async ({ page }) => {
    await mountMap(page, { phone: true, touch: true });
    const at = await centre(page, '.gedcom-map-mark[data-key="passy, haute-savoie, france"] .gedcom-map-disc');
    await page.touchscreen.tap(at.x + 15, at.y + 10);

    expect(await selected(page)).toEqual(["@I1@"]);
  });
});

test.describe("the tiles of the map", () => {
  test.use({ viewport: { width: 1400, height: 800 } });

  async function requests(page: Page): Promise<string[]> {
    const seen: string[] = [];
    await page.route("https://tiles.example/**", async (route) => {
      seen.push(route.request().url());
      await route.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64") });
    });
    return seen;
  }

  test("asks for nothing while the toggle is off, the address is empty, invalid or half typed", async ({ page }) => {
    const seen = await requests(page);
    for (const tiles of [
      { enabled: false, template: TILES, invalid: false, attribution: "" },
      { enabled: true, template: null, invalid: false, attribution: "" },
      { enabled: true, template: null, invalid: true, attribution: "" },
    ]) {
      await mountMap(page, { tiles });
      await page.waitForTimeout(400);
    }

    expect(seen).toEqual([]);
    await expect(page.locator(".gedcom-map-status")).toHaveText("The tile server address is not valid");
  });

  test("asks only for tile numbers, shows the attribution and draws the outline over the tiles", async ({ page }) => {
    const seen = await requests(page);
    await mountMap(page, { tiles: { enabled: true, template: TILES, invalid: false, attribution: "© Example Maps" } });
    await expect.poll(() => seen.length).toBeGreaterThan(5);

    expect(seen.every((url) => /^https:\/\/tiles\.example\/\d+\/\d+\/\d+\.png$/u.test(url))).toBe(true);
    expect(seen.length).toBeLessThan(120);
    expect(seen.join(" ")).not.toMatch(/warsaw|paris|marie/iu);
    await expect(page.locator(".gedcom-map-credit")).toHaveText("© Example Maps");
    await expect(page.locator(".gedcom-map-plot")).toHaveClass(/is-tiles/u);
  });

  test("shows the host where no attribution is set", async ({ page }) => {
    await requests(page);
    await mountMap(page, { tiles: { enabled: true, template: TILES, invalid: false, attribution: "" } });

    await expect(page.locator(".gedcom-map-credit")).toHaveText("tiles.example");
  });

  test("draws the points at once and says so when every tile fails", async ({ page }) => {
    await page.route("https://tiles.example/**", (route) => route.abort());
    await mountMap(page, { tiles: { enabled: true, template: TILES, invalid: false, attribution: "" } });

    expect(await marks(page).count()).toBe(4);
    await expect(page.locator(".gedcom-map-status")).toHaveText("Tiles could not be loaded");
  });

  test("answers a click on a point while the server never answers", async ({ page }) => {
    await page.route("https://tiles.example/**", () => new Promise<void>(() => undefined));
    await mountMap(page, { tiles: { enabled: true, template: TILES, invalid: false, attribution: "" } });
    const at = await centre(page, '.gedcom-map-mark[data-key="passy, haute-savoie, france"] .gedcom-map-disc');
    await page.mouse.click(at.x, at.y);

    expect(await selected(page)).toEqual(["@I1@"]);
  });
});

test.describe("a file of five thousand places", () => {
  test.use({ viewport: { width: 1400, height: 800 } });

  test("keeps a bounded number of marks through a pan and a change of the years range", async ({ page }) => {
    await mountMap(page, { fixture: undefined, doc: placesFile(5000) });

    expect(await marks(page).count()).toBeLessThan(600);
    await page.mouse.move(700, 400);
    await page.mouse.wheel(0, -300);
    await page.mouse.down();
    await page.mouse.move(500, 300, { steps: 5 });
    await page.mouse.up();
    expect(await marks(page).count()).toBeLessThan(600);
    await page.locator(".gedcom-map-years-chip").click();
    await page.locator(".gedcom-map-years-handle.is-from").focus();
    await page.keyboard.press("PageUp");
    await page.keyboard.press("PageUp");

    expect(await marks(page).count()).toBeLessThan(600);
  });
});
