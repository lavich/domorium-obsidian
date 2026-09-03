import { expect, test, type Page } from "@playwright/test";

import { mount, offsetOf, SAMPLE } from "./harness";

/** `1 FAMS @F1@` on line 6 — a reference to the record declared on line 7. */
const POINTER = offsetOf(SAMPLE, "@F1@");
const TAG = offsetOf(SAMPLE, "FAMS");

async function hover(page: Page, offset: number): Promise<void> {
  const coords = await page.evaluate(
    (target) => window.gedcom.coordsAt(target),
    offset,
  );
  if (!coords) {
    throw new Error(`no coordinates for offset ${offset}`);
  }
  await page.mouse.move(coords.x, coords.y);
}

async function modHover(page: Page, offset: number): Promise<void> {
  await page.keyboard.down("Meta");
  await hover(page, offset);
}

function hovered(page: Page) {
  return page.evaluate(() => window.gedcom.hoveredSpan());
}

function calls(page: Page): Promise<{ previews: unknown[]; hides: number }> {
  return page.evaluate(() => ({
    previews: window.gedcom.calls.previews,
    hides: window.gedcom.calls.hides,
  }));
}

test.describe("the hovered pointer", () => {
  test("answers for a pointer, over both of its delimiters", async ({
    page,
  }) => {
    await mount(page);
    await modHover(page, POINTER + 2);

    expect(await hovered(page), "both @ are inside it").toEqual({
      from: POINTER,
      to: POINTER + 4,
    });
    expect((await calls(page)).previews).toEqual([
      { from: POINTER, to: POINTER + 4 },
    ]);
  });

  test("shows what it says on Obsidian's popover surface, not the library's grey", async ({
    page,
  }) => {
    await mount(page, { dark: true });
    await hover(page, offsetOf(SAMPLE, "INDI") + 1);
    await page.waitForSelector(".cm-tooltip");

    const box = await page.evaluate(() => {
      const style = getComputedStyle(document.querySelector(".cm-tooltip")!);
      return { background: style.backgroundColor, radius: style.borderRadius };
    });

    expect(box.background, "--background-primary in the dark palette").toBe(
      "rgb(20, 20, 20)",
    );
    expect(box.radius, "--radius-m").toBe("8px");
  });

  test("says nothing without the modifier, however long the mouse sits there", async ({
    page,
  }) => {
    await mount(page);
    await hover(page, POINTER + 2);

    expect(await hovered(page)).toBeNull();
    expect((await calls(page)).previews).toEqual([]);
  });

  test("does not answer for the tag two characters to the left", async ({
    page,
  }) => {
    await mount(page);
    await modHover(page, TAG + 2);

    expect(await hovered(page)).toBeNull();
    expect((await calls(page)).previews).toEqual([]);
  });

  test("lets go when the mouse moves off the pointer", async ({ page }) => {
    await mount(page);
    await modHover(page, POINTER + 2);
    expect(await hovered(page)).not.toBeNull();

    await modHover(page, TAG + 2);

    expect(await hovered(page)).toBeNull();
    expect((await calls(page)).hides).toBe(1);
  });

  test("leaves the problem's own underline alone on a pointer it is hovering", async ({
    page,
  }) => {
    const doc =
      "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 FAMC @I1@\n0 TRLR\n";
    await mount(page, { doc });
    await expect(page.locator(".cm-lintRange-error")).toBeVisible();

    const pointer = doc.indexOf("@I1@", doc.indexOf("1 FAMC")) + 2;
    await modHover(page, pointer);

    const lint = await page.evaluate(() => {
      const element = document.querySelector(".cm-lintRange-error");
      return element ? getComputedStyle(element).textDecorationStyle : null;
    });

    expect(await hovered(page), "the gesture answers for it").not.toBeNull();
    expect(lint, "and the problem is still wavy under it").toBe("wavy");
  });

  test("lets go when the modifier is released over a focused editor", async ({
    page,
  }) => {
    await mount(page);
    await page.locator(".cm-content").click();
    await modHover(page, POINTER + 2);
    await page.keyboard.up("Meta");

    expect(await hovered(page)).toBeNull();
    expect((await calls(page)).hides).toBe(1);
  });

  test("lets go when the modifier is released over an editor that never had focus", async ({
    page,
  }) => {
    await mount(page);
    await modHover(page, POINTER + 2);
    await page.keyboard.up("Meta");

    expect(await hovered(page)).toBeNull();
    expect((await calls(page)).hides).toBe(1);
  });
});

test.describe("the gesture the user has chosen", () => {
  test("answers a plain hover once previews are set to hover", async ({
    page,
  }) => {
    await mount(page, { recordPreview: "hover" });
    await hover(page, POINTER + 2);
    // A hover without a modifier waits for the pointer to rest, the way the tag
    // tooltip does; travelling across a pointer is not asking for its record.
    await expect
      .poll(async () => (await calls(page)).previews.length)
      .toBeGreaterThan(0);

    expect(await hovered(page)).not.toBeNull();
    expect((await calls(page)).previews).toEqual([
      { from: POINTER, to: POINTER + 4 },
    ]);
  });

  test("ignores a pointer that only passes across a reference", async ({
    page,
  }) => {
    await mount(page, { recordPreview: "hover" });
    await hover(page, POINTER + 2);
    await hover(page, TAG);
    await page.waitForTimeout(400);

    expect((await calls(page)).previews).toEqual([]);
  });

  test("answers nothing at all once previews are off", async ({ page }) => {
    await mount(page, { recordPreview: "off" });
    await modHover(page, POINTER + 2);

    expect(await hovered(page)).toBeNull();
    expect((await calls(page)).previews).toEqual([]);
  });
});
