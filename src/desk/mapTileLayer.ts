import { type MapView, planTiles, type PlannedTile, type Size, tileHost, tileUrl, WORLD } from "./mapProjection";
import { TileFailures } from "./mapTiles";

export const SETTLE_MS = 150;

export interface TileConfig {
  enabled: boolean;
  template: string | null;
  attribution: string;
  maxZoom: number;
}

export interface TileEnv {
  set(callback: () => void, ms: number): number;
  clear(id: number): void;
  now(): number;
}

export interface TileHost {
  status(failed: boolean): void;
}

const keyOf = (tile: { z: number; x: number; y: number }): string => `${tile.z}/${tile.x}/${tile.y}`;

export class TileLayer {
  private readonly tiles = new Map<string, HTMLImageElement>();
  private readonly failures: TileFailures;
  private timer: number | null = null;
  private view: MapView = { x: 0, y: 0, k: 1 };
  private size: Size = { width: 0, height: 0 };
  private config: TileConfig = { enabled: false, template: null, attribution: "", maxZoom: 18 };
  private failed = false;

  constructor(
    private readonly layer: HTMLElement,
    private readonly credit: HTMLElement,
    private readonly host: TileHost,
    private readonly env: TileEnv,
  ) {
    this.failures = new TileFailures(() => env.now());
  }

  count(): number {
    return this.tiles.size;
  }

  update(view: MapView, size: Size, config: TileConfig): void {
    this.view = view;
    this.size = size;
    this.config = config;
    const template = config.enabled ? config.template : null;
    if (template === null) {
      this.removeAll();
      return;
    }
    this.credit.toggle(true);
    this.credit.setText(config.attribution.trim() || tileHost(template));
    for (const [key, img] of this.tiles) {
      const [z = 0, x = 0, y = 0] = key.split("/").map(Number);
      this.place(img, { z, x, y, ...this.rectOf(z, x, y) });
    }
    if (this.timer !== null) {
      this.env.clear(this.timer);
    }
    this.timer = this.env.set(() => this.settle(), SETTLE_MS);
  }

  private rectOf(z: number, x: number, y: number): { left: number; top: number; size: number } {
    const cell = (WORLD * this.view.k) / 2 ** z;
    return { left: this.view.x + x * cell, top: this.view.y + y * cell, size: cell + 0.5 };
  }

  private place(img: HTMLImageElement, tile: PlannedTile): void {
    img.setCssProps({ left: `${tile.left}px`, top: `${tile.top}px`, width: `${tile.size}px`, height: `${tile.size}px` });
  }

  private settle(): void {
    this.timer = null;
    const template = this.config.template;
    if (!this.config.enabled || template === null) {
      return;
    }
    const planned = planTiles(this.view, this.size, 1, this.config.maxZoom);
    const wanted = new Set(planned.map(keyOf));
    this.failures.keep(wanted);
    for (const [key, img] of this.tiles) {
      if (!wanted.has(key)) {
        this.drop(key, img);
      }
    }
    for (const tile of planned) {
      const key = keyOf(tile);
      const held = this.tiles.get(key);
      if (held === undefined) {
        this.request(key, tile, template);
      } else if (held.classList.contains("is-failed") && this.failures.retry(key)) {
        held.classList.remove("is-failed");
        held.setAttribute("src", tileUrl(template, tile));
      }
    }
  }

  private request(key: string, tile: PlannedTile, template: string): void {
    const img = this.layer.createEl("img", { cls: "gedcom-map-tile", attr: { alt: "", decoding: "async", referrerpolicy: "no-referrer" } });
    this.place(img, tile);
    img.addEventListener("load", () => {
      this.failures.loaded(key);
      this.report();
    });
    img.addEventListener("error", () => {
      img.classList.add("is-failed");
      this.failures.failed(key);
      this.report();
    });
    this.tiles.set(key, img);
    img.setAttribute("src", tileUrl(template, tile));
  }

  private drop(key: string, img: HTMLImageElement): void {
    img.removeAttribute("src");
    img.remove();
    this.tiles.delete(key);
  }

  private report(): void {
    const failed = this.failures.status();
    if (failed !== this.failed) {
      this.failed = failed;
      this.host.status(failed);
    }
  }

  private removeAll(): void {
    if (this.timer !== null) {
      this.env.clear(this.timer);
      this.timer = null;
    }
    for (const [key, img] of this.tiles) {
      this.drop(key, img);
    }
    this.credit.toggle(false);
    if (this.failed) {
      this.failed = false;
      this.host.status(false);
    }
  }
}
