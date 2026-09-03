import { expect, test, type Page } from "@playwright/test";

import { MEDIA, mount, offsetOf } from "./harness";

/** Every vault path the sample names, mapped to bytes the harness can draw. */
const VAULT = {
  "media/family.jpg": "photo",
  "media/interview.mp3": "photo",
};

const POPOVER = ".gedcom-media-preview";

const FILE = offsetOf(MEDIA, "media/family.jpg");
const AUDIO = offsetOf(MEDIA, "media/interview.mp3");
const REMOTE = offsetOf(MEDIA, "https://example.org/marie.jpg");
const MISSING = offsetOf(MEDIA, "media/gone.jpg");
/** Inside the image, overhanging its edge, and nowhere near it. */
const MARIE_LINK = offsetOf(MEDIA, "@O1@\n2 CROP\n3 TOP 10") + 1;
const PIERRE_LINK = offsetOf(MEDIA, "@O1@\n2 CROP\n3 TOP 40") + 1;
const IRENE_LINK = offsetOf(MEDIA, "@O1@\n2 CROP\n3 TOP 900") + 1;
const XREF = offsetOf(MEDIA, "@F1@") + 1;
/** The tag of the FILE line, and the level number that opens it. */
const FILE_TAG = offsetOf(MEDIA, "FILE media/family.jpg");
const FILE_LEVEL = FILE_TAG - 2;

async function scrollTo(page: Page, offset: number): Promise<void> {
  await page.evaluate((target) => {
    window.gedcom.view?.dispatch({
      selection: { anchor: target },
      scrollIntoView: true,
    });
  }, offset);
}

