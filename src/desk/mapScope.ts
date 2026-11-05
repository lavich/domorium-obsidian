import type { GenealogyIndex } from "../genealogy";
import type { BranchScope } from "./branchScope";
import {
  branchOf,
  groupByPlace,
  NO_ROUTE,
  recordEvents,
  routeOf,
  scopeEvents,
  type FileMap,
  type MapEvent,
  type PlaceGroup,
  type Route,
} from "./fileMap";
import { placeKey } from "./fileMap";
import { boundsOf, keeps, type YearRange } from "./yearRange";

export interface ScopeSlice {
  events: MapEvent[];
  bounds: YearRange | null;
}

export interface RangeSlice {
  mapped: PlaceGroup[];
  unmapped: PlaceGroup[];
}

export interface Marked {
  highlighted: Set<string>;
  route: Route;
}

export function sliceScope(index: GenealogyIndex, model: FileMap, scope: BranchScope): ScopeSlice {
  const branch = scope.focus === undefined ? null : branchOf(index, scope.focus, scope.up, scope.down);
  const events = scopeEvents(model, index, branch);
  const drawn = events.filter((event) => model.places.get(placeKey(event.place))?.coordinates !== undefined);
  return { events, bounds: boundsOf(drawn) };
}

export function sliceRange(model: FileMap, events: readonly MapEvent[], range: YearRange | null): RangeSlice {
  const kept = groupByPlace(model, events.filter((event) => keeps(event, range)));
  return {
    mapped: kept.filter((group) => group.place.coordinates !== undefined),
    unmapped: groupByPlace(model, events).filter((group) => group.place.coordinates === undefined),
  };
}

export function markSelection(index: GenealogyIndex, model: FileMap, selected: string | null, range: YearRange | null): Marked {
  if (selected === null) {
    return { highlighted: new Set(), route: NO_ROUTE };
  }
  const keep = (event: MapEvent): boolean => keeps(event, range);
  const highlighted = new Set<string>();
  for (const event of recordEvents(model, index, selected)) {
    const place = model.places.get(placeKey(event.place));
    if (place?.coordinates !== undefined && keep(event)) {
      highlighted.add(place.key);
    }
  }
  return { highlighted, route: routeOf(model, index, selected, keep) };
}
