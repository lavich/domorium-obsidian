import { expect, test } from "@playwright/test";

import { LINKS, mount, PROBLEMS, SAMPLE } from "./harness";

/**
 * The colours in harness/palette.css are distinct on purpose: each assertion
 * names the Obsidian variable a pixel came from.
 */
const LIGHT = {
  comment: "rgb(10, 20, 30)",
  keyword: "rgb(128, 0, 128)",
  normal: "rgb(20, 40, 60)",
  faint: "rgb(10, 20, 30)",
  background: "rgb(255, 255, 255)",
};

const DARK = {
  comment: "rgb(200, 210, 220)",
  keyword: "rgb(255, 0, 255)",
  normal: "rgb(220, 230, 240)",
  faint: "rgb(200, 210, 220)",
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

    expect(colours["0"], "a level is a comment").toBe(LIGHT.comment);
    expect(colours.HEAD, "a tag is a string").toBe(LIGHT.normal);
    expect(colours["@I1@"], "an XREF is a keyword").toBe(LIGHT.keyword);
  });

  test("follows the variables into dark, which is what the theme flag decides", async ({
    page,
  }) => {
    await mount(page, { dark: true });
    const colours = await tokenColours(page);

    expect(colours["0"]).toBe(DARK.comment);
    expect(colours.HEAD).toBe(DARK.normal);
    expect(colours["@I1@"]).toBe(DARK.keyword);
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

  /*
   * Semibold now comes from the highlight style's rule for
   * `tags.definition(tags.keyword)`, and waits for the release of
   * `@domorium/codemirror` that modifies a declaring token's tag: 1.3.0 marks
   * one with a class and no tag, which no style can reach.
   */
  test.fail(
    "marks an XREF declaration apart from a reference to it",
    async ({ page }) => {
      await mount(page);
      const weights = await page.evaluate(() => {
        const weightIn = (prefix: string): string => {
          const line = [...document.querySelectorAll(".cm-line")].find(
            (element) => (element.textContent ?? "").trim().startsWith(prefix),
          );
          const span = [...(line?.querySelectorAll("span") ?? [])].find(
            (element) => element.textContent === "@I1@",
          );
          return span ? getComputedStyle(span).fontWeight : "missing";
        };
        return {
          declaration: weightIn("0 @I1@"),
          reference: weightIn("1 HUSB"),
        };
      });

      expect(weights.declaration, "the declaring @I1@ is semibold").toBe("600");
      expect(weights.reference, "a reference to it is not").toBe("400");
    },
  );

  /*
   * A link in a note's source carries a colour and a weight, and takes its
   * underline only under the pointer. The marker waits for the release of
   * `@domorium/codemirror` that marks a link at all: 1.3.0 draws none, so
   * there is nothing here to dress yet.
   */
  test.fail("dresses a link the way a note's source does", async ({ page }) => {
    await mount(page, { doc: LINKS });
    const accent = "rgb(0, 0, 180)";

    const web = page.locator(".gedcom-external-link");
    const file = page.locator(".gedcom-internal-link");
    await expect(web).toHaveCSS("color", accent);
    await expect(file).toHaveCSS("color", accent);
    await expect(file, "no underline until the pointer is on it").toHaveCSS(
      "text-decoration-line",
      "none",
    );

    await file.hover();
    await expect(file).toHaveCSS("text-decoration-line", "underline");
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
    expect(
      hint!.colour,
      "invisible, so copying the line does not carry it",
    ).toBe("rgba(0, 0, 0, 0)");
    expect(SAMPLE.includes("  1 HUSB")).toBe(false);
  });

  test("paints a payload from the normal text variable, not from a default", async ({
    page,
  }) => {
    const payloadColour = async (dark: boolean): Promise<string> => {
      await mount(page, { dark });
      return page.evaluate(() => {
        const line = [...document.querySelectorAll(".cm-line")].find(
          (element) => (element.textContent ?? "").includes("John"),
        );
        return line ? getComputedStyle(line).color : "missing";
      });
    };

    expect(await payloadColour(false)).toBe("rgb(0, 0, 0)");
    expect(
      await payloadColour(true),
      "a value is the data; it cannot be black on a dark theme",
    ).toBe("rgb(255, 255, 255)");
  });

  test("marks a problem in the gutter with Obsidian's own error and warning colours", async ({
    page,
  }) => {
    const markers = async (dark: boolean) => {
      await mount(page, { doc: PROBLEMS, dark });
      await expect(page.locator(".cm-lint-marker-error").first()).toBeVisible();
      return page.evaluate(() => {
        const read = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) {
            return null;
          }
          const style = getComputedStyle(element);
          return { background: style.backgroundColor, content: style.content };
        };
        return {
          error: read(".cm-lint-marker-error"),
          warning: read(".cm-lint-marker-warning"),
        };
      });
    };

    const dark = await markers(true);
    expect(dark.error?.background, "--text-error").toBe("rgb(255, 100, 100)");
    expect(dark.warning?.background, "--text-warning").toBe(
      "rgb(255, 200, 100)",
    );
    expect(
      dark.error?.content,
      "the library's two-tone SVG is not what is painted",
    ).not.toContain("data:image");

    const light = await markers(false);
    expect(light.error?.background).toBe("rgb(180, 0, 0)");
    expect(light.warning?.background).toBe("rgb(180, 120, 0)");
  });

  test("underlines a problem in Obsidian's colours, without the library's image", async ({
    page,
  }) => {
    const underlines = async (dark: boolean) => {
      await mount(page, { doc: PROBLEMS, dark });
      await expect(page.locator(".cm-lintRange-error").first()).toBeVisible();
      return page.evaluate(() => {
        const read = (selector: string) => {
          const element = document.querySelector(selector);
          if (!element) {
            return null;
          }
          const style = getComputedStyle(element);
          return {
            colour: style.textDecorationColor,
            style: style.textDecorationStyle,
            image: style.backgroundImage,
          };
        };
        return {
          error: read(".cm-lintRange-error"),
          warning: read(".cm-lintRange-warning"),
        };
      });
    };

    const dark = await underlines(true);
    expect(dark.error?.colour, "--text-error").toBe("rgb(255, 100, 100)");
    expect(dark.warning?.colour, "--text-warning").toBe("rgb(255, 200, 100)");
    expect(dark.error?.style, "still wavy, as a problem should be").toBe(
      "wavy",
    );
    expect(
      dark.error?.image,
      "the library's red SVG is gone, so the colour can be ours",
    ).toBe("none");

    const light = await underlines(false);
    expect(light.error?.colour).toBe("rgb(180, 0, 0)");
    expect(light.warning?.colour).toBe("rgb(180, 120, 0)");
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
