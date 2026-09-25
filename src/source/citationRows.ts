import type { Citation } from "../genealogy";

export interface CitationRow {
  /** What the row names: the citing record, or the source cited. */
  title: string;
  /** What within the citing record it hung from, already named. */
  within?: string;
  page?: string;
  open?: () => void;
}

/**
 * The same drawing on all three pages: a citation reads the same whether a
 * source is listing what cites it or a record is listing what it cites.
 */
export function drawCitations(
  group: HTMLElement,
  rows: CitationRow[],
): void {
  for (const one of rows) {
    const row = element(group, "div", "gedcom-citation");
    if (one.open) {
      row.tabIndex = 0;
      row.classList.add("is-openable");
      row.addEventListener("click", one.open);
    }
    element(row, "span", "gedcom-citation-title").textContent = one.title;
    if (one.within) {
      element(row, "span", "gedcom-citation-within").textContent = one.within;
    }
    if (one.page) {
      element(row, "div", "gedcom-citation-page").textContent = one.page;
    }
  }
}

export function withinOf(
  citation: Citation,
  name: (tag: string) => string,
  phrase: (what: string) => string,
): string | undefined {
  return citation.within === undefined
    ? undefined
    : phrase(name(citation.within));
}

function element(
  parent: HTMLElement,
  tag: "div" | "span",
  cls: string,
): HTMLElement {
  const node = parent.ownerDocument.createElement(tag);
  node.className = cls;
  parent.append(node);
  return node;
}
