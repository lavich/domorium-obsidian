import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { TabOptions } from "../harness/fileViews";
import { generated, generatedNotes } from "./generated";

async function mountList(page: Page, options: TabOptions = {}): Promise<void> {
  await page.goto(pathToFileURL(resolve("harness/fileViews.html")).href);
  await page.evaluate((tabOptions) => window.tab.mount(tabOptions), { mode: "list", ...options } satisfies TabOptions);
  await page.waitForSelector(".gedcom-list-row");
}

const WIDE = { width: 1400, height: 800 };
const PHONE = { width: 390, height: 800 };

async function searchFor(page: Page, text: string): Promise<void> {
  const open = await page.locator(".gedcom-list-find").evaluate((node) => node.classList.contains("is-open"));
  if (!open) {
    await page.locator(".gedcom-list-find-toggle").click();
  }
  await page.locator(".gedcom-list-search").fill(text);
}

const rows = (page: Page) => page.locator(".gedcom-list-row");
const rowOf = (page: Page, xref: string) => page.locator(`.gedcom-list-row[data-xref="${xref}"]`);
const names = (page: Page) =>
  page.locator(".gedcom-list-row .gedcom-list-cell:first-child").evaluateAll((cells) => cells.map((cell) => cell.textContent));
const cellTexts = (page: Page, xref: string) =>
  rowOf(page, xref).locator(".gedcom-list-cell").evaluateAll((cells) => cells.map((cell) => cell.textContent));
const header = (page: Page, label: string) => page.locator(".gedcom-list-sort", { hasText: label });
const KIND_BUTTON = ".gedcom-list-bar > .gedcom-list-seg > .gedcom-list-seg-button";
const seg = (page: Page, label: string) => page.locator(KIND_BUTTON, { hasText: label });
const kindSelect = (page: Page) => page.locator(".gedcom-list-kind-select");

async function chooseKind(page: Page, label: string): Promise<void> {
  if (await kindSelect(page).isVisible()) {
    await kindSelect(page).selectOption({ label });
  } else {
    await seg(page, label).click();
  }
}
const selected = (page: Page) => page.evaluate(() => window.tab.calls.selected);
const drawnRows = (page: Page) => rows(page).count();
const scrollTopOf = (page: Page) => page.locator(".gedcom-list-scroll").evaluate((node) => node.scrollTop);
const listBox = (page: Page) => page.locator(".gedcom-list-scroll").evaluate((node) => ({ height: node.clientHeight, top: node.scrollTop }));

async function sidewaysOverflow(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const list = document.querySelector<HTMLElement>(".gedcom-list");
    const scroll = document.querySelector<HTMLElement>(".gedcom-list-scroll");
    const views = document.getElementById("views");
    return (
      (list?.scrollWidth ?? 0) > (list?.clientWidth ?? 0) ||
      (scroll?.scrollWidth ?? 0) > (scroll?.clientWidth ?? 0) ||
      (views?.scrollWidth ?? 0) > (views?.clientWidth ?? 0)
    );
  });
}

async function expectInMiddleHalf(page: Page, xref: string): Promise<void> {
  const { height, top } = await listBox(page);
  const at = await rowOf(page, xref).evaluate((row) => Number((row as HTMLElement).dataset.pos));
  const rowHeight = await page.locator(".gedcom-list-probe").evaluate((probe) => probe.getBoundingClientRect().height);
  const offset = at * rowHeight - top;
  expect(offset).toBeGreaterThanOrEqual(height / 4);
  expect(offset + rowHeight).toBeLessThanOrEqual((3 * height) / 4);
}

const LONG = "Alexandrina-Wilhelmina-Magdalena-Konstantynopolitańczykowiczówna-Wasilewska ".repeat(3).trim();

function longFile(): string {
  return [
    "0 HEAD", "1 GEDC", "2 VERS 7.0",
    "0 @I1@ INDI", `1 NAME ${LONG} /${LONG}/`, "1 BIRT", "2 DATE 1801", `2 PLAC ${LONG}, ${LONG}`,
    "1 FAMS @F1@",
    "0 @I2@ INDI", "1 NAME Jan /Nowak/", "1 FAMS @F1@",
    "0 @F1@ FAM", "1 HUSB @I2@", "1 WIFE @I1@", "1 MARR", "2 DATE 1830", `2 PLAC ${LONG}`,
    "0 @S1@ SOUR", `1 TITL ${LONG}`, `1 AUTH ${LONG}`, "1 REPO @R1@",
    "0 @R1@ REPO", `1 NAME ${LONG}`,
    "0 TRLR", "",
  ].join("\n");
}

