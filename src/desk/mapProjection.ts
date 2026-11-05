export const WORLD = 256;
export const MAX_LATITUDE = 85.05113;
export const CITY_ZOOM = 10;
export const MAX_ZOOM = 12;
export const MAX_TILE_ZOOM = 18;

const KEEP_IN_VIEW = 64;
const GLIDE_REACH_SCREENS = 2.5;

export interface Size {
  width: number;
  height: number;
}

export interface MapView {
  x: number;
  y: number;
  k: number;
}

export interface Centre {
  lat: number;
  lon: number;
  zoom: number;
}

export interface Bounds {
  south: number;
  north: number;
  west: number;
  east: number;
}

export interface Limits {
  min: number;
  max: number;
}

export interface TileKey {
  z: number;
  x: number;
  y: number;
}

export interface PlannedTile extends TileKey {
  left: number;
  top: number;
  size: number;
}

const clamp = (value: number, low: number, high: number): number => Math.min(high, Math.max(low, value));

export function project(lat: number, lon: number): [number, number] {
  const phi = (clamp(lat, -MAX_LATITUDE, MAX_LATITUDE) * Math.PI) / 180;
  return [(lon + 180) / 360, 0.5 - Math.log(Math.tan(Math.PI / 4 + phi / 2)) / (2 * Math.PI)];
}

export function unproject(x: number, y: number): { lat: number; lon: number } {
  return {
    lat: (Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180) / Math.PI,
    lon: x * 360 - 180,
  };
}

export function toScreen(view: MapView, lat: number, lon: number): [number, number] {
  const [wx, wy] = project(lat, lon);
  return [view.x + wx * WORLD * view.k, view.y + wy * WORLD * view.k];
}

export function viewOf(centre: Centre, size: Size): MapView {
  const k = 2 ** centre.zoom;
  const [wx, wy] = project(centre.lat, centre.lon);
  return { x: size.width / 2 - wx * WORLD * k, y: size.height / 2 - wy * WORLD * k, k };
}

export function centreOf(view: MapView, size: Size): Centre {
  const { lat, lon } = unproject(
    (size.width / 2 - view.x) / (WORLD * view.k),
    (size.height / 2 - view.y) / (WORLD * view.k),
  );
  return { lat, lon, zoom: Math.log2(view.k) };
}

export function limitsFor(size: Size, tiles: boolean): Limits {
  const fits = Math.min(size.width, size.height) / WORLD;
  const max = 2 ** (tiles ? MAX_TILE_ZOOM : MAX_ZOOM);
  return { min: Math.min(Math.max(fits, 1e-6), max), max };
}

function clampAxis(offset: number, world: number, screen: number): number {
  if (world <= screen) {
    return (screen - world) / 2;
  }
  const keep = Math.min(KEEP_IN_VIEW, screen);
  return clamp(offset, keep - world, screen - keep);
}

export function clampView(view: MapView, size: Size, limits: Limits): MapView {
  const k = clamp(view.k, limits.min, limits.max);
  const scaled = { x: view.x, y: view.y, k };
  const around = { x: size.width / 2, y: size.height / 2 };
  const ratio = k / view.k;
  scaled.x = around.x - (around.x - view.x) * ratio;
  scaled.y = around.y - (around.y - view.y) * ratio;
  return {
    x: clampAxis(scaled.x, WORLD * k, size.width),
    y: clampAxis(scaled.y, WORLD * k, size.height),
    k,
  };
}

export function boundsOfPoints(points: readonly { lat: number; lon: number }[]): Bounds | null {
  if (points.length === 0) {
    return null;
  }
  let [south, north, west, east] = [Infinity, -Infinity, Infinity, -Infinity];
  for (const point of points) {
    south = Math.min(south, point.lat);
    north = Math.max(north, point.lat);
    west = Math.min(west, point.lon);
    east = Math.max(east, point.lon);
  }
  return { south, north, west, east };
}

export function fitView(bounds: Bounds | null, size: Size, pad: number, maxZoom = CITY_ZOOM): MapView {
  if (bounds === null) {
    const k = limitsFor(size, false).min;
    return clampView({ x: 0, y: 0, k }, size, limitsFor(size, false));
  }
  const [west, top] = project(bounds.north, bounds.west);
  const [east, bottom] = project(bounds.south, bounds.east);
  const spanX = (east - west) * WORLD;
  const spanY = (bottom - top) * WORLD;
  const room = { x: Math.max(1, size.width - 2 * pad), y: Math.max(1, size.height - 2 * pad) };
  const fit = Math.min(spanX > 0 ? room.x / spanX : Infinity, spanY > 0 ? room.y / spanY : Infinity);
  const k = Math.min(fit, 2 ** maxZoom);
  const centre = { x: ((west + east) / 2) * WORLD * k, y: ((top + bottom) / 2) * WORLD * k };
  return { x: size.width / 2 - centre.x, y: size.height / 2 - centre.y, k };
}

