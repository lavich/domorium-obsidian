import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

import type { TimelineOptions } from "../harness/fileTimeline";
import { generated } from "./generated";

test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

const ZOOM = 6;
const PAD = 12;
const FIRST_DECADE = 1820;

async function mountTimeline(page: Page, options: TimelineOptions = {}): Promise<number> {
  await page.goto(pathToFileURL(resolve("harness/fileTimeline.html")).href);
  const took = await page.evaluate((timelineOptions) => window.timeline.mount(timelineOptions), options);
  await page.waitForSelector(".gedcom-ft-life");
  return took;
}

const label = (page: Page, xref: string) => page.locator(`.gedcom-ft-label[data-p="${xref}"]`);
const life = (page: Page, xref: string) => page.locator(`.gedcom-ft-life[data-p="${xref}"]`);

const rgb = (value: string): number[] => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
const luminance = ([r = 0, g = 0, b = 0]: number[]): number => {
  const linear = (channel: number) => {
    const unit = channel / 255;
    return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
};
const contrast = (a: string, b: string): number => {
  const [light = 0, dark = 0] = [luminance(rgb(a)), luminance(rgb(b))].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
const fillOf = (locator: Locator) => locator.evaluate((node) => getComputedStyle(node).fill);
const opacityOf = (locator: Locator) => locator.evaluate((node) => getComputedStyle(node).opacity);

async function yearX(page: Page, year: number): Promise<number> {
  const chart = await page.locator(".gedcom-ft-chart").boundingBox();
  return (chart?.x ?? 0) + PAD + (year - FIRST_DECADE) * ZOOM;
}

test.describe("the timeline of a file", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  test("writes Marie's name inside her bar, with no years and no column of names", async ({ page }) => {
    await mountTimeline(page);

    await expect(page.locator(".gedcom-ft-names, .gedcom-ft-name, .gedcom-ft-axis-pad")).toHaveCount(0);
    await expect(label(page, "@I1@")).toHaveText("Marie Skłodowska-Curie");
    expect(await page.locator(".gedcom-ft-board").innerText()).not.toContain("1867–1934");
    const bar = await life(page, "@I1@").boundingBox();
    const name = await label(page, "@I1@").boundingBox();
    expect(bar?.x).toBeCloseTo(await yearX(page, 1867), 0);
    expect((bar?.x ?? 0) + (bar?.width ?? 0)).toBeCloseTo(await yearX(page, 1934), 0);
    expect(name?.x ?? 0).toBeGreaterThanOrEqual(bar?.x ?? 0);
    expect((name?.x ?? 0) + (name?.width ?? 0)).toBeLessThanOrEqual((bar?.x ?? 0) + (bar?.width ?? 0));
    expect(name?.y ?? 0).toBeGreaterThanOrEqual((bar?.y ?? 0) - 2);
    expect((name?.y ?? 0) + (name?.height ?? 0)).toBeLessThanOrEqual((bar?.y ?? 0) + (bar?.height ?? 0));
  });

  test("colours the bars of one family alike and of two families differently", async ({ page }) => {
    await mountTimeline(page);
    const fill = (name: string) => fillOf(page.locator(`.gedcom-ft-life[aria-label="${name}"]`));

    expect(await fill("Zofia Skłodowska")).toBe(await fill("Józef Skłodowski"));
    expect(await fill("Zofia Skłodowska")).not.toBe(await fill("Pierre Curie"));
  });

  test("marks the marriage on both bars, and draws the dashed line only when Marie is clicked", async ({ page }) => {
    await mountTimeline(page);

    await expect(page.locator(".gedcom-ft-marriage")).toHaveCount(0);
    await life(page, "@I1@").click();
    const at = await yearX(page, 1895);
    const lines = await page.locator(".gedcom-ft-marriage").evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect()).map((box) => ({ x: box.x, height: box.height })),
    );
    expect(lines).toHaveLength(1);
    expect(Math.abs((lines[0]?.x ?? 0) - at)).toBeLessThan(2);
    expect(await page.locator(".gedcom-ft-marriage").evaluate((line) => getComputedStyle(line).strokeDasharray)).not.toBe("none");
    await expect(page.locator(".gedcom-ft-marriage-dot")).toHaveCount(2);
    await page.addStyleTag({ content: ".gedcom-ft-marriage-dot { pointer-events: auto !important; }" });
    const seen = await page.locator(".gedcom-ft-marriage-dot").evaluateAll((dots) => {
      const centres = dots
        .map((dot) => dot.getBoundingClientRect())
        .map((box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 }))
        .sort((a, b) => a.y - b.y);
      return centres.map((centre, at) => {
        const hit = document.elementFromPoint(centre.x, centre.y + (at === 0 ? 2.5 : -1.5));
        return { dot: hit?.classList.contains("gedcom-ft-marriage-dot") === true, bar: hit?.classList.contains("gedcom-ft-life") === true };
      });
    });
    expect(seen).toEqual([{ dot: true, bar: false }, { dot: true, bar: false }]);
    const span = await page.locator('.gedcom-ft-span[data-p="@I2@"]').boundingBox();
    expect(span?.width).toBeCloseTo((1906 - 1895) * ZOOM, 0);
  });

  test("keeps a name where it is under the pointer and when selected", async ({ page }) => {
    await mountTimeline(page);
    const place = () => label(page, "@I2@").boundingBox();
    const before = await place();

    await life(page, "@I2@").hover();
    expect(await place()).toEqual(before);

    await page.mouse.move(2, 2);
    await life(page, "@I2@").evaluate((bar) => bar.classList.add("is-selected"));
    expect(await place()).toEqual(before);
  });

  test("names a bar for a reader without a tooltip over it", async ({ page }) => {
    await mountTimeline(page);

    await expect(life(page, "@I1@")).toHaveAttribute("role", "button");
    await expect(life(page, "@I1@")).toHaveAccessibleName("Marie Skłodowska-Curie");
  });

  test("fades no one when the pointer is on Marie, and moves over the bars", async ({ page }) => {
    await mountTimeline(page);
    await life(page, "@I1@").hover();
    await life(page, "@I11@").hover();
    await page.waitForTimeout(400);

    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(0);
    await expect(page.locator(".gedcom-ft-board.has-hl")).toHaveCount(0);
    expect(await opacityOf(life(page, "@I11@"))).toBe("1");
    expect(await opacityOf(life(page, "@I2@"))).toBe("1");
  });

  test("picks out Marie's family with links when she is clicked, and puts the light out on empty space and on Escape", async ({ page }) => {
    await mountTimeline(page);
    await life(page, "@I1@").click();

    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(4);
    expect(await page.locator('.gedcom-ft-kin[data-from="@I2@"]').count()).toBe(0);
    await expect.poll(() => opacityOf(life(page, "@I11@"))).toBe("0.18");
    expect(await opacityOf(life(page, "@I2@"))).toBe("1");
    expect(await page.locator(".gedcom-ft-kin").first().getAttribute("marker-end")).toContain("gedcom-ft-arrow");

    await life(page, "@I12@").click();
    await expect(life(page, "@I12@")).toHaveClass(/is-hl/);
    await expect(life(page, "@I1@")).not.toHaveClass(/is-hl/);

    await page.locator(".gedcom-ft-chart").click({ position: { x: 2, y: 2 } });
    await expect.poll(() => opacityOf(life(page, "@I11@"))).toBe("1");
    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(0);

    await life(page, "@I1@").click();
    await expect.poll(() => opacityOf(life(page, "@I11@"))).toBe("0.18");
    await page.keyboard.press("Escape");
    await expect.poll(() => opacityOf(life(page, "@I11@"))).toBe("1");
    await expect(life(page, "@I1@")).toHaveClass(/is-selected/);
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
    await life(page, "@I12@").click();
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I12@"]);
  });

  test("shows the person's name and nothing else over a bar, and a mark's event over a mark", async ({ page }) => {
    await mountTimeline(page);
    await life(page, "@I1@").hover({ position: { x: 40, y: 8 } });

    await expect(page.locator(".gedcom-ft-tip.is-shown")).toHaveText("Marie Skłodowska-Curie");
    expect(await life(page, "@I1@").evaluate((bar) => getComputedStyle(bar).stroke)).not.toBe("none");
    await page.locator('.gedcom-ft-mark.is-birth[data-p="@I1@"]').hover();
    await expect(page.locator(".gedcom-ft-tip.is-shown")).not.toContainText("Marie");
  });

  test("puts a year cursor at 1906 with Marie at 39 and Irène at 9, and the selected person's age on the axis", async ({ page }) => {
    await mountTimeline(page);
    const row = await life(page, "@I13@").boundingBox();
    const middle = (row?.y ?? 0) + (row?.height ?? 0) / 2;
    await page.mouse.move(await yearX(page, 1906), middle);

    await expect(page.locator(".gedcom-ft-axis-cursor")).toHaveText("1906");
    await expect(page.locator('.gedcom-ft-age[data-p="@I1@"]')).toHaveText("39");
    await expect(page.locator('.gedcom-ft-age[data-p="@I12@"]')).toHaveText("9");

    await life(page, "@I1@").click();
    await page.mouse.move(await yearX(page, 1906), middle);
    await expect(page.locator(".gedcom-ft-axis-cursor")).toHaveText("1906 · 39");
    await page.mouse.move(await yearX(page, 1850), middle);
    await expect(page.locator(".gedcom-ft-axis-cursor")).toHaveText("1850");
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

  test("takes the bar's fill from the scheme, and a name 4.5:1 on it across the hues, ringed or dimmed", async ({ page }) => {
    const surnames = [
      "Abramov", "Belov", "Volkov", "Gromov", "Dmitriev", "Egorov", "Zhukov", "Ivanov", "Kuznetsov", "Lobanov",
      "Morozov", "Nikitin", "Orlov", "Petrov", "Romanov", "Sidorov", "Titov", "Ulanov", "Fedorov", "Kharitonov",
      "Tsvetkov", "Chernov", "Sharov", "Shchukin", "Yakovlev", "Zaytsev", "Квасов", "Мартынов",
    ];
    const doc = [
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      ...surnames.flatMap((surname, at) => [`0 @H${at}@ INDI`, `1 NAME Name /${surname}/`, "1 BIRT", "2 DATE 1900", "1 DEAT", "2 DATE 1960"]),
      "0 TRLR", "",
    ].join("\n");
    const fills: string[] = [];
    for (const dark of [false, true]) {
      await mountTimeline(page, { doc, dark });
      await life(page, "@H3@").click();
      await page.locator(".gedcom-ft-find-toggle").click();
      await page.locator(".gedcom-ft-search").fill("kuznetsov");
      const pairs = await page.locator(".gedcom-ft-label").evaluateAll((nodes) =>
        nodes.map((node) => {
          const bar = document.querySelector(`.gedcom-ft-life[data-p="${node.getAttribute("data-p")}"]`);
          return { ink: getComputedStyle(node).fill, fill: bar ? getComputedStyle(bar).fill : "" };
        }),
      );
      expect(pairs).toHaveLength(surnames.length);
      for (const pair of pairs) {
        expect(contrast(pair.ink, pair.fill), `${pair.ink} on ${pair.fill} (${dark ? "dark" : "light"})`).toBeGreaterThanOrEqual(4.5);
      }
      fills.push(await fillOf(life(page, "@H0@")));
    }
    expect(fills[0]).not.toBe(fills[1]);
  });

  test("cuts a name wider than its bar inside the bar, and shows the whole name on the bar's tooltip", async ({ page }) => {
    const doc = [
      "0 HEAD", "1 GEDC", "2 VERS 7.0",
      "0 @A@ INDI", "1 NAME Alexandra Maria Theresia /Habsburg-Lothringen/", "1 BIRT", "2 DATE 1899", "1 DEAT", "2 DATE 1920",
      "0 @B@ INDI", "1 NAME Boris /Beta/", "1 BIRT", "2 DATE 1905", "1 DEAT", "2 DATE 1990",
      "0 TRLR", "",
    ].join("\n");
    for (const dark of [false, true]) {
      await mountTimeline(page, { doc, dark });

      const bar = await life(page, "@A@").boundingBox();
      const name = await label(page, "@A@").boundingBox();
      expect(name?.x ?? 0).toBeGreaterThanOrEqual(bar?.x ?? 0);
      expect((name?.x ?? 0) + (name?.width ?? 0)).toBeLessThanOrEqual((bar?.x ?? 0) + (bar?.width ?? 0));
      expect(await label(page, "@A@").textContent()).toMatch(/…$/u);
      await life(page, "@A@").hover();
      await expect(page.locator(".gedcom-ft-tip.is-shown")).toHaveText("Alexandra Maria Theresia Habsburg-Lothringen");
      await life(page, "@A@").click();
      expect(await page.evaluate(() => window.timeline.calls.opened)).toContain("@A@");
      const other = await life(page, "@B@").boundingBox();
      expect(Math.abs((other?.y ?? 0) - (bar?.y ?? 0))).toBeGreaterThan(1);
    }
  });

  test("draws the marks of Marie's events along her bar's lower edge, below her name", async ({ page }) => {
    await mountTimeline(page);

    const name = await label(page, "@I1@").boundingBox();
    const marks = await page.locator('.gedcom-ft-mark[data-p="@I1@"] circle').evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect()).map((box) => ({ top: box.top, bottom: box.bottom })),
    );
    expect(marks.length).toBeGreaterThan(2);
    for (const mark of marks) {
      expect(mark.top).toBeGreaterThanOrEqual((name?.y ?? 0) + (name?.height ?? 0) - 0.5);
    }
  });

  test("gives each of the 17 people a row of their own, and none to a person with no date", async ({ page }) => {
    await mountTimeline(page);

    const rows = await page.locator(".gedcom-ft-life").evaluateAll((nodes) =>
      nodes.map((node) => Math.round(node.getBoundingClientRect().y)),
    );
    expect(rows).toHaveLength(17);
    expect(new Set(rows).size).toBe(17);
    await expect(page.locator('.gedcom-ft-label[data-p="@I18@"]')).toHaveCount(0);
  });

  test("opens a person from the keyboard, and Branch from the command, which reads pressed while the branch is shown", async ({ page }) => {
    await mountTimeline(page);
    await life(page, "@I12@").focus();
    await expect(page.locator(".gedcom-ft-board.has-hl")).toHaveCount(0);
    await page.keyboard.press("Space");
    await expect(life(page, "@I12@")).toHaveClass(/is-hl/);
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I12@"]);
    await page.keyboard.press("Tab");
    await expect(page.locator(".gedcom-ft-board.has-hl")).toHaveCount(1);
    await expect(life(page, "@I12@")).toHaveClass(/is-hl/);

    const branch = page.locator("[data-branch]");
    await expect(branch).toHaveCount(1);
    await expect(branch).toHaveAttribute("data-branch", "@I12@");
    await branch.focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".gedcom-ft-life")).toHaveCount(10);
    await expect(page.locator("[data-branch]")).toHaveAttribute("aria-pressed", "true");
    await page.evaluate(() => window.timeline.branchOfSelected());
    await expect(page.locator(".gedcom-ft-life")).toHaveCount(17);
    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
  });

  test("offers Branch on the selected bar alone, beyond its end, and keeps it after Escape", async ({ page }) => {
    await mountTimeline(page);
    await life(page, "@I1@").click();
    const branch = page.locator("[data-branch]");

    await expect(branch).toHaveCount(1);
    await expect(branch).toHaveAttribute("data-branch", "@I1@");
    const bar = await life(page, "@I1@").boundingBox();
    const button = await branch.boundingBox();
    expect(button?.x ?? 0).toBeGreaterThan((bar?.x ?? 0) + (bar?.width ?? 0));
    await page.keyboard.press("Escape");
    await expect(branch).toBeVisible();
    await life(page, "@I2@").click();
    await expect(page.locator("[data-branch]")).toHaveAttribute("data-branch", "@I2@");
  });

  test("shows Irène's branch, ten of the file's seventeen people with a bar, and returns to the whole file", async ({ page }) => {
    await mountTimeline(page);
    await life(page, "@I12@").click();
    await page.locator("[data-branch]").click();

    await expect(page.locator(".gedcom-ft-life")).toHaveCount(10);
    await expect(page.locator(".gedcom-ft-scope")).toContainText("Branch of Irène Joliot-Curie · 10 of 17 people");
    await page.locator(".gedcom-ft-whole").click();
    await expect(page.locator(".gedcom-ft-life")).toHaveCount(17);
  });

  test("fades and lights smoothly, and at once where the reader asks for less motion", async ({ page }) => {
    await mountTimeline(page);
    const transition = () => life(page, "@I1@").evaluate((bar) => getComputedStyle(bar).transitionProperty);

    expect(await transition()).toContain("opacity");
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(await transition()).toBe("none");
    await life(page, "@I1@").click();
    expect(await opacityOf(life(page, "@I11@"))).toBe("0.18");
  });

  test("keeps the years in place while the board scrolls", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 500 });
    await mountTimeline(page);
    const before = await page.locator(".gedcom-ft-axis").boundingBox();
    await page.locator(".gedcom-ft-plot").evaluate((board) => {
      board.scrollTop = 200;
      board.scrollLeft = 300;
    });

    expect((await page.locator(".gedcom-ft-axis").boundingBox())?.y).toBeCloseTo(before?.y ?? 0, 0);
  });
});

