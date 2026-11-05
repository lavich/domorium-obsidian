import { readDegrees } from "../genealogy/coordinates";
import type { Coordinates } from "../genealogy/types";

export interface PlacesTable {
  rows: ReadonlyMap<string, Coordinates | null>;
}

export const NO_TABLE: PlacesTable = { rows: new Map() };

const HEADER = "| Place | Latitude | Longitude |\n| --- | --- | --- |";
const GEDCOM_EXTENSION = /\.(?:ged|gedcom)$/iu;

export function placeKey(text: string): string {
  return text.trim().replace(/\s+/gu, " ").normalize("NFC").toLowerCase();
}

export function placesTablePath(gedPath: string): string | null {
  return GEDCOM_EXTENSION.test(gedPath) ? gedPath.replace(GEDCOM_EXTENSION, ".places.md") : null;
}

function cellsOf(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  for (let at = 0; at < line.length; at += 1) {
    const char = line.charAt(at);
    if (char === "\\" && line.charAt(at + 1) === "|") {
      cell += "|";
      at += 1;
    } else if (char === "|") {
      cells.push(cell);
      cell = "";
    } else {
      cell += char;
    }
  }
  cells.push(cell);
  const trimmed = line.trim();
  if (trimmed.startsWith("|")) {
    cells.shift();
  }
  if (trimmed.endsWith("|") && !trimmed.endsWith("\\|")) {
    cells.pop();
  }
  return cells.map((one) => one.trim());
}

const isRow = (line: string | undefined): line is string => line !== undefined && line.includes("|");

function isDelimiter(line: string | undefined): boolean {
  return isRow(line) && cellsOf(line).every((cell) => /^:?-+:?$/u.test(cell));
}

function tableIn(lines: readonly string[]): { header: number; end: number } | null {
  for (let at = 0; at < lines.length; at += 1) {
    if (isRow(lines[at]) && isDelimiter(lines[at + 1]) && !isDelimiter(lines[at])) {
      let end = at + 1;
      while (isRow(lines[end + 1])) {
        end += 1;
      }
      return { header: at, end };
    }
  }
  return null;
}

export function parsePlacesTable(text: string): PlacesTable {
  const lines = text.split(/\r?\n/u);
  const found = tableIn(lines);
  const rows = new Map<string, Coordinates | null>();
  if (found === null) {
    return { rows };
  }
  for (const line of lines.slice(found.header + 2, found.end + 1)) {
    const [place = "", lat = "", lon = ""] = cellsOf(line);
    const key = placeKey(place);
    if (key === "" || rows.has(key)) {
      continue;
    }
    const latitude = readDegrees(lat, "lat");
    const longitude = readDegrees(lon, "lon");
    rows.set(key, latitude === undefined || longitude === undefined ? null : { latitude, longitude });
  }
  return { rows };
}

const rowOf = (name: string): string => `| ${name.replace(/\|/gu, "\\|")} |  |  |`;

export function placesTableText(names: readonly string[], collator: Intl.Collator, note: string): string {
  const sorted = [...names].sort((a, b) => collator.compare(a, b));
  return `${note}\n\n${[HEADER, ...sorted.map(rowOf)].join("\n")}\n`;
}

export function appendMissingRows(text: string, missing: readonly string[]): string {
  if (missing.length === 0) {
    return text;
  }
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/u);
  const found = tableIn(lines);
  const rows = missing.map(rowOf);
  if (found !== null) {
    lines.splice(found.end + 1, 0, ...rows);
    return lines.join(eol);
  }
  const body = text.length === 0 || text.endsWith("\n") ? text : `${text}${eol}`;
  const gap = body.length === 0 ? "" : eol;
  return `${body}${gap}${[...HEADER.split("\n"), ...rows].join(eol)}${eol}`;
}
