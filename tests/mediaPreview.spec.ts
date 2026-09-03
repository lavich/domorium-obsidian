import { Buffer } from "node:buffer";

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
/** A second remote photograph, and one at an address that is not encrypted. */
const REMOTE_AGAIN = offsetOf(MEDIA, "https://example.org/pierre.jpg");
const INSECURE = offsetOf(MEDIA, "http://example.org/irene.jpg");
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


/**
 * Which part of the source image the frame is a window onto, in the source's
 * own pixels, read from the composited geometry rather than from the styles.
 */
async function shownRegion(page: Page): Promise<{
  left: number;
  top: number;
  right: number;
  bottom: number;
  scale: number;
}> {
  return page.evaluate(() => {
    const frame = document.querySelector(".gedcom-media-frame");
    const image = document.querySelector(".gedcom-media-image");
    if (!(frame instanceof HTMLElement) || !(image instanceof HTMLImageElement)) {
      throw new Error("no frame");
    }
    const box = frame.getBoundingClientRect();
    const drawn = image.getBoundingClientRect();
    const scale = drawn.width / image.naturalWidth;
    const round = (value: number): number => Math.round(value * 10) / 10;
    return {
      left: round((box.left - drawn.left) / scale),
      top: round((box.top - drawn.top) / scale),
      right: round((box.right - drawn.left) / scale),
      bottom: round((box.bottom - drawn.top) / scale),
      scale: round(scale),
    };
  });
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
      "the plugin asks before it makes a network request",
    ).toEqual([]);
    expect(
      await page.evaluate(() => window.gedcom.calls.requested),
      "nothing was even pointed at the url",
    ).toEqual([]);
    expect(
      await page.locator(`${POPOVER} .gedcom-media-allow`).allTextContents(),
      "and the way out is beside the refusal, not in the settings tab",
    ).toEqual(["Show this image", "Always show images from the web"]);
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

/** One pixel of PNG, served as the host would serve a photograph. */
const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

/** Answers example.org from the spec, and counts what was asked of it. */
async function serveRemote(
  page: Page,
  body: Buffer | string = PNG,
): Promise<string[]> {
  const asked: string[] = [];
  await page.route("https://example.org/**", async (route, request) => {
    asked.push(request.url());
    await route.fulfill({
      status: 200,
      contentType: typeof body === "string" ? "text/html" : "image/png",
      body,
    });
  });
  return asked;
}

const take = (page: Page, label: string): Promise<void> =>
  page.locator(`${POPOVER} .gedcom-media-allow`, { hasText: label }).click();

test.describe("an image the reader asks for", () => {
  test("draws it, and asks the host only then", async ({ page }) => {
    const asked = await serveRemote(page);
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, REMOTE);
    await page.waitForSelector(`${POPOVER} .gedcom-media-allow`);

    expect(asked, "nothing before the reader answered").toEqual([]);

    await take(page, "Show this image");
    await page.waitForSelector(`${POPOVER} img`);

    expect(
      await page.locator(`${POPOVER} img`).getAttribute("src"),
      "the url the document wrote, not a copy of it",
    ).toBe("https://example.org/marie.jpg");
    expect(asked).toEqual(["https://example.org/marie.jpg"]);
    expect(
      await page.locator(`${POPOVER} .gedcom-media-allow`).count(),
      "the question is answered, so it is not asked again in the same popover",
    ).toBe(0);
  });

  test("does not ask again for the next remote file in the session", async ({
    page,
  }) => {
    await serveRemote(page);
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, REMOTE);
    await take(page, "Show this image");
    await page.waitForSelector(`${POPOVER} img`);

    await modHover(page, REMOTE_AGAIN);
    await page.waitForSelector(`${POPOVER} img`);

    expect(await page.locator(`${POPOVER} img`).getAttribute("src")).toBe(
      "https://example.org/pierre.jpg",
    );
    expect(await page.locator(`${POPOVER} .gedcom-media-allow`).count()).toBe(0);
  });

  test("shows the row again once the setting goes off", async ({ page }) => {
    await serveRemote(page);
    await mount(page, { doc: MEDIA, media: VAULT, remoteImages: true });
    await modHover(page, REMOTE);
    await page.waitForSelector(`${POPOVER} img`);

    await page.evaluate(() => {
      window.gedcom.setRemoteImages(false);
    });
    await modHover(page, REMOTE_AGAIN);
    await page.waitForSelector(`${POPOVER} .gedcom-media-note`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-note`)).toBe(
      "Remote file, not loaded",
    );
  });

  test("refuses an address that is not encrypted, and says which", async ({
    page,
  }) => {
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await mount(page, { doc: MEDIA, media: VAULT, remoteImages: true });
    await modHover(page, INSECURE);
    await page.waitForSelector(`${POPOVER} .gedcom-media-note`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-note`)).toBe(
      "Unencrypted address, not loaded",
    );
    expect(
      await page.locator(`${POPOVER} .gedcom-media-allow`).count(),
      "there is no answer that would draw it",
    ).toBe(0);
    expect(
      requests.filter((url) => url.startsWith("http://example.org")),
    ).toEqual([]);
  });

  test("says an image that did not arrive could not be loaded", async ({
    page,
  }) => {
    await serveRemote(page, "<html>not a photograph</html>");
    await mount(page, { doc: MEDIA, media: VAULT, remoteImages: true });
    await modHover(page, REMOTE);
    await page.waitForSelector(`${POPOVER} .gedcom-media-note`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-note`)).toBe(
      "Image could not be loaded",
    );
    expect(await textOf(page, `${POPOVER} .gedcom-media-name`)).toBe(
      "https://example.org/marie.jpg",
    );
  });

  for (const dark of [false, true]) {
    test(`wears Obsidian's button colours in ${dark ? "dark" : "light"}`, async ({
      page,
    }) => {
      await mount(page, { doc: MEDIA, media: VAULT, dark });
      await modHover(page, REMOTE);
      await page.waitForSelector(`${POPOVER} .gedcom-media-allow`);

      const painted = await page.evaluate(() => {
        const button = document.querySelector(".gedcom-media-allow");
        if (!button) {
          throw new Error("no offer");
        }
        const styles = getComputedStyle(button);
        const root = getComputedStyle(document.body);
        return {
          background: styles.backgroundColor,
          normal: root.getPropertyValue("--interactive-normal").trim(),
        };
      });

      expect(painted.background).toBe(painted.normal);
    });
  }
});

