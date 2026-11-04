import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { GraphOptions } from "../harness/fileGraph";
import { generated, tangled } from "./generated";

async function mountGraph(page: Page, options: GraphOptions = {}): Promise<number> {
  await page.goto(pathToFileURL(resolve("harness/fileGraph.html")).href);
  const took = await page.evaluate((graphOptions) => window.graph.mount(graphOptions), options);
  await page.waitForSelector(".gedcom-fg-person");
  return took;
}

const person = (page: Page, xref: string) => page.locator(`.gedcom-fg-person[data-p="${xref}"]`);
const card = (page: Page, xref: string) => page.locator(`[data-card="${xref}"]`);
const node = (page: Page, family: string) => page.locator(`[data-node="${family}"]`);
const opened = (page: Page) => page.evaluate(() => window.graph.calls.opened);
const zoom = (page: Page) => page.evaluate(() => window.graph.board?.view()?.k ?? NaN);

async function centreOf(page: Page, selector: string): Promise<{ x: number; y: number }> {
  const box = await page.locator(selector).boundingBox();
  return { x: (box?.x ?? NaN) + (box?.width ?? 0) / 2, y: (box?.y ?? NaN) + (box?.height ?? 0) / 2 };
}

test.describe("the graph of a file", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  test("names Marie with her years on a card in the theme's colour for a woman", async ({ page }) => {
    await mountGraph(page);

    await expect(card(page, "@I1@").locator(".gedcom-fg-card-name")).toHaveText("Marie Skłodowska-Curie");
    await expect(card(page, "@I1@").locator(".gedcom-fg-card-years")).toHaveText("1867–1934");
    const fill = (xref: string, part: string) =>
      person(page, xref).locator(part).evaluate((shape) => getComputedStyle(shape).fill);
    expect(await fill("@I1@", ".gedcom-fg-card-side")).toBe("rgb(255, 0, 128)");
    expect(await fill("@I1@", ".gedcom-fg-card-bg")).toBe("rgba(255, 0, 128, 0.14)");
    expect(await fill("@I2@", ".gedcom-fg-card-side")).toBe("rgb(0, 0, 255)");
    for (const xref of ["@I1@", "@I17@", "@I9@", "@I8@"]) {
      await expect(card(page, xref).locator(".gedcom-fg-card-name")).toBeInViewport();
    }
    await expect(page.locator(".gedcom-fg")).not.toContainText("Generation");
  });

  test("cuts a long name to the width of its card", async ({ page }) => {
    const name = "АЛЕКСАНДРА ВЛАДИМИРОВНА /ЩЕРБАТСКАЯ-ВОЛКОНСКАЯ/";
    await mountGraph(page, {
      doc: ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", `1 NAME ${name}`, "1 SEX F", "0 TRLR", ""].join("\n"),
    });
    const text = page.locator('[data-card="@I1@"] .gedcom-fg-card-name');

    await expect(text).toHaveText(/…$/);
    const card = await page.locator('[data-card="@I1@"] .gedcom-fg-card-bg').boundingBox();
    const written = await text.boundingBox();
    expect((written?.x ?? 0) + (written?.width ?? 0)).toBeLessThan((card?.x ?? 0) + (card?.width ?? 0) - 4);
  });

  test("takes its colours from a dark theme too", async ({ page }) => {
    await mountGraph(page, { dark: true });

    expect(
      await person(page, "@I1@").locator(".gedcom-fg-card-side").evaluate((shape) => getComputedStyle(shape).fill),
    ).toBe("rgb(255, 100, 180)");
    expect(
      await person(page, "@I2@").locator(".gedcom-fg-card-bg").evaluate((shape) => getComputedStyle(shape).fill),
    ).toBe("rgba(80, 160, 255, 0.12)");
  });

  test("stands Pierre Curie left of Marie with ’95 between them, and draws Eugène's marriage hollow", async ({ page }) => {
    await mountGraph(page);
    const pierre = await card(page, "@I2@").boundingBox();
    const marie = await card(page, "@I1@").boundingBox();
    const curies = await node(page, "@F3@").boundingBox();

    expect((pierre?.x ?? 0) + (pierre?.width ?? 0)).toBeLessThan(curies?.x ?? 0);
    expect((curies?.x ?? 0) + (curies?.width ?? 0)).toBeLessThan(marie?.x ?? 0);
    await expect(node(page, "@F3@")).toHaveText("’95");
    expect(await node(page, "@F2@").locator("circle").evaluate((circle) => getComputedStyle(circle).fill)).toBe(
      "rgb(255, 255, 255)",
    );
  });

  test("lights Marie's family when the pointer is on her, and tells the Curies' marriage", async ({ page }) => {
    await mountGraph(page);
    await card(page, "@I1@").hover();

    await expect(person(page, "@I1@")).toHaveClass(/is-hl/);
    await expect(page.locator(".gedcom-fg-person.is-on")).toHaveCount(6);
    expect(await person(page, "@I11@").evaluate((group) => getComputedStyle(group).opacity)).toBe("0.18");
    expect(await person(page, "@I2@").evaluate((group) => getComputedStyle(group).opacity)).toBe("1");

    await node(page, "@F3@").hover();
    await expect(page.locator(".gedcom-fg-tip.is-shown")).toContainText("Married 26 JUL 1895 · Sceaux, France");
    await expect(page.locator(".gedcom-fg-tip.is-shown")).toContainText("2 children");
  });

  test("fades who does not match a search, and goes to each match on Enter", async ({ page }) => {
    await mountGraph(page);
    await page.locator(".gedcom-fg-search").fill("joliot");

    await expect(page.locator(".gedcom-fg-person:not(.is-dim)")).toHaveCount(4);
    const canvas = await centreOf(page, ".gedcom-fg-canvas");
    for (const xref of ["@I14@", "@I12@", "@I16@"]) {
      await page.locator(".gedcom-fg-search").press("Enter");
      await expect(person(page, xref)).toHaveClass(/is-hl/);
      const at = await centreOf(page, `[data-card="${xref}"] .gedcom-fg-card-bg`);
      expect(Math.abs(at.x - canvas.x)).toBeLessThan(2);
      expect(Math.abs(at.y - canvas.y)).toBeLessThan(2);
    }
  });

  test("shows Irène's branch, ten of the file's seventeen, and returns to the whole file", async ({ page }) => {
    await mountGraph(page);
    await card(page, "@I12@").hover();
    await page.locator('[data-branch="@I12@"]').click();

    await expect(page.locator(".gedcom-fg-scope")).toContainText("Branch of Irène Joliot-Curie · 10 of 17 people");
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(10);
    await page.locator(".gedcom-fg-whole").click();
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(17);
    const canvas = await centreOf(page, ".gedcom-fg-canvas");
    const irene = await centreOf(page, '[data-card="@I12@"] .gedcom-fg-card-bg');
    expect(Math.abs(irene.x - canvas.x)).toBeLessThan(2);
  });

  test("zooms with the wheel and the buttons, fits, and draws cards without text far out", async ({ page }) => {
    await mountGraph(page);
    const fitted = await zoom(page);
    const canvas = await centreOf(page, ".gedcom-fg-canvas");
    await page.mouse.move(canvas.x, canvas.y);
    await page.mouse.wheel(0, 100);
    await expect.poll(() => zoom(page)).toBeLessThan(fitted);

    for (let step = 0; step < 6; step += 1) {
      await page.locator(".gedcom-fg-zoom-out").click();
    }
    await expect.poll(() => zoom(page)).toBeLessThan(0.35);
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(17);
    await expect(page.locator(".gedcom-fg-items text")).toHaveCount(0);

    await page.locator(".gedcom-fg-fit").click();
    expect(await zoom(page)).toBeCloseTo(fitted, 6);
    await expect(page.locator(".gedcom-fg-card-name")).toHaveCount(17);
  });

  test("moves with a drag begun on a card, and opens nothing", async ({ page }) => {
    await mountGraph(page);
    const before = await card(page, "@I1@").boundingBox();
    const at = { x: (before?.x ?? 0) + 20, y: (before?.y ?? 0) + 10 };
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 60, at.y + 40, { steps: 5 });
    await page.mouse.up();

    const after = await card(page, "@I1@").boundingBox();
    expect((after?.x ?? 0) - (before?.x ?? 0)).toBeCloseTo(60, 0);
    expect(await opened(page)).toEqual([]);
    await card(page, "@I1@").click();
    expect(await opened(page)).toEqual(["@I1@"]);
  });

  test("opens a card, its branch and a family node from the keyboard", async ({ page }) => {
    await mountGraph(page);
    await card(page, "@I1@").focus();
    await page.keyboard.press("Enter");
    await node(page, "@F3@").focus();
    await page.keyboard.press("Space");
    expect(await opened(page)).toEqual(["@I1@", "@F3@"]);

    await card(page, "@I12@").focus();
    await page.keyboard.press("Tab");
    await expect(page.locator('[data-branch="@I12@"]')).toBeFocused();
    expect(
      await page.locator('[data-branch="@I12@"]').evaluate((pill) => getComputedStyle(pill).opacity),
    ).toBe("1");
    await page.keyboard.press("Enter");
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(10);
    await expect(page.locator('[data-branch="@I12@"]')).toBeFocused();
  });
});

