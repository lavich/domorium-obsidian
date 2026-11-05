export const MAX_RADIUS = 22;
export const COARSE_SPACING = 22;

export interface Placed {
  key: string;
  x: number;
  y: number;
  lat: number;
  lon: number;
  events: number;
}

export interface Mark {
  kind: "point" | "cluster";
  x: number;
  y: number;
  events: number;
  members: Placed[];
}

export function radius(events: number): number {
  return Math.min(MAX_RADIUS, 5 + 1.7 * Math.sqrt(Math.max(0, events - 1)));
}

export function clusterPlaces(visible: readonly Placed[], pinned: ReadonlySet<string>, coarse: boolean): Mark[] {
  const marks: Mark[] = [];
  const free: Placed[] = [];
  for (const place of visible) {
    if (pinned.has(place.key)) {
      marks.push({ kind: "point", x: place.x, y: place.y, events: place.events, members: [place] });
    } else {
      free.push(place);
    }
  }
  free.sort((a, b) => b.events - a.events || (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  const cell = 2 * MAX_RADIUS;
  const grid = new Map<string, Placed[]>();
  const cellOf = (value: number): number => Math.floor(value / cell);
  for (const place of free) {
    const id = `${cellOf(place.x)},${cellOf(place.y)}`;
    const held = grid.get(id);
    if (held === undefined) {
      grid.set(id, [place]);
    } else {
      held.push(place);
    }
  }
  const taken = new Set<string>();
  for (const seed of free) {
    if (taken.has(seed.key)) {
      continue;
    }
    taken.add(seed.key);
    const members = [seed];
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        for (const other of grid.get(`${cellOf(seed.x) + dx},${cellOf(seed.y) + dy}`) ?? []) {
          if (taken.has(other.key)) {
            continue;
          }
          const reach = Math.max(radius(seed.events) + radius(other.events), coarse ? COARSE_SPACING : 0);
          if (Math.hypot(other.x - seed.x, other.y - seed.y) < reach) {
            taken.add(other.key);
            members.push(other);
          }
        }
      }
    }
    const events = members.reduce((sum, one) => sum + one.events, 0);
    marks.push({
      kind: members.length === 1 ? "point" : "cluster",
      x: members.reduce((sum, one) => sum + one.x * one.events, 0) / events,
      y: members.reduce((sum, one) => sum + one.y * one.events, 0) / events,
      events,
      members,
    });
  }
  return marks;
}

export function separable(mark: Mark): boolean {
  const [first, ...rest] = mark.members;
  return rest.some((one) => one.lat !== first?.lat || one.lon !== first.lon);
}
