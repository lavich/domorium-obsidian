import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { TimelineOptions } from "../harness/fileTimeline";
import { generated } from "./generated";

const ZOOM = 6;
const PAD = 12;
const FIRST_DECADE = 1820;

async function mountTimeline(page: Page, options: TimelineOptions = {}): Promise<number> {
  await page.goto(pathToFileURL(resolve("harness/fileTimeline.html")).href);
  const took = await page.evaluate((timelineOptions) => window.timeline.mount(timelineOptions), options);
  await page.waitForSelector(".gedcom-ft-name");
  return took;
}

const name = (page: Page, xref: string) => page.locator(`.gedcom-ft-name[data-p="${xref}"]`);
const life = (page: Page, xref: string) => page.locator(`.gedcom-ft-life[data-p="${xref}"]`);

async function yearX(page: Page, year: number): Promise<number> {
  const chart = await page.locator(".gedcom-ft-chart").boundingBox();
  return (chart?.x ?? 0) + PAD + (year - FIRST_DECADE) * ZOOM;
}

test.describe("the timeline of a file", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  test("names Marie with her years, on a lifeline in the theme's colour for a woman", async ({ page }) => {
    await mountTimeline(page);

    await expect(name(page, "@I1@").locator(".gedcom-ft-name-years")).toHaveText("1867–1934");
    expect(await life(page, "@I1@").evaluate((node) => getComputedStyle(node).fill)).toBe("rgb(255, 0, 128)");
    expect(await life(page, "@I2@").evaluate((node) => getComputedStyle(node).fill)).toBe("rgb(0, 0, 255)");
    const bar = await life(page, "@I1@").boundingBox();
    expect(bar?.x).toBeCloseTo(await yearX(page, 1867), 0);
    expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeCloseTo(await yearX(page, 1934), 0);
  });

  test("joins Pierre and Marie at their marriage, and draws his residence as a span", async ({ page }) => {
    await mountTimeline(page);

    const at = await yearX(page, 1895);
    const lines = await page.locator(".gedcom-ft-marriage").evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect()).map((box) => ({ x: box.x, height: box.height })),
    );
    expect(lines.some((line) => Math.abs(line.x - at) < 2 && Math.abs(line.height - 34) < 2)).toBe(true);
    const span = await page.locator('.gedcom-ft-span[data-p="@I2@"]').boundingBox();
    expect(span?.width).toBeCloseTo((1906 - 1895) * ZOOM, 0);
  });

  test("picks out Marie's family with arrows when the pointer is on her", async ({ page }) => {
    await mountTimeline(page);
    await name(page, "@I1@").hover();

    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(4);
    expect(await page.locator('.gedcom-ft-kin[data-from="@I2@"]').count()).toBe(0);
    await expect.poll(() => name(page, "@I11@").evaluate((node) => getComputedStyle(node).opacity)).toBe("0.18");
    expect(await name(page, "@I2@").evaluate((node) => getComputedStyle(node).opacity)).toBe("1");
  });

  test("shows the event under the pointer, and leads to its lines", async ({ page }) => {
    await mountTimeline(page);
    const birth = page.locator('.gedcom-ft-mark.is-birth[data-p="@I1@"]');
    await birth.hover();

    await expect(page.locator(".gedcom-ft-tip.is-shown")).toContainText("7 NOV 1867");
    await expect(page.locator(".gedcom-ft-tip.is-shown")).toContainText("Warsaw, Congress Poland");
    await birth.click();
    expect(await page.evaluate(() => window.timeline.calls.shownInSource.length)).toBe(1);
    await name(page, "@I12@").click();
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I12@"]);
  });

  test("puts a year cursor at 1906 with Marie at 39 and Irène at 9", async ({ page }) => {
    await mountTimeline(page);
    const row = await life(page, "@I13@").boundingBox();
    await page.mouse.move(await yearX(page, 1906), (row?.y ?? 0) + 30);

    await expect(page.locator(".gedcom-ft-axis-cursor")).toHaveText("1906");
    await expect(page.locator('.gedcom-ft-age[data-p="@I1@"]')).toHaveText("39");
    await expect(page.locator('.gedcom-ft-age[data-p="@I12@"]')).toHaveText("9");
    await expect(page.locator(".gedcom-ft-alive")).toHaveText("In 1906: 11 people alive");
  });

  test("colours each kind of mark from the theme", async ({ page }) => {
    await mountTimeline(page);
    const fill = (selector: string) =>
      page.locator(`${selector} circle`).first().evaluate((node) => getComputedStyle(node).fill);

    expect(await fill('.gedcom-ft-mark.is-birth[data-p="@I1@"]')).toBe("rgb(0, 160, 0)");
    expect(await fill('.gedcom-ft-mark.is-marriage[data-p="@I1@"]')).toBe("rgb(128, 64, 0)");
    expect(await fill('.gedcom-ft-mark.is-death[data-p="@I1@"]')).toBe("rgb(0, 0, 0)");
    expect(await fill('.gedcom-ft-mark.is-other[data-p="@I1@"]')).toBe("rgb(255, 128, 0)");
  });

  test("takes its colours from a dark theme too", async ({ page }) => {
    await mountTimeline(page, { dark: true });

    expect(await life(page, "@I1@").evaluate((node) => getComputedStyle(node).fill)).toBe("rgb(255, 100, 180)");
    expect(
      await page.locator('.gedcom-ft-mark.is-death[data-p="@I1@"] circle').evaluate((node) => getComputedStyle(node).fill),
    ).toBe("rgb(255, 255, 255)");
  });

  test("opens a person and their branch from the keyboard", async ({ page }) => {
    await mountTimeline(page);
    await name(page, "@I12@").locator(".gedcom-ft-name-open").focus();
    await page.keyboard.press("Space");
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I12@"]);

    await page.keyboard.press("Tab");
    await expect(name(page, "@I12@").locator(".gedcom-ft-branch")).toBeFocused();
    await expect(name(page, "@I12@").locator(".gedcom-ft-branch")).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator(".gedcom-ft-name")).toHaveCount(10);
    await expect(name(page, "@I12@").locator(".gedcom-ft-branch")).toBeFocused();
  });

  test("shows Irène's branch, ten of the file's eighteen, and returns to the whole file", async ({ page }) => {
    await mountTimeline(page);
    await name(page, "@I12@").hover();
    await name(page, "@I12@").locator(".gedcom-ft-branch").click();

    await expect(page.locator(".gedcom-ft-name")).toHaveCount(10);
    await expect(page.locator(".gedcom-ft-scope")).toContainText("Branch of Irène Joliot-Curie · 10 of 18 people");
    await page.locator(".gedcom-ft-whole").click();
    await expect(page.locator(".gedcom-ft-name")).toHaveCount(18);
  });

  test("returns to the whole file on Branch again, which reads pressed while the branch is shown", async ({ page }) => {
    await mountTimeline(page);
    await name(page, "@I12@").hover();
    await name(page, "@I12@").locator(".gedcom-ft-branch").click();
    await page.mouse.move(0, 0);

    const branch = name(page, "@I12@").locator(".gedcom-ft-branch");
    await expect(branch).toBeVisible();
    await expect(branch).toHaveAttribute("aria-pressed", "true");
    await branch.click();
    await expect(page.locator(".gedcom-ft-name")).toHaveCount(18);
    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
  });

  test("fades and lights smoothly, and at once where the reader asks for less motion", async ({ page }) => {
    await mountTimeline(page);
    const transition = () => life(page, "@I1@").evaluate((bar) => getComputedStyle(bar).transitionProperty);

    expect(await transition()).toContain("opacity");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await transition()).toBe("none");
  });

    test("keeps the names and the years in place while the board scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 });
    await mountTimeline(page);
    const before = await page.locator(".gedcom-ft-axis").boundingBox();
    const column = await page.locator(".gedcom-ft-names").boundingBox();
    await page.locator(".gedcom-ft-board").evaluate((board) => {
      board.scrollTop = 200;
      board.scrollLeft = 300;
    });

    expect((await page.locator(".gedcom-ft-axis").boundingBox())?.y).toBeCloseTo(before?.y ?? 0, 0);
    expect((await page.locator(".gedcom-ft-names").boundingBox())?.x).toBeCloseTo(column?.x ?? 0, 0);
  });
});

