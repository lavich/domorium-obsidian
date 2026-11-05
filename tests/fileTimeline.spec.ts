import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { TimelineOptions } from "../harness/fileTimeline";
import { generated } from "./generated";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

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

  test("keeps the name and the years of a row where they are under the pointer and when selected", async ({ page }) => {
    await mountTimeline(page);
    const place = () =>
      name(page, "@I2@").evaluate((row) => {
        const box = (selector: string) => {
          const rect = row.querySelector(selector)?.getBoundingClientRect();
          return [rect?.left, rect?.top, rect?.width];
        };
        return { text: box(".gedcom-ft-name-text"), years: box(".gedcom-ft-name-years") };
      });
    const before = await place();

    await name(page, "@I2@").hover();
    expect(await place()).toEqual(before);

    await page.mouse.move(2, 2);
    await name(page, "@I2@").evaluate((row) => row.classList.add("is-selected", "is-focus"));
    expect(await place()).toEqual(before);
  });

  test("fades no one when the pointer is on Marie, and moves over the rows", async ({ page }) => {
    await mountTimeline(page);
    const opacity = (xref: string) => name(page, xref).evaluate((node) => getComputedStyle(node).opacity);
    await name(page, "@I1@").hover();
    await life(page, "@I11@").hover();
    await page.waitForTimeout(400);

    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(0);
    await expect(page.locator(".gedcom-ft-board.has-hl")).toHaveCount(0);
    expect(await opacity("@I11@")).toBe("1");
    expect(await opacity("@I2@")).toBe("1");
    expect(await life(page, "@I11@").evaluate((node) => getComputedStyle(node).opacity)).toBe("0.35");
  });

  test("picks out Marie's family with arrows when she is clicked, and puts the light out on empty space and on Escape", async ({ page }) => {
    await mountTimeline(page);
    const opacity = (xref: string) => name(page, xref).evaluate((node) => getComputedStyle(node).opacity);
    await name(page, "@I1@").locator(".gedcom-ft-name-open").click();

    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(4);
    expect(await page.locator('.gedcom-ft-kin[data-from="@I2@"]').count()).toBe(0);
    await expect.poll(() => opacity("@I11@")).toBe("0.18");
    expect(await opacity("@I2@")).toBe("1");

    await name(page, "@I12@").locator(".gedcom-ft-name-open").click();
    await expect(name(page, "@I12@")).toHaveClass(/is-hl/);
    await expect(name(page, "@I1@")).not.toHaveClass(/is-hl/);

    await page.locator(".gedcom-ft-chart").click({ position: { x: 2, y: 2 } });
    await expect.poll(() => opacity("@I11@")).toBe("1");
    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(0);

    await name(page, "@I1@").locator(".gedcom-ft-name-open").click();
    await expect.poll(() => opacity("@I11@")).toBe("0.18");
    await page.keyboard.press("Escape");
    await expect.poll(() => opacity("@I11@")).toBe("1");
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I1@", "@I12@", "@I1@"]);
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
    await expect(page.locator(".gedcom-ft-board.has-hl")).toHaveCount(0);
    await page.keyboard.press("Space");
    await expect(name(page, "@I12@")).toHaveClass(/is-hl/);
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
    await name(page, "@I1@").locator(".gedcom-ft-name-open").click();
    expect(await name(page, "@I11@").evaluate((node) => getComputedStyle(node).opacity)).toBe("0.18");
  });

    test("keeps the names and the years in place while the board scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 });
    await mountTimeline(page);
    const before = await page.locator(".gedcom-ft-axis").boundingBox();
    const column = await page.locator(".gedcom-ft-names").boundingBox();
    await page.locator(".gedcom-ft-plot").evaluate((board) => {
      board.scrollTop = 200;
      board.scrollLeft = 300;
    });

    expect((await page.locator(".gedcom-ft-axis").boundingBox())?.y).toBeCloseTo(before?.y ?? 0, 0);
    expect((await page.locator(".gedcom-ft-names").boundingBox())?.x).toBeCloseTo(column?.x ?? 0, 0);
  });
});

