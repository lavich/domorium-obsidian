import { platform } from "node:process";

import { expect, test, type Page } from "@playwright/test";

import { mount, SAMPLE, type MountOptions } from "./harness";

async function openSearch(
  page: Page,
  options: MountOptions = {},
): Promise<void> {
  await mount(page, { doc: SAMPLE, ...options });
  await page.evaluate(() => {
    window.gedcom.openSearch();
  });
  await page.waitForSelector(".document-search-container");
}

const input = ".document-search-input input";
const count = ".document-search-count";

/*
 * A tooltip spells its key for the reader's own platform. The host's platform is
 * the one ControlOrMeta follows, not the userAgent Playwright emulates, so the
 * spec is what knows it: `mount` tells the page, and the expected spelling here
 * comes from the same place.
 */
const mac = platform === "darwin";
const spell = (...parts: string[]): string => parts.join(mac ? " " : " + ");
const MOD = mac ? "\u2318" : "Ctrl";
const ALT = mac ? "\u2325" : "Alt";
const SHIFT = mac ? "\u21e7" : "Shift";

test.describe("the search bar", () => {
  test("wears Obsidian's own chrome rather than the library's", async ({
    page,
  }) => {
    await openSearch(page);

    await expect(page.locator(".search-input-container")).toHaveCount(1);
    await expect(
      page.locator(".cm-textfield, .cm-button"),
      "nothing of the library's own panel is left",
    ).toHaveCount(0);

    const buttons = page.locator(".clickable-icon");
    expect(await buttons.count(), "every control is an Obsidian icon").toBe(
      await page.locator(".clickable-icon > svg").count(),
    );
    expect(
      await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            ".document-search-container [aria-label]",
          ),
        ].map((control) => control.getAttribute("aria-label")),
      ),
      "every control names its label, then its key, as Obsidian's own do",
    ).toEqual([
      `Previous\n${spell(SHIFT, "F3")}`,
      "Next\nF3",
      `Select all matches\n${spell(ALT, "Enter")}`,
      "Exit search",
      "Replace\nEnter",
      `Replace all\n${spell(MOD, ALT, "Enter")}`,
    ]);
    expect(
      await page.evaluate(() =>
        [
          ...document.querySelectorAll(
            ".document-search-container [aria-label]",
          ),
        ].some((control) =>
          control.getAttribute("aria-label")?.includes("Mod"),
        ),
      ),
      "and none of them spells a modifier the way only the API does",
    ).toBe(false);
    for (const label of ["Match case", "Whole word", "Regular expression"]) {
      await expect(
        page.locator(`[aria-label="${label}"]`),
        "Obsidian's own row carries no flags, so neither does this one",
      ).toHaveCount(0);
    }
  });

  test("takes the focus when it opens, which is what a panel is for", async ({
    page,
  }) => {
    await openSearch(page);

    await expect(page.locator(input)).toBeFocused();
  });

  test("counts the matches, and says which one the cursor is on", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "NAME");
    await expect(page.locator(count)).toHaveText("1");

    await page.click('[aria-label^="Next"]');
    await expect(page.locator(count)).toHaveText("1/1");
  });

  test("marks the field when nothing in the file matches", async ({ page }) => {
    await openSearch(page);
    await page.fill(input, "Ipswich");

    await expect(page.locator(count)).toHaveText("");
    await expect(page.locator(".document-search-input")).toHaveClass(
      /mod-no-match/,
    );

    await page.fill(input, "NAME");
    await expect(page.locator(".document-search-input")).not.toHaveClass(
      /mod-no-match/,
    );
  });

  test("keeps replace out of the way until a command asks for it", async ({
    page,
  }) => {
    await openSearch(page);
    const replaceRow = page.locator(".document-replace");

    await expect(replaceRow).toBeHidden();
    await expect(
      page.locator('.document-search [aria-label^="Replace"]'),
      "and offers no control of its own for it",
    ).toHaveCount(0);

    await page.evaluate(() => {
      window.gedcom.openSearch(true);
    });
    await expect(replaceRow).toBeVisible();
  });

  test("replaces through the panel, in the document", async ({ page }) => {
    await mount(page, { doc: SAMPLE });
    await page.evaluate(() => {
      window.gedcom.openSearch(true);
    });
    await page.waitForSelector(".document-search-container");
    await page.fill(input, "John");
    await page.fill(".document-replace-input", "Jane");
    await page.click('.document-replace-buttons [aria-label^="Replace all"]');

    expect(
      await page.evaluate(() => window.gedcom.view?.state.sliceDoc()),
    ).toContain("1 NAME Jane /Smith/");
  });

  test("finds the next match on Enter and the previous on Shift-Enter", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "@F1@");
    await page.press(input, "Enter");
    await expect(page.locator(count)).toHaveText("1/2");

    await page.press(input, "Enter");
    await expect(page.locator(count)).toHaveText("2/2");

    await page.press(input, "Shift+Enter");
    await expect(page.locator(count)).toHaveText("1/2");
  });

  // #82: the keys are Obsidian's own, and they answer from either focus.
  test("finds on F3 and Mod+G, from the field and from the document", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "@F1@");

    await page.press(input, "F3");
    await expect(page.locator(count)).toHaveText("1/2");
    await page.press(input, "ControlOrMeta+g");
    await expect(page.locator(count)).toHaveText("2/2");
    await page.press(input, "Shift+F3");
    await expect(page.locator(count)).toHaveText("1/2");
    await page.press(input, "ControlOrMeta+Shift+G");
    await expect(page.locator(count)).toHaveText("2/2");

    await page.click(".cm-line");
    await page.keyboard.press("F3");
    await expect(
      page.locator(count),
      "the key answers with the focus in the document too",
    ).toHaveText("1/2");
    await page.keyboard.press("ControlOrMeta+g");
    await expect(page.locator(count)).toHaveText("2/2");
    await page.keyboard.press("Shift+F3");
    await expect(page.locator(count)).toHaveText("1/2");
    await page.keyboard.press("ControlOrMeta+Shift+G");
    await expect(page.locator(count)).toHaveText("2/2");
  });

  test("selects on Alt-Enter, and replaces every match from the replace field", async ({
    page,
  }) => {
    await mount(page, { doc: SAMPLE });
    await page.evaluate(() => {
      window.gedcom.openSearch(true);
    });
    await page.waitForSelector(".document-search-container");
    await page.fill(input, "@F1@");
    await page.fill(".document-replace-input", "@F2@");

    // The editor holds one range — allowMultipleSelections is off, upstream —
    // so select-all lands on a match, which is what the button does too.
    await page.press(input, "Alt+Enter");
    expect(
      await page.evaluate(() => {
        const main = window.gedcom.view?.state.selection.main;
        return main
          ? window.gedcom.view?.state.sliceDoc(main.from, main.to)
          : "";
      }),
      "select-all ran and the selection is on a match",
    ).toBe("@F1@");

    await page.press(".document-replace-input", "ControlOrMeta+Alt+Enter");
    const text = await page.evaluate(() =>
      window.gedcom.view?.state.sliceDoc(),
    );
    expect(text).toContain("1 FAMS @F2@");
    expect(text).toContain("0 @F2@ FAM");
  });

  // #82: the two keys that write, gated the way Obsidian's own bar gates them.
  // Replace-all wants the replace row open with the focus in it, so a
  // replacement the reader cannot see never reaches the file.
  test("leaves the writing keys alone from the document and from a collapsed row", async ({
    page,
  }) => {
    await mount(page, { doc: SAMPLE });
    await page.evaluate(() => {
      window.gedcom.openSearch(true);
    });
    await page.waitForSelector(".document-search-container");
    await page.fill(input, "@F1@");
    await page.fill(".document-replace-input", "@F2@");
    const doc = () =>
      page.evaluate(() => window.gedcom.view?.state.sliceDoc() ?? "");
    const before = await doc();

    await page.click(".cm-line");
    await page.keyboard.press("ControlOrMeta+Alt+Enter");
    expect(
      await doc(),
      "the focus is in the document, so the key is not the bar's",
    ).toBe(before);
    await page.keyboard.press("Alt+Enter");
    expect(
      await page.evaluate(() => window.gedcom.view?.state.selection.main.empty),
      "and neither is select-all",
    ).toBe(true);

    // Reopening on Find leaves the replacement in the query and out of sight.
    await page.evaluate(() => {
      window.gedcom.openSearch(false);
    });
    await expect(page.locator(".document-replace")).toBeHidden();
    await page.press(input, "ControlOrMeta+Alt+Enter");
    expect(
      await doc(),
      "a replacement the reader cannot see never reaches the file",
    ).toBe(before);
  });

  test("leaves Enter and Tab to the document while the bar is open", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "NAME");
    await page.click(".cm-line");
    const doc = () =>
      page.evaluate(() => window.gedcom.view?.state.sliceDoc() ?? "");
    const before = await doc();

    await page.keyboard.press("Enter");
    expect(
      (await doc()).length,
      "Enter opens a line rather than finding a match",
    ).toBe(before.length + 1);
    await expect(page.locator(".document-search-container")).toHaveCount(1);

    const opened = await doc();
    await page.keyboard.press("Tab");
    expect(
      (await doc()).length,
      "and Tab indents, as it does with no bar open",
    ).toBeGreaterThan(opened.length);
  });

  test("moves between the fields on Tab, and only where there are two", async ({
    page,
  }) => {
    await mount(page, { doc: SAMPLE });
    await page.evaluate(() => {
      window.gedcom.openSearch(true);
    });
    await page.waitForSelector(".document-search-container");

    await page.press(input, "Tab");
    await expect(page.locator(".document-replace-input")).toBeFocused();
    await page.press(".document-replace-input", "Shift+Tab");
    await expect(page.locator(input)).toBeFocused();

    await page.evaluate(() => {
      window.gedcom.openSearch(false);
    });
    await expect(page.locator(".document-replace")).toBeHidden();
    await page.press(input, "Tab");
    await expect(
      page.locator(".document-replace-input"),
      "no replace field to reach, so the bar takes no part in the key",
    ).not.toBeFocused();
    await expect(page.locator(input)).not.toBeFocused();
    expect(
      await page.evaluate(
        () =>
          document.activeElement?.closest(".document-search-container") !==
          null,
      ),
      "the focus moves on the way it would with no binding at all",
    ).toBe(true);
  });

  test("stops answering once the bar is closed, because the scope was popped", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "@F1@");
    await page.press(input, "F3");
    const at = () =>
      page.evaluate(() => window.gedcom.view?.state.selection.main.from);
    const found = await at();
    expect(found).toBeGreaterThan(0);

    await page.click('[aria-label^="Exit search"]');
    await page.keyboard.press("F3");

    expect(await at(), "nothing answers F3 with no bar open").toBe(found);
  });

  test("sits over the document rather than in the middle of the pane", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1400, height: 400 });
    await openSearch(page);

    const box = await page.evaluate(() => {
      const at = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        field: at(".document-search-input").left,
        line: at(".cm-line").left,
        content: at(".cm-content").width,
      };
    });

    expect(box.field, "the bar keeps to the left of a wide pane").toBeLessThan(
      120,
    );
    expect(
      box.content,
      "and the document keeps the pane, unlike a note",
    ).toBeGreaterThan(1200);
    expect(
      Math.abs(box.field - box.line),
      "so the field starts about where the lines do",
    ).toBeLessThan(40);
  });

  // #86: the field arrived at a sixth of the row, with the count over the text.
  test("leaves the field usable at the width of a phone", async ({ page }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openSearch(page, { mobile: true });

    const row = await page.evaluate(() => {
      const at = (selector: string) =>
        document.querySelector(selector)!.getBoundingClientRect();
      return {
        whole: at(".document-search").width,
        field: at(".document-search-input").width,
      };
    });

    expect(
      row.field,
      "the field keeps at least half the row it shares with the buttons",
    ).toBeGreaterThan(row.whole / 2);
  });

  // #87: the panel took room the view it sits in had already been given.
  test("does not push itself below the room made for the header", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 393, height: 852 });
    await openSearch(page, { mobile: true });

    const padding = await page.evaluate(() =>
      parseFloat(
        getComputedStyle(document.querySelector(".document-search-container")!)
          .paddingTop,
      ),
    );

    expect(
      padding,
      "a phone's header is not our panel's to clear",
    ).toBeLessThan(24);
  });

  // #82: the scope sees the key before CodeMirror does, so claiming one keeps
  // the editor from acting on it too.
  test("closes from the document, where the scope sees the key first", async ({
    page,
  }) => {
    await openSearch(page);
    await page.fill(input, "NAME");
    await page.click(".cm-line");
    const doc = () => page.evaluate(() => window.gedcom.view?.state.sliceDoc());
    const before = await doc();

    await page.keyboard.press("Escape");

    await expect(page.locator(".document-search-container")).toHaveCount(0);
    expect(await doc(), "the key closed the bar and typed nothing").toBe(
      before,
    );

    const range = await page.evaluate(() => {
      const view = window.gedcom.view!;
      view.dispatch({ selection: { anchor: 0, head: 6 } });
      return view.state.selection.main;
    });
    expect(range, "a range to collapse").toMatchObject({ from: 0, to: 6 });

    await page.keyboard.press("Escape");
    await expect(
      page.locator(".document-search-container"),
      "and the popped scope has nothing left to close",
    ).toHaveCount(0);

    expect(
      await page.evaluate(() => window.gedcom.view!.state.selection.main),
      "the document collapsed it to a cursor rather than to nothing",
    ).toMatchObject({ from: 6, to: 6 });
  });

  test("closes on Escape and on the button", async ({ page }) => {
    await openSearch(page);
    await page.press(input, "Escape");
    await expect(page.locator(".document-search-container")).toHaveCount(0);

    await page.evaluate(() => {
      window.gedcom.openSearch();
    });
    await page.click('[aria-label^="Exit search"]');
    await expect(page.locator(".document-search-container")).toHaveCount(0);
  });
});
