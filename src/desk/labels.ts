import type { DateReading, PersonEvent, PersonRow } from "../genealogy";
import { UNNAMED, UNTITLED } from "../genealogy";
import { t, type MessageKey } from "../i18n";

/** Beyond this a person with no death is not taken to be living. */
const LIVING_SPAN = 110;

export function personName(row: { name: string }): string {
  return row.name === UNNAMED ? t("desk.unnamed") : row.name;
}

export function sourceTitle(title: string): string {
  return title === UNTITLED ? t("desk.untitled") : title;
}

export function eventName(event: Pick<PersonEvent, "tag" | "type">): string {
  if ((event.tag === "EVEN" || event.tag === "FACT") && event.type) {
    return event.type;
  }
  return t(`event.${event.tag}` as MessageKey);
}

function year(date: DateReading | undefined): string | undefined {
  if (date?.year === undefined) {
    return undefined;
  }
  return date.precision === "exact" ? `${date.year}` : `≈${date.year}`;
}

export function yearsOf(row: PersonRow, now = new Date().getFullYear()): string {
  const born = year(row.birth);
  const died = year(row.death);
  if (born && died) {
    return `${born}–${died}`;
  }
  if (born && !row.death && row.birth?.year !== undefined && now - row.birth.year < LIVING_SPAN) {
    return t("desk.born", { year: born });
  }
  if (born) {
    return `${born}–?`;
  }
  return died ? `?–${died}` : "";
}

export function shortPlace(place: string | undefined): string | undefined {
  return place?.split(",")[0]?.trim() || undefined;
}
