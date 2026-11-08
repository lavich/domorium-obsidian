import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { GraphOptions } from "../harness/fileGraph";
import { expectNameLines } from "./cardText";
import { generated, lineages, tangled } from "./generated";

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

  test("names Marie with her years on a card, with no stripe on it", async ({ page }) => {
    await mountGraph(page);

    await expectNameLines(card(page, "@I1@"), "Marie", "Skłodowska");
    await expect(card(page, "@I1@").locator(".gedcom-fg-card-years")).toHaveText("1867–1934");
    await expect(page.locator(".gedcom-fg-card-side")).toHaveCount(0);
    for (const xref of ["@I1@", "@I17@", "@I9@", "@I8@"]) {
      await expect(card(page, xref).locator(".gedcom-fg-card-name").first()).toBeInViewport();
    }
    await expect(page.locator(".gedcom-fg")).not.toContainText("Generation");
  });

  test("shows Marie's given name, her surname and her years in that order, with no picture on any card", async ({ page }) => {
    await mountGraph(page);
    const marie = card(page, "@I1@");
    await expectNameLines(marie, "Marie", "Skłodowska");
    const [given, surname] = await marie.locator(".gedcom-fg-card-name").all();
    const tops = await Promise.all(
      [given, surname, marie.locator(".gedcom-fg-card-years")].map(async (part) => (await part?.boundingBox())?.y ?? NaN),
    );
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    await expect(page.locator(".gedcom-fg-avatar, .gedcom-fg-card img")).toHaveCount(0);
    const heights = await page.locator(".gedcom-fg-card-bg").evaluateAll((shapes) => shapes.map((shape) => shape.getBoundingClientRect().height));
    expect(new Set(heights.map((height) => Math.round(height))).size).toBe(1);
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

  test("tints each card by its person's surname and keeps the lines readable on it, in both schemes", async ({ page }) => {
    const fills: string[] = [];
    for (const dark of [false, true]) {
      await mountGraph(page, { dark });

      const found = await page.locator(".gedcom-fg-person").evaluateAll((people) => {
        const channels = (value: string) => (value.match(/[\d.]+/gu) ?? []).slice(0, 3).map(Number);
        const luminance = ([r = 0, g = 0, b = 0]: number[]) => {
          const linear = (channel: number) => {
            const unit = channel / 255;
            return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
          };
          return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
        };
        return people.map((one) => {
          const fill = getComputedStyle(one.querySelector(".gedcom-fg-card-bg") as Element).fill;
          const ratios = [".gedcom-fg-card-name", ".gedcom-fg-card-years"].map((selector) => {
            const ink = getComputedStyle(one.querySelector(selector) as Element).fill;
            const [light = 0, deep = 0] = [luminance(channels(ink)), luminance(channels(fill))].sort((x, y) => y - x);
            return (light + 0.05) / (deep + 0.05);
          });
          return { xref: one.getAttribute("data-p"), fill, worst: Math.min(...ratios) };
        });
      });
      expect(found.length).toBeGreaterThan(10);
      for (const one of found) {
        expect(one.worst, `${one.xref} ${one.fill} (${dark ? "dark" : "light"})`).toBeGreaterThanOrEqual(4.5);
      }
      const fillOf = (xref: string) => found.find((one) => one.xref === xref)?.fill;
      expect(fillOf("@I1@")).not.toBe(fillOf("@I2@"));
      fills.push(fillOf("@I1@") ?? "");
    }
    expect(fills[0]).not.toBe(fills[1]);
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

  test("lights Marie's branch when the pointer is on her, and tells the Curies' marriage", async ({ page }) => {
    await mountGraph(page);
    await card(page, "@I1@").hover();

    await expect(person(page, "@I1@")).toHaveClass(/is-hl/);
    await expect(page.locator(".gedcom-fg-person.is-on")).toHaveCount(10);
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
      await expect
        .poll(async () => {
          const at = await centreOf(page, `[data-card="${xref}"] .gedcom-fg-card-bg`);
          return Math.max(Math.abs(at.x - canvas.x), Math.abs(at.y - canvas.y));
        })
        .toBeLessThan(2);
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
    await expect
      .poll(async () => {
        const canvas = await centreOf(page, ".gedcom-fg-canvas");
        const irene = await centreOf(page, '[data-card="@I12@"] .gedcom-fg-card-bg');
        return Math.abs(irene.x - canvas.x);
      })
      .toBeLessThan(2);
  });

  test("moves the cards of a branch to their places, fades the others where they stood, and leaves nothing behind", async ({ page }) => {
    await mountGraph(page);
    const started = await page.evaluate(() => {
      document.querySelector('[data-branch="@I12@"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      return {
        animations: document.getAnimations().length,
        ghosts: document.querySelectorAll(".gedcom-fg-person[inert]").length,
        reachable: [...document.querySelectorAll(".gedcom-fg-person[inert]")].every(
          (ghost) => getComputedStyle(ghost).pointerEvents === "none",
        ),
        focusable: document.querySelectorAll('.gedcom-fg-person[inert] [tabindex="0"]').length,
      };
    });

    expect(started.animations).toBeGreaterThan(0);
    expect(started.ghosts).toBe(7);
    expect(started.reachable).toBe(true);
    expect(started.focusable).toBe(0);
    await expect.poll(() => page.evaluate(() => document.getAnimations().length)).toBe(0);
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(10);
    await expect(page.locator(".gedcom-fg-person[inert]")).toHaveCount(0);
  });

  test("changes at once, with nothing moving, where the reader asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mountGraph(page);
    const started = await page.evaluate(() => {
      document.querySelector('[data-branch="@I12@"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
      return { animations: document.getAnimations().length, people: document.querySelectorAll(".gedcom-fg-person").length };
    });

    expect(started).toEqual({ animations: 0, people: 10 });
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

    for (let step = 0; step < 10 && (await zoom(page)) >= 0.35; step += 1) {
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

  test("floats the zoom buttons in the canvas's top corner, where they stay as the graph moves", async ({ page }) => {
    await mountGraph(page);
    const controls = page.locator(".gedcom-fg-controls");
    const canvas = await page.locator(".gedcom-fg-canvas").boundingBox();
    const before = await controls.boundingBox();

    expect(before?.x ?? 0).toBeGreaterThan(canvas?.x ?? Infinity);
    expect((before?.x ?? 0) + (before?.width ?? 0)).toBeLessThanOrEqual((canvas?.x ?? 0) + (canvas?.width ?? 0));
    expect((before?.y ?? 0) + (before?.height ?? 0)).toBeLessThanOrEqual((canvas?.y ?? 0) + (canvas?.height ?? 0));
    expect(before?.y ?? 0).toBeLessThan((canvas?.y ?? 0) + (canvas?.height ?? 0) / 2);
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

test.describe("the glide of the graph to a match", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 900 });
  });

  const sample = (page: Page) =>
    page.evaluate(
      () =>
        new Promise<string[]>((done) => {
          const view = document.querySelector(".gedcom-fg-view");
          const seen: string[] = [];
          const started = performance.now();
          const tick = () => {
            seen.push(view ? getComputedStyle(view).transform : "");
            if (performance.now() - started < 900) {
              window.requestAnimationFrame(tick);
            } else {
              done(seen);
            }
          };
          tick();
        }),
    );

  async function step(page: Page): Promise<string[]> {
    await mountGraph(page);
    await page.locator(".gedcom-fg-find-toggle").click();
    await page.locator(".gedcom-fg-search").fill("joliot");
    const sampling = sample(page);
    await page.locator(".gedcom-fg-find-next").click();
    return sampling;
  }

  test("passes through intermediate views on the way to the card, and ends with it centred", async ({ page }) => {
    const seen = await step(page);

    const distinct = [...new Set(seen)];
    expect(distinct.length).toBeGreaterThanOrEqual(4);
    const [first, last] = [distinct[0], distinct[distinct.length - 1]];
    expect(distinct.slice(1, -1).filter((one) => one !== first && one !== last).length).toBeGreaterThanOrEqual(2);
    await expect(page.locator(".gedcom-fg-view")).not.toHaveClass(/is-gliding/);
    const canvas = await centreOf(page, ".gedcom-fg-canvas");
    const at = await centreOf(page, '[data-card="@I14@"] .gedcom-fg-card-bg');
    expect(Math.abs(at.x - canvas.x)).toBeLessThan(2);
  });

  test("shows every card of the glide from the first frame, so none appears in the middle of it", async ({ page }) => {
    await mountGraph(page);
    await page.locator(".gedcom-fg-find-toggle").click();
    await page.locator(".gedcom-fg-search").fill("joliot");
    const before = await page.locator(".gedcom-fg-person").count();
    await page.locator(".gedcom-fg-find-next").click();

    await expect(page.locator(".gedcom-fg-view")).toHaveClass(/is-gliding/);
    expect(await page.locator(".gedcom-fg-person").count()).toBeGreaterThanOrEqual(before);
    expect(await page.locator('.gedcom-fg-person[data-p="@I14@"]').count()).toBe(1);
  });

  test("stops where it is when the reader drags, without a jump", async ({ page }) => {
    await mountGraph(page);
    await page.locator(".gedcom-fg-find-toggle").click();
    await page.locator(".gedcom-fg-search").fill("joliot");
    await page.locator(".gedcom-fg-find-next").click();
    await expect(page.locator(".gedcom-fg-view")).toHaveClass(/is-gliding/);
    await page.waitForTimeout(120);
    const mid = await page.locator(".gedcom-fg-view").evaluate((view) => getComputedStyle(view).transform);
    await page.mouse.move(700, 450);
    await page.mouse.down();

    await expect(page.locator(".gedcom-fg-view")).not.toHaveClass(/is-gliding/);
    const held = await page.locator(".gedcom-fg-view").evaluate((view) => getComputedStyle(view).transform);
    await page.waitForTimeout(500);
    expect(await page.locator(".gedcom-fg-view").evaluate((view) => getComputedStyle(view).transform)).toBe(held);
    expect(mid).not.toBe("none");
    await page.mouse.up();
  });

  test("jumps when the reader asks for reduced motion", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    const seen = await step(page);

    expect(new Set(seen).size).toBeLessThanOrEqual(2);
    await expect(page.locator(".gedcom-fg-view")).not.toHaveClass(/is-gliding/);
    const canvas = await centreOf(page, ".gedcom-fg-canvas");
    const at = await centreOf(page, '[data-card="@I14@"] .gedcom-fg-card-bg');
    expect(Math.abs(at.x - canvas.x)).toBeLessThan(2);
  });
});

for (const viewport of [{ width: 1400, height: 900 }, { width: 390, height: 844 }]) {
  test.describe(`the search over the graph at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("floats inside the canvas beside the zoom buttons, with no toolbar band above it", async ({ page }) => {
      const phone = viewport.width < 600;
      await mountGraph(page, { phone });
      const box = (selector: string) => page.locator(selector).boundingBox();

      const canvas = await box(".gedcom-fg-canvas");
      const root = await box(".gedcom-fg");
      expect(Math.abs((canvas?.y ?? 0) - (root?.y ?? 0))).toBeLessThan(2);
      const closed = await box(".gedcom-fg-find");
      const zoomGroup = await box(".gedcom-fg-controls");
      expect(closed?.x ?? 0).toBeGreaterThanOrEqual(canvas?.x ?? 0);
      expect((closed?.x ?? 0) + (closed?.width ?? 0)).toBeLessThanOrEqual(zoomGroup?.x ?? 0);
      expect(Math.abs((closed?.y ?? 0) + (closed?.height ?? 0) / 2 - (zoomGroup?.y ?? 0) - (zoomGroup?.height ?? 0) / 2)).toBeLessThan(2);
      expect(closed?.height ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 0);

      await expect(page.locator(".gedcom-fg-find-toggle")).toBeVisible();
      await expect(page.locator(".gedcom-fg-search")).toBeHidden();
      const frames = await page.evaluate((p) => {
        const width = (selector: string) => getComputedStyle(document.querySelector(selector) as Element).borderTopWidth;
        return [width(`.gedcom-${p}-dock`), width(`.gedcom-${p}-find`), width(`.gedcom-${p}-controls`)];
      }, "fg");
      expect(frames).toEqual(["1px", "0px", "0px"]);
      const sizes = await page.evaluate((p) => {
        const size = (selector: string) => {
          const rect = (document.querySelector(selector) as Element).getBoundingClientRect();
          return [Math.round(rect.width), Math.round(rect.height)];
        };
        return [`.gedcom-${p}-find-toggle`, `.gedcom-${p}-zoom-out`, `.gedcom-${p}-zoom-in`, `.gedcom-${p}-fit`].map(size);
      }, "fg");
      expect(new Set(sizes.map((one) => one.join("x"))).size).toBe(1);
      expect(sizes[0]?.[0]).toBe(phone ? 44 : 28);
      const zoomBefore = await box(".gedcom-fg-controls");
      await page.locator(".gedcom-fg-find-toggle").click();
      await expect(page.locator(".gedcom-fg-search")).toBeFocused();
      await expect.poll(async () => (await box(".gedcom-fg-search"))?.width ?? 0).toBeGreaterThan(30);
      if (phone) {
        await expect(page.locator(".gedcom-fg-controls")).toBeHidden();
      } else {
        expect(await box(".gedcom-fg-controls")).toEqual(zoomBefore);
      }
      await expect(page.locator(".gedcom-fg-find-toggle")).toBeHidden();
      await expect(page.locator(".gedcom-fg-find-clear")).toBeVisible();
      await expect.poll(async () => (await box(".gedcom-fg-search"))?.width ?? 0).toBeGreaterThan(100);
      const open = await box(".gedcom-fg-find");
      expect((open?.x ?? 0) + (open?.width ?? 0)).toBeLessThanOrEqual((canvas?.x ?? 0) + (canvas?.width ?? 0));
      expect(open?.x ?? 0).toBeGreaterThanOrEqual(canvas?.x ?? 0);
      await page.locator(".gedcom-fg-search").fill("joliot");
      await expect(page.locator(".gedcom-fg-find-count")).toHaveText("4 matches");
      await page.locator(".gedcom-fg-find-next").click();
      await expect(page.locator(".gedcom-fg-find-count")).toHaveText("1 / 4");
      await expect(person(page, "@I14@")).toHaveClass(/is-current/);
      await expect(page.locator(".gedcom-fg-search")).toBeFocused();
      await page.locator(".gedcom-fg-find-prev").click();
      await expect(page.locator(".gedcom-fg-find-count")).toHaveText("4 / 4");
      await expect(person(page, "@I17@")).toHaveClass(/is-current/);
      const arrows = await page.locator(".gedcom-fg-find-prev").boundingBox();
      expect(arrows?.width ?? 0).toBeGreaterThanOrEqual(phone ? 44 : 24);
      const filled = await box(".gedcom-fg-find");
      expect((filled?.x ?? 0) + (filled?.width ?? 0)).toBeLessThanOrEqual((canvas?.x ?? 0) + (canvas?.width ?? 0));
      expect(filled?.x ?? 0).toBeGreaterThanOrEqual(canvas?.x ?? 0);
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

      const changed = await page.evaluate(async () => {
        const xref = document.querySelector("[data-card]")?.getAttribute("data-card") ?? "";
        const started = performance.now();
        document.querySelector(`[data-branch="${xref}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
        const took = performance.now() - started;
        return { took, animations: document.getAnimations().length, ghosts: document.querySelectorAll(".gedcom-fg-person[inert]").length };
      });
      expect(changed.took).toBeLessThan(2_000);
      expect(changed.animations).toBeLessThan(1_000);
      expect(changed.ghosts).toBeLessThanOrEqual(400);
      await expect.poll(() => page.evaluate(() => document.getAnimations().length), { timeout: 5_000 }).toBe(0);
      await expect(page.locator(".gedcom-fg-person[inert]")).toHaveCount(0);
      await page.locator(".gedcom-fg-whole").click();

      await page.locator(".gedcom-fg-fit").click();
      await page.waitForTimeout(100);
      expect(await zoom(page)).toBe(0.05);
      expect(await page.locator(".gedcom-fg-view *").count()).toBeLessThan(6_000);
    });
  }
});

