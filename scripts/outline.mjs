import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";

export const SOURCE = {
  name: "Natural Earth ne_110m_land 4.1.0",
  archive: "https://naciscdn.org/naturalearth/110m/physical/ne_110m_land.zip",
  archiveSha256: "1926c621afd6ac67c3f36639bb1236134a48d82226dc675d3e3df53d02d2a3de",
  shpSha256: "8689e6932b8e370e2ca4587cf3ba21e460b1235db37b6ed3c172c35b4a6088de",
};

const QUANTUM = 0.05;
const MIN_RING_AREA = 0.5;

export function readRings(shp) {
  const view = new DataView(shp.buffer, shp.byteOffset, shp.byteLength);
  const rings = [];
  let at = 100;
  while (at + 8 <= shp.byteLength) {
    const length = view.getInt32(at + 4, false) * 2;
    const body = at + 8;
    if (view.getInt32(body, true) === 5) {
      const parts = view.getInt32(body + 36, true);
      const count = view.getInt32(body + 40, true);
      const starts = Array.from({ length: parts }, (_, one) => view.getInt32(body + 44 + one * 4, true));
      const pointsAt = body + 44 + parts * 4;
      const point = (one) => [view.getFloat64(pointsAt + one * 16, true), view.getFloat64(pointsAt + one * 16 + 8, true)];
      starts.forEach((start, one) => {
        const end = starts[one + 1] ?? count;
        rings.push(Array.from({ length: end - start }, (_, i) => point(start + i)));
      });
    }
    at = body + length;
  }
  return rings;
}

const areaOf = (ring) =>
  Math.abs(ring.reduce((sum, [x, y], i) => sum + x * (ring[(i + 1) % ring.length][1]) - ring[(i + 1) % ring.length][0] * y, 0)) / 2;

function varint(out, value) {
  let rest = value;
  while (rest >= 0x80) {
    out.push((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 0x80);
  }
  out.push(rest);
}

const zigzag = (value) => (value < 0 ? -value * 2 - 1 : value * 2);

export function encodeOutline(rings) {
  const out = [];
  varint(out, rings.length);
  for (const ring of rings) {
    const cells = ring.map(([lon, lat]) => [Math.round((lon + 180) / QUANTUM), Math.round((lat + 90) / QUANTUM)]);
    const kept = cells.filter((cell, i) => i === 0 || cell[0] !== cells[i - 1][0] || cell[1] !== cells[i - 1][1]);
    varint(out, kept.length);
    let [x, y] = [0, 0];
    for (const [cx, cy] of kept) {
      varint(out, zigzag(cx - x));
      varint(out, zigzag(cy - y));
      [x, y] = [cx, cy];
    }
  }
  return Buffer.from(out).toString("base64");
}

export function generate(shpPath, target) {
  const shp = readFileSync(shpPath);
  const sum = createHash("sha256").update(shp).digest("hex");
  if (sum !== SOURCE.shpSha256) {
    throw new Error(`${shpPath} is not ${SOURCE.name} (sha256 ${sum})`);
  }
  const rings = readRings(shp).filter((ring) => areaOf(ring) >= MIN_RING_AREA);
  const data = encodeOutline(rings);
  writeFileSync(target, `export const MAP_OUTLINE =\n  "${data}";\n`);
  return { rings: rings.length, characters: data.length };
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [shp] = process.argv.slice(2);
  if (shp === undefined) {
    console.error(`usage: node scripts/outline.mjs <ne_110m_land.shp>\n  ${SOURCE.name}\n  ${SOURCE.archive}`);
    process.exit(1);
  }
  const target = fileURLToPath(new URL("../src/desk/mapOutlineData.ts", import.meta.url));
  console.log(generate(shp, target));
}
