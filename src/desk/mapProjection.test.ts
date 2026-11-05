import { describe, expect, it } from "vitest";

import {
  boundsOfPoints,
  centreOf,
  clampView,
  CITY_ZOOM,
  fitView,
  glideAt,
  glides,
  limitsFor,
  MAX_LATITUDE,
  planTiles,
  project,
  readMapView,
  saveView,
  tileTemplate,
  tileUrl,
  toScreen,
  unproject,
  viewOf,
  WORLD,
} from "./mapProjection";

const size = { width: 1400, height: 900 };

describe("the projection", () => {
  it("puts (0, 0) at the centre of the world and 85.05113 N at its top", () => {
    expect(project(0, 0)).toEqual([0.5, 0.5]);
    expect(project(MAX_LATITUDE, 0)[1]).toBeCloseTo(0, 6);
  });

  it("round-trips a point", () => {
    const { lat, lon } = unproject(...project(52.2297, 21.0122));

    expect(lat).toBeCloseTo(52.2297, 9);
    expect(lon).toBeCloseTo(21.0122, 9);
  });

  it("clamps a latitude of 89", () => {
    expect(project(89, 0)).toEqual(project(MAX_LATITUDE, 0));
  });

  it("agrees between the world and the screen", () => {
    const view = { x: 10, y: 20, k: 2 };

    expect(toScreen(view, 0, 0)).toEqual([10 + WORLD, 20 + WORLD]);
  });
});

describe("the view", () => {
  it("fits the world at the minimum and asks more of a larger tab", () => {
    expect(limitsFor(size, false).min).toBeCloseTo(900 / WORLD, 6);
    expect(limitsFor({ width: 1400, height: 1400 }, false).min).toBeGreaterThan(limitsFor(size, false).min);
  });

  it("allows a deeper zoom with tiles", () => {
    expect(limitsFor(size, true).max).toBeGreaterThan(limitsFor(size, false).max);
  });

  it("never lets the centre leave the world", () => {
    const limits = limitsFor(size, false);
    const moved = clampView({ x: 99999, y: -99999, k: 8 }, size, limits);

    expect(moved.x).toBeLessThanOrEqual(size.width);
    expect(moved.y + WORLD * 8).toBeGreaterThan(0);
  });

  it("centres a world smaller than the tab", () => {
    const view = clampView({ x: 0, y: 0, k: limitsFor(size, false).min }, size, limitsFor(size, false));

    expect(view.x).toBeGreaterThan(0);
  });

  it("holds one point at the city zoom", () => {
    const view = fitView(boundsOfPoints([{ lat: 48.8566, lon: 2.3522 }]), size, 60);

    expect(Math.log2(view.k)).toBeCloseTo(CITY_ZOOM, 6);
    expect(centreOf(view, size).lat).toBeCloseTo(48.8566, 6);
  });

  it("holds two points with the padding", () => {
    const view = fitView(
      boundsOfPoints([
        { lat: 52.2297, lon: 21.0122 },
        { lat: 48.8566, lon: 2.3522 },
      ]),
      size,
      60,
    );
    const [x1, y1] = toScreen(view, 52.2297, 21.0122);
    const [x2, y2] = toScreen(view, 48.8566, 2.3522);

    for (const [x, y] of [[x1, y1], [x2, y2]] as const) {
      expect(x).toBeGreaterThanOrEqual(59);
      expect(x).toBeLessThanOrEqual(size.width - 59);
      expect(y).toBeGreaterThanOrEqual(59);
      expect(y).toBeLessThanOrEqual(size.height - 59);
    }
  });

  it("shows the whole world for no places", () => {
    expect(fitView(null, size, 60).k).toBeCloseTo(limitsFor(size, false).min, 6);
  });

  it("saves the centre and zoom rounded and restores the same view", () => {
    const view = viewOf({ lat: 48.85661, lon: 2.35222, zoom: 7.123456 }, size);
    const saved = saveView(view, size);

    expect(saved).toEqual({ lat: 48.8566, lon: 2.3522, zoom: 7.12 });
    expect(centreOf(viewOf(saved, size), size).lat).toBeCloseTo(48.8566, 3);
  });
});

