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

test.describe("Obsidian's own button styling", () => {
  test("does not dress the page's rows and links as buttons", async ({ page }) => {
    await mountDesk(page);
    const look = (selector: string) =>
      page.locator(selector).first().evaluate((node) => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, shadow: style.boxShadow };
      });

    for (const selector of [
      ".gedcom-desk-person",
      ".gedcom-desk-link",
      ".gedcom-desk-fact:not(.is-selected)",
      ".gedcom-desk-row:not(.is-current)",
      ".gedcom-desk-cite",
    ]) {
      expect(await look(selector), selector).toEqual({
        background: "rgba(0, 0, 0, 0)",
        shadow: "none",
      });
    }
  });
});

test.describe("the family page", () => {
  test("leads from Marie to her family, and from the family to a child", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-link", { hasText: "Family page" }).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText(
      "Pierre Curie and Marie Skłodowska-Curie",
    );
    await expect(page.locator(".gedcom-desk-row.is-current")).toHaveCount(0);
    await factNamed(page, "Marriage").click();
    await expect(page.locator(".gedcom-desk-evidence-context div").first()).toHaveText("Marriage");

    await page.locator(".gedcom-desk-person", { hasText: "Ève Curie" }).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Ève Curie");
  });

  test("lists families in the index and opens one", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-seg-button", { hasText: "Families" }).click();
    await page.locator(".gedcom-desk-row", { hasText: "Frédéric Joliot and Irène" }).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText(
      "Frédéric Joliot and Irène Joliot-Curie",
    );
    await expect(page.locator(".gedcom-desk-row.is-current")).toHaveCount(1);
  });
});

test.describe("media", () => {
  test("shows Marie's portrait and gallery, her part of the family photograph cut out", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);

    await expect(page.locator(".gedcom-desk-portrait img")).toHaveAttribute(
      "src", "../demo-vault/Media/marie-sklodowska-curie.svg",
    );
    await expect(page.locator(".gedcom-desk-tile-caption")).toHaveText([
      "Marie Skłodowska-Curie", "Marie, on the left", "A portrait the plugin fetches only when asked",
    ]);
    const cropped = page.locator(".gedcom-desk-tile .gedcom-desk-picture.is-cropped");
    await expect(cropped).toHaveCount(1);
    const box = await cropped.boundingBox();
    expect(Math.round(box?.height ?? 0)).toBe(120);
    expect(Math.round(box?.width ?? 0)).toBe(65);
    await expect(page.locator(".gedcom-desk-tile-note")).toHaveText(["From the web, not loaded"]);
  });

  test("opens a file, and the media page with everyone who links it", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-tile-face").first().click();
    expect(await page.evaluate(() => window.desk.calls.filesOpened)).toEqual([
      "Media/marie-sklodowska-curie.svg",
    ]);

    await page.locator(".gedcom-desk-tile", { hasText: "Marie, on the left" })
      .locator(".gedcom-desk-link", { hasText: "Media page" }).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("The Curie family, about 1908");
    await expect(page.locator(".gedcom-desk-user .gedcom-desk-person-name")).toHaveText([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
    await expect(page.locator(".gedcom-desk-user .is-cropped")).toHaveCount(2);
  });

  test("lists the notes that link Marie, and opens one at its line", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-note-line").click();

    await expect(page.locator(".gedcom-desk-note-line mark")).toHaveText("Marie Skłodowska-Curie");
    expect(await page.evaluate(() => window.desk.calls.notesOpened)).toEqual([
      { path: "Notes/Radium.md", line: 6 },
    ]);
  });
});