for (const viewport of [{ width: 1400, height: 600 }, { width: 390, height: 844 }]) {
  test.describe(`the search over the timeline at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("floats inside the board under the axis, away from the zoom buttons, and keeps a query open", async ({ page }) => {
      const phone = viewport.width < 600;
      await mountTimeline(page, { phone });
      const box = (selector: string) => page.locator(selector).boundingBox();

      await expect(page.locator(".gedcom-ft-tools, .gedcom-ft-chip, .gedcom-ft-alive")).toHaveCount(0);
      await expect(page.locator(".gedcom-ft-head, .gedcom-ft-title")).toHaveCount(0);
      const board = await box(".gedcom-ft-board");
      const axis = await box(".gedcom-ft-axis-band");
      const closed = await box(".gedcom-ft-find");
      const zoomGroup = await box(".gedcom-ft-controls");
      expect(closed?.y ?? 0).toBeGreaterThanOrEqual((axis?.y ?? 0) + (axis?.height ?? 0));
      expect((closed?.x ?? 0) + (closed?.width ?? 0)).toBeLessThanOrEqual((board?.x ?? 0) + (board?.width ?? 0));
      expect((closed?.y ?? 0) + (closed?.height ?? 0)).toBeLessThan(zoomGroup?.y ?? 0);
      expect(closed?.height ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 0);

      await expect(page.locator(".gedcom-ft-find-toggle")).toBeVisible();
      await expect(page.locator(".gedcom-ft-search")).toBeHidden();
      await page.locator(".gedcom-ft-find-toggle").click();
      await expect(page.locator(".gedcom-ft-search")).toBeFocused();
      await expect(page.locator(".gedcom-ft-find-toggle")).toBeHidden();
      await page.locator(".gedcom-ft-search").fill("joliot");
      await expect(page.locator(".gedcom-ft-name:not(.is-dim)")).toHaveCount(4);
      await expect(page.locator(".gedcom-ft-find-count")).toHaveText("4 matches");
      await page.locator(".gedcom-ft-find-next").click();
      await expect(page.locator(".gedcom-ft-find-count")).toHaveText("1 / 4");
      await expect(name(page, "@I12@")).toHaveClass(/is-current/);
      await expect(page.locator(".gedcom-ft-search")).toBeFocused();
      await expect
        .poll(async () => {
          const plot = await box(".gedcom-ft-plot");
          const row = await name(page, "@I12@").boundingBox();
          return (
            plot !== null &&
            row !== null &&
            row.y >= plot.y &&
            row.y + row.height <= plot.y + plot.height
          );
        })
        .toBe(true);
      await page.locator(".gedcom-ft-find-prev").click();
      await expect(page.locator(".gedcom-ft-find-count")).toHaveText("4 / 4");
      await expect(name(page, "@I17@")).toHaveClass(/is-current/);
      const filled = await box(".gedcom-ft-find");
      expect((filled?.x ?? 0) + (filled?.width ?? 0)).toBeLessThanOrEqual((board?.x ?? 0) + (board?.width ?? 0));
      expect(filled?.x ?? 0).toBeGreaterThanOrEqual(board?.x ?? 0);
      const arrows = await page.locator(".gedcom-ft-find-prev").boundingBox();
      expect(arrows?.width ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 24);
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      await expect(page.locator(".gedcom-ft-find")).toHaveClass(/is-open/);
      await expect.poll(async () => (await box(".gedcom-ft-search"))?.width ?? 0).toBeGreaterThan(100);
      await page.locator(".gedcom-ft-find-clear").click();
      await expect(page.locator(".gedcom-ft-name.is-dim")).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.locator(".gedcom-ft-find")).not.toHaveClass(/is-open/);
      await expect(page.locator(".gedcom-ft-find-toggle")).toBeVisible();
      await expect(page.locator(".gedcom-ft-find-toggle")).toBeFocused();
      await expect(page.locator(".gedcom-ft-search")).toBeHidden();
    });
  });
}

test.describe("the glide of the timeline to a match", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 300 });
  });

  async function step(page: Page): Promise<{ tops: number[]; blank: number }> {
    await mountTimeline(page);
    await page.locator(".gedcom-ft-find-toggle").click();
    await page.locator(".gedcom-ft-search").fill("joliot");
    const sampling = page.evaluate(
      () =>
        new Promise<{ tops: number[]; blank: number }>((done) => {
          const plot = document.querySelector<HTMLElement>(".gedcom-ft-plot");
          const tops: number[] = [];
          let blank = 0;
          const started = performance.now();
          const tick = () => {
            const box = plot?.getBoundingClientRect();
            tops.push(plot?.scrollTop ?? 0);
            const drawn = [...document.querySelectorAll(".gedcom-ft-life")].filter((one) => {
              const rect = one.getBoundingClientRect();
              return rect.bottom > (box?.top ?? 0) && rect.top < (box?.bottom ?? 0);
            });
            blank += drawn.length === 0 ? 1 : 0;
            if (performance.now() - started < 1100) {
              window.requestAnimationFrame(tick);
            } else {
              done({ tops, blank });
            }
          };
          tick();
        }),
    );
    await page.locator(".gedcom-ft-find-prev").click();
    return sampling;
  }

  test("scrolls through intermediate positions to the current row, with no blank frame on the way", async ({ page }) => {
    const { tops, blank } = await step(page);

    const final = tops[tops.length - 1] ?? 0;
    expect(final).toBeGreaterThan(0);
    expect(tops.filter((top) => top > 0 && top < final).length).toBeGreaterThanOrEqual(2);
    expect(blank).toBe(0);
    await expect(name(page, "@I17@")).toHaveClass(/is-current/);
  });

  test("jumps when the reader asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const { tops } = await step(page);

    const final = tops[tops.length - 1] ?? 0;
    expect(final).toBeGreaterThan(0);
    expect(tops.filter((top) => top > 0 && top < final)).toHaveLength(0);
  });
});

const ticks = (page: Page, kind: string) =>
  page.locator(`.gedcom-ft-axis .gedcom-ft-tick.is-${kind}`).evaluate((path) => (path.getAttribute("d") ?? "").split("M").length - 1);

test.describe("the axis of years of the timeline", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  for (const dark of [false, true]) {
    test(`is set apart from the corner and the rows by lines in the theme's border colour (${dark ? "dark" : "light"})`, async ({ page }) => {
      await mountTimeline(page, { dark });

      const lines = await page.evaluate(() => {
        const style = (selector: string) => getComputedStyle(document.querySelector(selector) as Element);
        const border = style(".gedcom-ft-names").borderInlineEndColor;
        return {
          border,
          cornerEnd: style(".gedcom-ft-axis-pad").borderInlineEndWidth,
          cornerEndColor: style(".gedcom-ft-axis-pad").borderInlineEndColor,
          namesEnd: style(".gedcom-ft-names").borderInlineEndWidth,
          bandEnd: style(".gedcom-ft-axis-band").borderInlineEndWidth,
          plotEnd: style(".gedcom-ft-plot").borderInlineEndWidth,
          cornerBottom: style(".gedcom-ft-axis-pad").borderBottomWidth,
          bandBottom: style(".gedcom-ft-axis-band").borderBottomWidth,
          bandBottomColor: style(".gedcom-ft-axis-band").borderBottomColor,
          plotBottom: style(".gedcom-ft-plot").borderBottomWidth,
          tick: style(".gedcom-ft-tick.is-major").stroke,
          text: style(".gedcom-ft-names").color,
        };
      });
      expect(lines.cornerEnd).toBe("1px");
      expect(lines.cornerEnd).toBe(lines.namesEnd);
      expect(lines.cornerEndColor).toBe(lines.border);
      expect(lines.bandEnd).toBe("0px");
      expect(lines.plotEnd).toBe("0px");
      expect(lines.cornerBottom).toBe("1px");
      expect(lines.bandBottom).toBe("1px");
      expect(lines.bandBottomColor).toBe(lines.border);
      expect(lines.plotBottom).toBe("0px");
      expect(lines.tick).not.toBe(lines.border);
      expect(lines.tick).not.toBe("none");
    });
  }

  test("ticks every year, every five and every ten at the initial zoom, the long ones on the labelled years", async ({ page }) => {
    await mountTimeline(page);

    const span = await page.evaluate(() => {
      const gridlines = [...document.querySelectorAll(".gedcom-ft-gridline")].map((line) => Number(line.getAttribute("x1")));
      const major = (document.querySelector(".gedcom-ft-axis .gedcom-ft-tick.is-major")?.getAttribute("d") ?? "")
        .split("M")
        .slice(1)
        .map((segment) => Number.parseFloat(segment));
      return { gridlines, major };
    });
    expect(span.major).toEqual(span.gridlines);
    const decades = span.major.length;
    expect(decades).toBeGreaterThan(5);
    expect(await ticks(page, "medium")).toBe(decades - 1);
    expect(await ticks(page, "minor")).toBe((decades - 1) * 8);
    await expect(page.locator(".gedcom-ft-axis .gedcom-ft-tick")).toHaveCount(3);

    const reach = await page.evaluate(() => {
      const base = document.querySelector(".gedcom-ft-axis")?.getBoundingClientRect().bottom ?? 0;
      return [...document.querySelectorAll(".gedcom-ft-axis .gedcom-ft-tick")].map((tick) => base - tick.getBoundingClientRect().top);
    });
    expect(reach[0]).toBeLessThan(reach[1]);
    expect(reach[1]).toBeLessThan(reach[2]);
  });

  test("leaves out the yearly ticks at the narrowest zoom and keeps the others", async ({ page }) => {
    await mountTimeline(page);
    for (let press = 0; press < 12; press += 1) {
      await page.locator(".gedcom-ft-zoom-out").click();
    }

    await expect(page.locator(".gedcom-ft-axis .gedcom-ft-tick.is-minor")).toHaveCount(0);
    expect(await ticks(page, "medium")).toBeGreaterThan(0);
    expect(await ticks(page, "major")).toBeGreaterThan(0);
  });

  test("draws the year cursor's label over the ticks", async ({ page }) => {
    await mountTimeline(page);
    const chart = await page.locator(".gedcom-ft-chart").boundingBox();
    await page.mouse.move((chart?.x ?? 0) + 400, (chart?.y ?? 0) + 60);

    await expect(page.locator(".gedcom-ft-axis-cursor")).toBeVisible();
    const order = await page.evaluate(() => {
      const children = [...(document.querySelector(".gedcom-ft-axis")?.children ?? [])];
      return {
        ticks: children.findIndex((child) => child.classList.contains("gedcom-ft-ticks")),
        cursor: children.findIndex((child) => child.classList.contains("gedcom-ft-axis-cursor")),
      };
    });
    expect(order.ticks).toBe(0);
    expect(order.cursor).toBeGreaterThan(order.ticks);
  });

  test("keeps the ticks under the window and the shapes that hold them few while scrolling far", async ({ page }) => {
    await mountTimeline(page);
    await page.locator(".gedcom-ft-zoom-in").click();
    await page.locator(".gedcom-ft-zoom-in").click();
    const before = await page.locator(".gedcom-ft-axis path").count();

    for (const left of [0, 700, 100_000]) {
      await page.locator(".gedcom-ft-plot").evaluate((plot, to) => {
        plot.scrollLeft = to;
      }, left);
      await page.waitForFunction(() => document.querySelector(".gedcom-ft-axis-clip") !== null);
      await expect(page.locator(".gedcom-ft-axis .gedcom-ft-tick")).toHaveCount(before);
    }
  });
});

