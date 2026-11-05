import { clusterPlaces, type Placed, radius } from "./mapCluster";
import type { MarkKind } from "./fileTimeline";
import { type PlaceGroup, type Route, placeLabel } from "./fileMap";
import { nearestMark, PlaceGrid } from "./mapHits";
import { placeLabels, LABEL_HEIGHT } from "./mapLabels";
import { MAX_LATITUDE, type MapView, project, type Size, toScreen, WORLD } from "./mapProjection";
import { plural, t } from "../i18n";

const SVG = "http://www.w3.org/2000/svg";
const MARGIN = 60;
const FINE_TARGET = 14;
const COARSE_TARGET = 22;

export interface MarksInput {
  view: MapView;
  size: Size;
  coarse: boolean;
  groups: readonly PlaceGroup[];
  highlighted: ReadonlySet<string>;
  selected: boolean;
  route: Route;
  current: string | null;
  focused: string | null;
  matches: ReadonlySet<string> | null;
  measure: (text: string) => number;
}

export interface DrawnMark {
  id: string;
  kind: "point" | "cluster";
  x: number;
  y: number;
  r: number;
  members: Placed[];
  groups: PlaceGroup[];
}

interface Located {
  key: string;
  x: number;
  y: number;
  group: PlaceGroup;
}

export interface MarkLayers {
  route: SVGGElement;
  marks: SVGGElement;
  labels: SVGGElement;
}

function shape<K extends keyof SVGElementTagNameMap>(tag: K, parent: Element): SVGElementTagNameMap[K] {
  const made = parent.ownerDocument.createElementNS(SVG, tag);
  parent.append(made);
  return made;
}

function kindOf(group: PlaceGroup): MarkKind | "mixed" {
  const [first] = group.events;
  return group.events.every((event) => event.kind === first?.kind) ? (first?.kind ?? "other") : "mixed";
}

export class MapMarks {
  private readonly marks = new Map<string, SVGGElement>();
  private readonly labels = new Map<string, SVGTextElement>();
  private grid: { groups: readonly PlaceGroup[]; index: PlaceGrid<Located> } | null = null;
  private drawn: DrawnMark[] = [];

  constructor(private readonly layers: MarkLayers) {}

  count(): number {
    return this.marks.size;
  }

  hit(x: number, y: number, coarse: boolean): DrawnMark | undefined {
    return nearestMark(this.drawn, x, y, coarse ? COARSE_TARGET : Math.max(FINE_TARGET, 0));
  }

  find(key: string): DrawnMark | undefined {
    return this.drawn.find((mark) => mark.members.some((one) => one.key === key));
  }

  private indexOf(groups: readonly PlaceGroup[]): PlaceGrid<Located> {
    if (this.grid?.groups !== groups) {
      const located = groups.flatMap((group) => {
        const at = group.place.coordinates;
        if (at === undefined) {
          return [];
        }
        const [x, y] = project(at.latitude, at.longitude);
        return [{ key: group.place.key, x, y, group }];
      });
      this.grid = { groups, index: new PlaceGrid(located) };
    }
    return this.grid.index;
  }

  draw(input: MarksInput): DrawnMark[] {
    const { view, size } = input;
    const scale = WORLD * view.k;
    const visible = this.indexOf(input.groups).inRect(
      (-view.x - MARGIN) / scale,
      (-view.y - MARGIN) / scale,
      (size.width - view.x + MARGIN) / scale,
      (size.height - view.y + MARGIN) / scale,
    );
    const placed: Placed[] = [];
    const byKey = new Map<string, PlaceGroup>();
    for (const one of visible) {
      const at = one.group.place.coordinates;
      if (at === undefined) {
        continue;
      }
      const [x, y] = toScreen(view, at.latitude, at.longitude);
      placed.push({ key: one.key, x, y, lat: at.latitude, lon: at.longitude, events: one.group.events.length });
      byKey.set(one.key, one.group);
    }
    const pinned = new Set<string>();
    for (const key of [...input.highlighted, input.current, input.focused]) {
      if (key !== null && byKey.has(key)) {
        pinned.add(key);
      }
    }
    const marks = clusterPlaces(placed, pinned, input.coarse);
    this.drawn = marks.map((mark) => {
      const [seed] = mark.members;
      return {
        id: mark.kind === "point" ? `p:${seed?.key ?? ""}` : `c:${seed?.key ?? ""}:${mark.members.length}`,
        kind: mark.kind,
        x: mark.x,
        y: mark.y,
        r: mark.kind === "point" ? radius(mark.events) : 14 + Math.min(8, mark.members.length),
        members: mark.members,
        groups: mark.members.flatMap((one) => byKey.get(one.key) ?? []),
      };
    });
    this.paintMarks(input);
    this.paintLabels(input);
    this.paintRoute(input);
    return this.drawn;
  }

  private stateOf(input: MarksInput, keys: string[]): string[] {
    const among = (set: ReadonlySet<string>): boolean => keys.some((key) => set.has(key));
    const classes: string[] = [];
    if (among(input.highlighted)) {
      classes.push("is-highlighted");
    } else if (input.selected) {
      classes.push("is-dimmed");
    }
    if (input.matches !== null && !among(input.matches)) {
      classes.push("is-dimmed");
    }
    if (input.current !== null && keys.includes(input.current)) {
      classes.push("is-current");
    }
    if (input.focused !== null && keys.includes(input.focused)) {
      classes.push("is-focused");
    }
    return classes;
  }

