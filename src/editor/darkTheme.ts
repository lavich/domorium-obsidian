export function isDarkTheme(element: Element): boolean {
  return element.ownerDocument.body.classList.contains("theme-dark");
}
