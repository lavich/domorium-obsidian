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