test.describe("the timeline of a file on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fits the screen's width, with the years scrolling inside it", async ({ page }) => {
    await mountTimeline(page, { phone: true });

    const page_ = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      board: document.querySelector(".gedcom-ft-board")?.scrollWidth ?? 0,
      names: document.querySelector<HTMLElement>(".gedcom-ft-names")?.offsetWidth ?? 0,
    }));
    expect(page_.document).toBe(true);
    expect(page_.board).toBeGreaterThan(390);
    expect(page_.names).toBe(120);
  });

  test("lights Marie's family and places the cursor on the first touch, and opens her on the second", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    await page.locator(".gedcom-ft-board").evaluate((board) => {
      board.scrollLeft = 200;
    });
    const bar = await life(page, "@I1@").boundingBox();
    const at = { x: (bar?.x ?? 0) + 60, y: (bar?.y ?? 0) + (bar?.height ?? 0) / 2 };
    await page.touchscreen.tap(at.x, at.y);

    await expect(name(page, "@I1@")).toHaveClass(/is-hl/);
    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(4);
    const touched = Math.round(FIRST_DECADE + (at.x - (await yearX(page, FIRST_DECADE))) / ZOOM);
    await expect(page.locator(".gedcom-ft-axis-cursor")).toHaveText(String(touched));
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual([]);

    await page.touchscreen.tap(at.x, at.y);
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I1@"]);
  });

  test("shows a touched mark's event, with the way to its lines", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    await page.locator(".gedcom-ft-board").evaluate((board) => {
      board.scrollLeft = 200;
    });
    const mark = await page.locator('.gedcom-ft-mark.is-birth[data-p="@I1@"]').boundingBox();
    await page.touchscreen.tap((mark?.x ?? 0) + (mark?.width ?? 0) / 2, (mark?.y ?? 0) + (mark?.height ?? 0) / 2);

    await expect(page.locator(".gedcom-ft-pop.is-shown")).toContainText("7 NOV 1867");
    await page.locator(".gedcom-ft-pop-source").tap();
    expect(await page.evaluate(() => window.timeline.calls.shownInSource.length)).toBe(1);
  });

  test("keeps a touched mark's event on the screen at the bottom of the rows", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    await page.locator(".gedcom-ft-board").evaluate((board) => {
      board.scrollTop = board.scrollHeight;
      board.scrollLeft = 520;
    });
    await page.waitForTimeout(50);
    const mark = await page.locator('.gedcom-ft-mark.is-birth[data-p="@I17@"]').boundingBox();
    await page.touchscreen.tap((mark?.x ?? 0) + (mark?.width ?? 0) / 2, (mark?.y ?? 0) + (mark?.height ?? 0) / 2);

    const source = await page.locator(".gedcom-ft-pop.is-shown .gedcom-ft-pop-source").boundingBox();
    expect((source?.y ?? Infinity) + (source?.height ?? 0)).toBeLessThanOrEqual(844);
    expect(source?.y ?? -1).toBeGreaterThanOrEqual(0);
  });
});

