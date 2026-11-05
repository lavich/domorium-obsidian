import { plural, t } from "../i18n";
import { rowWindow } from "./listRows";

let panels = 0;

export const ROW_HEIGHT = 44;

export interface PanelRow {
  key: string;
  name: string;
  events: number;
  years: string;
  mapped: boolean;
}

export interface PanelState {
  mapped: readonly PanelRow[];
  unmapped: readonly PanelRow[];
  table: "create" | "open";
  missing: number;
}

export interface PlacesPanelHost {
  activate(key: string): void;
  tableAction(): void;
  addMissing(): void;
  closed(): void;
}

type Item = { kind: "head"; text: string } | { kind: "row"; row: PanelRow };

export class PlacesPanel {
  readonly el: HTMLElement;
  private readonly list: HTMLElement;
  private readonly spacer: HTMLElement;
  private readonly foot: HTMLElement;
  private items: Item[] = [];
  private state: PanelState = { mapped: [], unmapped: [], table: "create", missing: 0 };
  private drawn: { first: number; last: number } | null = null;

  constructor(parent: HTMLElement, private readonly host: PlacesPanelHost) {
    this.el = parent.createDiv({ cls: "gedcom-map-panel", attr: { role: "region" } });
    this.el.toggle(false);
    const head = this.el.createDiv({ cls: "gedcom-map-panel-head" });
    const title = head.createSpan({ cls: "gedcom-map-panel-title", text: t("map.panel.title") });
    title.id = `gedcom-map-panel-title-${(panels += 1)}`;
    this.el.setAttribute("aria-labelledby", title.id);
    head.createEl("button", { cls: "clickable-icon gedcom-map-panel-close", text: "×", attr: { type: "button", "aria-label": t("map.panel.close") } }).addEventListener("click", () => this.close());
    this.list = this.el.createDiv({ cls: "gedcom-map-panel-list" });
    this.spacer = this.list.createDiv({ cls: "gedcom-map-panel-spacer" });
    this.foot = this.el.createDiv({ cls: "gedcom-map-panel-foot" });
    this.list.addEventListener("scroll", () => this.draw());
    this.el.addEventListener("keydown", (event) => this.key(event));
  }

  isOpen(): boolean {
    return this.el.style.display !== "none";
  }

  open(): void {
    this.el.toggle(true);
    this.draw();
  }

  close(): void {
    if (this.isOpen()) {
      this.el.toggle(false);
      this.host.closed();
    }
  }

  show(state: PanelState): void {
    this.state = state;
    this.drawn = null;
    this.items = [
      { kind: "head", text: `${t("map.panel.onMap")} · ${state.mapped.length}` },
      ...state.mapped.map((row): Item => ({ kind: "row", row })),
      ...(state.unmapped.length === 0 ? [] : [{ kind: "head", text: `${t("map.panel.noCoordinates")} · ${state.unmapped.length}` } as Item]),
      ...state.unmapped.map((row): Item => ({ kind: "row", row })),
    ];
    this.drawFoot();
    if (this.isOpen()) {
      this.draw();
    }
  }

  scrollToUnmapped(): void {
    const at = this.items.findIndex((item) => item.kind === "head" && item.text.startsWith(t("map.panel.noCoordinates")));
    this.list.scrollTop = Math.max(0, at) * ROW_HEIGHT;
    this.draw();
  }

  rows(): number {
    return this.spacer.children.length;
  }

  private draw(): void {
    this.spacer.setCssProps({ height: `${this.items.length * ROW_HEIGHT}px` });
    const { first, last } = rowWindow(this.list.scrollTop, this.list.clientHeight, ROW_HEIGHT, this.items.length);
    if (this.drawn?.first === first && this.drawn.last === last) {
      return;
    }
    this.drawn = { first, last };
    const active = this.el.ownerDocument.activeElement;
    const held = active !== null && this.spacer.contains(active) ? active.getAttribute("data-key") : null;
    this.spacer.empty();
    for (let at = first; at <= last; at += 1) {
      const item = this.items[at];
      if (item === undefined) {
        continue;
      }
      const placed = { top: `${at * ROW_HEIGHT}px` };
      if (item.kind === "head") {
        this.spacer.createDiv({ cls: "gedcom-map-panel-group", text: item.text }).setCssProps(placed);
        continue;
      }
      const { row } = item;
      const node = this.spacer.createEl(row.mapped ? "button" : "div", { cls: "gedcom-map-panel-row", attr: row.mapped ? { type: "button", "data-key": row.key } : {} });
      node.setCssProps(placed);
      node.createSpan({ cls: "gedcom-map-panel-name", text: row.name });
      node.createSpan({ cls: "gedcom-map-panel-meta", text: [plural("map.events", row.events), row.years].filter((one) => one !== "").join(" · ") });
      if (row.mapped) {
        node.addEventListener("click", () => this.host.activate(row.key));
      }
    }
    if (held !== null) {
      this.spacer.querySelector<HTMLElement>(`[data-key="${CSS.escape(held)}"]`)?.focus({ preventScroll: true });
    }
  }

  private drawFoot(): void {
    this.foot.empty();
    const table = this.foot.createEl("button", { cls: "gedcom-map-panel-action", text: t(this.state.table === "open" ? "map.empty.open" : "map.empty.create"), attr: { type: "button" } });
    table.addEventListener("click", () => this.host.tableAction());
    if (this.state.missing > 0) {
      const add = this.foot.createEl("button", { cls: "gedcom-map-panel-action", text: plural("map.panel.addMissing", this.state.missing), attr: { type: "button" } });
      add.addEventListener("click", () => this.host.addMissing());
    }
  }

  private key(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      this.close();
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
      return;
    }
    const buttons = Array.from(this.spacer.querySelectorAll<HTMLButtonElement>("button"));
    const at = buttons.indexOf(this.el.ownerDocument.activeElement as HTMLButtonElement);
    if (at >= 0) {
      event.preventDefault();
      buttons[Math.max(0, Math.min(buttons.length - 1, at + (event.key === "ArrowDown" ? 1 : -1)))]?.focus({ preventScroll: true });
    }
  }
}
