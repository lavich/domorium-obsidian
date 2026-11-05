import type { PlaceGroup } from "./fileMap";
import { orderedPlaces } from "./fileMap";

const TRANSLITERATION: Record<string, string> = { ł: "l", ß: "ss", ø: "o", đ: "d", æ: "ae", œ: "oe", ı: "i" };

export function foldText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[łßøđæœı]/gu, (letter) => TRANSLITERATION[letter] ?? letter);
}

export interface PlaceMatches {
  drawn: PlaceGroup[];
  unmapped: PlaceGroup[];
}

export function matchPlaces(groups: readonly PlaceGroup[], query: string, collator: Intl.Collator): PlaceMatches {
  const wanted = foldText(query.trim());
  if (wanted === "") {
    return { drawn: [], unmapped: [] };
  }
  const found = groups.filter((group) => foldText(group.place.name).includes(wanted));
  const ordered = orderedPlaces(found, collator);
  return {
    drawn: ordered.filter((group) => group.place.coordinates !== undefined),
    unmapped: ordered.filter((group) => group.place.coordinates === undefined),
  };
}