test.describe("the graph of a file on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fits the screen's width, with the title hidden and the legend folded", async ({ page }) => {
    await mountGraph(page, { phone: true });

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
    await expect(page.locator(".gedcom-fg-title")).toBeHidden();
    await expect(page.locator(".gedcom-fg-legend-item").first()).toBeHidden();
    await page.locator(".gedcom-fg-legend-toggle").tap();
    await expect(page.locator(".gedcom-fg-legend-item").first()).toBeVisible();
    expect(await page.locator(".gedcom-fg-canvas").evaluate((canvas) => getComputedStyle(canvas).touchAction)).toBe(
      "none",
    );
  });

  test("lights Marie's family on the first touch and opens her on the second", async ({ page }) => {
    await mountGraph(page, { phone: true, around: "@I1@" });
    const at = await centreOf(page, '[data-card="@I1@"] .gedcom-fg-card-bg');
    await page.touchscreen.tap(at.x - 20, at.y);

    await expect(person(page, "@I1@")).toHaveClass(/is-hl/);
    await expect(person(page, "@I1@")).toHaveClass(/is-armed/);
    expect(await opened(page)).toEqual([]);
    await page.touchscreen.tap(at.x - 20, at.y);
    expect(await opened(page)).toEqual(["@I1@"]);
  });

  test("takes a touch where the branch of a card not yet lit would be for the card", async ({ page }) => {
    await mountGraph(page, { phone: true, around: "@I1@" });
    const pill = await page.locator('[data-branch="@I1@"] rect').boundingBox();
    const at = { x: (pill?.x ?? 0) + (pill?.width ?? 0) / 2, y: (pill?.y ?? 0) + (pill?.height ?? 0) / 2 };
    await page.touchscreen.tap(at.x, at.y);

    await expect(person(page, "@I1@")).toHaveClass(/is-armed/);
    await expect(page.locator(".gedcom-fg-scope")).toContainText("Whole file");
    await page.touchscreen.tap(at.x, at.y);
    await expect(page.locator(".gedcom-fg-scope")).toContainText("Branch of Marie Skłodowska-Curie");
  });

  test("shows a touched family node, with the way to the family's page", async ({ page }) => {
    await mountGraph(page, { phone: true, around: "@I1@" });
    const at = await centreOf(page, '[data-node="@F3@"] circle');
    await page.touchscreen.tap(at.x, at.y);

    await expect(page.locator(".gedcom-fg-pop.is-shown")).toContainText("Married 26 JUL 1895");
    const button = await page.locator(".gedcom-fg-pop-open").boundingBox();
    expect((button?.y ?? Infinity) + (button?.height ?? 0)).toBeLessThanOrEqual(844);
    await page.locator(".gedcom-fg-pop-open").tap();
    expect(await opened(page)).toEqual(["@F3@"]);
  });

  test("zooms with a pinch begun on a card, and opens nothing", async ({ page }) => {
    await mountGraph(page, { phone: true, around: "@I1@" });
    const at = await centreOf(page, '[data-card="@I1@"] .gedcom-fg-card-bg');
    const before = await zoom(page);
    const touch = await page.context().newCDPSession(page);
    const points = (spread: number) => [
      { x: at.x - spread, y: at.y, id: 1 },
      { x: at.x + spread, y: at.y, id: 2 },
    ];
    await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: points(20) });
    for (const spread of [30, 45, 60]) {
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: points(spread) });
    }
    await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });

    await expect.poll(() => zoom(page)).toBeCloseTo(before * 3, 1);
    expect(await opened(page)).toEqual([]);
    expect(await page.evaluate(() => window.scrollX + window.scrollY)).toBe(0);
  });
});