for (const viewport of [{ width: 1400, height: 600 }, { width: 390, height: 844 }]) {
  test.describe(`the search over the timeline at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("floats inside the board under the axis, beside the zoom buttons, and keeps a query open", async ({ page }) => {
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
      expect((closed?.x ?? 0) + (closed?.width ?? 0)).toBeLessThanOrEqual(zoomGroup?.x ?? 0);
      expect(Math.abs((closed?.y ?? 0) + (closed?.height ?? 0) / 2 - (zoomGroup?.y ?? 0) - (zoomGroup?.height ?? 0) / 2)).toBeLessThan(2);
      expect(closed?.height ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 0);

      await expect(page.locator(".gedcom-ft-find-toggle")).toBeVisible();
      await expect(page.locator(".gedcom-ft-search")).toBeHidden();
      const frames = await page.evaluate((p) => {
        const width = (selector: string) => getComputedStyle(document.querySelector(selector) as Element).borderTopWidth;
        return [width(`.gedcom-${p}-dock`), width(`.gedcom-${p}-find`), width(`.gedcom-${p}-controls`)];
      }, "ft");
      expect(frames).toEqual(["1px", "0px", "0px"]);
      const zoomBefore = await box(".gedcom-ft-controls");
      await page.locator(".gedcom-ft-find-toggle").click();
      await expect(page.locator(".gedcom-ft-search")).toBeFocused();
      await expect.poll(async () => (await box(".gedcom-ft-search"))?.width ?? 0).toBeGreaterThan(30);
      expect(await box(".gedcom-ft-controls")).toEqual(zoomBefore);
      await expect(page.locator(".gedcom-ft-find-toggle")).toBeHidden();
      await page.locator(".gedcom-ft-search").fill("joliot");
      await expect(page.locator(".gedcom-ft-life:not(.is-dim)")).toHaveCount(4);
      await expect(page.locator(".gedcom-ft-find-count")).toHaveText("4 matches");
      await page.locator(".gedcom-ft-find-next").click();
      await expect(page.locator(".gedcom-ft-find-count")).toHaveText("1 / 4");
      await expect(life(page, "@I12@")).toHaveClass(/is-current/);
      await expect(page.locator(".gedcom-ft-search")).toBeFocused();
      await expect
        .poll(async () => {
          const plot = await box(".gedcom-ft-plot");
          const row = await life(page, "@I12@").boundingBox();
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
      await expect(life(page, "@I17@")).toHaveClass(/is-current/);
      const filled = await box(".gedcom-ft-find");
      expect((filled?.x ?? 0) + (filled?.width ?? 0)).toBeLessThanOrEqual((board?.x ?? 0) + (board?.width ?? 0));
      expect(filled?.x ?? 0).toBeGreaterThanOrEqual(board?.x ?? 0);
      const arrows = await page.locator(".gedcom-ft-find-prev").boundingBox();
      expect(arrows?.width ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 24);
      await page.locator("body").click({ position: { x: 5, y: 5 } });
      await expect(page.locator(".gedcom-ft-find")).toHaveClass(/is-open/);
      await expect.poll(async () => (await box(".gedcom-ft-search"))?.width ?? 0).toBeGreaterThan(100);
      await page.locator(".gedcom-ft-find-clear").click();
      await expect(page.locator(".gedcom-ft-life.is-dim")).toHaveCount(0);
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

  const rows = [
    "0 HEAD", "1 GEDC", "2 VERS 7.0",
    "0 @A@ INDI", "1 NAME Joliot First", "1 BIRT", "2 DATE 1900", "1 DEAT", "2 DATE 1960",
    ...Array.from({ length: 12 }, (_, at) => [`0 @F${at}@ INDI`, `1 NAME Other ${at}`, "1 BIRT", "2 DATE 1900", "1 DEAT", "2 DATE 1960"]).flat(),
    "0 @Z@ INDI", "1 NAME Joliot Last", "1 BIRT", "2 DATE 1900", "1 DEAT", "2 DATE 1960",
    "0 TRLR", "",
  ].join("\n");

  async function step(page: Page): Promise<{ tops: number[]; blank: number }> {
    await mountTimeline(page, { doc: rows });
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

  test("scrolls through intermediate positions to the current bar, with no blank frame on the way", async ({ page }) => {
    const { tops, blank } = await step(page);

    const final = tops[tops.length - 1] ?? 0;
    expect(final).toBeGreaterThan(0);
    expect(tops.filter((top) => top > 0 && top < final).length).toBeGreaterThanOrEqual(2);
    expect(blank).toBe(0);
    await expect(life(page, "@Z@")).toHaveClass(/is-current/);
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
    test(`is set apart from the rows by a line in the theme's border colour, with no corner at its left (${dark ? "dark" : "light"})`, async ({ page }) => {
      await mountTimeline(page, { dark });

      const lines = await page.evaluate(() => {
        const style = (selector: string) => getComputedStyle(document.querySelector(selector) as Element);
        const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
        return {
          border: style(".gedcom-ft-axis-band").borderBottomColor,
          bandBottom: style(".gedcom-ft-axis-band").borderBottomWidth,
          plotBottom: style(".gedcom-ft-plot").borderBottomWidth,
          tick: style(".gedcom-ft-tick.is-major").stroke,
          bandLeft: box(".gedcom-ft-axis-band")?.left,
          boardLeft: box(".gedcom-ft-board")?.left,
        };
      });
      expect(lines.bandBottom).toBe("1px");
      expect(lines.plotBottom).toBe("0px");
      expect(lines.bandLeft).toBe(lines.boardLeft);
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
    const fitted = await page.evaluate(() => {
      const lines = [...document.querySelectorAll(".gedcom-ft-gridline")].map((line) => Number(line.getAttribute("x1")));
      return { span: Math.max(...lines) - Math.min(...lines) + 24, room: document.querySelector<HTMLElement>(".gedcom-ft-plot")?.clientWidth ?? 0 };
    });
    expect(Math.abs(fitted.span - fitted.room)).toBeLessThan(12);
  });
});