test.describe("the zoom buttons of the timeline", () => {
  test("float in the corner of the board while the rows scroll, and widen and narrow the years", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 400 });
    await mountTimeline(page);

    await expect(page.locator("input[type=range]")).toHaveCount(0);
    const group = page.locator(".gedcom-ft-controls");
    const inside = async () => {
      const box = await group.boundingBox();
      const board = await page.locator(".gedcom-ft-board").boundingBox();
      return { box, board };
    };
    const before = await inside();
    expect(before.box?.x).toBeGreaterThan(before.board?.x ?? Infinity);
    expect((before.box?.x ?? 0) + (before.box?.width ?? 0)).toBeLessThanOrEqual((before.board?.x ?? 0) + (before.board?.width ?? 0));
    expect((before.box?.y ?? 0) + (before.box?.height ?? 0)).toBeLessThanOrEqual((before.board?.y ?? 0) + (before.board?.height ?? 0));

    await page.locator(".gedcom-ft-plot").evaluate((board) => {
      board.scrollTop = board.scrollHeight;
      board.scrollLeft = 300;
    });
    expect((await inside()).box).toEqual(before.box);

    const width = () => page.locator(".gedcom-ft-chart").evaluate((chart) => chart.getBoundingClientRect().width);
    const start = await width();
    await page.locator(".gedcom-ft-zoom-in").click();
    const wider = await width();
    expect(wider).toBeGreaterThan(start);
    await page.locator(".gedcom-ft-zoom-out").click();
    await page.locator(".gedcom-ft-zoom-out").click();
    expect(await width()).toBeLessThan(start);
    await page.locator(".gedcom-ft-fit").click();
    const board = await page.locator(".gedcom-ft-board").boundingBox();
    const names = await page.locator(".gedcom-ft-names").boundingBox();
    expect(await width()).toBeLessThanOrEqual((board?.width ?? 0) - (names?.width ?? 0) + 2);
  });
});

