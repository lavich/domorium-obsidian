// @vitest-environment happy-dom
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { installObsidianDom } from "../testing/obsidianDom";
import { SETTLE_MS, type TileConfig, TileLayer } from "./mapTileLayer";
import { viewOf } from "./mapProjection";

beforeAll(installObsidianDom);

const size = { width: 1400, height: 900 };
const config: TileConfig = { enabled: true, template: "https://tiles.example/{z}/{x}/{y}.png", attribution: "", maxZoom: 18 };

let layer: TileLayer;
let root: HTMLElement;
let credit: HTMLElement;
let status: ReturnType<typeof vi.fn<(failed: boolean) => void>>;
let now = 0;

beforeEach(() => {
  vi.useFakeTimers();
  root = document.createElement("div");
  credit = document.createElement("div");
  document.body.replaceChildren(root, credit);
  status = vi.fn();
  now = 0;
  layer = new TileLayer(root, credit, { status }, { set: (callback, ms) => window.setTimeout(callback, ms), clear: (id) => window.clearTimeout(id), now: () => now });
});

afterEach(() => vi.useRealTimers());

const srcs = (): string[] => Array.from(root.querySelectorAll("img")).flatMap((img) => img.getAttribute("src") ?? []);
const view = (lat = 50, lon = 10, zoom = 5) => viewOf({ lat, lon, zoom }, size);

describe("the tile layer", () => {
  it("creates no image while there is no template or the toggle is off", () => {
    layer.update(view(), size, { ...config, template: null });
    vi.advanceTimersByTime(1000);
    layer.update(view(), size, { ...config, enabled: false });
    vi.advanceTimersByTime(1000);

    expect(root.querySelectorAll("img")).toHaveLength(0);
    expect(credit.style.display).toBe("none");
  });

  it("requests the planned tiles and nothing else, only once the view has settled", () => {
    layer.update(view(), size, config);
    expect(srcs()).toEqual([]);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(srcs().length).toBeGreaterThan(20);
    expect(srcs().length).toBeLessThan(120);
    expect(srcs().every((src) => /^https:\/\/tiles\.example\/5\/\d+\/\d+\.png$/u.test(src))).toBe(true);
    expect(root.querySelector("img")?.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(root.querySelector("img")?.getAttribute("alt")).toBe("");
  });

  it("makes no new request for a view that keeps changing within the settle time", () => {
    layer.update(view(), size, config);
    vi.advanceTimersByTime(SETTLE_MS);
    const before = srcs().length;
    for (let i = 0; i < 5; i += 1) {
      layer.update(view(50, 10 + i * 5), size, config);
      vi.advanceTimersByTime(SETTLE_MS - 50);
    }

    expect(srcs().length).toBe(before);
  });

  it("drops a tile that leaves the plan, clearing its src", () => {
    layer.update(view(), size, config);
    vi.advanceTimersByTime(SETTLE_MS);
    const first = root.querySelector("img");
    layer.update(view(-30, 150), size, config);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(first?.isConnected).toBe(false);
    expect(first?.getAttribute("src")).toBeNull();
  });

  it("says tiles could not be loaded after repeated failures and retries nothing within a minute", () => {
    layer.update(view(), size, config);
    vi.advanceTimersByTime(SETTLE_MS);
    for (const img of Array.from(root.querySelectorAll("img"))) {
      img.dispatchEvent(new Event("error"));
    }
    const before = srcs().length;
    layer.update(view(50.01), size, config);
    vi.advanceTimersByTime(SETTLE_MS);

    expect(status).toHaveBeenCalledWith(true);
    expect(root.querySelectorAll("img.is-failed")).toHaveLength(before);
    now = 61_000;
    layer.update(view(50.02), size, config);
    vi.advanceTimersByTime(SETTLE_MS);
    expect(root.querySelectorAll("img.is-failed")).toHaveLength(0);
  });

  it("clears the status on a success", () => {
    layer.update(view(), size, config);
    vi.advanceTimersByTime(SETTLE_MS);
    const imgs = Array.from(root.querySelectorAll("img"));
    for (const img of imgs.slice(0, 3)) {
      img.dispatchEvent(new Event("error"));
    }
    imgs[4]?.dispatchEvent(new Event("load"));

    expect(status).toHaveBeenLastCalledWith(false);
  });

  it("removes the layer when the toggle goes off", () => {
    layer.update(view(), size, config);
    vi.advanceTimersByTime(SETTLE_MS);
    layer.update(view(), size, { ...config, enabled: false });

    expect(layer.count()).toBe(0);
    expect(root.querySelectorAll("img")).toHaveLength(0);
  });

  it("shows the attribution as typed, else the host of the address", () => {
    layer.update(view(), size, { ...config, attribution: "© Example Maps" });
    expect(credit.textContent).toBe("© Example Maps");
    layer.update(view(), size, config);

    expect(credit.textContent).toBe("tiles.example");
  });
});
