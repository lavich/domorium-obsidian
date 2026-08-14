import { expect, test, type Page } from "@playwright/test";

import { mount, PROBLEMS } from "./harness";

async function openPanels(page: Page, dark: boolean): Promise<void> {
  await mount(page, { doc: PROBLEMS, dark });
  await page.evaluate(() => {
    window.gedcom.openProblems();
    window.gedcom.openSearch();
  });
  await page.waitForSelector(".cm-panel-lint");
  await page.waitForSelector(".document-search-container");
}

function styleOf(
  page: Page,
  selector: string,
): Promise<{ background: string; colour: string; font: string; radius: string }> {
  return page.evaluate((target) => {
    const style = getComputedStyle(document.querySelector(target)!);
    return {
      background: style.backgroundColor,
      colour: style.color,
      font: style.fontFamily,
      radius: style.borderRadius,
    };
  }, selector);
}

test.describe("the panels CodeMirror paints", () => {
  test("give the problems panel a close button of a size a finger finds", async ({
    page,
  }) => {
    await openPanels(page, true);
    const box = await page
      .locator('.cm-panel-lint [name="close"]')
      .boundingBox();

    expect(box?.width, "--size-4-6").toBeGreaterThanOrEqual(24);
    expect(box?.height, "--size-4-6").toBeGreaterThanOrEqual(24);
  });

  test("sit on Obsidian's secondary background rather than the library's", async ({
    page,
  }) => {
    await openPanels(page, true);
    const panels = await styleOf(page, ".cm-panels-bottom");

    expect(panels.background, "--background-secondary in the dark palette").toBe(
      "rgb(30, 30, 30)",
    );
  });

  test("give the search bar the note background, the way Obsidian's own has", async ({
    page,
  }) => {
    await openPanels(page, true);

    expect(
      (await styleOf(page, ".cm-panels-top")).background,
      "--background-primary in the dark palette",
    ).toBe("rgb(20, 20, 20)");
  });

  test("use the interface font, not the editor's monospace and not the browser's", async ({
    page,
  }) => {
    await openPanels(page, false);

    for (const selector of [".cm-panels", ".document-search-input input"]) {
      const style = await styleOf(page, selector);
      expect(style.font, `${selector} follows --font-interface`).toContain(
        "system-ui",
      );
    }
    const content = await styleOf(page, ".cm-content");
    expect(content.font, "the document itself stays monospace").toContain(
      "monospace",
    );
  });

  test("declare the colour scheme, which is what the selected row's system colours follow", async ({
    page,
  }) => {
    await openPanels(page, true);
    const dark = await page.evaluate(
      () => getComputedStyle(document.querySelector(".cm-editor")!).colorScheme,
    );
    expect(dark).toBe("dark");

    await openPanels(page, false);
    const light = await page.evaluate(
      () => getComputedStyle(document.querySelector(".cm-editor")!).colorScheme,
    );
    expect(light).toBe("light");
  });

  test("list one row per problem, without repeating who reported it", async ({
    page,
  }) => {
    await openPanels(page, true);

    await expect(
      page.locator(".cm-panel-lint li"),
      "a row for each problem, once the linter has settled",
    ).toHaveCount(3);

    const sources = await page.evaluate(() =>
      [...document.querySelectorAll(".cm-diagnosticSource")].map(
        (element) => getComputedStyle(element).display,
      ),
    );
    expect(sources.length, "the library labels every row GEDCOM").toBe(3);
    expect(
      new Set(sources),
      "and every label is hidden: they are all ours",
    ).toEqual(new Set(["none"]));
  });

  test("keep the search panel above the document and the problems below it", async ({
    page,
  }) => {
    await openPanels(page, true);
    const order = await page.evaluate(() => {
      const search = document
        .querySelector(".document-search-container")!
        .getBoundingClientRect();
      const content = document.querySelector(".cm-content")!.getBoundingClientRect();
      const lint = document.querySelector(".cm-panel-lint")!.getBoundingClientRect();
      return { search: search.top, content: content.top, lint: lint.top };
    });

    expect(order.search).toBeLessThan(order.content);
    expect(order.lint).toBeGreaterThan(order.content);
  });
});