test.describe("the graph of a file as wide as it is deep", () => {
  const view = (page: Page) => page.locator(".gedcom-fg-view");
  const drawnCards = (page: Page) => page.locator(".gedcom-fg-person").count();
  const zoomTo = (page: Page, k: number) =>
    page.evaluate((target) => {
      const board = window.graph.board;
      board?.zoomAt(target / (board.view()?.k ?? 1), 700, 450);
    }, k);
  const outsideView = (page: Page) =>
    page.evaluate(() => {
      const window_ = window.graph.board?.windowOf();
      if (!window_) {
        return -1;
      }
      const width = window_.right - window_.left;
      const height = window_.bottom - window_.top;
      return [...document.querySelectorAll(".gedcom-fg-person")].filter((one) => {
        const [x = NaN, y = NaN] = (one.getAttribute("transform")?.match(/-?[\d.]+/g) ?? []).map(Number);
        return x + 168 < window_.left - width || x > window_.right + width || y + 46 < window_.top - height || y > window_.bottom + height;
      }).length;
    });

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60_000);
    await page.setViewportSize({ width: 1400, height: 900 });
    await mountGraph(page, { doc: lineages(150, 20), whole: true });
  });

  const fitNow = (page: Page) =>
    page.evaluate(() => {
      window.graph.board?.fit();
      return {
        gliding: document.querySelector(".gedcom-fg-view")?.classList.contains("is-gliding") ?? false,
        drawn: document.querySelectorAll(".gedcom-fg-person").length,
      };
    });

  test("draws only what a view needs once it has come in from Fit, whether Fit glided or jumped", async ({ page }) => {
    const glided = await fitNow(page);
    expect(glided.gliding).toBe(true);
    expect(glided.drawn).toBeGreaterThan(3_000);
    await expect(view(page)).not.toHaveClass(/is-gliding/);

    await zoomTo(page, 0.15);
    await expect.poll(() => drawnCards(page)).toBeLessThan(2_500);
    expect(await outsideView(page)).toBe(0);

    await zoomTo(page, 0.6);
    const jumped = await fitNow(page);
    expect(jumped.gliding).toBe(false);
    await expect.poll(() => drawnCards(page)).toBeGreaterThan(3_000);

    await zoomTo(page, 0.15);
    await expect.poll(() => drawnCards(page)).toBeLessThan(2_500);
    expect(await outsideView(page)).toBe(0);
  });

  test("outlines the lit branch and fades no card while more than 3 000 are drawn, and fades again in a thin view", async ({ page }) => {
    await fitNow(page);
    await expect(view(page)).not.toHaveClass(/is-gliding/);
    expect(await drawnCards(page)).toBeGreaterThan(3_000);

    const xref = (await page.locator("[data-card]").nth(2_000).getAttribute("data-card")) ?? "";
    await page.evaluate((id) => window.graph.board?.highlight(id), xref);
    const lit = await page.locator(".gedcom-fg-person.is-on").count();
    expect(lit).toBeGreaterThan(1);
    await expect(page.locator(".gedcom-fg-person.is-outlined")).toHaveCount(lit);
    await expect(page.locator(".gedcom-fg-svg")).not.toHaveClass(/has-hl/);
    const unlit = page.locator(".gedcom-fg-person:not(.is-on)").first();
    expect(await unlit.evaluate((element) => getComputedStyle(element).opacity)).toBe("1");

    const bg = (selector: string) =>
      page.locator(selector).first().locator(".gedcom-fg-card-bg").evaluate((element) => {
        const style = getComputedStyle(element);
        return [style.strokeWidth, style.vectorEffect];
      });
    await expect.poll(() => bg(".gedcom-fg-person.is-outlined:not(.is-hl)")).toEqual(["2px", "non-scaling-stroke"]);
    await expect.poll(() => bg(".gedcom-fg-person.is-outlined.is-hl")).toEqual(["4px", "non-scaling-stroke"]);
    await page.evaluate((id) => window.graph.board?.select(id, false), xref);
    await expect.poll(() => bg(".gedcom-fg-person.is-outlined.is-selected")).toEqual(["5px", "non-scaling-stroke"]);

    await zoomTo(page, 0.6);
    await expect.poll(() => drawnCards(page)).toBeLessThan(2_500);
    const near = (await page.locator("[data-card]").first().getAttribute("data-card")) ?? "";
    await page.evaluate((id) => window.graph.board?.highlight(id), near);
    await expect(page.locator(".gedcom-fg-svg")).toHaveClass(/has-hl/);
    await expect(page.locator(".gedcom-fg-person.is-outlined")).toHaveCount(0);
  });

  test("keeps the shapes as a layer while the view is dragged, and lets it go once at rest", async ({ page }) => {
    const willChange = () => view(page).evaluate((element) => getComputedStyle(element).willChange);
    await page.mouse.move(700, 450);
    await page.mouse.down();
    await page.mouse.move(760, 470, { steps: 5 });
    expect(await willChange()).toBe("transform");
    await page.mouse.up();

    await expect.poll(willChange, { timeout: 3_000 }).toBe("auto");
  });
});