describe("reading a saved view", () => {
  it("drops text, NaN and a pixel transform", () => {
    expect(readMapView("x")).toBeUndefined();
    expect(readMapView({ lat: NaN, lon: 0, zoom: 1 })).toBeUndefined();
    expect(readMapView({ x: 1, y: 2, k: 3 })).toBeUndefined();
    expect(readMapView(null)).toBeUndefined();
  });

  it("clamps a zoom of 40", () => {
    expect(readMapView({ lat: 0, lon: 0, zoom: 40 })?.zoom).toBe(18);
  });
});

describe("the glide", () => {
  const from = viewOf({ lat: 0, lon: 0, zoom: 2 }, size);
  const to = viewOf({ lat: 40, lon: 30, zoom: 5 }, size);

  it("starts at the one and ends at the other, never going backwards in zoom", () => {
    expect(glideAt(from, to, size, 0).k).toBeCloseTo(from.k, 9);
    expect(glideAt(from, to, size, 1).k).toBeCloseTo(to.k, 9);
    let last = 0;
    for (let t = 0; t <= 1; t += 0.1) {
      const k = glideAt(from, to, size, t).k;
      expect(k).toBeGreaterThanOrEqual(last);
      last = k;
    }
  });

  it("glides a short move and jumps one of three screens", () => {
    expect(glides(from, viewOf({ lat: 5, lon: 5, zoom: 2 }, size), size)).toBe(true);
    expect(glides(viewOf({ lat: 0, lon: -170, zoom: 5 }, size), viewOf({ lat: 0, lon: 170, zoom: 5 }, size), size)).toBe(false);
  });
});

describe("the tile address", () => {
  it.each([
    ["http://tiles.example/{z}/{x}/{y}.png"],
    [""],
    ["https://tiles.example/{z}/{x}.png"],
    ["https://{s}.tiles.example/{z}/{x}/{y}.png"],
    ["tiles.example/{z}/{x}/{y}"],
    ["https:///{z}/{x}/{y}"],
  ])("refuses %j", (address) => {
    expect(tileTemplate(address)).toBeNull();
  });

  it("accepts an https template with surrounding spaces", () => {
    expect(tileTemplate("  https://tiles.example/{z}/{x}/{y}.png ")).toBe("https://tiles.example/{z}/{x}/{y}.png");
  });

  it("puts the numbers in", () => {
    expect(tileUrl("https://t.example/{z}/{x}/{y}.png", { z: 5, x: 17, y: 9 })).toBe("https://t.example/5/17/9.png");
  });
});

describe("planning the tiles", () => {
  it("covers a view and a ring at integer zoom with a bounded number of tiles", () => {
    const view = viewOf({ lat: 50, lon: 10, zoom: 5 }, size);
    const planned = planTiles(view, size, 1, 18);

    expect(planned.length).toBeGreaterThan(20);
    expect(planned.length).toBeLessThan(120);
    expect(new Set(planned.map((tile) => tile.z))).toEqual(new Set([5]));
  });

  it("stays under 120 at a half level", () => {
    expect(planTiles(viewOf({ lat: 50, lon: 10, zoom: 5.5 }, size), size, 1, 18).length).toBeLessThan(120);
  });

  it("never asks for a row outside the world", () => {
    const planned = planTiles(viewOf({ lat: 80, lon: 0, zoom: 3 }, size), size, 1, 18);

    expect(planned.every((tile) => tile.y >= 0 && tile.y <= 2 ** tile.z - 1)).toBe(true);
  });

  it("draws each tile half a pixel larger than its cell", () => {
    const view = viewOf({ lat: 0, lon: 0, zoom: 3 }, size);
    const [first] = planTiles(view, size, 0, 18);

    expect(first?.size).toBeCloseTo((WORLD * view.k) / 8 + 0.5, 6);
  });

  it("plans nothing for a tab of no size", () => {
    expect(planTiles({ x: 0, y: 0, k: 1 }, { width: 0, height: 0 }, 1, 18)).toEqual([]);
  });
});
