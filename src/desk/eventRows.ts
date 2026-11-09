import type { GenealogyIndex, PersonEvent } from "../genealogy";
import { eventName } from "./labels";
import type { FactKey } from "./personPage";

const EVENT_PREFIX = "event:";
const EVENT_ID = /^event:(.+):([A-Za-z0-9_]+):(0|[1-9]\d*)$/u;

export const eventId = (owner: string, tag: string, nth: number): string => `${EVENT_PREFIX}${owner}:${tag}:${nth}`;

export interface EventTarget {
  owner: string;
  event: PersonEvent;
  fact: FactKey;
}

export function eventAt(index: GenealogyIndex, id: string): EventTarget | undefined {
  const found = EVENT_ID.exec(id);
  if (found === null) {
    return undefined;
  }
  const [, owner = "", tag, nth] = found;
  const person = index.person(owner);
  const events = (person ?? index.family(owner))?.events ?? [];
  const event = events.filter((one) => one.tag === tag)[Number(nth)];
  return event === undefined ? undefined : { owner, event, fact: `${person ? "p" : "f"}:${events.indexOf(event)}` };
}

export function eventOwner(id: string | null): string | null {
  return id === null ? null : (EVENT_ID.exec(id)?.[1] ?? null);
}

const LINE_WIDTH = 100_000;

const position = (event: PersonEvent): number => event.range.start.line * LINE_WIDTH + event.range.start.character;

export function eventIdOf(owner: string, events: PersonEvent[], event: PersonEvent): string {
  const before = events.filter((one) => one.tag === event.tag && position(one) < position(event)).length;
  return eventId(owner, event.tag, before);
}

export function eventTitle(event: PersonEvent): string {
  const text = event.value?.trim();
  const name = eventName(event);
  return text && text !== "Y" ? `${name} · ${text}` : name;
}