for (const viewport of [{ width: 1400, height: 380 }, { width: 390, height: 500 }]) {
  test.describe(`the scrollbars of the timeline at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("belong to the rows and years only, and leave the axis alone", async ({ page }) => {
      await mountTimeline(page, { phone: viewport.width < 600 });
      await page.addStyleTag({ content: ".gedcom-ft-plot::-webkit-scrollbar { width: 15px; height: 15px; } .gedcom-ft-plot::-webkit-scrollbar-thumb { background: #888; border-radius: 6px; }" });
      await page.locator(".gedcom-ft-zoom-in").click();

      const m = await page.evaluate(() => {
        const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
        const plot = document.querySelector<HTMLElement>(".gedcom-ft-plot");
        return {
          axis: box(".gedcom-ft-axis-band"),
          plot: box(".gedcom-ft-plot"),
          horizontalBar: (plot?.offsetHeight ?? 0) - (plot?.clientHeight ?? 0),
        };
      });
      expect(m.horizontalBar).toBeGreaterThan(0);
      expect(m.axis?.bottom ?? Infinity).toBeLessThanOrEqual((m.plot?.top ?? 0) + 0.5);
      expect(m.axis?.right ?? 0).toBeLessThanOrEqual((m.plot?.right ?? 0) + 0.5);

      await page.locator(".gedcom-ft-plot").evaluate((plot) => {
        plot.scrollTop = plot.scrollHeight;
        plot.scrollLeft = plot.scrollWidth;
      });
      const offset = () =>
        page.evaluate(
          () =>
            (document.querySelector<HTMLElement>(".gedcom-ft-plot")?.scrollLeft ?? 0) -
            (document.querySelector<HTMLElement>(".gedcom-ft-axis-clip")?.scrollLeft ?? 0),
        );
      await expect.poll(offset).toBe(0);
      expect(await page.locator(".gedcom-ft-plot").evaluate((plot) => plot.scrollLeft)).toBeGreaterThan(0);
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
      view: document.querySelector<HTMLElement>(".gedcom-ft-plot")?.clientWidth ?? 0,
    }));
    expect(page_.document).toBe(true);
    expect(page_.board).toBeGreaterThan(390);
    expect(page_.view).toBeGreaterThanOrEqual(375);
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

    await expect(life(page, "@I1@")).toHaveClass(/is-hl/);
    await expect(page.locator(".gedcom-ft-kin")).toHaveCount(4);
    await expect(page.locator(".gedcom-ft-tip.is-shown")).toHaveText("Marie Skłodowska-Curie");
    const touched = Math.round(FIRST_DECADE + (at.x - (await yearX(page, FIRST_DECADE))) / ZOOM);
    await expect(page.locator(".gedcom-ft-axis-cursor")).toHaveText(String(touched));
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual([]);

    await page.touchscreen.tap(at.x, at.y);
    expect(await page.evaluate(() => window.timeline.calls.opened)).toEqual(["@I1@"]);
    await expect(life(page, "@I1@")).toHaveClass(/is-hl/);
    await expect(life(page, "@I1@")).toHaveClass(/is-selected/);

    await page.touchscreen.tap(at.x, 2);
    await expect(page.locator(".gedcom-ft-board.has-hl")).toHaveCount(0);
    await expect(page.locator(".gedcom-ft-tip.is-shown")).toHaveCount(0);
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
    await page.locator('.gedcom-ft-mark.is-birth[data-p="@I17@"]').scrollIntoViewIfNeeded();
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
    await expect(life(page, "@I500@")).toHaveCount(1);
    await page.locator(".gedcom-ft-whole").click();
    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
  });
});

test.describe("the timeline of a file of 10 000 people", () => {
  test("draws only the bars near the view while scrolling, scrolls without a blank frame, and follows the pointer", async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await mountTimeline(page, { doc: generated(10_000), whole: true });

    await expect(page.locator(".gedcom-ft-scope")).toBeHidden();
    expect(await page.locator(".gedcom-ft-axis .gedcom-ft-tick").count()).toBeLessThanOrEqual(3);
    expect(await page.locator('.gedcom-ft-life[tabindex="0"]').count()).toBe(1);
    const drawn = () => page.locator(".gedcom-ft-life").count();
    expect(await drawn()).toBeLessThan(600);

    const room = await page.locator(".gedcom-ft-plot").evaluate((plot) => plot.scrollHeight - plot.clientHeight);
    expect(room).toBeGreaterThan(5_000);
    for (const share of [0.2, 0.5, 0.9]) {
      await page.locator(".gedcom-ft-plot").evaluate((plot, to) => {
        plot.scrollTop = to;
      }, room * share);
      await page.waitForFunction(() => {
        const box = document.querySelector(".gedcom-ft-plot")?.getBoundingClientRect();
        return [...document.querySelectorAll(".gedcom-ft-life")].some((bar) => {
          const rect = bar.getBoundingClientRect();
          return rect.bottom > (box?.top ?? 0) && rect.top < (box?.bottom ?? 0);
        });
      });
      expect(await drawn()).toBeLessThan(600);
      expect(await page.locator(".gedcom-ft-items > *").count()).toBeLessThan(3000);
    }

    const blank = await page.evaluate(
      () =>
        new Promise<number>((done) => {
          const plot = document.querySelector<HTMLElement>(".gedcom-ft-plot");
          let missed = 0;
          let step = 0;
          const tick = () => {
            if (plot) {
              plot.scrollTop = Math.max(0, plot.scrollTop - 700);
            }
            const box = plot?.getBoundingClientRect();
            const seen = [...document.querySelectorAll(".gedcom-ft-life")].some((bar) => {
              const rect = bar.getBoundingClientRect();
              return rect.bottom > (box?.top ?? 0) && rect.top < (box?.bottom ?? 0);
            });
            missed += seen ? 0 : 1;
            step += 1;
            if (step < 40) {
              window.requestAnimationFrame(tick);
            } else {
              done(missed);
            }
          };
          tick();
        }),
    );
    expect(blank).toBe(0);

    const bar = page.locator(".gedcom-ft-life").nth(40);
    const took = await bar.evaluate((node) => {
      const started = performance.now();
      node.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      return performance.now() - started;
    });
    await expect(bar).toHaveClass(/is-hl/);
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

for (const viewport of [{ width: 1400, height: 700 }, { width: 390, height: 844 }]) {
  test.describe(`the bars of the timeline at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("keep each name inside its bar, and no mark across a name", async ({ page }) => {
      await mountTimeline(page, { phone: viewport.width < 600 });

      const found = await page.evaluate(() => {
        const box = (node: Element) => node.getBoundingClientRect();
        return [...document.querySelectorAll<SVGElement>(".gedcom-ft-life")].map((bar) => {
          const xref = bar.getAttribute("data-p");
          const name = document.querySelector(`.gedcom-ft-label[data-p="${xref}"]`);
          const marks = [...document.querySelectorAll(`.gedcom-ft-mark[data-p="${xref}"] circle`)].map((mark) => box(mark));
          const own = box(bar);
          const text = name ? box(name) : null;
          return {
            named: text !== null,
            inside: text !== null && text.left >= own.left - 0.5 && text.right <= own.right + 0.5,
            clear: marks.every((mark) => text === null || mark.top >= text.bottom - 0.5 || mark.left >= text.right || mark.right <= text.left),
          };
        });
      });
      expect(found).toHaveLength(17);
      expect(found.every((bar) => bar.inside || !bar.named)).toBe(true);
      expect(found.every((bar) => bar.clear)).toBe(true);
    });

    test("carry Branch on the selected bar, inside the board and out of the way of the name", async ({ page }) => {
      await mountTimeline(page, { phone: viewport.width < 600 });
      await page.evaluate(() => window.timeline.select("@I12@", true));

      const branch = page.locator("[data-branch]");
      await expect(branch).toHaveCount(1);
      const end = await life(page, "@I12@").evaluate((bar) => Number(bar.getAttribute("x")) + Number(bar.getAttribute("width")));
      await page.locator(".gedcom-ft-plot").evaluate((plot, to) => {
        plot.scrollLeft = Math.max(0, to - plot.clientWidth / 2);
      }, end);
      await expect(branch).toBeVisible();
      await page.waitForTimeout(100);
      const button = await branch.boundingBox();
      const name = await label(page, "@I12@").boundingBox();
      const plot = await page.locator(".gedcom-ft-plot").boundingBox();
      expect(button?.x ?? 0).toBeGreaterThanOrEqual((name?.x ?? 0) + (name?.width ?? 0));
      expect((button?.x ?? 0) + (button?.width ?? 0)).toBeLessThanOrEqual((plot?.x ?? 0) + (plot?.width ?? 0) + 1);
      await branch.click();
      await expect(page.locator(".gedcom-ft-life")).toHaveCount(10);
    });
  });
}

