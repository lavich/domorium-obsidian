import type { GenealogyIndex } from "../genealogy";
import { plural, t } from "../i18n";
import { BranchScopeBar, type BranchScope } from "./branchScope";
import type { IconSetter } from "./dom";
import { branchOf, type PlaceGroup } from "./fileMap";
import { personName } from "./labels";

export interface ScopeRowHost {
  setScope(change: Partial<BranchScope>): void;
  showPlaces(): void;
  setIcon: IconSetter;
}

export interface ScopeRowState {
  index: GenealogyIndex;
  scope: BranchScope;
  selected: string | null;
  mapped: readonly PlaceGroup[];
  unmapped: readonly PlaceGroup[];
}

export class MapScopeRow {
  readonly el: HTMLElement;
  private readonly bar: BranchScopeBar;
  private readonly branch: HTMLButtonElement;
  private readonly counts: HTMLElement;
  private readonly counter: HTMLButtonElement;
  private readonly status: HTMLElement;
  private selected: string | null = null;

  constructor(parent: HTMLElement, host: ScopeRowHost) {
    this.el = parent.createDiv({ cls: "gedcom-map-scope-row" });
    this.bar = new BranchScopeBar(this.el, { prefix: "gedcom-map", setIcon: host.setIcon, change: (change) => host.setScope(change) });
    this.branch = this.el.createEl("button", { cls: "gedcom-map-branch", attr: { type: "button" } });
    this.branch.addEventListener("click", () => {
      if (this.selected !== null) {
        host.setScope({ focus: this.selected });
      }
    });
    this.counts = this.el.createSpan({ cls: "gedcom-map-counts" });
    this.counter = this.el.createEl("button", { cls: "gedcom-map-counter", attr: { type: "button" } });
    this.counter.addEventListener("click", () => host.showPlaces());
    this.status = this.el.createSpan({ cls: "gedcom-map-status", attr: { "aria-live": "polite" } });
  }

  say(text: string): void {
    this.status.setText(text);
  }

  draw({ index, scope, selected, mapped, unmapped }: ScopeRowState): void {
    const focus = scope.focus === undefined ? undefined : index.person(scope.focus);
    this.bar.draw(scope, {
      total: index.people.length,
      shown: scope.focus === undefined ? 0 : branchOf(index, scope.focus, scope.up, scope.down).size,
      focusName: focus ? personName(focus) : null,
    });
    const person = selected === null ? undefined : index.person(selected);
    this.selected = person ? selected : null;
    this.branch.toggle(scope.focus === undefined);
    this.branch.setText(person ? t("map.branch", { name: personName(person) }) : t("overview.branch"));
    this.branch.disabled = person === undefined;
    const events = mapped.reduce((sum, group) => sum + group.events.length, 0);
    this.counts.setText(`${plural("map.places", mapped.length)} · ${plural("map.events", events)}`);
    this.counter.toggle(unmapped.length > 0);
    this.counter.setText(plural("map.noCoordinates", unmapped.length));
  }
}
