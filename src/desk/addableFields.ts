import type { GedcomLanguageService, PointerCandidate, Position, StructureFieldDescription } from "@domorium/language-service";

export function addableAt(service: GedcomLanguageService, at: Position): StructureFieldDescription[] {
  const described = service.describeStructure(at);
  if ("ok" in described) {
    return [];
  }
  return [...described.fields].sort(
    (a, b) => Number(isFull(a)) - Number(isFull(b)) || Number(b.required) - Number(a.required),
  );
}

export const isFull = (field: StructureFieldDescription): boolean =>
  field.max !== null && field.occurrences.length >= field.max;

/** The values the standard limits a line to, and whether it may hold several of them. */
export interface Choices {
  values: string[];
  multiple: boolean;
}

export function choicesAt(service: GedcomLanguageService, at: Position): Choices | null {
  const described = service.describeStructure(at);
  if ("ok" in described || described.payload.kind !== "enum") {
    return null;
  }
  return { values: described.payload.values, multiple: described.payload.multiple };
}

/** Whether a pointer of this tag is one the standard pairs with a pointer back on the other record. */
export function pairedAt(service: GedcomLanguageService, parent: Position, tag: string): boolean {
  const described = service.describeStructure(parent);
  return !("ok" in described) && (described.fields.find((field) => field.tag === tag)?.reciprocal ?? false);
}

/** Whether a line break is the ordinary case of the line's value, so that Enter starts a new line in its field. */
export function proseAt(service: GedcomLanguageService, at: Position): boolean {
  const described = service.describeStructure(at);
  return !("ok" in described) && described.prose;
}

/** Whether the standard gives the line at this position a value at all. */
export function holdsValueAt(service: GedcomLanguageService, at: Position): boolean {
  const described = service.describeStructure(at);
  return !("ok" in described) && described.payload.kind !== "none";
}

/** Whether the service describes the line at this position, which is what lets the card write to it. */
export function describes(service: GedcomLanguageService, at: Position): boolean {
  return !("ok" in service.describeStructure(at));
}

/** The records a pointer of this tag, written under the line at `parent`, may point at. */
export function pointerChoicesAt(service: GedcomLanguageService, parent: Position, tag: string): PointerCandidate[] {
  const described = service.describeStructure(parent);
  if ("ok" in described) {
    return [];
  }
  return described.fields.find((field) => field.tag === tag)?.candidates ?? [];
}

export function removableAt(service: GedcomLanguageService, parent: Position, tag: string): boolean {
  const described = service.describeStructure(parent);
  if ("ok" in described) {
    return false;
  }
  const field = described.fields.find((one) => one.tag === tag);
  return field === undefined || field.occurrences.length > field.min;
}
