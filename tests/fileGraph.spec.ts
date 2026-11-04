import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { GraphOptions } from "../harness/fileGraph";
import { expectNameLines } from "./cardText";
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

    await expectNameLines(card(page, "@I1@"), "Marie", "Skłodowska");
    await expect(card(page, "@I1@").locator(".gedcom-fg-card-years")).toHaveText("1867–1934");
    const fill = (xref: string, part: string) =>
      person(page, xref).locator(part).evaluate((shape) => getComputedStyle(shape).fill);
    expect(await fill("@I1@", ".gedcom-fg-card-bg")).toBe("rgba(255, 0, 128, 0.2)");
    expect(await fill("@I2@", ".gedcom-fg-card-bg")).toBe("rgba(0, 0, 255, 0.18)");
    await expect(page.locator(".gedcom-fg-card-side")).toHaveCount(0);
    for (const xref of ["@I1@", "@I17@", "@I9@", "@I8@"]) {
      await expect(card(page, xref).locator(".gedcom-fg-card-name").first()).toBeInViewport();
    }
    await expect(page.locator(".gedcom-fg")).not.toContainText("Generation");
  });

  test("shows Marie's portrait over her given name, her surname and her years, and none for Jacques", async ({ page }) => {
    await mountGraph(page);
    const marie = card(page, "@I1@");
    const picture = marie.locator(".gedcom-fg-avatar img");
    await expect.poll(() => picture.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    const [given, surname] = await marie.locator(".gedcom-fg-card-name").all();
    await expectNameLines(marie, "Marie", "Skłodowska");
    const tops = await Promise.all(
      [picture, given, surname, marie.locator(".gedcom-fg-card-years")].map(async (part) => (await part?.boundingBox())?.y ?? NaN),
    );
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    await expect(card(page, "@I11@").locator(".gedcom-fg-avatar")).toHaveCount(0);
    const jacques = await card(page, "@I11@").locator(".gedcom-fg-card-bg").boundingBox();
    const pierre = await card(page, "@I2@").locator(".gedcom-fg-card-bg").boundingBox();
    expect((jacques?.y ?? 0) + (jacques?.height ?? 0)).toBeCloseTo((pierre?.y ?? 0) + (pierre?.height ?? 0), 0);
    expect(jacques?.height ?? 0).toBeLessThan(pierre?.height ?? 0);
  });

  test("cuts a long name to the width of its card", async ({ page }) => {
    const name = "АЛЕКСАНДРА ВЛАДИМИРОВНА /ЩЕРБАТСКАЯ-ВОЛКОНСКАЯ/";
    await mountGraph(page, {
      doc: ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", `1 NAME ${name}`, "1 SEX F", "0 TRLR", ""].join("\n"),
    });
    const lines = page.locator('[data-card="@I1@"] .gedcom-fg-card-name');

    await expect(lines).toHaveText([/^АЛЕКСАНДРА.*…$/, /^ЩЕРБАТСКАЯ.*…$/]);
    const card = await page.locator('[data-card="@I1@"] .gedcom-fg-card-bg').boundingBox();
    for (const line of await lines.all()) {
      const written = await line.boundingBox();
      expect((written?.x ?? 0) + (written?.width ?? 0)).toBeLessThan((card?.x ?? 0) + (card?.width ?? 0) - 4);
    }
  });

  test("takes its colours from a dark theme too", async ({ page }) => {
    await mountGraph(page, { dark: true });

    expect(
      await person(page, "@I1@").locator(".gedcom-fg-card-bg").evaluate((shape) => getComputedStyle(shape).fill),
    ).toBe("rgba(255, 100, 180, 0.2)");
    expect(
      await person(page, "@I2@").locator(".gedcom-fg-card-bg").evaluate((shape) => getComputedStyle(shape).fill),
    ).toBe("rgba(80, 160, 255, 0.18)");
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
    await expect.poll(() => person(page, "@I11@").evaluate((group) => getComputedStyle(group).opacity)).toBe("0.18");
    expect(await person(page, "@I2@").evaluate((group) => getComputedStyle(group).opacity)).toBe("1");

    await node(page, "@F3@").hover();
    await expect(page.locator(".gedcom-fg-tip.is-shown")).toContainText("Married 26 JUL 1895 · Sceaux, France");
    await expect(page.locator(".gedcom-fg-tip.is-shown")).toContainText("2 children");
  });

  test("fades who does not match a search, and goes to each match on Enter", async ({ page }) => {
    await mountGraph(page);
    await page.locator(".gedcom-fg-find-toggle").click();
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

  test("returns to the whole file on Branch again, which reads pressed while the branch is shown", async ({ page }) => {
    await mountGraph(page);
    await card(page, "@I12@").hover();
    await page.locator('[data-branch="@I12@"]').click();
    await page.mouse.move(5, 5);

    const pill = page.locator('[data-branch="@I12@"]');
    await expect(pill).toHaveAttribute("aria-pressed", "true");
    expect(await pill.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");
    await pill.click();
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(17);
    await expect(page.locator(".gedcom-fg-scope")).toBeHidden();
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
    await expect(page.locator(".gedcom-fg-card-years")).toHaveCount(17);
  });

  test("fades and lights smoothly, and at once where the reader asks for less motion", async ({ page }) => {
    await mountGraph(page);
    const transition = () =>
      person(page, "@I1@").evaluate((group) => {
        const style = getComputedStyle(group);
        return { property: style.transitionProperty, duration: style.transitionDuration };
      });

    expect(await transition()).toEqual({
      property: "opacity, fill, stroke, stroke-width, background-color",
      duration: "0.15s, 0.15s, 0.15s, 0.15s, 0.15s",
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect((await transition()).property).toBe("none");
  });

  test("floats the zoom buttons in the canvas's corner, where they stay as the graph moves", async ({ page }) => {
    await mountGraph(page);
    const controls = page.locator(".gedcom-fg-controls");
    const canvas = await page.locator(".gedcom-fg-canvas").boundingBox();
    const before = await controls.boundingBox();

    expect(before?.x ?? 0).toBeGreaterThan(canvas?.x ?? Infinity);
    expect((before?.x ?? 0) + (before?.width ?? 0)).toBeLessThanOrEqual((canvas?.x ?? 0) + (canvas?.width ?? 0));
    expect((before?.y ?? 0) + (before?.height ?? 0)).toBeLessThanOrEqual((canvas?.y ?? 0) + (canvas?.height ?? 0));
    expect(before?.y ?? 0).toBeGreaterThan((canvas?.y ?? 0) + (canvas?.height ?? 0) / 2);
    await page.mouse.move((canvas?.x ?? 0) + 300, (canvas?.y ?? 0) + 300);
    await page.mouse.down();
    await page.mouse.move((canvas?.x ?? 0) + 200, (canvas?.y ?? 0) + 150, { steps: 4 });
    await page.mouse.up();
    expect(await controls.boundingBox()).toEqual(before);
    const k = await zoom(page);
    await controls.locator(".gedcom-fg-zoom-in").click();
    expect(await zoom(page)).toBeCloseTo(k * 1.2, 6);
  });

  test("moves with a drag begun on a card, and opens nothing", async ({ page }) => {
    await mountGraph(page);
    const before = await card(page, "@I1@").locator(".gedcom-fg-card-bg").boundingBox();
    const at = { x: (before?.x ?? 0) + 20, y: (before?.y ?? 0) + 10 };
    await page.mouse.move(at.x, at.y);
    await page.mouse.down();
    await page.mouse.move(at.x + 60, at.y + 40, { steps: 5 });
    await page.mouse.up();

    const after = await card(page, "@I1@").locator(".gedcom-fg-card-bg").boundingBox();
    const middle = (box: typeof before) => (box?.x ?? 0) + (box?.width ?? 0) / 2;
    expect(middle(after) - middle(before)).toBeCloseTo(60, 0);
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

for (const viewport of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`the search over the graph at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("floats inside the canvas away from the zoom buttons, with no toolbar band above it", async ({ page }) => {
      const phone = viewport.width < 600;
      await mountGraph(page, { phone });
      const box = (selector: string) => page.locator(selector).boundingBox();

      const canvas = await box(".gedcom-fg-canvas");
      const root = await box(".gedcom-fg");
      expect(Math.abs((canvas?.y ?? 0) - (root?.y ?? 0))).toBeLessThan(2);
      const closed = await box(".gedcom-fg-find");
      const zoomGroup = await box(".gedcom-fg-controls");
      expect(closed?.x ?? 0).toBeGreaterThanOrEqual(canvas?.x ?? 0);
      expect((closed?.y ?? 0) + (closed?.height ?? 0)).toBeLessThan(zoomGroup?.y ?? 0);
      expect(closed?.height ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 0);

      await expect(page.locator(".gedcom-fg-find-toggle")).toBeVisible();
      await expect(page.locator(".gedcom-fg-search")).toBeHidden();
      await page.locator(".gedcom-fg-find-toggle").click();
      await expect(page.locator(".gedcom-fg-search")).toBeFocused();
      await expect(page.locator(".gedcom-fg-find-toggle")).toBeHidden();
      await expect(page.locator(".gedcom-fg-find-clear")).toBeVisible();
      await expect.poll(async () => (await box(".gedcom-fg-search"))?.width ?? 0).toBeGreaterThan(100);
      const open = await box(".gedcom-fg-find");
      expect((open?.x ?? 0) + (open?.width ?? 0)).toBeLessThanOrEqual((canvas?.x ?? 0) + (canvas?.width ?? 0));
      expect(open?.x ?? 0).toBeGreaterThanOrEqual(canvas?.x ?? 0);
      await page.locator(".gedcom-fg-search").fill("joliot");
      await page.locator(".gedcom-fg-find-clear").click();
      await expect(page.locator(".gedcom-fg-find")).toHaveClass(/is-open/);
      await page.keyboard.press("Escape");
      await expect(page.locator(".gedcom-fg-find")).not.toHaveClass(/is-open/);
      await expect(page.locator(".gedcom-fg-find-toggle")).toBeVisible();
      await expect(page.locator(".gedcom-fg-find-toggle")).toBeFocused();
      await expect(page.locator(".gedcom-fg-search")).toBeHidden();
    });
  });
}

test.describe("the graph of a file on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fits the screen's width, with the title hidden and no legend", async ({ page }) => {
    await mountGraph(page, { phone: true });

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth),
    ).toBe(true);
    await expect(page.locator(".gedcom-fg-head, .gedcom-fg-title, .gedcom-fg-tools")).toHaveCount(0);
    await expect(page.locator('[class*="legend"]')).toHaveCount(0);
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
    await expect(page.locator(".gedcom-fg-scope")).toBeHidden();
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
    test(`lays out the ${name} file within its budget, and draws only what is near the view`, async ({ page }) => {
      test.setTimeout(60_000);
      await page.setViewportSize({ width: 1400, height: 900 });
      const took = await mountGraph(page, { doc: doc(), whole: true });

      expect(took).toBeLessThan(3_000);
      await expect(page.locator(".gedcom-fg-scope")).toBeHidden();
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
