import { project, WORLD } from "./mapProjection";

export type Ring = [number, number][];

const QUANTUM = 0.05;

export function decodeOutline(data: string): Ring[] {
  const binary = atob(data);
  let at = 0;
  const varint = (): number => {
    let value = 0;
    let scale = 1;
    for (;;) {
      const byte = binary.charCodeAt(at);
      at += 1;
      value += (byte & 0x7f) * scale;
      if (byte < 0x80) {
        return value;
      }
      scale *= 0x80;
    }
  };
  const signed = (): number => {
    const value = varint();
    return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
  };
  const rings: Ring[] = [];
  const count = varint();
  for (let one = 0; one < count; one += 1) {
    const ring: Ring = [];
    const points = varint();
    let [x, y] = [0, 0];
    for (let point = 0; point < points; point += 1) {
      x += signed();
      y += signed();
      ring.push([x * QUANTUM - 180, y * QUANTUM - 90]);
    }
    rings.push(ring);
  }
  return rings;
}

export function outlinePath(rings: readonly Ring[]): string {
  const parts: string[] = [];
  for (const ring of rings) {
    ring.forEach(([lon, lat], at) => {
      const [x, y] = project(lat, lon);
      parts.push(`${at === 0 ? "M" : "L"}${(x * WORLD).toFixed(2)} ${(y * WORLD).toFixed(2)}`);
    });
    parts.push("Z");
  }
  return parts.join("");
}
