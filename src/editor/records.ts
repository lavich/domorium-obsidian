import type { DocumentSymbol, Position } from "@domorium/language-service";

export interface GedcomRecord {
  tag: string;
  identifier?: string;
  label?: string;
  start: Position;
}

export function recordEntries(symbols: DocumentSymbol[]): GedcomRecord[] {
  return symbols.map((symbol) => ({
    tag: symbol.name,
    identifier: symbol.detail,
    label: symbol.label,
    start: symbol.range.start,
  }));
}

export function recordText(record: GedcomRecord): string {
  return [record.label, record.identifier, record.tag]
    .filter((part) => part)
    .join(" ");
}