test.describe("the graph of a file of 10 000 people", () => {
  for (const [name, doc] of [
    ["generated", () => generated(10_000)],
    ["tangled", () => tangled(10_000)],
  ] as const) {
    test(`lays out the ${name} file in under a second, and draws only what is near the view`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: 1400, height: 900 });
      const took = await mountGraph(page, { doc: doc(), whole: true });

      expect(took).toBeLessThan(1_000);
      await expect(page.locator(".gedcom-fg-scope")).toContainText("Whole file · 10000 people");
      expect(await page.locator(".gedcom-fg-person").count()).toBeLessThan(300);
      const outside = await page.evaluate(() => {
        const window_ = window.graph.board?.windowOf();
        if (!window_) {
          return -1;
        }
        const width = window_.right - window_.left;
        const height = window_.bottom - window_.top;
        return [...document.querySelectorAll(".gedcom-fg-person")].filter((card) => {
          const [x = NaN, y = NaN] = (card.getAttribute("transform")?.match(/-?[\d.]+/g) ?? []).map(Number);
          return x + 168 < window_.left - width || x > window_.right + width || y + 46 < window_.top - height || y > window_.bottom + height;
        }).length;
      });
      expect(outside).toBe(0);

      const target = page.locator("[data-card]").nth(10);
      const hover = await target.evaluate((element) => {
        const started = performance.now();
        element.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
        return performance.now() - started;
      });
      expect(hover).toBeLessThan(50);

      await page.locator(".gedcom-fg-fit").click();
      await page.waitForTimeout(100);
      expect(await zoom(page)).toBe(0.05);
      expect(await page.locator(".gedcom-fg-view *").count()).toBeLessThan(6_000);
    });
  }
});
