// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { curieIndex } from "../testing/curie";
import { installObsidianDom } from "../testing/obsidianDom";
import { placeAt } from "./placeRows";
import { renderPlacePage } from "./placePage";
import type { PageHost } from "./personPage";

let container: HTMLElement;
let host: ReturnType<typeof deskHost>;

function deskHost() {
  return {
    openRecord: vi.fn<PageHost["openRecord"]>(),
    select: vi.fn<PageHost["select"]>(),
    showInSource: vi.fn<PageHost["showInSource"]>(),
    openFile: vi.fn<PageHost["openFile"]>(),
  } satisfies PageHost;
}

beforeAll(installObsidianDom);
beforeEach(() => {
  container = document.createElement("div");
  host = deskHost();
});

function drawWarsaw(): void {
  const index = curieIndex();
  const place = placeAt(index, "place:warsaw, congress poland");
  if (!place) {
    throw new Error("no Warsaw");
  }
  renderPlacePage(container, place, index, host);
}

const marieRow = (): Element | undefined =>
  [...container.querySelectorAll(".gedcom-desk-place-occurrences .gedcom-desk-fact")].find(
    (row) => row.querySelector(".gedcom-desk-link")?.textContent === "Marie Skłodowska-Curie",
  );

describe("the card of a place", () => {
  it("lists each event as the row a person's facts use", () => {
    drawWarsaw();
    const row = marieRow();

    expect(row?.querySelector(".gedcom-desk-fact-name")?.textContent).toBe("Birth");
    expect(row?.querySelector(".gedcom-desk-fact-value")?.textContent).toContain("7 NOV 1867");
    expect(row?.querySelector(".gedcom-desk-fact-value .gedcom-desk-link")?.textContent).toBe("Marie Skłodowska-Curie");
    expect(row?.querySelector(".gedcom-desk-chip")).toBeNull();
    expect(container.querySelector(".gedcom-desk-unsourced")).toBeNull();
  });

  it("opens the card of the event from its name, and the record from its link", () => {
    drawWarsaw();
    marieRow()?.querySelector<HTMLElement>(".gedcom-desk-fact-name")?.click();
    marieRow()?.querySelector<HTMLElement>(".gedcom-desk-fact-value .gedcom-desk-link")?.click();

    expect(host.openRecord.mock.calls).toEqual([["event:@I1@:BIRT:0"], ["@I1@"]]);
  });

  it("keys the name by the event, so focus survives a redraw", () => {
    drawWarsaw();

    expect(marieRow()?.querySelector(".gedcom-desk-fact-name")?.getAttribute("data-focus-key")).toBe("event:@I1@:BIRT:0");
  });
});
