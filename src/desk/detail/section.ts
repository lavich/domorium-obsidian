/** A section's heading; where it lists things of one kind, the stylesheet shows how many after its title. */
export function sectionHeading(parent: HTMLElement, title: string, count?: number): HTMLElement {
  const heading = parent.createEl("h2", { cls: "gedcom-desk-section", text: title });
  if (count !== undefined) {
    heading.setAttribute("data-count", String(count));
  }
  return heading;
}
