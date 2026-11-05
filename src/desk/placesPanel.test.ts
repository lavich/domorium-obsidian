// @vitest-environment happy-dom
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { type PanelRow, PlacesPanel, type PanelState } from "./placesPanel";

beforeAll(installObsidianDom);

const row = (name: string, mapped: boolean, events = 2): PanelRow => ({ key: name.toLowerCase(), name, events, years: "1891–1934", mapped });

let host: {
  activate: ReturnType<typeof vi.fn<(key: string) => void>>;
  tableAction: ReturnType<typeof vi.fn<() => void>>;
  addMissing: ReturnType<typeof vi.fn<() => void>>;
  closed: ReturnType<typeof vi.fn<() => void>>;
};
let panel: PlacesPanel;

const state = (extra: Partial<PanelState> = {}): PanelState => ({
  mapped: [row("Paris", true), row("Warsaw", true)],
  unmapped: [row("Sceaux", false), row("Passy", false)],
  table: "create",
  missing: 0,
  ...extra,
});

beforeEach(() => {
  const root = document.createElement("div");
  document.body.replaceChildren(root);
  host = { activate: vi.fn(), tableAction: vi.fn(), addMissing: vi.fn(), closed: vi.fn() };
  panel = new PlacesPanel(root, host);
});

const text = (): string[] => Array.from(panel.el.querySelectorAll(".gedcom-map-panel-group, .gedcom-map-panel-name")).map((node) => node.textContent ?? "");

describe("the places panel", () => {
  it("lists the two groups with their counts", () => {
    panel.show(state());
    panel.open();

    expect(text()).toEqual(["On the map · 2", "Paris", "Warsaw", "No coordinates · 2", "Sceaux", "Passy"]);
  });

  it("holds a window of 20 000 rows and no more", () => {
    panel.show(state({ mapped: Array.from({ length: 20_000 }, (_, i) => row(`P${i}`, true)), unmapped: [] }));
    panel.open();

    expect(panel.rows()).toBeLessThanOrEqual(60);
  });

  it("calls its host for a row of a mapped place and makes a button of it", () => {
    panel.show(state());
    panel.open();
    const buttons = panel.el.querySelectorAll<HTMLButtonElement>("button.gedcom-map-panel-row");
    buttons[1]?.click();

    expect(buttons).toHaveLength(2);
    expect(host.activate).toHaveBeenCalledWith("warsaw");
  });

  it("does not make a button of a place with no coordinates", () => {
    panel.show(state());
    panel.open();

    expect(panel.el.querySelectorAll("div.gedcom-map-panel-row")).toHaveLength(2);
  });

  it("closes with Escape and says so", () => {
    panel.show(state());
    panel.open();
    panel.el.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    expect(panel.isOpen()).toBe(false);
    expect(host.closed).toHaveBeenCalled();
  });

  it("reads Create the places table with none and Open the places table with one", () => {
    panel.show(state({ table: "create" }));
    const label = (): string | undefined => panel.el.querySelector(".gedcom-map-panel-action")?.textContent ?? undefined;
    expect(label()).toBe("Create the places table");
    panel.show(state({ table: "open" }));
    expect(label()).toBe("Open the places table");
    panel.el.querySelector<HTMLButtonElement>(".gedcom-map-panel-action")?.click();

    expect(host.tableAction).toHaveBeenCalledOnce();
  });

  it("offers to add the places that have no row only when there are some", () => {
    panel.show(state({ table: "open", missing: 0 }));
    expect(panel.el.querySelectorAll(".gedcom-map-panel-action")).toHaveLength(1);
    panel.show(state({ table: "open", missing: 3 }));
    const actions = panel.el.querySelectorAll<HTMLButtonElement>(".gedcom-map-panel-action");
    actions[1]?.click();

    expect(actions[1]?.textContent).toBe("Add the 3 places that have no row");
    expect(host.addMissing).toHaveBeenCalledOnce();
  });
});
