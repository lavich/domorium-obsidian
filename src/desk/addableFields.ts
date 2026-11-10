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

export function choicesAt(service: GedcomLanguageService, at: Position): string[] {
  const described = service.describeStructure(at);
  if ("ok" in described || described.payload.kind !== "enum" || described.payload.multiple) {
    return [];
  }
  return described.payload.values;
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