test.describe("the list on a wide tab", () => {
  test.use({ viewport: WIDE });

  test("shows the 17 people with Marie's cells in order, a header row and one-line rows", async ({ page }) => {
    await mountList(page);

    await expect(rows(page)).toHaveCount(17);
    expect(await cellTexts(page, "@I1@")).toEqual(["Marie Skłodowska-Curie", "1867–1934", "Warsaw, Congress Poland", "2"]);
    await expect(page.locator(".gedcom-list-head")).toBeVisible();
    await expect(page.locator(".gedcom-list-sortbar")).toBeHidden();
    await expect(page.locator(".gedcom-list-count")).toHaveText("17 people");
    const heights = await rows(page).evaluateAll((all) => all.map((row) => Math.round(row.getBoundingClientRect().height)));
    expect(new Set(heights).size).toBe(1);
    const centres = await rowOf(page, "@I1@").locator(".gedcom-list-cell").evaluateAll((cells) => cells.map((cell) => {
      const box = cell.getBoundingClientRect();
      return box.top + box.height / 2;
    }));
    expect(Math.max(...centres) - Math.min(...centres)).toBeLessThan(1.5);
  });

  test("lists the families and the sources the spec names", async ({ page }) => {
    await mountList(page);

    await seg(page, "Families").click();
    expect(await cellTexts(page, "@F3@")).toEqual(["Pierre Curie ⚭ Marie Skłodowska-Curie", "1895", "Sceaux, France", "2"]);
    await expect(page.locator(".gedcom-list-count")).toHaveText("5 families");
    await seg(page, "Sources").click();
    expect(await cellTexts(page, "@S2@")).toEqual(["Parish registers of Warsaw", "", "State Archive in Warsaw", "2"]);
    await expect(page.locator(".gedcom-list-count")).toHaveText("3 sources");
  });

  test("sorts on a header press, reverses on the second and restores on the third", async ({ page }) => {
    await mountList(page);

    await header(page, "Name").click();
    expect((await names(page))[0]).toBe("Bronisława Boguska");
    await expect(page.locator('.gedcom-list-headcell[aria-sort="ascending"]')).toHaveCount(1);
    await header(page, "Name").click();
    expect((await names(page))[0]).toBe("Helena Szalay");
    await header(page, "Name").click();
    expect((await names(page))[0]).toBe("Marie Skłodowska-Curie");
    await expect(page.locator('.gedcom-list-headcell[aria-sort="none"]')).toHaveCount(4);
  });

  test("narrows with the filter, and says how many", async ({ page }) => {
    await mountList(page);

    await searchFor(page, "joliot");
    await expect(rows(page)).toHaveCount(4);
    await expect(page.locator(".gedcom-list-count")).toHaveText("4 of 17 people");
  });

  test("has no switch for the people who cite no source, and sorting by Sources lists them first", async ({ page }) => {
    await mountList(page);
    await expect(page.locator(".gedcom-list-chip")).toHaveCount(0);

    await header(page, "Sources").click();

    await expect(rows(page)).toHaveCount(17);
    const marks = await rows(page).evaluateAll((all) => all.map((row) => row.querySelector(".gedcom-list-gap") !== null));
    expect(marks.slice(0, 11)).toEqual(Array(11).fill(true));
    expect(marks.slice(11)).toEqual(Array(6).fill(false));
  });

  test("selects the record of a clicked row, marks the row, and does not move the list", async ({ page }) => {
    await mountList(page, { doc: generated(500) });
    await page.locator(".gedcom-list-scroll").evaluate((node) => {
      node.scrollTop = 5000;
    });
    await expect.poll(() => rows(page).first().getAttribute("data-pos").then(Number)).toBeGreaterThan(50);
    const target = page.locator(".gedcom-list-row").nth(14);
    const xref = await target.getAttribute("data-xref");
    const before = await scrollTopOf(page);

    await target.click();

    expect(await selected(page)).toEqual([xref]);
    await expect(rowOf(page, xref ?? "")).toHaveClass(/is-selected/);
    expect(await scrollTopOf(page)).toBe(before);
  });

  test("brings a selection handed over with a reveal into the middle half of a long list, also from while the list was hidden", async ({ page }) => {
    await mountList(page, { doc: generated(500) });

    await page.evaluate(() => window.tab.select("@I400@", true));
    await expect(rowOf(page, "@I400@")).toHaveClass(/is-selected/);
    await expectInMiddleHalf(page, "@I400@");

    await page.click("#show-source");
    await page.evaluate(() => window.tab.select("@I250@", true));
    await page.click("#show-list");
    await expect(rowOf(page, "@I250@")).toHaveClass(/is-selected/);
    await expectInMiddleHalf(page, "@I250@");
  });

  test("moves the virtual focus with the keys and selects with Enter", async ({ page }) => {
    await mountList(page);
    await page.locator(".gedcom-list-scroll").focus();

    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    expect(await selected(page)).toEqual([]);
    const active = await page.locator(".gedcom-list-scroll").getAttribute("aria-activedescendant");
    await expect(page.locator(`#${active}`)).toHaveClass(/is-focused/);

    await page.keyboard.press("Enter");

    expect(await selected(page)).toEqual(["@I2@"]);
    await expect(page.locator(`#${active}`)).toHaveClass(/is-selected/);
  });

  test("switches the kind for a family and a source selected from outside", async ({ page }) => {
    await mountList(page);

    await page.evaluate(() => window.tab.select("@F3@", true));
    await expect(seg(page, "Families")).toHaveAttribute("aria-pressed", "true");
    await expect(rowOf(page, "@F3@")).toHaveClass(/is-selected/);
    await page.evaluate(() => window.tab.select("@S2@", true));
    await expect(seg(page, "Sources")).toHaveAttribute("aria-pressed", "true");
    await expect(rowOf(page, "@S2@")).toHaveClass(/is-selected/);
  });

  test("keeps the kind, the sort and the filter across the graph and back", async ({ page }) => {
    await mountList(page);
    await seg(page, "Families").click();
    await header(page, "Children").click();
    await searchFor(page, "curie");

    await page.click("#show-graph");
    await page.click("#show-list");

    await expect(page.locator(".gedcom-list-search")).toHaveValue("curie");
    await expect(seg(page, "Families")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator('.gedcom-list-headcell[aria-sort="ascending"]')).toHaveText(/Children/);
  });

  test("keeps the family a selection from outside chose when the tab goes to the graph and back", async ({ page }) => {
    await mountList(page);

    await page.evaluate(() => window.tab.select("@F3@", true));
    await page.click("#show-graph");
    await page.click("#show-list");

    await expect(seg(page, "Families")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".gedcom-list-row.is-selected")).toHaveCount(1);
    await expect(rowOf(page, "@F3@")).toHaveClass(/is-selected/);
  });

  test("keeps the keyboard focus on a header button, and sorts ascending, descending, then in file order", async ({ page }) => {
    await mountList(page);
    const name = header(page, "Name");
    await name.focus();

    await page.keyboard.press("Enter");
    await expect(name.locator("xpath=..")).toHaveAttribute("aria-sort", "ascending");
    await expect(name).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(name.locator("xpath=..")).toHaveAttribute("aria-sort", "descending");
    await expect(name).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(name.locator("xpath=..")).toHaveAttribute("aria-sort", "none");
    await expect(name).toBeFocused();
  });

  test("opens from its icon, narrows and counts, clears with the cross and stays open, collapses on the second Escape", async ({ page }) => {
    await mountList(page);
    const find = page.locator(".gedcom-list-find");
    await expect(page.locator(".gedcom-list-find-prev, .gedcom-list-find-next")).toHaveCount(0);

    await searchFor(page, "joliot");
    await expect(rows(page)).toHaveCount(4);
    await expect(page.locator(".gedcom-list-find-count")).toHaveText("4 of 17 people");
    await page.locator(".gedcom-list-find-clear").click();
    await expect(page.locator(".gedcom-list-search")).toHaveValue("");
    await expect(rows(page)).toHaveCount(17);
    await expect(find).toHaveClass(/is-open/);

    await searchFor(page, "joliot");
    await page.keyboard.press("Escape");
    await expect(page.locator(".gedcom-list-search")).toHaveValue("");
    await expect(find).toHaveClass(/is-open/);
    await page.keyboard.press("Escape");
    await expect(find).not.toHaveClass(/is-open/);
  });

  test("opens and focuses its field for the find key", async ({ page }) => {
    await mountList(page);

    await page.evaluate(() => window.tab.openSearch());

    await expect(page.locator(".gedcom-list-find")).toHaveClass(/is-open/);
    await expect(page.locator(".gedcom-list-search")).toBeFocused();
  });

  test("floats inside the toolbar, clear of the header buttons and the scrollbar, and Enter moves to the rows", async ({ page }) => {
    await mountList(page, { doc: generated(500) });
    await searchFor(page, "person");
    const boxes = await page.evaluate(() => {
      const box = (selector: string) => document.querySelector(selector)?.getBoundingClientRect();
      const find = box(".gedcom-list-find");
      const head = box(".gedcom-list-head");
      const root = box(".gedcom-list");
      return { find: find && { top: find.top, bottom: find.bottom, right: find.right }, head: head && { top: head.top }, root: root && { right: root.right } };
    });
    expect(boxes.find?.bottom ?? 0).toBeLessThanOrEqual(boxes.head?.top ?? 0);
    expect(boxes.find?.right ?? 0).toBeLessThanOrEqual(boxes.root?.right ?? 0);

    await page.keyboard.press("Enter");
    await expect(page.locator(".gedcom-list-scroll")).toBeFocused();
  });

  test("says what matches nothing and what an empty kind holds", async ({ page }) => {
    await mountList(page);
    await searchFor(page, "zzz");
    await expect(page.locator(".gedcom-list-none")).toHaveText("Nothing matches “zzz”. Search covers names, years and places.");

    await mountList(page, { doc: "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 NAME A /B/\n0 TRLR\n" });
    await seg(page, "Sources").click();
    await expect(page.locator(".gedcom-list-none")).toHaveText("The file holds no sources.");
  });

  test("flips to the compact layout below 640 pixels and back only from 680", async ({ page }) => {
    await mountList(page);
    const compact = async (width: number) => {
      await page.evaluate((to) => {
        document.getElementById("leaf")?.style.setProperty("width", `${to}px`);
        window.tab.resized();
      }, width);
      return page.locator(".gedcom-list").evaluate((node) => node.classList.contains("is-compact"));
    };

    expect(await compact(660)).toBe(false);
    expect(await compact(620)).toBe(true);
    expect(await compact(660)).toBe(true);
    expect(await compact(700)).toBe(false);
  });

  test("has the file explorer's metrics: its text size, its line height and padding, and a gap of 2 pixels between rows", async ({ page }) => {
    await mountList(page);
    const measure = () =>
      page.evaluate(() => {
        const rows = [...document.querySelectorAll<HTMLElement>(".gedcom-list-row")];
        const [one, two] = rows;
        const name = one?.querySelector(".gedcom-list-cell") as HTMLElement;
        const second = one?.querySelectorAll(".gedcom-list-cell")[1] as HTMLElement;
        const body = getComputedStyle(document.body);
        return {
          size: getComputedStyle(name).fontSize,
          navSize: body.getPropertyValue("--nav-item-size").trim(),
          smaller: getComputedStyle(second).fontSize,
          uiSmaller: body.getPropertyValue("--font-ui-smaller").trim(),
          line: Number.parseFloat(body.getPropertyValue("--line-height-tight")),
          padding: Number.parseFloat(getComputedStyle(one).paddingTop),
          height: one?.getBoundingClientRect().height ?? 0,
          step: (two?.getBoundingClientRect().top ?? 0) - (one?.getBoundingClientRect().top ?? 0),
        };
      });

    const now = await measure();
    expect(now.size).toBe(now.navSize);
    expect(now.smaller).toBe(now.uiSmaller);
    expect(Math.abs(now.height - (Number.parseFloat(now.size) * now.line + 2 * now.padding))).toBeLessThan(1);
    expect(Math.abs(now.step - now.height - 2)).toBeLessThan(1);
  });

  test("follows the font size: the rows grow with it and keep the pitch of their height and the gap", async ({ page }) => {
    await mountList(page);
    const pitch = () =>
      page.evaluate(() => {
        const [one, two] = [...document.querySelectorAll<HTMLElement>(".gedcom-list-row")];
        return { height: one?.getBoundingClientRect().height ?? 0, step: (two?.getBoundingClientRect().top ?? 0) - (one?.getBoundingClientRect().top ?? 0) };
      });
    const before = await pitch();

    await page.evaluate((size) => document.body.style.setProperty("--font-ui-small", size), "20px");

    await expect.poll(async () => (await pitch()).height).toBeGreaterThan(before.height + 5);
    await expect.poll(async () => {
      const now = await pitch();
      return Math.abs(now.step - now.height - 2);
    }).toBeLessThan(1);
  });

  test("shows the mark of a person with no source as a shape with a label", async ({ page }) => {
    await mountList(page);

    const mark = rowOf(page, "@I5@").locator(".gedcom-list-gap");
    await expect(mark).toHaveAttribute("aria-label", "No sources at all");
    const box = await mark.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(10);
  });

  test("lists the header buttons of the stand-in tab as Graph, Timeline, List, Source", async ({ page }) => {
    await mountList(page);

    expect(await page.locator("#bar button").evaluateAll((all) => all.map((button) => button.getAttribute("aria-label")).slice(0, 4))).toEqual([
      "Graph", "Timeline", "List", "Source",
    ]);
  });

  for (const language of ["en", "ru"] as const) {
    test(`has nothing to scroll sideways with names, places and titles far longer than the width, in ${language}`, async ({ page }) => {
      for (const width of [1400, 390, 320]) {
        await page.setViewportSize({ width, height: 800 });
        await mountList(page, { doc: longFile(), language, phone: width < 400, touch: width < 400 });
        for (const label of language === "ru" ? ["Люди", "Семьи", "Источники", "Медиа", "Заметки", "Хранилища", "Прочее"] : ["People", "Families", "Sources", "Media", "Notes", "Repositories", "Other"]) {
          await chooseKind(page, label);
          expect(await sidewaysOverflow(page), `${label} at ${width}`).toBe(false);
        }
      }
    });
  }

  test("cuts a long name with an ellipsis", async ({ page }) => {
    await mountList(page, { doc: longFile() });

    const style = await rowOf(page, "@I1@").locator(".gedcom-list-cell").first().evaluate((cell) => {
      const computed = getComputedStyle(cell);
      return { overflow: computed.overflow, ellipsis: computed.textOverflow, wrap: computed.whiteSpace, cut: cell.scrollWidth > cell.clientWidth };
    });
    expect(style).toEqual({ overflow: "hidden", ellipsis: "ellipsis", wrap: "nowrap", cut: true });
  });

  for (const width of [260, 200]) {
    test(`keeps the kinds' dropdown inside the toolbar at ${width} px`, async ({ page }) => {
      await mountList(page);
      await page.evaluate((to) => {
        document.getElementById("leaf")?.style.setProperty("width", `${to}px`);
        window.tab.resized();
      }, width);
      const fit = await page.evaluate(() => {
        const bar = document.querySelector(".gedcom-list-bar")?.getBoundingClientRect();
        const box = document.querySelector(".gedcom-list-kind-select")?.getBoundingClientRect();
        return bar !== undefined && box !== undefined && box.width > 0 && box.left >= bar.left - 0.5 && box.right <= bar.right + 0.5;
      });

      expect(fit).toBe(true);
      await expect(page.locator(".gedcom-list-bar > .gedcom-list-seg")).toBeHidden();
      expect(await sidewaysOverflow(page)).toBe(false);
    });
  }

  test("rounds the kind buttons inside their bar by the bar's radius less its inset", async ({ page }) => {
    await mountList(page);
    const radii = await page.evaluate(() => {
      const bar = document.querySelector(".gedcom-list-seg");
      const tab = document.querySelector(".gedcom-list-seg-button");
      const px = (value: string | undefined) => Number.parseFloat(value ?? "");
      return {
        bar: px(bar ? getComputedStyle(bar).borderTopLeftRadius : undefined),
        inset: px(bar ? getComputedStyle(bar).paddingTop : undefined),
        tab: px(tab ? getComputedStyle(tab).borderTopLeftRadius : undefined),
      };
    });

    expect(radii.tab).toBe(radii.bar - radii.inset);
  });

  test("is not dressed as Obsidian's buttons", async ({ page }) => {
    await mountList(page);
    const look = (selector: string) =>
      page.locator(selector).first().evaluate((node) => {
        const style = getComputedStyle(node);
        return { background: style.backgroundColor, shadow: style.boxShadow };
      });

    for (const selector of [
      ".gedcom-list-sort",
      ".gedcom-list-seg-button:not(.is-active)",
      ".gedcom-list-row:not(.is-selected)",
    ]) {
      expect(await look(selector), selector).toEqual({ background: "rgba(0, 0, 0, 0)", shadow: "none" });
    }
    await page.setViewportSize({ width: 500, height: 800 });
    await page.evaluate(() => window.tab.resized());
    expect(await look(".gedcom-list-direction")).toEqual({ background: "rgba(0, 0, 0, 0)", shadow: "none" });
  });
});

