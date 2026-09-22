import { UNNAMED, type PersonRow } from "../genealogy";

/** What a person's row says. The list draws it; it knows nothing of lists. */
export function drawPersonRow(
  row: HTMLElement,
  person: PersonRow,
  unnamed: string,
): void {
  element(row, "div", "gedcom-person-name").textContent =
    person.name === UNNAMED ? unnamed : person.name;

  const years = spanOfYears(person);
  const place = person.place;
  if (!years && !place) {
    return;
  }
  const sub = element(row, "div", "gedcom-person-sub");
  if (years) {
    element(sub, "span", "gedcom-person-years").textContent = years;
  }
  if (place) {
    element(sub, "span", "gedcom-person-place").textContent = place;
  }
}

/** `1901–1975`, `1931–`, `–1975`, or nothing rather than a bare dash. */
function spanOfYears(person: PersonRow): string | null {
  const born = person.birth?.year;
  const died = person.death?.year;
  if (born === undefined && died === undefined) {
    return null;
  }
  return `${born ?? ""}–${died ?? ""}`;
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