for (const viewport of [{ width: 1400, height: 600 }, { width: 390, height: 500 }]) {
  test.describe(`the scrollbars of the timeline at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("belong to the rows and years only, and leave the axis, the names and the corner alone", async ({ page }) => {
      await mountTimeline(page, { phone: viewport.width < 600 });
      await page.addStyleTag({ content: ".gedcom-ft-plot::-webkit-scrollbar { width: 15px; height: 15px; } .gedcom-ft-plot::-webkit-scrollbar-thumb { background: #888; border-radius: 6px; }" });
      await page.locator(".gedcom-ft-zoom-in").click();

      const m = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
        const plot = document.querySelector<HTMLElement>(".gedcom-ft-plot");
        return {
          names: box(".gedcom-ft-names"),
          axis: box(".gedcom-ft-axis-band"),
          corner: box(".gedcom-ft-axis-pad"),
          plot: box(".gedcom-ft-plot"),
          verticalBar: (plot?.offsetWidth ?? 0) - (plot?.clientWidth ?? 0),
          horizontalBar: (plot?.offsetHeight ?? 0) - (plot?.clientHeight ?? 0),
          namesBar: (document.querySelector<HTMLElement>(".gedcom-ft-names")?.offsetWidth ?? 0) - (document.querySelector<HTMLElement>(".gedcom-ft-names")?.clientWidth ?? 0),
        };
      });
      expect(m.verticalBar).toBeGreaterThan(0);
      expect(m.horizontalBar).toBeGreaterThan(0);
      expect(m.namesBar).toBeLessThanOrEqual(1);
      expect(m.names?.right ?? Infinity).toBeLessThanOrEqual((m.plot?.left ?? 0) + 0.5);
      expect(m.axis?.bottom ?? Infinity).toBeLessThanOrEqual((m.plot?.top ?? 0) + 0.5);
      expect(m.corner?.bottom ?? Infinity).toBeLessThanOrEqual((m.plot?.top ?? 0) + 0.5);
      expect(m.corner?.right ?? Infinity).toBeLessThanOrEqual((m.plot?.left ?? 0) + 0.5);
      expect((m.names?.bottom ?? Infinity)).toBeLessThanOrEqual((m.plot?.bottom ?? 0) - m.horizontalBar + 0.5);
      expect((m.axis?.right ?? 0)).toBeLessThanOrEqual((m.plot?.right ?? 0) + 0.5);

      await page.locator(".gedcom-ft-plot").evaluate((plot) => {
        plot.scrollTop = plot.scrollHeight;
        plot.scrollLeft = plot.scrollWidth;
      });
      await expect
        .poll(() => page.evaluate(() => document.querySelector<HTMLElement>(".gedcom-ft-names")?.scrollTop ?? 0))
        .toBeGreaterThan(0);
      await expect
        .poll(() => page.evaluate(() => document.querySelector<HTMLElement>(".gedcom-ft-axis-clip")?.scrollLeft ?? 0))
        .toBeGreaterThan(0);
      const synced = await page.evaluate(() => ({
        plotTop: document.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollTop,
        namesTop: document.querySelector<HTMLElement>(".gedcom-ft-names")?.scrollTop,
        plotLeft: document.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollLeft,
        axisLeft: document.querySelector<HTMLElement>(".gedcom-ft-axis-clip")?.scrollLeft,
      }));
      expect(synced.plotTop).toBeGreaterThan(0);
      expect(synced.namesTop).toBe(synced.plotTop);
      expect(synced.plotLeft).toBeGreaterThan(0);
      expect(synced.axisLeft).toBe(synced.plotLeft);
    });
  });
}

test.describe("the timeline of a file on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("fits the screen's width, with the years scrolling inside it", async ({ page }) => {
    await mountTimeline(page, { phone: true });

    const page_ = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      board: document.querySelector(".gedcom-ft-plot")?.scrollWidth ?? 0,
      names: document.querySelector<HTMLElement>(".gedcom-ft-names")?.offsetWidth ?? 0,
    }));
    expect(page_.document).toBe(true);
    expect(page_.board).toBeGreaterThan(390);
    expect(page_.names).toBe(120);
  });

  test("gives the board the whole height, from the top, with nothing above or below it", async ({ page }) => {
    await mountTimeline(page, { phone: true });

    const box = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
      const root = rect(".gedcom-ft");
      const board = rect(".gedcom-ft-board");
      const below = [...document.querySelectorAll(".gedcom-ft > *")]
        .filter((node) => getComputedStyle(node).position !== "absolute" && !node.classList.contains("gedcom-ft-stage"))
        .map((node) => node.getBoundingClientRect())
        .filter((rectangle) => rectangle.height > 0 && rectangle.top >= (board?.bottom ?? 0));
      return {
        top: root?.top ?? 0,
        boardTop: board?.top ?? 0,
        boardBottom: board?.bottom ?? 0,
        below: below.length,
        pageScrolls: document.documentElement.scrollHeight > document.documentElement.clientHeight,
      };
    });
    expect(box.below).toBe(0);
    expect(box.pageScrolls).toBe(false);
    expect(box.boardBottom).toBeCloseTo(844, 0);
    expect(box.boardTop - box.top).toBeLessThan(2);
  });

  test("lights Marie's family and places the cursor on the first touch, and opens her on the second", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    await page.locator(".gedcom-ft-plot").evaluate((board) => {
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
    await expect(name(page, "@I1@")).toHaveClass(/is-hl/);
  });

  test("shows a touched mark's event, with the way to its lines", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    await page.locator(".gedcom-ft-plot").evaluate((board) => {
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
    await page.locator(".gedcom-ft-plot").evaluate((board) => {
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
  });
});

test.describe("the timeline of a file of 10 000 people", () => {
  test("draws only the rows near the view while scrolling, and follows the pointer", async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await mountTimeline(page, { doc: generated(10_000), whole: true });

    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
    expect(await page.locator(".gedcom-ft-axis .gedcom-ft-tick").count()).toBeLessThanOrEqual(3);
    const drawn = () => page.locator(".gedcom-ft-name").count();
    expect(await drawn()).toBeLessThan(300);

    for (const top of [50_000, 150_000, 300_000]) {
      await page.locator(".gedcom-ft-plot").evaluate((board, to) => {
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
      node.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
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
    expect(slowest).toBeLessThan(50);
  });
});
