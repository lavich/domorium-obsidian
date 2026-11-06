import type { PlaceGroup } from "./fileMap";
import { orderedPlaces } from "./fileMap";
import { foldText } from "./placeRows";

export { foldText };

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
