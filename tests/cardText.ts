import { expect, type Locator } from "@playwright/test";

/**
 * A card's name lines in whatever font the browser has: the given name whole,
 * the surname at least as far as `surnameStart`, a cut one ending in an
 * ellipsis, and every line inside the card.
 */
export async function expectNameLines(card: Locator, given: string, surnameStart: string): Promise<void> {
  const lines = card.locator(".gedcom-fg-card-name");
  await expect(lines).toHaveCount(2);
  await expect(lines.nth(0)).toHaveText(given);
  const surname = (await lines.nth(1).textContent()) ?? "";
  expect(surname.startsWith(surnameStart)).toBe(true);
  const box = await card.locator(".gedcom-fg-card-bg").boundingBox();
  for (const line of await lines.all()) {
    const written = await line.boundingBox();
    expect(written?.x ?? -1).toBeGreaterThanOrEqual(box?.x ?? Infinity);
    expect((written?.x ?? Infinity) + (written?.width ?? Infinity)).toBeLessThanOrEqual((box?.x ?? 0) + (box?.width ?? 0));
  }
}
