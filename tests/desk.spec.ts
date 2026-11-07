import { readFileSync } from "node:fs";
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

    test("runs Names, Facts, Family, Notes, Media, Timeline and Evidence, with no tab bar and nothing to scroll sideways", async ({ page }) => {
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
      await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).toHaveText([
        "Names", "Facts", "Family", "Notes", "Media", "Timeline", "Evidence",
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
        return [...document.querySelectorAll(".gedcom-desk-fact, .gedcom-desk-person")].every(
          (row) => {
            const box = row.getBoundingClientRect();
            return body !== undefined && box.left >= body.left - 0.5 && box.right <= body.right + 0.5;
          },
        );
      });
      expect(inside).toBe(true);
    });

    test("sets a fold's heading at the start of its line", async ({ page }) => {
      const justify = await page.locator(".gedcom-desk-fold-button").first().evaluate((node) => getComputedStyle(node).justifyContent);

      expect(justify).toBe("flex-start");
    });

    test("keeps the timeline inside the card once its fold is opened", async ({ page }) => {
      await page.locator(".gedcom-desk-fold-button", { hasText: "Timeline" }).click();
      const inside = await page.evaluate(() => {
        const body = document.querySelector(".gedcom-card-body")?.getBoundingClientRect();
        return [...document.querySelectorAll(".gedcom-desk-moment")].every((row) => {
          const box = row.getBoundingClientRect();
          return body !== undefined && box.width > 0 && box.left >= body.left - 0.5 && box.right <= body.right + 0.5;
        });
      });
      expect(inside).toBe(true);
      expect(await overflowsSideways(page)).toBe(false);
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

    test("opens the card of an event when a fact is tapped, and Back returns to her card", async ({ page }) => {
      await factNamed(page, "Birth").locator(".gedcom-desk-fact-name").click();

      await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
      await expect(page.locator(".gedcom-card-evidence")).toBeVisible();
      await back(page).click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
    });

    test("opens the place of a fact, not the event", async ({ page }) => {
      await factNamed(page, "Birth").locator(".gedcom-desk-link").click();

      await expect(page.locator(".gedcom-desk-title")).toHaveText("Warsaw, Congress Poland");
    });

    test("opens the card of an event from the timeline", async ({ page }) => {
      await page.locator(".gedcom-desk-fold-button", { hasText: "Timeline" }).click();
      await page.locator(".gedcom-desk-moment-what", { hasText: "Marriage with Pierre Curie" }).evaluate((entry) => (entry as HTMLElement).click());

      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marriage");
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

    test("shows the evidence of her birth on its card, and returns to her by the record at its top", async ({ page }) => {
      await factNamed(page, "Birth").locator(".gedcom-desk-fact-name").click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
      await expect(page.locator(".gedcom-card-evidence .gedcom-desk-subsection")).toHaveText(["Sources of this fact"]);
      await expect(page.locator(".gedcom-desk-evidence-head")).toHaveCount(0);
      await expect(page.locator(".gedcom-desk-note, .gedcom-desk-cite")).toHaveCount(0);

      await page.locator(".gedcom-desk-event-owner .gedcom-desk-link").click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
      await expect(page.locator(".gedcom-card-evidence .gedcom-desk-subsection").first()).toContainText("Sources of the record");
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
      ".gedcom-desk-fact-name",
      ".gedcom-desk-cite",
    ]) {
      expect(await look(selector), selector).toEqual({
        background: "rgba(0, 0, 0, 0)",
        shadow: "none",
      });
    }
  });
});

test.describe("the card of an event", () => {
  test("shows the event, links to its record, and Back returns to it", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { record: "event:@I1@:BIRT:0" });

    await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
    await expect(page.locator(".gedcom-desk-event-owner")).toHaveText("PersonMarie Skłodowska-Curie");
    await expect(page.locator(".gedcom-desk-subtitle")).toHaveText("7 NOV 1867 · Warsaw, Congress Poland");
    await page.locator(".gedcom-desk-event-owner .gedcom-desk-link", { hasText: "Marie" }).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
    await expect(back(page)).toBeEnabled();
    await back(page).click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
  });
});

test.describe("every kind of card in a narrow column", () => {
  for (const record of ["@I1@", "@F3@", "@S3@", "@O5@", "event:@I1@:BIRT:0"]) {
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
      "Select a record in the graph, the timeline or the list.",
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

    await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie ⚭ Marie Skłodowska-Curie");
    await expect(page.locator(".gedcom-desk-person-name")).toHaveText([
      "Pierre Curie", "Marie Skłodowska-Curie", "Irène Joliot-Curie", "Ève Curie",
    ]);
    await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section").last()).toHaveText("Evidence");
    await factNamed(page, "Marriage").click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Marriage");

    await back(page).click();
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

test.describe("the controls of a card", () => {
  test("show a focus ring for the keyboard and none for the pointer", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page);
    const pierre = page.locator(".gedcom-desk-person", { hasText: "Pierre Curie" });
    const ring = () => pierre.evaluate((node) => getComputedStyle(node).outlineStyle);

    await pierre.focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab");
    expect(await ring()).toBe("solid");

    await page.mouse.click(5, 5);
    await pierre.hover();
    await page.mouse.down();
    expect(await pierre.evaluate((node) => node.matches(":focus-visible"))).toBe(false);
    expect(await ring()).toBe("none");
    await page.mouse.up();
  });

  test("are muted, and the line about facts without a source is muted, not orange", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page);
    const colour = (selector: string, property: "color" | "backgroundColor") =>
      page.locator(selector).first().evaluate((node, name) => getComputedStyle(node)[name], property);
    const muted = await colour(".gedcom-desk-subtitle", "color");

    expect(await colour("h2.gedcom-desk-section", "color")).toBe(muted);
    expect(await colour(".gedcom-desk-unsourced", "color")).toBe(muted);
    expect(await colour(".gedcom-desk-unsourced", "backgroundColor")).toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator(".gedcom-desk-unsourced + .gedcom-desk-facts")).toHaveCount(1);
  });
});

