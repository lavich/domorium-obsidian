import { plural, t } from "../i18n";

export interface BranchScope {
  focus?: string;
}

export function readBranchScope(state: unknown): BranchScope {
  const raw = typeof state === "object" && state !== null ? (state as Record<string, unknown>) : {};
  return typeof raw.focus === "string" && raw.focus ? { focus: raw.focus } : {};
}

export function sameBranch(a: BranchScope, b: BranchScope): boolean {
  return a.focus === b.focus;
}

export interface BranchScopeBarOptions {
  /** `gedcom-ft` gives `gedcom-ft-scope`, `gedcom-ft-whole`. */
  prefix: string;
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

  constructor(
    parent: HTMLElement,
    private readonly options: BranchScopeBarOptions,
  ) {
    this.el = parent.createDiv({ cls: `${options.prefix}-scope` });
    this.el.addEventListener("click", (event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest("[data-whole]")) {
        this.options.change({ focus: undefined });
      }
    });
  }

  draw(counts: BranchScopeCounts): void {
    this.el.empty();
    this.drawParts(counts);
  }

  private drawParts(counts: BranchScopeCounts): void {
    const { prefix } = this.options;
    this.el.toggle(counts.focusName !== null);
    if (counts.focusName === null) {
      return;
    }
    this.el.createSpan({
      text: plural("overview.branchOf", counts.total, { name: counts.focusName, shown: counts.shown }),
    });
    this.el.createEl("button", {
      cls: `${prefix}-whole`,
      text: t("overview.wholeFile"),
      attr: { type: "button", "data-whole": "" },
    });
  }
}
