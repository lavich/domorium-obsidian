import { expect, test } from "@playwright/test";

import { mount, SAMPLE } from "./harness";

/**
 * The colours in harness/palette.css are distinct on purpose: each assertion
 * names the Obsidian variable a pixel came from.
 */
const LIGHT = {
  faint: "rgb(10, 20, 30)",
  cyan: "rgb(0, 128, 128)",
  purple: "rgb(128, 0, 128)",
  background: "rgb(255, 255, 255)",
};

const DARK = {
  faint: "rgb(200, 210, 220)",
  cyan: "rgb(0, 255, 255)",
  purple: "rgb(255, 0, 255)",
  background: "rgb(20, 20, 20)",
};

async function tokenColours(
  page: import("@playwright/test").Page,
): Promise<Record<string, string>> {
  return page.evaluate(() => {
    const colours: Record<string, string> = {};
    for (const span of document.querySelectorAll(".cm-line span")) {
      const text = span.textContent ?? "";
      if (text && !(text in colours)) {
        colours[text] = getComputedStyle(span).color;
      }
    }
    return colours;
  });
}

test.describe("the Obsidian theme", () => {
  test("paints levels, tags and pointers from Obsidian's variables", async ({
    page,
  }) => {
    await mount(page);
    const colours = await tokenColours(page);

    expect(colours["0"], "a level is a comment").toBe(LIGHT.faint);
    expect(colours.HEAD, "a tag is a string").toBe(LIGHT.purple);
    expect(colours["@I1@"], "an XREF is a keyword").toBe(LIGHT.cyan);
  });

  test("follows the variables into dark, which is what the theme flag decides", async ({
    page,
  }) => {
    await mount(page, { dark: true });
    const colours = await tokenColours(page);

    expect(colours["0"]).toBe(DARK.faint);
    expect(colours.HEAD).toBe(DARK.purple);
    expect(colours["@I1@"]).toBe(DARK.cyan);
  });

  test("takes the editor and gutter background from the primary variable", async ({
    page,
  }) => {
    await mount(page);
    const light = await page.evaluate(() => ({
      editor: getComputedStyle(document.querySelector(".cm-editor")!)
        .backgroundColor,
      gutters: getComputedStyle(document.querySelector(".cm-gutters")!)
        .backgroundColor,
    }));
    expect(light.editor).toBe(LIGHT.background);
    expect(light.gutters).toBe(LIGHT.background);

    await mount(page, { dark: true });
    const dark = await page.evaluate(
      () =>
        getComputedStyle(document.querySelector(".cm-editor")!).backgroundColor,
    );
    expect(dark).toBe(DARK.background);
  });

  test("marks an XREF declaration apart from a reference to it", async ({
    page,
  }) => {
    await mount(page);
    const weights = await page.evaluate(() => {
      const weightIn = (prefix: string): string => {
        const line = [...document.querySelectorAll(".cm-line")].find((element) =>
          (element.textContent ?? "").trim().startsWith(prefix),
        );
        const span = [...(line?.querySelectorAll("span") ?? [])].find(
          (element) => element.textContent === "@I1@",
        );
        return span ? getComputedStyle(span).fontWeight : "missing";
      };
      return { declaration: weightIn("0 @I1@"), reference: weightIn("1 HUSB") };
    });

    expect(weights.declaration, "the declaring @I1@ is semibold").toBe("600");
    expect(weights.reference, "a reference to it is not").toBe("400");
  });

  test("indents nested lines with a hint the file does not contain", async ({
    page,
  }) => {
    await mount(page);
    const hint = await page.evaluate(() => {
      const element = document.querySelector(".gedcom-indent-hint");
      return element
        ? {
            text: element.textContent,
            colour: getComputedStyle(element).color,
          }
        : null;
    });

    expect(hint, "a nested line carries a hint").not.toBeNull();
    expect(hint!.text, "two spaces per level").toBe("  ");
    expect(hint!.colour, "invisible, so copying the line does not carry it").toBe(
      "rgba(0, 0, 0, 0)",
    );
    expect(SAMPLE.includes("  1 HUSB")).toBe(false);
  });

  test("does not indent the file it is showing", async ({ page }) => {
    await mount(page);
    const text = await page.evaluate(
      () => document.querySelector(".cm-content")?.textContent ?? "",
    );
    expect(text.startsWith("0 HEAD")).toBe(true);
    expect(SAMPLE.startsWith("0 HEAD")).toBe(true);
  });
});
