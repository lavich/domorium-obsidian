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

const shownRecord = (page: Page, xref: string) =>
  expect(page.locator(".gedcom-card")).toHaveAttribute("data-shown", new RegExp(`\\n${xref}$`, "u"));

const show = (page: Page, xref: string) =>
  page.evaluate((record) => {
    window.desk.selectRecord(record);
  }, xref);

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

    test("draws only the tree of her record, with no tab bar and nothing to scroll sideways", async ({ page }) => {
      await expect(page.locator(".gedcom-card-body > *")).toHaveCount(1);
      await expect(page.locator(".gedcom-card-body > .gedcom-tree")).toHaveCount(1);
      await expect(page.locator(".gedcom-card-body h1, .gedcom-card-body h2")).toHaveCount(0);
      await expect(page.locator(".gedcom-desk-tabs, .gedcom-fg-canvas")).toHaveCount(0);
      expect(await overflowsSideways(page)).toBe(false);
    });

    test("lists her lines as closed nodes beneath an open root", async ({ page }) => {
      await expect(page.locator(".gedcom-tree-list > .gedcom-tree-node.is-root")).toHaveCount(1);
      await expect(page.locator(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-label")).toHaveText("Person");
      await expect(page.locator('.gedcom-tree-node[data-depth="1"]')).toHaveCount(14);
      await expect(page.locator(".gedcom-tree-chevron[aria-expanded=true]")).toHaveCount(1);
      await expect(treeRow(page, "Birth").locator(".gedcom-tree-summary")).toContainText("7 NOV 1867");
      const inside = await page.evaluate(() => {
        const body = document.querySelector(".gedcom-card-body")?.getBoundingClientRect();
        return [...document.querySelectorAll(".gedcom-tree-row")].every(
          (row) => {
            const box = row.getBoundingClientRect();
            return body !== undefined && box.left >= body.left - 0.5 && box.right <= body.right + 0.5;
          },
        );
      });
      expect(inside).toBe(true);
    });

    test("has no header, and the body scrolls from the top of the card to its end", async ({ page }) => {
      await openEveryNode(page);
      await expect(page.locator(".gedcom-card-head, .gedcom-card-nav, .gedcom-card-head-name")).toHaveCount(0);
      const card = await page.locator(".gedcom-card").boundingBox();
      const before = await page.locator(".gedcom-card > .nav-header").boundingBox();
      await page.locator(".gedcom-card-body").evaluate((body) => {
        body.scrollTop = body.scrollHeight;
      });

      expect(before?.y).toBe(card?.y);
      expect(await scrollTopOf(page)).toBeGreaterThan(0);
    });

    test("draws the labels of her facts as text, and pressing a line's label opens nothing", async ({ page }) => {
      await expect(page.locator("button.gedcom-tree-label, .is-fact")).toHaveCount(0);
      await treeRow(page, "Sex").locator(".gedcom-tree-label").click();

      await shownRecord(page, "@I1@");
    });

    test("opens the place of a fact", async ({ page }) => {
      await pressArrow(page, "Birth");
      await treeRow(page, "Place").locator(".gedcom-tree-place").click();

      await expect(page.locator(".gedcom-desk-title")).toHaveText("Warsaw, Congress Poland");
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
      ".gedcom-desk-link",
    ]) {
      expect(await look(selector), selector).toEqual({
        background: "rgba(0, 0, 0, 0)",
        shadow: "none",
      });
    }
  });
});

test.describe("an event id", () => {
  test("shows no card, which the file no longer has for events", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { record: "event:@I1@:BIRT:0" });

    await expect(page.locator(".gedcom-card-state")).toHaveText("Select a record in the graph, the timeline or the list.");
    await expect(page.locator(".gedcom-desk-title")).toHaveCount(0);
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
      "Select a record in the graph, the timeline or the list.",
    );
  });

  test("says the file holds nothing to show", async ({ page }) => {
    await mountDesk(page, { record: "", doc: "0 HEAD\n0 TRLR\n" });

    await expect(page.locator(".gedcom-card-state")).toHaveText("The file holds nothing to show.");
  });
});

test.describe("the family card", () => {
  test("is its tree alone, and leads from it to a child", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 800 });
    await mountDesk(page, { record: "@F3@" });

    await expect(page.locator(".gedcom-card-body > *")).toHaveCount(1);
    await expect(page.locator(".gedcom-card-body > .gedcom-tree")).toHaveCount(1);
    await expect(page.locator(".gedcom-tree .gedcom-tree-row", { hasText: "Husband" }).locator(".gedcom-desk-link")).toHaveText("Pierre Curie");
    await expect(page.locator(".gedcom-tree .gedcom-tree-row", { hasText: "Wife" }).locator(".gedcom-desk-link")).toHaveText("Marie Skłodowska-Curie");
    await expect(page.locator(".gedcom-card-body h1, .gedcom-card-body h2, .gedcom-desk-kin, .gedcom-desk-person")).toHaveCount(0);
    await page.locator(".gedcom-tree .gedcom-desk-link", { hasText: "Ève Curie" }).click();
    await shownRecord(page, "@I13@");
  });
});

