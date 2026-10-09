import type { FamilyRow } from "../genealogy";

/** What a family's row says. The list draws it; it knows nothing of lists. */
export function drawFamilyRow(
  row: HTMLElement,
  family: FamilyRow,
  children: (count: number) => string,
): void {
  // A family the record names nobody for has only its identifier to show.
  element(row, "div", "gedcom-person-name").textContent =
    family.name ?? family.xref ?? "";

  const year = family.marriage?.year?.toString();
  const parts = [year, family.place, family.childCount > 0 ? children(family.childCount) : undefined];
  if (!parts.some(Boolean)) {
    return;
  }
  const sub = element(row, "div", "gedcom-person-sub");
  for (const [cls, value] of [
    ["gedcom-person-years", year],
    ["gedcom-person-place", family.place],
    ["gedcom-family-children", family.childCount > 0 ? children(family.childCount) : undefined],
  ] as const) {
    if (value) {
      element(sub, "span", cls).textContent = value;
    }
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