async function pointAt(page: Page, offset: number): Promise<void> {
  await scrollTo(page, offset);
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
  // The sample is longer than the viewport, so the line has to be on screen
  // before it has coordinates to hover.
  await page.evaluate((target) => {
    window.gedcom.view?.dispatch({
      selection: { anchor: target },
      scrollIntoView: true,
    });
  }, offset);
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

function textOf(page: Page, selector: string): Promise<string> {
  return page.evaluate(
    (target) => document.querySelector(target)?.textContent ?? "",
    selector,
  );
}

test.describe("what a media position shows", () => {
  test("draws the photograph a FILE payload names", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    expect(await page.locator(`${POPOVER} img`).count()).toBe(1);
    expect(
      await page.locator(`${POPOVER} .gedcom-media-cropped`).count(),
      "a record's own FILE is the whole image",
    ).toBe(0);
  });

  test("names a sound file rather than showing an empty box", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, AUDIO);
    await page.waitForSelector(`${POPOVER} .gedcom-media-row`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-name`)).toBe(
      "interview.mp3",
    );
    expect(await page.locator(`${POPOVER} img`).count()).toBe(0);
    expect(
      await page.locator(`${POPOVER} .gedcom-media-icon svg`).count(),
      "the kind is drawn, not only spelled",
    ).toBe(1);
  });

  test("says a remote file is not loaded, and does not load it", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, REMOTE);
    await page.waitForSelector(`${POPOVER} .gedcom-media-note`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-note`)).toBe(
      "Remote file, not loaded",
    );
    expect(await textOf(page, `${POPOVER} .gedcom-media-name`)).toBe(
      "https://example.org/marie.jpg",
    );
    expect(
      requests.filter((url) => url.startsWith("https://example.org")),
      "the plugin promises in writing that it makes no network requests",
    ).toEqual([]);
    expect(
      await page.evaluate(() => window.gedcom.calls.requested),
      "nothing was even pointed at the url",
    ).toEqual([]);
  });

  test("says a file the vault does not hold was not found", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, MISSING);
    await page.waitForSelector(`${POPOVER} .gedcom-media-note`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-note`)).toBe(
      "File not found",
    );
    expect(await textOf(page, `${POPOVER} .gedcom-media-name`)).toBe(
      "media/gone.jpg",
    );
  });
});

test.describe("the rectangle a link asks for", () => {
  test("shows the region the link names, not the whole photograph", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, MARIE_LINK);
    await page.waitForSelector(`${POPOVER} .gedcom-media-cropped`);

    const frame = await page.evaluate(
      () => window.gedcom.rectOf(".gedcom-media-frame")?.width ?? 0,
    );
    expect(frame, "the rectangle the link named, in full").toBe(40);
    expect(await textOf(page, `${POPOVER} .gedcom-media-caption`)).toBe(
      "Marie, second from the left",
    );
  });

  test("gives two links to one photograph two different pictures", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, MARIE_LINK);
    await page.waitForSelector(POPOVER);
    const marie = await page.evaluate(
      () =>
        document
          .querySelector(".gedcom-media-image")
          ?.getAttribute("style") ?? "",
    );

    await modHover(page, PIERRE_LINK);
    await page.waitForSelector(POPOVER);
    const pierre = await page.evaluate(
      () =>
        document
          .querySelector(".gedcom-media-image")
          ?.getAttribute("style") ?? "",
    );

    expect(await page.evaluate(() => window.gedcom.calls.media)).toEqual([
      "media/family.jpg",
      "media/family.jpg",
    ]);
    expect(marie, "one file, two rectangles").not.toBe(pierre);
  });

  test("shows the whole photograph from the record's own FILE", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    expect(await page.locator(`${POPOVER} .gedcom-media-cropped`).count()).toBe(
      0,
    );
  });

  test("shows the part of a rectangle the image reaches", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, PIERRE_LINK);
    await page.waitForSelector(`${POPOVER} .gedcom-media-cropped`);

    const box = await page.evaluate(() =>
      window.gedcom.rectOf(".gedcom-media-frame"),
    );
    expect(box?.width ?? 0, "100 wide from x=100 of a 120-wide image").toBe(20);
    expect(box?.height ?? 0, "100 high from y=40 of an 80-high image").toBe(40);
  });

  test("falls back to the whole image where the rectangle reaches nothing", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, IRENE_LINK);
    await page.waitForSelector(`${POPOVER} img`);
    await expect(
      page.locator(`${POPOVER} .gedcom-media-cropped`),
      "a rectangle at 900,900 of a 120x80 image names nothing",
    ).toHaveCount(0);

    const box = await page.evaluate(() =>
      window.gedcom.rectOf(".gedcom-media-frame"),
    );
    expect(box?.width ?? 0, "the whole photograph, not an empty box").toBe(120);
  });
});

test.describe("the box the popover may fill", () => {
  test("keeps a large image inside the bound, undistorted", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    const box = await page.evaluate(() =>
      window.gedcom.rectOf(".gedcom-media-preview"),
    );
    expect(box?.width ?? 0).toBeLessThanOrEqual(560);
    expect(box?.height ?? 0).toBeLessThanOrEqual(400);
  });

  test("takes the bound from the pane, not the window", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT, pane: 300 });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    const width = await page.evaluate(
      () =>
        getComputedStyle(
          document.querySelector(".gedcom-media-preview")!,
        ).getPropertyValue("--gedcom-media-max-w"),
    );
    expect(
      Number.parseFloat(width),
      "60% of a 300px pane, not of the window",
    ).toBeLessThanOrEqual(180);
  });

  test("stays inside a window the width of a phone", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 720 });
    await mount(page, { doc: MEDIA, media: VAULT, mobile: true });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    const box = await page.evaluate(() =>
      window.gedcom.rectOf(".gedcom-media-preview"),
    );
    expect(box?.width ?? 0).toBeLessThanOrEqual(390);
  });
});

test.describe("the setting that governs the gesture", () => {
  test("leaves record previews working when media preview is off", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT, mediaPreview: "off" });
    await modHover(page, FILE);
    expect(await page.locator(POPOVER).count()).toBe(0);

    await modHover(page, XREF);
    expect(
      (await page.evaluate(() => window.gedcom.calls.previews)).length,
      "the record a cross-reference points at still appears",
    ).toBe(1);
  });

  test("lets the two gestures differ", async ({ page }) => {
    await mount(page, {
      doc: MEDIA,
      media: VAULT,
      recordPreview: "hover",
      mediaPreview: "modifier",
    });

    const coords = await page.evaluate(
      (target) => window.gedcom.coordsAt(target),
      FILE,
    );
    await page.mouse.move(coords!.x, coords!.y);
    expect(
      await page.locator(POPOVER).count(),
      "a bare hover does not open media when media asks for the modifier",
    ).toBe(0);

    await modHover(page, FILE);
    await page.waitForSelector(POPOVER);
  });

  test("stands the record preview aside where the position names media", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, MARIE_LINK);
    await page.waitForSelector(POPOVER);

    expect(
      await page.evaluate(() => window.gedcom.calls.previews),
      "the picture is what the reader wanted",
    ).toEqual([]);
  });
});

test.describe("a load that finishes after the gesture moved on", () => {
  test("leaves the second position's picture alone", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT, holdImages: true });
    await modHover(page, MARIE_LINK);
    await page.waitForSelector(POPOVER);
    await modHover(page, PIERRE_LINK);
    await page.waitForSelector(POPOVER);

    const before = await page.evaluate(
      () =>
        document
          .querySelector(".gedcom-media-image")
          ?.getAttribute("style") ?? "",
    );
    await page.evaluate(() => window.gedcom.releaseImages());
    await page.waitForTimeout(50);
    const after = await page.evaluate(
      () =>
        document
          .querySelector(".gedcom-media-image")
          ?.getAttribute("style") ?? "",
    );

    expect(
      await page.locator(POPOVER).count(),
      "one popover, the current one",
    ).toBe(1);
    expect(before).not.toBe("");
    expect(after).not.toBe("");
  });

  test("draws nothing and raises nothing when the preview has closed", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await mount(page, { doc: MEDIA, media: VAULT, holdImages: true });
    await modHover(page, MARIE_LINK);
    await page.waitForSelector(POPOVER);
    await modHover(page, offsetOf(MEDIA, "Marie /Curie/"));
    await expect(page.locator(POPOVER)).toHaveCount(0);

    await page.evaluate(() => window.gedcom.releaseImages());
    await page.waitForTimeout(50);

    expect(await page.locator(POPOVER).count()).toBe(0);
    expect(errors).toEqual([]);
  });
});

test.describe("where the gesture may be made", () => {
  test("answers on the tag as readily as on the payload", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE_TAG);
    await page.waitForSelector(`${POPOVER} img`);

    expect(await page.evaluate(() => window.gedcom.calls.media)).toEqual([
      "media/family.jpg",
    ]);
  });

  test("says nothing over the level number that opens the line", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE_LEVEL);
    await page.waitForTimeout(100);

    expect(await page.locator(POPOVER).count()).toBe(0);
  });
});

test.describe("a payload that leads somewhere", () => {
  test("dresses the pointer and leaves its tag alone", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await scrollTo(page, XREF);

    // A mark is split at every token boundary, so what a line dresses is the
    // run of its dressed fragments, not one element.
    const dressed = await page.evaluate(() =>
      [...document.querySelectorAll(".cm-line")]
        .map((line) =>
          [...line.querySelectorAll(".gedcom-reference-link, .gedcom-internal-link")]
            .map((element) => element.textContent ?? "")
            .join(""),
        )
        .filter((text) => text !== ""),
    );
    expect(dressed, "the pointer that names a photograph").toContain("@O1@");
    expect(dressed, "and an ordinary reference beside it").toContain("@F1@");
    expect(
      dressed.some((text) => text.includes("OBJE")),
      "the tag keeps the colour its own kind gives it",
    ).toBe(false);
  });

  test("shows the picture on a plain hover, and the click cursor only under the modifier", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT, mediaPreview: "hover" });
    await pointAt(page, FILE);
    await page.waitForSelector(`${POPOVER} img`, { timeout: 5000 });

    const cursor = () =>
      page.evaluate(() => {
        const element = document.querySelector(".gedcom-internal-link");
        return element ? getComputedStyle(element).cursor : null;
      });
    expect(
      await cursor(),
      "the preview is free; the click is not",
    ).not.toBe("pointer");

    await modHover(page, FILE);
    expect(await cursor()).toBe("pointer");
  });
});

test.describe("a hover with no modifier", () => {
  test("ignores a pointer that only passes through", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT, mediaPreview: "hover" });
    await pointAt(page, FILE_TAG);
    await pointAt(page, offsetOf(MEDIA, "Marie /Curie/"));
    await page.waitForTimeout(400);

    expect(
      await page.locator(POPOVER).count(),
      "travelling is not asking",
    ).toBe(0);
  });

  test("answers a pointer that rests", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT, mediaPreview: "hover" });
    await pointAt(page, FILE_TAG);
    await page.waitForSelector(`${POPOVER} img`, { timeout: 5000 });

    expect(await page.evaluate(() => window.gedcom.calls.media)).toEqual([
      "media/family.jpg",
    ]);
  });
});
