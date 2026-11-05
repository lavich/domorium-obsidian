import { t } from "../i18n";
import { nameBy, placeInside } from "./dom";
import type { MapEvent } from "./fileMap";
import { eventName, yearText } from "./labels";

export interface PopupRow {
  record: string;
  name: string;
  year: string;
  kind: string;
}

export interface PopupGroup {
  place?: string;
  rows: PopupRow[];
}

export interface PlacePopupHost {
  select(xref: string): void;
  closed(): void;
}

export function popupRows(events: readonly MapEvent[], nameOf: (record: string) => string): PopupRow[] {
  return [...events]
    .sort((a, b) => (a.year ?? Infinity) - (b.year ?? Infinity) || a.order - b.order)
    .map((event) => ({
      record: event.record,
      name: nameOf(event.record),
      year: event.year === undefined ? "" : yearText(event.year),
      kind: eventName(event),
    }));
}

export class PlacePopup {
  readonly el: HTMLElement;
  private opener: HTMLElement | null = null;

  constructor(
    private readonly root: HTMLElement,
    private readonly host: PlacePopupHost,
  ) {
    this.el = root.createDiv({ cls: "gedcom-map-popup", attr: { role: "group" } });
    this.el.toggle(false);
    this.el.addEventListener("keydown", (event) => this.key(event));
  }

  isOpen(): boolean {
    return this.el.style.display !== "none";
  }

  open(title: string, groups: readonly PopupGroup[], at: { clientX: number; clientY: number }, opener?: HTMLElement): void {
    this.opener = opener ?? null;
    this.el.empty();
    nameBy(this.el, this.el, t("map.popup.label", { name: title }));
    this.el.toggle(true);
    const list = this.el.createEl("ul", { cls: "gedcom-map-popup-list" });
    for (const group of groups) {
      if (group.place !== undefined) {
        list.createEl("li", { cls: "gedcom-map-popup-place", text: group.place });
      }
      for (const row of group.rows) {
        const item = list.createEl("li");
        const button = item.createEl("button", { cls: "gedcom-map-popup-row", attr: { type: "button" } });
        button.createSpan({ cls: "gedcom-map-popup-name", text: row.name });
        button.createSpan({ cls: "gedcom-map-popup-year", text: row.year });
        button.createSpan({ cls: "gedcom-map-popup-kind", text: row.kind });
        button.addEventListener("click", () => {
          this.close(false);
          this.host.select(row.record);
        });
      }
    }
    placeInside(this.root, this.el, at);
    this.buttons()[0]?.focus({ preventScroll: true });
  }

  close(giveFocusBack = true): void {
    if (!this.isOpen()) {
      return;
    }
    this.el.toggle(false);
    this.el.empty();
    if (giveFocusBack) {
      this.opener?.focus({ preventScroll: true });
    }
    this.host.closed();
  }

  private buttons(): HTMLButtonElement[] {
    return Array.from(this.el.querySelectorAll<HTMLButtonElement>("button"));
  }

  private key(event: KeyboardEvent): void {
    const buttons = this.buttons();
    const at = buttons.indexOf(this.el.ownerDocument.activeElement as HTMLButtonElement);
    const to: Record<string, number> = {
      ArrowDown: Math.min(buttons.length - 1, at + 1),
      ArrowUp: Math.max(0, at - 1),
      Home: 0,
      End: buttons.length - 1,
    };
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
    } else if (to[event.key] !== undefined) {
      event.preventDefault();
      buttons[to[event.key] ?? 0]?.focus({ preventScroll: true });
    }
  }
}
