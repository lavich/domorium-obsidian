import { UNTITLED, type SourceRow } from "../genealogy";

/** What a source's row says. The list draws it; it knows nothing of lists. */
export function drawSourceRow(
  row: HTMLElement,
  source: SourceRow,
  untitled: string,
): void {
  element(row, "div", "gedcom-person-name").textContent =
    source.title === UNTITLED ? source.xref ?? untitled : source.title;

  if (!source.author && !source.repository) {
    return;
  }
  const sub = element(row, "div", "gedcom-person-sub");
  if (source.author) {
    element(sub, "span", "gedcom-source-author").textContent = source.author;
  }
  if (source.repository) {
    element(sub, "span", "gedcom-source-repository").textContent =
      source.repository;
  }
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
