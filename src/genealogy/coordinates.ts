import type { DocumentSymbol } from "@domorium/language-service";

import { childOf, payload } from "./symbols";
import type { Coordinates } from "./types";

export type Axis = "lat" | "lon";

const LETTERS: Record<Axis, string> = { lat: "NS", lon: "EW" };
const LIMIT: Record<Axis, number> = { lat: 90, lon: 180 };
const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const SIGNED = new RegExp(`^([+-]?${NUMBER})$`, "u");
const BEFORE = new RegExp(`^([A-Za-z])\\s*(${NUMBER})$`, "u");
const AFTER = new RegExp(`^(${NUMBER})\\s*([A-Za-z])$`, "u");

export function readDegrees(text: string, axis: Axis): number | undefined {
  const trimmed = text.trim();
  const before = BEFORE.exec(trimmed);
  const after = AFTER.exec(trimmed);
  const signed = SIGNED.exec(trimmed);
  const letter = (before?.[1] ?? after?.[2])?.toUpperCase();
  const digits = before?.[2] ?? after?.[1] ?? signed?.[1];
  if (digits === undefined || (letter !== undefined && !LETTERS[axis].includes(letter))) {
    return undefined;
  }
  const value = Math.abs(Number(digits.replace(",", ".")));
  if (!(value <= LIMIT[axis])) {
    return undefined;
  }
  const negative = letter === undefined ? digits.startsWith("-") : letter === "S" || letter === "W";
  return negative && value !== 0 ? -value : value;
}

export function readCoordinates(place: DocumentSymbol | undefined): Coordinates | undefined {
  const map = place === undefined ? undefined : childOf(place, "MAP");
  const lat = payload(map === undefined ? undefined : childOf(map, "LATI"));
  const lon = payload(map === undefined ? undefined : childOf(map, "LONG"));
  if (lat === undefined || lon === undefined) {
    return undefined;
  }
  const latitude = readDegrees(lat, "lat");
  const longitude = readDegrees(lon, "lon");
  return latitude === undefined || longitude === undefined ? undefined : { latitude, longitude };
}
