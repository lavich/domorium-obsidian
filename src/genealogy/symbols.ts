import type { DocumentSymbol, Position } from "@domorium/language-service";

import type { Missing } from "./types";

export const childOf = (symbol: DocumentSymbol, tag: string): DocumentSymbol | undefined =>
  symbol.children.find((child) => child.name === tag);

export const childrenOf = (symbol: DocumentSymbol, tag: string): DocumentSymbol[] =>
  symbol.children.filter((child) => child.name === tag);

export const payload = (symbol: DocumentSymbol | undefined): string | undefined =>
  symbol?.detail || undefined;

export function rolePointers(
  family: DocumentSymbol,
  roles: ReadonlySet<string>,
): string[] {
  const found: string[] = [];
  for (const child of family.children) {
    if (roles.has(child.name)) {
      const xref = payload(child);
      if (xref) {
        found.push(xref);
      }
    }
  }
  return found;
}

export function roleLinks(family: DocumentSymbol, roles: ReadonlySet<string>): Missing[] {
  const found: Missing[] = [];
  for (const child of family.children) {
    const xref = payload(child);
    if (roles.has(child.name) && xref) {
      found.push({ xref, range: child.range });
    }
  }
  return found;
}

/** Where a line's payload starts: one space after its tag. */
export function payloadPosition(line: DocumentSymbol): Position {
  return {
    line: line.selectionRange.end.line,
    character: line.selectionRange.end.character + 1,
  };
}
