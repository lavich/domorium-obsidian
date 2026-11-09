import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import { expect, test, type Locator, type Page } from "@playwright/test";

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

const opacityOf = (locator: Locator) => locator.evaluate((node) => getComputedStyle(node).opacity);

const treeRow = (page: Page, label: string) =>
  page.locator(".gedcom-tree-row", { has: page.locator(".gedcom-tree-label", { hasText: new RegExp(`^${label}$`, "u") }) }).first();

const pressArrow = async (page: Page, label: string): Promise<void> => {
  const row = treeRow(page, label);
  await row.hover();
  await row.locator(".gedcom-tree-chevron").click();
};

const openEveryNode = async (page: Page): Promise<void> => {
  await page.locator(".gedcom-tree").hover();
  const toggle = page.locator('.gedcom-tree-toggle[aria-label="Open every node"]');
  if ((await toggle.count()) > 0) {
    await toggle.click();
  }
};

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

    test("runs the lines of her record, Family, Media and Timeline, with no tab bar and nothing to scroll sideways", async ({ page }) => {
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
      await expect(page.locator(".gedcom-tree")).toHaveCount(1);
      await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).toHaveText([
        "Family", "Media", "Timeline",
      ]);
      const tops = await page
        .locator(".gedcom-card-body h2.gedcom-desk-section")
        .evaluateAll((headings) => headings.map((heading) => heading.getBoundingClientRect().top));
      expect(tops).toEqual([...tops].sort((a, b) => a - b));
      await expect(page.locator(".gedcom-desk-tabs, .gedcom-fg-canvas")).toHaveCount(0);
      expect(await overflowsSideways(page)).toBe(false);
    });

    test("lists her lines as closed nodes beneath an open root, and the kin she has", async ({ page }) => {
      await expect(page.locator(".gedcom-tree-list > .gedcom-tree-node.is-root")).toHaveCount(1);
      await expect(page.locator(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-label")).toHaveText("Person");
      await expect(page.locator('.gedcom-tree-node[data-depth="1"]')).toHaveCount(14);
      await expect(page.locator(".gedcom-tree-chevron[aria-expanded=true]")).toHaveCount(1);
      await expect(treeRow(page, "Birth").locator(".gedcom-tree-summary")).toContainText("7 NOV 1867");
      await expect(page.locator(".gedcom-desk-fact")).toHaveCount(1);
      await expect(page.locator(".gedcom-desk-kin-label")).toHaveText(["Parents", "Siblings", "Husband", "Children"]);
      const inside = await page.evaluate(() => {
        const body = document.querySelector(".gedcom-card-body")?.getBoundingClientRect();
        return [...document.querySelectorAll(".gedcom-tree-row, .gedcom-desk-fact, .gedcom-desk-person")].every(
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
      await treeRow(page, "Birth").locator("button.gedcom-tree-label").click();

      await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
      await expect(page.locator(".gedcom-card-evidence")).toHaveCount(0);
      await back(page).click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
    });

    test("opens the place of a fact, not the event", async ({ page }) => {
      await pressArrow(page, "Birth");
      await treeRow(page, "Place").locator(".gedcom-desk-link").first().click();

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

    test("shows no evidence on the card of her birth, and returns to her by the record at its top", async ({ page }) => {
      await treeRow(page, "Birth").locator("button.gedcom-tree-label").click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
      await expect(page.locator(".gedcom-card-evidence, .gedcom-desk-note, .gedcom-desk-cite")).toHaveCount(0);
      await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).not.toContainText(["Evidence"]);

      await page.locator(".gedcom-desk-event-owner .gedcom-desk-link").click();
      await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
      await expect(page.locator(".gedcom-card-evidence")).toHaveCount(0);
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
    await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).toHaveText(["Family"]);
    await treeRow(page, "Marriage").locator("button.gedcom-tree-label").click();
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
    await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section").last()).toHaveText("Cited by");
  });

  test("selects a source from its row in the tree of a card", async ({ page }) => {
    await mountDesk(page);
    await treeRow(page, "Source").first().locator(".gedcom-tree-chevron").click();
    await page.locator(".gedcom-tree .gedcom-desk-link", { hasText: "Physics 1903" }).click();

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

  test("are muted, and a source is a quiet dot, not an orange mark", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page);
    const colour = (selector: string, property: "color" | "backgroundColor") =>
      page.locator(selector).first().evaluate((node, name) => getComputedStyle(node)[name], property);
    const muted = await colour(".gedcom-desk-subtitle", "color");

    expect(await colour("h2.gedcom-desk-section", "color")).toBe(muted);
    await expect(page.locator(".gedcom-desk-unsourced")).toHaveCount(0);
    expect(await colour(".gedcom-desk-fact-date", "color")).toBe(muted);
  });
});

const hitSweep = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
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
      if (hits.length === 0 || Math.max(...hits) - Math.min(...hits) < 32) {
        missed.push(`${control.className} ${control.textContent ?? ""}`);
      }
    }
    return missed;
  });

