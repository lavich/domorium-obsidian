import { t } from "../i18n";
import { chipText, clampRange, type Handle, readout, stepHandle, valueText, type YearRange } from "./yearRange";

export interface YearChipHost {
  changed(range: YearRange | null): void;
}

export interface FrameEnv {
  frame(callback: () => void): number;
  cancel(id: number): void;
}

const HANDLES: Handle[] = ["from", "to"];

export class YearChip {
  readonly el: HTMLElement;
  private readonly chip: HTMLButtonElement;
  private readonly panel: HTMLElement;
  private readonly readoutEl: HTMLElement;
  private readonly track: HTMLElement;
  private readonly sliders: Record<Handle, HTMLElement>;
  private bounds: YearRange | null = null;
  private current: YearRange | null = null;
  private expanded = false;
  private frameId: number | null = null;

  constructor(
    parent: HTMLElement,
    private readonly host: YearChipHost,
    private readonly env: FrameEnv = {
      frame: (callback) => window.requestAnimationFrame(callback),
      cancel: (id) => window.cancelAnimationFrame(id),
    },
  ) {
    this.el = parent.createDiv({ cls: "gedcom-map-years" });
    this.chip = this.el.createEl("button", { cls: "gedcom-map-years-chip", attr: { type: "button", "aria-expanded": "false" } });
    this.panel = this.el.createDiv({ cls: "gedcom-map-years-panel" });
    this.readoutEl = this.panel.createSpan({ cls: "gedcom-map-years-readout" });
    this.track = this.panel.createDiv({ cls: "gedcom-map-years-track" });
    this.sliders = {
      from: this.slider("from", t("map.years.from")),
      to: this.slider("to", t("map.years.to")),
    };
    const clear = this.panel.createEl("button", { cls: "clickable-icon gedcom-map-years-clear", text: "×", attr: { type: "button", "aria-label": t("map.years.clear") } });
    clear.addEventListener("click", () => {
      this.current = null;
      this.expanded = false;
      this.draw();
      this.host.changed(null);
      this.chip.focus({ preventScroll: true });
    });
    this.chip.addEventListener("click", () => {
      this.expanded = !this.expanded;
      this.draw();
      if (this.expanded) {
        this.sliders.from.focus({ preventScroll: true });
      }
    });
    this.draw();
  }

  range(): YearRange | null {
    return this.current;
  }

  isExpanded(): boolean {
    return this.expanded;
  }

  setBounds(bounds: YearRange | null): void {
    this.bounds = bounds;
    const kept = clampRange(this.current, bounds);
    const moved = JSON.stringify(kept) !== JSON.stringify(this.current);
    this.current = kept;
    if (bounds === null) {
      this.expanded = false;
    }
    this.draw();
    if (moved) {
      this.host.changed(kept);
    }
  }

  setRange(range: YearRange | null): void {
    this.current = clampRange(range, this.bounds);
    this.draw();
  }

  private slider(handle: Handle, name: string): HTMLElement {
    const node = this.track.createDiv({ cls: `gedcom-map-years-handle is-${handle}`, attr: { role: "slider", tabindex: "0", "aria-label": name } });
    node.addEventListener("keydown", (event) => {
      const bounds = this.bounds;
      if (bounds === null) {
        return;
      }
      const next = stepHandle(this.current ?? bounds, handle, event.key, bounds);
      if (JSON.stringify(next) !== JSON.stringify(this.current ?? bounds) || event.key.startsWith("Arrow") || event.key.startsWith("Page") || event.key === "Home" || event.key === "End") {
        event.preventDefault();
        this.current = next;
        this.draw();
        this.host.changed(next);
      }
    });
    node.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        // A synthetic pointer cannot be captured.
      }
      const move = (at: PointerEvent): void => this.drag(handle, at.clientX);
      const done = (): void => {
        node.removeEventListener("pointermove", move);
        node.removeEventListener("pointerup", done);
        node.removeEventListener("pointercancel", done);
      };
      node.addEventListener("pointermove", move);
      node.addEventListener("pointerup", done);
      node.addEventListener("pointercancel", done);
    });
    return node;
  }

  private drag(handle: Handle, clientX: number): void {
    const bounds = this.bounds;
    const box = this.track.getBoundingClientRect();
    if (bounds === null || box.width <= 0) {
      return;
    }
    const ratio = Math.min(1, Math.max(0, (clientX - box.left) / box.width));
    const year = Math.round(bounds.from + ratio * (bounds.to - bounds.from));
    const base = this.current ?? bounds;
    this.current = clampRange(handle === "from" ? { from: Math.min(year, base.to), to: base.to } : { from: base.from, to: Math.max(year, base.from) }, bounds);
    this.draw();
    if (this.frameId === null) {
      this.frameId = this.env.frame(() => {
        this.frameId = null;
        this.host.changed(this.current);
      });
    }
  }

  private draw(): void {
    const bounds = this.bounds;
    this.el.toggle(bounds !== null);
    this.chip.setText(chipText(this.current));
    this.chip.setAttribute("aria-expanded", String(this.expanded));
    this.panel.toggle(this.expanded && bounds !== null);
    if (bounds === null) {
      return;
    }
    const shown = this.current ?? bounds;
    this.readoutEl.setText(readout(shown));
    const span = Math.max(1, bounds.to - bounds.from);
    for (const handle of HANDLES) {
      const node = this.sliders[handle];
      node.setAttribute("aria-valuemin", String(bounds.from));
      node.setAttribute("aria-valuemax", String(bounds.to));
      node.setAttribute("aria-valuenow", String(shown[handle]));
      node.setAttribute("aria-valuetext", valueText(shown[handle]));
      node.setCssProps({ "--pos": `${((shown[handle] - bounds.from) / span) * 100}%` });
    }
  }
}
