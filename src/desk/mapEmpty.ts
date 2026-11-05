import { t } from "../i18n";

export type EmptyState = { show: false } | { show: true; cause: "none" | "no-places" };

export function emptyStateOf(args: { read: boolean; places: number; mapped: number }): EmptyState {
  if (!args.read || args.mapped > 0) {
    return { show: false };
  }
  return { show: true, cause: args.places === 0 ? "no-places" : "none" };
}

const EXAMPLE = ["2 PLAC Paris, France", "3 MAP", "4 LATI N48.8566", "4 LONG E2.3522"].join("\n");

export class MapEmpty {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement) {
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
    if (state.cause === "none") {
      this.el.createEl("pre", { cls: "gedcom-map-empty-example", text: EXAMPLE });
    }
  }
}
