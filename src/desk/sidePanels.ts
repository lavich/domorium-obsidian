import type { Origin } from "./deskState";

export interface PanelState {
  open: boolean;
  collapsed: boolean;
}

export type PanelStep = "none" | "open";

export interface SidePanelsInput {
  enabled: boolean;
  mobile: boolean;
  origin: Origin;
  index: PanelState;
  card: PanelState;
}

export interface SidePanelPlan {
  index: PanelStep;
  card: PanelStep;
}

export function opensSidePanels(origin: Origin): boolean {
  return origin === "view" || origin === "index" || origin === "link";
}

export function panelStep({ open, collapsed }: PanelState): PanelStep {
  return open && !collapsed ? "none" : "open";
}

export function sidePanelPlan({ enabled, mobile, origin, index, card }: SidePanelsInput): SidePanelPlan {
  if (!enabled || mobile || !opensSidePanels(origin)) {
    return { index: "none", card: "none" };
  }
  return { index: panelStep(index), card: panelStep(card) };
}
