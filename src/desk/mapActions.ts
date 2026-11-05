import type { GenealogyIndex } from "../genealogy";
import { plural, t } from "../i18n";
import type { PlaceGroup } from "./fileMap";
import { familyTitle, personName } from "./labels";
import { clusterName, type DrawnMark } from "./mapMarks";
import { boundsOfPoints, type Bounds } from "./mapProjection";
import type { PlacePopup } from "./placePopup";
import { popupRows } from "./placePopup";

export interface Point {
  clientX: number;
  clientY: number;
}

export interface ActionHost {
  index(): GenealogyIndex | null;
  select(xref: string): void;
  popup: PlacePopup;
  opener: HTMLElement;
  separate(bounds: Bounds | null): void;
}

export function nameOfMark(mark: DrawnMark): string {
  if (mark.kind === "cluster") {
    const largest = [...mark.groups].sort((a, b) => b.events.length - a.events.length).slice(0, 3);
    return clusterName(
      mark.groups.length,
      mark.groups.reduce((sum, group) => sum + group.events.length, 0),
      largest.map((group) => group.place.name),
    );
  }
  const [group] = mark.groups;
  return group === undefined ? "" : t("map.place.tip", { name: group.place.name, events: plural("map.events", group.events.length) });
}

function openPopup(host: ActionHost, groups: readonly PlaceGroup[], at: Point): void {
  const index = host.index();
  if (index === null) {
    return;
  }
  const nameOf = (record: string): string => {
    const person = index.person(record);
    const family = index.family(record);
    return person ? personName(person) : family ? familyTitle(family.spouseNames) : record;
  };
  host.popup.open(
    groups.map((group) => group.place.name).join(", "),
    groups.map((group) => ({ ...(groups.length > 1 ? { place: group.place.name } : {}), rows: popupRows(group.events, nameOf) })),
    at,
    host.opener,
  );
}

export function activateGroup(host: ActionHost, group: PlaceGroup, at: Point): void {
  const records = [...new Set(group.events.map((event) => event.record))];
  const [only] = records;
  if (records.length === 1 && only !== undefined) {
    host.select(only);
  } else {
    openPopup(host, [group], at);
  }
}

export function activateMark(host: ActionHost, mark: DrawnMark, at: Point): void {
  if (mark.kind === "point") {
    const [group] = mark.groups;
    if (group !== undefined) {
      activateGroup(host, group, at);
    }
    return;
  }
  const [first] = mark.members;
  const apart = mark.members.some((one) => one.lat !== first?.lat || one.lon !== first.lon);
  if (apart) {
    host.separate(boundsOfPoints(mark.members.map((one) => ({ lat: one.lat, lon: one.lon }))));
  } else {
    openPopup(host, mark.groups, at);
  }
}
