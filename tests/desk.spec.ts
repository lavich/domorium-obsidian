import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import type { DeskOptions } from "../harness/desk";

async function mountDesk(page: Page, options: DeskOptions = {}): Promise<void> {
  await page.goto(pathToFileURL(resolve("harness/desk.html")).href);
  await page.evaluate((deskOptions) => {
    window.desk.mount(deskOptions);
  }, options);
  await page.waitForSelector(".gedcom-card");
}

function overflowsSideways(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const body = document.querySelector<HTMLElement>(".gedcom-card-body");
    const card = document.querySelector<HTMLElement>(".gedcom-card");
    return body && card ? body.scrollWidth > body.clientWidth || card.scrollWidth > card.clientWidth : true;
  });
}

const scrollTopOf = (page: Page) =>
  page.locator(".gedcom-card-body").evaluate((body) => body.scrollTop);

const factNamed = (page: Page, name: string) =>
  page.locator(".gedcom-desk-fact", { has: page.locator(".gedcom-desk-fact-name", { hasText: name }) });

const back = (page: Page) => page.locator('.gedcom-card-nav[aria-label="Back"]');
const forward = (page: Page) => page.locator('.gedcom-card-nav[aria-label="Forward"]');

const SIZES = [
  { name: "320 pixels", width: 320, phone: false, viewport: { width: 1400, height: 760 } },
  { name: "360 pixels", width: 360, phone: false, viewport: { width: 1400, height: 760 } },
  { name: "420 pixels", width: 420, phone: false, viewport: { width: 1400, height: 760 } },
  { name: "a phone, 390 pixels", width: 390, phone: true, viewport: { width: 390, height: 760 } },
] as const;

