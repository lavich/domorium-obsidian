export function linkButton(
  parent: HTMLElement,
  text: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = parent.createEl("button", { cls: "gedcom-desk-link", text });
  button.setAttribute("type", "button");
  button.addEventListener("click", onClick);
  return button;
}

/** Below and right of the point where it fits, else above it, so a button in it is never off the edge. */
export function placeInside(
  root: HTMLElement,
  element: HTMLElement,
  point: { clientX: number; clientY: number },
): void {
  const box = root.getBoundingClientRect();
  const left = Math.max(0, Math.min(point.clientX - box.left + 14, root.clientWidth - element.offsetWidth));
  const y = point.clientY - box.top;
  const height = element.offsetHeight;
  const top = y + 14 + height > root.clientHeight ? Math.max(0, y - 14 - height) : y + 14;
  element.setCssProps({ left: `${left}px`, top: `${top}px` });
}