test.describe("the views of a person page", () => {
  test("shows Marie's timeline, and keeps it when moving to her husband", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-tab", { hasText: "Timeline" }).click();

    await expect(page.locator(".gedcom-desk-moment-year").first()).toHaveText("1860");
    await expect(page.locator(".gedcom-desk-moment.is-own .gedcom-desk-moment-what").first()).toHaveText("Birth");
    await page.locator(".gedcom-desk-moment-what", { hasText: "Death of husband" }).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie");
    await expect(page.locator(".gedcom-desk-tab.is-active")).toHaveText("Timeline");
  });

  test("lists her places", async ({ page }) => {
    await mountDesk(page);
    await page.locator(".gedcom-desk-tab", { hasText: "Places" }).click();

    await expect(page.locator(".gedcom-desk-place-name")).toHaveText([
      "Warsaw, Congress Poland", "Sceaux, France", "Paris, France", "Passy, Haute-Savoie, France",
    ]);
  });

  test("scrolls only the body under the heading and tabs on a desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 500 });
    await mountDesk(page);
    const before = await page.locator(".gedcom-desk-tabs").boundingBox();
    await page.locator(".gedcom-desk-body").hover();
    await page.mouse.wheel(0, 2000);
    await expect.poll(() =>
      page.locator(".gedcom-desk-body").evaluate((body) => body.scrollTop),
    ).toBeGreaterThan(0);
    const after = await page.locator(".gedcom-desk-tabs").boundingBox();
    const scrolls = await page.evaluate(() => ({
      desk: document.querySelector(".gedcom-desk")?.scrollTop,
      body: document.querySelector(".gedcom-desk-body")?.scrollTop,
    }));

    expect(scrolls.desk).toBe(0);
    expect(after?.y).toBe(before?.y);
    const body = await page.locator(".gedcom-desk-body").boundingBox();
    expect(body?.y ?? 0).toBeGreaterThanOrEqual((after?.y ?? 0) + (after?.height ?? 0) - 1);
  });

  test("lets the heading go on a phone, keeping the tabs at the top", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 700 });
    await mountDesk(page, { phone: true });
    await page.locator(".gedcom-desk").evaluate((desk) => {
      desk.scrollTop = desk.scrollHeight;
    });
    const desk = await page.locator(".gedcom-desk").boundingBox();
    const title = await page.locator(".gedcom-desk-title").boundingBox();
    const tabs = await page.locator(".gedcom-desk-tabs").boundingBox();

    expect((title?.y ?? 0) + (title?.height ?? 0)).toBeLessThan(desk?.y ?? 0);
    expect(Math.round(tabs?.y ?? -1)).toBe(Math.round(desk?.y ?? 0));
  });

  test("keeps the tabs on one line on a phone, scrolling sideways", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await mountDesk(page, { phone: true });
    const tops = await page.locator(".gedcom-desk-tab").evaluateAll((tabs) =>
      tabs.map((tab) => Math.round(tab.getBoundingClientRect().top)),
    );

    expect(new Set(tops).size).toBe(1);
    expect(await overflowsSideways(page)).toBe(false);
  });
});

test.describe("the tree", () => {
  const card = (page: Page, name: string) =>
    page.locator(".gedcom-fg-person", { has: page.locator(`title:text-is("${name}")`) });

  test("draws Marie's family around her and moves the focus on a click", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-tab", { hasText: "Tree" }).click();

    await expect(page.locator(".gedcom-fg-person.is-focus title").first()).toHaveText("Marie Skłodowska-Curie");
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(14);
    await card(page, "4 siblings").locator(".gedcom-fg-card-bg").click();
    await expect(page.locator(".gedcom-fg-person")).toHaveCount(17);
    await card(page, "Pierre Curie").first().locator(".gedcom-fg-card-bg").click();
    await expect(page.locator(".gedcom-fg-person.is-focus title").first()).toHaveText("Pierre Curie");
  });

  test("colours the cards by sex and stands Pierre Curie left of Marie, with their node between", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-tab", { hasText: "Tree" }).click();
    const tint = (name: string) =>
      card(page, name).locator(".gedcom-fg-card-bg").evaluate((shape) => getComputedStyle(shape).fill);

    expect(await tint("Marie Skłodowska-Curie")).toBe("rgba(255, 0, 128, 0.2)");
    expect(await tint("Pierre Curie")).toBe("rgba(0, 0, 255, 0.18)");
    await expect(page.locator(".gedcom-fg-card-side")).toHaveCount(0);
    const pierre = await card(page, "Pierre Curie").locator(".gedcom-fg-card-bg").boundingBox();
    const marie = await card(page, "Marie Skłodowska-Curie").locator(".gedcom-fg-card-bg").boundingBox();
    const node = page.locator("[data-node]", { hasText: "’95" });
    const between = await node.boundingBox();
    expect((pierre?.x ?? 0) + (pierre?.width ?? 0)).toBeLessThan(between?.x ?? 0);
    expect((between?.x ?? 0) + (between?.width ?? 0)).toBeLessThan(marie?.x ?? 0);
    const jacques = await card(page, "Jacques Curie").locator(".gedcom-fg-card-bg").boundingBox();
    const sisters = await card(page, "4 siblings").locator(".gedcom-fg-card-bg").boundingBox();
    expect(jacques?.x ?? Infinity).toBeLessThan(pierre?.x ?? 0);
    expect(sisters?.x ?? 0).toBeGreaterThan(marie?.x ?? Infinity);

    const marieCard = card(page, "Marie Skłodowska-Curie");
    await expect.poll(() =>
      marieCard.locator(".gedcom-fg-avatar img").evaluate((image: HTMLImageElement) => image.naturalWidth),
    ).toBeGreaterThan(0);
    await expect(marieCard.locator(".gedcom-fg-card-name")).toHaveText(["Marie", "Skłodowska-Curie"]);
    await expect(card(page, "Jacques Curie").locator(".gedcom-fg-avatar")).toHaveCount(0);

    await node.locator("circle").click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie and Marie Skłodowska-Curie");
  });

  for (const [width, height, phone] of [[1280, 800, false], [390, 760, true]] as const) {
    test(`fills the Tree tab at ${width} pixels with nothing to scroll, fitted, and no legend`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      await mountDesk(page, { phone });
      await page.locator(".gedcom-desk-tab", { hasText: "Tree" }).click();
      await page.waitForTimeout(100);

      const scrolls = await page.evaluate(() =>
        [document.documentElement, ...document.querySelectorAll(".gedcom-desk, .gedcom-desk-body")]
          .filter((one) => one.scrollHeight > one.clientHeight + 1)
          .map((one) => one.className),
      );
      expect(scrolls).toEqual([]);
      await expect(page.locator(".gedcom-desk-legend")).toHaveCount(0);
      const canvas = await page.locator(".gedcom-desk-graph .gedcom-fg-canvas").boundingBox();
      expect((canvas?.y ?? 0) + (canvas?.height ?? 0)).toBeLessThanOrEqual(height);
      expect(canvas?.height ?? 0).toBeGreaterThan(height / 3);
      if (phone) {
        await expect(page.locator(".gedcom-fg-person.is-focus .gedcom-fg-card-name").first()).toBeInViewport();
      } else {
        const cards = await page.locator(".gedcom-fg-card-bg").evaluateAll((all) =>
          all.map((one) => one.getBoundingClientRect()).map((box) => ({ left: box.left, right: box.right, top: box.top, bottom: box.bottom })),
        );
        for (const box of cards) {
          expect(box.left).toBeGreaterThanOrEqual(canvas?.x ?? Infinity);
          expect(box.right).toBeLessThanOrEqual((canvas?.x ?? 0) + (canvas?.width ?? 0));
          expect(box.top).toBeGreaterThanOrEqual(canvas?.y ?? Infinity);
          expect(box.bottom).toBeLessThanOrEqual((canvas?.y ?? 0) + (canvas?.height ?? 0));
        }
      }
    });
  }

  test("opens on a phone with the focus in view, moved by dragging rather than by scrolling the page", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await mountDesk(page, { phone: true });
    await page.locator(".gedcom-desk-tab", { hasText: "Tree" }).click();
    const focus = await page.locator(".gedcom-fg-person.is-focus .gedcom-fg-card-bg").boundingBox();

    expect(focus?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((focus?.x ?? 0) + (focus?.width ?? 0)).toBeLessThanOrEqual(390);
    expect(await overflowsSideways(page)).toBe(false);
    expect(await page.locator(".gedcom-fg-canvas").evaluate((canvas) => getComputedStyle(canvas).touchAction)).toBe(
      "none",
    );
  });
});