test.describe("the controls of a card on a phone", () => {
  test.use({ hasTouch: true });

  test("can be hit over a height of at least 32 pixels", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const rich = readFileSync("demo-vault/rich-record.ged", "utf8");
    const cases: [string, string | undefined][] = [
      ["@I1@", undefined], ["@F3@", undefined], ["@S3@", undefined], ["place:warsaw, congress poland", undefined],
      ["event:@I1@:BIRT:0", undefined], ["@I1@", rich], ["@F3@", rich], ["event:@I1@:BIRT:0", rich], ["event:@F3@:MARR:0", rich],
    ];
    for (const [record, doc] of cases) {
      await mountDesk(page, { record, phone: true, ...(doc === undefined ? {} : { doc }) });
      for (const button of await page.locator(".gedcom-desk-fold-button").all()) {
        await button.click();
      }
      for (const button of await page.locator(".gedcom-detail-more").all()) {
        await button.click();
      }
      const misses = await page.evaluate(() => {
        const missed: string[] = [];
        const selectors = ".gedcom-card-body button:not(:disabled), .gedcom-card-nav";
        for (const control of document.querySelectorAll<HTMLElement>(selectors)) {
          control.scrollIntoView({ block: "center" });
          const box = control.getBoundingClientRect();
          if (box.width === 0) {
            continue;
          }
          const x = box.left + Math.min(box.width / 2, 6);
          const hits: number[] = [];
          for (let y = box.top - 30; y <= box.bottom + 30; y += 2) {
            if (document.elementFromPoint(x, y)?.closest("button") === control) {
              hits.push(y);
            }
          }
          if (Math.max(...hits) - Math.min(...hits) < 32) {
            missed.push(`${control.className} ${control.textContent ?? ""}`);
          }
        }
        return missed;
      });
      expect(misses, `${record}${doc === undefined ? "" : " (rich)"}`).toEqual([]);
    }
  });
});

test.describe("the card of a record that states everything", () => {
  const rich = () => readFileSync("demo-vault/rich-record.ged", "utf8");
  for (const size of SIZES) {
    test.describe(size.name, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize(size.viewport);
        await mountDesk(page, { doc: rich(), record: "@I1@", width: size.width, phone: size.phone });
      });

      test("runs its sections in order, ends with Evidence, folds the three it folds, and does not scroll sideways", async ({ page }) => {
        await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).toHaveText([
          "Names", "Facts", "Family", "Notes", "Related people", "Media", "Timeline",
          "Identifiers and record information", "Other data", "Evidence",
        ]);
        await expect(page.locator(".gedcom-desk-fold-button")).toHaveCount(3);
        await expect(page.locator(".gedcom-desk-fold-body[hidden]")).toHaveCount(3);
        expect(await overflowsSideways(page)).toBe(false);
      });

      test("shows every name with its type and the parts of it", async ({ page }) => {
        await expect(page.locator(".gedcom-name-text")).toHaveText(["Maria Skłodowska", "Мария Склодовская", "Marie Curie"]);
        await expect(page.locator(".gedcom-name-type")).toHaveText(["Birth", "Married"]);
        await expect(page.locator(".gedcom-names .gedcom-detail-label").first()).toHaveText("Given names");
      });

      test("folds a long note and shows the rest on a press, and keeps what it shows inside the card", async ({ page }) => {
        const more = page.locator(".gedcom-detail-more");
        await expect(more).toHaveText("Show more");
        await expect(page.getByText("Line 12 of a long note.")).toBeHidden();
        await more.click();
        await expect(page.getByText("Line 12 of a long note.")).toBeVisible();
        await expect(more).toHaveText("Show less");
        expect(await overflowsSideways(page)).toBe(false);
        if (size.phone) {
          expect((await more.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
        }
      });

      test("opens the folded sections and shows the custom line nested, without scrolling sideways", async ({ page }) => {
        for (const button of await page.locator(".gedcom-desk-fold-button").all()) {
          await button.click();
        }
        await expect(page.locator(".gedcom-detail-label", { hasText: "_MILITARY" })).toBeVisible();
        await expect(page.locator(".gedcom-detail-label", { hasText: "_SINCE" })).toBeVisible();
        expect(await overflowsSideways(page)).toBe(false);
      });

      test("shows the age, the cause and the coordinates on the card of the birth", async ({ page }) => {
        await page.locator(".gedcom-desk-fact-name", { hasText: "Birth" }).first().click();

        await expect(page.locator(".gedcom-detail-label", { hasText: "Cause" })).toBeVisible();
        await expect(page.locator(".gedcom-detail-label", { hasText: "Latitude" })).toBeVisible();
        await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
        expect(await overflowsSideways(page)).toBe(false);
      });
    });
  }
});
