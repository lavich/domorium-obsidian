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
  card: PanelState;
}

export function opensCard(origin: Origin): boolean {
  return origin === "view" || origin === "link";
}

export function panelStep({ open, collapsed }: PanelState): PanelStep {
  return open && !collapsed ? "none" : "open";
}

export function sidePanelPlan({ enabled, mobile, origin, card }: SidePanelsInput): PanelStep {
  if (!enabled || mobile || !opensCard(origin)) {
    return "none";
  }
  return panelStep(card);
}