test("rounds the index tabs inside their bar by the bar's radius less its inset", async ({ page }) => {
  await mountDesk(page);
  const radii = await page.evaluate(() => {
    const bar = document.querySelector(".gedcom-desk-seg");
    const tab = document.querySelector(".gedcom-desk-seg-button");
    const px = (value: string | undefined) => Number.parseFloat(value ?? "");
    return {
      bar: px(bar ? getComputedStyle(bar).borderTopLeftRadius : undefined),
      inset: px(bar ? getComputedStyle(bar).paddingTop : undefined),
      tab: px(tab ? getComputedStyle(tab).borderTopLeftRadius : undefined),
    };
  });

  expect(radii.tab).toBe(radii.bar - radii.inset);
});

test.describe("the index in a narrow sidebar", () => {
  for (const width of [260, 200]) {
    test(`keeps its three tabs inside the bar at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 800 });
      await mountDesk(page);
      await page.evaluate((pane) => {
        document.getElementById("desk-layout")?.style.setProperty("grid-template-columns", `${pane}px 1fr 300px`);
      }, width);
      await page.locator(".gedcom-desk-seg-button", { hasText: "Sources" }).click();
      const fit = await page.evaluate(() => {
        const bar = document.querySelector(".gedcom-desk-seg")?.getBoundingClientRect();
        return {
          inside: [...document.querySelectorAll(".gedcom-desk-seg-button")].every((tab) => {
            const box = tab.getBoundingClientRect();
            return bar !== undefined && box.left >= bar.left - 0.5 && box.right <= bar.right + 0.5;
          }),
        };
      });

      expect(fit).toEqual({ inside: true });
    });
  }
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
      await new Promise((settled) => window.requestAnimationFrame(settled));
      return performance.now() - started;
    });
    expect(elapsed / 5, "milliseconds a keystroke").toBeLessThan(100);
    await expect(page.locator(".gedcom-desk-row-name").first()).toHaveText(/^Person1234 /);
  });
});