test.describe("the source card and the media card", () => {
  test("shows a source as its tree and nothing else", async ({ page }) => {
    await mountDesk(page, { record: "@S3@" });

    await expect(page.locator(".gedcom-card-body > *")).toHaveCount(1);
    await expect(page.locator(".gedcom-card-body > .gedcom-tree")).toHaveCount(1);
    await expect(page.locator(".gedcom-card-body h1, .gedcom-card-body h2")).toHaveCount(0);
    await expect(page.locator(".gedcom-desk-citer, .gedcom-desk-repository")).toHaveCount(0);
  });

  test("selects a source from its row in the tree of a card", async ({ page }) => {
    await mountDesk(page);
    await treeRow(page, "Source").first().locator(".gedcom-tree-chevron").click();
    await page.locator(".gedcom-tree .gedcom-desk-link", { hasText: "Physics 1903" }).click();

    await shownRecord(page, "@S1@");
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

test.describe("the controls of a card", () => {
  test("show a focus ring for the keyboard and none for the pointer", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page);
    const pierre = treeRow(page, "Birth").locator(".gedcom-desk-link").first();
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

  test("show the always visible toggle of the tree with a focus ring for the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page);
    const toggle = page.locator(".gedcom-tree-toggle");

    await expect(toggle).toBeVisible();
    await toggle.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    expect(await toggle.evaluate((node) => getComputedStyle(node).outlineStyle)).toBe("solid");
    await page.keyboard.press("Enter");
    await expect(toggle).toHaveAttribute("aria-label", "Close every node");
  });
});

const hitSweep = (page: Page): Promise<string[]> =>
  page.evaluate(() => {
    const missed: string[] = [];
    const selectors = ".gedcom-card button:not(:disabled), .gedcom-card .nav-action-button";
    for (const control of document.querySelectorAll<HTMLElement>(selectors)) {
      control.scrollIntoView({ block: "center" });
      const box = control.getBoundingClientRect();
      if (box.width === 0) {
        continue;
      }
      const x = box.left + Math.min(box.width / 2, 6);
      const hits: number[] = [];
      for (let y = box.top - 30; y <= box.bottom + 30; y += 2) {
        if (document.elementFromPoint(x, y)?.closest("button, [role=button]") === control) {
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
      ["@I1@", rich], ["@F3@", rich],
    ];
    for (const [record, doc] of cases) {
      const name = `${record}${doc === undefined ? "" : " (rich)"}`;
      await mountDesk(page, { record, phone: true, ...(doc === undefined ? {} : { doc }) });
      expect(await hitSweep(page), `${name}, closed`).toEqual([]);

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

  test("keep the arrows shown, at touch sizes, without the app's mobile class", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await mountDesk(page, { width: 390 });
    expect(await page.evaluate(() => window.matchMedia("(pointer: coarse)").matches)).toBe(true);
    expect(await page.evaluate(() => document.body.classList.contains("is-mobile"))).toBe(false);

    await expect(page.locator(".gedcom-tree-toggle")).toBeVisible();
    expect((await page.locator(".gedcom-tree-chevron").first().boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect((await hitSweep(page)).filter((name) => name.includes("gedcom-tree-chevron"))).toEqual([]);
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

      test("draws only its tree, and does not scroll sideways", async ({ page }) => {
        await expect(page.locator(".gedcom-card-body > *")).toHaveCount(1);
        await expect(page.locator(".gedcom-card-body h1, .gedcom-card-body h2")).toHaveCount(0);
        expect(await overflowsSideways(page)).toBe(false);
      });

      test("shows every name with its type and the parts of it, once the nodes are open", async ({ page }) => {
        await openEveryNode(page);
        const names = page.locator('.gedcom-tree-node[data-key^="NAME["]:not([data-key*="."]) > .gedcom-tree-row .gedcom-field');

        await expect(names).toHaveText(["Maria Skłodowska", "Marie Curie"]);
        await expect(page.locator(".gedcom-tree-label", { hasText: "Given names" }).first()).toBeVisible();
        await expect(page.locator('.gedcom-tree-node[data-key="NAME[0].TYPE[0]"] .gedcom-tree-choice')).toHaveAttribute("data-kind", "choice");
        expect(await page.locator('.gedcom-tree-node[data-key="NAME[0].TYPE[0]"] .gedcom-tree-choice').evaluate((one) => (one as HTMLSelectElement).selectedOptions[0]?.textContent)).toBe("Birth");
      });

      test("folds a long note until the focus is put in its field, and keeps it inside the card", async ({ page }) => {
        await openEveryNode(page);
        await page.locator(".gedcom-field.is-folded").first().evaluate((one) => one.setAttribute("data-probe", ""));
        const note = page.locator(".gedcom-field[data-probe]");
        await note.scrollIntoViewIfNeeded();
        const folded = (await note.boundingBox())?.height ?? 0;
        await note.locator("textarea").focus();
        await expect(note).not.toHaveClass(/is-folded/u);
        expect((await note.boundingBox())?.height ?? 0).toBeGreaterThan(folded);
        expect(await overflowsSideways(page)).toBe(false);
      });

      test("shows the custom line nested once the nodes are open, without scrolling sideways", async ({ page }) => {
        await openEveryNode(page);
        await expect(page.locator(".gedcom-tree-label", { hasText: "_MILITARY" }).first()).toBeVisible();
        await expect(page.locator(".gedcom-tree-label", { hasText: "_SINCE" }).first()).toBeVisible();
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
  test("shows the header with the open-all toggle at rest, and the arrows of the nodes always in sight", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    await page.mouse.move(2, 2);

    await expect(page.locator(".gedcom-card > .nav-header .nav-action-button.gedcom-tree-toggle")).toBeVisible();
    expect(await opacityOf(page.locator(".gedcom-card > .nav-header"))).toBe("1");
    for (const chevron of await page.locator(".gedcom-tree-chevron").all()) {
      expect(await opacityOf(chevron)).toBe("1");
      expect(await chevron.evaluate((node) => getComputedStyle(node).pointerEvents)).toBe("auto");
      await expect(chevron).toHaveAttribute("aria-label", /.+/u);
      expect(await chevron.evaluate((node) => (node as HTMLButtonElement).tabIndex)).toBe(0);
    }
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
    await shownRecord(page, "@I2@");
    await expect(treeRow(page, "Birth").locator(".gedcom-tree-chevron")).toHaveAttribute("aria-expanded", "false");
    await page.evaluate(() => {
      window.desk.selectRecord("@I1@");
    });
    await expect(treeRow(page, "Birth").locator(".gedcom-tree-chevron")).toHaveAttribute("aria-expanded", "true");
  });

  test("opens and closes every node with one icon toggle that flips and keeps the focus", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
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

  test("opens the card of a place from its line", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 420 });
    await pressArrow(page, "Birth");
    await expect(treeRow(page, "Place").locator("textarea")).toHaveValue("Warsaw, Congress Poland");
    await treeRow(page, "Place").locator(".gedcom-tree-place").click();
    await expect(page.locator(".gedcom-desk-title")).toHaveText("Warsaw, Congress Poland");
  });

  test("starts another record at its top, and keeps the focus on the toggle and on a control of the same record across a redraw", async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 420 });
    await mountDesk(page, { width: 360 });
    await openEveryNode(page);
    await page.locator(".gedcom-card-body").evaluate((body) => {
      body.scrollTop = 300;
    });
    await page.locator(".gedcom-tree-toggle").focus();
    await show(page, "@I1@");
    await expect(page.locator(".gedcom-tree-toggle")).toBeFocused();
    expect(await scrollTopOf(page)).toBe(300);

    await show(page, "@I2@");
    await shownRecord(page, "@I2@");
    expect(await scrollTopOf(page)).toBe(0);
    await expect(page.locator(".gedcom-tree-toggle")).toBeFocused();
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
    await treeRow(page, "Birth").locator(".gedcom-tree-chevron").focus();
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

const marieText = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const text = window.desk.text();
    const start = text.indexOf("0 @I1@ INDI");
    return `${text.slice(start, text.indexOf("\n0 ", start))}\n`;
  });

test.describe("editing a record in its tree", () => {
  const fileText = (page: Page) => marieText(page);
  const choose = (page: Page, title: string) => page.locator(".harness-chooser button", { hasText: new RegExp(`^(✓ )?${title}$`, "u") }).click();
  const field = (page: Page, label: string) => treeRow(page, label).locator("textarea");

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1400, height: 760 });
    await mountDesk(page, { width: 390 });
  });

  test("changes a given name with Enter", async ({ page }) => {
    await pressArrow(page, "Name");
    await field(page, "Given names").fill("Maria");
    await field(page, "Given names").press("Enter");

    expect(await fileText(page)).toContain("2 GIVN Maria\n");
    await expect(field(page, "Given names")).toBeFocused();
    await expect(field(page, "Given names")).toHaveValue("Maria");
  });

  test("chooses a sex from its list", async ({ page }) => {
    await treeRow(page, "Sex").locator("select").selectOption("M");

    expect(await fileText(page)).toContain("1 SEX M\n");
  });

  test("adds a nickname under a name, written on Enter", async ({ page }) => {
    await pressArrow(page, "Name");
    await treeRow(page, "Name").locator(".gedcom-tree-add").click();
    await choose(page, "Nickname");
    await expect(page.locator(".is-unwritten textarea")).toBeFocused();
    await page.keyboard.type("Manya");
    await page.keyboard.press("Enter");

    expect(await fileText(page)).toContain("2 NICK Manya\n");
    await expect(page.locator(".is-unwritten")).toHaveCount(0);
  });

  test("adds a death at once, with the focus on its menu", async ({ page }) => {
    await mountDesk(page, { width: 390, doc: "0 HEAD\n1 GEDC\n2 VERS 7.0\n0 @I1@ INDI\n1 NAME Marie /Curie/\n0 TRLR\n" });
    await page.locator(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-add").click();
    await choose(page, "Death");

    expect(await fileText(page)).toContain("1 DEAT Y\n");
    await expect(treeRow(page, "Death").locator(".gedcom-tree-add")).toBeFocused();
  });

  test("adds a source to a birth through the list of records", async ({ page }) => {
    await treeRow(page, "Birth").locator(".gedcom-tree-add").click();
    await choose(page, "Source");
    await page.locator(".harness-chooser button").first().click();

    expect(await fileText(page)).toMatch(/1 BIRT\n(?:2 .*\n)*2 SOUR @S\d+@/u);
  });

  test("adds an associated person with the role it requires, the two written together", async ({ page }) => {
    await page.locator(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-add").click();
    await choose(page, "Associated person");
    await choose(page, "Pierre Curie");
    expect(await fileText(page)).not.toContain("1 ASSO");
    await page.locator(".is-unwritten select").selectOption("FRIEND");

    expect(await fileText(page)).toContain("1 ASSO @I2@\n2 ROLE FRIEND\n");
  });

  test("removes a line, and one line only for two quick presses", async ({ page }) => {
    const before = await fileText(page);
    const remove = treeRow(page, "Sex").locator(".gedcom-tree-remove");
    await remove.evaluate((button: HTMLElement) => {
      button.click();
      button.click();
    });
    const after = await fileText(page);

    expect(after).not.toContain("1 SEX F\n");
    expect(before.split("\n").length - after.split("\n").length).toBe(1);
    await expect(page.locator(".gedcom-tree-node.is-root > .gedcom-tree-row .gedcom-tree-add")).toBeFocused();
  });

  test("asks before removing a line with lines beneath it, and removes nothing once the file changed meanwhile", async ({ page }) => {
    await treeRow(page, "Birth").locator(".gedcom-tree-remove").click();
    await page.evaluate(() => {
      window.desk.replace(window.desk.text().replace("0 @I1@ INDI\n", "0 @I1@ INDI\n1 _X y\n"));
      window.desk.confirm();
    });

    expect(await fileText(page)).toContain("1 BIRT\n2 DATE 7 NOV 1867");
    await expect(page.locator(".gedcom-tree-label", { hasText: "_X" })).toHaveCount(1);
  });

  test("refuses a date that does not exist and says why under it", async ({ page }) => {
    await pressArrow(page, "Birth");
    await field(page, "Date").fill("31 NOV 1867");
    await field(page, "Date").press("Enter");

    expect(await fileText(page)).toContain("2 DATE 7 NOV 1867");
    await expect(treeRow(page, "Date").locator(".gedcom-tree-message")).toHaveText("There is no November 31: November has 30 days.");
    await expect(field(page, "Date")).toHaveAttribute("aria-invalid", "true");
  });
});

test.describe("editing on a phone", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 760 } });

  test("writes the changed value first when another line's removal is tapped, then removes that line", async ({ page }) => {
    await mountDesk(page, { phone: true });
    await treeRow(page, "Occupation").locator("textarea").fill("Physicist");
    await expect(treeRow(page, "Occupation").locator(".gedcom-field-revert")).toBeVisible();
    expect((await treeRow(page, "Occupation").locator(".gedcom-field-revert").boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await treeRow(page, "Sex").locator(".gedcom-tree-remove").tap();
    const text = await marieText(page);

    expect(text).toContain("1 OCCU Physicist\n");
    expect(text).not.toContain("1 SEX F\n");
  });
});
