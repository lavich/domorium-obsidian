export interface FoldOptions {
  id: string;
  title: string;
  count: number;
  open: boolean;
  toggled: (open: boolean) => void;
}

let folds = 0;

export function renderFold(parent: HTMLElement, { id, title, count, open, toggled }: FoldOptions): HTMLElement {
  folds += 1;
  const bodyId = `gedcom-fold-${folds}`;
  const heading = parent.createEl("h2", { cls: ["gedcom-desk-section", "gedcom-desk-fold-heading"] });
  const button = heading.createEl("button", { cls: "gedcom-desk-fold-button" });
  button.setAttribute("type", "button");
  button.setAttribute("aria-expanded", String(open));
  button.setAttribute("aria-controls", bodyId);
  button.setAttribute("data-focus-key", `fold:${id}`);
  button.setAttribute("data-count", String(count));
  button.setText(title);
  const body = parent.createDiv({ cls: "gedcom-desk-fold-body" });
  body.id = bodyId;
  body.toggleAttribute("hidden", !open);
  button.addEventListener("click", () => {
    const next = body.hasAttribute("hidden");
    body.toggleAttribute("hidden", !next);
    button.setAttribute("aria-expanded", String(next));
    toggled(next);
  });
  return body;
}