test.describe("a popover the pointer can reach", () => {
  test("stays open when the pointer moves into it", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    const box = await page.evaluate(
      (target) => window.gedcom.rectOf(target),
      POPOVER,
    );
    if (!box) {
      throw new Error("no popover");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);

    await expect(page.locator(POPOVER)).toHaveCount(1);
    expect(
      await page.evaluate(() => window.gedcom.calls.mediaHides),
      "the pointer went to the popover, which is not away from it",
    ).toBe(0);
  });

  test("closes when the pointer leaves it for elsewhere", async ({ page }) => {
    await mount(page, { doc: MEDIA, media: VAULT });
    await modHover(page, FILE);
    await page.waitForSelector(`${POPOVER} img`);

    const box = await page.evaluate(
      (target) => window.gedcom.rectOf(target),
      POPOVER,
    );
    if (!box) {
      throw new Error("no popover");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width + 40, box.y - 60);

    await expect(page.locator(POPOVER)).toHaveCount(0);
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
      window.gedcom.rectOf(".gedcom-media-image"),
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
    await mount(page, {
      doc: MEDIA,
      media: VAULT,
      mediaPreview: "off",
      recordPreview: "modifier",
    });
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

test.describe("a document that moves under an open preview", () => {
  test("closes it, and answers the line's new payload afterwards", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT, mediaPreview: "modifier" });
    await modHover(page, FILE);
    await expect(page.locator(POPOVER)).toBeVisible();

    // The pointer has not moved; the line it opened for has. A popover left
    // open would be saying what the document no longer says.
    await page.evaluate((at) => {
      window.gedcom.view?.dispatch({
        changes: {
          from: at,
          to: at + "media/family.jpg".length,
          insert: "media/gone.jpg",
        },
      });
    }, FILE);

    await expect(page.locator(POPOVER)).toHaveCount(0);

    // And the session went with it: keyed by the line, it would otherwise
    // answer the next movement over this same line by keeping what is gone.
    await page.mouse.move(0, 0);
    await modHover(page, FILE);

    await expect(page.locator(POPOVER)).toContainText("File not found");
    await expect(page.locator(POPOVER)).toContainText("media/gone.jpg");
    expect(await page.locator(".gedcom-media-image").count()).toBe(0);
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

/** Pictures painted red inside the rectangle a `CROP` names, and nowhere else. */
const PAINTED = [
  "0 HEAD",
  "1 GEDC",
  "2 VERS 7.0",
  "0 @O1@ OBJE",
  "1 FILE media/painted.svg",
  "2 FORM image/svg+xml",
  "0 @O2@ OBJE",
  "1 FILE media/scan.svg",
  "2 FORM image/svg+xml",
  "0 @O3@ OBJE",
  "1 FILE media/broken.png",
  "2 FORM image/png",
  "0 @O4@ OBJE",
  "1 FILE media/wide.svg",
  "2 FORM image/svg+xml",
  "0 @I1@ INDI",
  "1 NAME Marie /Curie/",
  "1 OBJE @O1@",
  "2 CROP",
  "3 TOP 100",
  "3 LEFT 200",
  "3 HEIGHT 150",
  "3 WIDTH 200",
  "0 @I2@ INDI",
  "1 NAME Pierre /Curie/",
  "1 OBJE @O2@",
  "2 CROP",
  "3 TOP 400",
  "3 LEFT 600",
  "3 HEIGHT 900",
  "3 WIDTH 1200",
  "0 @I3@ INDI",
  "1 NAME Irene /Curie/",
  "1 OBJE @O4@",
  "2 CROP",
  "3 TOP 100",
  "3 LEFT 400",
  "3 HEIGHT 200",
  "3 WIDTH 800",
  "0 TRLR",
  "",
].join("\n");

const PAINTED_VAULT = {
  "media/painted.svg": "target",
  "media/scan.svg": "scan",
  "media/broken.png": "broken",
  "media/wide.svg": "wide",
};

const BIG_FILE = offsetOf(PAINTED, "media/wide.svg");
const SMALL_CROP = offsetOf(PAINTED, "@O1@\n2 CROP") + 1;
const LARGE_CROP = offsetOf(PAINTED, "@O2@\n2 CROP") + 1;
const WIDE_CROP = offsetOf(PAINTED, "@O4@\n2 CROP") + 1;
const BROKEN = offsetOf(PAINTED, "media/broken.png");

test.describe("which part of the picture the rectangle shows", () => {
  test("is the rectangle itself, at the image's own scale", async ({ page }) => {
    await mount(page, { doc: PAINTED, media: PAINTED_VAULT });
    await modHover(page, SMALL_CROP);
    await page.waitForSelector(`${POPOVER} .gedcom-media-cropped`);

    expect(
      await shownRegion(page),
      "TOP 100 LEFT 200 HEIGHT 150 WIDTH 200 of a 600x400 image",
    ).toEqual({ left: 200, top: 100, right: 400, bottom: 250, scale: 1 });
  });

  test("is red all over, the ground around it being another colour", async ({
    page,
  }) => {
    await mount(page, { doc: PAINTED, media: PAINTED_VAULT });
    await modHover(page, SMALL_CROP);
    await page.waitForSelector(`${POPOVER} .gedcom-media-cropped`);

    // The corners of what is on screen, sampled out of the source image.
    const corners = await page.evaluate(() => {
      const frame = document.querySelector(".gedcom-media-frame");
      const image = document.querySelector(".gedcom-media-image");
      if (
        !(frame instanceof HTMLElement) ||
        !(image instanceof HTMLImageElement)
      ) {
        throw new Error("no frame");
      }
      const box = frame.getBoundingClientRect();
      const drawn = image.getBoundingClientRect();
      const scale = drawn.width / image.naturalWidth;
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        throw new Error("no canvas");
      }
      context.drawImage(image, 0, 0);
      const inset = 2;
      return [
        [box.left + inset, box.top + inset],
        [box.right - inset, box.top + inset],
        [box.left + inset, box.bottom - inset],
        [box.right - inset, box.bottom - inset],
      ].map(([x, y]) => {
        const pixel = context.getImageData(
          Math.round((x - drawn.left) / scale),
          Math.round((y - drawn.top) / scale),
          1,
          1,
        ).data;
        return `${pixel[0]},${pixel[1]},${pixel[2]}`;
      });
    });

    expect(corners, "every corner of the frame is inside the rectangle").toEqual(
      ["255,0,0", "255,0,0", "255,0,0", "255,0,0"],
    );
  });

  test("shrinks a rectangle larger than the bound rather than cutting it short", async ({
    page,
  }) => {
    await mount(page, { doc: PAINTED, media: PAINTED_VAULT });
    await modHover(page, LARGE_CROP);
    await page.waitForSelector(`${POPOVER} .gedcom-media-cropped`);

    const region = await shownRegion(page);
    expect(
      { left: region.left, top: region.top, right: region.right, bottom: region.bottom },
      "the whole of TOP 400 LEFT 600 HEIGHT 900 WIDTH 1200",
    ).toEqual({ left: 600, top: 400, right: 1800, bottom: 1300 });
    expect(region.scale, "and it got there by shrinking").toBeLessThan(1);

    const box = await page.evaluate(() =>
      window.gedcom.rectOf(".gedcom-media-frame"),
    );
    expect(box?.width ?? 0, "inside the bound").toBeLessThanOrEqual(560);
    expect(box?.height ?? 0).toBeLessThanOrEqual(400);
    expect(
      (box?.width ?? 0) / (box?.height ?? 1),
      "and undistorted: 1200 by 900",
    ).toBeCloseTo(1200 / 900, 1);
  });
});

test.describe("a file the vault holds and the renderer cannot draw", () => {
  test("says so rather than leaving an empty box", async ({ page }) => {
    await mount(page, { doc: PAINTED, media: PAINTED_VAULT });
    await modHover(page, BROKEN);
    await page.waitForSelector(`${POPOVER} .gedcom-media-row`);

    expect(await textOf(page, `${POPOVER} .gedcom-media-note`)).toBe(
      "Image could not be drawn",
    );
    expect(await textOf(page, `${POPOVER} .gedcom-media-name`)).toBe(
      "broken.png",
    );
    await expect(page.locator(`${POPOVER} img`)).toHaveCount(0);
  });
});

test.describe("a pointer both previews could answer", () => {
  test("shows the record where media preview is off", async ({ page }) => {
    await mount(page, {
      doc: MEDIA,
      media: VAULT,
      mediaPreview: "off",
      recordPreview: "modifier",
    });
    await modHover(page, MARIE_LINK);

    await expect(page.locator(POPOVER), "no picture was asked for").toHaveCount(
      0,
    );
    expect(
      (await page.evaluate(() => window.gedcom.calls.previews)).length,
      "so the record the pointer names is what is left to show",
    ).toBe(1);
  });

  test("shows the record for a gesture the media preview does not answer", async ({
    page,
  }) => {
    await mount(page, {
      doc: MEDIA,
      media: VAULT,
      recordPreview: "hover",
      mediaPreview: "modifier",
    });
    await pointAt(page, MARIE_LINK);
    await expect
      .poll(() => page.evaluate(() => window.gedcom.calls.previews.length), {
        message: "a bare hover is the record's gesture, not the picture's",
      })
      .toBe(1);
    await expect(page.locator(POPOVER)).toHaveCount(0);
  });

  test("stands the record aside where the media preview answers", async ({
    page,
  }) => {
    await mount(page, { doc: MEDIA, media: VAULT, mediaPreview: "modifier" });
    await modHover(page, MARIE_LINK);
    await page.waitForSelector(POPOVER);

    expect(
      await page.evaluate(() => window.gedcom.calls.previews),
      "the picture is what the reader wanted",
    ).toEqual([]);
  });
});

/**
 * How much of what was drawn the popover actually shows. A popover has a width
 * of its own and hides what overflows it, which no measurement of the picture
 * alone can see.
 */
async function clipping(page: Page): Promise<{
  drawn: number;
  visible: number;
  ratio: number;
}> {
  return page.evaluate(() => {
    const popover = document.querySelector(".hover-popover");
    const image = document.querySelector(".gedcom-media-image");
    if (!(popover instanceof HTMLElement) || !(image instanceof HTMLElement)) {
      throw new Error("no popover");
    }
    const box = popover.getBoundingClientRect();
    const drawn = image.getBoundingClientRect();
    const visible = Math.max(
      0,
      Math.min(box.right, drawn.right) - Math.max(box.left, drawn.left),
    );
    const round = (value: number): number => Math.round(value);
    return {
      drawn: round(drawn.width),
      visible: round(visible),
      ratio: Math.round((drawn.width / drawn.height) * 100) / 100,
    };
  });
}

test.describe("a picture larger than the popover it hangs in", () => {
  test("is scaled to fit it, not cut off at the edge", async ({ page }) => {
    await mount(page, { doc: PAINTED, media: PAINTED_VAULT });
    await modHover(page, BIG_FILE);
    await page.waitForSelector(`${POPOVER} img`);

    const box = await clipping(page);
    expect(box.visible, "all of it is inside the popover").toBe(box.drawn);
    expect(box.ratio, "and it kept its shape: 1600 by 400").toBeCloseTo(4, 1);
  });

  test("shows the whole of a rectangle wider than the popover", async ({
    page,
  }) => {
    await mount(page, { doc: PAINTED, media: PAINTED_VAULT });
    await modHover(page, WIDE_CROP);
    await page.waitForSelector(`${POPOVER} .gedcom-media-cropped`);

    expect(
      await shownRegion(page),
      "the whole of TOP 100 LEFT 400 HEIGHT 200 WIDTH 800",
    ).toMatchObject({ left: 400, top: 100, right: 1200, bottom: 300 });
  });
});