async function expectOneControlHeight(page: Page): Promise<void> {
  const heights = await page.evaluate(() => {
    const height = (selector: string) => [...document.querySelectorAll(selector)].map((node) => node.getBoundingClientRect().height);
    return {
      bar: height(".gedcom-list-bar > .gedcom-list-seg").filter((one) => one > 0),
      buttons: height(".gedcom-list-bar > .gedcom-list-seg > .gedcom-list-seg-button").filter((one) => one > 0),
      filter: height(".gedcom-list-find"),
      select: height(".gedcom-list-sort-select").filter((one) => one > 0),
      kinds: height(".gedcom-list-kind-select").filter((one) => one > 0),
    };
  });
  const control = heights.filter[0] ?? NaN;
  for (const [name, all] of Object.entries(heights)) {
    if (name === "buttons") {
      continue;
    }
    for (const one of all) {
      expect(Math.abs(one - control), name).toBeLessThanOrEqual(1);
    }
  }
  if (heights.buttons.length > 0) {
    expect(Math.max(...heights.buttons) - Math.min(...heights.buttons)).toBeLessThanOrEqual(1);
    expect(heights.buttons[0] ?? NaN).toBeLessThanOrEqual(control);
  }
}

test.describe("the toolbar's controls", () => {
  test("share one height on a desktop and with a touch pointer, the sort select with them in a compact list", async ({ page }) => {
    await page.setViewportSize(WIDE);
    await mountList(page);
    await expectOneControlHeight(page);

    await mountList(page, { touch: true, phone: true });
    await expectOneControlHeight(page);
    expect(await page.locator(".gedcom-list-find").evaluate((node) => node.getBoundingClientRect().height)).toBeGreaterThanOrEqual(43.5);
  });

  test("keep the sort select and the direction button at the toolbar's height in a narrow tab with a mouse, the select as wide as its content", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 800 });
    await mountList(page);

    await expect(page.locator(".gedcom-list")).toHaveClass(/is-compact/);
    await expectOneControlHeight(page);
    const select = await page.locator(".gedcom-list-sort-select").boundingBox();
    const direction = await page.locator(".gedcom-list-direction").boundingBox();
    const kinds = await page.locator(".gedcom-list-kind-select").boundingBox();
    expect(select?.height ?? NaN).toBeLessThan(43.5);
    expect(Math.abs((direction?.height ?? NaN) - (kinds?.height ?? NaN))).toBeLessThanOrEqual(1);
    expect(select?.width ?? NaN).toBeLessThan(250);
  });
});

