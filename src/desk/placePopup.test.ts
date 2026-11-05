// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import type { MapEvent } from "./fileMap";
import { PlacePopup, popupRows } from "./placePopup";

beforeAll(installObsidianDom);

const event = (record: string, year: number | undefined, order: number): MapEvent => ({
  record,
  family: false,
  kind: "birth",
  tag: "BIRT",
  place: "Warsaw",
  order,
  ...(year === undefined ? {} : { year, span: [year, year] as [number, number] }),
});

describe("the rows of a popup", () => {
  it("run in the order of the years with the undated last", () => {
    const rows = popupRows([event("@I3@", undefined, 1), event("@I2@", 1870, 2), event("@I1@", 1867, 3)], (record) => `name ${record}`);

    expect(rows.map((row) => row.record)).toEqual(["@I1@", "@I2@", "@I3@"]);
    expect(rows[0]).toMatchObject({ year: "1867", kind: "Birth", name: "name @I1@" });
    expect(rows[2]?.year).toBe("");
  });
});

describe("the popup of events", () => {
  let root: HTMLElement;
  let host: { select: ReturnType<typeof vi.fn<(xref: string) => void>>; closed: ReturnType<typeof vi.fn<() => void>> };
  let popup: PlacePopup;
  let opener: HTMLButtonElement;

  beforeEach(() => {
    root = document.createElement("div");
    opener = document.createElement("button");
    document.body.replaceChildren(root, opener);
    host = { select: vi.fn(), closed: vi.fn() };
    popup = new PlacePopup(root, host);
    popup.open(
      "Warsaw",
      [{ rows: popupRows([event("@I1@", 1867, 1), event("@I2@", 1870, 2)], (r) => r) }],
      { clientX: 10, clientY: 10 },
      opener,
    );
  });

  const rows = (): HTMLButtonElement[] => Array.from(root.querySelectorAll("button"));

  it("lists the events as buttons in a list, the first with the focus", () => {
    expect(root.querySelectorAll("ul li")).toHaveLength(2);
    expect(document.activeElement).toBe(rows()[0]);
  });

  it("selects the record of a row and closes", () => {
    rows()[1]?.click();

    expect(host.select).toHaveBeenCalledWith("@I2@");
    expect(popup.isOpen()).toBe(false);
  });

  it("moves with the arrows and stays on the last row", () => {
    const press = (key: string): void => {
      document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    };
    press("ArrowDown");
    expect(document.activeElement).toBe(rows()[1]);
    press("ArrowDown");
    expect(document.activeElement).toBe(rows()[1]);
    press("Home");
    expect(document.activeElement).toBe(rows()[0]);
    press("End");
    expect(document.activeElement).toBe(rows()[1]);
  });

  it("closes with Escape and gives the focus back", () => {
    rows()[0]?.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(popup.isOpen()).toBe(false);
    expect(document.activeElement).toBe(opener);
    expect(host.closed).toHaveBeenCalled();
  });

  it("groups the events of an unseparable cluster under the names of the places", () => {
    popup.open("Two", [{ place: "A", rows: popupRows([event("@I1@", 1, 1)], (r) => r) }, { place: "B", rows: popupRows([event("@I2@", 2, 2)], (r) => r) }], { clientX: 0, clientY: 0 });

    expect(Array.from(root.querySelectorAll(".gedcom-map-popup-place")).map((node) => node.textContent)).toEqual(["A", "B"]);
  });
});