for (const size of SIZES) {
  test.describe(`Marie's card at ${size.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize(size.viewport);
      await mountDesk(page, { width: size.width, phone: size.phone });
    });

    test("runs Facts, Other names, Family, Media, Timeline, Places and Evidence, with no tab bar and nothing to scroll sideways", async ({ page }) => {
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
      await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).toHaveText([
        "Facts", "Other names", "Family", "Media", "Timeline", "Places", "Evidence",
      ]);
      const tops = await page
        .locator(".gedcom-card-body h2.gedcom-desk-section")
        .evaluateAll((headings) => headings.map((heading) => heading.getBoundingClientRect().top));
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
      await expect(page.locator(".gedcom-desk-tabs, .gedcom-fg-canvas")).toHaveCount(0);
      expect(await overflowsSideways(page)).toBe(false);
    });

    test("lists her four facts and the kin she has", async ({ page }) => {
      await expect(page.locator(".gedcom-desk-fact")).toHaveCount(4);
      await expect(page.locator(".gedcom-desk-kin-label")).toHaveText(["Parents", "Siblings", "Husband", "Children"]);
      const inside = await page.evaluate(() => {
        const body = document.querySelector(".gedcom-card-body")?.getBoundingClientRect();
        return [...document.querySelectorAll(".gedcom-desk-fact, .gedcom-desk-person, .gedcom-desk-moment")].every(
          (row) => {
            const box = row.getBoundingClientRect();
            return body !== undefined && box.left >= body.left - 0.5 && box.right <= body.right + 0.5;
          },
        );
      });
      expect(inside).toBe(true);
    });

    test("keeps the header at the top while the body scrolls to the end", async ({ page }) => {
      const before = await page.locator(".gedcom-card-head").boundingBox();
      await page.locator(".gedcom-card-body").evaluate((body) => {
        body.scrollTop = body.scrollHeight;
      });
      const after = await page.locator(".gedcom-card-head").boundingBox();
      const body = await page.locator(".gedcom-card-body").boundingBox();

      expect(await scrollTopOf(page)).toBeGreaterThan(0);
      expect(after?.y).toBe(before?.y);
      expect(body?.y ?? 0).toBeGreaterThanOrEqual((after?.y ?? 0) + (after?.height ?? 0) - 1);
      await expect(back(page)).toBeInViewport();
    });

    test("unfolds a tapped fact, and All evidence brings the Evidence heading into view", async ({ page }) => {
      const heading = page.locator(".gedcom-card-evidence > h2");
      await expect(heading).not.toBeInViewport();
      await factNamed(page, "Birth").click();

      await expect(page.locator(".gedcom-desk-unfold")).toBeVisible();
      await expect(page.getByText("No source of its own")).toHaveCount(1);
      await expect(heading).not.toBeInViewport();
      await page.locator(".gedcom-desk-unfold .gedcom-desk-link", { hasText: "All evidence" }).click();
      await expect(heading).toBeInViewport();
    });

    test("leaves the card scrolled where it was when a fact is selected in it", async ({ page }) => {
      await page.locator(".gedcom-card-body").evaluate((body) => {
        const timeline = [...body.querySelectorAll("h2")].find((one) => one.textContent === "Timeline");
        body.scrollTop = (timeline as HTMLElement).offsetTop - 40;
      });
      const before = await scrollTopOf(page);
      await page
        .locator(".gedcom-desk-moment-what", { hasText: "Marriage with Pierre Curie" })
        .evaluate((entry) => (entry as HTMLElement).click());

      await expect(page.locator(".gedcom-desk-fact.is-selected")).toHaveCount(1);
      expect(await scrollTopOf(page)).toBe(before);
    });

    test("shows Pierre Curie from his top, and Back and Forward return by the buttons", async ({ page }) => {
      await expect(back(page)).toBeDisabled();
      await expect(forward(page)).toBeDisabled();
      await page.locator(".gedcom-card-body").evaluate((body) => {
        body.scrollTop = body.scrollHeight;
      });
      await page.locator(".gedcom-desk-person", { hasText: "Pierre Curie" }).first().evaluate((one) => (one as HTMLElement).click());

      await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie");
      expect(await scrollTopOf(page)).toBe(0);
      await expect(back(page)).toBeEnabled();
      await back(page).click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
      await expect(forward(page)).toBeEnabled();
      await forward(page).click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie");
      await expect(forward(page)).toBeDisabled();
    });

    test("shows the evidence of her birth, and returns to the whole record", async ({ page }) => {
      const context = page.locator(".gedcom-desk-evidence-context div").first();
      await expect(context).toHaveText("Whole record");
      await factNamed(page, "Birth").click();
      await expect(context).toHaveText("Birth");

      await page.locator(".gedcom-card-evidence .gedcom-desk-link", { hasText: "Whole record" }).click();
      await expect(context).toHaveText("Whole record");
      await expect(page.locator(".gedcom-desk-fact.is-selected")).toHaveCount(0);
    });
  });
}

test.describe("Obsidian's own button styling", () => {
  test("does not dress the card's rows and links as buttons", async ({ page }) => {
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
      ".gedcom-desk-cite",
    ]) {
      expect(await look(selector), selector).toEqual({
        background: "rgba(0, 0, 0, 0)",
        shadow: "none",
      });
    }
  });
});

test.describe("every kind of card in a narrow column", () => {
  for (const record of ["@I1@", "@F3@", "@S3@", "@O5@"]) {
    for (const [width, phone, language] of [[320, false, "en"], [320, false, "ru"], [390, true, "ru"]] as const) {
      test(`${record} at ${width} pixels in ${language} has nothing to scroll sideways`, async ({ page }) => {
        await page.setViewportSize({ width: 1400, height: 760 });
        await mountDesk(page, { record, width, phone, language });

        expect(await overflowsSideways(page)).toBe(false);
      });
    }
  }
});

test.describe("the empty states", () => {
  test("says no GEDCOM file is open, and has no header", async ({ page }) => {
    await mountDesk(page, { noTab: true });

    await expect(page.locator(".gedcom-card-state")).toHaveText("Open a GEDCOM file to see its records.");
    await expect(page.locator(".gedcom-card-head")).toHaveCount(0);
  });

  test("says to select a record where nothing is selected", async ({ page }) => {
    await mountDesk(page, { record: "" });

    await expect(page.locator(".gedcom-card-state")).toHaveText(
      "Select a record in the graph, the timeline, the list or the map.",
    );
  });

  test("says the file holds nothing to show", async ({ page }) => {
    await mountDesk(page, { record: "", doc: "0 HEAD\n0 TRLR\n" });

    await expect(page.locator(".gedcom-card-state")).toHaveText("The file holds nothing to show.");
  });
});

test.describe("the family card", () => {
  test("leads from Marie to her family, and from the family to a child", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-link", { hasText: "Family card" }).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie and Marie Skłodowska-Curie");
    await expect(page.locator(".gedcom-desk-person-name")).toHaveText([
      "Pierre Curie", "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Ève Curie",
    ]);
    await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section").last()).toHaveText("Evidence");
    await factNamed(page, "Marriage").click();
    await expect(page.locator(".gedcom-desk-evidence-context div").first()).toHaveText("Marriage");

    await page.locator(".gedcom-desk-person", { hasText: "Ève Curie" }).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Ève Curie");
  });
});

test.describe("the source card and the media card", () => {
  test("lists the three people a source is cited by", async ({ page }) => {
    await mountDesk(page, { record: "@S3@" });

    await expect(page.locator(".gedcom-desk-citer .gedcom-desk-person-name")).toHaveText([
      "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Frédéric Joliot",
    ]);
    await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section").last()).toContainText("Notes in the vault");
  });

  test("selects a source from a citation on a card", async ({ page }) => {
    await mountDesk(page);
    await page.locator(".gedcom-desk-cite", { hasText: "Physics 1903" }).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText("The Nobel Prize in Physics 1903");
    await expect(page.locator(".gedcom-desk-citer .gedcom-desk-person-name")).toHaveText([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
  });

  test("lists the two people a photograph is linked by", async ({ page }) => {
    await mountDesk(page, { record: "@O5@" });

    await expect(page.locator(".gedcom-desk-user .gedcom-desk-person-name")).toHaveText([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
    await expect(page.locator(".gedcom-desk-user-caption")).toHaveText(["Marie, on the left", "Pierre, in the middle"]);
    await expect(page.locator(".gedcom-desk-user .is-cropped")).toHaveCount(2);
  });
});

test.describe("media", () => {
  test("shows Marie's portrait and gallery, her part of the family photograph cut out", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
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

  test("opens a file, and the media card with everyone who links it", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-tile-face").first().click();
    expect(await page.evaluate(() => window.desk.calls.filesOpened)).toEqual([
      "Media/marie-sklodowska-curie.svg",
    ]);

    await page.locator(".gedcom-desk-tile", { hasText: "Marie, on the left" })
      .locator(".gedcom-desk-link", { hasText: "Media card" }).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("The Curie family, about 1908");
    await expect(page.locator(".gedcom-desk-user .gedcom-desk-person-name")).toHaveText([
      "Marie Skłodowska-Curie", "Pierre Curie",
    ]);
    await expect(page.locator(".gedcom-desk-user .is-cropped")).toHaveCount(2);
  });

  test("lists the notes that link Marie, and opens one at its line", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await mountDesk(page);
    await page.locator(".gedcom-desk-note-line").click();

    await expect(page.locator(".gedcom-desk-note-line mark")).toHaveText("Marie Skłodowska-Curie");
    expect(await page.evaluate(() => window.desk.calls.notesOpened)).toEqual([
      { path: "Notes/Radium.md", line: 6 },
    ]);
  });
});
