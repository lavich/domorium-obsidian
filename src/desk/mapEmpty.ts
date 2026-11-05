import { t } from "../i18n";

export type EmptyState =
  | { show: false }
  | { show: true; cause: "none" | "no-places"; button: "create" | "open" | null };

export function emptyStateOf(args: { read: boolean; places: number; mapped: number; tableExists: boolean }): EmptyState {
  if (!args.read || args.mapped > 0) {
    return { show: false };
  }
  if (args.places === 0) {
    return { show: true, cause: "no-places", button: null };
  }
  return { show: true, cause: "none", button: args.tableExists ? "open" : "create" };
}

export class MapEmpty {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement, private readonly act: () => void) {
    this.el = parent.createDiv({ cls: "gedcom-map-empty" });
    this.el.toggle(false);
  }

  show(state: EmptyState): void {
    this.el.empty();
    this.el.toggle(state.show);
    if (!state.show) {
      return;
    }
    this.el.createEl("h3", { text: t("map.empty.title") });
    this.el.createEl("p", { text: t(state.cause === "none" ? "map.empty.noMap" : "map.empty.noPlaces") });
    if (state.button !== null) {
      const button = this.el.createEl("button", { cls: "mod-cta", text: t(state.button === "open" ? "map.empty.open" : "map.empty.create"), attr: { type: "button" } });
      button.addEventListener("click", () => this.act());
    }
  }
}