test.describe("the list on a phone", () => {
  test.use({ viewport: PHONE });

  test("has two-line rows of at least 44 pixels, a sort selector and no header, and nothing to scroll sideways", async ({ page }) => {
    await mountList(page, { phone: true, touch: true });

    await expect(rows(page)).toHaveCount(17);
    await expect(page.locator(".gedcom-list-head")).toBeHidden();
    await expect(page.locator(".gedcom-list-sort-select")).toBeVisible();
    const row = rowOf(page, "@I1@");
    expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    const tops = await row.locator(".gedcom-list-cell").evaluateAll((cells) => cells.map((cell) => Math.round(cell.getBoundingClientRect().top)));
    expect(tops[2]).toBeGreaterThan(tops[0] ?? 0);
    expect(await sidewaysOverflow(page)).toBe(false);
  });

  test("sorts by the selector and turns the direction", async ({ page }) => {
    await mountList(page, { phone: true, touch: true });

    await page.locator(".gedcom-list-sort-select").selectOption("years");
    expect((await names(page))[0]).toBe("Eugène Curie");
    await page.locator(".gedcom-list-direction").click();
    expect((await names(page))[0]).toBe("Pierre Joliot");
  });

  test("makes every control at least 44 pixels tall", async ({ page }) => {
    await mountList(page, { phone: true, touch: true });

    for (const selector of [".gedcom-list-sort-select", ".gedcom-list-direction", ".gedcom-list-kind-select", ".gedcom-list-find"]) {
      const boxes = await page.locator(selector).evaluateAll((all) => all.map((node) => node.getBoundingClientRect().height));
      expect(Math.min(...boxes), selector).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test.describe("the list on a tablet", () => {
  test.use({ viewport: { width: 1000, height: 800 } });

  test("takes two-line rows and 44-pixel controls with a touch pointer", async ({ page }) => {
    await mountList(page, { touch: true });

    await expect(page.locator(".gedcom-list")).toHaveClass(/is-compact/);
    expect((await rowOf(page, "@I1@").boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    for (const selector of [KIND_BUTTON, ".gedcom-list-find"]) {
      const heights = await page.locator(selector).evaluateAll((all) => all.map((node) => node.getBoundingClientRect().height));
      expect(Math.min(...heights), selector).toBeGreaterThanOrEqual(43.5);
    }
  });
});

test.describe("a list of twenty thousand people", () => {
  test.use({ viewport: WIDE });

  const people = 20_000;
  const big = (() => {
    const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0"];
    for (let at = 1; at <= people; at += 1) {
      lines.push(`0 @I${at}@ INDI`, `1 NAME Person${at} /Family${at % 97}/`, "1 BIRT", `2 DATE ${1700 + (at % 300)}`);
    }
    lines.push("0 TRLR", "");
    return lines.join("\n");
  })();

  test("draws a window of rows over a spacer as tall as all of them, and scrolling draws the rows in view", async ({ page }) => {
    await mountList(page, { doc: big });
    expect(await drawnRows(page)).toBeLessThan(100);
    const spacer = await page.locator(".gedcom-list-spacer").evaluate((node) => node.getBoundingClientRect().height);
    const rowHeight = await page.locator(".gedcom-list-probe").evaluate((probe) => probe.getBoundingClientRect().height);
    expect(spacer).toBeGreaterThanOrEqual(people * rowHeight - 1);

    await page.locator(".gedcom-list-scroll").evaluate((node, to) => {
      node.scrollTop = to;
    }, rowHeight * 10_000);

    await expect(rowOf(page, "@I10001@")).toBeVisible();
    expect(await drawnRows(page)).toBeLessThan(100);
  });

  test("draws the last row for End, in view, with the focus, and only a window", async ({ page }) => {
    await mountList(page, { doc: big });
    await page.locator(".gedcom-list-scroll").focus();

    await page.keyboard.press("End");

    await expect(rowOf(page, `@I${people}@`)).toBeVisible();
    expect(await page.locator(".gedcom-list-scroll").getAttribute("aria-activedescendant")).toBe(
      await rowOf(page, `@I${people}@`).getAttribute("id"),
    );
    expect(await drawnRows(page)).toBeLessThan(100);
  });

  test("draws only a window after each keystroke and after a header press", async ({ page }) => {
    await mountList(page, { doc: big });

    const counts = await page.locator(".gedcom-list-search").evaluate((input: HTMLInputElement) => {
      const drawn: number[] = [];
      for (const query of ["P", "Pe", "Per", "Pers", "Person1234"]) {
        input.value = query;
        input.dispatchEvent(new Event("input"));
        drawn.push(document.querySelectorAll(".gedcom-list-row").length);
      }
      return drawn;
    });
    expect(Math.max(...counts)).toBeLessThan(100);
    await expect(rows(page).first().locator(".gedcom-list-cell").first()).toHaveText(/^Person1234 /);

    await searchFor(page, "");
    await header(page, "Name").click();

    expect(await drawnRows(page)).toBeLessThan(100);
    expect(await drawnRows(page)).toBeGreaterThan(0);
  });
});

test.describe("hover tooltips", () => {
  test.use({ viewport: WIDE });

  const large = () =>
    [...document.querySelectorAll<HTMLElement | SVGElement>("[aria-label]")]
      .filter((node) => !node.matches("button, [role=button], select, input, .gedcom-list-gap"))
      .filter((node) => {
        const box = node.getBoundingClientRect();
        return box.width > 120 && box.height > 60;
      })
      .map((node) => `${node.tagName}.${node.getAttribute("class")}`);

  for (const mode of ["list", "graph", "timeline"] as const) {
    test(`no large element of the ${mode} carries an aria-label`, async ({ page }) => {
      await page.goto(pathToFileURL(resolve("harness/fileViews.html")).href);
      await page.evaluate((shown) => window.tab.mount({ mode: shown }), mode);
      await page.waitForSelector(mode === "list" ? ".gedcom-list-row" : mode === "graph" ? ".gedcom-fg-person" : ".gedcom-ft-life");

      expect(await page.evaluate(large)).toEqual([]);
    });
  }

  test("the grid is named by an element that holds the label", async ({ page }) => {
    await mountList(page);

    const label = await page.locator(".gedcom-list-scroll").evaluate((grid) => {
      const id = grid.getAttribute("aria-labelledby") ?? "";
      return document.getElementById(id)?.textContent;
    });
    expect(label).toBe("Records of the file");
  });

  test("no large element of the record card carries an aria-label", async ({ page }) => {
    await page.goto(pathToFileURL(resolve("harness/desk.html")).href);
    await page.evaluate(() => window.desk.mount({}));
    await page.waitForSelector(".gedcom-card");

    expect(await page.evaluate(large)).toEqual([]);
  });
});

for (const viewport of [WIDE, PHONE]) {
  const phone = viewport.width < 400;

  test.describe(`the kinds of the list at ${viewport.width} px`, () => {
    test.use({ viewport });

    test("has no Events kind and no Places kind", async ({ page }) => {
      await mountList(page, { events: true, phone, touch: phone });

      const kinds = ["People", "Families", "Sources", "Media", "Notes", "Repositories", "Other"];
      if (phone) {
        await expect(kindSelect(page).locator("option")).toHaveText(kinds);
        await expect(kindSelect(page)).toHaveValue("people");
      } else {
        await expect(page.locator(KIND_BUTTON)).toHaveText(kinds);
        await expect(page.locator(`${KIND_BUTTON}.is-active`)).toHaveText("People");
      }
    });

    test("marks nothing and keeps the kind for a place an older workspace selected", async ({ page }) => {
      await mountList(page, { events: true, phone, touch: phone });
      await page.evaluate(() => window.tab.select("place:paris, france", true));

      await expect(page.locator(".gedcom-list-row[aria-selected='true']")).toHaveCount(0);
      if (phone) {
        await expect(kindSelect(page)).toHaveValue("people");
      } else {
        await expect(page.locator(`${KIND_BUTTON}.is-active`)).toHaveText("People");
      }
    });
  });
}

async function setLeafWidth(page: Page, width: number): Promise<void> {
  await page.evaluate((to) => {
    document.getElementById("leaf")?.style.setProperty("width", `${to}px`);
    window.tab.resized();
  }, width);
}

const kindsState = (page: Page) =>
  page.evaluate(() => {
    const bar = document.querySelector<HTMLElement>(".gedcom-list-bar");
    const probe = document.querySelector<HTMLElement>(".gedcom-list-kinds-probe > .gedcom-list-seg");
    const icon = document.querySelector<HTMLElement>(".gedcom-list-find-toggle");
    const gap = Number.parseFloat(bar ? getComputedStyle(bar).columnGap : "") || 0;
    return {
      bar: bar?.clientWidth ?? 0,
      needed: (probe?.getBoundingClientRect().width ?? 0) + gap + (icon?.getBoundingClientRect().width ?? 0),
      dropdown: (document.querySelector<HTMLElement>(".gedcom-list-kind-select")?.offsetWidth ?? 0) > 0,
    };
  });

test.describe("the kinds as buttons or a dropdown", () => {
  test.use({ viewport: WIDE });

  for (const language of ["en", "ru"] as const) {
    test(`switch at the measured width of the buttons and back past the margin, in ${language}`, async ({ page }) => {
      await mountList(page, { language });
      expect((await kindsState(page)).dropdown).toBe(false);

      let width = 1000;
      let before = await kindsState(page);
      for (; width > 200; width -= 2) {
        await setLeafWidth(page, width);
        const now = await kindsState(page);
        if (now.dropdown) {
          expect(now.bar).toBeLessThan(now.needed);
          expect(before.bar).toBeGreaterThanOrEqual(before.needed);
          break;
        }
        before = now;
      }
      expect(width).toBeGreaterThan(200);

      for (; width < 1000; width += 2) {
        await setLeafWidth(page, width);
        const now = await kindsState(page);
        if (!now.dropdown) {
          expect(now.bar).toBeGreaterThan(now.needed + 40);
          break;
        }
        expect(now.bar).toBeLessThanOrEqual(now.needed + 40);
      }
      expect(width).toBeLessThan(1000);
    });
  }

  test("are measured in the language shown", async ({ page }) => {
    await mountList(page, { language: "en" });
    const english = (await kindsState(page)).needed;
    await mountList(page, { language: "ru" });
    const russian = (await kindsState(page)).needed;

    expect(Math.abs(english - russian)).toBeGreaterThan(1);
  });

  test("offer the seven kinds in one dropdown named as the kind of records, and choosing Notes shows the notes", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mountList(page, { phone: true, touch: true });

    await expect(kindSelect(page)).toBeVisible();
    await expect(kindSelect(page).locator("option")).toHaveText(["People", "Families", "Sources", "Media", "Notes", "Repositories", "Other"]);
    expect(await kindSelect(page).evaluate((select) => document.getElementById(select.getAttribute("aria-labelledby") ?? "")?.textContent)).toBe("Kind of records");
    expect((await kindSelect(page).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    await kindSelect(page).selectOption("notes");
    await expect(page.locator(".gedcom-list-count")).toHaveText("2 notes");
  });

  test("is where the buttons were in the order of the keyboard", async ({ page }) => {
    await page.setViewportSize(PHONE);
    await mountList(page, { phone: true, touch: true });
    await page.locator(".gedcom-list-kind-select").focus();
    await page.keyboard.press("Tab");

    await expect(page.locator(".gedcom-list-find-toggle")).toBeFocused();
  });
});

test.describe("the media, notes, repositories and other records", () => {
  test.use({ viewport: WIDE });

  test("show their rows, counts and headers", async ({ page }) => {
    await mountList(page);

    await chooseKind(page, "Media");
    await expect(page.locator(".gedcom-list-count")).toHaveText("7 media");
    expect(await cellTexts(page, "@O5@")).toEqual(["The Curie family, about 1908", "Media/curie-family-1908.svg", "image/svg+xml", "2"]);
    expect(await cellTexts(page, "@O7@")).toEqual(["A plate nobody can find", "Media/lost-daguerreotype.jpg", "image/jpeg", "0"]);

    await chooseKind(page, "Notes");
    await expect(page.locator(".gedcom-list-count")).toHaveText("2 notes");
    expect(await cellTexts(page, "@N1@")).toEqual(["The only person to have won a Nobel Prize in two different sciences:", "1"]);
    await expect(page.locator(".gedcom-list-headcell:visible")).toHaveText(["Text", "Linked from"]);

    await chooseKind(page, "Repositories");
    await expect(page.locator(".gedcom-list-count")).toHaveText("2 repositories");
    expect(await cellTexts(page, "@R1@")).toEqual(["Nobel Prize Outreach", "", "2"]);
    expect(await cellTexts(page, "@R2@")).toEqual(["State Archive in Warsaw", "Krzywe Koło 7", "1"]);

    await chooseKind(page, "Other");
    await expect(page.locator(".gedcom-list-count")).toHaveText("2 records");
    expect(await cellTexts(page, "header:")).toEqual(["Header", "File header", ""]);
    expect(await cellTexts(page, "@U1@")).toEqual(["Submitter", "Domorium", "1"]);
  });

  test("search the whole note, the address without marks and the kind", async ({ page }) => {
    await mountList(page);

    await chooseKind(page, "Notes");
    await searchFor(page, "chemistry");
    expect(await names(page)).toEqual(["The only person to have won a Nobel Prize in two different sciences:"]);
    await expect(page.locator(".gedcom-list-count")).toHaveText("1 of 2 notes");

    await chooseKind(page, "Repositories");
    await searchFor(page, "kolo");
    expect(await names(page)).toEqual(["State Archive in Warsaw"]);

    await chooseKind(page, "Other");
    await searchFor(page, "submitter");
    await expect(rows(page)).toHaveCount(1);
    expect(await cellTexts(page, "@U1@")).toEqual(["Submitter", "Domorium", "1"]);
  });

  test("sort the notes by how many link them, and keep the header first under a sort", async ({ page }) => {
    await mountList(page, { plan: true });

    await chooseKind(page, "Other");
    await header(page, "Name").click();
    expect(await names(page)).toEqual(["Header", "Submitter", "_PLAN"]);
    await header(page, "Name").click();
    expect(await names(page)).toEqual(["Header", "_PLAN", "Submitter"]);
    await header(page, "Linked from").click();
    expect((await names(page))[0]).toBe("Header");
  });

  test("select a note, a repository and the header from their rows", async ({ page }) => {
    await mountList(page);

    await chooseKind(page, "Notes");
    await rowOf(page, "@N2@").click();
    await chooseKind(page, "Repositories");
    await rowOf(page, "@R2@").click();
    await chooseKind(page, "Other");
    await rowOf(page, "header:").click();

    expect(await selected(page)).toEqual(["@N2@", "@R2@", "header:"]);
    await expect(rowOf(page, "header:")).toHaveAttribute("aria-selected", "true");
  });

  test("keep the notes for a person selected in the graph, and switch to the notes for a note from a link", async ({ page }) => {
    await mountList(page, { memory: { list: { kind: "notes" } } });

    await page.locator("#show-graph").click();
    await page.evaluate(() => window.tab.select("@I2@", true));
    await page.locator("#show-list").click();
    await expect(seg(page, "Notes")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".gedcom-list-row[aria-selected='true']")).toHaveCount(0);

    await chooseKind(page, "People");
    await searchFor(page, "joliot");
    await page.evaluate(() => window.tab.select("@N2@", true));
    await expect(seg(page, "Notes")).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".gedcom-list-search")).toHaveValue("");
    await expect(rowOf(page, "@N2@")).toHaveAttribute("aria-selected", "true");
  });

  test("switch to the media for a medium that was selected while the notes were shown", async ({ page }) => {
    await mountList(page, { memory: { list: { kind: "notes" } } });
    await page.locator("#show-source").click();
    await page.evaluate(() => window.tab.select("@O5@", false));
    await page.locator("#show-list").click();

    await expect(seg(page, "Media")).toHaveAttribute("aria-pressed", "true");
    await expect(rowOf(page, "@O5@")).toHaveAttribute("aria-selected", "true");
  });
});

for (const width of [390, 320]) {
  test.describe(`the new kinds on a phone, ${width} pixels wide`, () => {
    test.use({ viewport: { width, height: 800 } });

    const lines = (page: Page, xref: string) =>
      rowOf(page, xref).locator(".gedcom-list-cell").evaluateAll((cells) =>
        cells.map((cell) => ({ top: Math.round(cell.getBoundingClientRect().top), text: cell.textContent ?? "", shown: cell.getBoundingClientRect().width > 0 })),
      );

    test("take two lines of at least 44 pixels, the name and its count on the first", async ({ page }) => {
      await mountList(page, { phone: true, touch: true });

      await chooseKind(page, "Media");
      const media = await lines(page, "@O5@");
      expect(media.map((one) => one.text)).toEqual(["The Curie family, about 1908", "Media/curie-family-1908.svg", "image/svg+xml", "Linked from 2"]);
      expect(Math.abs((media[3]?.top ?? 0) - (media[0]?.top ?? 0))).toBeLessThanOrEqual(3);
      expect((media[1]?.top ?? 0) - (media[0]?.top ?? 0)).toBeGreaterThan(8);
      expect(Math.abs((media[2]?.top ?? 0) - (media[1]?.top ?? 0))).toBeLessThanOrEqual(3);

      await chooseKind(page, "Notes");
      const note = await lines(page, "@N1@");
      expect(note.map((one) => one.text)).toEqual(["The only person to have won a Nobel Prize in two different sciences:", "Linked from 1"]);
      expect(Math.abs((note[1]?.top ?? 0) - (note[0]?.top ?? 0))).toBeLessThanOrEqual(3);
      const noteHeight = await rowOf(page, "@N1@").locator(".gedcom-list-cell").first().evaluate((cell) => ({ height: cell.getBoundingClientRect().height, line: Number.parseFloat(getComputedStyle(cell).lineHeight) }));
      expect(noteHeight.height).toBeGreaterThan(noteHeight.line * 1.5);

      await chooseKind(page, "Repositories");
      const repository = await lines(page, "@R2@");
      expect(repository.map((one) => one.text)).toEqual(["State Archive in Warsaw", "Krzywe Koło 7", "1 source"]);
      expect(Math.abs((repository[2]?.top ?? 0) - (repository[0]?.top ?? 0))).toBeLessThanOrEqual(3);
      expect((repository[1]?.top ?? 0) - (repository[0]?.top ?? 0)).toBeGreaterThan(8);

      await chooseKind(page, "Other");
      const submitter = await lines(page, "@U1@");
      expect(submitter.map((one) => one.text)).toEqual(["Submitter", "Domorium", "Linked from 1"]);
      expect(Math.abs((submitter[1]?.top ?? 0) - (submitter[2]?.top ?? 0))).toBeLessThanOrEqual(3);
      expect((submitter[0]?.top ?? 0) - (submitter[1]?.top ?? 0)).toBeGreaterThan(8);

      for (const label of ["Media", "Notes", "Repositories", "Other"]) {
        await chooseKind(page, label);
        expect((await rows(page).first().boundingBox())?.height ?? 0, label).toBeGreaterThanOrEqual(44);
        expect(await sidewaysOverflow(page), label).toBe(false);
      }
    });
  });
}

for (const dialect of ["7.0", "5.5.1"] as const) {
  test.describe(`a file of 1478 notes in ${dialect}`, () => {
    test.use({ viewport: WIDE });

    test("lists them all in a window, counted, and draws the first rows within a second of choosing Notes", async ({ page }) => {
      await mountList(page, { doc: generatedNotes(1478, dialect) });

      const took = await page.evaluate(() => {
        const button = document.querySelector<HTMLElement>('.gedcom-list-bar > .gedcom-list-seg > [data-kind="notes"]');
        const start = performance.now();
        button?.click();
        const drawn = document.querySelector(".gedcom-list-row.is-notes");
        return drawn ? performance.now() - start : Number.POSITIVE_INFINITY;
      });

      expect(took).toBeLessThan(1000);
      await expect(page.locator(".gedcom-list-count")).toHaveText("1478 notes");
      expect(await drawnRows(page)).toBeLessThan(200);
      expect(await cellTexts(page, "@N1@")).toEqual(["Note 1 about a parish register", "1"]);
      await page.locator(".gedcom-list-scroll").evaluate((node) => {
        node.scrollTop = node.scrollHeight;
      });
      await expect(rowOf(page, "@N1478@")).toBeVisible();
    });
  });
}