  private paintMarks(input: MarksInput): void {
    const seen = new Set<string>();
    for (const mark of this.drawn) {
      seen.add(mark.id);
      let node = this.marks.get(mark.id);
      if (node === undefined) {
        node = shape("g", this.layers.marks);
        shape("circle", node).setAttribute("class", "gedcom-map-ring");
        shape("circle", node).setAttribute("class", "gedcom-map-disc");
        shape("text", node).setAttribute("class", "gedcom-map-count");
        this.marks.set(mark.id, node);
      }
      const keys = mark.members.map((one) => one.key);
      const group = mark.groups[0];
      const kind = mark.kind === "cluster" ? "cluster" : group === undefined ? "other" : kindOf(group);
      node.setAttribute("class", ["gedcom-map-mark", `is-${mark.kind}`, `is-${kind}`, ...this.stateOf(input, keys)].join(" "));
      node.setAttribute("transform", `translate(${mark.x.toFixed(1)} ${mark.y.toFixed(1)})`);
      node.setAttribute("data-key", keys[0] ?? "");
      const [ring, disc, count] = Array.from(node.children);
      ring?.setAttribute("r", String(mark.r + 5));
      disc?.setAttribute("r", String(mark.r));
      const text = mark.kind === "cluster" ? String(mark.members.length) : kind === "mixed" ? String(mark.members[0]?.events ?? "") : "";
      count?.setAttribute("data-count", text);
      if (count !== undefined && count.textContent !== text) {
        count.textContent = text;
      }
    }
    for (const [id, node] of this.marks) {
      if (!seen.has(id)) {
        node.remove();
        this.marks.delete(id);
      }
    }
  }

  private paintLabels(input: MarksInput): void {
    const points = this.drawn.filter((mark) => mark.kind === "point" && mark.groups[0] !== undefined);
    const wanted = points.flatMap((mark) => {
      const group = mark.groups[0];
      const key = mark.members[0]?.key ?? "";
      const dim = input.selected && !input.highlighted.has(key);
      return group === undefined || dim
        ? []
        : [
            {
              key,
              x: mark.x,
              y: mark.y,
              radius: mark.r,
              text: placeLabel(group.place, group.events),
              events: group.events.length,
              kept: input.highlighted.has(key) || key === input.current || key === input.focused,
            },
          ];
    });
    const { placed } = placeLabels(wanted, input.measure, input.size.width);
    const seen = new Set<string>();
    for (const label of wanted) {
      const at = placed.get(label.key);
      if (at === undefined) {
        continue;
      }
      seen.add(label.key);
      let node = this.labels.get(label.key);
      if (node === undefined) {
        node = shape("text", this.layers.labels);
        this.labels.set(label.key, node);
      }
      node.setAttribute("class", `gedcom-map-label is-${at.side}`);
      node.setAttribute("x", at.x.toFixed(1));
      node.setAttribute("y", (at.y + LABEL_HEIGHT / 4).toFixed(1));
      if (node.textContent !== label.text) {
        node.textContent = label.text;
      }
    }
    for (const [key, node] of this.labels) {
      if (!seen.has(key)) {
        node.remove();
        this.labels.delete(key);
      }
    }
  }

  private paintRoute(input: MarksInput): void {
    this.layers.route.replaceChildren();
    const { stops, numbers } = input.route;
    const groups = new Map(input.groups.map((group) => [group.place.key, group] as const));
    const points = stops.flatMap((stop) => {
      const at = groups.get(stop.key)?.place.coordinates;
      return at === undefined ? [] : [{ key: stop.key, xy: toScreen(input.view, Math.max(-MAX_LATITUDE, at.latitude), at.longitude) }];
    });
    if (points.length === 0) {
      return;
    }
    if (points.length > 1) {
      shape("polyline", this.layers.route).setAttribute("class", "gedcom-map-route-line");
      this.layers.route.lastElementChild?.setAttribute("points", points.map((one) => one.xy.map((n) => n.toFixed(1)).join(",")).join(" "));
      points.slice(1).forEach((to, at) => {
        const from = points[at];
        if (from === undefined || (from.xy[0] === to.xy[0] && from.xy[1] === to.xy[1])) {
          return;
        }
        const angle = (Math.atan2(to.xy[1] - from.xy[1], to.xy[0] - from.xy[0]) * 180) / Math.PI;
        const arrow = shape("path", this.layers.route);
        arrow.setAttribute("class", "gedcom-map-arrow");
        arrow.setAttribute("d", "M-6 -5 L6 0 L-6 5 Z");
        arrow.setAttribute("transform", `translate(${((from.xy[0] + to.xy[0]) / 2).toFixed(1)} ${((from.xy[1] + to.xy[1]) / 2).toFixed(1)}) rotate(${angle.toFixed(1)})`);
      });
    }
    const written = new Set<string>();
    for (const one of points) {
      if (written.has(one.key)) {
        continue;
      }
      written.add(one.key);
      const text = shape("text", this.layers.route);
      text.setAttribute("class", "gedcom-map-number");
      text.setAttribute("x", (one.xy[0] + 8).toFixed(1));
      text.setAttribute("y", (one.xy[1] - 8).toFixed(1));
      text.textContent = (numbers.get(one.key) ?? []).join(", ");
    }
  }
}

export function clusterName(places: number, events: number, names: readonly string[]): string {
  return t("map.cluster.accessible", {
    places: plural("map.places", places),
    events: plural("map.events", events),
    names: names.join(", "),
  });
}