test.describe("the controls of a card on a phone", () => {
  test.use({ hasTouch: true });

  test("can be hit over a height of at least 32 pixels, closed and open", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    const rich = readFileSync("demo-vault/rich-record.ged", "utf8");
    const cases: [string, string | undefined][] = [
      ["@I1@", undefined], ["@F3@", undefined], ["@S3@", undefined], ["place:warsaw, congress poland", undefined],
      ["event:@I1@:BIRT:0", undefined], ["@I1@", rich], ["@F3@", rich], ["event:@I1@:BIRT:0", rich], ["event:@F3@:MARR:0", rich],
    ];
    for (const [record, doc] of cases) {
      const name = `${record}${doc === undefined ? "" : " (rich)"}`;
      await mountDesk(page, { record, phone: true, ...(doc === undefined ? {} : { doc }) });
      expect(await hitSweep(page), `${name}, closed`).toEqual([]);

      for (const button of await page.locator(".gedcom-desk-fold-button").all()) {
        await button.click();
      }
      if ((await page.locator(".gedcom-tree-control").count()) > 0) {
        await openEveryNode(page);
      }
      for (const button of await page.locator(".gedcom-detail-more").all()) {
        await button.click();
      }
      expect(await hitSweep(page), `${name}, open`).toEqual([]);
    }
  });
});

test.describe("the controls of a card where the pointer is coarse", () => {
  test.use({ hasTouch: true, isMobile: true });

  test("keep the arrows and the toolbar shown, at touch sizes, without the app's mobile class", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mountDesk(page, { width: 390 });
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(await page.evaluate(() => document.body.classList.contains("is-mobile"))).toBe(false);

    await expect(page.locator(".gedcom-tree-bar")).toHaveCSS("opacity", "1");
    await expect(page.locator(".gedcom-tree-bar")).toHaveCSS("position", "static");
    const box = await page.locator(".gedcom-tree-toggle").boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect((await page.locator(".gedcom-tree-chevron").first().boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await hitSweep(page)).filter((name) => name.includes("gedcom-tree"))).toEqual([]);
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

      test("runs the lines of the record, then its sections, folds the Timeline, and does not scroll sideways", async ({ page }) => {
        await expect(page.locator(".gedcom-card-body h2.gedcom-desk-section")).toHaveText([
          "Family", "Media", "Timeline",
        ]);
        await expect(page.locator(".gedcom-desk-fold-button")).toHaveCount(1);
        await expect(page.locator(".gedcom-desk-fold-body[hidden]")).toHaveCount(1);
        expect(await overflowsSideways(page)).toBe(false);
      });

      test("shows every name with its type and the parts of it, once the nodes are open", async ({ page }) => {
        await openEveryNode(page);
        const names = page.locator('.gedcom-tree-node[data-key^="NAME["]:not([data-key*="."]) > .gedcom-tree-row .gedcom-field');

        await expect(names).toHaveText(["Maria Skłodowska", "Marie Curie"]);
        await expect(page.locator(".gedcom-tree-label", { hasText: "Given names" }).first()).toBeVisible();
        await expect(page.locator('.gedcom-tree-node[data-key="NAME[0].TYPE[0]"] .gedcom-field')).toHaveText("Birth");
        await expect(page.locator('.gedcom-tree-node[data-key="NAME[0].TYPE[0]"] .gedcom-field')).toHaveAttribute("data-kind", "choice");
      });

      test("folds a long note and shows the rest on a press, and keeps what it shows inside the card", async ({ page }) => {
        await openEveryNode(page);
        const more = page.locator(".gedcom-detail-more").first();
        await more.scrollIntoViewIfNeeded();
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

      test("shows the custom line nested once the nodes are open, without scrolling sideways", async ({ page }) => {
        await page.locator(".gedcom-desk-fold-button").first().click();
        await openEveryNode(page);
        await expect(page.locator(".gedcom-tree-label", { hasText: "_MILITARY" }).first()).toBeVisible();
        await expect(page.locator(".gedcom-tree-label", { hasText: "_SINCE" }).first()).toBeVisible();
        expect(await overflowsSideways(page)).toBe(false);
      });

      test("shows the age, the cause and the coordinates on the card of the birth", async ({ page }) => {
        await treeRow(page, "Birth").locator("button.gedcom-tree-label").click();

        await expect(page.locator(".gedcom-detail-label", { hasText: "Cause" })).toBeVisible();
        await expect(page.locator(".gedcom-detail-label", { hasText: "Latitude" })).toBeVisible();
        await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
        expect(await overflowsSideways(page)).toBe(false);
      });
    });
  }
});