export interface SavedView {
  lat: number;
  lon: number;
  zoom: number;
}

const rounded = (value: number, places: number): number => Math.round(value * 10 ** places) / 10 ** places;

export function saveView(view: MapView, size: Size): SavedView {
  const { lat, lon, zoom } = centreOf(view, size);
  return { lat: rounded(lat, 4), lon: rounded(lon, 4), zoom: rounded(zoom, 2) };
}

export function readMapView(value: unknown): SavedView | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }
  const { lat, lon, zoom } = value as Record<string, unknown>;
  if (![lat, lon, zoom].every((one) => typeof one === "number" && Number.isFinite(one))) {
    return undefined;
  }
  return {
    lat: clamp(lat as number, -MAX_LATITUDE, MAX_LATITUDE),
    lon: clamp(lon as number, -180, 180),
    zoom: clamp(zoom as number, 0, MAX_TILE_ZOOM),
  };
}

const easeOut = (t: number): number => 1 - (1 - t) ** 3;

export function glideAt(from: MapView, to: MapView, size: Size, t: number): MapView {
  const at = easeOut(clamp(t, 0, 1));
  const centre = (view: MapView): [number, number] => [
    (size.width / 2 - view.x) / view.k,
    (size.height / 2 - view.y) / view.k,
  ];
  const [fx, fy] = centre(from);
  const [tx, ty] = centre(to);
  const k = 2 ** (Math.log2(from.k) + (Math.log2(to.k) - Math.log2(from.k)) * at);
  const [cx, cy] = [fx + (tx - fx) * at, fy + (ty - fy) * at];
  return { x: size.width / 2 - cx * k, y: size.height / 2 - cy * k, k };
}

export function glides(from: MapView, to: MapView, size: Size): boolean {
  if (size.width <= 0 || size.height <= 0) {
    return false;
  }
  const away = (view: MapView, other: MapView): [number, number] => [
    Math.abs(((size.width / 2 - view.x) / view.k - (size.width / 2 - other.x) / other.k) * Math.max(view.k, other.k)),
    Math.abs(((size.height / 2 - view.y) / view.k - (size.height / 2 - other.y) / other.k) * Math.max(view.k, other.k)),
  ];
  const [dx, dy] = away(from, to);
  return dx <= GLIDE_REACH_SCREENS * size.width && dy <= GLIDE_REACH_SCREENS * size.height;
}

export function tileTemplate(address: string): string | null {
  const trimmed = address.trim();
  const holes = ["{z}", "{x}", "{y}"];
  const bare = holes.reduce((text, hole) => text.split(hole).join(""), trimmed);
  if (!/^https:\/\/[^/{}\s]+(?:\/|$)/iu.test(trimmed) || !holes.every((hole) => trimmed.includes(hole)) || /[{}]/u.test(bare)) {
    return null;
  }
  try {
    return new URL(tileUrl(trimmed, { z: 0, x: 0, y: 0 })).host === "" ? null : trimmed;
  } catch {
    return null;
  }
}

export function tileHost(template: string): string {
  try {
    return new URL(tileUrl(template, { z: 0, x: 0, y: 0 })).host;
  } catch {
    return "";
  }
}

export function tileUrl(template: string, tile: TileKey): string {
  return template
    .replace(/\{z\}/gu, String(tile.z))
    .replace(/\{x\}/gu, String(tile.x))
    .replace(/\{y\}/gu, String(tile.y));
}

export const TILE_OVERLAP = 0.5;

export function planTiles(view: MapView, size: Size, ring: number, maxZoom: number): PlannedTile[] {
  if (size.width <= 0 || size.height <= 0) {
    return [];
  }
  const z = clamp(Math.round(Math.log2(view.k)), 0, maxZoom);
  const count = 2 ** z;
  const tile = (WORLD * view.k) / count;
  const range = (offset: number, extent: number): [number, number] => [
    clamp(Math.floor(-offset / tile) - ring, 0, count - 1),
    clamp(Math.floor((extent - offset) / tile) + ring, 0, count - 1),
  ];
  const [x0, x1] = range(view.x, size.width);
  const [y0, y1] = range(view.y, size.height);
  const planned: PlannedTile[] = [];
  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      planned.push({ z, x, y, left: view.x + x * tile, top: view.y + y * tile, size: tile + TILE_OVERLAP });
    }
  }
  return planned;
}
