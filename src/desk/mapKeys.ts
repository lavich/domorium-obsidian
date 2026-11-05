import { plural, t } from "../i18n";
import { yearText } from "./labels";

export interface KeyActions {
  step(by: 1 | -1): void;
  edge(which: "first" | "last"): void;
  activate(): void;
  zoom(direction: 1 | -1): void;
  fit(): void;
  closePopup(): boolean;
}

export function handleKey(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "altKey">, actions: KeyActions): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false;
  }
  switch (event.key) {
    case "ArrowRight":
    case "ArrowDown":
      actions.step(1);
      return true;
    case "ArrowLeft":
    case "ArrowUp":
      actions.step(-1);
      return true;
    case "Home":
      actions.edge("first");
      return true;
    case "End":
      actions.edge("last");
      return true;
    case "Enter":
    case " ":
      actions.activate();
      return true;
    case "+":
    case "=":
      actions.zoom(1);
      return true;
    case "-":
    case "_":
      actions.zoom(-1);
      return true;
    case "0":
      actions.fit();
      return true;
    case "Escape":
      return actions.closePopup();
    default:
      return false;
  }
}

export function placeAnnouncement(name: string, events: number, years: { from: number; to: number } | null): string {
  const span =
    years === null ? "" : years.from === years.to ? yearText(years.from) : t("map.years.span", { from: yearText(years.from), to: yearText(years.to) });
  return t("map.place.accessible", { name, events: plural("map.events", events), years: span }).replace(/,\s*$/u, "");
}

export class LiveRegion {
  readonly el: HTMLElement;

  constructor(parent: HTMLElement) {
    this.el = parent.createDiv({ cls: "gedcom-visually-hidden gedcom-map-live", attr: { "aria-live": "polite", role: "status" } });
  }

  say(text: string): void {
    this.el.setText(text);
  }
}