const deepDoc = (): string => {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME Deep /Nest/"];
  for (let level = 1; level <= 6; level += 1) {
    lines.push(`${level} _LEVEL${level} ${"a value that is long enough to wrap onto several lines of a narrow card ".repeat(2)}`);
  }
  return [...lines, "0 TRLR", ""].join("\n");
};

const longDoc = (events: number): string => {
  const lines = ["0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME Long /Record/"];
  for (let at = 0; at < events; at += 1) {
    lines.push(
      `1 EVEN Event ${at}`, "2 TYPE Award", `2 DATE ${1800 + (at % 100)}`, `2 PLAC Place ${at % 40}, Country`,
      `2 NOTE Note ${at}`, "2 SOUR @S1@", `3 PAGE page ${at}`,
    );
  }
  return [...lines, "0 @S1@ SOUR", "1 TITL Register", "0 TRLR", ""].join("\n");
};


test.describe("the tree of a record", () => {
  test("keeps the open-all toggle out of sight until the pointer is over the tree, and the arrows of the nodes always in sight", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    await page.mouse.move(2, 2);

    expect(await opacityOf(page.locator(".gedcom-tree-bar"))).toBe("0");
    for (const chevron of await page.locator(".gedcom-tree-chevron").all()) {
      expect(await opacityOf(chevron)).toBe("1");
      expect(await chevron.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("auto");
      await expect(chevron).toHaveAttribute("aria-label", /.+/u);
      expect(await chevron.evaluate((node) => (node as HTMLButtonElement).tabIndex)).toBe(0);
    }
    await page.locator(".gedcom-tree").hover();
    await expect(page.locator(".gedcom-tree-bar")).toHaveCSS("opacity", "1");
    await page.mouse.move(2, 2);
    await expect(page.locator(".gedcom-tree-bar")).toHaveCSS("opacity", "0");
    await page.locator(".gedcom-tree-toggle").focus();
    await expect(page.locator(".gedcom-tree-bar")).toHaveCSS("opacity", "1");
  });

  test("turns the closed arrow with the app's rule and leaves the open one, in both directions of writing", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    const turn = (label: string) =>
      treeRow(page, label).locator(".gedcom-tree-chevron svg").evaluate((node) => getComputedStyle(node).transform);

    expect(await turn("Birth")).toBe("matrix(0, -1, 1, 0, 0, 0)");
    await pressArrow(page, "Birth");
    await expect(treeRow(page, "Birth").locator(".gedcom-tree-chevron")).not.toHaveClass(/is-collapsed/);
    await page.waitForTimeout(250);
    expect(await turn("Birth")).toBe("none");
    expect(await treeRow(page, "Birth").locator(".gedcom-tree-chevron svg path").getAttribute("d")).toBe("M3 8L12 17L21 8");
    await page.evaluate(() => {
      document.body.dir = "rtl";
    });
    await page.waitForTimeout(250);
    expect(await turn("Death")).toBe("matrix(0, 1, -1, 0, 0, 0)");
  });

  test("toggles a node by a press on its arrow and on its header", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    const birth = treeRow(page, "Birth");
    const arrow = birth.locator(".gedcom-tree-chevron");

    await arrow.click();
    await expect(arrow).toHaveAttribute("aria-expanded", "true");
    await birth.locator(".gedcom-tree-label").evaluate((node) => node.parentElement?.click());
    await expect(arrow).toHaveAttribute("aria-expanded", "false");
    await birth.locator(".gedcom-tree-part.is-date").click();
    await expect(arrow).toHaveAttribute("aria-expanded", "true");
  });

  for (const size of [{ width: 320, phone: false }, { width: 390, phone: true }, { width: 420, phone: false }]) {
    test(`puts the arrow inside its row, within 10 pixels of the label, and the rows apart at ${size.width} pixels`, async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 760 });
      await mountDesk(page, { width: size.width, phone: size.phone });
      const birth = treeRow(page, "Birth");
      const arrow = (await birth.locator(".gedcom-tree-chevron svg").boundingBox()) ?? { x: 0, width: 0 };
      const label = (await birth.locator(".gedcom-tree-label").boundingBox()) ?? { x: 0 };
      const row = (await birth.boundingBox()) ?? { x: 0, width: 0 };

      expect(label.x - (arrow.x + arrow.width)).toBeLessThanOrEqual(10);
      expect(label.x - (arrow.x + arrow.width)).toBeGreaterThan(0);
      expect(arrow.x).toBeGreaterThanOrEqual(row.x);
      const sex = (await treeRow(page, "Sex").boundingBox()) ?? { y: 0, height: 0 };
      const death = (await treeRow(page, "Death").boundingBox()) ?? { y: 0 };
      const birthBox = (await birth.boundingBox()) ?? { y: 0, height: 0 };
      const gap = await page.evaluate(() => parseFloat(getComputedStyle(document.body).getPropertyValue("--size-2-2")));
      expect(death.y - (birthBox.y + birthBox.height)).toBeGreaterThanOrEqual(gap - 0.5);
      expect((await treeRow(page, "Birth").boundingBox())!.y - (sex.y + sex.height)).toBeGreaterThanOrEqual(gap - 0.5);
    });
  }

  test("paints a hovered row with the hover background only, and keeps no selected background after a click", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    const colours = await page.evaluate(() => {
      const style = getComputedStyle(document.body);
      return {
        hover: style.getPropertyValue("--nav-item-background-hover").trim(),
        selected: style.getPropertyValue("--nav-item-background-selected").trim(),
      };
    });
    const background = (row: Locator) => row.evaluate((node) => getComputedStyle(node).backgroundColor);
    const occupation = treeRow(page, "Occupation");
    const birth = treeRow(page, "Birth");

    await page.mouse.move(2, 2);
    await birth.hover();
    expect(await background(birth)).toBe(colours.hover);
    expect(await background(birth)).not.toBe(colours.selected);
    await occupation.locator(".gedcom-tree-main").click();
    await birth.locator(".gedcom-tree-part.is-date").click();
    await page.mouse.move(2, 2);
    for (const row of [occupation, birth]) {
      expect(await background(row)).toBe("rgba(0, 0, 0, 0)");
      expect(await row.evaluate((node) => getComputedStyle(node).boxShadow)).toBe("none");
    }
  });


  for (const size of [{ width: 320, phone: false }, { width: 390, phone: true }]) {
    test(`starts the label of a line and of a node of the same depth at one column at ${size.width} pixels`, async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 760 });
      await mountDesk(page, { width: size.width, phone: size.phone });
      const left = (label: string) => treeRow(page, label).locator(".gedcom-tree-label").evaluate((node) => node.getBoundingClientRect().left);

      expect(await left("Sex")).toBe(await left("Birth"));
      expect(await left("Occupation")).toBe(await left("Name"));
      expect(await left("Spouse in family")).toBe(await left("Death"));
      await page.locator(".gedcom-tree").hover();
      await page.locator('.gedcom-tree-toggle[aria-label="Open every node"]').click();
      expect(await left("Date")).toBe(await left("Place"));
    });
  }

  test("keeps the arrows shown where the pointer cannot hover", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 760 });
    await mountDesk(page, { phone: true });
    for (const chevron of await page.locator(".gedcom-tree-chevron").all()) {
      expect(await opacityOf(chevron)).toBe("1");
    }
  });

  test("keeps a node open across a visit to another record", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    await pressArrow(page, "Birth");
    await expect(treeRow(page, "Birth").locator(".gedcom-tree-chevron")).toHaveAttribute("aria-expanded", "true");

    await page.evaluate(() => {
      window.desk.selectRecord("@I2@");
    });
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Pierre Curie");
    await expect(treeRow(page, "Birth").locator(".gedcom-tree-chevron")).toHaveAttribute("aria-expanded", "false");
    await page.evaluate(() => {
      window.desk.selectRecord("@I1@");
    });
    await expect(treeRow(page, "Birth").locator(".gedcom-tree-chevron")).toHaveAttribute("aria-expanded", "true");
  });

  test("opens and closes every node with one icon toggle that flips and keeps the focus", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    await page.locator(".gedcom-tree").hover();
    const toggle = page.locator(".gedcom-tree-toggle");

    await expect(toggle.locator("svg")).toHaveCount(1);
    await expect(toggle).toHaveAttribute("aria-label", "Open every node");
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Close every node");
    expect(await page.locator(".gedcom-tree-chevron[aria-expanded=false]").count()).toBe(0);
    await expect(toggle).toBeFocused();
    await page.locator(".gedcom-tree-chevron").first().click();
    await expect(toggle).toHaveAttribute("aria-label", "Open every node");
    await toggle.click();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-label", "Open every node");
    expect(await page.locator(".gedcom-tree-chevron[aria-expanded=true]").count()).toBe(0);
  });

  test("opens the card of a fact from its label and the card of a place from its line", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    await treeRow(page, "Birth").locator("button.gedcom-tree-label").click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Birth");
    await back(page).click();

    await pressArrow(page, "Birth");
    await treeRow(page, "Place").locator(".gedcom-desk-link").click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Warsaw, Congress Poland");
  });

  test("restores the scroll on Back, and starts another record at its top", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 420 });
    await mountDesk(page, { width: 360 });
    await openEveryNode(page);
    await page.locator(".gedcom-card-body").evaluate((body) => {
      body.scrollTop = 300;
    });
    await page.locator(".gedcom-desk-person", { hasText: "Pierre Curie" }).first().evaluate((one) => (one as HTMLElement).click());
    expect(await scrollTopOf(page)).toBe(0);
    await back(page).click();

    await expect(page.locator(".gedcom-desk-title")).toHaveText("Marie Skłodowska-Curie");
    expect(await scrollTopOf(page)).toBe(300);
  });

  for (const [width, phone] of [[320, false], [390, true]] as const) {
    test(`fits ${width} pixels with a line six levels deep, and indents no further after the fourth`, async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 800 });
      await mountDesk(page, { doc: deepDoc(), record: "@I1@", width, phone });
      await openEveryNode(page);
      const left = (level: number) =>
        page.locator(".gedcom-tree-label", { hasText: `_LEVEL${level}` }).evaluate((label) => label.getBoundingClientRect().left);

      await expect(page.locator(".gedcom-tree-label", { hasText: "_LEVEL6" })).toBeVisible();
      expect(await overflowsSideways(page)).toBe(false);
      expect(await left(2)).toBeGreaterThan(await left(1));
      expect(await left(4)).toBeGreaterThan(await left(3));
      expect(await left(5)).toBe(await left(4));
      expect(await left(6)).toBe(await left(4));
    });
  }

  for (const width of [320, 390]) {
    test(`cuts a long value of a closed row with an ellipsis and keeps its date visible at ${width} pixels`, async ({ page }) => {
      await page.setViewportSize({ width: 1400, height: 800 });
      const doc = [
        "0 HEAD", "1 GEDC", "2 VERS 7.0", "0 @I1@ INDI", "1 NAME A /B/",
        `1 OCCU ${"A very long occupation that goes on and on ".repeat(4)}`, "2 DATE 1900", "2 PLAC Paris, France", "0 TRLR", "",
      ].join("\n");
      await mountDesk(page, { doc, record: "@I1@", width, phone: width === 390 });
      const row = treeRow(page, "Occupation");
      const date = row.locator(".gedcom-tree-part.is-date");
      const value = row.locator(".gedcom-tree-part.is-value");

      await expect(date).toHaveText("1900");
      const box = await date.boundingBox();
      const rowBox = await row.boundingBox();
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual((rowBox?.x ?? 0) + (rowBox?.width ?? 0));
      expect(await date.evaluate((node) => node.scrollWidth <= node.clientWidth)).toBe(true);
      expect(await value.evaluate((node) => getComputedStyle(node).textOverflow)).toBe("ellipsis");
      expect(await value.evaluate((node) => node.scrollWidth > node.clientWidth)).toBe(true);
      await page.locator("#card-pane").screenshot({ path: `/tmp/impl-record-fields-tree/long-value-${width}.png` });
    });
  }

  test("paints the focus ring of a place link in a closed row", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await mountDesk(page, { width: 420 });
    const link = treeRow(page, "Birth").locator(".gedcom-tree-summary .gedcom-desk-link");
    const box = await link.boundingBox();
    const clip = { x: (box?.x ?? 0) - 4, y: (box?.y ?? 0) - 4, width: (box?.width ?? 0) + 8, height: (box?.height ?? 0) + 8 };
    await page.mouse.move(2, 2);
    const plain = await page.screenshot({ clip });
    await treeRow(page, "Birth").locator("button.gedcom-tree-label").focus();
    await page.keyboard.press("Tab");
    await expect(link).toBeFocused();
    expect(await link.evaluate((node) => node.matches(":focus-visible"))).toBe(true);
    const ringed = await page.screenshot({ clip });

    expect(ringed.equals(plain)).toBe(false);
    await page.screenshot({ clip: { x: clip.x - 40, y: clip.y - 10, width: clip.width + 80, height: clip.height + 20 }, path: "/tmp/impl-record-fields-tree/focused-place-link.png" });
  });

  test("draws a record of several hundred lines, and opens every node of it, within a loose budget", async ({ page }, info) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await page.goto(pathToFileURL(resolve("harness/desk.html")).href);
    const doc = longDoc(80);
    const timing = await page.evaluate(async (text) => {
      const frame = () => new Promise<void>((done) => window.requestAnimationFrame(() => window.requestAnimationFrame(() => done())));
      const start = performance.now();
      window.desk.mount({ doc: text, record: "@I1@", width: 420 });
      await frame();
      const first = performance.now() - start;
      const control = [...document.querySelectorAll<HTMLElement>(".gedcom-tree-control")].find((one) => one.getAttribute("aria-label") === "Open every node");
      const opened = performance.now();
      control?.click();
      await frame();
      return { first, open: performance.now() - opened, rows: document.querySelectorAll(".gedcom-tree-row").length };
    }, doc);

    info.annotations.push({ type: "timing", description: `first draw ${timing.first.toFixed(0)} ms; open every node ${timing.open.toFixed(0)} ms; ${timing.rows} rows` });
    expect(timing.rows).toBeGreaterThan(500);
    expect(timing.first).toBeLessThan(500);
    expect(timing.open).toBeLessThan(500);
  });
});