test.describe("a large file", () => {
  test("opens on the branch of the person its tab shows, with the way back to the whole file", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
    await mountTimeline(page, { doc: generated(2_000), around: "@I500@" });

    await expect(page.locator(".gedcom-ft-scope")).toContainText("Branch of Person 500 Generated");
    await expect(page.locator(".gedcom-ft-name.is-focus")).toHaveAttribute("data-p", "@I500@");
    await page.locator(".gedcom-ft-whole").click();
    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
    await expect(page.locator(".gedcom-ft-summary")).toContainText("2000 people");
  });
});

test.describe("the timeline of a file of 10 000 people", () => {
  test("draws only the rows near the view while scrolling, and follows the pointer", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await mountTimeline(page, { doc: generated(10_000), whole: true });

    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
    await expect(page.locator(".gedcom-ft-summary")).toContainText("10000 people");
    const drawn = () => page.locator(".gedcom-ft-name").count();
    expect(await drawn()).toBeLessThan(300);

    for (const top of [50_000, 150_000, 300_000]) {
      await page.locator(".gedcom-ft-board").evaluate((board, to) => {
        board.scrollTop = to;
      }, top);
      await page.waitForFunction(
        (to) => {
          const first = document.querySelector<HTMLElement>(".gedcom-ft-name");
          const board = document.querySelector<HTMLElement>(".gedcom-ft-board");
          return first !== null && board !== null && first.offsetTop <= to && first.offsetTop + 2000 > to;
        },
        top,
      );
      expect(await drawn()).toBeLessThan(300);
      expect(await page.locator(".gedcom-ft-items > *").count()).toBeLessThan(2000);
    }

    const row = page.locator(".gedcom-ft-name").nth(40);
    const took = await row.evaluate((node) => {
      const started = performance.now();
      node.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" }));
      return performance.now() - started;
    });
    await expect(row).toHaveClass(/is-hl/);
    expect(took).toBeLessThan(50);

    const slowest = await page.locator(".gedcom-ft-chart").evaluate((chart) => {
      const box = chart.getBoundingClientRect();
      const board = document.querySelector(".gedcom-ft-board")?.getBoundingClientRect();
      const y = (board?.top ?? 0) + 200;
      let worst = 0;
      for (let step = 0; step < 60; step += 1) {
        const started = performance.now();
        chart.dispatchEvent(
          new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse", clientX: box.left + 30 + step * 9, clientY: y }),
        );
        worst = Math.max(worst, performance.now() - started);
      }
      return worst;
    });
    await expect(page.locator(".gedcom-ft-alive")).toContainText("people alive");
    expect(slowest).toBeLessThan(50);
  });
});
