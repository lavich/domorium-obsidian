import { expect, test, type Page } from "@playwright/test";

import { mount, offsetOf, SAMPLE } from "./harness";

/** `1 FAMS @F1@` on line 6 — a reference to the record declared on line 7. */
const POINTER = offsetOf(SAMPLE, "@F1@");
const TAG = offsetOf(SAMPLE, "FAMS");

async function modHover(page: Page, offset: number): Promise<void> {
  const coords = await page.evaluate(
    (target) => window.gedcom.coordsAt(target),
    offset,
  );
  if (!coords) {
    throw new Error(`no coordinates for offset ${offset}`);
  }
  await page.keyboard.down("Meta");
  await page.mouse.move(coords.x, coords.y);
}

function calls(page: Page): Promise<{ previews: unknown[]; hides: number }> {
  return page.evaluate(() => ({
    previews: window.gedcom.calls.previews,
    hides: window.gedcom.calls.hides,
  }));
}

test.describe("the hovered pointer", () => {
  test("answers for a pointer, with the mark over both delimiters", async ({
    page,
  }) => {
    await mount(page);
    await modHover(page, POINTER + 2);

    const marked = await page.evaluate(() => {
      const element = document.querySelector(".gedcom-hovered-pointer");
      return element
        ? {
            text: element.textContent,
            decoration: getComputedStyle(element).textDecorationLine,
          }
        : null;
    });

    expect(marked, "the pointer is marked").not.toBeNull();
    expect(marked!.text, "the mark covers both @").toBe("@F1@");
    expect(marked!.decoration).toBe("underline");
    expect((await calls(page)).previews).toEqual([
      { from: POINTER, to: POINTER + 4 },
    ]);
  });

  test("says nothing without the modifier, however long the mouse sits there", async ({
    page,
  }) => {
    await mount(page);
    const coords = await page.evaluate(
      (target) => window.gedcom.coordsAt(target),
      POINTER + 2,
    );
    await page.mouse.move(coords!.x, coords!.y);

    expect(await page.locator(".gedcom-hovered-pointer").count()).toBe(0);
    expect((await calls(page)).previews).toEqual([]);
  });

  test("does not answer for the tag two characters to the left", async ({
    page,
  }) => {
    await mount(page);
    await modHover(page, TAG + 2);

    expect(await page.locator(".gedcom-hovered-pointer").count()).toBe(0);
    expect((await calls(page)).previews).toEqual([]);
  });

  test("lets go when the mouse moves off the pointer", async ({ page }) => {
    await mount(page);
    await modHover(page, POINTER + 2);
    expect(await page.locator(".gedcom-hovered-pointer").count()).toBe(1);

    await modHover(page, TAG + 2);

    expect(await page.locator(".gedcom-hovered-pointer").count()).toBe(0);
    expect((await calls(page)).hides).toBe(1);
  });

  test("marks a hovered pointer that also carries a problem without losing either", async ({
    page,
  }) => {
    const doc =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 FAMC @I1@\n0 TRLR\n";
    await mount(page, { doc });
    await expect(page.locator(".cm-lintRange-error")).toBeVisible();

    const pointer = doc.indexOf("@I1@", doc.indexOf("1 FAMC")) + 2;
    await modHover(page, pointer);

    const both = await page.evaluate(() => {
      const read = (selector: string) => {
        const element = document.querySelector(selector);
        return element
          ? {
              decoration: getComputedStyle(element).textDecorationLine,
              style: getComputedStyle(element).textDecorationStyle,
            }
          : null;
      };
      return {
        hovered: read(".gedcom-hovered-pointer"),
        lint: read(".cm-lintRange-error"),
      };
    });

    expect(both.hovered?.decoration, "the gesture still marks it").toBe(
      "underline",
    );
    expect(both.lint?.style, "and the problem is still wavy under it").toBe(
      "wavy",
    );
  });

  test("lets go when the modifier is released over a focused editor", async ({
    page,
  }) => {
    await mount(page);
    await page.locator(".cm-content").click();
    await modHover(page, POINTER + 2);
    await page.keyboard.up("Meta");

    expect(await page.locator(".gedcom-hovered-pointer").count()).toBe(0);
    expect((await calls(page)).hides).toBe(1);
  });

  test("keeps the mark when the modifier is released over an editor that never had focus — lavich/domorium#177", async ({
    page,
  }) => {
    test.fail();
    await mount(page);
    await modHover(page, POINTER + 2);
    await page.keyboard.up("Meta");

    expect(await page.locator(".gedcom-hovered-pointer").count()).toBe(0);
  });
});