test.describe("a pinch on the timeline", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("widens the axis about the point between the fingers, once, and does not zoom the page", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: [number, number][]) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: points.map(([x, y], id) => ({ x, y, id })),
      });
    const width = () => page.locator(".gedcom-ft-chart").evaluate((chart) => chart.getBoundingClientRect().width);
    const scopes = () => page.evaluate(() => window.timeline.calls.scopes);
    const yearUnder = (x: number, zoom: number) =>
      page.locator(".gedcom-ft-plot").evaluate((plot, args) => 1820 + (plot.scrollLeft + args.x - 12) / args.zoom, { x, zoom });
    await page.locator(".gedcom-ft-plot").evaluate((plot) => {
      plot.scrollLeft = 150;
    });
    const before = await width();
    const year = await yearUnder(200, ZOOM);

    await touch("touchStart", [[150, 400], [250, 400]]);
    for (const spread of [120, 160, 200]) {
      await touch("touchMove", [[200 - spread / 2, 400], [200 + spread / 2, 400]]);
    }
    expect(await page.locator(".gedcom-ft-chart").evaluate((chart) => (chart as SVGElement).style.transform)).toBe("scaleX(2)");
    expect(await scopes()).toHaveLength(0);
    await touch("touchEnd", []);

    const [changed] = await scopes();
    expect(await scopes()).toHaveLength(1);
    expect(changed?.zoom).toBeCloseTo(ZOOM * 2, 5);
    expect(await width()).toBeGreaterThan(before * 1.5);
    expect(await yearUnder(200, changed?.zoom ?? ZOOM)).toBeCloseTo(year, 0);
    expect(await page.evaluate(() => window.visualViewport?.scale)).toBe(1);
    expect(await page.locator(".gedcom-ft-chart").evaluate((chart) => (chart as SVGElement).style.transform)).toBe("");
  });

  test("stops where the zoom buttons would", async ({ page }) => {
    await mountTimeline(page, { phone: true });
    const cdp = await page.context().newCDPSession(page);
    const touch = (type: "touchStart" | "touchMove" | "touchEnd", points: [number, number][]) =>
      cdp.send("Input.dispatchTouchEvent", { type, touchPoints: points.map(([x, y], id) => ({ x, y, id })) });
    await touch("touchStart", [[195, 400], [205, 400]]);
    await touch("touchMove", [[20, 400], [370, 400]]);
    await touch("touchEnd", []);

    const scopes = await page.evaluate(() => window.timeline.calls.scopes);
    expect(scopes[scopes.length - 1]?.zoom).toBe(16);
  });
});
