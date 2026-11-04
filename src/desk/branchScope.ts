import { plural, t } from "../i18n";
import { BRANCH_STEPS } from "./fileTimeline";

export interface BranchScope {
  focus?: string;
  up: number;
  down: number;
}

export const clampTo = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, Math.round(value)))
    : fallback;

export function readBranchScope(state: unknown): BranchScope {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  const steps = (value: unknown) => clampTo(value, BRANCH_STEPS.min, BRANCH_STEPS.max, BRANCH_STEPS.initial);
  return {
    ...(typeof raw.focus === "string" && raw.focus ? { focus: raw.focus } : {}),
    up: steps(raw.up),
    down: steps(raw.down),
  };
}

export function sameBranch(a: BranchScope, b: BranchScope): boolean {
  return a.focus === b.focus && a.up === b.up && a.down === b.down;
}

export interface BranchScopeBarOptions {
  /** `gedcom-ft` gives `gedcom-ft-scope`, `gedcom-ft-step`, `gedcom-ft-whole`. */
  prefix: string;
  setIcon(element: HTMLElement, icon: string): void;
  change(next: Partial<BranchScope>): void;
}

export interface BranchScopeCounts {
  total: number;
  shown: number;
  /** Null where the whole file is shown. */
  focusName: string | null;
}

export class BranchScopeBar {
  readonly el: HTMLElement;
  private scope: BranchScope | null = null;

  constructor(
    parent: HTMLElement,
    private readonly options: BranchScopeBarOptions,
  ) {
    this.el = parent.createDiv({ cls: `${options.prefix}-scope` });
    this.el.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const step = target?.closest("[data-step]")?.getAttribute("data-step");
      if (step) {
        const [key, by] = step.split(":");
        const current = this.scope;
        if ((key === "up" || key === "down") && current) {
          const next = current[key] + Number(by);
          this.options.change({ [key]: Math.max(BRANCH_STEPS.min, Math.min(BRANCH_STEPS.max, next)) });
        }
        return;
      }
      if (target?.closest("[data-whole]")) {
        this.options.change({ focus: undefined });
      }
    });
  }

  draw(scope: BranchScope, counts: BranchScopeCounts): void {
    this.scope = scope;
    const active = this.el.ownerDocument.activeElement;
    const step = active && this.el.contains(active) ? active.getAttribute("data-step") : null;
    this.el.empty();
    this.drawParts(scope, counts);
    if (step) {
      const [key] = step.split(":");
      const again = [
        this.el.querySelector<HTMLElement>(`[data-step="${step}"]:not([disabled])`),
        this.el.querySelector<HTMLElement>(`[data-step^="${key}:"]:not([disabled])`),
      ].find((one) => one !== null);
      again?.focus({ preventScroll: true });
    }
  }

  private drawParts(scope: BranchScope, counts: BranchScopeCounts): void {
    const { prefix } = this.options;
    this.el.toggle(counts.focusName !== null);
    if (counts.focusName === null) {
      return;
    }
    this.el.createSpan({
      text: plural("overview.branchOf", counts.total, { name: counts.focusName, shown: counts.shown }),
    });
    const stepper = (label: string, key: "up" | "down") => {
      this.el.createSpan({ cls: `${prefix}-step-label`, text: label });
      const step = this.el.createSpan({ cls: `${prefix}-step` });
      const button = (icon: string, aria: string, by: number) => {
        const node = step.createEl("button", {
          cls: `${prefix}-step-button`,
          attr: { type: "button", "aria-label": aria, "data-step": `${key}:${by}` },
        });
        this.options.setIcon(node, icon);
        const next = scope[key] + by;
        if (next < BRANCH_STEPS.min || next > BRANCH_STEPS.max) {
          node.setAttribute("disabled", "");
        }
      };
      button("minus", t(key === "up" ? "overview.fewerAncestors" : "overview.fewerDescendants"), -1);
      step.createSpan({ cls: `${prefix}-step-value`, text: String(scope[key]) });
      button("plus", t(key === "up" ? "overview.moreAncestors" : "overview.moreDescendants"), 1);
    };
    stepper(t("overview.ancestors"), "up");
    stepper(t("overview.descendants"), "down");
    this.el.createEl("button", {
      cls: `${prefix}-whole`,
      text: t("overview.wholeFile"),
      attr: { type: "button", "data-whole": "" },
    });
  }
}
