import { describe, expect, it } from "vitest";

import type { Origin } from "./deskState";
import { opensSidePanels, panelStep, sidePanelPlan, type PanelState } from "./sidePanels";

const SHUT: PanelState = { open: false, collapsed: true };
const SHOWN: PanelState = { open: true, collapsed: false };

function plan(over: Partial<Parameters<typeof sidePanelPlan>[0]> = {}) {
  return sidePanelPlan({ enabled: true, mobile: false, origin: "view", index: SHUT, card: SHUT, ...over });
}

describe("opensSidePanels", () => {
  it.each<[Origin, boolean]>([
    ["view", true],
    ["index", true],
    ["link", true],
    ["card", false],
    ["history", false],
    ["cursor", false],
  ])("%s opens the panels: %s", (origin, opens) => {
    expect(opensSidePanels(origin)).toBe(opens);
  });
});

describe("panelStep", () => {
  it("leaves an open panel in an expanded sidebar alone", () => {
    expect(panelStep(SHOWN)).toBe("none");
  });

  it("opens a panel in a collapsed sidebar", () => {
    expect(panelStep({ open: true, collapsed: true })).toBe("open");
  });

  it("opens a panel that is missing, also in an expanded sidebar", () => {
    expect(panelStep({ open: false, collapsed: false })).toBe("open");
  });
});

describe("sidePanelPlan", () => {
  it("opens both panels with both sidebars collapsed and nothing open", () => {
    expect(plan()).toEqual({ index: "open", card: "open" });
  });

  it("opens only the index when the card is already visible", () => {
    expect(plan({ card: SHOWN })).toEqual({ index: "open", card: "none" });
  });

  it("does nothing when both panels are visible", () => {
    expect(plan({ index: SHOWN, card: SHOWN })).toEqual({ index: "none", card: "none" });
  });

  it("opens again what the reader collapsed", () => {
    expect(plan({ index: SHOWN, card: { open: true, collapsed: true } })).toEqual({ index: "none", card: "open" });
  });

  it("does nothing with the setting off", () => {
    expect(plan({ enabled: false })).toEqual({ index: "none", card: "none" });
  });

  it("does nothing on a phone", () => {
    expect(plan({ mobile: true })).toEqual({ index: "none", card: "none" });
  });

  it("does nothing for the cursor following in Source", () => {
    expect(plan({ origin: "cursor" })).toEqual({ index: "none", card: "none" });
  });

  it("does nothing for Back in the card", () => {
    expect(plan({ origin: "history" })).toEqual({ index: "none", card: "none" });
  });
});
