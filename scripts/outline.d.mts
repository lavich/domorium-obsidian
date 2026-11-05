export type Ring = [number, number][];
export const SOURCE: { name: string; archive: string; archiveSha256: string; shpSha256: string };
export function readRings(shp: Uint8Array): Ring[];
export function encodeOutline(rings: Ring[]): string;
export function generate(shpPath: string, target: string): { rings: number; characters: number };
