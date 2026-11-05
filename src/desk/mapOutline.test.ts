import { describe, expect, it } from "vitest";

import manifest from "../../package.json";
import { encodeOutline } from "../../scripts/outline.mjs";
import { decodeOutline, outlinePath, type Ring } from "./mapOutline";
import { MAP_OUTLINE } from "./mapOutlineData";
import { WORLD } from "./mapProjection";

function inside(ring: Ring, lon: number, lat: number): boolean {
  let found = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i] ?? [0, 0];
    const [xj, yj] = ring[j] ?? [0, 0];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      found = !found;
    }
  }
  return found;
}

describe("the packed outline", () => {
  it("round-trips a ring to the quantum", () => {
    const ring: Ring = [[-10.02, 20.07], [30.5, -45.25], [179.95, 85], [-180, -85]];
    const [decoded] = decodeOutline(encodeOutline([ring]));

    decoded?.forEach(([lon, lat], at) => {
      expect(Math.abs(lon - (ring[at]?.[0] ?? 0))).toBeLessThanOrEqual(0.026);
      expect(Math.abs(lat - (ring[at]?.[1] ?? 0))).toBeLessThanOrEqual(0.026);
    });
    expect(decoded).toHaveLength(ring.length);
  });

  const rings = decodeOutline(MAP_OUTLINE);

  it("holds the land of the world", () => {
    expect(rings.length).toBeGreaterThan(100);
    expect(rings.flat().every(([lon, lat]) => Math.abs(lon) <= 180 && Math.abs(lat) <= 90)).toBe(true);
    const lons = rings.flat().map(([lon]) => lon);
    expect(Math.min(...lons)).toBeLessThan(-170);
    expect(Math.max(...lons)).toBeGreaterThan(170);
  });

  it("has land at Warsaw and none in the middle of the Atlantic", () => {
    expect(rings.some((ring) => inside(ring, 21.01, 52.23))).toBe(true);
    expect(rings.some((ring) => inside(ring, -30, 0))).toBe(false);
  });

  it("projects to a path with no NaN and nothing below the world", () => {
    const path = outlinePath(rings);

    expect(path).not.toContain("NaN");
    const ys = [...path.matchAll(/[ML]-?[\d.]+ (-?[\d.]+)/gu)].map((one) => Number(one[1]));
    expect(Math.max(...ys)).toBeLessThanOrEqual(WORLD + 0.01);
    expect(Math.min(...ys)).toBeGreaterThanOrEqual(-0.01);
  });

  it("stays under the budget of 300 000 characters and adds no map library", () => {
    expect(MAP_OUTLINE.length).toBeLessThan(300_000);
    expect(Object.keys(manifest.dependencies).filter((name) => /leaflet|maplibre|openlayers|mapbox/iu.test(name))).toEqual([]);
  });
});
