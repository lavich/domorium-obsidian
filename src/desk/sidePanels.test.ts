import { describe, expect, it } from "vitest";

import type { Origin } from "./deskState";
import { opensCard, panelStep, sidePanelPlan, type PanelState } from "./sidePanels";

const SHUT: PanelState = { open: false, collapsed: true };
const SHOWN: PanelState = { open: true, collapsed: false };

function plan(over: Partial<Parameters<typeof sidePanelPlan>[0]> = {}) {
  return sidePanelPlan({ enabled: true, mobile: false, origin: "view", card: SHUT, ...over });
}

describe("opensCard", () => {
  it.each<[Origin, boolean]>([
    ["view", true],
    ["link", true],
    ["card", false],
    ["history", false],
    ["cursor", false],
  ])("%s opens the card: %s", (origin, opens) => {
    expect(opensCard(origin)).toBe(opens);
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
  it("opens the card with its sidebar collapsed and nothing open", () => {
    expect(plan()).toBe("open");
    expect(plan({ origin: "link" })).toBe("open");
  });

  it("leaves a card open in an expanded sidebar alone", () => {
    expect(plan({ card: SHOWN })).toBe("none");
  });

  it("opens again what the reader collapsed", () => {
    expect(plan({ card: { open: true, collapsed: true } })).toBe("open");
  });

  it("does nothing with the setting off", () => {
    expect(plan({ enabled: false })).toBe("none");
  });

  it("does nothing on a phone", () => {
    expect(plan({ mobile: true })).toBe("none");
  });

  it("does nothing for the cursor following in Source", () => {
    expect(plan({ origin: "cursor" })).toBe("none");
  });

  it("does nothing for Back in the card", () => {
    expect(plan({ origin: "history" })).toBe("none");
  });
});
